import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ── Helpers ───────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-gh-card border border-gh-border rounded-lg px-3 py-2 text-sm shadow-xl">
        <p className="text-gh-text font-medium">{label}</p>
        <p className="text-gh-green">{payload[0].value} commits</p>
      </div>
    );
  }
  return null;
};

// Backend sends full day names ("Monday", …) or "N/A".
const pluralizeDay = (day) => {
  if (!day || day === 'N/A') return '—';
  return `${day}s`; // "Mondays", "Tuesdays", etc.
};

// ── Main component ────────────────────────────────────────────────────────────
// FOCUSED ON: day-of-week patterns, weekend vs weekday split, consistency score.
// Streak rings and commit volume totals live in CommitStreak.
export default function ProductivityInsights({ productivity }) {
  if (!productivity) return null;

  const {
    mostProductiveDay,
    avgCommitsPerWeek = 0,
    dayChart = [],
    weeklyCommits = null,
  } = productivity;

  const displayDayText = pluralizeDay(mostProductiveDay);
  const maxCommits = dayChart.length ? Math.max(...dayChart.map(d => d.commits)) : 0;

  // Weekend vs Weekday
  const weekendDays = ['Sat', 'Sun'];
  const weekdays    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const weekendTotal = dayChart
    .filter(d => weekendDays.includes(d.day))
    .reduce((s, d) => s + d.commits, 0);
  const weekdayTotal = dayChart
    .filter(d => weekdays.includes(d.day))
    .reduce((s, d) => s + d.commits, 0);
  const totalWW = weekendTotal + weekdayTotal;
  const weekendPercent = totalWW ? Math.round((weekendTotal / totalWW) * 100) : 0;
  const isBalanced = weekendPercent >= 20 && weekendPercent <= 40;

  // Consistency score
  const consistencyScore = (() => {
    if (!weeklyCommits?.length) return null;
    const active = weeklyCommits.filter(w => w.commits > 0).length;
    return Math.round((active / weeklyCommits.length) * 100);
  })();

  const consistencyLabel = consistencyScore === null ? null
    : consistencyScore >= 80 ? 'Excellent 🔥'
    : consistencyScore >= 50 ? 'Good 💪'
    : consistencyScore >= 20 ? 'Building 🌱'
    : 'Just Started 🚀';

  // Peak day name (short → full for the bar chart X-axis label matching)
  const peakEntry = dayChart.reduce(
    (best, d) => (d.commits > (best?.commits ?? -1) ? d : best),
    null
  );

  return (
    <div className="bg-gh-card border border-gh-border rounded-xl p-5 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">⚡</span>
        <div>
          <h3 className="text-gh-text font-semibold text-sm">Productivity Insights</h3>
          <p className="text-gh-muted text-xs">When and how consistently you code</p>
        </div>
      </div>

      {/* Day-of-week bar chart , the hero of this card */}
      <div>
        <p className="text-gh-muted text-xs font-mono mb-3">Commits by day of week</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={dayChart} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
            <XAxis
              dataKey="day"
              tick={{ fill: '#8b949e', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#8b949e', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(88,166,255,0.05)' }} />
            <Bar dataKey="commits" radius={[4, 4, 0, 0]}>
              {dayChart.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.commits === maxCommits ? '#d29922' : '#3fb950'}
                  opacity={maxCommits > 0 ? 0.4 + (entry.commits / maxCommits) * 0.6 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Most productive day callout , sits right under its chart */}
        {mostProductiveDay && mostProductiveDay !== 'N/A' && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-gh-dark border border-gh-orange/20 text-xs text-gh-muted">
            🌟 Peak day:{' '}
            <span className="text-gh-orange font-semibold">{displayDayText}</span>
            {avgCommitsPerWeek > 0 && (
              <> , avg{' '}
                <span className="text-gh-green font-semibold">{avgCommitsPerWeek} commits/week</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Weekend vs Weekday */}
      {dayChart.length >= 7 && (
        <div className="px-3 py-2.5 rounded-lg bg-gh-dark border border-gh-purple/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span>🌅</span>
              <span className="text-gh-muted text-xs">Weekend vs Weekday</span>
            </div>
            <span className="text-gh-purple font-mono font-bold text-sm">{weekendPercent}% weekend</span>
          </div>
          <div className="w-full bg-gh-border/40 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-gh-green to-gh-purple transition-all duration-700"
              style={{ width: `${weekendPercent}%` }}
            />
          </div>
          <p className="text-gh-muted text-xs mt-1.5">
            {isBalanced
              ? '🎯 Great balance – coding for work & fun!'
              : weekendPercent > 40
              ? '💪 Weekend warrior – love the passion!'
              : "👔 Mostly weekdays – that's dedication"}
          </p>
        </div>
      )}

      {/* Consistency Score */}
      <div className="px-3 py-2.5 rounded-lg bg-gh-dark border border-gh-accent/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span>📆</span>
            <span className="text-gh-muted text-xs">Weekly Consistency</span>
          </div>
          <span className="text-gh-accent font-mono font-bold text-sm">
            {consistencyScore !== null ? `${consistencyScore}%` : '—'}
          </span>
        </div>
        {consistencyScore !== null ? (
          <>
            <div className="w-full bg-gh-border/40 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-gh-accent to-gh-green transition-all duration-700"
                style={{ width: `${consistencyScore}%` }}
              />
            </div>
            <p className="text-gh-muted text-xs mt-1.5">
              {consistencyLabel} , active in {consistencyScore}% of weeks
            </p>
          </>
        ) : (
          <p className="text-gh-muted text-xs mt-1">
            Not enough weekly data yet , check back after more activity.
          </p>
        )}
      </div>

    </div>
  );
}