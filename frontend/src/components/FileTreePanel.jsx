import { Zap } from "lucide-react";
import FileNode from "./FileNode";

export default function FileTreePanel({
  tree,
  selectedFiles,
  setSelectedFiles,
  remainingFiles,
  onAnalyze,
  loading,
}) {
  return (
    <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-6 flex flex-col">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">File Structure</h2>
        <p className="text-xs text-white/60 mt-1">
          {selectedFiles.length > 0
            ? `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} selected for analysis`
            : remainingFiles > 0
              ? `Select up to ${remainingFiles} more file${remainingFiles !== 1 ? 's' : ''} to analyze`
              : 'Analysis quota reached for this account'}
        </p>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto mb-4 pr-2">
        {tree && Object.keys(tree).length > 0 ? (
          <div className="space-y-1">
            {Object.keys(tree).map((key) => (
              <FileNode
                key={key}
                name={key}
                node={tree[key]}
                path={key}
                selectedFiles={selectedFiles}
                setSelectedFiles={setSelectedFiles}
                maxFiles={remainingFiles}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-white/50">
            <p className="text-sm">No files available</p>
          </div>
        )}
      </div>

      {/* Analyze Button */}
      <button
        onClick={onAnalyze}
        disabled={!tree || loading || selectedFiles.length === 0 || remainingFiles === 0}
        className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <Zap className="w-4 h-4" />
        {loading ? "Analyzing..." : "Analyze Selected Files"}
      </button>

      {selectedFiles.length === 0 && (
        <p className="text-xs text-white/50 text-center mt-3">
          {remainingFiles > 0
            ? `Select at least one file to analyze, up to ${remainingFiles} more`
            : 'This account has reached the analysis limit'}
        </p>
      )}
    </div>
  );
}
