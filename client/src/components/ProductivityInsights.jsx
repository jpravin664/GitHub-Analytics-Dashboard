import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const StatPill = ({ icon, label, value, color }) => (
  <div className={`flex flex-col items-center justify-center p-4 rounded-xl border ${color} bg-gh-dark`}>
    <span className="text-2xl mb-1">{icon}</span>
    <span className="text-gh-text font-bold text-xl leading-tight">{value}</span>
    <span className="text-gh-muted text-xs mt-0.5 text-center">{label}</span>
  </div>
);

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

export default function ProductivityInsights({ productivity, stats }) {
  if (!productivity) return null;

  const {
    mostProductiveDay,
    avgCommitsPerWeek = 0,
    currentStreak = 0,
    longestStreak = 0,
    streakRate = 0,
    dayChart = [],
    weeklyCommits = null,
  } = productivity;

  const totalCommits = stats?.totalLifetimeCommits || productivity.totalCommits || 0;
  const maxCommits = dayChart.length ? Math.max(...dayChart.map(d => d.commits)) : 0;
  const shortDay = mostProductiveDay?.slice(0, 3) || '—';

  // Weekend vs Weekday
  const weekendDays = ['Sat', 'Sun'];
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const weekendTotal = dayChart
    .filter(d => weekendDays.includes(d.day))
    .reduce((sum, d) => sum + d.commits, 0);
  const weekdayTotal = dayChart
    .filter(d => weekdays.includes(d.day))
    .reduce((sum, d) => sum + d.commits, 0);
  const totalWeekdayWeekend = weekendTotal + weekdayTotal;
  const weekendPercent = totalWeekdayWeekend ? Math.round((weekendTotal / totalWeekdayWeekend) * 100) : 0;
  const isBalanced = weekendPercent >= 20 && weekendPercent <= 40;

  // Consistency Score
  const computeConsistency = () => {
    if (!weeklyCommits || !weeklyCommits.length) return null;
    const weeksWithCommits = weeklyCommits.filter(w => w.commits > 0).length;
    return Math.round((weeksWithCommits / weeklyCommits.length) * 100);
  };
  const consistencyScore = computeConsistency();
  const consistencyLabel = consistencyScore >= 80 ? 'Excellent 🔥' : consistencyScore >= 50 ? 'Good 💪' : consistencyScore >= 20 ? 'Building 🌱' : 'Just Started 🚀';

  return (
    <div className="bg-gh-card border border-gh-border rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">⚡</span>
        <div>
          <h3 className="text-gh-text font-semibold text-sm">Productivity Insights</h3>
          <p className="text-gh-muted text-xs">Your commit patterns</p>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-5">
        <StatPill icon="🏆" label="Most Active Day" value={shortDay} color="border-gh-green/30" />
        <StatPill icon="📅" label="Avg / Week" value={avgCommitsPerWeek} color="border-gh-accent/30" />
        <StatPill icon="🔥" label="Current Streak" value={`${currentStreak}d`} color="border-gh-orange/30" />
        <StatPill icon="🎯" label="Longest Streak" value={`${longestStreak}d`} color="border-gh-purple/30" />
        <StatPill icon="📊" label="Total Commits" value={totalCommits.toLocaleString()} color="border-gh-blue/30" />
      </div>

      {/* Streak Rate progress bar */}
      {streakRate !== undefined && streakRate !== null && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-gh-dark border border-gh-border">
          <div className="flex justify-between text-xs text-gh-muted mb-1">
            <span>🔥 Streak Rate</span>
            <span>{streakRate}%</span>
          </div>
          <div className="w-full bg-gh-border/40 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-gh-orange to-gh-green transition-all duration-1000"
              style={{ width: `${streakRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Two-column layout: chart (left) + boxes (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Commit patterns chart */}
        <div>
          <p className="text-gh-muted text-xs font-mono mb-3">Commits by day of week</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={dayChart} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} />
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
        </div>

        {/* Right: Two stacked boxes */}
        <div className="space-y-4">
          {/* Box 1: Weekend vs Weekday */}
          {dayChart && dayChart.length >= 7 && (
            <div className="px-3 py-2 rounded-lg bg-gh-dark border border-gh-purple/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌅</span>
                  <span className="text-gh-muted text-xs">Weekend vs Weekday</span>
                </div>
                <span className="text-gh-purple font-mono font-bold text-sm">{weekendPercent}% weekend</span>
              </div>
              <div className="w-full bg-gh-border/40 rounded-full h-1.5 mt-2">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-gh-green to-gh-purple"
                  style={{ width: `${weekendPercent}%` }}
                />
              </div>
              <div className="text-gh-muted text-xs mt-1">
                {isBalanced
                  ? "🎯 Great balance – coding for work & fun!"
                  : weekendPercent > 40
                  ? "💪 Weekend warrior – love the passion!"
                  : "👔 Mostly weekdays – that’s dedication"}
              </div>
            </div>
          )}

          {/* Box 2: Consistency Score */}
          <div className="px-3 py-2 rounded-lg bg-gh-dark border border-gh-accent/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📆</span>
                <span className="text-gh-muted text-xs">Consistency Score</span>
              </div>
              <span className="text-gh-accent font-mono font-bold text-sm">
                {consistencyScore !== null ? `${consistencyScore}%` : '—'}
              </span>
            </div>
            {consistencyScore !== null ? (
              <>
                <div className="w-full bg-gh-border/40 rounded-full h-1.5 mt-2">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-gh-accent to-gh-green"
                    style={{ width: `${consistencyScore}%` }}
                  />
                </div>
                <div className="text-gh-muted text-xs mt-1">
                  {consistencyLabel} – you commit in {consistencyScore}% of weeks
                </div>
              </>
            ) : (
              <div className="text-gh-muted text-xs mt-1">
                ⚠️ Add `weeklyCommits` array to `productivity` (e.g., last 12 weeks) to enable this metric.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Most productive day callout (still below) */}
      {mostProductiveDay && (
        <div className="mt-4 px-3 py-2 rounded-lg bg-gh-dark border border-gh-orange/20 text-xs text-gh-muted">
          🌟 You commit most on <span className="text-gh-orange font-semibold">{shortDay}s</span>
          {avgCommitsPerWeek > 0 && <> — averaging <span className="text-gh-green font-semibold">{avgCommitsPerWeek} commits/week</span></>}
        </div>
      )}
    </div>
  );
}