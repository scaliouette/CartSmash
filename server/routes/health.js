// server/routes/health.js
const router = require('express').Router();
const mongoose = require('mongoose');

router.get('/health', (req, res) => {
  const health = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  res.status(200).json(health);
});

router.get('/health/detailed', (req, res) => {
  res.json({
    status: 'healthy',
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    database: {
      status: mongoose.connection.readyState,
      name: mongoose.connection.name
    }
  });
});

module.exports = router;