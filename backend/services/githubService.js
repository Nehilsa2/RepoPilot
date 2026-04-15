const axios = require('axios');

const getHeaders = (token) => ({
  Authorization: `token ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'RepoAnalyzer-ai'
});

const getRepoDefaultBranch = async (owner, repo, token) => {
  const res = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}`,
    { headers: getHeaders(token) }
  );

  return res.data.default_branch || 'main';
};

const getUserRepos = async (token) => {
  const res = await axios.get(
    'https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&sort=updated&per_page=100',
    { headers: getHeaders(token) }
  );

  return res.data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    private: repo.private,
    owner: repo.owner?.login,
    htmlUrl: repo.html_url,
    defaultBranch: repo.default_branch,
    updatedAt: repo.updated_at,
    canCreateIssues: Boolean(
      repo?.has_issues && (repo?.permissions?.push || repo?.permissions?.admin || repo?.permissions?.maintain)
    )
  }));
};

const getAuthenticatedUser = async (token) => {
  const res = await axios.get('https://api.github.com/user', {
    headers: getHeaders(token)
  });

  return res.data;
};

const getRepoAccess = async (owner, repo, token) => {
  const [repoRes, userRes] = await Promise.all([
    axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: getHeaders(token)
    }),
    getAuthenticatedUser(token)
  ]);

  const repository = repoRes.data;
  const viewerLogin = userRes?.login || '';
  const ownerLogin = repository?.owner?.login || owner;
  const isOwnedByViewer = viewerLogin.toLowerCase() === ownerLogin.toLowerCase();
  const canPush = Boolean(
    repository?.permissions?.push || repository?.permissions?.admin || repository?.permissions?.maintain
  );

  return {
    viewerLogin,
    ownerLogin,
    fullName: repository?.full_name,
    htmlUrl: repository?.html_url,
    isOwnedByViewer,
    canCreateIssues: Boolean(repository?.has_issues && canPush),
    hasIssuesEnabled: Boolean(repository?.has_issues)
  };
};

const getRepoTree = async (owner, repo, token) => {
  const defaultBranch = await getRepoDefaultBranch(owner, repo, token);

  const res = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
    { headers: getHeaders(token) }
  );

  return res.data.tree;
};

const getFileContent = async (owner, repo, filePath, token) => {
  const res = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    { headers: getHeaders(token) }
  );

  const encoded = res.data?.content || '';
  const sanitized = encoded.replace(/\n/g, '');
  return Buffer.from(sanitized, 'base64').toString('utf8');
};

const createIssue = async (owner, repo, token, payload) => {
  const res = await axios.post(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    payload,
    { headers: getHeaders(token) }
  );

  return {
    number: res.data.number,
    url: res.data.html_url,
    title: res.data.title
  };
};

module.exports = {
  getRepoTree,
  getFileContent,
  getUserRepos,
  getAuthenticatedUser,
  getRepoAccess,
  createIssue
};