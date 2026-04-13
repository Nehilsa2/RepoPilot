const BASE_URL = "http://localhost:5000/api"

export const getRepoFiles = async (repoUrl)=>{
    const res = await fetch(`${BASE_URL}/repo/get-repo-files`,{
        method:"POST",
        headers:{"Content-Type": "application/json"},
        body:JSON.stringify({repoUrl})
    });

    return res.json();
}

export const analyzeFiles = async (repoUrl, selectedFiles) => {
  const res = await fetch(`${BASE_URL}/analysis/analyze-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl, selectedFiles })
  });

  return res.json();
};
