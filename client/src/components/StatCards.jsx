import React from 'react';

const StatCard = ({ icon, label, value, color }) => (
  <div className={`bg-gh-card border ${color} rounded-xl p-4 flex items-center gap-4`}>
    <div className="text-2xl flex-shrink-0">{icon}</div>
    <div className="min-w-0">
      <div className="text-gh-text font-bold text-xl leading-tight truncate">{value}</div>
      <div className="text-gh-muted text-xs mt-0.5">{label}</div>
    </div>
  </div>
);

export default function StatCards({ stats }) {
  if (!stats) return null;

  // FIX #3: Destructure all fields the backend sends , totalRepos and
  // totalLifetimeCommits were previously silently dropped.
  const { totalStars, totalForks, mostUsedLanguage, accountAge, totalRepos, totalLifetimeCommits } = stats;

  const cards = [
    {
      icon: '⭐',
      label: 'Total Stars Earned',
      value: totalStars?.toLocaleString() ?? '0',
      color: 'border-gh-orange/40 hover:border-gh-orange/70'
    },
    {
      icon: '🍴',
      label: 'Total Forks',
      value: totalForks?.toLocaleString() ?? '0',
      color: 'border-gh-green/40 hover:border-gh-green/70'
    },
    {
      icon: '💬',
      label: 'Top Language',
      value: mostUsedLanguage || 'N/A',
      color: 'border-gh-accent/40 hover:border-gh-accent/70'
    },
    {
      icon: '🗓',
      label: 'Years on GitHub',
      value: `${accountAge}y`,
      color: 'border-gh-purple/40 hover:border-gh-purple/70'
    },
    // FIX #3: These two stats were fetched by the backend but never displayed.
    {
      icon: '📁',
      label: 'Own Repositories',
      value: totalRepos?.toLocaleString() ?? '0',
      color: 'border-gh-blue/40 hover:border-gh-blue/70'
    },
    {
      icon: '📝',
      label: 'Lifetime Commits',
      value: totalLifetimeCommits != null && totalLifetimeCommits > 0
        ? totalLifetimeCommits.toLocaleString()
        : '—',
      color: 'border-gh-muted/40 hover:border-gh-muted/70'
    },
  ];

  return (
    // FIX #3: Bumped to grid-cols-3 so the two new cards fit cleanly in two rows.
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 h-full">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}