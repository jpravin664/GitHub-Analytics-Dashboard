import React from 'react';
import DashboardContent from './DashboardContent';

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);

function SkeletonBlock({ className }) {
  return <div className={`skeleton ${className}`} />;
}

function ModalLoadingState() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonBlock className="h-40" />
        <div className="col-span-2 grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonBlock key={i} className="h-[72px]" />)}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <SkeletonBlock key={i} className="h-64" />)}
      </div>
      <SkeletonBlock className="h-48" />
    </div>
  );
}

export default function UserSearchModal({ query, data, loading, error, onClose, onRetry }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gh-dark/95 backdrop-blur-sm overflow-y-auto">

      {/* Modal header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gh-border bg-gh-dark/90 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-gh-muted text-sm font-mono">Viewing public profile of</span>
          <span className="px-3 py-1 rounded-full bg-gh-accent/15 border border-gh-accent/30 text-gh-accent font-mono text-sm font-medium">
            @{data?.profile?.login || query}
          </span>
          {data && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono ${
              data._source === 'live'
                ? 'bg-gh-green/15 text-gh-green border border-gh-green/30'
                : 'bg-gh-orange/15 text-gh-orange border border-gh-orange/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${data._source === 'live' ? 'bg-gh-green animate-pulse' : 'bg-gh-orange'}`} />
              {data._source === 'live' ? 'Live' : 'Cached'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {data?.profile?.html_url && (
            <a
              href={data.profile.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gh-border text-gh-muted hover:text-gh-accent hover:border-gh-accent/50 transition-all text-xs font-mono"
            >
              View on GitHub ↗
            </a>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gh-muted hover:text-gh-text hover:bg-gh-card transition-all"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Modal body */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="w-10 h-10 border-2 border-gh-accent border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-gh-text font-medium">Fetching analytics for</p>
              <p className="text-gh-accent font-mono text-lg mt-1">@{query}</p>
              <p className="text-gh-muted text-sm mt-2">Calling GitHub API…</p>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="text-6xl">{error.includes('not found') ? '🔍' : '⚠️'}</div>
            <div className="text-center">
              <h3 className="text-gh-text font-semibold text-xl mb-2">
                {error.includes('not found') ? 'User Not Found' : 'Something went wrong'}
              </h3>
              <p className="text-gh-muted text-sm max-w-sm">
                {error.includes('not found')
                  ? `No GitHub account found with the username "${query}". Check the spelling and try again.`
                  : error}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onRetry}
                className="px-4 py-2 rounded-lg bg-gh-accent text-white text-sm font-medium hover:bg-gh-accent/90 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gh-border text-gh-muted hover:text-gh-text text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Success — full analytics */}
        {!loading && !error && data && (
          <div className="space-y-6">
            {/* Info banner */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gh-accent/20 bg-gh-accent/5 text-sm">
              <span className="text-gh-accent">👁</span>
              <span className="text-gh-muted">
                You are viewing <span className="text-gh-text font-medium">@{data.profile.login}</span>'s public GitHub analytics.
                Only public repositories and data are shown.
              </span>
            </div>

            {/* Reuse the same layout as the main dashboard */}
            <DashboardContent data={data} />
          </div>
        )}
      </div>
    </div>
  );
}
