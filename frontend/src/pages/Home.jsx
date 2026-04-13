import { useState } from "react";
import RepoInput from "../components/RepoInput";
import FileTree from "../components/FileTree";
import AnalysisPanel from "../components/AnalysisPanel";
import { getRepoFiles, analyzeFiles } from "../services/api";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [tree, setTree] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    const data = await getRepoFiles(repoUrl);
    setTree(data.tree);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    const data = await analyzeFiles(repoUrl, selectedFiles);
    setResults(data.files);
    setLoading(false);
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex">

      {/* LEFT PANEL */}
      <div className="w-1/3 border-r border-gray-700 p-4">
        <h1 className="text-xl font-bold mb-4">🚀 Repo Analyzer</h1>

        <RepoInput repoUrl={repoUrl} setRepoUrl={setRepoUrl} onFetch={handleFetch} />

        {tree && (
          <div className="mt-4 overflow-y-auto h-[70vh]">
            <FileTree
              tree={tree}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
            />
          </div>
        )}

        <button
          onClick={handleAnalyze}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 p-2 rounded"
        >
          Analyze Selected
        </button>

        {loading && <p className="mt-2 text-sm">🔍 Analyzing...</p>}
      </div>

      {/* RIGHT PANEL */}
      <div className="w-2/3 p-6 overflow-y-auto">
        <AnalysisPanel results={results} />
      </div>
    </div>
  );
}