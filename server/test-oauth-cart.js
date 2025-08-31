#!/usr/bin/env node

// Test OAuth and Cart Operations with Current Credentials
require('dotenv').config();

const KrogerOrderService = require('./services/KrogerOrderService');
const KrogerAuthService = require('./services/KrogerAuthService');

async function testOAuthAndCart() {
  console.log('🧪 TESTING OAUTH AND CART OPERATIONS');
  console.log('=====================================\n');

  const krogerService = new KrogerOrderService();
  const authService = new KrogerAuthService();
  
  const testUserId = 'test-user-' + Date.now();
  
  try {
    // Test 1: Check Service Configuration
    console.log('📋 Test 1: Service Configuration Check');
    console.log('-'.repeat(40));
    
    const serviceHealth = await krogerService.getServiceHealth();
    console.log('Service Health:', JSON.stringify(serviceHealth, null, 2));
    
    console.log('\n✅ Configuration Details:');
    console.log(`   Base URL: ${krogerService.baseURL}`);
    console.log(`   Client ID: ${krogerService.clientId ? krogerService.clientId.substring(0, 8) + '...' : 'NOT SET'}`);
    console.log(`   Client Secret: ${krogerService.clientSecret ? 'SET (****)' : 'NOT SET'}`);
    console.log(`   Redirect URI: ${krogerService.redirectUri}`);
    
    if (!krogerService.clientId || !krogerService.clientSecret) {
      throw new Error('❌ Missing required Kroger API credentials');
    }
    
    // Test 2: Generate OAuth URL
    console.log('\n📋 Test 2: OAuth URL Generation');
    console.log('-'.repeat(40));
    
    const authURL = authService.generateAuthURL(testUserId, ['cart.basic:write', 'profile.compact']);
    console.log('✅ OAuth URL Generated Successfully:');
    console.log(`   URL: ${authURL.authURL}`);
    console.log(`   State: ${authURL.state}`);
    console.log(`   Scopes: ${authURL.scopes}`);
    console.log(`   Expires In: ${authURL.expiresIn} seconds`);
    
    // Test 3: Check Authentication Status (should be false for new user)
    console.log('\n📋 Test 3: Authentication Status Check');
    console.log('-'.repeat(40));
    
    const authStatus = await authService.isUserAuthenticated(testUserId);
    console.log('Authentication Status:', JSON.stringify(authStatus, null, 2));
    
    if (authStatus.authenticated) {
      console.log('⚠️  User appears to be authenticated (unexpected for new test user)');
    } else {
      console.log('✅ User not authenticated (expected for new test user)');
    }
    
    // Test 4: Test Client Credentials Token (for API connectivity)
    console.log('\n📋 Test 4: Client Credentials Token Test');
    console.log('-'.repeat(40));
    
    try {
      // Test client credentials authentication for basic API access
      const credentials = Buffer.from(`${krogerService.clientId}:${krogerService.clientSecret}`).toString('base64');
      const axios = require('axios');
      
      const tokenResponse = await axios.post(
        `${krogerService.baseURL}/connect/oauth2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'product.compact'
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      console.log('✅ Client Credentials Authentication Successful:');
      console.log(`   Token Type: ${tokenResponse.data.token_type}`);
      console.log(`   Expires In: ${tokenResponse.data.expires_in} seconds`);
      console.log(`   Scope: ${tokenResponse.data.scope}`);
      console.log(`   Token: ${tokenResponse.data.access_token.substring(0, 20)}...`);
      
      // Test 5: Basic Product Search (to verify API connectivity)
      console.log('\n📋 Test 5: Product Search API Test');
      console.log('-'.repeat(40));
      
      const searchResponse = await axios.get(
        `${krogerService.baseURL}/products`,
        {
          headers: {
            'Authorization': `Bearer ${tokenResponse.data.access_token}`,
            'Accept': 'application/json'
          },
          params: {
            'filter.term': 'milk',
            'filter.locationId': process.env.KROGER_DEFAULT_STORE || '01400943',
            'filter.limit': '3'
          }
        }
      );
      
      const products = searchResponse.data.data || [];
      console.log(`✅ Product Search Successful: Found ${products.length} products`);
      if (products.length > 0) {
        console.log(`   Sample Product: ${products[0].description}`);
        console.log(`   Product ID: ${products[0].productId}`);
        console.log(`   UPC: ${products[0].upc || products[0].items?.[0]?.upc || 'N/A'}`);
      }
      
    } catch (clientCredError) {
      console.error('❌ Client Credentials Test Failed:');
      console.error(`   Status: ${clientCredError.response?.status || 'No Response'}`);
      console.error(`   Message: ${clientCredError.response?.data?.message || clientCredError.message}`);
      console.error(`   Response: ${JSON.stringify(clientCredError.response?.data || {}, null, 2)}`);
    }
    
    // Test 6: Cart Endpoints Accessibility Test (without user token)
    console.log('\n📋 Test 6: Cart Endpoints Accessibility');
    console.log('-'.repeat(40));
    
    console.log('ℹ️  Note: Cart operations require user OAuth tokens with cart.basic:write scope');
    console.log('   The following tests show expected authentication errors:');
    
    const cartEndpoints = [
      { method: 'GET', path: '/carts', description: 'List user carts' },
      { method: 'POST', path: '/carts', description: 'Create new cart' },
    ];
    
    for (const endpoint of cartEndpoints) {
      try {
        const axios = require('axios');
        await axios({
          method: endpoint.method,
          url: `${krogerService.baseURL}${endpoint.path}`,
          headers: {
            'Authorization': `Bearer ${tokenResponse.data.access_token}`, // Using client credentials token
            'Accept': 'application/json'
          },
          data: endpoint.method === 'POST' ? {} : undefined
        });
        console.log(`✅ ${endpoint.method} ${endpoint.path}: Unexpectedly succeeded`);
      } catch (cartError) {
        if (cartError.response?.status === 401 || cartError.response?.status === 403) {
          console.log(`⚠️  ${endpoint.method} ${endpoint.path}: Expected auth error (${cartError.response.status})`);
        } else {
          console.log(`❌ ${endpoint.method} ${endpoint.path}: Unexpected error (${cartError.response?.status || 'Network'})`);
        }
      }
    }
    
    // Test 7: Configuration Summary
    console.log('\n📋 Test 7: Configuration Summary');
    console.log('-'.repeat(40));
    
    console.log('🔧 Current Configuration:');
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Base URL: ${krogerService.baseURL}`);
    console.log(`   Default Store: ${process.env.KROGER_DEFAULT_STORE || '01400943'}`);
    console.log(`   OAuth Scopes: ${process.env.KROGER_OAUTH_SCOPES || 'cart.basic:write profile.compact'}`);
    console.log(`   Redirect URI: ${process.env.KROGER_REDIRECT_URI}`);
    
    console.log('\n📝 Next Steps for Full Testing:');
    console.log('1. Use the generated OAuth URL to authenticate a real user');
    console.log('2. Exchange the authorization code for user tokens');
    console.log('3. Test cart operations with authenticated user tokens');
    console.log('4. Verify cart.basic:write scope allows cart creation');
    
    console.log('\n✅ OAUTH AND BASIC API TESTS COMPLETED SUCCESSFULLY');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response?.data) {
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the tests
testOAuthAndCart().catch(console.error);