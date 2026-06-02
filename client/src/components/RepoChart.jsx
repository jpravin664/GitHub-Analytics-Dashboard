import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-gh-card border border-gh-border rounded-lg px-3 py-2 text-sm shadow-xl">
        <p className="text-gh-text font-medium font-mono">{label}</p>
        <p className="text-gh-orange">⭐ {payload[0].value} stars</p>
      </div>
    );
  }
  return null;
};

export default function RepoChart({ repos }) {
  if (!repos?.length) {
    return (
      <div className="bg-gh-card border border-gh-border rounded-xl p-5 flex flex-col items-center justify-center h-64">
        <p className="text-gh-muted text-sm">No repos with stars yet</p>
      </div>
    );
  }

  const data = repos.map(r => ({
    name: r.name.length > 12 ? r.name.slice(0, 12) + '…' : r.name,
    stars: r.stars,
    fullName: r.name
  }));

  return (
    <div className="bg-gh-card border border-gh-border rounded-xl p-5">
      <h3 className="text-gh-text font-semibold mb-1 text-sm">Top Repos by Stars</h3>
      <p className="text-gh-muted text-xs mb-4">Your 5 most starred repositories</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: '#8b949e', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#8b949e', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(88,166,255,0.05)' }} />
          <Bar dataKey="stars" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={i === 0 ? '#d29922' : '#58a6ff'}
                opacity={1 - i * 0.12}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
