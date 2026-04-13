import FileNode from "./FileNode";

export default function FileTree({ tree, selectedFiles, setSelectedFiles }) {
  return (
    <div>
      {Object.keys(tree).map((key) => (
        <FileNode
          key={key}
          name={key}
          node={tree[key]}
          path={key}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
        />
      ))}
    </div>
  );
}