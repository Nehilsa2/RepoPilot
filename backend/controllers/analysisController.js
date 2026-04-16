const parseRepoUrl = require('../utils/parseRepo');
const { getFileContent, createIssue, getRepoAccess } = require('../services/githubService');
const { analyzeCode } = require('../services/aiService');

const { runESLint } = require('../services/eslintService');
const selectImportantChunks = require('../utils/selectImportantChunks');
const batchFiles = require('../utils/batchFiles');
const buildCombinedPrompt = require('../utils/buildCombinedPrompt');

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
  try {
    const { repoUrl, selectedFiles } = req.body;

    if (!selectedFiles || selectedFiles.length === 0) {
      return res.status(400).json({ error: "No files selected" });
    }

    // 🔒 Free tier limit
    if (selectedFiles.length > 10) {
      return res.status(403).json({
        error: "Max 10 files allowed"
      });
    }

    const { owner, repo } = parseRepoUrl(repoUrl);
    const access = await getRepoAccess(owner, repo, req.githubToken);

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
      access
    });

  } catch (error) {
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
        title: `[RepoAnalyzer] Issue in ${fileName}`,
        body: `Detected by RepoAnalyzer AI.\n\nFile: ${fileName}\n\nSummary:\n${result.summary || 'No summary available.'}\n\nProblem:\n${normalized.message}\n\nSuggested fix:\n${normalized.fix}`,
        labels: ['RepoAnalyzer-ai', 'RepoAnalyzer-issue']
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

    for (const candidate of candidates) {
      const issue = await createIssue(owner, repo, req.githubToken, candidate);
      created.push(issue);
    }

    return res.json({
      totalRaised: created.length,
      issues: created
    });
  } catch (error) {
    console.error('Raise Issues Error:', error.message);

    return res.status(500).json({
      error: 'Error raising issues in repository'
    });
  }
};

module.exports = { analyzeFiles, raiseIssues };