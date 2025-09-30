/**
 * Route Control API
 * Manages enabling/disabling routes dynamically
 */

const express = require('express');
const router = express.Router();
const SystemSettings = require('../models/SystemSettings');
const { authenticateUser } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/adminAuth');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console({ format: winston.format.simple() })]
});

// Default route configurations
const DEFAULT_ROUTES = {
  // Core Features
  'route.cart': { enabled: true, name: 'Cart Operations', category: 'core', path: '/api/cart' },
  'route.grocery': { enabled: true, name: 'Grocery Processing', category: 'core', path: '/api/grocery' },
  'route.smash-cart': { enabled: true, name: 'Comprehensive Cart', category: 'core', path: '/api/smash-cart' },

  // User Management
  'route.account': { enabled: true, name: 'User Accounts', category: 'user', path: '/api/account' },
  'route.stores': { enabled: true, name: 'Store Locations', category: 'user', path: '/api/stores' },

  // Admin Features
  'route.analytics': { enabled: true, name: 'Analytics Dashboard', category: 'admin', path: '/api/analytics' },
  'route.monitoring': { enabled: true, name: 'Service Monitoring', category: 'admin', path: '/api/monitoring' },
  'route.settings': { enabled: true, name: 'Admin Settings', category: 'admin', path: '/api/settings' },
  'route.revenue': { enabled: true, name: 'Revenue Tracking', category: 'admin', path: '/api/revenue' },

  // Additional Features
  'route.images': { enabled: true, name: 'Image Proxy', category: 'additional', path: '/api/images' },
  'route.price-history': { enabled: true, name: 'Price History', category: 'additional', path: '/api/price-history' },
  'route.recipes': { enabled: true, name: 'Recipe Management', category: 'additional', path: '/api/recipes' },
  'route.unified': { enabled: true, name: 'Unified Recipe System', category: 'additional', path: '/api/unified' },
  'route.debug': { enabled: true, name: 'Debug & Error Tracking', category: 'additional', path: '/api/debug' },
  'route.cache': { enabled: true, name: 'Cache Management', category: 'additional', path: '/api/cache' },

  // API Services
  'route.ai': { enabled: true, name: 'AI Parsing', category: 'api', path: '/api/ai' },
  'route.ai-simple': { enabled: true, name: 'Simplified AI', category: 'api', path: '/api/ai-simple' },
  'route.instacart': { enabled: true, name: 'Instacart Integration', category: 'api', path: '/api/instacart' },
  'route.spoonacular': { enabled: true, name: 'Spoonacular Integration', category: 'api', path: '/api/spoonacular' },
  'route.product-validation': { enabled: true, name: 'Product Validation', category: 'api', path: '/api/product-validation' },

  // Optional/Disabled by default
  'route.meal-plans': { enabled: false, name: 'AI Meal Plans', category: 'api', path: '/api/meal-plans' },
  'route.agent': { enabled: false, name: 'Agent System', category: 'admin', path: '/api/agent' }
};

// AI Service configurations
const AI_SERVICES = {
  'service.openai': { enabled: false, name: 'OpenAI API', category: 'ai-services', description: 'GPT models for meal planning' },
  'service.anthropic': { enabled: true, name: 'Anthropic API', category: 'ai-services', description: 'Claude for parsing and analysis' },
  'service.google-ai': { enabled: false, name: 'Google AI', category: 'ai-services', description: 'Gemini models (fallback)' }
};

// External API configurations
const EXTERNAL_APIS = {
  'api.instacart': { enabled: true, name: 'Instacart API', category: 'external-apis', description: 'Cart creation and checkout' },
  'api.spoonacular': { enabled: true, name: 'Spoonacular API', category: 'external-apis', description: 'Product data and recipes' },
  'api.kroger': { enabled: false, name: 'Kroger API', category: 'external-apis', description: 'Archived - legacy integration' }
};

// Combine all configurations
const ALL_CONFIGURATIONS = {
  ...DEFAULT_ROUTES,
  ...AI_SERVICES,
  ...EXTERNAL_APIS
};

/**
 * GET /api/route-control
 * Get all route configurations
 */
router.get('/',
  authenticateUser,
  checkAdmin,
  async (req, res) => {
    try {
      const allSettings = {};

      // Get all settings from database
      for (const [key, defaultConfig] of Object.entries(ALL_CONFIGURATIONS)) {
        const dbSetting = await SystemSettings.findOne({ settingKey: key });
        if (dbSetting) {
          allSettings[key] = {
            ...defaultConfig,
            enabled: dbSetting.settingValue.enabled,
            updatedAt: dbSetting.updatedAt,
            updatedBy: dbSetting.updatedBy
          };
        } else {
          allSettings[key] = defaultConfig;
        }
      }

      // Group by category
      const grouped = {
        core: [],
        user: [],
        admin: [],
        additional: [],
        api: [],
        'ai-services': [],
        'external-apis': []
      };

      Object.entries(allSettings).forEach(([key, config]) => {
        grouped[config.category].push({ key, ...config });
      });

      res.json({
        success: true,
        settings: allSettings,
        grouped,
        routes: Object.fromEntries(
          Object.entries(allSettings).filter(([key]) => key.startsWith('route.'))
        ),
        services: Object.fromEntries(
          Object.entries(allSettings).filter(([key]) => key.startsWith('service.'))
        ),
        apis: Object.fromEntries(
          Object.entries(allSettings).filter(([key]) => key.startsWith('api.'))
        ),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error fetching configurations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch configurations'
      });
    }
  }
);

/**
 * POST /api/route-control/toggle
 * Toggle a specific route on/off
 */
router.post('/toggle',
  authenticateUser,
  checkAdmin,
  async (req, res) => {
    try {
      const { routeKey, enabled } = req.body;

      if (!routeKey || typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'routeKey and enabled (boolean) are required'
        });
      }

      if (!ALL_CONFIGURATIONS[routeKey]) {
        return res.status(404).json({
          success: false,
          error: 'Configuration not found'
        });
      }

      const config = ALL_CONFIGURATIONS[routeKey];
      const category = routeKey.startsWith('route.') ? 'routes' :
                      routeKey.startsWith('service.') ? 'services' : 'apis';

      const updatedSetting = await SystemSettings.setSetting(
        routeKey,
        { enabled },
        category,
        `Control for ${config.name}`,
        req.user?.email || req.user?.uid
      );

      logger.info(`${config.name} (${routeKey}) ${enabled ? 'enabled' : 'disabled'} by ${req.user?.email}`);

      res.json({
        success: true,
        routeKey,
        enabled,
        config,
        updatedAt: updatedSetting.updatedAt,
        message: `${config.name} ${enabled ? 'enabled' : 'disabled'}`,
        requiresRestart: routeKey.startsWith('service.') // Services require restart
      });
    } catch (error) {
      logger.error('Error toggling route:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle route'
      });
    }
  }
);

/**
 * POST /api/route-control/bulk-update
 * Update multiple routes at once
 */
router.post('/bulk-update',
  authenticateUser,
  checkAdmin,
  async (req, res) => {
    try {
      const { updates } = req.body; // Array of { routeKey, enabled }

      if (!Array.isArray(updates)) {
        return res.status(400).json({
          success: false,
          error: 'updates must be an array'
        });
      }

      const results = [];
      let requiresRestart = false;

      for (const update of updates) {
        if (ALL_CONFIGURATIONS[update.routeKey]) {
          const config = ALL_CONFIGURATIONS[update.routeKey];
          const category = update.routeKey.startsWith('route.') ? 'routes' :
                          update.routeKey.startsWith('service.') ? 'services' : 'apis';

          await SystemSettings.setSetting(
            update.routeKey,
            { enabled: update.enabled },
            category,
            `Control for ${config.name}`,
            req.user?.email || req.user?.uid
          );

          if (update.routeKey.startsWith('service.')) {
            requiresRestart = true;
          }

          results.push({
            routeKey: update.routeKey,
            enabled: update.enabled,
            success: true
          });
        } else {
          results.push({
            routeKey: update.routeKey,
            success: false,
            error: 'Configuration not found'
          });
        }
      }

      logger.info(`Bulk route update by ${req.user?.email}: ${results.length} routes updated`);

      res.json({
        success: true,
        results,
        requiresRestart,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error bulk updating routes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk update routes'
      });
    }
  }
);

/**
 * GET /api/route-control/status/:routeKey
 * Check if a specific route is enabled
 */
router.get('/status/:routeKey',
  async (req, res) => {
    try {
      const { routeKey } = req.params;

      if (!ALL_CONFIGURATIONS[routeKey]) {
        return res.status(404).json({
          success: false,
          error: 'Configuration not found'
        });
      }

      const setting = await SystemSettings.findOne({ settingKey: routeKey });
      const enabled = setting ? setting.settingValue.enabled : ALL_CONFIGURATIONS[routeKey].enabled;

      res.json({
        success: true,
        routeKey,
        enabled,
        config: ALL_CONFIGURATIONS[routeKey]
      });
    } catch (error) {
      logger.error('Error checking route status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check route status'
      });
    }
  }
);

module.exports = router;