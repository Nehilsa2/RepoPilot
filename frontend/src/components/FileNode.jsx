import { useState } from "react";
import { ChevronRight, File, Folder } from "lucide-react";

export default function FileNode({ name, node, path, selectedFiles, setSelectedFiles, maxFiles }) {
  const [open, setOpen] = useState(false);
  const isFile = node === null;

  const toggleSelect = () => {
    if (selectedFiles.includes(path)) {
      setSelectedFiles(selectedFiles.filter((file) => file !== path));
    } else if (selectedFiles.length < maxFiles) {
      setSelectedFiles([...selectedFiles, path]);
    } else {
      return;
    }
  };

  if (isFile) {
    return (
      <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 cursor-pointer transition-colors group">
        <input
          type="checkbox"
          checked={selectedFiles.includes(path)}
          disabled={!selectedFiles.includes(path) && selectedFiles.length >= maxFiles}
          onChange={toggleSelect}
          className="w-4 h-4 rounded border border-white/20 bg-white/5 accent-blue-500 cursor-pointer"
        />
        <File className="w-4 h-4 text-white/40 group-hover:text-white/60" />
        <span className="text-xs text-white/70 group-hover:text-white/90 truncate">{name}</span>
      </label>
    );
  }

  return (
    <div>
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 cursor-pointer transition-colors group"
      >
        <ChevronRight
          className={`w-4 h-4 text-white/40 transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
        <Folder className="w-4 h-4 text-yellow-400/60 group-hover:text-yellow-400" />
        <span className="text-xs font-medium text-white/80 group-hover:text-white truncate">
          {name}
        </span>
      </div>

      {open &&
        Object.keys(node).map((child) => (
          <div key={child} className="ml-2">
            <FileNode
              name={child}
              node={node[child]}
              path={`${path}/${child}`}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
              maxFiles={maxFiles}
            />
          </div>
        ))}
    </div>
  );
}
