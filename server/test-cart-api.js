#!/usr/bin/env node

// Test Cart API Endpoints with Client Credentials
require('dotenv').config();
const axios = require('axios');

async function testCartAPI() {
  console.log('🧪 TESTING CART API WITH CLIENT CREDENTIALS');
  console.log('=============================================\n');

  const baseURL = process.env.KROGER_BASE_URL || 'https://api.kroger.com/v1';
  const clientId = process.env.KROGER_CLIENT_ID;
  const clientSecret = process.env.KROGER_CLIENT_SECRET;
  
  console.log('🔧 Configuration:');
  console.log(`   Base URL: ${baseURL}`);
  console.log(`   Client ID: ${clientId ? clientId.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`   Client Secret: ${clientSecret ? 'SET (****)' : 'NOT SET'}`);
  
  try {
    // Step 1: Get Client Credentials Token
    console.log('\n📋 Step 1: Client Credentials Authentication');
    console.log('-'.repeat(50));
    
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenResponse = await axios.post(
      `${baseURL}/connect/oauth2/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'product.compact' // Client credentials can only use product scope
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
    console.log(`   Scope: ${tokenResponse.data.scope || 'undefined'}`);
    console.log(`   Token (first 20 chars): ${tokenResponse.data.access_token.substring(0, 20)}...`);
    
    const token = tokenResponse.data.access_token;
    const tokenType = tokenResponse.data.token_type || 'Bearer';
    
    // Step 2: Test Cart Endpoints with Client Credentials
    console.log('\n📋 Step 2: Cart Endpoints Testing');
    console.log('-'.repeat(50));
    
    const cartEndpoints = [
      {
        name: 'GET /carts',
        method: 'GET',
        url: `${baseURL}/carts`,
        description: 'List carts (should show empty or unauthorized)'
      },
      {
        name: 'POST /carts (empty)',
        method: 'POST', 
        url: `${baseURL}/carts`,
        data: {},
        description: 'Create empty cart'
      },
      {
        name: 'POST /carts (with items)',
        method: 'POST',
        url: `${baseURL}/carts`,
        data: {
          items: [{
            upc: "0001111040101", // From our successful product search
            quantity: 1,
            modality: "PICKUP"
          }]
        },
        description: 'Create cart with items'
      }
    ];
    
    const results = [];
    
    for (const endpoint of cartEndpoints) {
      console.log(`\n🧪 Testing: ${endpoint.name}`);
      console.log(`   ${endpoint.description}`);
      
      try {
        const response = await axios({
          method: endpoint.method,
          url: endpoint.url,
          headers: {
            'Authorization': `${tokenType} ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'CartSmash-Test/1.0'
          },
          data: endpoint.data || undefined,
          timeout: 15000
        });
        
        console.log(`   ✅ SUCCESS (${response.status})`);
        console.log(`   Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
        
        results.push({
          endpoint: endpoint.name,
          status: 'SUCCESS',
          statusCode: response.status,
          hasData: !!response.data,
          cartId: response.data?.id || response.data?.data?.id
        });
        
      } catch (error) {
        const status = error.response?.status || 'NETWORK_ERROR';
        const statusText = error.response?.statusText || error.message;
        const errorData = error.response?.data || {};
        
        console.log(`   ❌ FAILED (${status}): ${statusText}`);
        
        if (errorData.errors?.reason) {
          console.log(`   Reason: ${errorData.errors.reason}`);
        }
        if (errorData.message) {
          console.log(`   Message: ${errorData.message}`);
        }
        
        // Log detailed error for scope-related issues
        if (status === 403 && errorData.errors?.reason?.includes('scope')) {
          console.log(`   🎯 SCOPE ISSUE DETECTED:`);
          console.log(`      Error: ${errorData.errors.reason}`);
          console.log(`      Current Token Scope: ${tokenResponse.data.scope || 'undefined'}`);
          console.log(`      Expected: cart.basic:rw (or cart.basic:write for OAuth)`);
        }
        
        results.push({
          endpoint: endpoint.name,
          status: 'FAILED',
          statusCode: status,
          error: statusText,
          errorReason: errorData.errors?.reason,
          scopeIssue: status === 403 && errorData.errors?.reason?.includes('scope')
        });
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Step 3: Try OAuth-style scope
    console.log('\n📋 Step 3: Testing with cart.basic:write scope');
    console.log('-'.repeat(50));
    
    try {
      const oauthTokenResponse = await axios.post(
        `${baseURL}/connect/oauth2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'cart.basic:write product.compact' // OAuth scope
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      console.log('✅ cart.basic:write Token Obtained:');
      console.log(`   Scope: ${oauthTokenResponse.data.scope || 'undefined'}`);
      
      const oauthToken = oauthTokenResponse.data.access_token;
      
      // Test cart creation with OAuth-style scope
      try {
        const cartResponse = await axios.post(
          `${baseURL}/carts`,
          { items: [{ upc: "0001111040101", quantity: 1, modality: "PICKUP" }] },
          {
            headers: {
              'Authorization': `Bearer ${oauthToken}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('✅ Cart creation with cart.basic:write SUCCESSFUL!');
        console.log(`   Cart ID: ${cartResponse.data?.id || cartResponse.data?.data?.id || 'N/A'}`);
        
      } catch (oauthCartError) {
        console.log(`❌ Cart creation with cart.basic:write failed: ${oauthCartError.response?.status}`);
        if (oauthCartError.response?.data?.errors?.reason) {
          console.log(`   Reason: ${oauthCartError.response.data.errors.reason}`);
        }
      }
      
    } catch (oauthScopeError) {
      console.log(`❌ Failed to get cart.basic:write token: ${oauthScopeError.response?.status}`);
    }
    
    // Step 4: Analysis and Summary
    console.log('\n📊 ANALYSIS AND SUMMARY');
    console.log('='.repeat(50));
    
    const successfulEndpoints = results.filter(r => r.status === 'SUCCESS');
    const failedEndpoints = results.filter(r => r.status === 'FAILED');
    const scopeIssues = results.filter(r => r.scopeIssue);
    
    console.log(`\n✅ Successful Endpoints: ${successfulEndpoints.length}`);
    successfulEndpoints.forEach(r => {
      console.log(`   - ${r.endpoint}: ${r.statusCode}${r.cartId ? ` (Cart ID: ${r.cartId})` : ''}`);
    });
    
    console.log(`\n❌ Failed Endpoints: ${failedEndpoints.length}`);
    const errorGroups = {};
    failedEndpoints.forEach(r => {
      const key = r.statusCode;
      if (!errorGroups[key]) errorGroups[key] = [];
      errorGroups[key].push(r.endpoint);
    });
    
    Object.entries(errorGroups).forEach(([status, endpoints]) => {
      console.log(`   ${status}: ${endpoints.join(', ')}`);
    });
    
    if (scopeIssues.length > 0) {
      console.log(`\n🎯 Scope Issues Detected: ${scopeIssues.length}`);
      scopeIssues.forEach(r => {
        console.log(`   - ${r.endpoint}: ${r.errorReason}`);
      });
    }
    
    console.log('\n💡 KEY FINDINGS:');
    if (successfulEndpoints.length > 0) {
      console.log('   ✅ Basic API connectivity is working');
      console.log('   ✅ Client credentials authentication successful');
      console.log('   ✅ At least some cart endpoints are accessible');
    } else {
      console.log('   ⚠️  No cart endpoints successfully accessible');
      if (scopeIssues.length > 0) {
        console.log('   🎯 Scope issues detected - may need different scope or OAuth flow');
      }
    }
    
    console.log('\n🔗 Next Steps:');
    console.log('1. If scope issues persist, verify OAuth flow with real user authentication');
    console.log('2. Test with actual user tokens from OAuth callback');
    console.log('3. Consider that cart operations may require user context, not just API credentials');
    
    console.log('\n✅ CART API TESTING COMPLETED');
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the test
testCartAPI().catch(console.error);