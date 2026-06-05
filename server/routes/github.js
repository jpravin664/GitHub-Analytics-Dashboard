const express = require('express');
const axios = require('axios');
const Cache = require('../models/Cache');
const router = express.Router();

const CACHE_TTL_MS = 60 * 60 * 1000;

const requireAuth = (req, res, next) => {
  if (!req.session.accessToken || !req.session.user)
    return res.status(401).json({ error: 'Not authenticated' });
  next();
};

const githubRequest = async (url, token, params = {}) => {
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
    params
  });
  return response.data;
};

const fetchAllPages = async (url, token, params = {}) => {
  let page = 1, all = [];
  while (true) {
    const data = await githubRequest(url, token, { ...params, per_page: 100, page });
    if (!Array.isArray(data) || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 100) break;
    page++;
  }
  return all;
};

// ISO week number helper (Monday-based)
const getISOWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-${String(weekNo).padStart(2, '0')}`;
};

// ── Events-based productivity (matches GitHub contribution graph) ──
const computeProductivityFromEvents = (events, login) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  const monthMap = {};
  let totalContributions = 0;
  const contributionsPerDay = new Map(); // key: YYYY-MM-DD (UTC)

  if (!Array.isArray(events) || events.length === 0) {
    return {
      mostProductiveDay: 'N/A',
      avgCommitsPerWeek: 0,
      currentStreak: 0,
      longestStreak: 0,
      streakRate: 0,
      dayChart: dayNames.map(n => ({ day: n.slice(0, 3), commits: 0 })),
      totalCommits: 0,
      monthMap: {},
      weeklyCommits: [],
    };
  }

  // Filter events by the authenticated user
  const userEvents = events.filter(e => e.actor?.login?.toLowerCase() === login.toLowerCase());

  const getUTCDateKey = (date) => date.toISOString().split('T')[0];

  let firstContributionDate = null;
  let lastContributionDate = null;

  for (const event of userEvents) {
    // Exclude events that never appear on GitHub's contribution graph
    const excludedTypes = ['WatchEvent', 'ForkEvent', 'MemberEvent', 'PullRequestReviewEvent', 'IssueCommentEvent'];
    if (excludedTypes.includes(event.type)) continue;

    let weight = 0; // only count if action matches contribution rules

    // ── PushEvent: count commits ──
    if (event.type === 'PushEvent') {
      const payload = event.payload || {};
      weight =
        typeof payload.size === 'number' && payload.size > 0
          ? payload.size
          : typeof payload.distinct_size === 'number' && payload.distinct_size > 0
          ? payload.distinct_size
          : Array.isArray(payload.commits) && payload.commits.length > 0
          ? payload.commits.length
          : 1;
    }
    // ── IssuesEvent: only when an issue is opened ──
    else if (event.type === 'IssuesEvent') {
      const action = event.payload?.action;
      if (action === 'opened') weight = 1;
    }
    // ── PullRequestEvent: opened or merged ──
    else if (event.type === 'PullRequestEvent') {
      const action = event.payload?.action;
      const pr = event.payload?.pull_request;
      if (action === 'opened') weight = 1;
      else if (action === 'closed' && pr?.merged === true) weight = 1;
    }
    // Other event types are either excluded or not counted by GitHub (e.g., CreateEvent, DeleteEvent, etc.)
    // We ignore them to match official contribution graph.

    if (weight === 0) continue;

    const date = new Date(event.created_at);
    const dateKey = getUTCDateKey(date);
    contributionsPerDay.set(dateKey, (contributionsPerDay.get(dateKey) || 0) + weight);
    totalContributions += weight;

    const dayIndex = date.getUTCDay();
    dayTotals[dayIndex] += weight;

    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    monthMap[monthKey] = (monthMap[monthKey] || 0) + weight;

    const utcMidnight = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    if (!firstContributionDate || utcMidnight < firstContributionDate) firstContributionDate = utcMidnight;
    if (!lastContributionDate || utcMidnight > lastContributionDate) lastContributionDate = utcMidnight;
  }

  if (!firstContributionDate || contributionsPerDay.size === 0) {
    return {
      mostProductiveDay: 'N/A',
      avgCommitsPerWeek: 0,
      currentStreak: 0,
      longestStreak: 0,
      streakRate: 0,
      dayChart: dayNames.map(n => ({ day: n.slice(0, 3), commits: 0 })),
      totalCommits: 0,
      monthMap: {},
      weeklyCommits: [],
    };
  }

  // Build continuous date range from first contribution to today (UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(Math.max(lastContributionDate, today));
  const allDays = [];
  let current = new Date(firstContributionDate);
  while (current <= endDate) {
    const dateKey = current.toISOString().split('T')[0];
    allDays.push(dateKey);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  // Longest streak
  let longestStreak = 0, tempStreak = 0;
  for (const day of allDays) {
    if ((contributionsPerDay.get(day) || 0) > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  // Current streak (ending today)
  let currentStreak = 0;
  for (let i = allDays.length - 1; i >= 0; i--) {
    if ((contributionsPerDay.get(allDays[i]) || 0) > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Weekly activity
  const weekMap = new Map();
  for (const [dateKey, contribCount] of contributionsPerDay.entries()) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const weekKey = getISOWeek(date);
    weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + contribCount);
  }

  const totalWeekContribs = Array.from(weekMap.values()).reduce((s, v) => s + v, 0);
  const avgCommitsPerWeek = weekMap.size > 0
    ? parseFloat((totalWeekContribs / weekMap.size).toFixed(1))
    : 0;

  const weeklyCommits = Array.from(weekMap.entries())
    .map(([week, commits]) => ({ week, commits }))
    .sort((a, b) => a.week.localeCompare(b.week));

  const maxDay = Math.max(...dayTotals, 0);
  const mostProductiveDay = maxDay > 0 ? dayNames[dayTotals.indexOf(maxDay)] : 'N/A';
  const streakRate = longestStreak > 0 ? Math.round((currentStreak / longestStreak) * 100) : 0;

  const dayChart = dayNames.map((name, i) => ({
    day: name.slice(0, 3),
    commits: dayTotals[i],
  }));

  return {
    mostProductiveDay,
    avgCommitsPerWeek,
    currentStreak,
    longestStreak,
    streakRate,
    dayChart,
    totalCommits: totalContributions,
    monthMap,
    weeklyCommits,
  };
};

// ── Stars over time (exclude forks) ──
const buildStarsOverTime = (repos) => {
  let running = 0;
  const nonForks = repos.filter(r => !r.fork);
  return [...nonForks]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .filter(r => r.stargazers_count > 0)
    .map(r => {
      running += r.stargazers_count;
      return {
        month: new Date(r.created_at).toLocaleString('default', { month: 'short', year: '2-digit' }),
        stars: running,
        repo: r.name,
        newStars: r.stargazers_count
      };
    });
};

// ── Tech stack transition (exclude forks) ──
const buildTechTransition = (repos) => {
  const yearMap = {};
  const nonForks = repos.filter(r => !r.fork);
  nonForks.forEach(repo => {
    if (!repo.language) return;
    const year = new Date(repo.created_at).getFullYear();
    if (!yearMap[year]) yearMap[year] = {};
    yearMap[year][repo.language] = (yearMap[year][repo.language] || 0) + 1;
  });
  return Object.entries(yearMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, langs]) => {
      const sorted = Object.entries(langs).sort((a, b) => b[1] - a[1]);
      return {
        year: parseInt(year),
        topLang: sorted[0][0],
        topLangs: sorted.slice(0, 3).map(([lang, count]) => ({ lang, count })),
        totalRepos: Object.values(langs).reduce((s, v) => s + v, 0)
      };
    });
};

// ── Fetch all pages for search (issues/PRs) ──
const fetchAllSearchPages = async (url, token, params) => {
  let page = 1;
  let all = [];
  while (true) {
    const data = await githubRequest(url, token, { ...params, per_page: 100, page });
    if (!data.items || data.items.length === 0) break;
    all = all.concat(data.items);
    if (data.items.length < 100) break;
    page++;
    // GitHub Search API max 1000 results; stop at 10 pages (1000 items)
    if (page > 10) break;
  }
  return { items: all };
};

// ── Accurate commit counter using HEAD + Link header (default branch only) ──
const getRepoTotalCommits = async (owner, repo, token) => {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits`;
    const headResponse = await axios.head(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
      params: { per_page: 1 }
    });
    const linkHeader = headResponse.headers.link || '';
    const lastPageMatch = linkHeader.match(/&page=(\d+)>; rel="last"/);
    if (lastPageMatch && lastPageMatch[1]) {
      return parseInt(lastPageMatch[1], 10);
    }
    // Only one page (≤100 commits)
    const firstPage = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params: { per_page: 100, page: 1 }
    });
    return firstPage.data.length;
  } catch (err) {
    console.error(`Commit count error for ${owner}/${repo}:`, err.message);
    return 0;
  }
};

// Helper to delay between batches (avoid rate limiting)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── MAIN buildDashboardData (optimized, accurate streaks, excludes forks) ──
const buildDashboardData = async (token, username, isOwnProfile = true) => {
  const profileUrl = isOwnProfile
    ? 'https://api.github.com/user'
    : `https://api.github.com/users/${username}`;
  const reposUrl = isOwnProfile
    ? 'https://api.github.com/user/repos'
    : `https://api.github.com/users/${username}/repos`;
  const repoParams = isOwnProfile
    ? { type: 'owner', sort: 'updated' }
    : { type: 'public', sort: 'updated' };

  const [profile, repos] = await Promise.all([
    githubRequest(profileUrl, token),
    fetchAllPages(reposUrl, token, repoParams)
  ]);

  const login = profile.login;

  // ---- Exclude forks from all metrics that represent user's own work ----
  const ownRepos = repos.filter(r => !r.fork);

  // ----- Lifetime total commits (default branch only, batched with delays) -----
  let totalLifetimeCommits = 0;
  const batchSize = 5;   // Reduced from 20 to avoid rate limits
  for (let i = 0; i < ownRepos.length; i += batchSize) {
    const batch = ownRepos.slice(i, i + batchSize);
    const commitCounts = await Promise.all(
      batch.map(repo => getRepoTotalCommits(repo.owner.login, repo.name, token))
    );
    totalLifetimeCommits += commitCounts.reduce((a, b) => a + b, 0);
    if (i + batchSize < ownRepos.length) await delay(200); // small delay between batches
  }

  // Language distribution (only own repos)
  const languageMap = {};
  ownRepos.forEach(r => {
    if (r.language) languageMap[r.language] = (languageMap[r.language] || 0) + 1;
  });
  const languages = Object.entries(languageMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Top repos by stars (only own repos)
  const topReposByStars = [...ownRepos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5)
    .map(r => ({ name: r.name, stars: r.stargazers_count, forks: r.forks_count }));

  const totalStars = ownRepos.reduce((s, r) => s + r.stargazers_count, 0);
  const totalForks = ownRepos.reduce((s, r) => s + r.forks_count, 0);
  const mostUsedLanguage = languages[0]?.name || 'N/A';
  const accountAge = ((new Date() - new Date(profile.created_at)) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);

  // ----- Fetch all user events (no hard page limit, stop when data incomplete) -----
  const eventsUrl = `https://api.github.com/users/${login}/events`;
  let allEvents = [];
  try {
    let page = 1;
    while (page <= 100) { // Increased max pages, but will break when no data
      const eventsPage = await githubRequest(eventsUrl, token, { per_page: 100, page });
      if (!Array.isArray(eventsPage) || eventsPage.length === 0) break;
      allEvents = allEvents.concat(eventsPage);
      if (eventsPage.length < 100) break;
      page++;
    }
  } catch (evErr) {
    console.error('Events fetch error:', evErr.message);
  }

  const productivityRaw = computeProductivityFromEvents(allEvents, login);
  // We do NOT use monthMap from productivity; commitActivity will be based only on repo stats
  const { monthMap: _ignoredMonthMap, ...productivityClean } = productivityRaw;

  // ----- Commit activity for monthly chart (only own repos, 5 most popular) -----
  const activeRepos = [...ownRepos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5);

  const commitStats = await Promise.allSettled(
    activeRepos.map(repo =>
      githubRequest(`https://api.github.com/repos/${login}/${repo.name}/stats/commit_activity`, token)
    )
  );

  // Pure commit activity – no mixing with events
  const monthlyCommits = {};
  commitStats.forEach(result => {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      result.value.forEach(week => {
        if (!week || !week.total) return;
        const date = new Date(week.week * 1000);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyCommits[key] = (monthlyCommits[key] || 0) + week.total;
      });
    }
  });

  const last12Months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    last12Months.push({
      month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      commits: monthlyCommits[key] || 0
    });
  }

  // ----- Contributions (full pagination with search limit warning) -----
  const [mergedPRsRes, issuesRes] = await Promise.allSettled([
    fetchAllSearchPages('https://api.github.com/search/issues', token, {
      q: `author:${login} type:pr is:merged is:public`
    }),
    fetchAllSearchPages('https://api.github.com/search/issues', token, {
      q: `author:${login} type:issue is:public`
    })
  ]);

  const mergedPRs = mergedPRsRes.status === 'fulfilled' ? mergedPRsRes.value : { items: [] };
  const issues = issuesRes.status === 'fulfilled' ? issuesRes.value : { items: [] };

  const externalPRs = (mergedPRs.items || []).filter(pr => {
    const owner = pr.repository_url?.split('/').slice(-2, -1)[0];
    return owner && owner.toLowerCase() !== login.toLowerCase();
  });
  const externalIssues = (issues.items || []).filter(issue => {
    const owner = issue.repository_url?.split('/').slice(-2, -1)[0];
    return owner && owner.toLowerCase() !== login.toLowerCase();
  });

  const contribRepoMap = {};
  externalPRs.forEach(pr => {
    const rn = pr.repository_url?.split('/').slice(-2).join('/');
    if (rn && !contribRepoMap[rn])
      contribRepoMap[rn] = { name: rn, url: `https://github.com/${rn}`, prCount: 0 };
    if (rn) contribRepoMap[rn].prCount++;
  });

  return {
    profile: {
      login, name: profile.name, bio: profile.bio,
      avatar_url: profile.avatar_url, html_url: profile.html_url,
      followers: profile.followers, following: profile.following,
      public_repos: profile.public_repos, created_at: profile.created_at
    },
    stats: {
      totalStars,
      totalForks,
      mostUsedLanguage,
      accountAge,
      totalRepos: ownRepos.length,   // show only own repos count
      totalLifetimeCommits
    },
    languages,
    topReposByStars,
    commitActivity: last12Months,
    productivity: productivityClean,
    starsOverTime: buildStarsOverTime(repos),        // uses ownRepos internally
    techTransition: buildTechTransition(repos),      // uses ownRepos internally
    contributions: {
      totalMergedPRs: externalPRs.length,
      totalIssuesOpened: externalIssues.length,
      contributedRepos: Object.values(contribRepoMap)
        .sort((a, b) => b.prCount - a.prCount)
        .slice(0, 10)
    }
  };
};

// ── Routes ────────────────────────────────────────────────────────────────────
router.get('/dashboard', requireAuth, async (req, res) => {
  const { login: username } = req.session.user;
  const token = req.session.accessToken;
  try {
    const cached = await Cache.findOne({ username });
    if (cached && Date.now() - cached.cachedAt.getTime() < CACHE_TTL_MS)
      return res.json({ ...cached.data, _source: 'cached', _cachedAt: cached.cachedAt });
    const data = await buildDashboardData(token, username, true);
    await Cache.findOneAndUpdate(
      { username },
      { username, data, cachedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ ...data, _source: 'live' });
  } catch (err) {
    console.error('Dashboard error:', err.message, err.stack);
    try {
      const stale = await Cache.findOne({ username });
      if (stale) return res.json({ ...stale.data, _source: 'cached', _cachedAt: stale.cachedAt, _stale: true });
    } catch (_) { }
    res.status(500).json({ error: 'Failed to fetch GitHub data', details: err.message });
  }
});

router.post('/refresh', requireAuth, async (req, res) => {
  const { login: username } = req.session.user;
  const token = req.session.accessToken;
  try {
    await Cache.deleteOne({ username });
    const data = await buildDashboardData(token, username, true);
    await Cache.findOneAndUpdate(
      { username },
      { username, data, cachedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ ...data, _source: 'live' });
  } catch (err) {
    console.error('Refresh error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to refresh data', details: err.message });
  }
});

router.get('/user/:username', requireAuth, async (req, res) => {
  const clean = req.params.username.trim();
  const token = req.session.accessToken;
  // FIX: allow dots in usernames
  if (!clean || !/^[a-zA-Z0-9.-]+$/.test(clean))
    return res.status(400).json({ error: 'Invalid GitHub username' });
  const cacheKey = `search:${clean.toLowerCase()}`;
  try {
    const cached = await Cache.findOne({ username: cacheKey });
    if (cached && Date.now() - cached.cachedAt.getTime() < CACHE_TTL_MS)
      return res.json({ ...cached.data, _source: 'cached', _cachedAt: cached.cachedAt });
    try {
      await githubRequest(`https://api.github.com/users/${clean}`, token);
    } catch (err) {
      if (err.response?.status === 404)
        return res.status(404).json({ error: `GitHub user "${clean}" not found` });
      throw err;
    }
    const data = await buildDashboardData(token, clean, false);
    await Cache.findOneAndUpdate(
      { username: cacheKey },
      { username: cacheKey, data, cachedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ ...data, _source: 'live' });
  } catch (err) {
    console.error(`Search error for ${clean}:`, err.message);
    res.status(500).json({ error: 'Failed to fetch user data', details: err.message });
  }
});

// ── Debug route (unchanged) ──
router.get('/debug/events', requireAuth, async (req, res) => {
  const { login } = req.session.user;
  const token = req.session.accessToken;
  try {
    const events = await githubRequest(
      `https://api.github.com/users/${login}/events`,
      token, { per_page: 30, page: 1 }
    );
    const pushEvents = events.filter(e => e.type === 'PushEvent');
    res.json({
      login, totalEvents: events.length,
      pushEventCount: pushEvents.length,
      samplePayload: pushEvents[0]?.payload || null,
      sizes: pushEvents.map(e => ({
        repo: e.repo?.name,
        size: e.payload?.size,
        distinct_size: e.payload?.distinct_size,
        commits_array_length: e.payload?.commits?.length
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;