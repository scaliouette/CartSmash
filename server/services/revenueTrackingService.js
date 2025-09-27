// server/services/revenueTrackingService.js
// Comprehensive revenue tracking and monetization analytics

const winston = require('winston');
const mongoose = require('mongoose');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'revenue-tracking' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Revenue Schema
const RevenueSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, index: true },
  type: {
    type: String,
    enum: ['instacart_commission', 'subscription', 'api_usage', 'enterprise', 'sponsored'],
    required: true
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  userId: { type: String, index: true },
  orderId: String,
  cartId: String,
  metadata: {
    instacartOrderValue: Number,
    commissionRate: Number,
    subscriptionTier: String,
    apiService: String,
    tokenCount: Number,
    sponsorName: String
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'paid', 'refunded'],
    default: 'pending'
  }
});

// Cost Schema
const CostSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, index: true },
  service: {
    type: String,
    enum: ['openai', 'anthropic', 'google_ai', 'spoonacular', 'instacart', 'hosting', 'database', 'other'],
    required: true
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  metadata: {
    requestCount: Number,
    tokenCount: Number,
    endpoint: String,
    userId: String,
    errorRate: Number
  }
});

// Subscription Schema
const SubscriptionSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  tier: {
    type: String,
    enum: ['free', 'pro', 'enterprise', 'custom'],
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled', 'past_due'],
    default: 'active'
  },
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  renewalDate: Date,
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  features: {
    apiCallsPerMonth: { type: Number, default: 100 },
    advancedAnalytics: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    whiteLabel: { type: Boolean, default: false },
    customIntegrations: { type: Boolean, default: false }
  },
  paymentMethod: {
    type: String,
    last4: String,
    brand: String
  },
  billingHistory: [{
    date: Date,
    amount: Number,
    status: String,
    invoiceId: String
  }]
});

// Initialize models
let Revenue, Cost, Subscription;
try {
  Revenue = mongoose.model('Revenue');
  Cost = mongoose.model('Cost');
  Subscription = mongoose.model('Subscription');
} catch {
  Revenue = mongoose.model('Revenue', RevenueSchema);
  Cost = mongoose.model('Cost', CostSchema);
  Subscription = mongoose.model('Subscription', SubscriptionSchema);
}

class RevenueTrackingService {
  constructor() {
    // Commission rates for different services
    this.commissionRates = {
      instacart: 0.035, // 3.5% estimated affiliate commission
      sponsored: 0.15,   // 15% markup on sponsored products
      api: 0.25         // 25% markup on API usage
    };

    // Subscription tiers
    this.subscriptionTiers = {
      free: {
        price: 0,
        name: 'Free',
        apiCalls: 100,
        features: ['basic_parsing', 'instacart_checkout']
      },
      pro: {
        price: 9.99,
        name: 'Pro',
        apiCalls: 1000,
        features: ['advanced_ai', 'analytics', 'priority_support', 'meal_planning']
      },
      enterprise: {
        price: 99.99,
        name: 'Enterprise',
        apiCalls: 10000,
        features: ['white_label', 'api_access', 'custom_integrations', 'dedicated_support']
      }
    };

    logger.info('Revenue tracking service initialized');
  }

  // Track Instacart commission
  async trackInstacartCommission(cartData) {
    try {
      const estimatedOrderValue = cartData.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      const commission = estimatedOrderValue * this.commissionRates.instacart;

      const revenue = new Revenue({
        type: 'instacart_commission',
        amount: commission,
        userId: cartData.userId,
        cartId: cartData.cartId,
        metadata: {
          instacartOrderValue: estimatedOrderValue,
          commissionRate: this.commissionRates.instacart
        }
      });

      await revenue.save();
      logger.info(`Tracked Instacart commission: $${commission.toFixed(2)} from order value $${estimatedOrderValue.toFixed(2)}`);

      return revenue;
    } catch (error) {
      logger.error('Failed to track Instacart commission:', error);
      throw error;
    }
  }

  // Track subscription revenue
  async trackSubscriptionRevenue(userId, tier, amount) {
    try {
      const revenue = new Revenue({
        type: 'subscription',
        amount: amount || this.subscriptionTiers[tier].price,
        userId,
        metadata: {
          subscriptionTier: tier
        },
        status: 'confirmed'
      });

      await revenue.save();
      logger.info(`Tracked subscription revenue: $${revenue.amount} for ${tier} tier`);

      return revenue;
    } catch (error) {
      logger.error('Failed to track subscription revenue:', error);
      throw error;
    }
  }

  // Track API costs
  async trackAPICost(service, amount, metadata = {}) {
    try {
      const cost = new Cost({
        service,
        amount,
        metadata
      });

      await cost.save();
      logger.info(`Tracked ${service} cost: $${amount.toFixed(4)}`);

      return cost;
    } catch (error) {
      logger.error('Failed to track API cost:', error);
      throw error;
    }
  }

  // Get revenue summary
  async getRevenueSummary(startDate, endDate) {
    try {
      const query = {
        date: { $gte: startDate, $lte: endDate },
        status: { $ne: 'refunded' }
      };

      // Revenue by type
      const revenueByType = await Revenue.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      // Total revenue
      const totalRevenue = revenueByType.reduce((sum, item) => sum + item.total, 0);

      // Costs by service
      const costsByService = await Cost.aggregate([
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: '$service',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      // Total costs
      const totalCosts = costsByService.reduce((sum, item) => sum + item.total, 0);

      // Net profit
      const netProfit = totalRevenue - totalCosts;

      // Daily revenue trend
      const dailyRevenue = await Revenue.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            revenue: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return {
        totalRevenue,
        totalCosts,
        netProfit,
        profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
        revenueByType,
        costsByService,
        dailyRevenue,
        period: { startDate, endDate }
      };
    } catch (error) {
      logger.error('Failed to get revenue summary:', error);
      throw error;
    }
  }

  // Get MRR (Monthly Recurring Revenue)
  async getMRR() {
    try {
      const activeSubscriptions = await Subscription.aggregate([
        { $match: { status: 'active', tier: { $ne: 'free' } } },
        {
          $group: {
            _id: '$tier',
            count: { $sum: 1 },
            revenue: { $sum: '$price' }
          }
        }
      ]);

      const totalMRR = activeSubscriptions.reduce((sum, sub) => sum + sub.revenue, 0);

      return {
        totalMRR,
        byTier: activeSubscriptions,
        subscriberCount: activeSubscriptions.reduce((sum, sub) => sum + sub.count, 0)
      };
    } catch (error) {
      logger.error('Failed to get MRR:', error);
      throw error;
    }
  }

  // Calculate customer lifetime value
  async calculateCLTV(userId) {
    try {
      const userRevenue = await Revenue.aggregate([
        { $match: { userId, status: { $ne: 'refunded' } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            transactionCount: { $sum: 1 },
            firstTransaction: { $min: '$date' },
            lastTransaction: { $max: '$date' }
          }
        }
      ]);

      if (!userRevenue.length) {
        return { cltv: 0, transactions: 0 };
      }

      const data = userRevenue[0];
      const monthsActive = Math.max(1,
        (data.lastTransaction - data.firstTransaction) / (1000 * 60 * 60 * 24 * 30)
      );

      return {
        cltv: data.totalRevenue,
        transactions: data.transactionCount,
        averageOrderValue: data.totalRevenue / data.transactionCount,
        monthlyValue: data.totalRevenue / monthsActive,
        monthsActive
      };
    } catch (error) {
      logger.error('Failed to calculate CLTV:', error);
      throw error;
    }
  }

  // Get growth metrics
  async getGrowthMetrics() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      // Current period revenue
      const currentRevenue = await Revenue.aggregate([
        { $match: { date: { $gte: thirtyDaysAgo }, status: { $ne: 'refunded' } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      // Previous period revenue
      const previousRevenue = await Revenue.aggregate([
        {
          $match: {
            date: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
            status: { $ne: 'refunded' }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const current = currentRevenue[0]?.total || 0;
      const previous = previousRevenue[0]?.total || 0;

      const growthRate = previous > 0 ? ((current - previous) / previous) * 100 : 0;

      // Get subscriber growth
      const newSubscribers = await Subscription.countDocuments({
        startDate: { $gte: thirtyDaysAgo },
        tier: { $ne: 'free' }
      });

      const churnedSubscribers = await Subscription.countDocuments({
        endDate: { $gte: thirtyDaysAgo },
        status: 'cancelled'
      });

      return {
        revenueGrowth: {
          current,
          previous,
          growthRate,
          trend: growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'stable'
        },
        subscriberMetrics: {
          newSubscribers,
          churnedSubscribers,
          netGrowth: newSubscribers - churnedSubscribers,
          churnRate: (churnedSubscribers / newSubscribers) * 100
        }
      };
    } catch (error) {
      logger.error('Failed to get growth metrics:', error);
      throw error;
    }
  }

  // Generate mock revenue data for testing
  async generateMockData(months = 6) {
    try {
      const now = new Date();
      const mockData = [];

      for (let m = 0; m < months; m++) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() - m + 1, 0).getDate();

        for (let d = 0; d < daysInMonth; d++) {
          const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), d + 1);

          // Generate 5-20 Instacart commissions per day
          const commissionsCount = Math.floor(Math.random() * 15) + 5;
          for (let i = 0; i < commissionsCount; i++) {
            mockData.push(new Revenue({
              date,
              type: 'instacart_commission',
              amount: Math.random() * 10 + 2, // $2-12 per commission
              userId: `user_${Math.floor(Math.random() * 1000)}`,
              status: 'confirmed',
              metadata: {
                instacartOrderValue: Math.random() * 200 + 50,
                commissionRate: this.commissionRates.instacart
              }
            }));
          }

          // Generate subscription revenue (monthly on the 1st)
          if (d === 0) {
            const subscriberCount = 50 + m * 10; // Growing subscriber base
            for (let i = 0; i < subscriberCount; i++) {
              const tier = Math.random() > 0.7 ? 'enterprise' : 'pro';
              mockData.push(new Revenue({
                date,
                type: 'subscription',
                amount: this.subscriptionTiers[tier].price,
                userId: `subscriber_${i}`,
                status: 'confirmed',
                metadata: { subscriptionTier: tier }
              }));
            }
          }

          // Generate API costs
          const apiCosts = [
            { service: 'openai', amount: Math.random() * 50 + 10 },
            { service: 'anthropic', amount: Math.random() * 30 + 5 },
            { service: 'spoonacular', amount: Math.random() * 10 + 2 }
          ];

          for (const cost of apiCosts) {
            mockData.push(new Cost({
              date,
              service: cost.service,
              amount: cost.amount,
              metadata: {
                requestCount: Math.floor(Math.random() * 1000),
                tokenCount: Math.floor(Math.random() * 100000)
              }
            }));
          }
        }
      }

      // Save all mock data
      await Revenue.insertMany(mockData.filter(d => d instanceof Revenue));
      await Cost.insertMany(mockData.filter(d => d instanceof Cost));

      logger.info(`Generated ${mockData.length} mock revenue/cost records for ${months} months`);
      return { success: true, recordsCreated: mockData.length };
    } catch (error) {
      logger.error('Failed to generate mock data:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new RevenueTrackingService();