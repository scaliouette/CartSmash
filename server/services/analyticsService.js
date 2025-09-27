// server/services/analyticsService.js - Real analytics tracking service
const winston = require('winston');
const mongoose = require('mongoose');

// Create logger (same configuration as server.js)
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'analytics-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Analytics Schema for MongoDB
const analyticsSchema = new mongoose.Schema({
  type: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  userId: { type: String, index: true },
  sessionId: String,
  data: mongoose.Schema.Types.Mixed,
  metadata: {
    userAgent: String,
    ip: String,
    referer: String
  }
});

// API Usage Schema for tracking costs
const apiUsageSchema = new mongoose.Schema({
  service: { type: String, required: true, index: true }, // 'spoonacular', 'openai', 'anthropic', etc
  endpoint: String,
  timestamp: { type: Date, default: Date.now, index: true },
  userId: String,
  cost: Number, // Estimated cost in cents
  tokens: Number, // For AI services
  requests: { type: Number, default: 1 },
  success: Boolean,
  errorMessage: String,
  responseTime: Number, // in ms
  metadata: mongoose.Schema.Types.Mixed
});

const Analytics = mongoose.model('Analytics', analyticsSchema);
const ApiUsage = mongoose.model('ApiUsage', apiUsageSchema);

class AnalyticsService {
  constructor() {
    this.realtimeStats = {
      activeUsers: new Set(),
      requestsPerMinute: [],
      errorsPerMinute: [],
      apiCallsPerMinute: {},
      lastUpdated: Date.now()
    };

    // Clean up old per-minute stats every minute
    setInterval(() => this.cleanupRealtimeStats(), 60000);
  }

  // Track general analytics event
  async trackEvent(type, data, metadata = {}) {
    try {
      const event = new Analytics({
        type,
        data,
        userId: metadata.userId,
        sessionId: metadata.sessionId,
        metadata: {
          userAgent: metadata.userAgent,
          ip: metadata.ip,
          referer: metadata.referer
        }
      });

      await event.save();
      this.updateRealtimeStats(type, data);

      logger.info(`Analytics event tracked: ${type}`);
      return true;
    } catch (error) {
      logger.error('Failed to track analytics event:', error);
      return false;
    }
  }

  // Track API usage for cost tracking
  async trackApiUsage(service, endpoint, details = {}) {
    try {
      const usage = new ApiUsage({
        service,
        endpoint,
        userId: details.userId,
        cost: this.calculateCost(service, endpoint, details),
        tokens: details.tokens,
        success: details.success !== false,
        errorMessage: details.error,
        responseTime: details.responseTime,
        metadata: details.metadata
      });

      await usage.save();

      // Update realtime API stats
      if (!this.realtimeStats.apiCallsPerMinute[service]) {
        this.realtimeStats.apiCallsPerMinute[service] = [];
      }
      this.realtimeStats.apiCallsPerMinute[service].push({
        timestamp: Date.now(),
        cost: usage.cost
      });

      return usage;
    } catch (error) {
      logger.error('Failed to track API usage:', error);
      return null;
    }
  }

  // Calculate estimated cost based on service pricing
  calculateCost(service, endpoint, details) {
    const pricing = {
      spoonacular: {
        search: 0.01, // 1 cent per search
        productInfo: 0.01,
        parseIngredients: 0.02,
        nutrition: 0.02,
        default: 0.01
      },
      openai: {
        'gpt-3.5-turbo': 0.0015, // per 1K tokens input
        'gpt-4': 0.03, // per 1K tokens input
        default: 0.002
      },
      anthropic: {
        'claude-3-haiku': 0.0025, // per 1K tokens
        'claude-3-sonnet': 0.003,
        'claude-3-opus': 0.015,
        default: 0.003
      },
      google: {
        'gemini-pro': 0.00025, // per 1K characters
        default: 0.0005
      }
    };

    const servicePricing = pricing[service];
    if (!servicePricing) return 0;

    let cost = servicePricing[endpoint] || servicePricing.default || 0;

    // Adjust for token/character count
    if (details.tokens && (service === 'openai' || service === 'anthropic')) {
      cost = cost * (details.tokens / 1000);
    } else if (details.characters && service === 'google') {
      cost = cost * (details.characters / 1000);
    }

    return Math.round(cost * 100); // Return in cents
  }

  // Update realtime statistics
  updateRealtimeStats(type, data) {
    const now = Date.now();

    // Track active users
    if (data.userId) {
      this.realtimeStats.activeUsers.add(data.userId);
    }

    // Track requests per minute
    this.realtimeStats.requestsPerMinute.push({
      timestamp: now,
      type
    });

    // Track errors
    if (type === 'error' || data.error) {
      this.realtimeStats.errorsPerMinute.push({
        timestamp: now,
        error: data.error || 'Unknown error'
      });
    }

    this.realtimeStats.lastUpdated = now;
  }

  // Clean up old realtime stats (older than 5 minutes)
  cleanupRealtimeStats() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

    // Clean requests
    this.realtimeStats.requestsPerMinute = this.realtimeStats.requestsPerMinute
      .filter(r => r.timestamp > fiveMinutesAgo);

    // Clean errors
    this.realtimeStats.errorsPerMinute = this.realtimeStats.errorsPerMinute
      .filter(e => e.timestamp > fiveMinutesAgo);

    // Clean API calls
    Object.keys(this.realtimeStats.apiCallsPerMinute).forEach(service => {
      this.realtimeStats.apiCallsPerMinute[service] =
        this.realtimeStats.apiCallsPerMinute[service]
          .filter(c => c.timestamp > fiveMinutesAgo);
    });

    // Clear inactive users (no activity in last 5 minutes)
    // Note: This is simplified - in production, track last activity per user
    if (this.realtimeStats.requestsPerMinute.length === 0) {
      this.realtimeStats.activeUsers.clear();
    }
  }

  // Get dashboard metrics
  async getDashboardMetrics(timeRange = '24h') {
    try {
      const now = new Date();
      const startTime = this.getStartTime(timeRange);

      // Get aggregated metrics
      const [
        totalEvents,
        uniqueUsers,
        apiUsageStats,
        errorRate,
        topEvents,
        costBreakdown
      ] = await Promise.all([
        this.getTotalEvents(startTime),
        this.getUniqueUsers(startTime),
        this.getApiUsageStats(startTime),
        this.getErrorRate(startTime),
        this.getTopEvents(startTime),
        this.getCostBreakdown(startTime)
      ]);

      return {
        success: true,
        timeRange,
        metrics: {
          totalEvents,
          uniqueUsers,
          apiUsageStats,
          errorRate,
          topEvents,
          costBreakdown,
          realtime: this.getRealtimeMetrics()
        },
        timestamp: now.toISOString()
      };
    } catch (error) {
      logger.error('Failed to get dashboard metrics:', error);
      throw error;
    }
  }

  // Get realtime metrics
  getRealtimeMetrics() {
    const oneMinuteAgo = Date.now() - 60000;

    // Calculate current RPM
    const currentRPM = this.realtimeStats.requestsPerMinute
      .filter(r => r.timestamp > oneMinuteAgo).length;

    // Calculate error rate
    const recentErrors = this.realtimeStats.errorsPerMinute
      .filter(e => e.timestamp > oneMinuteAgo).length;

    // Calculate API costs per minute
    const apiCostPerMinute = {};
    Object.keys(this.realtimeStats.apiCallsPerMinute).forEach(service => {
      const recentCalls = this.realtimeStats.apiCallsPerMinute[service]
        .filter(c => c.timestamp > oneMinuteAgo);
      apiCostPerMinute[service] = {
        calls: recentCalls.length,
        cost: recentCalls.reduce((sum, c) => sum + (c.cost || 0), 0) / 100 // Convert to dollars
      };
    });

    return {
      activeUsers: this.realtimeStats.activeUsers.size,
      requestsPerMinute: currentRPM,
      errorsPerMinute: recentErrors,
      apiCostPerMinute,
      lastUpdated: this.realtimeStats.lastUpdated
    };
  }

  // Helper methods for aggregation
  async getTotalEvents(startTime) {
    return Analytics.countDocuments({
      timestamp: { $gte: startTime }
    });
  }

  async getUniqueUsers(startTime) {
    const result = await Analytics.distinct('userId', {
      timestamp: { $gte: startTime },
      userId: { $exists: true, $ne: null }
    });
    return result.length;
  }

  async getApiUsageStats(startTime) {
    return ApiUsage.aggregate([
      { $match: { timestamp: { $gte: startTime } } },
      {
        $group: {
          _id: '$service',
          totalCalls: { $sum: 1 },
          totalCost: { $sum: '$cost' },
          avgResponseTime: { $avg: '$responseTime' },
          successRate: {
            $avg: { $cond: ['$success', 1, 0] }
          }
        }
      }
    ]);
  }

  async getErrorRate(startTime) {
    const [total, errors] = await Promise.all([
      Analytics.countDocuments({ timestamp: { $gte: startTime } }),
      Analytics.countDocuments({
        timestamp: { $gte: startTime },
        type: 'error'
      })
    ]);
    return total > 0 ? (errors / total) * 100 : 0;
  }

  async getTopEvents(startTime, limit = 10) {
    return Analytics.aggregate([
      { $match: { timestamp: { $gte: startTime } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);
  }

  async getCostBreakdown(startTime) {
    const breakdown = await ApiUsage.aggregate([
      { $match: { timestamp: { $gte: startTime } } },
      {
        $group: {
          _id: {
            service: '$service',
            day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          dailyCost: { $sum: '$cost' },
          calls: { $sum: 1 }
        }
      },
      { $sort: { '_id.day': 1 } }
    ]);

    // Format for easy consumption
    const formatted = {};
    breakdown.forEach(item => {
      if (!formatted[item._id.service]) {
        formatted[item._id.service] = [];
      }
      formatted[item._id.service].push({
        date: item._id.day,
        cost: item.dailyCost / 100, // Convert to dollars
        calls: item.calls
      });
    });

    return formatted;
  }

  // Helper to get start time based on range
  getStartTime(range) {
    const now = new Date();
    switch (range) {
      case '1h':
        return new Date(now - 60 * 60 * 1000);
      case '24h':
        return new Date(now - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now - 24 * 60 * 60 * 1000);
    }
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();

module.exports = analyticsService;