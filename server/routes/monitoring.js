// server/routes/monitoring.js
const express = require('express');
const router = express.Router();
const externalMonitoringService = require('../services/externalMonitoringService');
const winston = require('winston');

// Create logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'monitoring-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Get service health
router.get('/health', async (req, res) => {
  try {
    const health = await externalMonitoringService.getServiceHealth();
    res.json(health);
  } catch (error) {
    logger.error('Failed to get service health:', error);
    res.status(500).json({ error: 'Failed to get service health' });
  }
});

// Get API usage for period
router.get('/usage/:period', async (req, res) => {
  try {
    const usage = await externalMonitoringService.getAPIUsage(req.params.period);
    res.json(usage);
  } catch (error) {
    logger.error('Failed to get API usage:', error);
    res.status(500).json({ error: 'Failed to get API usage' });
  }
});

// Get current costs
router.get('/costs/current', async (req, res) => {
  try {
    const costs = await externalMonitoringService.getCurrentCosts();
    res.json(costs);
  } catch (error) {
    logger.error('Failed to get current costs:', error);
    res.status(500).json({ error: 'Failed to get costs' });
  }
});

// Check all services
router.post('/check-all', async (req, res) => {
  try {
    const results = await externalMonitoringService.checkAllServices();
    res.json(results);
  } catch (error) {
    logger.error('Failed to check services:', error);
    res.status(500).json({ error: 'Failed to check services' });
  }
});

// Track API usage
router.post('/track-usage', async (req, res) => {
  try {
    const { service, tokens, cost } = req.body;
    const tracking = await externalMonitoringService.trackAPIUsage(service, tokens, cost);
    res.json(tracking);
  } catch (error) {
    logger.error('Failed to track usage:', error);
    res.status(500).json({ error: 'Failed to track usage' });
  }
});

// Get alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await externalMonitoringService.getAlerts();
    res.json(alerts);
  } catch (error) {
    logger.error('Failed to get alerts:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// Get Opus weekly usage
router.get('/opus-usage', async (req, res) => {
  try {
    logger.info('Fetching Opus weekly usage data');
    const opusUsage = await externalMonitoringService.getOpusWeeklyUsage();
    res.json({
      success: true,
      ...opusUsage
    });
  } catch (error) {
    logger.error('Failed to get Opus usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Opus usage',
      message: error.message
    });
  }
});

// Generate mock data
router.post('/generate-mock', async (req, res) => {
  try {
    const { days = 30 } = req.body;
    const result = await externalMonitoringService.generateMockData(days);
    res.json(result);
  } catch (error) {
    logger.error('Failed to generate mock data:', error);
    res.status(500).json({ error: 'Failed to generate mock data' });
  }
});

module.exports = router;