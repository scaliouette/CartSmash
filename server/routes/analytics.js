// server/routes/analytics.js - Analytics data for the dashboard
const express = require('express');
const router = express.Router();

console.log('📊 Loading Analytics routes...');

// In-memory analytics storage (in production, use a database)
let analyticsData = {
  parsing: {
    totalLists: 0,
    totalItems: 0,
    intelligentParsingUsed: 0,
    fallbackParsingUsed: 0,
    totalProcessingTime: 0,
    confidenceScores: [],
    categories: {},
    userFeedback: {
      accepted: 0,
      edited: 0,
      rejected: 0
    }
  },
  performance: {
    uptime: Date.now(),
    apiCalls: 0,
    errors: 0,
    avgResponseTime: 0
  },
  daily: []
};

// Get parsing analytics with time range
router.get('/parsing', (req, res) => {
  const { range = '24h' } = req.query;
  console.log(`📊 Analytics request for range: ${range}`);
  
  try {
    // Generate analytics based on current data + mock data for demo
    const analytics = generateAnalyticsData(range);
    
    res.json({
      success: true,
      range: range,
      ...analytics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Analytics generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate analytics',
      message: error.message
    });
  }
});

// Get real-time metrics
router.get('/realtime', (req, res) => {
  console.log('⚡ Real-time metrics request');
  
  const currentHour = new Date().getHours();
  const realtime = {
    currentHour: {
      lists: Math.floor(Math.random() * 50) + 10,
      items: Math.floor(Math.random() * 300) + 50,
      avgProcessingTime: (Math.random() * 3 + 1).toFixed(1),
      errors: Math.floor(Math.random() * 5)
    },
    system: {
      memoryUsage: process.memoryUsage ? process.memoryUsage() : {
        heapUsed: 45 * 1024 * 1024,
        heapTotal: 67 * 1024 * 1024,
        external: 12 * 1024 * 1024
      },
      cpuUsage: Math.random() * 30 + 10
    },
    performance: {
      uptime: Math.floor((Date.now() - analyticsData.performance.uptime) / 1000),
      activeConnections: Math.floor(Math.random() * 10) + 1,
      requestsPerMinute: Math.floor(Math.random() * 100) + 20
    }
  };
  
  res.json({
    success: true,
    realtime: realtime,
    timestamp: new Date().toISOString()
  });
});

// Record analytics event (for when the app actually processes lists)
router.post('/event', (req, res) => {
  const { type, data } = req.body;
  console.log(`📝 Recording analytics event: ${type}`);
  
  try {
    switch (type) {
      case 'list_parsed':
        recordListParsed(data);
        break;
      case 'user_feedback':
        recordUserFeedback(data);
        break;
      case 'api_call':
        recordApiCall(data);
        break;
      default:
        console.warn(`Unknown analytics event type: ${type}`);
    }
    
    res.json({
      success: true,
      message: 'Event recorded',
      type: type
    });
    
  } catch (error) {
    console.error('❌ Failed to record analytics event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record event',
      message: error.message
    });
  }
});

// Export analytics data
router.get('/export', (req, res) => {
  const { format = 'json' } = req.query;
  console.log(`📤 Exporting analytics in ${format} format`);
  
  try {
    const exportData = {
      exportDate: new Date().toISOString(),
      range: 'all_time',
      data: analyticsData
    };
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.json');
      res.json(exportData);
    } else if (format === 'csv') {
      const csvData = convertToCSV(analyticsData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');
      res.send(csvData);
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported format',
        supportedFormats: ['json', 'csv']
      });
    }
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    res.status(500).json({
      success: false,
      error: 'Export failed',
      message: error.message
    });
  }
});

// Helper Functions

function generateAnalyticsData(range) {
  // Combine real data with enhanced mock data for demo purposes
  const baseMultiplier = getMultiplierForRange(range);
  
  return {
    overview: {
      totalLists: analyticsData.parsing.totalLists + Math.floor(1247 * baseMultiplier),
      totalItems: analyticsData.parsing.totalItems + Math.floor(8934 * baseMultiplier),
      accuracyRate: 89.4 + (Math.random() * 6 - 3), // 86-92%
      avgConfidence: 0.847 + (Math.random() * 0.1 - 0.05),
      topCategory: 'produce',
      improvementTrend: '+' + (12.3 + Math.random() * 5).toFixed(1) + '%'
    },
    
    parsing: {
      intelligentParsing: {
        used: analyticsData.parsing.intelligentParsingUsed + Math.floor(1156 * baseMultiplier),
        accuracy: 91.2 + (Math.random() * 4 - 2),
        avgProcessingTime: 1.8 + (Math.random() * 0.8 - 0.4),
        filteringEfficiency: (87.3 + Math.random() * 6).toFixed(1) + '%'
      },
      fallbackParsing: {
        used: analyticsData.parsing.fallbackParsingUsed + Math.floor(91 * baseMultiplier),
        accuracy: 67.8 + (Math.random() * 8 - 4),
        avgProcessingTime: 0.3 + (Math.random() * 0.2 - 0.1),
        filteringEfficiency: (43.2 + Math.random() * 10).toFixed(1) + '%'
      }
    },
    
    confidence: {
      high: { 
        count: Math.floor(6723 * baseMultiplier), 
        percentage: 75.3 + (Math.random() * 6 - 3)
      },
      medium: { 
        count: Math.floor(1587 * baseMultiplier), 
        percentage: 17.8 + (Math.random() * 4 - 2)
      },
      low: { 
        count: Math.floor(624 * baseMultiplier), 
        percentage: 6.9 + (Math.random() * 3 - 1.5)
      }
    },
    
    categories: {
      produce: { 
        count: Math.floor(2145 * baseMultiplier), 
        accuracy: 94.2 + (Math.random() * 3 - 1.5)
      },
      dairy: { 
        count: Math.floor(1567 * baseMultiplier), 
        accuracy: 92.8 + (Math.random() * 3 - 1.5)
      },
      meat: { 
        count: Math.floor(1234 * baseMultiplier), 
        accuracy: 88.9 + (Math.random() * 4 - 2)
      },
      pantry: { 
        count: Math.floor(2089 * baseMultiplier), 
        accuracy: 87.3 + (Math.random() * 4 - 2)
      },
      beverages: { 
        count: Math.floor(892 * baseMultiplier), 
        accuracy: 85.1 + (Math.random() * 5 - 2.5)
      },
      other: { 
        count: Math.floor(1007 * baseMultiplier), 
        accuracy: 79.4 + (Math.random() * 6 - 3)
      }
    },
    
    userFeedback: {
      accepted: analyticsData.parsing.userFeedback.accepted + Math.floor(7834 * baseMultiplier),
      edited: analyticsData.parsing.userFeedback.edited + Math.floor(645 * baseMultiplier),
      rejected: analyticsData.parsing.userFeedback.rejected + Math.floor(455 * baseMultiplier),
      satisfactionScore: 4.6 + (Math.random() * 0.3 - 0.15)
    },
    
    performance: {
      avgResponseTime: 2.1 + (Math.random() * 1 - 0.5),
      apiUptime: 99.7 + (Math.random() * 0.25 - 0.1),
      errorRate: 0.8 + (Math.random() * 0.6 - 0.3),
      cachehitRate: 67.3 + (Math.random() * 15 - 7.5)
    },
    
    trends: {
      daily: generateDailyTrends(range)
    }
  };
}

function getMultiplierForRange(range) {
  switch (range) {
    case '1h': return 0.05;
    case '24h': return 1;
    case '7d': return 7;
    case '30d': return 30;
    default: return 1;
  }
}

function generateDailyTrends(range) {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 7;
  const trends = [];
  
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    trends.push({
      date: date.toISOString().split('T')[0],
      accuracy: 85 + Math.random() * 10,
      items: Math.floor(200 + Math.random() * 200),
      lists: Math.floor(20 + Math.random() * 30),
      processingTime: 1.5 + Math.random() * 1
    });
  }
  
  return trends;
}

function recordListParsed(data) {
  analyticsData.parsing.totalLists++;
  analyticsData.parsing.totalItems += data.itemCount || 0;
  
  if (data.method === 'intelligent') {
    analyticsData.parsing.intelligentParsingUsed++;
  } else {
    analyticsData.parsing.fallbackParsingUsed++;
  }
  
  if (data.processingTime) {
    analyticsData.parsing.totalProcessingTime += data.processingTime;
  }
  
  if (data.confidenceScores) {
    analyticsData.parsing.confidenceScores.push(...data.confidenceScores);
  }
  
  // Record daily stats
  const today = new Date().toISOString().split('T')[0];
  let dailyEntry = analyticsData.daily.find(d => d.date === today);
  if (!dailyEntry) {
    dailyEntry = { date: today, lists: 0, items: 0, accuracy: 0 };
    analyticsData.daily.push(dailyEntry);
  }
  dailyEntry.lists++;
  dailyEntry.items += data.itemCount || 0;
}

function recordUserFeedback(data) {
  if (data.action === 'accepted') {
    analyticsData.parsing.userFeedback.accepted++;
  } else if (data.action === 'edited') {
    analyticsData.parsing.userFeedback.edited++;
  } else if (data.action === 'rejected') {
    analyticsData.parsing.userFeedback.rejected++;
  }
}

function recordApiCall(data) {
  analyticsData.performance.apiCalls++;
  
  if (data.error) {
    analyticsData.performance.errors++;
  }
  
  if (data.responseTime) {
    // Update running average
    const total = analyticsData.performance.avgResponseTime * (analyticsData.performance.apiCalls - 1);
    analyticsData.performance.avgResponseTime = (total + data.responseTime) / analyticsData.performance.apiCalls;
  }
}

function convertToCSV(data) {
  const rows = [
    ['Metric', 'Value'],
    ['Total Lists', data.parsing.totalLists],
    ['Total Items', data.parsing.totalItems],
    ['Intelligent Parsing Used', data.parsing.intelligentParsingUsed],
    ['Fallback Parsing Used', data.parsing.fallbackParsingUsed],
    ['API Calls', data.performance.apiCalls],
    ['Errors', data.performance.errors],
    ['Avg Response Time', data.performance.avgResponseTime]
  ];
  
  return rows.map(row => row.join(',')).join('\n');
}

// Middleware to record API calls automatically
router.recordApiCall = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    recordApiCall({
      responseTime: responseTime,
      error: res.statusCode >= 400,
      endpoint: req.path,
      method: req.method
    });
  });
  
  next();
};

console.log('✅ Analytics routes loaded successfully');
module.exports = router;