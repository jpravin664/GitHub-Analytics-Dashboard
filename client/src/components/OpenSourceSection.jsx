import React from 'react';

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="text-5xl mb-4">🌱</div>
    <h4 className="text-gh-text font-semibold mb-2">No external contributions yet</h4>
    <p className="text-gh-muted text-sm max-w-sm">
      Start contributing to open source! — find a project you love, open an issue or submit a PR.
    </p>
    <a
      href="https://github.com/explore"
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 px-4 py-2 rounded-lg border border-gh-accent/40 text-gh-accent text-sm hover:bg-gh-accent/10 transition-colors"
    >
      Explore GitHub →
    </a>
  </div>
);

export default function OpenSourceSection({ contributions, username }) {
  if (!contributions) return null;

  const { totalMergedPRs, totalIssuesOpened, contributedRepos } = contributions;
  const hasContribs = totalMergedPRs > 0 || totalIssuesOpened > 0;

  return (
    <div className="bg-gh-card border border-gh-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🌍</span>
        <div>
          <h3 className="text-gh-text font-semibold text-sm">Open Source Contributions</h3>
          <p className="text-gh-muted text-xs">Merged PRs and issues on external repositories</p>
        </div>
      </div>

      {!hasContribs ? (
        <EmptyState />
      ) : (
        <div className="space-y-5">
          {/* Stat Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-gh-dark rounded-xl p-4 border border-gh-border">
              <div className="text-gh-green font-bold text-2xl">{totalMergedPRs}</div>
              <div className="text-gh-muted text-xs mt-1">Merged PRs (external repos)</div>
            </div>
            <div className="bg-gh-dark rounded-xl p-4 border border-gh-border">
              <div className="text-gh-accent font-bold text-2xl">{totalIssuesOpened}</div>
              <div className="text-gh-muted text-xs mt-1">Issues opened (external repos)</div>
            </div>
            <div className="bg-gh-dark rounded-xl p-4 border border-gh-border">
              <div className="text-gh-purple font-bold text-2xl">{contributedRepos?.length ?? 0}</div>
              <div className="text-gh-muted text-xs mt-1">Unique repos contributed to</div>
            </div>
          </div>

          {/* Repos list */}
          {contributedRepos?.length > 0 && (
            <div>
              <h4 className="text-gh-text text-sm font-medium mb-3">Contributed Repositories</h4>
              <div className="space-y-2">
                {contributedRepos.map((repo, i) => (
                  <div
                    key={repo.name}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border border-gh-border bg-gh-dark hover:border-gh-accent/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-gh-muted text-xs font-mono w-5 text-right flex-shrink-0">
                        {i + 1}
                      </span>
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gh-accent text-sm font-mono hover:underline truncate group-hover:text-gh-text transition-colors"
                      >
                        {repo.name}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gh-green/15 text-gh-green text-xs font-mono">
                        {repo.prCount} PR{repo.prCount !== 1 ? 's' : ''}
                      </span>
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gh-muted hover:text-gh-accent text-xs transition-colors"
                      >
                        ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
