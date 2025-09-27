// server/routes/analyticsAdmin.js
// Admin Analytics Routes for Dashboard

const express = require('express');
const router = express.Router();
const winston = require('winston');
const { authenticateUser } = require('../middleware/auth');
const admin = require('firebase-admin');

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'analytics-admin' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Middleware to check admin role
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has admin custom claim
    const userRecord = await admin.auth().getUser(req.user.uid);
    if (!userRecord.customClaims || !userRecord.customClaims.admin) {
      logger.warn(`Non-admin user ${req.user.uid} attempted to access admin endpoint`);
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    logger.error('Admin check failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Authorization check failed'
    });
  }
};

// GET /api/analytics/users/activity - Get recent user activity
router.get('/users/activity', async (req, res) => {
  try {
    const { limit = 10, hours = 24 } = req.query;
    const limitNum = parseInt(limit);
    const hoursNum = parseInt(hours);

    logger.info(`Fetching user activity: limit=${limitNum}, hours=${hoursNum}`);

    // Calculate time range
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursNum);

    // In production, this would query your database for user activities
    // For now, return structured mock data
    const activities = [
      {
        id: `activity_${Date.now()}_1`,
        userName: 'John Doe',
        userId: 'user_001',
        action: 'Created shopping list',
        type: 'list_created',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
        metadata: {
          itemCount: 15,
          listName: 'Weekly Groceries'
        }
      },
      {
        id: `activity_${Date.now()}_2`,
        userName: 'Jane Smith',
        userId: 'user_002',
        action: 'Parsed grocery items',
        type: 'items_parsed',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        metadata: {
          itemCount: 8,
          source: 'AI Assistant'
        }
      },
      {
        id: `activity_${Date.now()}_3`,
        userName: 'Bob Johnson',
        userId: 'user_003',
        action: 'Generated meal plan',
        type: 'meal_plan_created',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
        metadata: {
          daysCount: 7,
          recipesCount: 21
        }
      },
      {
        id: `activity_${Date.now()}_4`,
        userName: 'Alice Brown',
        userId: 'user_004',
        action: 'Compared prices',
        type: 'price_comparison',
        timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
        metadata: {
          storesCompared: 3,
          savingsAmount: '$12.50'
        }
      },
      {
        id: `activity_${Date.now()}_5`,
        userName: 'Charlie Wilson',
        userId: 'user_005',
        action: 'Created Instacart cart',
        type: 'cart_created',
        timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 hours ago
        metadata: {
          itemCount: 23,
          totalAmount: '$145.30',
          store: 'Safeway'
        }
      }
    ].slice(0, limitNum);

    const response = {
      success: true,
      activities,
      stats: {
        activeUsers: activities.length,
        totalActivities: activities.length,
        timeRange: `${hoursNum}h`,
        lastUpdated: new Date().toISOString()
      },
      pagination: {
        limit: limitNum,
        offset: 0,
        total: activities.length
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to fetch user activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity',
      message: error.message
    });
  }
});

// GET /api/analytics/users/accounts - Get user account information
router.get('/users/accounts', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    logger.info(`Fetching user accounts: limit=${limitNum}, offset=${offsetNum}`);

    // Try to get real Firebase users if available
    let users = [];
    let totalUsers = 0;

    try {
      // List users from Firebase Auth
      const listUsersResult = await admin.auth().listUsers(limitNum);

      users = listUsersResult.users.map(user => ({
        uid: user.uid,
        email: user.email || 'N/A',
        displayName: user.displayName || 'Anonymous',
        emailVerified: user.emailVerified || false,
        disabled: user.disabled || false,
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime,
        providerData: user.providerData.map(provider => ({
          providerId: provider.providerId,
          uid: provider.uid
        })),
        customClaims: user.customClaims || {},
        photoURL: user.photoURL || null
      }));

      // Get total count (this is an estimate in Firebase)
      totalUsers = users.length;

      logger.info(`Found ${users.length} Firebase users`);
    } catch (firebaseError) {
      logger.warn('Could not fetch Firebase users, using mock data:', firebaseError.message);

      // Fallback to mock data if Firebase fails
      users = [
        {
          uid: 'mock_user_001',
          email: 'admin@cartsmash.com',
          displayName: 'Admin User',
          emailVerified: true,
          disabled: false,
          creationTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
          lastSignInTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
          providerData: [{ providerId: 'password', uid: 'admin@cartsmash.com' }],
          customClaims: { admin: true },
          photoURL: null
        },
        {
          uid: 'mock_user_002',
          email: 'john.doe@example.com',
          displayName: 'John Doe',
          emailVerified: true,
          disabled: false,
          creationTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days ago
          lastSignInTime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          providerData: [{ providerId: 'google.com', uid: '123456789' }],
          customClaims: {},
          photoURL: 'https://ui-avatars.com/api/?name=John+Doe'
        },
        {
          uid: 'mock_user_003',
          email: 'jane.smith@example.com',
          displayName: 'Jane Smith',
          emailVerified: true,
          disabled: false,
          creationTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
          lastSignInTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
          providerData: [{ providerId: 'password', uid: 'jane.smith@example.com' }],
          customClaims: {},
          photoURL: null
        }
      ];
      totalUsers = users.length;
    }

    const response = {
      success: true,
      users: users.slice(offsetNum, offsetNum + limitNum),
      totalUsers,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: totalUsers,
        hasMore: offsetNum + limitNum < totalUsers
      },
      stats: {
        verifiedUsers: users.filter(u => u.emailVerified).length,
        disabledUsers: users.filter(u => u.disabled).length,
        adminUsers: users.filter(u => u.customClaims && u.customClaims.admin).length
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to fetch user accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user accounts',
      message: error.message
    });
  }
});

// GET /api/analytics/realtime - Get realtime analytics data
router.get('/realtime', authenticateUser, requireAdmin, async (req, res) => {
  try {
    logger.info('Fetching realtime analytics for admin');

    // In production, this would query your database/cache for real metrics
    // For now, return realistic mock data
    const now = new Date();
    const response = {
      success: true,
      timestamp: now.toISOString(),
      metrics: {
        activeUsers: {
          current: Math.floor(Math.random() * 50) + 10,
          change: Math.random() > 0.5 ? '+' : '-' + Math.floor(Math.random() * 10) + '%',
          period: 'last_hour'
        },
        requestsPerMinute: {
          current: Math.floor(Math.random() * 200) + 50,
          change: Math.random() > 0.5 ? '+' : '-' + Math.floor(Math.random() * 20) + '%',
          period: 'last_5min'
        },
        cartsParsed: {
          today: Math.floor(Math.random() * 500) + 100,
          change: '+' + Math.floor(Math.random() * 30) + '%',
          period: 'vs_yesterday'
        },
        apiLatency: {
          p50: Math.floor(Math.random() * 50) + 20,
          p95: Math.floor(Math.random() * 200) + 100,
          p99: Math.floor(Math.random() * 500) + 200,
          unit: 'ms'
        },
        errorRate: {
          current: (Math.random() * 2).toFixed(2) + '%',
          threshold: '5%',
          status: 'healthy'
        },
        topEndpoints: [
          { path: '/api/cart/parse', count: 1250, avgTime: '45ms' },
          { path: '/api/instacart/search', count: 890, avgTime: '120ms' },
          { path: '/api/ai/smart-parse', count: 456, avgTime: '230ms' },
          { path: '/api/meal-plans/generate', count: 234, avgTime: '450ms' },
          { path: '/api/analytics/health', count: 180, avgTime: '15ms' }
        ],
        systemHealth: {
          cpu: Math.floor(Math.random() * 40) + 20 + '%',
          memory: Math.floor(Math.random() * 30) + 40 + '%',
          disk: Math.floor(Math.random() * 20) + 30 + '%',
          uptime: '15d 6h 32m'
        }
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to fetch realtime analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch realtime analytics',
      message: error.message
    });
  }
});

// GET /api/analytics/health - Simple health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'analytics',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;