import { AlertTriangle, X } from "lucide-react";

export default function RaiseIssuesConfirmModal({ isOpen, issueCount, onConfirm, onCancel }) {
  if (!isOpen) return null;

  const isHighCount = issueCount > 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-slate-800 border border-white/20 p-6 max-w-sm mx-4 shadow-lg">
        <div className="flex items-start gap-4 mb-6">
          {isHighCount && (
            <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-2">Raise Issues on GitHub?</h2>
            <p className="text-sm text-white/70 mb-3">
              This will create <span className="font-semibold text-cyan-300">{issueCount} issue{issueCount !== 1 ? 's' : ''}</span> in the GitHub repository.
            </p>
            {isHighCount && (
              <p className="text-xs text-yellow-200 bg-yellow-400/10 border border-yellow-300/20 rounded p-2 mb-3">
                ⚠️ A large number of issues may take some time to process and could encounter GitHub API rate limits.
              </p>
            )}
            <p className="text-xs text-white/50">
              Make sure you have the appropriate permissions to create issues in this repository.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-white/50 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/5 text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition-colors"
          >
            Raise Issues
          </button>
        </div>
      </div>
    </div>
  );
}
