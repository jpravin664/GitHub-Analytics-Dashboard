import React from 'react';
import ProfileCard from './ProfileCard';
import StatCards from './StatCards';
import LanguageChart from './LanguageChart';
import RepoChart from './RepoChart';
import CommitChart from './CommitChart';
import OpenSourceSection from './OpenSourceSection';
import ProductivityInsights from './ProductivityInsights';
// import CommitStreak from './CommitStreak';
import StarsOverTime from './StarsOverTime';
import TechTransition from './TechTransition';

const SectionLabel = ({ emoji, title, subtitle }) => (
  <div className="flex items-center gap-2 mb-4">
    <span className="px-3 py-1 rounded-full border border-gh-accent/30 bg-gh-accent/10 text-gh-accent text-xs font-mono">
      {emoji} {title}
    </span>
    {subtitle && <span className="text-gh-muted text-xs">{subtitle}</span>}
  </div>
);

export default function DashboardContent({ data }) {
  return (
    <div className="space-y-8">

      {/* Row 1 – Profile + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
        <ProfileCard profile={data.profile} />
        <div className="lg:col-span-2"><StatCards stats={data.stats} /></div>
      </div>

      {/* Row 2 – Original Charts */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <SectionLabel emoji="📊" title="Repository Analytics" subtitle="Language, stars, commit history" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LanguageChart languages={data.languages} />
          <RepoChart repos={data.topReposByStars} />
          <CommitChart activity={data.commitActivity} />
        </div>
      </div>

      {/* Row 3 – Productivity Insights — now passing stats */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
        <SectionLabel emoji="⚡" title="Productivity Insights" subtitle="Data GitHub never shows you" />
        <ProductivityInsights productivity={data.productivity} stats={data.stats} />
      </div>

      {/* Row 4 – Stars Over Time + Tech Transition */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <SectionLabel emoji="🚀" title="Growth Story" subtitle="Your journey as a developer" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StarsOverTime starsOverTime={data.starsOverTime} />
          <TechTransition techTransition={data.techTransition} />
        </div>
      </div>

      {/* Row 5 – Open Source */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
        <OpenSourceSection contributions={data.contributions} username={data.profile?.login} />
      </div>

    </div>
  );
}