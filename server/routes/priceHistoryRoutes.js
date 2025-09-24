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
  try {
    const { product, timeRange, productId, zipCode = '95670' } = req.query;

    if (!product) {
      return res.status(400).json({
        success: false,
        error: 'Product name is required',
        message: 'Please provide a product name to search for prices'
      });
    }

    console.log(`🔍 Looking up real prices for "${product}" across vendors...`);

    // Start with real vendor data where available
    const priceResults = [];

    // Try Instacart integration first
    try {
      const instacartResults = await fetchInstacartPrices(product, zipCode);
      if (instacartResults && instacartResults.length > 0) {
        priceResults.push(...instacartResults);
      }
    } catch (instacartError) {
      console.log('Instacart price lookup failed:', instacartError.message);
    }

    // Add other vendor integrations here as they become available
    // For now, show what vendors are supported for future integration
    const supportedVendors = Object.keys(VENDOR_CONFIGS);

    if (priceResults.length === 0) {
      // No real price data available yet
      return res.json({
        success: true,
        priceHistory: [],
        message: 'Price comparison across vendors is coming soon! Currently integrating with retail partners.',
        supportedVendors: supportedVendors,
        currentIntegrations: ['instacart'],
        comingSoon: ['kroger', 'safeway', 'target', 'walmart']
      });
    }

    // Sort by price (lowest first)
    priceResults.sort((a, b) => a.price - b.price);

    res.json({
      success: true,
      priceHistory: priceResults,
      count: priceResults.length,
      supportedVendors: supportedVendors,
      searchTerm: product
    });

  } catch (error) {
    console.error('Price history error:', error);
    res.status(500).json({
      error: 'Failed to fetch price history',
      message: error.message
    });
  }
});

// Helper function to fetch real Instacart prices from multiple stores
async function fetchInstacartPrices(productName, zipCode) {
  try {
    console.log(`🥕 Searching Instacart stores for "${productName}" near ${zipCode}`);

    // Step 1: Get all available retailers in the area
    const axios = require('axios');
    const retailersUrl = `${process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com'}/api/instacart/retailers?postalCode=${zipCode}`;

    let retailersResponse;
    try {
      retailersResponse = await axios.get(retailersUrl);
    } catch (error) {
      console.log('Could not fetch retailers, using internal API call');
      // If external call fails, we can't get price comparison data
      return [];
    }

    const retailers = retailersResponse.data.retailers || [];
    console.log(`Found ${retailers.length} retailers near ${zipCode}`);

    if (retailers.length === 0) {
      return [];
    }

    // Step 2: Search for the product in top 5 stores to get price comparison
    const priceResults = [];
    const maxStores = Math.min(5, retailers.length); // Limit to prevent too many API calls

    for (let i = 0; i < maxStores; i++) {
      const retailer = retailers[i];

      try {
        // Search for product in this specific retailer
        const searchUrl = `${process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com'}/api/instacart/search`;
        const searchResponse = await axios.post(searchUrl, {
          query: productName,
          retailerId: retailer.id,
          zipCode: zipCode,
          quantity: 1,
          category: 'each'
        });

        if (searchResponse.data.success && searchResponse.data.products && searchResponse.data.products.length > 0) {
          // Get the best match (first result)
          const product = searchResponse.data.products[0];

          priceResults.push({
            vendor: retailer.name || `Store ${i + 1}`,
            vendorLogo: getVendorLogo(retailer.name),
            price: parseFloat(product.price) || 0,
            productName: product.name || productName,
            productId: product.id || null,
            upc: product.upc || null,
            image: product.image || null,
            inStock: product.availability !== 'out_of_stock',
            lastUpdated: new Date().toISOString(),
            retailerId: retailer.id,
            storeLocation: retailer.location || 'Location not specified',
            deliveryFee: retailer.delivery_fee || 0,
            serviceFee: retailer.service_fee || 0
          });
        }
      } catch (searchError) {
        console.log(`Failed to search ${retailer.name}: ${searchError.message}`);
        // Continue to next retailer
      }
    }

    console.log(`Found prices in ${priceResults.length} stores for "${productName}"`);
    return priceResults;

  } catch (error) {
    console.error('Instacart price fetch error:', error);
    return [];
  }
}

// Helper function to get vendor logo
function getVendorLogo(vendorName) {
  const logoMap = {
    'safeway': '🛒',
    'costco': '🏪',
    'whole foods': '🥬',
    'target': '🎯',
    'walmart': '🛍️',
    'kroger': '🏬',
    'instacart': '🥕',
    'ralphs': '🛒',
    'vons': '🛒',
    'pavilions': '🛒'
  };

  const vendorLower = vendorName.toLowerCase();
  for (const [key, logo] of Object.entries(logoMap)) {
    if (vendorLower.includes(key)) {
      return logo;
    }
  }
  return '🏪'; // Default store icon
}

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
  console.log('🚫 DISABLED: generateVendorPriceData blocked - no mock price data');
  throw new Error('Mock price data generation eliminated');
}

// Calculate base price based on product characteristics
function calculateBasePrice(productName) {
  console.log('🚫 DISABLED: calculateBasePrice blocked - no mock price calculation');
  throw new Error('Mock base price calculation eliminated');
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
  console.log('🚫 DISABLED: generateHistoricalPrices blocked - no mock price history');
  throw new Error('Mock historical price generation eliminated');
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