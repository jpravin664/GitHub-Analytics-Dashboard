const mongoose = require('mongoose');

const CacheSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  cachedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cache', CacheSchema);
