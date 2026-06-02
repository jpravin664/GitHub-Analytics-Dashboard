require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const setupSession = require('./middleware/session');
const authRoutes = require('./routes/auth');
const githubRoutes = require('./routes/github');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/github-dashboard')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
setupSession(app);

// Routes
app.use('/auth', authRoutes);
app.use('/api/github', githubRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
