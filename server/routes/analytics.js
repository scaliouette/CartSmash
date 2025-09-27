// server/routes/analytics.js - Analytics API endpoints
const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const winston = require('winston');
const { authenticateUser } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/adminAuth');

// Create logger (same configuration as server.js)
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'analytics' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Admin middleware for analytics endpoints
const requireAdmin = [authenticateUser, checkAdmin];

// Get dashboard metrics
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    const metrics = await analyticsService.getDashboardMetrics(timeRange);
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to fetch dashboard metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics',
      message: error.message
    });
  }
});

// Get real-time metrics
router.get('/realtime', requireAdmin, async (req, res) => {
  try {
    const realtimeMetrics = analyticsService.getRealtimeMetrics();
    res.json({
      success: true,
      metrics: realtimeMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to fetch realtime metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch realtime metrics',
      message: error.message
    });
  }
});

// Track analytics event (internal use)
router.post('/track', async (req, res) => {
  try {
    const { type, data } = req.body;
    const metadata = {
      userId: req.user?.uid,
      sessionId: req.sessionID,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      referer: req.headers['referer']
    };

    await analyticsService.trackEvent(type, data, metadata);
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to track event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track event'
    });
  }
});

// Track API usage (internal use)
router.post('/api-usage', async (req, res) => {
  try {
    const { service, endpoint, ...details } = req.body;
    details.userId = req.user?.uid;

    await analyticsService.trackApiUsage(service, endpoint, details);
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to track API usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track API usage'
    });
  }
});

// Get cost breakdown
router.get('/costs', requireAdmin, async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    const startTime = analyticsService.getStartTime(timeRange);
    const costBreakdown = await analyticsService.getCostBreakdown(startTime);

    res.json({
      success: true,
      timeRange,
      costs: costBreakdown,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to fetch cost breakdown:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch costs',
      message: error.message
    });
  }
});

// Get API usage statistics
router.get('/api-stats', requireAdmin, async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    const startTime = analyticsService.getStartTime(timeRange);
    const apiStats = await analyticsService.getApiUsageStats(startTime);

    res.json({
      success: true,
      timeRange,
      statistics: apiStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to fetch API statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API statistics',
      message: error.message
    });
  }
});

// Export analytics data
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const { format = 'json', timeRange = '30d' } = req.query;
    const metrics = await analyticsService.getDashboardMetrics(timeRange);

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(metrics);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analytics_${timeRange}.csv`);
      res.send(csv);
    } else {
      res.json(metrics);
    }
  } catch (error) {
    logger.error('Failed to export analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics',
      message: error.message
    });
  }
});

// Helper function to convert metrics to CSV
function convertToCSV(metrics) {
  const lines = ['Analytics Export', `Generated: ${metrics.timestamp}`, ''];

  // Add summary metrics
  lines.push('Summary Metrics');
  lines.push('Metric,Value');
  lines.push(`Total Events,${metrics.metrics.totalEvents}`);
  lines.push(`Unique Users,${metrics.metrics.uniqueUsers}`);
  lines.push(`Error Rate,${metrics.metrics.errorRate.toFixed(2)}%`);
  lines.push('');

  // Add API usage stats
  lines.push('API Usage Statistics');
  lines.push('Service,Total Calls,Total Cost ($),Avg Response Time (ms),Success Rate (%)');
  metrics.metrics.apiUsageStats.forEach(stat => {
    lines.push(`${stat._id},${stat.totalCalls},${(stat.totalCost/100).toFixed(2)},${stat.avgResponseTime.toFixed(0)},${(stat.successRate*100).toFixed(1)}`);
  });
  lines.push('');

  // Add top events
  lines.push('Top Events');
  lines.push('Event Type,Count');
  metrics.metrics.topEvents.forEach(event => {
    lines.push(`${event._id},${event.count}`);
  });

  return lines.join('\n');
}

module.exports = router;