import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#58a6ff', '#3fb950', '#bc8cff', '#d29922', '#f85149', '#79c0ff', '#56d364', '#e3b341'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-gh-card border border-gh-border rounded-lg px-3 py-2 text-sm shadow-xl">
        <span className="text-gh-text font-medium">{payload[0].name}</span>
        <span className="text-gh-muted ml-2">{payload[0].value} repos</span>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }) => (
  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
    {payload?.slice(0, 6).map((entry, i) => (
      <div key={i} className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
        <span className="text-gh-muted text-xs">{entry.value}</span>
      </div>
    ))}
  </div>
);

export default function LanguageChart({ languages }) {
  if (!languages?.length) {
    return (
      <div className="bg-gh-card border border-gh-border rounded-xl p-5 flex flex-col items-center justify-center h-64">
        <p className="text-gh-muted text-sm">No language data available</p>
      </div>
    );
  }

  const data = languages.slice(0, 8);

  return (
    <div className="bg-gh-card border border-gh-border rounded-xl p-5">
      <h3 className="text-gh-text font-semibold mb-1 text-sm">Language Distribution</h3>
      <p className="text-gh-muted text-xs mb-4">Across all your repos</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
