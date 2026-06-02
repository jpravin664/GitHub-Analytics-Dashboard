const express = require('express');
const axios = require('axios');
const router = express.Router();

// Step 1: Redirect to GitHub OAuth
router.get('/github', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: 'read:user user:email repo',
    state: Math.random().toString(36).substring(7)
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// Step 2: GitHub callback - exchange code for token
router.get('/github/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}?error=no_code`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL
      },
      { headers: { Accept: 'application/json' } }
    );

    const { access_token, error } = tokenResponse.data;

    if (error || !access_token) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}?error=token_exchange_failed`);
    }

    // Fetch user profile
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    // Store in session
    req.session.accessToken = access_token;
    req.session.user = {
      login: userResponse.data.login,
      name: userResponse.data.name,
      avatar_url: userResponse.data.avatar_url,
      html_url: userResponse.data.html_url
    };

    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard`);
  } catch (err) {
    console.error('OAuth error:', err.message);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}?error=oauth_failed`);
  }
});

// Get current session user
router.get('/me', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ user: null });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router;
