import { useState, useEffect } from "react";
import { AlertCircle, Check, ChevronDown, X } from "lucide-react";

export default function IssueSelectionModal({ isOpen, issues, onConfirm, onCancel }) {
  const [selectedIssues, setSelectedIssues] = useState(new Set());
  const [expandedFile, setExpandedFile] = useState(null);
  const [selectAll, setSelectAll] = useState(false);

  const MAX_ISSUES_TO_SELECT = 25;
  const issuesByFile = {};

  // Group issues by file
  issues?.forEach((issue, idx) => {
    const fileName = issue.fileName || "Unknown";
    if (!issuesByFile[fileName]) {
      issuesByFile[fileName] = [];
    }
    issuesByFile[fileName].push({ ...issue, id: `${fileName}-${idx}` });
  });

  useEffect(() => {
    // Reset when modal opens
    if (isOpen) {
      setSelectedIssues(new Set());
      setSelectAll(false);
      setExpandedFile(null);
    }
  }, [isOpen]);

  const toggleIssue = (issueId) => {
    const newSelected = new Set(selectedIssues);
    if (newSelected.has(issueId)) {
      newSelected.delete(issueId);
      setSelectAll(false);
    } else if (newSelected.size < MAX_ISSUES_TO_SELECT) {
      newSelected.add(issueId);
    }
    setSelectedIssues(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIssues(new Set());
      setSelectAll(false);
    } else {
      const allIssues = new Set();
      let count = 0;
      Object.values(issuesByFile).forEach((fileIssues) => {
        fileIssues.forEach((issue) => {
          if (count < MAX_ISSUES_TO_SELECT) {
            allIssues.add(issue.id);
            count++;
          }
        });
      });
      setSelectedIssues(allIssues);
      setSelectAll(true);
    }
  };

  const toggleFile = (fileName) => {
    setExpandedFile(expandedFile === fileName ? null : fileName);
  };

  const handleConfirm = () => {
    const selectedIssuesList = issues?.filter((issue, idx) => {
      return selectedIssues.has(`${issue.fileName || "Unknown"}-${idx}`);
    }) || [];
    onConfirm(selectedIssuesList);
  };

  if (!isOpen) return null;

  const totalIssues = issues?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-slate-800 border border-white/20 max-w-2xl w-full mx-4 shadow-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-2">Select Issues to Raise</h2>
            <p className="text-sm text-white/70">
              Choose which issues to create in GitHub. Found <span className="font-semibold text-cyan-300">{totalIssues}</span> issue{totalIssues !== 1 ? 's' : ''}.
            </p>
            <p className="text-xs text-white/50 mt-1">
              You can select up to <span className="font-semibold">{MAX_ISSUES_TO_SELECT}</span> issues per batch.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-white/50 hover:text-white transition-colors flex-shrink-0 mt-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Select All */}
        <div className="px-6 py-3 border-b border-white/10 bg-white/5">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={toggleSelectAll}
              disabled={totalIssues === 0}
              className="w-4 h-4 rounded border border-white/20 bg-white/5 accent-cyan-500 cursor-pointer"
            />
            <span className="text-sm text-white/70 group-hover:text-white/90">
              Select all {Math.min(totalIssues, MAX_ISSUES_TO_SELECT)} issue{totalIssues !== 1 ? 's' : ''}
            </span>
            <span className="ml-auto text-xs text-white/50">
              {selectedIssues.size}/{MAX_ISSUES_TO_SELECT}
            </span>
          </label>
        </div>

        {/* Issues List */}
        <div className="flex-1 overflow-y-auto">
          {totalIssues === 0 ? (
            <div className="p-6 text-center">
              <p className="text-white/50 text-sm">No issues found</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {Object.entries(issuesByFile).map(([fileName, fileIssues]) => (
                <div key={fileName} className="border-white/10">
                  <button
                    onClick={() => toggleFile(fileName)}
                    className="w-full px-6 py-3 flex items-center justify-between hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <ChevronDown
                        className={`w-4 h-4 text-white/40 transition-transform ${
                          expandedFile === fileName ? "rotate-180" : ""
                        }`}
                      />
                      <span className="text-sm font-medium text-white/80 break-all">{fileName}</span>
                    </div>
                    <span className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded ml-2">
                      {fileIssues.length}
                    </span>
                  </button>

                  {expandedFile === fileName && (
                    <div className="bg-white/2 border-t border-white/10">
                      {fileIssues.map((issue) => (
                        <label
                          key={issue.id}
                          className="flex items-start gap-3 px-6 py-3 hover:bg-white/5 cursor-pointer border-t border-white/10 group"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIssues.has(issue.id)}
                            onChange={() => toggleIssue(issue.id)}
                            disabled={selectedIssues.size >= MAX_ISSUES_TO_SELECT && !selectedIssues.has(issue.id)}
                            className="w-4 h-4 rounded border border-white/20 bg-white/5 accent-cyan-500 cursor-pointer mt-1 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/80 break-words">{issue.summary || "No summary"}</p>
                            {issue.issues && issue.issues.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {issue.issues.slice(0, 2).map((iss, idx) => (
                                  <div key={idx} className="text-xs text-red-200/70 break-words line-clamp-1">
                                    • {typeof iss === "string" ? iss : iss.message}
                                  </div>
                                ))}
                                {issue.issues.length > 2 && (
                                  <div className="text-xs text-white/40">
                                    +{issue.issues.length - 2} more issue{issue.issues.length - 2 !== 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex gap-3 justify-end">
          {selectedIssues.size >= MAX_ISSUES_TO_SELECT && (
            <p className="text-xs text-amber-200 flex items-center gap-2 mr-auto">
              <AlertCircle className="w-3.5 h-3.5" />
              Maximum selection reached
            </p>
          )}
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/5 text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIssues.size === 0}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Raise {selectedIssues.size} Issue{selectedIssues.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
