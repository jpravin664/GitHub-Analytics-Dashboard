import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import DashboardContent from '../components/DashboardContent';
import UserSearchModal from '../components/UserSearchModal';

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

function SkeletonBlock({ className }) {
  return <div className={`skeleton ${className}`} />;
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonBlock className="h-40 col-span-1" />
        <div className="col-span-2 grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonBlock key={i} className="h-[72px]" />)}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <SkeletonBlock key={i} className="h-64" />)}
      </div>
      <SkeletonBlock className="h-48" />
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchedUser, setSearchedUser] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const searchInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get('/api/github/dashboard');
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const res = await axios.post('/api/github/refresh');
      setData(res.data);
    } catch (err) {
      setError('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchModalOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchedUser(null);
    setSearchModalOpen(true);

    try {
      const res = await axios.get(`/api/github/user/${q}`);
      setSearchedUser(res.data);
    } catch (err) {
      setSearchError(err.response?.data?.error || 'Failed to fetch user');
    } finally {
      setSearchLoading(false);
    }
  };

  const closeModal = () => {
    setSearchModalOpen(false);
    setSearchedUser(null);
    setSearchError(null);
    setSearchQuery('');
  };

  const isLive = data?._source === 'live';
  const cachedAt = data?._cachedAt ? new Date(data._cachedAt).toLocaleTimeString() : null;

  return (
    <div className="min-h-screen bg-gh-dark">
      {/* Navbar */}
      <nav className="sticky top-0 z-20 border-b border-gh-border bg-gh-dark/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-3 h-14">

          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <GithubIcon />
            <span className="font-mono font-medium text-gh-text text-sm hidden sm:block">gh/analytics</span>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-sm mx-auto">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gh-muted pointer-events-none">
                <SearchIcon />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search any GitHub user… (Press "/")'
                className="w-full pl-9 pr-16 py-1.5 rounded-lg bg-gh-card border border-gh-border text-gh-text text-sm placeholder-gh-muted focus:outline-none focus:border-gh-accent/60 focus:bg-gh-dark transition-all font-mono"
              />
              {searchQuery && (
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-xs font-mono bg-gh-accent/20 text-gh-accent hover:bg-gh-accent/30 transition-colors"
                >
                  Enter ↵
                </button>
              )}
            </div>
          </form>

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {data && (
              <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono ${
                isLive
                  ? 'bg-gh-green/15 text-gh-green border border-gh-green/30'
                  : 'bg-gh-orange/15 text-gh-orange border border-gh-orange/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-gh-green animate-pulse' : 'bg-gh-orange'}`} />
                {isLive ? 'Live' : `Cached${cachedAt ? ' · ' + cachedAt : ''}`}
              </span>
            )}

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gh-border text-gh-muted hover:text-gh-text hover:border-gh-accent/50 transition-all text-xs font-mono disabled:opacity-50"
            >
              <span className={refreshing ? 'animate-spin' : ''}>↻</span>
              <span className="hidden sm:block">Refresh</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-gh-border">
              <img src={user?.avatar_url} alt={user?.login} className="w-7 h-7 rounded-full border border-gh-border" />
              <span className="text-gh-text text-sm font-medium hidden md:block">{user?.login}</span>
            </div>

            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-lg text-gh-muted hover:text-gh-red hover:bg-gh-red/10 transition-all text-xs font-mono"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-gh-red/40 bg-gh-red/10 text-gh-red text-sm flex items-center justify-between">
            <span>⚠ {error}</span>
            <button onClick={fetchData} className="text-xs underline">Retry</button>
          </div>
        )}
        {loading ? <LoadingState /> : data ? <DashboardContent data={data} /> : null}
      </main>

      {/* Search Modal */}
      {searchModalOpen && (
        <UserSearchModal
          query={searchQuery}
          data={searchedUser}
          loading={searchLoading}
          error={searchError}
          onClose={closeModal}
          onRetry={handleSearch}
        />
      )}
    </div>
  );
}