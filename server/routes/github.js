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

// ── Events-based productivity (IST‑aware, up to 1000 events) ─────────────────
// ── Events-based productivity (IST‑aware, up to 1000 events) ─────────────────
// ── Events-based productivity (IST‑aware, up to 2000 events) ─────────────────
// ── Events-based productivity (IST‑aware, up to 2000 events) ─────────────────
const computeProductivityFromEvents = (events, login) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  const monthMap = {};
  let totalCommits = 0;
  const commitsPerDay = new Map(); // key: YYYY-MM-DD (IST)

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
    };
  }

  const pushEvents = events.filter(
    e => e.type === 'PushEvent' && e.actor?.login?.toLowerCase() === login.toLowerCase()
  );

  const getISTDateKey = (date) => {
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  };

  let firstCommitDate = null; // UTC midnight of first IST day with commits
  let lastCommitDate = null;  // UTC midnight of last IST day with commits

  for (const event of pushEvents) {
    const payload = event.payload || {};
    const count =
      typeof payload.size === 'number' && payload.size > 0
        ? payload.size
        : typeof payload.distinct_size === 'number' && payload.distinct_size > 0
        ? payload.distinct_size
        : Array.isArray(payload.commits) && payload.commits.length > 0
        ? payload.commits.length
        : 1;

    const date = new Date(event.created_at);
    const dateKey = getISTDateKey(date);
    commitsPerDay.set(dateKey, (commitsPerDay.get(dateKey) || 0) + count);
    totalCommits += count;

    // Day-of-week based on IST
    const istDayIndex = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getDay();
    dayTotals[istDayIndex] += count;

    // Month map based on IST
    const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const monthKey = `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}`;
    monthMap[monthKey] = (monthMap[monthKey] || 0) + count;

    // Track first/last commit date using IST midnight (as UTC date objects)
    const [year, month, day] = dateKey.split('-').map(Number);
    const istMidnightUTC = new Date(Date.UTC(year, month - 1, day));
    if (!firstCommitDate || istMidnightUTC < firstCommitDate) firstCommitDate = istMidnightUTC;
    if (!lastCommitDate || istMidnightUTC > lastCommitDate) lastCommitDate = istMidnightUTC;
  }

  // No commits at all
  if (!firstCommitDate || commitsPerDay.size === 0) {
    return {
      mostProductiveDay: 'N/A',
      avgCommitsPerWeek: 0,
      currentStreak: 0,
      longestStreak: 0,
      streakRate: 0,
      dayChart: dayNames.map(n => ({ day: n.slice(0, 3), commits: 0 })),
      totalCommits: 0,
      monthMap: {},
    };
  }

  // Generate continuous date range from first commit to TODAY (for current streak)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(Math.max(lastCommitDate, today));
  const allDays = [];
  let current = new Date(firstCommitDate);
  while (current <= endDate) {
    const istDateKey = current.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    allDays.push(istDateKey);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  // Compute longest streak (within fetched events)
  let longestStreak = 0;
  let tempStreak = 0;
  for (const day of allDays) {
    if ((commitsPerDay.get(day) || 0) > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  // Compute current streak (consecutive days ending TODAY)
  let currentStreak = 0;
  for (let i = allDays.length - 1; i >= 0; i--) {
    if ((commitsPerDay.get(allDays[i]) || 0) > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Average commits per week (based on fetched data)
  const weekMap = {};
  for (const [dateKey, commitCount] of commitsPerDay.entries()) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const istDate = new Date(Date.UTC(year, month - 1, day));
    const yr = istDate.getUTCFullYear();
    const jan = new Date(Date.UTC(yr, 0, 1));
    const week = Math.ceil(((istDate - jan) / 86400000 + jan.getUTCDay() + 1) / 7);
    const weekKey = `${yr}-${String(week).padStart(2, '0')}`;
    weekMap[weekKey] = (weekMap[weekKey] || 0) + commitCount;
  }
  const totalWeekCommits = Object.values(weekMap).reduce((s, v) => s + v, 0);
  const avgCommitsPerWeek = Object.keys(weekMap).length > 0
    ? parseFloat((totalWeekCommits / Object.keys(weekMap).length).toFixed(1))
    : 0;

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
    totalCommits,
    monthMap,
  };
};

// ── Stars over time ───────────────────────────────────────────────────────────
const buildStarsOverTime = (repos) => {
  let running = 0;
  return [...repos]
    .sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
    .filter(r => r.stargazers_count > 0)
    .map(r => {
      running += r.stargazers_count;
      return {
        month: new Date(r.created_at).toLocaleString('default',{month:'short',year:'2-digit'}),
        stars: running, repo: r.name, newStars: r.stargazers_count
      };
    });
};

// ── Tech stack transition ─────────────────────────────────────────────────────
const buildTechTransition = (repos) => {
  const yearMap = {};
  repos.forEach(repo => {
    if (!repo.language) return;
    const year = new Date(repo.created_at).getFullYear();
    if (!yearMap[year]) yearMap[year] = {};
    yearMap[year][repo.language] = (yearMap[year][repo.language] || 0) + 1;
  });
  return Object.entries(yearMap)
    .sort(([a],[b]) => Number(a) - Number(b))
    .map(([year, langs]) => {
      const sorted = Object.entries(langs).sort((a,b) => b[1]-a[1]);
      return {
        year: parseInt(year),
        topLang: sorted[0][0],
        topLangs: sorted.slice(0,3).map(([lang,count]) => ({lang,count})),
        totalRepos: Object.values(langs).reduce((s,v) => s+v, 0)
      };
    });
};

// ── MAIN buildDashboardData ───────────────────────────────────────────────────
const buildDashboardData = async (token, username, isOwnProfile = true) => {
  const profileUrl = isOwnProfile
    ? 'https://api.github.com/user'
    : `https://api.github.com/users/${username}`;
  const reposUrl = isOwnProfile
    ? 'https://api.github.com/user/repos'
    : `https://api.github.com/users/${username}/repos`;
  const repoParams = isOwnProfile
    ? { type:'owner', sort:'updated' }
    : { type:'public', sort:'updated' };

  const [profile, repos] = await Promise.all([
    githubRequest(profileUrl, token),
    fetchAllPages(reposUrl, token, repoParams)
  ]);

  const login = profile.login;

  // ---------- NEW: Lifetime total commits across all own repos ----------
  const getRepoTotalCommits = async (owner, repo, token) => {
    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/commits`;
      const response = await axios.head(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json'
        },
        params: { per_page: 1 }
      });
      const linkHeader = response.headers.link || '';
      const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
      // Fallback: if no "last" page (less than 2 pages), fetch one page to get length
      const full = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params: { per_page: 1, page: 1 }
      });
      return full.data.length;
    } catch (err) {
      console.error(`Commit count error for ${owner}/${repo}:`, err.message);
      return 0;
    }
  };

  let totalLifetimeCommits = 0;
  const ownRepos = repos.filter(r => !r.fork); // exclude forks to avoid double‑counting
  const batchSize = 5;
  for (let i = 0; i < ownRepos.length; i += batchSize) {
    const batch = ownRepos.slice(i, i + batchSize);
    const commitCounts = await Promise.all(
      batch.map(repo => getRepoTotalCommits(repo.owner.login, repo.name, token))
    );
    totalLifetimeCommits += commitCounts.reduce((a, b) => a + b, 0);
    // Delay 1 second between batches to stay within rate limits
    if (i + batchSize < ownRepos.length) await new Promise(r => setTimeout(r, 1000));
  }
  // ----------------------------------------------------------------

  const languageMap = {};
  repos.forEach(r => {
    if (r.language) languageMap[r.language] = (languageMap[r.language]||0)+1;
  });
  const languages = Object.entries(languageMap)
    .sort((a,b) => b[1]-a[1])
    .map(([name,value]) => ({name,value}));

  const topReposByStars = [...repos]
    .sort((a,b) => b.stargazers_count-a.stargazers_count)
    .slice(0,5)
    .map(r => ({name:r.name, stars:r.stargazers_count, forks:r.forks_count}));

  const totalStars       = repos.reduce((s,r) => s+r.stargazers_count, 0);
  const totalForks       = repos.reduce((s,r) => s+r.forks_count, 0);
  const mostUsedLanguage = languages[0]?.name || 'N/A';
  const accountAge       = ((new Date()-new Date(profile.created_at))/(1000*60*60*24*365)).toFixed(1);

// Fetch events — up to 20 pages (2000 events) ~ 6-12 months of activity
const eventsUrl = `https://api.github.com/users/${login}/events`;
let allEvents = [];
try {
  for (let page = 1; page <= 20; page++) {
    const eventsPage = await githubRequest(eventsUrl, token, { per_page: 100, page });
    if (!Array.isArray(eventsPage) || eventsPage.length === 0) break;
    allEvents = allEvents.concat(eventsPage);
    if (eventsPage.length < 100) break;
  }
} catch (evErr) {
  console.error('Events fetch error:', evErr.message);
}

  const productivityRaw = computeProductivityFromEvents(allEvents, login);
  const { monthMap, ...productivityClean } = productivityRaw;

  // Commit activity for monthly chart (best-effort)
  const activeRepos = [...repos]
    .filter(r => !r.fork)
    .sort((a,b) => b.stargazers_count-a.stargazers_count)
    .slice(0,5);

  const commitStats = await Promise.allSettled(
    activeRepos.map(repo =>
      githubRequest(
        `https://api.github.com/repos/${login}/${repo.name}/stats/commit_activity`,
        token
      )
    )
  );

  // Monthly chart: start from events, enhance with commit_activity if available
  const monthlyCommits = { ...monthMap };
  commitStats.forEach(result => {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      result.value.forEach(week => {
        if (!week || !week.total) return;
        const date = new Date(week.week * 1000);
        const key  = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
        monthlyCommits[key] = Math.max(monthlyCommits[key]||0, week.total);
      });
    }
  });

  const last12Months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    last12Months.push({
      month: d.toLocaleString('default',{month:'short',year:'2-digit'}),
      commits: monthlyCommits[key] || 0
    });
  }

  // Contributions
  const [mergedPRsRes, issuesRes] = await Promise.allSettled([
    githubRequest('https://api.github.com/search/issues', token, {
      q: `author:${login} type:pr is:merged is:public`, per_page:100
    }),
    githubRequest('https://api.github.com/search/issues', token, {
      q: `author:${login} type:issue is:public`, per_page:100
    })
  ]);

  const mergedPRs = mergedPRsRes.status==='fulfilled' ? mergedPRsRes.value : { items:[] };
  const issues    = issuesRes.status==='fulfilled'    ? issuesRes.value    : { items:[] };

  const externalPRs = (mergedPRs.items||[]).filter(pr => {
    const owner = pr.repository_url?.split('/').slice(-2,-1)[0];
    return owner && owner.toLowerCase() !== login.toLowerCase();
  });
  const externalIssues = (issues.items||[]).filter(issue => {
    const owner = issue.repository_url?.split('/').slice(-2,-1)[0];
    return owner && owner.toLowerCase() !== login.toLowerCase();
  });

  const contribRepoMap = {};
  externalPRs.forEach(pr => {
    const rn = pr.repository_url?.split('/').slice(-2).join('/');
    if (rn && !contribRepoMap[rn])
      contribRepoMap[rn] = { name:rn, url:`https://github.com/${rn}`, prCount:0 };
    if (rn) contribRepoMap[rn].prCount++;
  });

  return {
    profile: {
      login, name:profile.name, bio:profile.bio,
      avatar_url:profile.avatar_url, html_url:profile.html_url,
      followers:profile.followers, following:profile.following,
      public_repos:profile.public_repos, created_at:profile.created_at
    },
    stats: {
      totalStars,
      totalForks,
      mostUsedLanguage,
      accountAge,
      totalRepos: repos.length,
      totalLifetimeCommits   // <-- new field: accurate total commits
    },
    languages, topReposByStars,
    commitActivity: last12Months,
    productivity:   productivityClean,
    starsOverTime:  buildStarsOverTime(repos),
    techTransition: buildTechTransition(repos),
    contributions: {
      totalMergedPRs:    externalPRs.length,
      totalIssuesOpened: externalIssues.length,
      contributedRepos:  Object.values(contribRepoMap)
        .sort((a,b) => b.prCount-a.prCount).slice(0,10)
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
      return res.json({ ...cached.data, _source:'cached', _cachedAt:cached.cachedAt });
    const data = await buildDashboardData(token, username, true);
    await Cache.findOneAndUpdate(
      { username }, { username, data, cachedAt:new Date() }, { upsert:true, new:true }
    );
    res.json({ ...data, _source:'live' });
  } catch (err) {
    console.error('Dashboard error:', err.message, err.stack);
    try {
      const stale = await Cache.findOne({ username });
      if (stale) return res.json({ ...stale.data, _source:'cached', _cachedAt:stale.cachedAt, _stale:true });
    } catch(_) {}
    res.status(500).json({ error:'Failed to fetch GitHub data', details:err.message });
  }
});

router.post('/refresh', requireAuth, async (req, res) => {
  const { login: username } = req.session.user;
  const token = req.session.accessToken;
  try {
    await Cache.deleteOne({ username });
    const data = await buildDashboardData(token, username, true);
    await Cache.findOneAndUpdate(
      { username }, { username, data, cachedAt:new Date() }, { upsert:true, new:true }
    );
    res.json({ ...data, _source:'live' });
  } catch (err) {
    console.error('Refresh error:', err.message, err.stack);
    res.status(500).json({ error:'Failed to refresh data', details:err.message });
  }
});

router.get('/user/:username', requireAuth, async (req, res) => {
  const clean = req.params.username.trim();
  const token = req.session.accessToken;
  if (!clean || !/^[a-zA-Z0-9-]+$/.test(clean))
    return res.status(400).json({ error:'Invalid GitHub username' });
  const cacheKey = `search:${clean.toLowerCase()}`;
  try {
    const cached = await Cache.findOne({ username: cacheKey });
    if (cached && Date.now() - cached.cachedAt.getTime() < CACHE_TTL_MS)
      return res.json({ ...cached.data, _source:'cached', _cachedAt:cached.cachedAt });
    try { await githubRequest(`https://api.github.com/users/${clean}`, token); }
    catch (err) {
      if (err.response?.status === 404)
        return res.status(404).json({ error:`GitHub user "${clean}" not found` });
      throw err;
    }
    const data = await buildDashboardData(token, clean, false);
    await Cache.findOneAndUpdate(
      { username:cacheKey }, { username:cacheKey, data, cachedAt:new Date() }, { upsert:true, new:true }
    );
    res.json({ ...data, _source:'live' });
  } catch (err) {
    console.error(`Search error for ${clean}:`, err.message);
    res.status(500).json({ error:'Failed to fetch user data', details:err.message });
  }
});

// ── Debug route (remove after testing) ───────────────────────────────────────
router.get('/debug/events', requireAuth, async (req, res) => {
  const { login } = req.session.user;
  const token = req.session.accessToken;
  try {
    const events = await githubRequest(
      `https://api.github.com/users/${login}/events`,
      token, { per_page:30, page:1 }
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