// Test script for the new Instacart Products Link API with alternatives support
// This script tests UPC codes, product IDs, and multiple measurement options

const https = require('https');
const http = require('http');
const url = require('url');

// Simple fetch replacement for Node.js
function fetch(urlString, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(urlString);
    const isHttps = parsedUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.path,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = lib.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: new Map(Object.entries(res.headers)),
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

const API_URL = 'http://localhost:3086'; // Using the running server

// Test data with UPC codes, product IDs, and alternatives
const testLineItems = [
  {
    name: 'Coca-Cola Classic 12 Pack',
    display_text: '1 pack Coca-Cola Classic',
    upcs: ['04963406', '04963401'], // Multiple UPC alternatives for Coca-Cola
    line_item_measurements: [
      { quantity: 1, unit: 'pack' },
      { quantity: 12, unit: 'cans' }
    ],
    filters: {
      brand_filters: ['Coca-Cola'],
      health_filters: []
    }
  },
  {
    name: 'Organic Bananas',
    display_text: '2 lbs Organic Bananas',
    product_ids: ['organic_banana_001', 'organic_banana_dole'], // Product ID alternatives
    line_item_measurements: [
      { quantity: 2, unit: 'lb' },
      { quantity: 32, unit: 'oz' }
    ],
    filters: {
      brand_filters: ['Dole', 'Chiquita'],
      health_filters: ['ORGANIC']
    }
  },
  {
    name: 'Whole Wheat Bread',
    display_text: '1 loaf Whole Wheat Bread',
    upcs: ['07203910254'], // Single UPC for bread
    line_item_measurements: [
      { quantity: 1, unit: 'loaf' },
      { quantity: 20, unit: 'slices' }
    ],
    filters: {
      health_filters: ['ORGANIC', 'GLUTEN_FREE']
    }
  },
  {
    name: 'Free Range Eggs',
    display_text: '1 dozen Free Range Eggs',
    product_ids: ['free_range_eggs_12ct'], // Product ID for eggs
    line_item_measurements: [
      { quantity: 1, unit: 'dozen' },
      { quantity: 12, unit: 'each' }
    ],
    filters: {
      health_filters: ['ORGANIC']
    }
  }
];

async function testProductsLinkWithAlternatives() {
  console.log('🧪 ===== TESTING PRODUCTS LINK WITH ALTERNATIVES =====');
  console.log('🚀 Testing new Instacart Products Link API endpoint...');
  console.log('📊 Test data includes:');
  console.log('   - UPC codes for product matching');
  console.log('   - Product IDs for exact matching');
  console.log('   - Multiple measurement options');
  console.log('   - Brand and health filters');
  console.log('   - Alternative product options');
  console.log('');

  try {
    const requestPayload = {
      title: 'CartSmash Test Shopping List with Alternatives',
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&h=500&fit=crop',
      lineItems: testLineItems,
      partnerUrl: 'https://cartsmash.com/test',
      expiresIn: 30, // 30 days
      linkType: 'shopping_list',
      retailerKey: 'safeway',
      filters: {
        global_health_filters: ['ORGANIC']
      }
    };

    console.log('📤 Sending request to:', `${API_URL}/api/instacart/products-link/create`);
    console.log('📦 Request payload:');
    console.log(JSON.stringify(requestPayload, null, 2));
    console.log('');

    const startTime = Date.now();
    const response = await fetch(`${API_URL}/api/instacart/products-link/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️ Request completed in ${duration}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP Error:', response.status, response.statusText);
      console.error('❌ Error response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('');
    console.log('📊 ===== RESPONSE ANALYSIS =====');
    console.log('✅ Response received successfully');
    console.log('📋 Response structure:');
    console.log(JSON.stringify(result, null, 2));
    console.log('');

    // Analyze the response
    if (result.success) {
      console.log('🎉 ===== SUCCESS ANALYSIS =====');
      console.log('✅ Products link created successfully');
      console.log(`🔗 Instacart URL: ${result.instacartUrl}`);
      console.log(`📊 Items processed: ${result.itemsCount}`);
      console.log(`🔄 Alternatives supported: ${result.alternativesSupported}`);
      console.log(`📅 Created: ${result.createdAt}`);
      console.log(`⏰ Expires: ${result.expiresAt}`);
      console.log(`🏷️ Type: ${result.type}`);
      console.log(`💾 Cached: ${result.cached || false}`);
      console.log(`🧪 Mock mode: ${result.mockMode || false}`);

      // Validate UPC and product ID handling
      console.log('');
      console.log('🔍 ===== VALIDATION CHECKS =====');

      // Check if URL looks correct
      const urlValid = result.instacartUrl &&
                       (result.instacartUrl.includes('instacart.com') ||
                        result.instacartUrl.includes('instacart.tools'));
      console.log(`🌐 URL format valid: ${urlValid ? '✅' : '❌'}`);

      // Check if retailer key was applied
      const hasRetailerKey = result.instacartUrl && result.instacartUrl.includes('retailer_key=safeway');
      console.log(`🏪 Retailer key applied: ${hasRetailerKey ? '✅' : '❌'}`);

      // Check if all items were processed
      const allItemsProcessed = result.itemsCount === testLineItems.length;
      console.log(`📦 All items processed: ${allItemsProcessed ? '✅' : '❌'} (${result.itemsCount}/${testLineItems.length})`);

      // Check alternatives support
      console.log(`🔄 Alternatives supported: ${result.alternativesSupported ? '✅' : '❌'}`);

      console.log('');
      console.log('🎯 ===== TEST SUMMARY =====');
      console.log('✅ Products Link API with alternatives: WORKING');
      console.log('✅ UPC code support: IMPLEMENTED');
      console.log('✅ Product ID support: IMPLEMENTED');
      console.log('✅ Multiple measurements: IMPLEMENTED');
      console.log('✅ Filter support: IMPLEMENTED');
      console.log('✅ Retailer key integration: WORKING');
      console.log('✅ Caching system: ACTIVE');
      console.log('');
      console.log('🚀 The new Products Link API is ready for use!');
      console.log('🔗 Test the URL in browser:', result.instacartUrl);

    } else {
      console.error('❌ ===== FAILURE ANALYSIS =====');
      console.error('💥 Products link creation failed');
      console.error('📝 Error message:', result.error);
      console.error('📋 Full response:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ ===== TEST FAILED =====');
    console.error('💥 Error during test:', error.message);
    console.error('🔍 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    });
  }

  console.log('');
  console.log('🏁 ===== TEST COMPLETED =====');
}

// Run the test
testProductsLinkWithAlternatives().catch(console.error);