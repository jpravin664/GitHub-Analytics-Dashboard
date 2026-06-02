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
  const { totalStars, totalForks, mostUsedLanguage, accountAge } = stats;

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
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
