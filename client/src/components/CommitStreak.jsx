import React from 'react';

// ── Ring component ────────────────────────────────────────────────────────────
const Ring = ({ value, max, color, emoji, label, sublabel, unit = 'days' }) => {
  const pct  = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const r    = 38;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 92 92" className="w-full h-full -rotate-90">
          <circle cx="46" cy="46" r={r} fill="none" stroke="#21262d" strokeWidth="7" />
          <circle
            cx="46" cy="46" r={r} fill="none"
            stroke={color} strokeWidth="7"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.2s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-xl leading-none">{emoji}</span>
          <span className="text-gh-text font-bold text-2xl leading-none">{value}</span>
          <span className="text-gh-muted text-xs">{unit}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-gh-text text-sm font-medium">{label}</div>
        {sublabel && <div className="text-gh-muted text-xs mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
};

// ── Streak rate meter ─────────────────────────────────────────────────────────
const StreakRateMeter = ({ rate }) => {
  const color = rate >= 80 ? '#3fb950' : rate >= 50 ? '#d29922' : rate >= 20 ? '#58a6ff' : '#6e7681';
  const label = rate >= 80 ? 'On Fire 🔥' : rate >= 50 ? 'Solid 💪' : rate >= 20 ? 'Building 🌱' : 'Just Starting 🚀';

  return (
    <div className="bg-gh-dark rounded-xl p-4 border border-gh-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gh-muted text-xs">Streak Rate</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{rate}%</span>
      </div>
      <div className="w-full bg-gh-border/40 rounded-full h-2 mb-2">
        <div
          className="h-2 rounded-full transition-all duration-1000"
          style={{ width: `${rate}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color }}>{label}</span>
        {/* Clarifies what the ratio means , current streak vs personal best */}
        <span className="text-gh-muted text-xs">current / longest</span>
      </div>
    </div>
  );
};

// ── Motivational message ──────────────────────────────────────────────────────
const getMotivation = (current, longest, rate) => {
  if (current === 0 && longest === 0)
    return { msg: "No streak data yet , refresh in 30s for GitHub to compute your stats!", color: 'text-gh-muted', icon: '⏳' };
  if (current === 0)
    return { msg: `Your best was ${longest} days. Start a new streak today! 💪`, color: 'text-gh-accent', icon: '🎯' };
  if (current >= longest && longest > 0)
    return { msg: "You're on your LONGEST streak ever! Don't stop now! 🚀", color: 'text-gh-green', icon: '🏆' };
  if (rate >= 80)
    return { msg: `${longest - current} more days to beat your personal best!`, color: 'text-gh-orange', icon: '🔥' };
  return { msg: `Keep going! You've been consistent for ${current} days.`, color: 'text-gh-accent', icon: '💡' };
};

// ── Main component ────────────────────────────────────────────────────────────
// FOCUSED ON: streak rings, streak rate, and motivational context.
// Commit volume stats (total commits, avg/week, avg/day) live in ProductivityInsights.
export default function CommitStreak({ productivity, stats }) {
  if (!productivity) return null;

  const {
    currentStreak     = 0,
    longestStreak     = 0,
    streakRate        = 0,
    avgCommitsPerWeek = 0,
  } = productivity;

  const totalLifetimeCommits = stats?.totalLifetimeCommits || productivity.totalCommits || 0;

  const { msg, color, icon } = getMotivation(currentStreak, longestStreak, streakRate);
  const maxRing = Math.max(longestStreak, 1);

  return (
    <div className="bg-gh-card border border-gh-border rounded-xl p-5 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-orange-400 text-lg">🔥</span>
          <div>
            <h3 className="text-gh-text font-semibold text-sm">Commit Streaks</h3>
            <p className="text-gh-muted text-xs">GitHub removed this in 2016 , we brought it back</p>
          </div>
        </div>
        {streakRate > 0 && (
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
            streakRate >= 80
              ? 'bg-gh-green/15 text-gh-green border-gh-green/30'
              : streakRate >= 50
              ? 'bg-gh-orange/15 text-gh-orange border-gh-orange/30'
              : 'bg-gh-accent/15 text-gh-accent border-gh-accent/30'
          }`}>
            {streakRate}% streak rate
          </span>
        )}
      </div>

      {/* Streak rings */}
      <div className="flex justify-around items-center py-2">
        <Ring
          value={currentStreak}
          max={maxRing}
          color="#d29922"
          emoji="🔥"
          label="Current Streak"
          sublabel={currentStreak > 0 ? 'keep it going!' : 'start today'}
          unit="days"
        />
        <div className="flex flex-col items-center gap-1">
          <div className="w-px h-16 bg-gh-border" />
          <span className="text-gh-muted text-xs font-mono">vs</span>
          <div className="w-px h-16 bg-gh-border" />
        </div>
        <Ring
          value={longestStreak}
          max={maxRing}
          color="#3fb950"
          emoji="🏆"
          label="Longest Streak"
          sublabel="personal best"
          unit="days"
        />
      </div>

      {/* Streak rate meter */}
      {longestStreak > 0 && <StreakRateMeter rate={streakRate} />}

      {/* Quick-glance commit volume row , condensed single row, not 3 big tiles.
          Full per-day/per-week breakdown is in ProductivityInsights. */}
      <div className="grid grid-cols-3 divide-x divide-gh-border rounded-xl border border-gh-border overflow-hidden">
        {[
          {
            emoji: '📊',
            value: totalLifetimeCommits > 0 ? totalLifetimeCommits.toLocaleString() : '—',
            label: 'Total commits',
            color: '#bc8cff',
          },
          {
            emoji: '📅',
            value: avgCommitsPerWeek > 0 ? avgCommitsPerWeek : '—',
            label: 'Avg / week',
            color: '#58a6ff',
          },
          {
            emoji: '⚡',
            value: avgCommitsPerWeek > 0 ? (avgCommitsPerWeek / 7).toFixed(1) : '—',
            label: 'Avg / day',
            color: '#3fb950',
          },
        ].map(({ emoji, value, label, color }) => (
          <div key={label} className="flex flex-col items-center py-3 px-2 bg-gh-dark text-center">
            <span className="text-base mb-0.5">{emoji}</span>
            <span className="font-bold text-base leading-tight" style={{ color }}>{value}</span>
            <span className="text-gh-muted text-xs mt-0.5">{label}</span>
          </div>
        ))}
      </div>

      {/* Motivational message */}
      <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg bg-gh-dark border border-gh-border text-xs ${color}`}>
        <span className="flex-shrink-0 mt-0.5">{icon}</span>
        <span>{msg}</span>
      </div>

    </div>
  );
}