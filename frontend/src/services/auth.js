const SESSION_TOKEN_KEY = "RepoPilot_session_token";
const GITHUB_USER_KEY = "RepoPilot_github_user";

export const getSessionToken = () => localStorage.getItem(SESSION_TOKEN_KEY);

export const getGithubUser = () => localStorage.getItem(GITHUB_USER_KEY);

export const isGithubLoggedIn = () => Boolean(getSessionToken());

export const saveGithubAuth = ({ token, user }) => {
  if (token) {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }

  if (user) {
    localStorage.setItem(GITHUB_USER_KEY, user);
  }
};

export const clearGithubAuth = () => {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(GITHUB_USER_KEY);
};
