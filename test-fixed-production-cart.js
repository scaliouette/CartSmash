#!/usr/bin/env node
// Test the FIXED production cart with Apollo parsing improvements
// Uses the server on port 3070 with the updated parsing logic

const https = require('https');
const http = require('http');

const FIXED_API = 'http://localhost:3070';  // Updated server with Apollo fix
const PRODUCTION_CLIENT = 'http://localhost:3075';

console.log('🧪 FIXED PRODUCTION SHOPPING CART TEST');
console.log('Testing images, data, and pricing with Apollo parsing fix...\n');

// Test data for shopping cart
const testItems = [
  { name: 'cheese tortellini', quantity: '1', unit: 'package' },
  { name: 'organic milk', quantity: '1', unit: 'gallon' },
  { name: 'sourdough bread', quantity: '1', unit: 'loaf' },
  { name: 'grass fed butter', quantity: '2', unit: 'tbsp' }
];

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;

    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'CartSmash-Test/1.0'
      },
      timeout: 30000
    };

    const finalOptions = { ...defaultOptions, ...options };

    const req = client.request(url, finalOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          };
          resolve(result);
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));

    if (finalOptions.body) {
      req.write(finalOptions.body);
    }

    req.end();
  });
}

// Test 1: Check if fixed API is online
async function testFixedAPIHealth() {
  console.log('1️⃣ Testing Fixed API Health...');
  try {
    const response = await makeRequest(`${FIXED_API}/api/debug/status`);
    if (response.status === 200) {
      console.log('✅ Fixed API is ONLINE');
      return true;
    } else {
      console.log(`❌ Fixed API health check failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Fixed API is OFFLINE: ${error.message}`);
    return false;
  }
}

// Test 2: Test batch search with fixed Apollo parsing
async function testFixedBatchSearch() {
  console.log('\n2️⃣ Testing Fixed Batch Search (Updated Apollo Parsing)...');
  try {
    const searchData = {
      items: testItems,
      retailer_key: 'safeway',
      postal_code: '95670'
    };

    const response = await makeRequest(`${FIXED_API}/api/instacart/batch-search`, {
      method: 'POST',
      body: JSON.stringify(searchData)
    });

    if (response.status === 200 && response.body.success) {
      const results = response.body.results || [];
      const itemsWithMatches = results.filter(r => r.matches && r.matches.length > 0).length;

      console.log('✅ Fixed batch search SUCCESSFUL');
      console.log(`   Total items: ${results.length}`);
      console.log(`   Items with matches: ${itemsWithMatches}`);

      // Detailed analysis of real product data
      let hasRealImages = 0, hasRealPricing = 0, hasRealProducts = 0;
      let sourceBreakdown = {};

      results.forEach((result, i) => {
        if (result.matches && result.matches.length > 0) {
          const match = result.matches[0];

          // Count source types
          const source = match.source || 'unknown';
          sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;

          // Check for real images (not placeholder/fallback)
          const hasImage = match.image_url &&
            !match.image_url.includes('placeholder') &&
            !match.image_url.includes('data:image/svg') &&
            match.image_url.startsWith('http');
          if (hasImage) hasRealImages++;

          // Check for real pricing (not $0)
          const hasPrice = match.price && parseFloat(match.price) > 0;
          if (hasPrice) hasRealPricing++;

          // Check for real product names (not generic fallbacks)
          const hasRealProduct = match.name &&
            match.name.length > 10 &&
            !match.name.includes('Generic') &&
            !match.name.includes('mock');
          if (hasRealProduct) hasRealProducts++;

          console.log(`   ${testItems[i]?.name}:`);
          console.log(`     Product: ${match.name}`);
          console.log(`     Price: $${match.price || '0.00'} ${hasPrice ? '✅' : '❌'}`);
          console.log(`     Image: ${hasImage ? 'Real ✅' : 'Fallback ❌'}`);
          console.log(`     Source: ${source}`);
          console.log(`     Confidence: ${match.confidence}`);
        }
      });

      console.log(`\n📊 FIXED RESULTS ANALYSIS:`);
      console.log(`   Real Images: ${hasRealImages}/${itemsWithMatches} ✅`);
      console.log(`   Real Pricing: ${hasRealPricing}/${itemsWithMatches} ✅`);
      console.log(`   Real Products: ${hasRealProducts}/${itemsWithMatches} ✅`);
      console.log(`   Source Breakdown:`, sourceBreakdown);

      return {
        hasImages: hasRealImages > 0,
        hasPricing: hasRealPricing > 0,
        hasRealData: hasRealProducts > 0,
        totalMatches: itemsWithMatches,
        sourceBreakdown
      };
    } else {
      console.log(`❌ Fixed batch search FAILED: ${response.status}`);
      console.log(`   Error: ${response.body?.error || 'Unknown error'})`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Fixed batch search ERROR: ${error.message}`);
    return null;
  }
}

// Test 3: Compare with production API (if accessible)
async function testProductionAPIComparison() {
  console.log('\n3️⃣ Testing Production API Comparison...');
  try {
    const productionResponse = await makeRequest('https://cartsmash-api.onrender.com/api/instacart/batch-search', {
      method: 'POST',
      body: JSON.stringify({
        items: [testItems[0]], // Just test first item
        retailer_key: 'safeway',
        postal_code: '95670'
      })
    });

    if (productionResponse.status === 200) {
      const prodResults = productionResponse.body.results || [];
      const prodMatch = prodResults[0]?.matches?.[0];

      console.log('📊 PRODUCTION VS FIXED COMPARISON:');
      console.log(`   Production API: ${prodMatch ? 'Has results' : 'No results'}`);
      if (prodMatch) {
        console.log(`     Product: ${prodMatch.name}`);
        console.log(`     Price: $${prodMatch.price || '0.00'}`);
        console.log(`     Source: ${prodMatch.source || 'unknown'}`);
      }
    } else {
      console.log(`   Production API: Status ${productionResponse.status}`);
    }
  } catch (error) {
    console.log(`   Production API: ERROR - ${error.message}`);
  }
}

// Main test runner
async function runFixedProductionTests() {
  console.log('Starting fixed production cart tests...');
  const startTime = Date.now();

  const results = {
    fixedApiHealth: false,
    fixedBatchSearch: false,
    imagesWorking: false,
    pricingWorking: false,
    realDataWorking: false
  };

  // Run all tests
  results.fixedApiHealth = await testFixedAPIHealth();

  if (results.fixedApiHealth) {
    const batchResult = await testFixedBatchSearch();
    if (batchResult) {
      results.fixedBatchSearch = true;
      results.imagesWorking = batchResult.hasImages;
      results.pricingWorking = batchResult.hasPricing;
      results.realDataWorking = batchResult.hasRealData;
    }

    await testProductionAPIComparison();
  }

  // Generate final report
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('🎯 FIXED PRODUCTION TEST RESULTS');
  console.log('='.repeat(60));

  console.log(`🔧 Fixed Infrastructure:`);
  console.log(`   Fixed API (Port 3070): ${results.fixedApiHealth ? '✅ ONLINE' : '❌ OFFLINE'}`);

  console.log(`📡 Fixed API Functionality:`);
  console.log(`   Batch Search: ${results.fixedBatchSearch ? '✅ WORKING' : '❌ BROKEN'}`);

  console.log(`🛒 FIXED Shopping Cart Features:`);
  console.log(`   IMAGES: ${results.imagesWorking ? '✅ WORKING' : '❌ STILL BROKEN'}`);
  console.log(`   DATA: ${results.realDataWorking ? '✅ WORKING' : '❌ STILL BROKEN'}`);
  console.log(`   PRICING: ${results.pricingWorking ? '✅ WORKING' : '❌ STILL BROKEN'}`);

  const overallFixed = results.imagesWorking && results.realDataWorking && results.pricingWorking;
  const partiallyFixed = results.imagesWorking || results.realDataWorking || results.pricingWorking;

  if (overallFixed) {
    console.log(`\n🎯 STATUS: ✅ PRODUCTION CART FULLY FIXED!`);
  } else if (partiallyFixed) {
    console.log(`\n🎯 STATUS: 🔄 PRODUCTION CART PARTIALLY FIXED`);
    console.log(`   🚧 Remaining issues need additional fixes`);
  } else {
    console.log(`\n🎯 STATUS: ❌ PRODUCTION CART STILL BROKEN`);
    console.log(`   🚧 Apollo parsing fix didn't resolve core issues`);
  }

  console.log(`⏱️  Test Duration: ${duration}s`);
  console.log('='.repeat(60));

  return results;
}

// Export for use in other scripts
if (require.main === module) {
  runFixedProductionTests().catch(console.error);
}

module.exports = { runFixedProductionTests, makeRequest };