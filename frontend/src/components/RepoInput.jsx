export default function RepoInput({ repoUrl, setRepoUrl, onFetch }) {
  return (
    <div>
      <input
        type="text"
        placeholder="Enter GitHub Repo URL"
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
        style={{ width: "100%" }}
      />
      <button onClick={onFetch}>Fetch Files</button>
    </div>
  );
}