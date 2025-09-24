#!/usr/bin/env node
// Production Shopping Cart Functionality Test
// Tests images, data, and pricing in production shopping cart

const https = require('https');
const http = require('http');

const PRODUCTION_API = 'https://cartsmash-api.onrender.com';
const LOCAL_CLIENT = 'http://localhost:3075';

console.log('🧪 PRODUCTION SHOPPING CART TEST SUITE');
console.log('Testing images, data, and pricing functionality...\n');

// Test data for shopping cart
const testItems = [
  { name: 'eggs', quantity: '1', unit: 'dozen' },
  { name: 'milk', quantity: '1', unit: 'gallon' },
  { name: 'bread', quantity: '1', unit: 'loaf' },
  { name: 'butter', quantity: '2', unit: 'tbsp' }
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

// Test 1: Check if production API is online
async function testProductionAPIHealth() {
  console.log('1️⃣ Testing Production API Health...');
  try {
    const response = await makeRequest(`${PRODUCTION_API}/api/debug/status`);
    if (response.status === 200) {
      console.log('✅ Production API is ONLINE');
      return true;
    } else {
      console.log(`❌ Production API health check failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Production API is OFFLINE: ${error.message}`);
    return false;
  }
}

// Test 2: Test recipe creation (foundation for product data)
async function testRecipeCreation() {
  console.log('\n2️⃣ Testing Recipe Creation...');
  try {
    const recipeData = {
      title: 'Production Cart Test',
      instructions: ['Shopping cart functionality test'],
      ingredients: testItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit
      }))
    };

    const response = await makeRequest(`${PRODUCTION_API}/api/instacart/recipe/create`, {
      method: 'POST',
      body: JSON.stringify(recipeData)
    });

    if (response.status === 200 && response.body.success) {
      console.log('✅ Recipe creation SUCCESSFUL');
      console.log(`   Recipe ID: ${response.body.recipeId}`);
      console.log(`   Recipe URL: ${response.body.instacartUrl}`);
      return response.body;
    } else {
      console.log(`❌ Recipe creation FAILED: ${response.status}`);
      console.log(`   Error: ${response.body?.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Recipe creation ERROR: ${error.message}`);
    return null;
  }
}

// Test 3: Test batch search for product enrichment
async function testBatchSearch() {
  console.log('\n3️⃣ Testing Batch Search (Product Enrichment)...');
  try {
    const searchData = {
      items: testItems,
      retailer_key: 'safeway',
      postal_code: '95670'
    };

    const response = await makeRequest(`${PRODUCTION_API}/api/instacart/batch-search`, {
      method: 'POST',
      body: JSON.stringify(searchData)
    });

    if (response.status === 200 && response.body.success) {
      const results = response.body.results || [];
      const itemsWithMatches = results.filter(r => r.matches && r.matches.length > 0).length;

      console.log('✅ Batch search SUCCESSFUL');
      console.log(`   Total items: ${results.length}`);
      console.log(`   Items with matches: ${itemsWithMatches}`);

      // Check for real product data
      let hasImages = 0, hasPricing = 0;
      results.forEach((result, i) => {
        if (result.matches && result.matches.length > 0) {
          const match = result.matches[0];
          if (match.image || match.image_url || match.imageUrl) hasImages++;
          if (match.price && match.price > 0) hasPricing++;
          console.log(`   ${testItems[i]?.name}: ${match.name || 'No name'}, Price: $${match.price || '0.00'}, Image: ${!!match.image ? 'Yes' : 'No'}`);
        }
      });

      console.log(`   Items with images: ${hasImages}`);
      console.log(`   Items with pricing: ${hasPricing}`);

      return { hasImages, hasPricing, totalMatches: itemsWithMatches };
    } else {
      console.log(`❌ Batch search FAILED: ${response.status}`);
      console.log(`   Error: ${response.body?.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Batch search ERROR: ${error.message}`);
    return null;
  }
}

// Test 4: Test individual product search
async function testProductSearch() {
  console.log('\n4️⃣ Testing Individual Product Search...');
  try {
    const searchData = {
      query: 'organic eggs',
      retailerId: 'safeway'
    };

    const response = await makeRequest(`${PRODUCTION_API}/api/instacart/search`, {
      method: 'POST',
      body: JSON.stringify(searchData)
    });

    if (response.status === 200 && response.body.success) {
      const products = response.body.products || [];
      console.log('✅ Product search SUCCESSFUL');
      console.log(`   Products found: ${products.length}`);

      if (products.length > 0) {
        const product = products[0];
        console.log(`   Sample product: ${product.name || product.productName}`);
        console.log(`   Price: $${product.price || '0.00'}`);
        console.log(`   Has image: ${!!(product.image || product.image_url || product.imageUrl)}`);
        console.log(`   Source: ${product.source || 'unknown'}`);

        return {
          hasProducts: products.length > 0,
          hasImage: !!(product.image || product.image_url || product.imageUrl),
          hasPrice: !!(product.price && product.price > 0)
        };
      }

      return { hasProducts: false };
    } else {
      console.log(`❌ Product search FAILED: ${response.status}`);
      console.log(`   Error: ${response.body?.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Product search ERROR: ${error.message}`);
    return null;
  }
}

// Test 5: Test client health (production frontend)
async function testClientHealth() {
  console.log('\n5️⃣ Testing Production Client Health...');
  try {
    const response = await makeRequest(LOCAL_CLIENT);
    if (response.status === 200) {
      console.log('✅ Production client is ACCESSIBLE');
      return true;
    } else {
      console.log(`❌ Production client health check failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Production client is INACCESSIBLE: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runProductionTests() {
  console.log('Starting comprehensive production tests...');
  const startTime = Date.now();

  const results = {
    apiHealth: false,
    recipeCreation: false,
    batchSearch: false,
    productSearch: false,
    clientHealth: false,
    imagesWorking: false,
    pricingWorking: false,
    dataWorking: false
  };

  // Run all tests
  results.apiHealth = await testProductionAPIHealth();

  if (results.apiHealth) {
    const recipeResult = await testRecipeCreation();
    results.recipeCreation = !!recipeResult;

    const batchResult = await testBatchSearch();
    if (batchResult) {
      results.batchSearch = true;
      results.imagesWorking = batchResult.hasImages > 0;
      results.pricingWorking = batchResult.hasPricing > 0;
      results.dataWorking = batchResult.totalMatches > 0;
    }

    const searchResult = await testProductSearch();
    if (searchResult) {
      results.productSearch = searchResult.hasProducts;
      if (!results.imagesWorking) results.imagesWorking = searchResult.hasImage;
      if (!results.pricingWorking) results.pricingWorking = searchResult.hasPrice;
      if (!results.dataWorking) results.dataWorking = searchResult.hasProducts;
    }
  }

  results.clientHealth = await testClientHealth();

  // Generate final report
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('🎯 FINAL PRODUCTION TEST RESULTS');
  console.log('='.repeat(60));

  console.log(`🔧 Infrastructure:`);
  console.log(`   Production API: ${results.apiHealth ? '✅ ONLINE' : '❌ OFFLINE'}`);
  console.log(`   Production Client: ${results.clientHealth ? '✅ ACCESSIBLE' : '❌ INACCESSIBLE'}`);

  console.log(`📡 API Functionality:`);
  console.log(`   Recipe Creation: ${results.recipeCreation ? '✅ WORKING' : '❌ BROKEN'}`);
  console.log(`   Batch Search: ${results.batchSearch ? '✅ WORKING' : '❌ BROKEN'}`);
  console.log(`   Product Search: ${results.productSearch ? '✅ WORKING' : '❌ BROKEN'}`);

  console.log(`🛒 Shopping Cart Features:`);
  console.log(`   IMAGES: ${results.imagesWorking ? '✅ WORKING' : '❌ BROKEN'}`);
  console.log(`   DATA: ${results.dataWorking ? '✅ WORKING' : '❌ BROKEN'}`);
  console.log(`   PRICING: ${results.pricingWorking ? '✅ WORKING' : '❌ BROKEN'}`);

  const overallHealth = results.imagesWorking && results.dataWorking && results.pricingWorking;
  console.log(`\n🎯 OVERALL STATUS: ${overallHealth ? '✅ PRODUCTION READY' : '❌ NEEDS FIXES'}`);
  console.log(`⏱️  Test Duration: ${duration}s`);

  console.log('='.repeat(60));

  return results;
}

// Export for use in other scripts
if (require.main === module) {
  runProductionTests().catch(console.error);
}

module.exports = { runProductionTests, makeRequest };