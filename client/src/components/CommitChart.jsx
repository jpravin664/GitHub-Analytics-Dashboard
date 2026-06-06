import React from 'react';
import {
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Area, AreaChart
} from 'recharts';
// FIX #2: Removed unused LineChart and Line imports (dead code / bundle bloat).

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-gh-card border border-gh-border rounded-lg px-3 py-2 text-sm shadow-xl">
        <p className="text-gh-muted">{label}</p>
        <p className="text-gh-green font-semibold">{payload[0].value} commits</p>
      </div>
    );
  }
  return null;
};

export default function CommitChart({ activity }) {
  if (!activity?.length) {
    return (
      <div className="bg-gh-card border border-gh-border rounded-xl p-5 flex flex-col items-center justify-center h-64">
        <p className="text-gh-muted text-sm">No commit activity found</p>
      </div>
    );
  }

  return (
    <div className="bg-gh-card border border-gh-border rounded-xl p-5">
      <h3 className="text-gh-text font-semibold mb-1 text-sm">Commit Activity</h3>
      <p className="text-gh-muted text-xs mb-4">Last 12 months (top 5 repos)</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={activity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="commitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3fb950" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
          <XAxis
            dataKey="month"
            tick={{ fill: '#8b949e', fontSize: 9, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fill: '#8b949e', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="commits"
            stroke="#3fb950"
            strokeWidth={2}
            fill="url(#commitGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#3fb950', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}