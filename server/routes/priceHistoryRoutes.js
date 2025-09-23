// server/routes/priceHistoryRoutes.js
// API endpoints for multi-vendor price history and comparison

const express = require('express');
const router = express.Router();

// Mock vendor configurations with real retailer information
const VENDOR_CONFIGS = {
  'safeway': {
    name: 'Safeway',
    logo: '🛒',
    color: '#FF6B35',
    apiEndpoint: 'https://api.safeway.com/v1',
    requiresAuth: true,
    avgDeliveryTime: '2-4 hours',
    serviceFee: 3.99,
    deliveryFee: 5.95
  },
  'costco': {
    name: 'Costco',
    logo: '🏪',
    color: '#003F7F',
    apiEndpoint: 'https://api.costco.com/v1',
    requiresAuth: true,
    avgDeliveryTime: '1-3 hours',
    serviceFee: 0,
    deliveryFee: 3.99,
    membershipRequired: true
  },
  'wholefoods': {
    name: 'Whole Foods',
    logo: '🥬',
    color: '#00A652',
    apiEndpoint: 'https://api.wholefoods.com/v1',
    requiresAuth: true,
    avgDeliveryTime: '1-2 hours',
    serviceFee: 4.95,
    deliveryFee: 4.95
  },
  'target': {
    name: 'Target',
    logo: '🎯',
    color: '#CC0000',
    apiEndpoint: 'https://api.target.com/v1',
    requiresAuth: true,
    avgDeliveryTime: '2-5 hours',
    serviceFee: 3.99,
    deliveryFee: 9.99
  },
  'walmart': {
    name: 'Walmart',
    logo: '🛍️',
    color: '#0066B2',
    apiEndpoint: 'https://api.walmart.com/v1',
    requiresAuth: true,
    avgDeliveryTime: '1-3 hours',
    serviceFee: 0,
    deliveryFee: 7.95
  },
  'kroger': {
    name: 'Kroger',
    logo: '🏬',
    color: '#0066B2',
    apiEndpoint: 'https://api.kroger.com/v1',
    requiresAuth: true,
    avgDeliveryTime: '2-4 hours',
    serviceFee: 4.95,
    deliveryFee: 5.95
  },
  'instacart': {
    name: 'Instacart',
    logo: '🥕',
    color: '#00B894',
    apiEndpoint: process.env.INSTACART_API_URL || 'https://connect.dev.instacart.tools/idp/v1',
    requiresAuth: true,
    avgDeliveryTime: '1-2 hours',
    serviceFee: 5.99,
    deliveryFee: 3.99
  }
};

// In-memory cache for price data (in production, use Redis)
const priceCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// GET /api/price-history - Get price history for a product across vendors
router.get('/', async (req, res) => {
  console.log('🚫 Price history service disabled - no mock data generation allowed');
  return res.status(503).json({
    success: false,
    error: 'Price history service disabled',
    message: 'Mock price data generation has been eliminated. Use real vendor API integrations.',
    source: 'mock_data_elimination'
  });

    if (!product) {
      return res.status(400).json({
        error: 'Product name is required',
        message: 'Please provide a product name to search for price history'
      });
    }

    console.log(`📈 Price history request: ${product} (${timeRange})`);

    // Check cache first
    const cacheKey = `price_history_${product}_${timeRange}_${zipCode}`;
    const cachedData = priceCache.get(cacheKey);

    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      console.log('📦 Returning cached price data');
      return res.json({
        success: true,
        product,
        timeRange,
        priceHistory: cachedData.data,
        cached: true,
        lastUpdated: new Date(cachedData.timestamp).toISOString()
      });
    }

    // Generate comprehensive price data for all vendors
    const priceHistory = await generateVendorPriceData(product, timeRange, zipCode, productId);

    // Cache the results
    priceCache.set(cacheKey, {
      data: priceHistory,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      product,
      timeRange,
      priceHistory,
      cached: false,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Price history error:', error);
    res.status(500).json({
      error: 'Failed to fetch price history',
      message: error.message
    });
  }
});

// GET /api/price-history/vendors - Get list of supported vendors
router.get('/vendors', (req, res) => {
  try {
    const vendors = Object.values(VENDOR_CONFIGS).map(vendor => ({
      name: vendor.name,
      logo: vendor.logo,
      color: vendor.color,
      avgDeliveryTime: vendor.avgDeliveryTime,
      serviceFee: vendor.serviceFee,
      deliveryFee: vendor.deliveryFee,
      membershipRequired: vendor.membershipRequired || false
    }));

    res.json({
      success: true,
      vendors,
      count: vendors.length
    });
  } catch (error) {
    console.error('Vendors list error:', error);
    res.status(500).json({
      error: 'Failed to fetch vendor list',
      message: error.message
    });
  }
});

// POST /api/price-history/track - Track price for future monitoring
router.post('/track', async (req, res) => {
  try {
    const { product, productId, alertPrice, userId } = req.body;

    if (!product || !alertPrice) {
      return res.status(400).json({
        error: 'Product and alert price are required',
        message: 'Please provide product name and desired alert price'
      });
    }

    // In production, this would store in a database with price tracking
    const trackingData = {
      product,
      productId,
      alertPrice: parseFloat(alertPrice),
      userId,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    console.log('🔔 Price tracking registered:', trackingData);

    res.json({
      success: true,
      message: `Price tracking enabled for ${product} at $${alertPrice}`,
      tracking: trackingData
    });

  } catch (error) {
    console.error('Price tracking error:', error);
    res.status(500).json({
      error: 'Failed to setup price tracking',
      message: error.message
    });
  }
});

// Helper function to generate realistic vendor price data
async function generateVendorPriceData(productName, timeRange, zipCode, productId) {
  const vendors = Object.keys(VENDOR_CONFIGS);
  const basePrice = calculateBasePrice(productName);
  const priceHistory = [];

  for (const vendorKey of vendors) {
    const vendor = VENDOR_CONFIGS[vendorKey];

    // Simulate different pricing strategies per vendor
    const vendorMultiplier = getVendorPriceMultiplier(vendorKey, productName);
    const vendorPrice = basePrice * vendorMultiplier;

    // Check availability (some vendors might not carry certain products)
    const availability = Math.random() > 0.15 ? 'in-stock' : 'out-of-stock';

    // Generate historical price data
    const historicalPrices = generateHistoricalPrices(vendorPrice, timeRange);

    priceHistory.push({
      vendor: vendor.name,
      vendorLogo: vendor.logo,
      vendorColor: vendor.color,
      price: parseFloat(vendorPrice.toFixed(2)),
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
      availability,
      deliveryTime: vendor.avgDeliveryTime,
      serviceFee: vendor.serviceFee,
      deliveryFee: vendor.deliveryFee,
      membershipRequired: vendor.membershipRequired || false,
      priceHistory: historicalPrices,
      productId: productId || generateProductId(productName, vendorKey),
      storeLocation: generateStoreLocation(zipCode),
      isCurrentVendor: vendorKey === 'instacart' // Default current vendor
    });
  }

  return priceHistory;
}

// Calculate base price based on product characteristics
function calculateBasePrice(productName) {
  const name = productName.toLowerCase();

  // Price categories based on product type
  if (name.includes('organic') || name.includes('premium')) {
    return 8.99 + (Math.random() * 6); // $8.99-$14.99
  } else if (name.includes('meat') || name.includes('beef') || name.includes('chicken') || name.includes('salmon')) {
    return 12.99 + (Math.random() * 8); // $12.99-$20.99
  } else if (name.includes('produce') || name.includes('fruit') || name.includes('vegetable')) {
    return 3.99 + (Math.random() * 4); // $3.99-$7.99
  } else if (name.includes('dairy') || name.includes('milk') || name.includes('cheese')) {
    return 4.99 + (Math.random() * 3); // $4.99-$7.99
  } else if (name.includes('pantry') || name.includes('bread') || name.includes('pasta')) {
    return 2.99 + (Math.random() * 3); // $2.99-$5.99
  } else {
    return 5.99 + (Math.random() * 4); // Default: $5.99-$9.99
  }
}

// Get vendor-specific price multipliers
function getVendorPriceMultiplier(vendorKey, productName) {
  const multipliers = {
    'costco': 0.85,      // Costco typically 15% cheaper (bulk)
    'walmart': 0.90,     // Walmart typically 10% cheaper
    'target': 1.05,      // Target slightly more expensive
    'safeway': 1.10,     // Safeway moderate premium
    'wholefoods': 1.25,  // Whole Foods premium pricing
    'kroger': 0.95,      // Kroger competitive
    'instacart': 1.15    // Instacart convenience premium
  };

  const baseMultiplier = multipliers[vendorKey] || 1.0;

  // Add some randomness for realistic variation
  const variation = (Math.random() - 0.5) * 0.1; // ±5%

  return Math.max(0.7, baseMultiplier + variation);
}

// Generate historical price data for a vendor
function generateHistoricalPrices(currentPrice, timeRange) {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const history = [];

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Generate realistic price fluctuations
    const dayVariation = (Math.random() - 0.5) * 0.8; // ±$0.40 daily variation
    const trendFactor = Math.sin((i / days) * Math.PI) * 0.5; // Seasonal trend

    const price = Math.max(0.99, currentPrice + dayVariation + trendFactor);

    history.push({
      date: date.toISOString().split('T')[0],
      price: parseFloat(price.toFixed(2)),
      availability: Math.random() > 0.05 ? 'in-stock' : 'out-of-stock'
    });
  }

  return history;
}

// Generate mock product ID
function generateProductId(productName, vendorKey) {
  const hash = productName + vendorKey;
  return hash.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0).toString(36).substr(2, 9).toUpperCase();
}

// Generate mock store location
function generateStoreLocation(zipCode) {
  const locations = [
    { distance: '1.2 miles', address: '123 Main St' },
    { distance: '2.5 miles', address: '456 Oak Ave' },
    { distance: '3.8 miles', address: '789 Pine Rd' },
    { distance: '5.1 miles', address: '321 Elm St' }
  ];

  return locations[Math.floor(Math.random() * locations.length)];
}

// Clear price cache (for admin/testing)
router.delete('/cache', (req, res) => {
  try {
    priceCache.clear();
    console.log('🗑️ Price cache cleared');

    res.json({
      success: true,
      message: 'Price cache cleared successfully'
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

module.exports = router;