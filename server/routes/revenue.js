// server/routes/revenue.js
const express = require('express');
const router = express.Router();
const revenueTrackingService = require('../services/revenueTrackingService');
const winston = require('winston');

// Create logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'revenue-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Get revenue summary
router.get('/summary', async (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();

    const summary = await revenueTrackingService.getRevenueSummary(startDate, endDate);
    res.json(summary);
  } catch (error) {
    logger.error('Failed to get revenue summary:', error);
    res.status(500).json({ error: 'Failed to get revenue summary' });
  }
});

// Get MRR
router.get('/mrr', async (req, res) => {
  try {
    const mrr = await revenueTrackingService.getMRR();
    res.json(mrr);
  } catch (error) {
    logger.error('Failed to get MRR:', error);
    res.status(500).json({ error: 'Failed to get MRR' });
  }
});

// Get growth metrics
router.get('/growth', async (req, res) => {
  try {
    const growth = await revenueTrackingService.getGrowthMetrics();
    res.json(growth);
  } catch (error) {
    logger.error('Failed to get growth metrics:', error);
    res.status(500).json({ error: 'Failed to get growth metrics' });
  }
});

// Track Instacart commission
router.post('/instacart-commission', async (req, res) => {
  try {
    const revenue = await revenueTrackingService.trackInstacartCommission(req.body);
    res.json(revenue);
  } catch (error) {
    logger.error('Failed to track Instacart commission:', error);
    res.status(500).json({ error: 'Failed to track commission' });
  }
});

// Track subscription revenue
router.post('/subscription', async (req, res) => {
  try {
    const { userId, tier, amount } = req.body;
    const revenue = await revenueTrackingService.trackSubscriptionRevenue(userId, tier, amount);
    res.json(revenue);
  } catch (error) {
    logger.error('Failed to track subscription revenue:', error);
    res.status(500).json({ error: 'Failed to track subscription' });
  }
});

// Track API cost
router.post('/api-cost', async (req, res) => {
  try {
    const { service, amount, metadata } = req.body;
    const cost = await revenueTrackingService.trackAPICost(service, amount, metadata);
    res.json(cost);
  } catch (error) {
    logger.error('Failed to track API cost:', error);
    res.status(500).json({ error: 'Failed to track cost' });
  }
});

// Get CLTV for user
router.get('/cltv/:userId', async (req, res) => {
  try {
    const cltv = await revenueTrackingService.calculateCLTV(req.params.userId);
    res.json(cltv);
  } catch (error) {
    logger.error('Failed to calculate CLTV:', error);
    res.status(500).json({ error: 'Failed to calculate CLTV' });
  }
});

// Generate mock data
router.post('/generate-mock', async (req, res) => {
  try {
    const { months = 6 } = req.body;
    const result = await revenueTrackingService.generateMockData(months);
    res.json(result);
  } catch (error) {
    logger.error('Failed to generate mock data:', error);
    res.status(500).json({ error: 'Failed to generate mock data' });
  }
});

module.exports = router;