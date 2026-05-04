import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, ChevronDown, Loader, Wrench } from "lucide-react";
import RaiseIssuesConfirmModal from "./RaiseIssuesConfirmModal";
import IssueSelectionModal from "./IssueSelectionModal";

export default function AnalysisResultsPanel({
  results,
  loading,
  onRaiseIssues,
  raisingIssues,
  canRaiseIssues,
  issuePermissionMessage,
}) {
  const [openFileName, setOpenFileName] = useState(null);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedIssuesToRaise, setSelectedIssuesToRaise] = useState([]);

  useEffect(() => {
    setOpenFileName(null);
  }, [results]);

  const toggleFile = (fileName) => {
    setOpenFileName((prev) => (prev === fileName ? null : fileName));
  };

  const getTotalIssueCount = () => {
    if (!results || !Array.isArray(results)) return 0;
    return results.reduce((total, file) => {
      const issues = Array.isArray(file.issues)
        ? file.issues
        : Array.isArray(file.analysis?.issues)
          ? file.analysis.issues
          : [];
      return total + issues.length;
    }, 0);
  };

  const handleRaiseIssuesClick = () => {
    setShowSelectionModal(true);
  };

  const handleIssueSelectionConfirm = (selectedIssues) => {
    setSelectedIssuesToRaise(selectedIssues);
    setShowSelectionModal(false);
    setShowConfirmModal(true);
  };

  const handleConfirmRaiseIssues = async () => {
    setShowConfirmModal(false);
    await onRaiseIssues(selectedIssuesToRaise);
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-6 flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-white/60 text-sm">Analyzing your code...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white font-medium">Ready for analysis</p>
          <p className="text-white/60 text-sm mt-1">
            Select files and click analyze to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-6 flex flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Analysis Results</h2>
        <button
          onClick={handleRaiseIssuesClick}
          disabled={!results || results.length === 0 || raisingIssues || !canRaiseIssues}
          className="rounded-md border border-cyan-300/35 bg-cyan-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {raisingIssues ? "Raising..." : "Raise Issues on GitHub"}
        </button>
      </div>

      {!canRaiseIssues && issuePermissionMessage ? (
        <p className="mb-4 rounded-md border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          {issuePermissionMessage}
        </p>
      ) : null}

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {results.map((file, idx) => (
          <ResultCard
            key={idx}
            file={file}
            open={openFileName === file.fileName}
            onToggle={() => toggleFile(file.fileName)}
          />
        ))}
      </div>

      <IssueSelectionModal
        isOpen={showSelectionModal}
        issues={results || []}
        onConfirm={handleIssueSelectionConfirm}
        onCancel={() => setShowSelectionModal(false)}
      />

      <RaiseIssuesConfirmModal
        isOpen={showConfirmModal}
        issueCount={selectedIssuesToRaise.length}
        onConfirm={handleConfirmRaiseIssues}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}

function ResultCard({ file, open, onToggle }) {
  const summary = file.summary || file.analysis?.summary;
  const issues = Array.isArray(file.issues)
    ? file.issues
    : Array.isArray(file.analysis?.issues)
      ? file.analysis.issues
      : [];

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-4 hover:border-white/20 transition-colors">
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-3 text-left">
        <div>
          <p className="text-xs text-white/50 uppercase tracking-wider">File</p>
          <p className="text-sm font-semibold text-white mt-1 break-all">{file.fileName}</p>
          <p className="mt-2 text-xs text-white/65 leading-relaxed">{summary}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded bg-white/10 text-xs text-white/70 whitespace-nowrap">
            {issues.length} issue{issues.length === 1 ? "" : "s"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-white/65 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
          />
        </div>
      </button>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          {issues.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-xs text-white/50">No issues found ✓</p>
            </div>
          ) : (
            issues.map((issue, idx) => <IssueCard key={idx} issue={issue} />)
          )}
        </div>
      ) : null}
    </div>
  );
}

function IssueCard({ issue }) {
  return (
    <div className="rounded-md border border-red-300/20 bg-red-500/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-200 flex items-center gap-2">
        <AlertCircle className="h-3.5 w-3.5" />
        Bug
      </p>
      <p className="mt-2 text-sm text-white/85 leading-relaxed">{issue?.message}</p>

      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200 flex items-center gap-2">
        <Wrench className="h-3.5 w-3.5" />
        Suggested Fix
      </p>
      <p className="mt-1 text-sm text-white/80 leading-relaxed">{issue?.fix}</p>
    </div>
  );
}
