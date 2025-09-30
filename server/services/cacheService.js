// server/services/cacheService.js
// Advanced caching service with Redis support and fallback to memory cache

const winston = require('winston');
const crypto = require('crypto');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'cache-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class CacheService {
  constructor() {
    // Try to use Redis if available
    this.redis = null;
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      memorySize: 0
    };

    // Cache configuration
    this.config = {
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
      maxMemoryCacheSize: 100 * 1024 * 1024, // 100MB
      maxMemoryCacheItems: 10000,
      compressionThreshold: 1024, // Compress data larger than 1KB
    };

    // TTL configurations for different data types
    this.ttlConfig = {
      spoonacular_product: 24 * 60 * 60 * 1000,  // 24 hours
      spoonacular_recipe: 7 * 24 * 60 * 60 * 1000, // 7 days (recipes don't change often)
      spoonacular_ingredient: 24 * 60 * 60 * 1000, // 24 hours
      instacart_product: 1 * 60 * 60 * 1000,     // 1 hour (prices change)
      instacart_recipe: 30 * 60 * 1000,          // 30 minutes
      parsed_list: 12 * 60 * 60 * 1000,          // 12 hours
      user_preferences: 30 * 24 * 60 * 60 * 1000, // 30 days
      api_response: 60 * 60 * 1000,              // 1 hour default
    };

    this.initializeRedis();
    this.startCleanupInterval();

    logger.info('Cache service initialized with memory cache');
  }

  // Try to connect to Redis if available
  async initializeRedis() {
    // Skip Redis in production if no URL is provided
    if (!process.env.REDIS_URL) {
      logger.info('Redis URL not configured, using memory cache');
      return;
    }

    try {
      const Redis = require('redis');
      this.redis = Redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 2000, // Reduced timeout for faster failover
          reconnectStrategy: (retries) => {
            // Fail fast - don't retry in production
            if (retries > 1) {
              logger.info('Redis not available, using memory cache instead');
              return false;
            }
            return 100; // Single retry after 100ms
          }
        },
        // Disable command retry to fail fast
        commandsQueueMaxLength: 0
      });

      // Suppress error logs after initial failure
      let errorLogged = false;
      this.redis.on('error', (err) => {
        if (!errorLogged) {
          logger.debug('Redis connection failed, using memory cache');
          errorLogged = true;
        }
        this.redis = null; // Fall back to memory cache
      });

      this.redis.on('connect', () => {
        logger.info('Connected to Redis cache successfully');
      });

      // Set a timeout for connection attempt
      const connectTimeout = setTimeout(() => {
        if (this.redis && !this.redis.isReady) {
          logger.info('Redis connection timeout, using memory cache');
          this.redis.disconnect();
          this.redis = null;
        }
      }, 3000);

      await this.redis.connect();
      clearTimeout(connectTimeout);

    } catch (error) {
      // Quietly fall back to memory cache without error spam
      logger.info('Redis unavailable, using memory cache for this session');
      this.redis = null;
    }
  }

  // Generate cache key with namespace
  generateKey(namespace, data) {
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const hash = crypto.createHash('md5').update(dataStr).digest('hex').substring(0, 12);
    return `${namespace}:${hash}`;
  }

  // Get from cache
  async get(key) {
    this.cacheStats.hits++;

    try {
      // Try Redis first
      if (this.redis && this.redis.isReady) {
        const data = await this.redis.get(key);
        if (data) {
          logger.debug(`Redis cache hit: ${key}`);
          return JSON.parse(data);
        }
      }

      // Fall back to memory cache
      const memData = this.memoryCache.get(key);
      if (memData && memData.expiry > Date.now()) {
        logger.debug(`Memory cache hit: ${key}`);
        return memData.data;
      }

      // Cache miss
      this.cacheStats.misses++;
      this.cacheStats.hits--; // Correct the hit count
      return null;

    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  // Set cache value with TTL
  async set(key, value, ttl = null) {
    this.cacheStats.sets++;

    // Determine TTL based on key namespace
    if (!ttl) {
      const namespace = key.split(':')[0];
      ttl = this.ttlConfig[namespace] || this.config.defaultTTL;
    }

    const expiry = Date.now() + ttl;

    try {
      // Store in Redis if available
      if (this.redis && this.redis.isReady) {
        await this.redis.setex(key, Math.floor(ttl / 1000), JSON.stringify(value));
        logger.debug(`Cached to Redis: ${key} (TTL: ${ttl}ms)`);
      }

      // Also store in memory cache for faster access
      this.memoryCache.set(key, {
        data: value,
        expiry: expiry,
        size: JSON.stringify(value).length
      });

      // Check memory cache size
      this.enforceMemoryLimit();

      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  // Delete from cache
  async delete(key) {
    this.cacheStats.deletes++;

    try {
      if (this.redis && this.redis.isReady) {
        await this.redis.del(key);
      }
      this.memoryCache.delete(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  // Clear cache by pattern
  async clearPattern(pattern) {
    try {
      // Clear from Redis
      if (this.redis && this.redis.isReady) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
          logger.info(`Cleared ${keys.length} keys from Redis matching: ${pattern}`);
        }
      }

      // Clear from memory cache
      let cleared = 0;
      for (const [key] of this.memoryCache) {
        if (key.match(pattern)) {
          this.memoryCache.delete(key);
          cleared++;
        }
      }

      if (cleared > 0) {
        logger.info(`Cleared ${cleared} keys from memory cache matching: ${pattern}`);
      }

      return true;
    } catch (error) {
      logger.error('Clear pattern error:', error);
      return false;
    }
  }

  // Enforce memory cache size limit
  enforceMemoryLimit() {
    // Check item count
    if (this.memoryCache.size > this.config.maxMemoryCacheItems) {
      // Remove oldest items (FIFO)
      const toRemove = this.memoryCache.size - this.config.maxMemoryCacheItems + 100; // Remove 100 extra
      let removed = 0;

      for (const [key] of this.memoryCache) {
        if (removed >= toRemove) break;
        this.memoryCache.delete(key);
        removed++;
      }

      logger.debug(`Removed ${removed} items from memory cache (limit exceeded)`);
    }

    // Check memory size
    let totalSize = 0;
    for (const [, value] of this.memoryCache) {
      totalSize += value.size || 0;
    }

    this.cacheStats.memorySize = totalSize;

    if (totalSize > this.config.maxMemoryCacheSize) {
      // Remove items until under limit
      for (const [key] of this.memoryCache) {
        this.memoryCache.delete(key);
        totalSize -= this.memoryCache.get(key)?.size || 0;
        if (totalSize < this.config.maxMemoryCacheSize * 0.8) break; // Go to 80% capacity
      }

      logger.debug(`Cleaned memory cache to reduce size from ${totalSize} bytes`);
    }
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    let expired = 0;

    for (const [key, value] of this.memoryCache) {
      if (value.expiry < now) {
        this.memoryCache.delete(key);
        expired++;
      }
    }

    if (expired > 0) {
      logger.debug(`Cleaned up ${expired} expired cache entries`);
    }

    // Update stats
    this.cacheStats.memorySize = Array.from(this.memoryCache.values())
      .reduce((sum, item) => sum + (item.size || 0), 0);
  }

  // Start cleanup interval
  startCleanupInterval() {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    // Log stats every hour
    setInterval(() => {
      this.logStats();
    }, 60 * 60 * 1000);
  }

  // Get cache statistics
  getStats() {
    const hitRate = this.cacheStats.hits > 0
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      memoryCacheItems: this.memoryCache.size,
      memorySizeMB: (this.cacheStats.memorySize / 1024 / 1024).toFixed(2),
      redisConnected: !!(this.redis && this.redis.isReady)
    };
  }

  // Log cache statistics
  logStats() {
    const stats = this.getStats();
    logger.info('Cache statistics:', stats);
  }

  // ==================== SPECIALIZED CACHE METHODS ====================

  // Cache Spoonacular API response
  async cacheSpoonacularResponse(endpoint, params, data, ttl = null) {
    const key = this.generateKey('spoonacular_' + endpoint, params);
    return await this.set(key, data, ttl);
  }

  // Get cached Spoonacular response
  async getCachedSpoonacularResponse(endpoint, params) {
    const key = this.generateKey('spoonacular_' + endpoint, params);
    return await this.get(key);
  }

  // Cache Instacart API response
  async cacheInstacartResponse(endpoint, params, data, ttl = null) {
    const key = this.generateKey('instacart_' + endpoint, params);
    return await this.set(key, data, ttl || this.ttlConfig.instacart_product);
  }

  // Get cached Instacart response
  async getCachedInstacartResponse(endpoint, params) {
    const key = this.generateKey('instacart_' + endpoint, params);
    return await this.get(key);
  }

  // Cache parsed grocery list
  async cacheParsedList(listText, parsedData) {
    const key = this.generateKey('parsed_list', listText);
    return await this.set(key, parsedData, this.ttlConfig.parsed_list);
  }

  // Get cached parsed list
  async getCachedParsedList(listText) {
    const key = this.generateKey('parsed_list', listText);
    return await this.get(key);
  }

  // Cache user preferences
  async cacheUserPreferences(userId, preferences) {
    const key = `user_preferences:${userId}`;
    return await this.set(key, preferences, this.ttlConfig.user_preferences);
  }

  // Get cached user preferences
  async getCachedUserPreferences(userId) {
    const key = `user_preferences:${userId}`;
    return await this.get(key);
  }

  // Warm up cache with common searches
  async warmupCache(commonSearches = []) {
    logger.info(`Warming up cache with ${commonSearches.length} common searches`);

    for (const search of commonSearches) {
      const key = this.generateKey('warmup', search);
      const cached = await this.get(key);

      if (!cached) {
        // This would trigger actual API calls in production
        logger.debug(`Would warm up cache for: ${search}`);
      }
    }
  }

  // Clear all caches (use with caution)
  async clearAll() {
    try {
      if (this.redis && this.redis.isReady) {
        await this.redis.flushall();
        logger.info('Cleared all Redis cache');
      }

      this.memoryCache.clear();
      logger.info('Cleared all memory cache');

      // Reset stats
      this.cacheStats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        memorySize: 0
      };

      return true;
    } catch (error) {
      logger.error('Clear all cache error:', error);
      return false;
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Export instance
module.exports = cacheService;