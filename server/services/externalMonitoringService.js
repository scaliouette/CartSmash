// server/services/externalMonitoringService.js
// External service monitoring and API usage tracking

const winston = require('winston');
const axios = require('axios');
const mongoose = require('mongoose');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'external-monitoring' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Service Metrics Schema
const ServiceMetricsSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  service: {
    type: String,
    enum: ['vercel', 'render', 'mongodb', 'firebase', 'openai', 'anthropic', 'spoonacular', 'instacart'],
    required: true
  },
  metrics: {
    // Common metrics
    uptime: Number, // percentage
    responseTime: Number, // milliseconds
    requestCount: Number,
    errorRate: Number, // percentage

    // Service-specific metrics
    // Vercel
    bandwidth: Number, // GB
    builds: {
      total: Number,
      successful: Number,
      failed: Number
    },
    webVitals: {
      fcp: Number, // First Contentful Paint
      lcp: Number, // Largest Contentful Paint
      fid: Number, // First Input Delay
      cls: Number  // Cumulative Layout Shift
    },

    // Render
    cpu: Number, // percentage
    memory: Number, // MB
    disk: Number, // GB

    // MongoDB
    connections: Number,
    operations: {
      read: Number,
      write: Number
    },
    storage: Number, // GB

    // AI APIs
    tokens: {
      used: Number,
      limit: Number
    },
    cost: Number,

    // Firebase
    activeUsers: Number,
    authRequests: Number,
    storageUsed: Number // GB
  },
  alerts: [{
    level: { type: String, enum: ['info', 'warning', 'critical'] },
    message: String,
    timestamp: Date
  }]
});

// API Usage Schema
const APIUsageSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  service: String,
  endpoint: String,
  userId: String,
  requestId: String,
  duration: Number, // milliseconds
  tokens: {
    prompt: Number,
    completion: Number,
    total: Number
  },
  cost: Number,
  success: Boolean,
  error: String,
  metadata: mongoose.Schema.Types.Mixed
});

// Initialize models
let ServiceMetrics, APIUsage;
try {
  ServiceMetrics = mongoose.model('ServiceMetrics');
  APIUsage = mongoose.model('APIUsage');
} catch {
  ServiceMetrics = mongoose.model('ServiceMetrics', ServiceMetricsSchema);
  APIUsage = mongoose.model('APIUsage', APIUsageSchema);
}

class ExternalMonitoringService {
  constructor() {
    // Service configurations
    this.services = {
      vercel: {
        apiUrl: 'https://api.vercel.com',
        token: process.env.VERCEL_TOKEN
      },
      render: {
        apiUrl: 'https://api.render.com/v1',
        token: process.env.RENDER_API_KEY
      },
      mongodb: {
        atlasUrl: 'https://cloud.mongodb.com/api/atlas/v1.0',
        publicKey: process.env.MONGODB_PUBLIC_KEY,
        privateKey: process.env.MONGODB_PRIVATE_KEY
      }
    };

    // Cost calculation rates
    this.costRates = {
      openai: {
        'gpt-4': { prompt: 0.03, completion: 0.06 }, // per 1K tokens
        'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 }
      },
      anthropic: {
        'claude-3-opus': { prompt: 0.015, completion: 0.075 },
        'claude-3-sonnet': { prompt: 0.003, completion: 0.015 }
      },
      spoonacular: {
        perRequest: 0.001 // $1 per 1000 requests
      }
    };

    // Start monitoring intervals
    this.startMonitoring();
    logger.info('External monitoring service initialized');
  }

  startMonitoring() {
    // Monitor every 5 minutes
    setInterval(() => this.collectAllMetrics(), 5 * 60 * 1000);

    // Initial collection
    this.collectAllMetrics();
  }

  async collectAllMetrics() {
    try {
      await Promise.all([
        this.collectVercelMetrics(),
        this.collectRenderMetrics(),
        this.collectMongoDBMetrics(),
        this.collectFirebaseMetrics()
      ]);
      logger.info('Collected metrics from all external services');
    } catch (error) {
      logger.error('Failed to collect metrics:', error);
    }
  }

  // Collect Vercel metrics
  async collectVercelMetrics() {
    try {
      // Mock data for now (real API integration would go here)
      const metrics = new ServiceMetrics({
        service: 'vercel',
        metrics: {
          uptime: 99.95,
          responseTime: 45,
          requestCount: Math.floor(Math.random() * 10000) + 5000,
          errorRate: 0.05,
          bandwidth: Math.random() * 10 + 5,
          builds: {
            total: 50,
            successful: 48,
            failed: 2
          },
          webVitals: {
            fcp: 1200 + Math.random() * 500,
            lcp: 2500 + Math.random() * 1000,
            fid: 100 + Math.random() * 50,
            cls: 0.1 + Math.random() * 0.05
          }
        }
      });

      await metrics.save();
      return metrics;
    } catch (error) {
      logger.error('Failed to collect Vercel metrics:', error);
    }
  }

  // Collect Render metrics
  async collectRenderMetrics() {
    try {
      // Mock data for now
      const metrics = new ServiceMetrics({
        service: 'render',
        metrics: {
          uptime: 99.9,
          responseTime: 120,
          requestCount: Math.floor(Math.random() * 5000) + 2000,
          errorRate: 0.1,
          cpu: 15 + Math.random() * 30,
          memory: 256 + Math.random() * 512,
          disk: 1 + Math.random() * 5
        }
      });

      await metrics.save();
      return metrics;
    } catch (error) {
      logger.error('Failed to collect Render metrics:', error);
    }
  }

  // Collect MongoDB metrics
  async collectMongoDBMetrics() {
    try {
      // Check if MongoDB is connected before trying to get stats
      let dbStats = null;
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        try {
          dbStats = await mongoose.connection.db.stats();
        } catch (statsError) {
          logger.debug('Could not get MongoDB stats:', statsError.message);
        }
      }

      const metrics = new ServiceMetrics({
        service: 'mongodb',
        metrics: {
          uptime: 99.99,
          responseTime: 10,
          connections: mongoose.connection.readyState === 1 ? 1 : 0,
          operations: {
            read: Math.floor(Math.random() * 1000),
            write: Math.floor(Math.random() * 500)
          },
          storage: dbStats ? dbStats.dataSize / (1024 * 1024 * 1024) : 0 // Convert to GB
        }
      });

      await metrics.save();
      return metrics;
    } catch (error) {
      logger.error('Failed to collect MongoDB metrics:', error);
    }
  }

  // Collect Firebase metrics
  async collectFirebaseMetrics() {
    try {
      // Mock data for now
      const metrics = new ServiceMetrics({
        service: 'firebase',
        metrics: {
          uptime: 99.99,
          activeUsers: Math.floor(Math.random() * 500) + 100,
          authRequests: Math.floor(Math.random() * 2000) + 500,
          storageUsed: Math.random() * 5 + 1
        }
      });

      await metrics.save();
      return metrics;
    } catch (error) {
      logger.error('Failed to collect Firebase metrics:', error);
    }
  }

  // Track API usage
  async trackAPIUsage(service, data) {
    try {
      const usage = new APIUsage({
        service,
        endpoint: data.endpoint,
        userId: data.userId,
        requestId: data.requestId,
        duration: data.duration,
        tokens: data.tokens,
        cost: this.calculateCost(service, data),
        success: data.success,
        error: data.error,
        metadata: data.metadata
      });

      await usage.save();

      // Check for cost alerts
      await this.checkCostAlerts(service, usage.cost);

      return usage;
    } catch (error) {
      logger.error('Failed to track API usage:', error);
    }
  }

  // Calculate API cost
  calculateCost(service, data) {
    try {
      if (service === 'openai' || service === 'anthropic') {
        const model = data.model || 'gpt-3.5-turbo';
        const rates = this.costRates[service][model];
        if (!rates) return 0;

        const promptCost = (data.tokens.prompt / 1000) * rates.prompt;
        const completionCost = (data.tokens.completion / 1000) * rates.completion;
        return promptCost + completionCost;
      } else if (service === 'spoonacular') {
        return this.costRates.spoonacular.perRequest;
      }
      return 0;
    } catch (error) {
      logger.error('Failed to calculate cost:', error);
      return 0;
    }
  }

  // Check for cost alerts
  async checkCostAlerts(service, cost) {
    try {
      // Get daily cost
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyCost = await APIUsage.aggregate([
        {
          $match: {
            service,
            timestamp: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$cost' }
          }
        }
      ]);

      const total = dailyCost[0]?.total || 0;

      // Alert thresholds
      const thresholds = {
        openai: { warning: 50, critical: 100 },
        anthropic: { warning: 30, critical: 60 },
        spoonacular: { warning: 10, critical: 20 }
      };

      const threshold = thresholds[service];
      if (!threshold) return;

      if (total > threshold.critical) {
        await this.createAlert(service, 'critical',
          `${service} daily cost exceeded $${threshold.critical}: $${total.toFixed(2)}`);
      } else if (total > threshold.warning) {
        await this.createAlert(service, 'warning',
          `${service} daily cost exceeded $${threshold.warning}: $${total.toFixed(2)}`);
      }
    } catch (error) {
      logger.error('Failed to check cost alerts:', error);
    }
  }

  // Create alert
  async createAlert(service, level, message) {
    try {
      const latestMetric = await ServiceMetrics.findOne({ service })
        .sort({ timestamp: -1 });

      if (latestMetric) {
        latestMetric.alerts.push({
          level,
          message,
          timestamp: new Date()
        });
        await latestMetric.save();
      }

      logger.warn(`Alert created for ${service}: ${message}`);

      // TODO: Send notification (email, SMS, Slack, etc.)
    } catch (error) {
      logger.error('Failed to create alert:', error);
    }
  }

  // Get service health status
  async getServiceHealth() {
    try {
      const services = ['vercel', 'render', 'mongodb', 'firebase', 'openai', 'anthropic', 'spoonacular'];
      const health = {};

      for (const service of services) {
        const latestMetric = await ServiceMetrics.findOne({ service })
          .sort({ timestamp: -1 });

        if (!latestMetric) {
          health[service] = { status: 'unknown', uptime: 0 };
          continue;
        }

        const metrics = latestMetric.metrics;
        let status = 'healthy';

        // Determine health based on metrics
        if (metrics.uptime < 95) status = 'degraded';
        if (metrics.errorRate > 5) status = 'degraded';
        if (metrics.uptime < 90) status = 'unhealthy';
        if (metrics.errorRate > 10) status = 'unhealthy';

        // Check for recent critical alerts
        const criticalAlerts = latestMetric.alerts.filter(
          a => a.level === 'critical' &&
          (new Date() - a.timestamp) < 60 * 60 * 1000 // Last hour
        );

        if (criticalAlerts.length > 0) status = 'critical';

        health[service] = {
          status,
          uptime: metrics.uptime,
          responseTime: metrics.responseTime,
          errorRate: metrics.errorRate,
          lastChecked: latestMetric.timestamp,
          alerts: latestMetric.alerts.slice(-5) // Last 5 alerts
        };
      }

      return health;
    } catch (error) {
      logger.error('Failed to get service health:', error);
      throw error;
    }
  }

  // Get API usage summary
  async getAPIUsageSummary(startDate, endDate) {
    try {
      const usage = await APIUsage.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$service',
            totalRequests: { $sum: 1 },
            successfulRequests: {
              $sum: { $cond: ['$success', 1, 0] }
            },
            totalTokens: { $sum: '$tokens.total' },
            totalCost: { $sum: '$cost' },
            averageDuration: { $avg: '$duration' },
            uniqueUsers: { $addToSet: '$userId' }
          }
        },
        {
          $project: {
            service: '$_id',
            totalRequests: 1,
            successfulRequests: 1,
            successRate: {
              $multiply: [
                { $divide: ['$successfulRequests', '$totalRequests'] },
                100
              ]
            },
            totalTokens: 1,
            totalCost: 1,
            averageDuration: 1,
            uniqueUserCount: { $size: '$uniqueUsers' }
          }
        }
      ]);

      // Calculate totals
      const totals = usage.reduce((acc, service) => ({
        requests: acc.requests + service.totalRequests,
        cost: acc.cost + service.totalCost,
        tokens: acc.tokens + (service.totalTokens || 0)
      }), { requests: 0, cost: 0, tokens: 0 });

      return {
        services: usage,
        totals,
        period: { startDate, endDate }
      };
    } catch (error) {
      logger.error('Failed to get API usage summary:', error);
      throw error;
    }
  }

  // Generate mock monitoring data
  async generateMockData(days = 30) {
    try {
      const services = ['vercel', 'render', 'mongodb', 'firebase'];
      const apiServices = ['openai', 'anthropic', 'spoonacular'];
      const mockData = [];

      for (let d = 0; d < days; d++) {
        const date = new Date(Date.now() - d * 24 * 60 * 60 * 1000);

        // Generate service metrics (every hour)
        for (let h = 0; h < 24; h++) {
          const timestamp = new Date(date);
          timestamp.setHours(h);

          for (const service of services) {
            mockData.push(new ServiceMetrics({
              timestamp,
              service,
              metrics: this.generateMockMetrics(service)
            }));
          }
        }

        // Generate API usage (random throughout the day)
        const apiCallsPerDay = Math.floor(Math.random() * 500) + 100;
        for (let i = 0; i < apiCallsPerDay; i++) {
          const service = apiServices[Math.floor(Math.random() * apiServices.length)];
          const timestamp = new Date(date);
          timestamp.setHours(Math.floor(Math.random() * 24));
          timestamp.setMinutes(Math.floor(Math.random() * 60));

          mockData.push(new APIUsage({
            timestamp,
            service,
            endpoint: `/${service}/v1/chat/completions`,
            userId: `user_${Math.floor(Math.random() * 100)}`,
            duration: Math.floor(Math.random() * 2000) + 100,
            tokens: {
              prompt: Math.floor(Math.random() * 1000) + 100,
              completion: Math.floor(Math.random() * 500) + 50,
              total: 0
            },
            cost: Math.random() * 0.5,
            success: Math.random() > 0.05
          }));

          // Update total tokens
          const usage = mockData[mockData.length - 1];
          usage.tokens.total = usage.tokens.prompt + usage.tokens.completion;
        }
      }

      // Save mock data
      await ServiceMetrics.insertMany(mockData.filter(d => d instanceof ServiceMetrics));
      await APIUsage.insertMany(mockData.filter(d => d instanceof APIUsage));

      logger.info(`Generated ${mockData.length} mock monitoring records for ${days} days`);
      return { success: true, recordsCreated: mockData.length };
    } catch (error) {
      logger.error('Failed to generate mock data:', error);
      throw error;
    }
  }

  generateMockMetrics(service) {
    const base = {
      uptime: 99 + Math.random(),
      responseTime: Math.floor(Math.random() * 200) + 20,
      requestCount: Math.floor(Math.random() * 10000) + 1000,
      errorRate: Math.random() * 2
    };

    switch (service) {
      case 'vercel':
        return {
          ...base,
          bandwidth: Math.random() * 20 + 5,
          builds: {
            total: Math.floor(Math.random() * 20) + 5,
            successful: Math.floor(Math.random() * 18) + 4,
            failed: Math.floor(Math.random() * 2)
          },
          webVitals: {
            fcp: 1000 + Math.random() * 1000,
            lcp: 2000 + Math.random() * 2000,
            fid: 50 + Math.random() * 100,
            cls: Math.random() * 0.2
          }
        };
      case 'render':
        return {
          ...base,
          cpu: 10 + Math.random() * 50,
          memory: 200 + Math.random() * 800,
          disk: Math.random() * 10 + 1
        };
      case 'mongodb':
        return {
          ...base,
          connections: Math.floor(Math.random() * 50) + 10,
          operations: {
            read: Math.floor(Math.random() * 2000) + 500,
            write: Math.floor(Math.random() * 1000) + 100
          },
          storage: Math.random() * 5 + 1
        };
      case 'firebase':
        return {
          ...base,
          activeUsers: Math.floor(Math.random() * 1000) + 100,
          authRequests: Math.floor(Math.random() * 5000) + 500,
          storageUsed: Math.random() * 10 + 1
        };
      default:
        return base;
    }
  }

  // Get API usage for a period (30d, 7d, etc.)
  async getAPIUsage(period = '30d') {
    try {
      const days = period === '30d' ? 30 : period === '7d' ? 7 : 1;
      const usage = {
        openai: {
          requests: Math.floor(Math.random() * 1000 * days) + 100,
          tokens: Math.floor(Math.random() * 50000 * days) + 5000,
          cost: (Math.random() * 10 * days).toFixed(2)
        },
        anthropic: {
          requests: Math.floor(Math.random() * 500 * days) + 50,
          tokens: Math.floor(Math.random() * 30000 * days) + 3000,
          cost: (Math.random() * 8 * days).toFixed(2)
        },
        spoonacular: {
          requests: Math.floor(Math.random() * 200 * days) + 20,
          cost: (Math.random() * 2 * days).toFixed(2)
        },
        instacart: {
          requests: Math.floor(Math.random() * 300 * days) + 30,
          cost: 0 // Free tier
        },
        total: {
          requests: Math.floor(Math.random() * 2000 * days) + 200,
          cost: (Math.random() * 20 * days).toFixed(2)
        },
        period: period,
        days: days
      };
      return usage;
    } catch (error) {
      logger.error('Failed to get API usage:', error);
      throw error;
    }
  }

  // Get current costs
  async getCurrentCosts() {
    try {
      const costs = {
        vercel: {
          current: (Math.random() * 20).toFixed(2),
          projected: (Math.random() * 30).toFixed(2),
          limit: 20,
          usage: Math.floor(Math.random() * 100)
        },
        render: {
          current: 0, // Free tier
          projected: 0,
          limit: 'Free',
          usage: Math.floor(Math.random() * 100)
        },
        mongodb: {
          current: 0, // Free tier
          projected: 0,
          limit: 'Free',
          usage: Math.floor(Math.random() * 100)
        },
        firebase: {
          current: (Math.random() * 5).toFixed(2),
          projected: (Math.random() * 10).toFixed(2),
          limit: 10,
          usage: Math.floor(Math.random() * 100)
        },
        apis: {
          current: (Math.random() * 15).toFixed(2),
          projected: (Math.random() * 20).toFixed(2),
          limit: 50,
          usage: Math.floor(Math.random() * 100)
        },
        total: {
          current: (Math.random() * 40).toFixed(2),
          projected: (Math.random() * 60).toFixed(2),
          limit: 100,
          usage: Math.floor(Math.random() * 100)
        }
      };
      return costs;
    } catch (error) {
      logger.error('Failed to get current costs:', error);
      throw error;
    }
  }

  // Check all services health
  async checkAllServices() {
    try {
      const [vercel, render, mongodb, firebase] = await Promise.allSettled([
        this.checkVercelStatus(),
        this.checkRenderStatus(),
        this.checkMongoDBStatus(),
        this.checkFirebaseStatus()
      ]);

      return {
        vercel: vercel.status === 'fulfilled' ? vercel.value : { status: 'error', error: vercel.reason?.message },
        render: render.status === 'fulfilled' ? render.value : { status: 'error', error: render.reason?.message },
        mongodb: mongodb.status === 'fulfilled' ? mongodb.value : { status: 'error', error: mongodb.reason?.message },
        firebase: firebase.status === 'fulfilled' ? firebase.value : { status: 'error', error: firebase.reason?.message },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to check all services:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new ExternalMonitoringService();