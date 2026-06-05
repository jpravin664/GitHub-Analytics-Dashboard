import React, { useState } from 'react';

const LANG_COLORS = {
  Python:       '#3572A5', JavaScript:   '#f1e05a', TypeScript:  '#2b7489',
  Java:         '#b07219', 'C++':        '#f34b7d', C:           '#555555',
  Ruby:         '#701516', Go:           '#00ADD8', Rust:        '#dea584',
  HTML:         '#e34c26', CSS:          '#563d7c', Shell:       '#89e051',
  Swift:        '#F05138', Kotlin:       '#A97BFF', PHP:         '#4F5D95',
  'Jupyter Notebook': '#DA5B0B', Vue:   '#41b883', Dart:        '#00B4AB',
  'C#':         '#178600', R:            '#198CE7', Scala:       '#DC322F',
  default:      '#6e7681'
};

const getLangColor = (lang) => LANG_COLORS[lang] || LANG_COLORS.default;

const Arrow = () => (
  <div className="flex flex-col items-center justify-center px-1 text-gh-muted self-center">
    <div className="text-xl">→</div>
  </div>
);

export default function TechTransition({ techTransition }) {
  const [hoveredYear, setHoveredYear] = useState(null);

  if (!techTransition?.length) {
    return (
      <div className="bg-gh-card border border-gh-border rounded-xl p-5 flex flex-col items-center justify-center h-40">
        <p className="text-gh-muted text-sm">Not enough repo history to show transitions yet.</p>
      </div>
    );
  }

  const minRepos = Math.min(...techTransition.map(y => y.totalRepos));
  const maxRepos = Math.max(...techTransition.map(y => y.totalRepos));

  return (
    <div className="bg-gh-card border border-gh-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-lg">🔄</span>
        <div>
          <h3 className="text-gh-text font-semibold text-sm">Tech Stack Evolution</h3>
          <p className="text-gh-muted text-xs">Your technical growth story — year by year</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
        {techTransition.map((yearData, i) => {
          const isHovered = hoveredYear === yearData.year;
          const isLast    = i === techTransition.length - 1;
          
          // FIX #2: Prevent division by zero when maxRepos === 0
          const barWidthPercent = maxRepos === 0 
            ? 0 
            : (yearData.totalRepos / maxRepos) * 100;

          return (
            <React.Fragment key={yearData.year}>
              <div
                className="flex flex-col items-center cursor-pointer group flex-shrink-0"
                onMouseEnter={() => setHoveredYear(yearData.year)}
                onMouseLeave={() => setHoveredYear(null)}
              >
                {/* Year card */}
                <div className={`relative flex flex-col items-center p-3 rounded-xl border transition-all duration-200 min-w-[110px] ${
                  isHovered
                    ? 'border-gh-accent/60 bg-gh-accent/10 scale-105'
                    : 'border-gh-border bg-gh-dark hover:border-gh-border/80'
                }`}>
                  {/* Year label */}
                  <div className="text-gh-accent font-mono font-bold text-sm mb-2">{yearData.year}</div>

                  {/* Top language badge */}
                  <div
                    className="px-2.5 py-1 rounded-full text-xs font-semibold text-white mb-2 shadow"
                    style={{ backgroundColor: getLangColor(yearData.topLang) }}
                  >
                    {yearData.topLang}
                  </div>

                  {/* Activity bar */}
                  <div className="w-full bg-gh-border/30 rounded-full h-1.5 mt-1">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${barWidthPercent}%`,
                        backgroundColor: getLangColor(yearData.topLang)
                      }}
                    />
                  </div>
                  <div className="text-gh-muted text-xs mt-1">{yearData.totalRepos} repo{yearData.totalRepos !== 1 ? 's' : ''}</div>

                  {/* Expanded detail on hover - FIX #1: optional chaining */}
                  {isHovered && yearData.topLangs?.length > 1 && (
                    <div className="mt-2 w-full space-y-1">
                      {yearData.topLangs.slice(1).map(({ lang, count }) => (
                        <div key={lang} className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getLangColor(lang) }} />
                          <span className="text-gh-muted text-xs truncate">{lang}</span>
                          <span className="text-gh-muted text-xs ml-auto">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow between years - now vertically centered */}
              {!isLast && <Arrow />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Summary sentence */}
      {techTransition.length >= 2 && (
        <div className="mt-4 px-3 py-2 rounded-lg bg-gh-dark border border-gh-border text-xs text-gh-muted">
          📈 Started with{' '}
          <span className="font-semibold" style={{ color: getLangColor(techTransition[0].topLang) }}>
            {techTransition[0].topLang}
          </span>{' '}
          in {techTransition[0].year}
          {techTransition[techTransition.length - 1].topLang !== techTransition[0].topLang ? (
            <>
              {' '}→ evolved to{' '}
              <span className="font-semibold" style={{ color: getLangColor(techTransition[techTransition.length-1].topLang) }}>
                {techTransition[techTransition.length-1].topLang}
              </span>{' '}
              by {techTransition[techTransition.length-1].year}
            </>
          ) : (
            <> — consistent {techTransition[0].topLang} focus throughout</>
          )}
        </div>
      )}
    </div>
  );
}