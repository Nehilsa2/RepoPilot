import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import WorkflowShowcase from "../components/WorkflowShowcase";
import LandingBackground from "../components/landing/LandingBackground";
import LandingNav from "../components/landing/LandingNav";
import LandingHero from "../components/landing/LandingHero";
import LandingFeatures from "../components/landing/LandingFeatures";
import LandingMotionStyles from "../components/landing/LandingMotionStyles";
import { buildGithubLoginHref, getCurrentUser, logout } from "../services/api";
import { clearGithubAuth, getGithubUser, isGithubLoggedIn, saveGithubAuth } from "../services/auth";

export default function Landing() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggedIn, setLoggedIn] = useState(isGithubLoggedIn());
  const [githubUser, setGithubUser] = useState(getGithubUser());

  useEffect(() => {
    const bootstrapAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const user = params.get("user");

      if (token) {
        saveGithubAuth({ token, user });

        params.delete("token");
        params.delete("user");
        const nextQuery = params.toString();
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
        window.history.replaceState({}, "", nextUrl);
      }

      if (!isGithubLoggedIn()) {
        setLoggedIn(false);
        setGithubUser(null);
        return;
      }

      try {
        const data = await getCurrentUser();
        setLoggedIn(true);
        setGithubUser(data.user?.username || getGithubUser());
      } catch {
        clearGithubAuth();
        setLoggedIn(false);
        setGithubUser(null);
      }
    };

    bootstrapAuth();
  }, []);

  const loginHref = useMemo(() => buildGithubLoginHref(), []);

  const handleStart = (e) => {
    e.preventDefault();

    if (!loggedIn) {
      setLoginError("GitHub login is required before fetching any repository.");
      return;
    }

    if (repoUrl.trim()) {
      navigate(`/workspace?repo=${encodeURIComponent(repoUrl)}`);
      return;
    }

    navigate("/workspace");
  };

  const handleAnalyzeOwnRepos = () => {
    if (!loggedIn) {
      setLoginError("GitHub login is required before fetching any repository.");
      return;
    }

    navigate("/workspace");
  };

  const handleLogout = async () => {
    try {
      if (isGithubLoggedIn()) {
        await logout();
      }
    } catch {
      // Ignore API logout failures and clear local session regardless.
    }

    clearGithubAuth();
    setLoggedIn(false);
    setGithubUser(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      <LandingBackground />

      <div className="relative z-10">
        <LandingNav
          isLoggedIn={loggedIn}
          githubUser={githubUser}
          loginHref={loginHref}
          onLogout={handleLogout}
        />

        <div className="mx-auto w-[min(96vw,1520px)] px-4 sm:px-6 lg:px-10">
          <LandingHero
            repoUrl={repoUrl}
            setRepoUrl={setRepoUrl}
            onSubmit={handleStart}
            isLoggedIn={loggedIn}
            onAnalyzeOwnRepos={handleAnalyzeOwnRepos}
          />

          {loginError && (
            <div className="mt-5 rounded-xl border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100">
              <p>{loginError}</p>
              <a
                href={loginHref}
                target="_top"
                className="mt-3 inline-block rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition hover:bg-amber-300/20"
              >
                Login with GitHub
              </a>
            </div>
          )}

          <WorkflowShowcase />
          <LandingFeatures />
        </div>

        <div className="border-t border-white/10 backdrop-blur-md mt-20">
          <div className="mx-auto w-[min(96vw,1520px)] px-4 py-8 text-center text-white/50 text-sm sm:px-6 lg:px-10">
            <p>Built for developers who care about code quality</p>
          </div>
        </div>
      </div>
      <LandingMotionStyles />
    </div>
  );
}
