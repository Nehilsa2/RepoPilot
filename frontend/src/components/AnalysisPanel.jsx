export default function AnalysisPanel({ results }) {
  if (!results) return <p>No analysis yet</p>;

  return (
    <div className="space-y-6">
      {results.map((file, idx) => (
        <div key={idx} className="bg-gray-800 p-4 rounded-lg shadow">

          <h2 className="text-lg font-bold mb-2">{file.fileName}</h2>

          {/* Bugs */}
          <div className="mb-2">
            <p className="text-red-400 font-semibold">🔴 Bugs</p>
            <ul className="list-disc ml-5 text-sm">
              {file.analysis.bugs.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>

          {/* Smells */}
          <div className="mb-2">
            <p className="text-yellow-400 font-semibold">🟡 Code Smells</p>
            <ul className="list-disc ml-5 text-sm">
              {file.analysis.code_smells.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          {/* Suggestions */}
          <div className="mb-2">
            <p className="text-blue-400 font-semibold">🔵 Suggestions</p>
            <ul className="list-disc ml-5 text-sm">
              {file.analysis.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <p className="text-green-400 mt-2">
            ⚡ Complexity: {file.analysis.complexity}
          </p>

        </div>
      ))}
    </div>
  );
}