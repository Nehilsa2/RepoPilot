import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { analyzeFiles, buildGithubLoginHref, getCurrentUser, getMyRepos, getRepoFiles, logout, raiseIssues } from "../services/api";
import RepositoryPanel from "../components/RepositoryPanel";
import FileTreePanel from "../components/FileTreePanel";
import AnalysisResultsPanel from "../components/AnalysisResultsPanel";
import FileLimitModal from "../components/FileLimitModal";
import LoadingSpinner from "../components/LoadingSpinner";
import WorkspaceBackground from "../components/workspace/WorkspaceBackground";
import WorkspaceHeader from "../components/workspace/WorkspaceHeader";
import WorkspaceIntroCard from "../components/workspace/WorkspaceIntroCard";
import WorkspaceMotionStyles from "../components/workspace/WorkspaceMotionStyles";
import { clearGithubAuth, getGithubUser, isGithubLoggedIn, saveGithubAuth } from "../services/auth";

const MAX_FILES_PER_ACCOUNT = 5;

export default function Workspace() {
  const [searchParams] = useSearchParams();
  const initialRepoUrl = searchParams.get("repo") || "";

  const [repoUrl, setRepoUrl] = useState(initialRepoUrl);
  const [repos, setRepos] = useState([]);
  const [tree, setTree] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [fetchingRepo, setFetchingRepo] = useState(false);
  const [error, setError] = useState(null);
  const [raisingIssues, setRaisingIssues] = useState(false);
  const [raiseMessage, setRaiseMessage] = useState(null);
  const [repoAccess, setRepoAccess] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [githubUser, setGithubUser] = useState("");
  const [repoCount, setRepoCount] = useState(0);
  const [analysisFilesUsed, setAnalysisFilesUsed] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const tokenFromQuery = searchParams.get("token");
      const userFromQuery = searchParams.get("user");

      if (tokenFromQuery) {
        saveGithubAuth({ token: tokenFromQuery, user: userFromQuery });

        const params = new URLSearchParams(window.location.search);
        params.delete("token");
        params.delete("user");
        const nextQuery = params.toString();
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
        window.history.replaceState({}, "", nextUrl);
      }

      if (!isGithubLoggedIn()) {
        setIsLoggedIn(false);
        setGithubUser("");
        setAuthChecked(true);
        return;
      }

      try {
        const data = await getCurrentUser();
        setIsLoggedIn(true);
        setGithubUser(data.user?.username || getGithubUser() || "");
        setAnalysisFilesUsed(Number(data.user?.analysisFilesUsed || 0));
      } catch {
        clearGithubAuth();
        setIsLoggedIn(false);
        setGithubUser("");
        setAnalysisFilesUsed(0);
      } finally {
        setAuthChecked(true);
      }
    };

    bootstrapAuth();
  }, [searchParams]);

  const fetchUserRepos = useCallback(async () => {
    if (!isLoggedIn) {
      setRepos([]);
      setRepoCount(0);
      return;
    }

    try {
      setLoadingRepos(true);
      const data = await getMyRepos();
      setRepos(data.repos || []);
      setRepoCount(data.totalRepos || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRepos(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchUserRepos();
  }, [fetchUserRepos]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (repoUrl) {
      params.set("repo", repoUrl);
    } else {
      params.delete("repo");
    }

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [repoUrl]);

  const handleFetch = useCallback(async (repoUrlOverride) => {
    const overrideUrl = typeof repoUrlOverride === "string" ? repoUrlOverride : "";
    const targetRepoUrl = (overrideUrl || repoUrl || "").trim();

    if (!isLoggedIn) {
      setError("GitHub login is required before fetching repositories.");
      return;
    }

    if (!targetRepoUrl) {
      return;
    }

    try {
      setFetchingRepo(true);
      setError(null);
      setRaiseMessage(null);
      const data = await getRepoFiles(targetRepoUrl);
      setTree(data.tree);
      setRepoAccess(data.access || null);
      setSelectedFiles([]);
      setResults(null);
      if (data.quota) {
        setAnalysisFilesUsed(Number(data.quota.used || 0));
      }
    } catch (err) {
      setError(err.message || "Failed to fetch repository. Please check the URL and try again.");
      console.error(err);
    } finally {
      setFetchingRepo(false);
    }
  }, [isLoggedIn, repoUrl]);

  const handleRepoUrlChange = (nextRepoUrl) => {
    setRepoUrl(nextRepoUrl);
    setError(null);
  };

  const handleRepoSelect = (nextRepoUrl) => {
    setRepoUrl(nextRepoUrl);

    if (!nextRepoUrl) {
      setTree(null);
      setSelectedFiles([]);
      setResults(null);
      setRepoAccess(null);
    }
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!isLoggedIn) {
      setError("GitHub login is required before analysis.");
      return;
    }

    if (!tree || selectedFiles.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      setRaiseMessage(null);
      const data = await analyzeFiles(repoUrl, selectedFiles);
      setResults(data.files);
      if (data.access) {
        setRepoAccess(data.access);
      }
    } catch (err) {
      setError(err.message || "Analysis failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRaiseIssues = async () => {
    if (!results || results.length === 0) {
      return;
    }

    try {
      setRaisingIssues(true);
      setError(null);
      setRaiseMessage(null);

      const data = await raiseIssues(repoUrl, results);
      setRaiseMessage(`Raised ${data.totalRaised} issues in GitHub repository.`);
    } catch (err) {
      setError(err.message || "Failed to raise issues in GitHub.");
      console.error(err);
    } finally {
      setRaisingIssues(false);
    }
  };

  const loginHref = buildGithubLoginHref();

  const handleLogout = async () => {
    try {
      if (isGithubLoggedIn()) {
        await logout();
      }
    } catch {
      // Ignore API logout failures and clear local session regardless.
    }

    clearGithubAuth();
    setIsLoggedIn(false);
    setGithubUser("");
    setRepos([]);
    setRepoCount(0);
    setAnalysisFilesUsed(0);
    setTree(null);
    setSelectedFiles([]);
    setResults(null);
    setRepoAccess(null);
  };

  const issuePermissionMessage = repoAccess && !repoAccess.canCreateIssues
    ? "Issue creation is disabled for this repository. You can still analyze code, but raising issues is only enabled for repositories you can push to with this GitHub account."
    : "";

  const remainingFiles = Math.max(0, MAX_FILES_PER_ACCOUNT - analysisFilesUsed);

  if (!authChecked) {
    return <LoadingSpinner message="Verifying session..." />;
  }

  if (fetchingRepo) {
    return <LoadingSpinner message="Fetching repository structure..." />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <WorkspaceBackground />
      <div className="relative z-10">
        <WorkspaceHeader
          repoUrl={repoUrl}
          selectedCount={selectedFiles.length}
          resultCount={results ? results.length : 0}
          remainingFiles={remainingFiles}
        />

        <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <WorkspaceIntroCard repoUrl={repoUrl} githubUser={githubUser} repoCount={repoCount} />

        {isLoggedIn && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleLogout}
              className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/80 transition hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
            {error}
            {!isLoggedIn && (
              <a
                href={loginHref}
                target="_top"
                className="ml-4 rounded-md border border-red-300/30 bg-red-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition hover:bg-red-300/20"
              >
                Login with GitHub
              </a>
            )}
          </div>
        )}

        {raiseMessage && (
          <div className="mb-6 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {raiseMessage}
          </div>
        )}

          <div className="workspace-grid-enter mt-6 grid gap-6 lg:grid-cols-[320px_1fr_1fr]">
            <RepositoryPanel
              repoUrl={repoUrl}
              repoOptions={repos}
              loadingRepos={loadingRepos}
              onRepoUrlChange={handleRepoUrlChange}
              onRepoSelect={handleRepoSelect}
              onFetch={handleFetch}
              onRefreshRepos={fetchUserRepos}
            />
            <FileTreePanel
              tree={tree}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
              remainingFiles={remainingFiles}
              onAnalyze={handleAnalyze}
              loading={loading}
              onLimitReached={() => setShowLimitModal(true)}
            />
            <AnalysisResultsPanel
              results={results}
              loading={loading}
              onRaiseIssues={handleRaiseIssues}
              raisingIssues={raisingIssues}
              canRaiseIssues={repoAccess ? Boolean(repoAccess.canCreateIssues) : true}
              issuePermissionMessage={issuePermissionMessage}
            />
          </div>
        </main>
      </div>
      <FileLimitModal
        isOpen={showLimitModal}
        remainingFiles={remainingFiles}
        onClose={() => setShowLimitModal(false)}
      />
      <WorkspaceMotionStyles />
    </div>
  );
}
