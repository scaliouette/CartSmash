/**
 * Route Control Middleware
 * Checks if routes are enabled before allowing access
 */

const SystemSettings = require('../models/SystemSettings');

// Cache for route statuses (refresh every 30 seconds)
let routeCache = {};
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Get route status with caching
 */
async function getRouteStatus(routeKey) {
  const now = Date.now();

  // Refresh cache if expired
  if (now - cacheTimestamp > CACHE_TTL) {
    routeCache = {};
    cacheTimestamp = now;
  }

  // Return cached value if available
  if (routeCache[routeKey] !== undefined) {
    return routeCache[routeKey];
  }

  // Fetch from database
  try {
    const setting = await SystemSettings.findOne({ settingKey: routeKey });
    const enabled = setting ? setting.settingValue.enabled : true; // Default to enabled
    routeCache[routeKey] = enabled;
    return enabled;
  } catch (error) {
    console.error(`Error checking route status for ${routeKey}:`, error);
    return true; // Fail open - allow access if database check fails
  }
}

/**
 * Middleware factory to check if a route is enabled
 * @param {string} routeKey - The route key (e.g., 'route.cart')
 */
function checkRouteEnabled(routeKey) {
  return async (req, res, next) => {
    try {
      const enabled = await getRouteStatus(routeKey);

      if (!enabled) {
        return res.status(503).json({
          success: false,
          error: 'Service temporarily disabled',
          message: 'This feature is currently disabled by the administrator',
          routeKey
        });
      }

      next();
    } catch (error) {
      console.error('Route control middleware error:', error);
      next(); // Fail open - allow access on error
    }
  };
}

/**
 * Clear the route cache (call this when settings are updated)
 */
function clearRouteCache() {
  routeCache = {};
  cacheTimestamp = 0;
}

module.exports = {
  checkRouteEnabled,
  clearRouteCache,
  getRouteStatus
};