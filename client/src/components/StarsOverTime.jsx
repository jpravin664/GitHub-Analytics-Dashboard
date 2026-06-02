import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-gh-card border border-gh-border rounded-lg px-3 py-2 text-sm shadow-xl">
        <p className="text-gh-text font-medium font-mono">{d.repo}</p>
        <p className="text-gh-orange">+{d.newStars} ⭐ new stars</p>
        <p className="text-gh-muted text-xs">Total: {d.stars} stars · {d.month}</p>
      </div>
    );
  }
  return null;
};

export default function StarsOverTime({ starsOverTime }) {
  if (!starsOverTime?.length) {
    return (
      <div className="bg-gh-card border border-gh-border rounded-xl p-5 flex flex-col items-center justify-center h-64">
        <div className="text-4xl mb-3">⭐</div>
        <p className="text-gh-muted text-sm text-center">No starred repos yet.<br/>Star count will grow as you build!</p>
      </div>
    );
  }

  const peak = starsOverTime.reduce((max, d) => d.newStars > max.newStars ? d : max, starsOverTime[0]);

  return (
    <div className="bg-gh-card border border-gh-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <div>
            <h3 className="text-gh-text font-semibold text-sm">Stars Over Time</h3>
            <p className="text-gh-muted text-xs">GitHub only shows your current total</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-gh-orange font-bold text-xl">{starsOverTime[starsOverTime.length-1]?.stars || 0}</div>
          <div className="text-gh-muted text-xs">total stars</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={starsOverTime} margin={{ top:10, right:0, left:-20, bottom:0 }}>
          <defs>
            <linearGradient id="starsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#d29922" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#d29922" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
          <XAxis dataKey="month" tick={{ fill:'#8b949e', fontSize:9, fontFamily:'JetBrains Mono' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill:'#8b949e', fontSize:10 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {peak && (
            <ReferenceLine
              x={peak.month}
              stroke="#d29922"
              strokeDasharray="4 4"
              label={{ value:`Peak: ${peak.repo}`, fill:'#d29922', fontSize:10, position:'top' }}
            />
          )}
          <Area
            type="monotone"
            dataKey="stars"
            stroke="#d29922"
            strokeWidth={2}
            fill="url(#starsGrad)"
            dot={{ r:4, fill:'#d29922', strokeWidth:0 }}
            activeDot={{ r:6, fill:'#d29922', strokeWidth:0 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Repo milestones */}
      <div className="mt-3 space-y-1">
        <p className="text-gh-muted text-xs font-mono mb-2">Repo milestones</p>
        {starsOverTime.slice(-4).reverse().map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-gh-accent font-mono truncate max-w-[60%]">{d.repo}</span>
            <span className="text-gh-orange">+{d.newStars} ⭐</span>
          </div>
        ))}
      </div>
    </div>
  );
}
