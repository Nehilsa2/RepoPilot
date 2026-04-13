import { useState } from "react";

export default function FileNode({ name, node, path, selectedFiles, setSelectedFiles }) {
  const [open, setOpen] = useState(false);
  const isFile = node === null;

  const toggleSelect = () => {
    if (selectedFiles.includes(path)) {
      setSelectedFiles(selectedFiles.filter(f => f !== path));
    } else {
      setSelectedFiles([...selectedFiles, path]);
    }
  };

  if (isFile) {
    return (
      <div className="ml-4 flex items-center gap-2 hover:bg-gray-800 p-1 rounded">
        <input
          type="checkbox"
          checked={selectedFiles.includes(path)}
          onChange={toggleSelect}
        />
        <span className="text-sm">📄 {name}</span>
      </div>
    );
  }

  return (
    <div className="ml-2">
      <div
        onClick={() => setOpen(!open)}
        className="cursor-pointer hover:bg-gray-800 p-1 rounded"
      >
        📂 {name}
      </div>

      {open &&
        Object.keys(node).map(child => (
          <FileNode
            key={child}
            name={child}
            node={node[child]}
            path={`${path}/${child}`}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
          />
        ))}
    </div>
  );
}