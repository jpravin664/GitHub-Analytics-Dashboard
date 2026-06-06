const express = require('express');
const axios = require('axios');
const Cache = require('../models/Cache');
const router = express.Router();

const CACHE_TTL_MS = 60 * 60 * 1000;

// ── Auth middleware ───────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  if (!req.session.accessToken || !req.session.user)
    return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// ── GitHub API helpers ────────────────────────────────────────────────────────
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

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── ISO week number (Monday-based) ───────────────────────────────────────────
const getISOWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-${String(weekNo).padStart(2, '0')}`;
};

// ── Productivity from events ──────────────────────────────────────────────────
// NOTE: GitHub Events API only returns the last ~300 events regardless of how
// many pages you request , hard cap on their side. We stop at 3 pages (300 events).
// This means streak/day-chart data only reflects recent activity, not lifetime.
// Lifetime commit count comes from getRepoTotalCommits instead.
const computeProductivityFromEvents = (events, login) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  const monthMap = {};
  let totalContributions = 0;
  const contributionsPerDay = new Map();

  const emptyResult = {
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

  if (!Array.isArray(events) || events.length === 0) return emptyResult;

  const userEvents = events.filter(e => e.actor?.login?.toLowerCase() === login.toLowerCase());

  const getUTCDateKey = (date) => date.toISOString().split('T')[0];

  let firstContributionDate = null;
  let lastContributionDate = null;

  for (const event of userEvents) {
    const excludedTypes = ['WatchEvent', 'ForkEvent', 'MemberEvent', 'PullRequestReviewEvent', 'IssueCommentEvent'];
    if (excludedTypes.includes(event.type)) continue;

    let weight = 0;

    if (event.type === 'PushEvent') {
      const payload = event.payload || {};
      weight =
        typeof payload.size === 'number' && payload.size > 0 ? payload.size
        : typeof payload.distinct_size === 'number' && payload.distinct_size > 0 ? payload.distinct_size
        : Array.isArray(payload.commits) && payload.commits.length > 0 ? payload.commits.length
        : 1;
    } else if (event.type === 'IssuesEvent') {
      if (event.payload?.action === 'opened') weight = 1;
    } else if (event.type === 'PullRequestEvent') {
      const action = event.payload?.action;
      const pr = event.payload?.pull_request;
      if (action === 'opened') weight = 1;
      else if (action === 'closed' && pr?.merged === true) weight = 1;
    }

    if (weight === 0) continue;

    const date = new Date(event.created_at);
    const dateKey = getUTCDateKey(date);
    contributionsPerDay.set(dateKey, (contributionsPerDay.get(dateKey) || 0) + weight);
    totalContributions += weight;
    dayTotals[date.getUTCDay()] += weight;

    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    monthMap[monthKey] = (monthMap[monthKey] || 0) + weight;

    const utcMidnight = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    if (!firstContributionDate || utcMidnight < firstContributionDate) firstContributionDate = utcMidnight;
    if (!lastContributionDate || utcMidnight > lastContributionDate) lastContributionDate = utcMidnight;
  }

  if (!firstContributionDate || contributionsPerDay.size === 0) return emptyResult;

  // Build continuous date range from first contribution to today
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // FIX: use .getTime() explicitly , Math.max(Date, Date) coerces to number
  // by accident and works, but is misleading. Be explicit.
  const endDate = new Date(Math.max(lastContributionDate.getTime(), today.getTime()));

  const allDays = [];
  let current = new Date(firstContributionDate);
  while (current <= endDate) {
    allDays.push(current.toISOString().split('T')[0]);
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

  // FIX: Current streak , if today has no commits yet, don't break the streak.
  // Start from yesterday so a user who committed yesterday but not yet today
  // doesn't see their streak reset to 0.
  let currentStreak = 0;
  const startIdx = (contributionsPerDay.get(allDays[allDays.length - 1]) || 0) > 0
    ? allDays.length - 1   // today already has commits , include it
    : allDays.length - 2;  // today is empty , start from yesterday

  for (let i = startIdx; i >= 0; i--) {
    if ((contributionsPerDay.get(allDays[i]) || 0) > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Weekly activity
  const weekMap = new Map();
  for (const [dateKey, count] of contributionsPerDay.entries()) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const weekKey = getISOWeek(new Date(Date.UTC(year, month - 1, day)));
    weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + count);
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

// ── Stars over time (own repos only) ─────────────────────────────────────────
const buildStarsOverTime = (repos) => {
  let running = 0;
  return [...repos]
    .filter(r => !r.fork)
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

// ── Tech stack transition (own repos only) ────────────────────────────────────
const buildTechTransition = (repos) => {
  const yearMap = {};
  repos.filter(r => !r.fork).forEach(repo => {
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

// ── Search API pagination (GitHub caps at 1000 results / 10 pages) ────────────
const fetchAllSearchPages = async (url, token, params) => {
  let page = 1, all = [];
  while (true) {
    const data = await githubRequest(url, token, { ...params, per_page: 100, page });
    if (!data.items || data.items.length === 0) break;
    all = all.concat(data.items);
    if (data.items.length < 100) break;
    page++;
    if (page > 10) break; // GitHub Search API hard limit: 1000 results
  }
  return { items: all };
};

// ── Accurate lifetime commit count via HEAD + Link header ─────────────────────
// FIX: regex changed from /&page=(\d+)>/ to /[?&]page=(\d+)>/ so it matches
// when `page` is the first query param (no leading &).
const getRepoTotalCommits = async (owner, repo, token) => {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits`;
    const headResponse = await axios.head(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
      params: { per_page: 1 }
    });
    const linkHeader = headResponse.headers.link || '';
    // FIX: use [?&] so the regex matches whether page= is first or subsequent param
    const lastPageMatch = linkHeader.match(/[?&]page=(\d+)>; rel="last"/);
    if (lastPageMatch) return parseInt(lastPageMatch[1], 10);

    // Repo has ≤ 100 commits , count the actual array length
    // FIX: empty repos return HTTP 409 (not 404); catch handles this already
    const firstPage = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params: { per_page: 100, page: 1 }
    });
    return firstPage.data.length;
  } catch (err) {
    // 409 = empty repo, 404 = gone , both are fine to return 0 for
    if (err.response?.status === 409 || err.response?.status === 404) return 0;
    console.error(`Commit count error for ${owner}/${repo}:`, err.message);
    return 0;
  }
};

// ── Commit activity: last 12 months across top 5 repos ───────────────────────
const buildCommitActivity = async (ownRepos, login, token) => {
  const activeRepos = [...ownRepos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5);

  const commitStats = await Promise.allSettled(
    activeRepos.map(repo =>
      githubRequest(`https://api.github.com/repos/${login}/${repo.name}/stats/commit_activity`, token)
    )
  );

  const monthlyCommits = {};
  commitStats.forEach(result => {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      result.value.forEach(week => {
        if (!week?.total) return;
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
  return last12Months;
};

// ── Open-source contribution data ─────────────────────────────────────────────
const buildContributions = async (login, token) => {
  const [mergedPRsRes, issuesRes] = await Promise.allSettled([
    fetchAllSearchPages('https://api.github.com/search/issues', token, {
      q: `author:${login} type:pr is:merged is:public`
    }),
    fetchAllSearchPages('https://api.github.com/search/issues', token, {
      q: `author:${login} type:issue is:public`
    })
  ]);

  const mergedPRs = mergedPRsRes.status === 'fulfilled' ? mergedPRsRes.value : { items: [] };
  const issues    = issuesRes.status   === 'fulfilled' ? issuesRes.value   : { items: [] };

  const isExternal = (item) => {
    const owner = item.repository_url?.split('/').slice(-2, -1)[0];
    return owner && owner.toLowerCase() !== login.toLowerCase();
  };

  const externalPRs    = (mergedPRs.items || []).filter(isExternal);
  const externalIssues = (issues.items    || []).filter(isExternal);

  const contribRepoMap = {};
  externalPRs.forEach(pr => {
    const rn = pr.repository_url?.split('/').slice(-2).join('/');
    if (!rn) return;
    if (!contribRepoMap[rn]) contribRepoMap[rn] = { name: rn, url: `https://github.com/${rn}`, prCount: 0 };
    contribRepoMap[rn].prCount++;
  });

  return {
    totalMergedPRs: externalPRs.length,
    totalIssuesOpened: externalIssues.length,
    contributedRepos: Object.values(contribRepoMap)
      .sort((a, b) => b.prCount - a.prCount)
      .slice(0, 10)
  };
};

// ── MAIN buildDashboardData ───────────────────────────────────────────────────
const buildDashboardData = async (token, username, isOwnProfile = true) => {
  const profileUrl = isOwnProfile ? 'https://api.github.com/user' : `https://api.github.com/users/${username}`;
  const reposUrl   = isOwnProfile ? 'https://api.github.com/user/repos' : `https://api.github.com/users/${username}/repos`;
  const repoParams = isOwnProfile ? { type: 'owner', sort: 'updated' } : { type: 'public', sort: 'updated' };

  // Step 1: profile + all repos in parallel
  const [profile, repos] = await Promise.all([
    githubRequest(profileUrl, token),
    fetchAllPages(reposUrl, token, repoParams)
  ]);

  const login    = profile.login;
  const ownRepos = repos.filter(r => !r.fork);

  // Step 2: lifetime commit count , batched to avoid rate limits.
  // This is the only source of truth for totalLifetimeCommits.
  // Events API only covers ~last 300 events so we don't use it for this.
  let totalLifetimeCommits = 0;
  const batchSize = 5;
  for (let i = 0; i < ownRepos.length; i += batchSize) {
    const batch = ownRepos.slice(i, i + batchSize);
    const counts = await Promise.all(
      batch.map(r => getRepoTotalCommits(r.owner.login, r.name, token))
    );
    totalLifetimeCommits += counts.reduce((a, b) => a + b, 0);
    if (i + batchSize < ownRepos.length) await delay(200);
  }

  // Step 3: derived stats from repo list (no extra API calls needed)
  const languageMap = {};
  ownRepos.forEach(r => {
    if (r.language) languageMap[r.language] = (languageMap[r.language] || 0) + 1;
  });
  const languages = Object.entries(languageMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const topReposByStars = [...ownRepos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5)
    .map(r => ({ name: r.name, stars: r.stargazers_count, forks: r.forks_count }));

  const totalStars       = ownRepos.reduce((s, r) => s + r.stargazers_count, 0);
  const totalForks       = ownRepos.reduce((s, r) => s + r.forks_count, 0);
  const mostUsedLanguage = languages[0]?.name || 'N/A';
  const accountAge       = ((new Date() - new Date(profile.created_at)) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);

  // Step 4: Events , FIX: GitHub hard-caps at 300 events (3 pages of 100).
  // The old code looped to page 100, firing 97 empty requests. Stop at 3.
  const eventsUrl = `https://api.github.com/users/${login}/events`;
  let allEvents = [];
  try {
    for (let page = 1; page <= 3; page++) {
      const eventsPage = await githubRequest(eventsUrl, token, { per_page: 100, page });
      if (!Array.isArray(eventsPage) || eventsPage.length === 0) break;
      allEvents = allEvents.concat(eventsPage);
      if (eventsPage.length < 100) break;
    }
  } catch (evErr) {
    console.error('Events fetch error:', evErr.message);
  }

  const productivityRaw = computeProductivityFromEvents(allEvents, login);
  const { monthMap: _unused, ...productivity } = productivityRaw;

  // Step 5: remaining async work in parallel
  const [commitActivity, contributions] = await Promise.all([
    buildCommitActivity(ownRepos, login, token),
    buildContributions(login, token)
  ]);

  return {
    profile: {
      login,
      name:         profile.name,
      bio:          profile.bio,
      avatar_url:   profile.avatar_url,
      html_url:     profile.html_url,
      followers:    profile.followers,
      following:    profile.following,
      public_repos: profile.public_repos,
      created_at:   profile.created_at
    },
    stats: {
      totalStars,
      totalForks,
      mostUsedLanguage,
      accountAge,
      totalRepos: ownRepos.length,
      totalLifetimeCommits  // lifetime across ALL own repos, from commit counter
    },
    languages,
    topReposByStars,
    commitActivity,          // last 12 months, top 5 repos
    productivity,            // day chart, streaks, consistency , from recent events
    starsOverTime:   buildStarsOverTime(repos),
    techTransition:  buildTechTransition(repos),
    contributions
  };
};

// ── Routes ────────────────────────────────────────────────────────────────────

router.get('/dashboard', requireAuth, async (req, res) => {
  const { login: username } = req.session.user;
  const token = req.session.accessToken;
  // FIX: store the first Cache.findOne result so the error fallback reuses it
  // instead of making a second DB round-trip.
  let cachedDoc = null;
  try {
    cachedDoc = await Cache.findOne({ username });
    if (cachedDoc && Date.now() - cachedDoc.cachedAt.getTime() < CACHE_TTL_MS)
      return res.json({ ...cachedDoc.data, _source: 'cached', _cachedAt: cachedDoc.cachedAt });

    const data = await buildDashboardData(token, username, true);
    await Cache.findOneAndUpdate(
      { username },
      { username, data, cachedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ ...data, _source: 'live' });
  } catch (err) {
    console.error('Dashboard error:', err.message, err.stack);
    // Serve stale cache if available , use the doc we already fetched
    const stale = cachedDoc || await Cache.findOne({ username }).catch(() => null);
    if (stale) return res.json({ ...stale.data, _source: 'cached', _cachedAt: stale.cachedAt, _stale: true });
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
  // FIX: tightened regex , GitHub usernames are 1–39 alphanumeric or hyphen,
  // cannot start/end with hyphen, no consecutive hyphens, no dots.
  if (!clean || !/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(clean))
    return res.status(400).json({ error: 'Invalid GitHub username' });

  const cacheKey = `search:${clean.toLowerCase()}`;
  let cachedDoc = null;
  try {
    cachedDoc = await Cache.findOne({ username: cacheKey });
    if (cachedDoc && Date.now() - cachedDoc.cachedAt.getTime() < CACHE_TTL_MS)
      return res.json({ ...cachedDoc.data, _source: 'cached', _cachedAt: cachedDoc.cachedAt });

    // Verify user exists before running the full expensive build
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
    const stale = cachedDoc || await Cache.findOne({ username: cacheKey }).catch(() => null);
    if (stale) return res.json({ ...stale.data, _source: 'cached', _cachedAt: stale.cachedAt, _stale: true });
    res.status(500).json({ error: 'Failed to fetch user data', details: err.message });
  }
});

// ── Debug route ───────────────────────────────────────────────────────────────
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
      login,
      totalEvents: events.length,
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