import React from 'react';

export default function ProfileCard({ profile }) {
  if (!profile) return null;
  const { avatar_url, name, login, bio, followers, following, public_repos, html_url, created_at } = profile;

  // FIX #3: Guard against invalid or missing created_at
  let joinYear = '?';
  if (created_at) {
    const year = new Date(created_at).getFullYear();
    if (!isNaN(year)) joinYear = year;
  }

  return (
    <div className="bg-gh-card border border-gh-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <img
          src={avatar_url}
          alt={name || login}
          className="w-16 h-16 rounded-full border-2 border-gh-border flex-shrink-0"
          onError={(e) => e.target.src = 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}
        />
        <div className="min-w-0">
          <h2 className="text-gh-text font-semibold text-lg leading-tight truncate">{name || login}</h2>
          <a
            href={html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gh-accent text-sm font-mono hover:underline"
          >
            @{login}
          </a>
          {bio && (
            <p className="text-gh-muted text-xs mt-1.5 line-clamp-2 leading-relaxed">{bio}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Followers', value: followers?.toLocaleString() },
          { label: 'Following', value: following?.toLocaleString() },
          { label: 'Repos', value: public_repos?.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gh-dark rounded-lg p-2.5 text-center">
            <div className="text-gh-text font-semibold text-base">{value}</div>
            <div className="text-gh-muted text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-gh-muted text-xs">
        <span>📅</span>
        <span>Member since {joinYear}</span>
      </div>
    </div>
  );
}