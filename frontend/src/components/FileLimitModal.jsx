import { AlertCircle, X } from "lucide-react";

export default function FileLimitModal({ isOpen, remainingFiles, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-slate-800 border border-white/20 p-6 max-w-sm mx-4 shadow-lg">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-2">File Selection Limit Reached</h2>
            <p className="text-sm text-white/70 mb-4">
              You can only select up to 5 files per analysis. You have already selected the maximum number of files.
            </p>
            <p className="text-xs text-white/50 mb-6">
              {remainingFiles === 0
                ? "Your analysis quota for this account is full."
                : `You can select ${remainingFiles} more file${remainingFiles !== 1 ? 's' : ''}.`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
