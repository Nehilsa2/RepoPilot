const parseRepoUrl = require('../utils/parseRepo');
const { getFileContent, createIssue, getRepoAccess, isRateLimitError, extractRateLimitInfo } = require('../services/githubService');
const { analyzeCode } = require('../services/aiService');

const { runESLint } = require('../services/eslintService');
const selectImportantChunks = require('../utils/selectImportantChunks');
const batchFiles = require('../utils/batchFiles');
const buildCombinedPrompt = require('../utils/buildCombinedPrompt');
const User = require('../models/User');

const MAX_FILES_PER_ACCOUNT = 5;
const MAX_BATCH_SIZE = 3;
const MAX_ISSUES_TO_RAISE = 25;

const normalizeIssue = (issue) => {
  if (typeof issue === 'string') {
    return {
      message: issue,
      fix: 'Apply the suggested correction and re-run tests.'
    };
  }

  return {
    message: issue?.message || 'Potential issue detected in this file.',
    fix: issue?.fix || 'Refactor the related code path and validate behavior.'
  };
};

const analyzeFiles = async (req, res) => {
  let reservedFiles = 0;

  try {
    const { repoUrl, selectedFiles } = req.body;

    if (!selectedFiles || selectedFiles.length === 0) {
      return res.status(400).json({ error: "No files selected" });
    }

    // 🔒 Account limit
    if (selectedFiles.length > MAX_FILES_PER_ACCOUNT) {
      return res.status(403).json({
        error: `Max ${MAX_FILES_PER_ACCOUNT} files allowed per account`
      });
    }

    const { owner, repo } = parseRepoUrl(repoUrl);
    const access = await getRepoAccess(owner, repo, req.githubToken);

    const reservedUser = await User.findOneAndUpdate(
      {
        _id: req.user.id,
        $expr: {
          $lte: [
            { $add: [{ $ifNull: ['$analysisFilesUsed', 0] }, selectedFiles.length] },
            MAX_FILES_PER_ACCOUNT
          ]
        }
      },
      { $inc: { analysisFilesUsed: selectedFiles.length } },
      { new: true }
    );

    if (!reservedUser) {
      return res.status(403).json({
        error: `Analysis limit reached. Max ${MAX_FILES_PER_ACCOUNT} files allowed per account.`
      });
    }

    reservedFiles = selectedFiles.length;

    // 🧠 STEP 1 — Batch files
    const batches = batchFiles(selectedFiles, MAX_BATCH_SIZE);

    const finalResults = [];

    // 🔁 STEP 2 — Process each batch
    for (let batch of batches) {

      const fileData = await Promise.all(
        batch.map(async (file) => {
          const content = await getFileContent(owner, repo, file, req.githubToken);

          // ⚡ ESLint (cheap filtering)
          const eslintIssues = await runESLint(content, file);

          // ⚡ Smart chunk selection
          const chunks = selectImportantChunks(content, eslintIssues);

          return {
            fileName: file,
            code: chunks.join("\n\n"),
            eslintIssues
          };
        })
      );

      // 🧠 STEP 3 — Combine files into one prompt
      const combinedPrompt = buildCombinedPrompt(fileData);

      // 🤖 STEP 4 — AI CALL (ONE PER BATCH)
      const aiResponse = await analyzeCode(`
Analyze the following multiple files and return STRICT JSON.

Format:
{
  "files": [
    {
      "fileName": "string",
      "summary": "2 to 3 short sentences describing the key risk and impact",
      "issues": [
        {
          "message": "Specific bug or reliability issue in 1 sentence",
          "fix": "Concrete fix in 1 short sentence"
        }
      ]
    }
  ]
}

Rules:
- Include only meaningful bugs/reliability issues (max 5 per file)
- Be specific with locations/symptoms when possible
- Keep summary concise but slightly elaborated (not just a phrase)
- Do not return markdown, return valid JSON only

${combinedPrompt}
      `);

      // 🔥 STEP 5 — MAP BACK TO FILES
      let parsed;

      try {
        parsed = typeof aiResponse === "string"
          ? JSON.parse(aiResponse)
          : aiResponse;
      } catch {
        parsed = { files: [] };
      }

      // fallback safety
      const aiFiles = parsed.files || [];

      for (let f of fileData) {
        const aiMatch = aiFiles.find(a => a.fileName === f.fileName);

        const eslintAsIssues = f.eslintIssues.map((e) => ({
          message: `Line ${e.line}: ${e.message}`,
          fix: 'Resolve the lint issue and ensure the code path still behaves correctly.'
        }));

        const aiIssues = Array.isArray(aiMatch?.issues)
          ? aiMatch.issues.map(normalizeIssue)
          : [];

        const merged = {
          fileName: f.fileName,
          summary: aiMatch?.summary || 'No major reliability risks were identified for this file in the current scan.',
          issues: [...aiIssues, ...eslintAsIssues]
        };

        finalResults.push(merged);
      }
    }

    return res.json({
      totalFiles: finalResults.length,
      files: finalResults,
      access,
      quota: {
        limit: MAX_FILES_PER_ACCOUNT,
        used: reservedUser.analysisFilesUsed,
        remaining: Math.max(0, MAX_FILES_PER_ACCOUNT - reservedUser.analysisFilesUsed)
      }
    });

  } catch (error) {
    if (reservedFiles > 0 && req.user?.id) {
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { analysisFilesUsed: -reservedFiles }
      }).catch((rollbackError) => {
        console.error('Quota rollback failed:', rollbackError.message);
      });
    }

    console.error("Analysis Error:", error.message);

    res.status(500).json({
      error: "Error analyzing files"
    });
  }
};

const toIssueCandidates = (analysisResults) => {
  const issues = [];

  for (const result of analysisResults || []) {
    const fileName = result.fileName || 'Unknown file';
    const fileIssues = Array.isArray(result.issues) ? result.issues : [];

    for (const item of fileIssues) {
      const normalized = normalizeIssue(item);

      issues.push({
        title: `[RepoPilot] Issue in ${fileName}`,
        body: `Detected by RepoPilot AI.\n\nFile: ${fileName}\n\nSummary:\n${result.summary || 'No summary available.'}\n\nProblem:\n${normalized.message}\n\nSuggested fix:\n${normalized.fix}`,
        labels: ['RepoPilot-ai', 'RepoPilot-issue']
      });
    }
  }

  return issues;
};

const raiseIssues = async (req, res) => {
  try {
    const { repoUrl, analysisResults } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: 'repoUrl is required' });
    }

    if (!Array.isArray(analysisResults) || analysisResults.length === 0) {
      return res.status(400).json({ error: 'analysisResults is required' });
    }

    const { owner, repo } = parseRepoUrl(repoUrl);
    const access = await getRepoAccess(owner, repo, req.githubToken);

    if (!access.canCreateIssues) {
      return res.status(403).json({
        error: 'Issue creation is disabled for this repository. Use a repository you can push to from this account.',
        code: 'ISSUE_CREATION_NOT_ALLOWED'
      });
    }

    const candidates = toIssueCandidates(analysisResults).slice(0, MAX_ISSUES_TO_RAISE);

    if (candidates.length === 0) {
      return res.status(400).json({ error: 'No issues found to raise' });
    }

    const created = [];
    let rateLimitExceeded = false;
    let rateLimitInfo = null;
    let failedCount = 0;

    for (const candidate of candidates) {
      try {
        const issue = await createIssue(owner, repo, req.githubToken, candidate);
        created.push(issue);
      } catch (error) {
        if (isRateLimitError(error)) {
          rateLimitExceeded = true;
          rateLimitInfo = extractRateLimitInfo(error);
          failedCount = candidates.length - created.length;
          console.warn(`GitHub API rate limit exceeded. ${failedCount} issues could not be created.`);
          break;
        } else {
          console.error('Error creating issue:', error.message);
          failedCount++;
        }
      }
    }

    const response = {
      totalRaised: created.length,
      issues: created,
      ...(rateLimitExceeded && {
        rateLimitExceeded: true,
        failedCount: failedCount,
        message: `Created ${created.length} issue${created.length !== 1 ? 's' : ''} before hitting GitHub API rate limit. ${failedCount} issue${failedCount !== 1 ? 's' : ''} could not be created.`,
        rateLimitReset: rateLimitInfo?.reset || null
      })
    };

    return res.json(response);
  } catch (error) {
    console.error('Raise Issues Error:', error.message);

    if (isRateLimitError(error)) {
      const rateLimitInfo = extractRateLimitInfo(error);
      return res.status(429).json({
        error: 'GitHub API rate limit exceeded. Please wait before creating more issues.',
        code: 'GITHUB_RATE_LIMIT_EXCEEDED',
        rateLimitReset: rateLimitInfo?.reset || null
      });
    }

    return res.status(500).json({
      error: 'Error raising issues in repository'
    });
  }
};

module.exports = { analyzeFiles, raiseIssues };