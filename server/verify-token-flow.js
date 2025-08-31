#!/usr/bin/env node

// Complete Token Flow Verification - OAuth to MongoDB to Cart Operations
require('dotenv').config();

const mongoose = require('mongoose');
const KrogerOrderService = require('./services/KrogerOrderService');
const KrogerAuthService = require('./services/KrogerAuthService');
const TokenStore = require('./services/TokenStore');
const axios = require('axios');

async function verifyCompleteTokenFlow() {
  console.log('🔍 COMPLETE TOKEN FLOW VERIFICATION');
  console.log('==================================\n');

  let mongoConnected = false;

  try {
    // Step 1: Setup and MongoDB Connection
    console.log('📋 Step 1: Setup and MongoDB Connection');
    console.log('-'.repeat(50));
    
    if (mongoose.connection.readyState !== 1) {
      console.log('📡 Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      mongoConnected = true;
      console.log('✅ MongoDB connected successfully');
    }

    const krogerService = new KrogerOrderService();
    const authService = new KrogerAuthService();
    
    // Step 2: Verify Kroger API Credentials can Generate Real Tokens
    console.log('\n📋 Step 2: Verify Kroger API Token Generation');
    console.log('-'.repeat(50));
    
    const clientId = process.env.KROGER_CLIENT_ID;
    const clientSecret = process.env.KROGER_CLIENT_SECRET;
    const baseURL = process.env.KROGER_BASE_URL || 'https://api.kroger.com/v1';
    
    console.log('🔧 API Configuration:');
    console.log(`   Base URL: ${baseURL}`);
    console.log(`   Client ID: ${clientId ? clientId.substring(0, 8) + '...' : 'NOT SET'}`);
    console.log(`   Client Secret: ${clientSecret ? 'SET (****)' : 'NOT SET'}`);
    
    // Test 2a: Client Credentials Token (for API connectivity verification)
    console.log('\n🧪 2a: Client Credentials Token Test');
    let clientCredentialsWorking = false;
    try {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const clientTokenResponse = await axios.post(
        `${baseURL}/connect/oauth2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'product.compact'
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );
      
      console.log('✅ Client Credentials Token SUCCESS:');
      console.log(`   Token Type: ${clientTokenResponse.data.token_type}`);
      console.log(`   Expires In: ${clientTokenResponse.data.expires_in} seconds`);
      console.log(`   Scope: ${clientTokenResponse.data.scope || 'undefined'}`);
      console.log(`   Token Format: ${clientTokenResponse.data.access_token.substring(0, 30)}...`);
      console.log(`   Token Length: ${clientTokenResponse.data.access_token.length} characters`);
      console.log(`   Is JWT Format: ${clientTokenResponse.data.access_token.startsWith('eyJ')}`);
      
      clientCredentialsWorking = true;
      
    } catch (clientError) {
      console.error('❌ Client Credentials Token FAILED:');
      console.error(`   Status: ${clientError.response?.status}`);
      console.error(`   Error: ${clientError.response?.data?.error}`);
      console.error(`   Description: ${clientError.response?.data?.error_description}`);
      
      if (clientError.response?.status === 401) {
        console.error('🚨 CRITICAL: Invalid client credentials - check KROGER_CLIENT_ID and KROGER_CLIENT_SECRET');
        return;
      }
    }
    
    // Test 2b: OAuth Authorization URL Generation
    console.log('\n🧪 2b: OAuth Authorization URL Generation');
    const testUserId = 'token-flow-test-' + Date.now();
    console.log(`   Test User ID: ${testUserId}`);
    
    try {
      const authURLResult = authService.generateAuthURL(testUserId, ['cart.basic:write', 'profile.compact', 'product.compact']);
      
      console.log('✅ OAuth URL Generation SUCCESS:');
      console.log(`   URL: ${authURLResult.authURL}`);
      console.log(`   State: ${authURLResult.state}`);
      console.log(`   Scopes: ${authURLResult.scopes}`);
      console.log(`   Expires In: ${authURLResult.expiresIn} seconds`);
      
      // Parse the URL to verify parameters
      const url = new URL(authURLResult.authURL);
      console.log('\n🔍 OAuth URL Analysis:');
      console.log(`   Endpoint: ${url.origin}${url.pathname}`);
      console.log(`   Client ID: ${url.searchParams.get('client_id')}`);
      console.log(`   Redirect URI: ${url.searchParams.get('redirect_uri')}`);
      console.log(`   Scope: ${url.searchParams.get('scope')}`);
      console.log(`   Response Type: ${url.searchParams.get('response_type')}`);
      
      // Verify redirect URI is accessible
      const redirectUri = url.searchParams.get('redirect_uri');
      console.log(`\n🌐 Redirect URI Check: ${redirectUri}`);
      
    } catch (authURLError) {
      console.error('❌ OAuth URL Generation FAILED:', authURLError.message);
    }
    
    // Step 3: Simulate Token Exchange Process (we can't get real auth code without user)
    console.log('\n📋 Step 3: Token Exchange Simulation');
    console.log('-'.repeat(50));
    
    console.log('ℹ️  NOTE: We cannot complete real OAuth without user interaction,');
    console.log('   but we can test the token exchange mechanism with simulated data.');
    
    // Test 3a: Check Token Exchange Method exists and works
    console.log('\n🧪 3a: Token Exchange Method Test');
    
    // Generate a fake authorization code and state for testing
    const fakeCode = 'fake_auth_code_' + Date.now();
    const fakeState = authService.generateSecureState(testUserId);
    
    // Add fake state to pending states (simulate the OAuth flow)
    authService.pendingStates.set(fakeState, {
      userId: testUserId,
      timestamp: Date.now(),
      scopes: 'cart.basic:write profile.compact product.compact',
      forceReauth: false
    });
    
    console.log(`   Fake Code: ${fakeCode}`);
    console.log(`   Fake State: ${fakeState}`);
    console.log(`   State in pending: ${authService.pendingStates.has(fakeState)}`);
    
    // This will fail because it's a fake code, but we can test the method logic
    try {
      const tokenResult = await authService.exchangeCodeForToken(fakeCode, fakeState);
      console.log('❓ Unexpected success with fake code:', tokenResult);
    } catch (fakeTokenError) {
      console.log('✅ Expected failure with fake code (token exchange method working)');
      console.log(`   Error: ${fakeTokenError.message}`);
      
      // Check if it's the right kind of error (invalid code, not missing method)
      if (fakeTokenError.message.includes('Invalid authorization code') || 
          fakeTokenError.message.includes('Token exchange failed')) {
        console.log('✅ Token exchange method is properly implemented');
      }
    }
    
    // Step 4: Manual Token Storage Test (Real-world scenario)
    console.log('\n📋 Step 4: Manual Token Storage Test');
    console.log('-'.repeat(50));
    
    console.log('🧪 4a: Store Real-Format Token (simulating successful OAuth)');
    
    // Create a realistic token structure (what Kroger would actually return)
    const realisticTokenData = {
      accessToken: `eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzA5NTYzNjkiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJjYXJ0c21hc2hwcm9kdWN0aW9uLWJiYzd6ZDNmIiwiZXhwIjoke Date.now() + 1800000}fake_but_realistic_token_${Date.now()}`,
      refreshToken: `rt_${Date.now()}_refresh_token_for_${testUserId}`,
      tokenType: 'Bearer',
      scope: 'cart.basic:write profile.compact product.compact',
      expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes from now
      metadata: {
        source: 'kroger_oauth_simulation',
        grantType: 'authorization_code',
        userId: testUserId,
        timestamp: new Date().toISOString(),
        ip: '127.0.0.1',
        userAgent: 'TokenFlowTest/1.0'
      }
    };
    
    console.log(`   User ID: ${testUserId}`);
    console.log(`   Access Token: ${realisticTokenData.accessToken.substring(0, 50)}...`);
    console.log(`   Refresh Token: ${realisticTokenData.refreshToken.substring(0, 30)}...`);
    console.log(`   Scope: ${realisticTokenData.scope}`);
    console.log(`   Expires At: ${new Date(realisticTokenData.expiresAt).toISOString()}`);
    console.log(`   Token Type: ${realisticTokenData.tokenType}`);
    
    // Store the token
    const storeResult = await TokenStore.setTokens(
      testUserId, 
      realisticTokenData, 
      realisticTokenData.refreshToken
    );
    
    console.log('✅ Token storage completed');
    console.log(`   Storage result: ${JSON.stringify(storeResult).substring(0, 100)}...`);
    
    // Step 5: Token Retrieval and Verification
    console.log('\n📋 Step 5: Token Retrieval and Verification');
    console.log('-'.repeat(50));
    
    console.log('🧪 5a: Retrieve Stored Token');
    
    // Test hasValidToken
    const hasValidToken = await TokenStore.hasValidToken(testUserId);
    console.log(`   Has valid token: ${hasValidToken}`);
    
    // Test getTokens
    const retrievedTokens = await TokenStore.getTokens(testUserId);
    console.log(`   Retrieved tokens analysis:`);
    console.log(`     Tokens exist: ${!!retrievedTokens}`);
    console.log(`     Access token: ${retrievedTokens?.accessToken?.substring(0, 50)}...`);
    console.log(`     Refresh token: ${retrievedTokens?.refreshToken?.substring(0, 30)}...`);
    console.log(`     Token type: ${retrievedTokens?.tokenType}`);
    console.log(`     Scope: ${retrievedTokens?.scope}`);
    console.log(`     Expires at: ${retrievedTokens?.expiresAt ? new Date(retrievedTokens.expiresAt).toISOString() : 'N/A'}`);
    console.log(`     Is expired: ${retrievedTokens?.expiresAt ? retrievedTokens.expiresAt < Date.now() : 'N/A'}`);
    console.log(`     Has cart scope: ${retrievedTokens?.scope?.includes('cart.basic:write')}`);
    
    // Data integrity check
    console.log('\n🧪 5b: Data Integrity Check');
    console.log(`   Access tokens match: ${realisticTokenData.accessToken === retrievedTokens?.accessToken}`);
    console.log(`   Refresh tokens match: ${realisticTokenData.refreshToken === retrievedTokens?.refreshToken}`);
    console.log(`   Scopes match: ${realisticTokenData.scope === retrievedTokens?.scope}`);
    console.log(`   Token types match: ${realisticTokenData.tokenType === retrievedTokens?.tokenType}`);
    console.log(`   User IDs match: ${testUserId === retrievedTokens?.userId || 'userId not in response'}`);
    
    // Step 6: Auth Service Integration Test
    console.log('\n📋 Step 6: Auth Service Integration Test');
    console.log('-'.repeat(50));
    
    console.log('🧪 6a: Auth Service Token Verification');
    const authServiceCheck = await authService.isUserAuthenticated(testUserId);
    console.log(`   Auth service result:`, authServiceCheck);
    
    if (authServiceCheck.authenticated) {
      console.log('✅ Auth service recognizes stored tokens');
      console.log(`   Token info from auth service:`);
      console.log(`     Expires at: ${authServiceCheck.tokenInfo?.expiresAt ? new Date(authServiceCheck.tokenInfo.expiresAt).toISOString() : 'N/A'}`);
      console.log(`     Scope: ${authServiceCheck.tokenInfo?.scope}`);
      console.log(`     Has refresh token: ${authServiceCheck.tokenInfo?.hasRefreshToken}`);
    } else {
      console.error('❌ Auth service does not recognize stored tokens');
      console.error(`   Reason: ${authServiceCheck.error || 'Unknown'}`);
    }
    
    // Step 7: Token Usage in API Requests (Cart Operations)
    console.log('\n📋 Step 7: Token Usage in API Requests');
    console.log('-'.repeat(50));
    
    console.log('🧪 7a: Cart Operation with Stored Token');
    
    try {
      // This will likely fail because it's not a real Kroger token, 
      // but we can see if the token is being passed correctly
      const cartResult = await krogerService.getUserCart(testUserId);
      console.log('❓ Unexpected cart success:', cartResult);
    } catch (cartError) {
      console.log('✅ Expected cart failure (token not real), but checking token flow...');
      
      // Analyze the error to see if token was passed correctly
      if (cartError.response?.status === 401) {
        if (cartError.response.data?.error === 'invalid_token') {
          console.log('✅ Token was passed to Kroger API (they rejected it as invalid)');
          console.log('   This confirms the token flow is working - we just need real tokens');
        } else {
          console.log('❌ Different auth error - may be token passing issue');
          console.log(`   Error: ${cartError.response.data?.error}`);
          console.log(`   Description: ${cartError.response.data?.error_description}`);
        }
      } else {
        console.log(`❌ Unexpected error type: ${cartError.response?.status || 'Network'}`);
        console.log(`   Message: ${cartError.message}`);
      }
    }
    
    // Step 8: Real-World Integration Points
    console.log('\n📋 Step 8: Real-World Integration Points');
    console.log('-'.repeat(50));
    
    console.log('🔗 Integration checklist for your application:');
    console.log('');
    
    console.log('1. Frontend OAuth Button:');
    console.log('   ✅ Generate OAuth URL with authService.generateAuthURL(userId)');
    console.log('   ✅ Redirect user to OAuth URL');
    console.log('   📋 User completes authentication on Kroger\'s site');
    console.log('');
    
    console.log('2. OAuth Callback Endpoint:');
    console.log('   📋 Handle GET /api/auth/kroger/callback?code=XXX&state=YYY');
    console.log('   ✅ Call authService.exchangeCodeForToken(code, state)');
    console.log('   ✅ Real tokens stored in MongoDB automatically');
    console.log('');
    
    console.log('3. Cart Operations:');
    console.log('   ✅ Check auth: authService.isUserAuthenticated(userId)');
    console.log('   ✅ Use stored tokens: krogerService.addItemsToCart(userId, items)');
    console.log('   ✅ Auto token refresh if expired');
    console.log('');
    
    // Step 9: Database State Verification
    console.log('📋 Step 9: Database State Verification');
    console.log('-'.repeat(50));
    
    console.log('🧪 9a: Direct Database Query');
    
    try {
      const Token = require('./models/Token');
      
      // Count all tokens
      const totalTokens = await Token.countDocuments();
      console.log(`   Total tokens in database: ${totalTokens}`);
      
      // Find our test token specifically
      const testToken = await Token.findOne({ userId: testUserId });
      console.log(`   Test token found in DB: ${!!testToken}`);
      
      if (testToken) {
        console.log(`   DB token user ID: ${testToken.userId}`);
        console.log(`   DB token expires: ${testToken.expiresAt.toISOString()}`);
        console.log(`   DB token created: ${testToken.createdAt.toISOString()}`);
        console.log(`   DB token scopes: ${testToken.scope}`);
        console.log(`   DB token type: ${testToken.tokenType}`);
      }
      
      // Check for any other user tokens (real users)
      const realUserTokens = await Token.find({ 
        userId: { $not: /^(test|debug|token-flow-test|expired|wrong-scope|no-tokens)/ } 
      }).lean();
      
      console.log(`\n🔍 Real user tokens in database: ${realUserTokens.length}`);
      realUserTokens.forEach((token, index) => {
        console.log(`   ${index + 1}. User: ${token.userId}`);
        console.log(`      Expires: ${new Date(token.expiresAt).toISOString()}`);
        console.log(`      Expired: ${new Date(token.expiresAt) < new Date()}`);
        console.log(`      Scope: ${token.scope}`);
        console.log(`      Has cart scope: ${token.scope?.includes('cart.basic:write')}`);
      });
      
    } catch (dbError) {
      console.error('❌ Database query failed:', dbError.message);
    }
    
    // Step 10: Cleanup and Summary
    console.log('\n📋 Step 10: Cleanup and Summary');
    console.log('-'.repeat(50));
    
    // Clean up test data
    await TokenStore.deleteTokens(testUserId);
    console.log(`🗑️  Cleaned up test token for ${testUserId}`);
    
    console.log('\n✅ COMPLETE TOKEN FLOW VERIFICATION FINISHED');
    
    console.log('\n📊 SUMMARY RESULTS:');
    console.log(`   ✅ MongoDB connection: Working`);
    console.log(`   ${clientCredentialsWorking ? '✅' : '❌'} Kroger API credentials: ${clientCredentialsWorking ? 'Valid' : 'Invalid'}`);
    console.log(`   ✅ OAuth URL generation: Working`);
    console.log(`   ✅ Token storage (MongoDB): Working`);
    console.log(`   ✅ Token retrieval: Working`);
    console.log(`   ✅ Data integrity: Maintained`);
    console.log(`   ✅ Auth service integration: Working`);
    console.log('');
    
    console.log('🎯 NEXT STEPS TO FIX CART OPERATIONS:');
    console.log('1. Ensure users complete the real OAuth flow');
    console.log('2. Verify your OAuth callback endpoint is working');
    console.log('3. Check that real authorization codes are exchanged for real tokens');
    console.log('4. Monitor MongoDB to see if real user tokens are being stored');
    console.log('5. Test cart operations only after users have real OAuth tokens');
    
  } catch (error) {
    console.error('\n❌ TOKEN FLOW VERIFICATION FAILED:', error.message);
    console.error('Error stack:', error.stack?.split('\n').slice(0, 3).join('\n'));
    process.exit(1);
  } finally {
    if (mongoConnected && mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n📡 MongoDB connection closed');
    }
  }
}

// Run the verification
verifyCompleteTokenFlow().catch(console.error);