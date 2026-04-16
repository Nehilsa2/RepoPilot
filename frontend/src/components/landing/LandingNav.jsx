import { Globe } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingNav({ isLoggedIn, githubUser, loginHref, onLogout }) {
  return (
    <nav className="border-b border-white/10 backdrop-blur-md">
      <div className="mx-auto flex w-[min(96vw,1520px)] items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3" aria-label="Go to home page">
          <div className="brand-logo flex h-10 w-10 items-center justify-center shadow-lg shadow-cyan-500/30">
            <img src="/favicon.png" alt="RepoPilot logo" className="relative z-10 h-7 w-7 object-contain" />
          </div>
          <div>
            <p className="brand-wordmark text-lg font-semibold tracking-tight">RepoPilot AI</p>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Repo Intelligence</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <a href="https://github.com" className="rounded-full border border-white/15 p-2 text-white/70 transition hover:border-white/30 hover:text-white">
            <Globe className="h-5 w-5" />
          </a>

          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.16em] text-white/60">{githubUser || "Connected"}</span>
              <button
                onClick={onLogout}
                className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white/80 transition hover:border-white/35 hover:text-white"
              >
                Logout
              </button>
            </div>
          ) : (
            <a
              href={loginHref}
              target="_top"
              className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/20"
            >
              Login with GitHub
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
