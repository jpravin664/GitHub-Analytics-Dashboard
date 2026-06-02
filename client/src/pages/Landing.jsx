import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const StarField = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(60)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-white"
        style={{
          width: Math.random() * 2 + 1 + 'px',
          height: Math.random() * 2 + 1 + 'px',
          top: Math.random() * 100 + '%',
          left: Math.random() * 100 + '%',
          opacity: Math.random() * 0.6 + 0.1,
          animation: `pulse ${Math.random() * 3 + 2}s ease-in-out infinite`,
          animationDelay: Math.random() * 3 + 's'
        }}
      />
    ))}
  </div>
);

const FeatureCard = ({ icon, title, desc, delay }) => (
  <div
    className="animate-fade-in-up p-5 rounded-xl border border-gh-border bg-gh-card/60 backdrop-blur-sm hover:border-gh-accent/40 transition-colors"
    style={{ animationDelay: delay }}
  >
    <div className="text-2xl mb-3">{icon}</div>
    <h3 className="font-semibold text-gh-text mb-1">{title}</h3>
    <p className="text-gh-muted text-sm leading-relaxed">{desc}</p>
  </div>
);

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleLogin = () => {
    window.location.href = 'http://localhost:5000/auth/github';
  };

  return (
    <div className="min-h-screen bg-gh-dark relative flex flex-col">
      <StarField />

      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gh-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gh-purple/5 rounded-full blur-3xl pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-gh-border/50">
        <div className="flex items-center gap-2">
          <GithubIcon />
          <span className="font-mono font-medium text-gh-text">gh/analytics</span>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gh-muted text-sm hover:text-gh-text transition-colors"
        >
          GitHub ↗
        </a>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gh-green/30 bg-gh-green/10 text-gh-green text-xs font-mono mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-gh-green animate-pulse" />
            Open Source Analytics
          </div>
        </div>

        <h1
          className="animate-fade-in-up text-5xl md:text-7xl font-bold text-gh-text tracking-tight leading-none mb-6"
          style={{ animationDelay: '0.2s' }}
        >
          Your GitHub
          <br />
          <span className="text-gh-accent">Activity</span>,{' '}
          <span className="text-gh-purple">Visualized</span>
        </h1>

        <p
          className="animate-fade-in-up text-gh-muted text-lg md:text-xl max-w-xl leading-relaxed mb-10"
          style={{ animationDelay: '0.3s' }}
        >
          Dive deep into your contribution patterns, language usage, star history,
          and open source impact — all in one beautiful dashboard.
        </p>

        {error && (
          <div className="animate-fade-in-up mb-6 px-4 py-3 rounded-lg border border-gh-red/40 bg-gh-red/10 text-gh-red text-sm">
            Authentication failed. Please try again.
          </div>
        )}

        <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={handleLogin}
            className="animate-pulse-glow flex items-center gap-3 px-7 py-3.5 rounded-xl bg-gh-text text-gh-dark font-semibold hover:bg-white transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <GithubIcon />
            Login with GitHub
          </button>
        </div>

        <p className="animate-fade-in-up mt-4 text-gh-muted text-xs" style={{ animationDelay: '0.5s' }}>
          Only read-only access. We never store your code.
        </p>

        {/* Feature Cards */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full text-left">
          <FeatureCard
            icon="📊"
            title="Contribution Charts"
            desc="Commit history, language distribution, and repo stars — all rendered as crisp interactive charts."
            delay="0.6s"
          />
          <FeatureCard
            icon="🌍"
            title="Open Source Tracker"
            desc="See all your merged PRs and issues across external repos. Quantify your community impact."
            delay="0.7s"
          />
          <FeatureCard
            icon="⚡"
            title="Smart Caching"
            desc="MongoDB-backed 1-hour cache ensures fast loads without hammering the GitHub API."
            delay="0.8s"
          />
        </div>
      </main>

      <footer className="relative z-10 border-t border-gh-border/50 px-6 py-4 text-center text-gh-muted text-xs font-mono">
        Built with GitHub OAuth · Express · MongoDB · React · Recharts
      </footer>
    </div>
  );
}
