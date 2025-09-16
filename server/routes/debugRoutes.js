// server/routes/debugRoutes.js
// Debug endpoints for error tracking and monitoring

const express = require('express');
const router = express.Router();
const winston = require('winston');
const path = require('path');

// Setup dedicated debug logger
const debugLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cartsmash-debug' },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/debug-errors.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/debug-combined.log',),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  debugLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// In-memory storage for recent errors (for quick access)
let recentErrors = [];
let recentWarnings = [];
const MAX_RECENT_ITEMS = 100;

// POST /api/debug/error - Log client-side errors
router.post('/error', async (req, res) => {
  try {
    const errorData = {
      ...req.body,
      serverTimestamp: new Date().toISOString(),
      userIP: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.headers['x-session-id'] || 'unknown'
    };

    // Log to Winston
    debugLogger.error('CLIENT_ERROR', errorData);

    // Store in memory for quick access
    recentErrors.push(errorData);
    if (recentErrors.length > MAX_RECENT_ITEMS) {
      recentErrors = recentErrors.slice(-MAX_RECENT_ITEMS);
    }

    // Log to console for immediate visibility
    console.group('🔴 CLIENT ERROR RECEIVED');
    console.error('Type:', errorData.type);
    console.error('Details:', errorData.details);
    console.error('URL:', errorData.url);
    console.error('Timestamp:', errorData.timestamp);
    console.groupEnd();

    res.json({ success: true, logged: true, errorId: errorData.id });
  } catch (error) {
    console.error('Failed to log client error:', error);
    res.status(500).json({ success: false, error: 'Failed to log error' });
  }
});

// POST /api/debug/warning - Log client-side warnings
router.post('/warning', async (req, res) => {
  try {
    const warningData = {
      ...req.body,
      serverTimestamp: new Date().toISOString(),
      userIP: req.ip,
      userAgent: req.get('User-Agent')
    };

    debugLogger.warn('CLIENT_WARNING', warningData);

    recentWarnings.push(warningData);
    if (recentWarnings.length > MAX_RECENT_ITEMS) {
      recentWarnings = recentWarnings.slice(-MAX_RECENT_ITEMS);
    }

    console.group('🟡 CLIENT WARNING RECEIVED');
    console.warn('Type:', warningData.type);
    console.warn('Details:', warningData.details);
    console.groupEnd();

    res.json({ success: true, logged: true });
  } catch (error) {
    console.error('Failed to log client warning:', error);
    res.status(500).json({ success: false, error: 'Failed to log warning' });
  }
});

// POST /api/debug/info - Log client-side info
router.post('/info', async (req, res) => {
  try {
    const infoData = {
      ...req.body,
      serverTimestamp: new Date().toISOString(),
      userIP: req.ip,
      userAgent: req.get('User-Agent')
    };

    debugLogger.info('CLIENT_INFO', infoData);

    res.json({ success: true, logged: true });
  } catch (error) {
    console.error('Failed to log client info:', error);
    res.status(500).json({ success: false, error: 'Failed to log info' });
  }
});

// GET /api/debug/status - Get debug status and recent errors
router.get('/status', (req, res) => {
  try {
    const status = {
      enabled: true,
      recentErrorsCount: recentErrors.length,
      recentWarningsCount: recentWarnings.length,
      recentErrors: recentErrors.slice(-10), // Last 10 errors
      recentWarnings: recentWarnings.slice(-10), // Last 10 warnings
      serverTime: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform
    };

    res.json(status);
  } catch (error) {
    console.error('Failed to get debug status:', error);
    res.status(500).json({ success: false, error: 'Failed to get status' });
  }
});

// GET /api/debug/errors - Get all recent errors with filtering
router.get('/errors', (req, res) => {
  try {
    const { type, limit = 50, since } = req.query;
    let filteredErrors = [...recentErrors];

    // Filter by type if specified
    if (type) {
      filteredErrors = filteredErrors.filter(error => error.type === type);
    }

    // Filter by time if since is specified
    if (since) {
      const sinceDate = new Date(since);
      filteredErrors = filteredErrors.filter(error =>
        new Date(error.timestamp) > sinceDate
      );
    }

    // Limit results
    const limitNum = parseInt(limit);
    if (limitNum > 0) {
      filteredErrors = filteredErrors.slice(-limitNum);
    }

    res.json({
      errors: filteredErrors,
      total: filteredErrors.length,
      filtered: {
        type: type || null,
        since: since || null,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Failed to get errors:', error);
    res.status(500).json({ success: false, error: 'Failed to get errors' });
  }
});

// POST /api/debug/clear - Clear recent error logs
router.post('/clear', (req, res) => {
  try {
    const beforeCount = recentErrors.length + recentWarnings.length;

    recentErrors = [];
    recentWarnings = [];

    console.log(`🧹 Debug logs cleared. Removed ${beforeCount} items.`);

    res.json({
      success: true,
      cleared: beforeCount,
      message: `Cleared ${beforeCount} debug items`
    });
  } catch (error) {
    console.error('Failed to clear debug logs:', error);
    res.status(500).json({ success: false, error: 'Failed to clear logs' });
  }
});

// GET /api/debug/system - Get system diagnostic information
router.get('/system', (req, res) => {
  try {
    const systemInfo = {
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      application: {
        port: process.env.PORT || 3001,
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      debugging: {
        recentErrorsCount: recentErrors.length,
        recentWarningsCount: recentWarnings.length,
        loggerLevel: debugLogger.level,
        transportsCount: debugLogger.transports.length
      }
    };

    res.json(systemInfo);
  } catch (error) {
    console.error('Failed to get system info:', error);
    res.status(500).json({ success: false, error: 'Failed to get system info' });
  }
});

// Export recent errors for analysis
router.get('/export', (req, res) => {
  try {
    const exportData = {
      errors: recentErrors,
      warnings: recentWarnings,
      exportedAt: new Date().toISOString(),
      serverInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=debug-export.json');
    res.json(exportData);
  } catch (error) {
    console.error('Failed to export debug data:', error);
    res.status(500).json({ success: false, error: 'Failed to export data' });
  }
});

module.exports = router;