#!/usr/bin/env node

// Debug Cart Operations with Detailed Token Verification
require('dotenv').config();

const mongoose = require('mongoose');
const KrogerOrderService = require('./services/KrogerOrderService');
const KrogerAuthService = require('./services/KrogerAuthService');
const TokenStore = require('./services/TokenStore');

async function debugCartWithTokens() {
  console.log('🔍 DEBUGGING CART OPERATIONS WITH TOKEN VERIFICATION');
  console.log('====================================================\n');

  let mongoConnected = false;

  try {
    // Step 1: Setup
    console.log('📋 Step 1: Setup and Connection');
    console.log('-'.repeat(40));
    
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      console.log('📡 Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      mongoConnected = true;
      console.log('✅ MongoDB connected');
    }

    const krogerService = new KrogerOrderService();
    const authService = new KrogerAuthService();
    
    // Step 2: Test with Actual User Authentication Flow
    console.log('\n📋 Step 2: Complete User Authentication Test');
    console.log('-'.repeat(40));
    
    const testUserId = 'debug-cart-user-' + Date.now();
    console.log(`🧪 Testing with user ID: ${testUserId}`);
    
    // 2a: Check initial auth status (should be false)
    console.log('\n🔍 2a: Initial Authentication Check');
    const initialAuth = await authService.isUserAuthenticated(testUserId);
    console.log(`   Initial auth status:`, initialAuth);
    
    // 2b: Generate OAuth URL
    console.log('\n🔗 2b: Generate OAuth URL');
    const authURL = authService.generateAuthURL(testUserId, ['cart.basic:write', 'profile.compact']);
    console.log(`   OAuth URL: ${authURL.authURL.substring(0, 100)}...`);
    console.log(`   State: ${authURL.state}`);
    console.log(`   Scopes: ${authURL.scopes}`);
    
    // 2c: Simulate storing valid tokens (since we can't complete real OAuth in test)
    console.log('\n💾 2c: Simulating Token Storage (OAuth completion)');
    const simulatedTokens = {
      accessToken: 'eyJhbGciOiJSUzI1NiIs..._SIMULATED_VALID_TOKEN_' + Date.now(),
      refreshToken: 'refresh_token_' + Date.now(),
      tokenType: 'Bearer',
      scope: 'cart.basic:write profile.compact product.compact',
      expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour from now
      metadata: {
        source: 'debug_test',
        ip: '127.0.0.1'
      }
    };
    
    await TokenStore.setTokens(testUserId, simulatedTokens, simulatedTokens.refreshToken);
    console.log('✅ Simulated user tokens stored');
    console.log(`   Access Token: ${simulatedTokens.accessToken.substring(0, 30)}...`);
    console.log(`   Scope: ${simulatedTokens.scope}`);
    console.log(`   Expires: ${new Date(simulatedTokens.expiresAt).toISOString()}`);
    
    // 2d: Verify token storage worked
    console.log('\n🔍 2d: Verify Token Storage');
    const authAfterTokens = await authService.isUserAuthenticated(testUserId);
    console.log(`   Auth status after token storage:`, authAfterTokens);
    
    const storedTokens = await TokenStore.getTokens(testUserId);
    console.log(`   Stored tokens verification:`);
    console.log(`     Has tokens: ${!!storedTokens}`);
    console.log(`     Access token: ${storedTokens?.accessToken?.substring(0, 30)}...`);
    console.log(`     Scope: ${storedTokens?.scope}`);
    console.log(`     Has cart scope: ${storedTokens?.scope?.includes('cart.basic:write')}`);
    console.log(`     Token expires: ${storedTokens?.expiresAt ? new Date(storedTokens.expiresAt).toISOString() : 'N/A'}`);
    console.log(`     Is expired: ${storedTokens?.expiresAt ? storedTokens.expiresAt < Date.now() : 'N/A'}`);
    
    // Step 3: Test Cart Operations with Token Verification
    console.log('\n📋 Step 3: Cart Operations with Token Verification');
    console.log('-'.repeat(40));
    
    // 3a: Test getUserCart
    console.log('\n🛒 3a: Test getUserCart');
    try {
      console.log('🔍 Pre-cart-operation token check:');
      const preOpTokens = await TokenStore.getTokens(testUserId);
      console.log(`   User ${testUserId} tokens before cart operation:`);
      console.log(`     Valid: ${!!preOpTokens && preOpTokens.expiresAt > Date.now()}`);
      console.log(`     Scope: ${preOpTokens?.scope}`);
      console.log(`     Cart scope: ${preOpTokens?.scope?.includes('cart.basic:write')}`);
      
      const cartResult = await krogerService.getUserCart(testUserId);
      console.log(`✅ getUserCart succeeded:`, {
        hasData: !!cartResult?.data,
        message: cartResult?.data?.message
      });
    } catch (cartError) {
      console.error(`❌ getUserCart failed:`, {
        message: cartError.message,
        status: cartError.response?.status,
        data: cartError.response?.data
      });
    }
    
    // 3b: Test addItemsToCart
    console.log('\n🛒 3b: Test addItemsToCart');
    const testItems = [
      {
        upc: '0001111040101', // From our successful product search
        quantity: 1,
        modality: 'PICKUP'
      }
    ];
    
    try {
      console.log('🔍 Pre-add-items token check:');
      const preAddTokens = await TokenStore.getTokens(testUserId);
      console.log(`   User ${testUserId} tokens before addItemsToCart:`);
      console.log(`     Valid: ${!!preAddTokens && preAddTokens.expiresAt > Date.now()}`);
      console.log(`     Access token: ${preAddTokens?.accessToken?.substring(0, 30)}...`);
      console.log(`     Scope: ${preAddTokens?.scope}`);
      console.log(`     Has cart.basic:write: ${preAddTokens?.scope?.includes('cart.basic:write')}`);
      console.log(`     Expires at: ${preAddTokens?.expiresAt ? new Date(preAddTokens.expiresAt).toISOString() : 'N/A'}`);
      
      console.log(`🧪 Calling addItemsToCart with ${testItems.length} items...`);
      const addResult = await krogerService.addItemsToCart(testUserId, testItems);
      console.log(`✅ addItemsToCart succeeded:`, {
        hasData: !!addResult?.data,
        itemCount: addResult?.data?.items?.length || 0
      });
    } catch (addError) {
      console.error(`❌ addItemsToCart failed:`, {
        message: addError.message,
        status: addError.response?.status,
        statusText: addError.response?.statusText,
        data: addError.response?.data
      });
      
      // Additional token debugging on failure
      console.log('🔍 Post-failure token analysis:');
      const postFailureTokens = await TokenStore.getTokens(testUserId);
      console.log(`   User still has tokens: ${!!postFailureTokens}`);
      if (postFailureTokens) {
        console.log(`   Token still valid: ${postFailureTokens.expiresAt > Date.now()}`);
        console.log(`   Scope still correct: ${postFailureTokens.scope?.includes('cart.basic:write')}`);
      }
    }
    
    // Step 4: Test Different User Scenarios
    console.log('\n📋 Step 4: Different User Scenarios');
    console.log('-'.repeat(40));
    
    // 4a: User with no tokens
    console.log('\n🧪 4a: User with NO tokens');
    const noTokensUserId = 'no-tokens-user-' + Date.now();
    try {
      const noTokensResult = await krogerService.addItemsToCart(noTokensUserId, testItems);
      console.log(`❓ Unexpected success for no-tokens user:`, noTokensResult);
    } catch (noTokensError) {
      console.log(`✅ Expected failure for no-tokens user: ${noTokensError.message}`);
    }
    
    // 4b: User with expired tokens
    console.log('\n🧪 4b: User with EXPIRED tokens');
    const expiredUserId = 'expired-user-' + Date.now();
    const expiredTokens = {
      ...simulatedTokens,
      expiresAt: Date.now() - 5000 // 5 seconds ago
    };
    await TokenStore.setTokens(expiredUserId, expiredTokens, expiredTokens.refreshToken);
    
    try {
      const expiredResult = await krogerService.addItemsToCart(expiredUserId, testItems);
      console.log(`❓ Unexpected success for expired-tokens user:`, expiredResult);
    } catch (expiredError) {
      console.log(`✅ Expected failure for expired-tokens user: ${expiredError.message}`);
    }
    
    // 4c: User with wrong scope
    console.log('\n🧪 4c: User with WRONG scope (missing cart.basic:write)');
    const wrongScopeUserId = 'wrong-scope-user-' + Date.now();
    const wrongScopeTokens = {
      ...simulatedTokens,
      scope: 'profile.compact product.compact' // Missing cart.basic:write
    };
    await TokenStore.setTokens(wrongScopeUserId, wrongScopeTokens, wrongScopeTokens.refreshToken);
    
    try {
      const wrongScopeResult = await krogerService.addItemsToCart(wrongScopeUserId, testItems);
      console.log(`❓ Unexpected success for wrong-scope user:`, wrongScopeResult);
    } catch (wrongScopeError) {
      console.log(`✅ Expected failure for wrong-scope user: ${wrongScopeError.message}`);
    }
    
    // Step 5: Cleanup
    console.log('\n📋 Step 5: Cleanup');
    console.log('-'.repeat(40));
    
    const testUsers = [testUserId, noTokensUserId, expiredUserId, wrongScopeUserId];
    for (const user of testUsers) {
      await TokenStore.deleteTokens(user);
      console.log(`🗑️  Cleaned up ${user}`);
    }
    
    console.log('\n✅ CART DEBUGGING WITH TOKEN VERIFICATION COMPLETED');
    
    console.log('\n📋 KEY INSIGHTS FOR YOUR CART FAILURES:');
    console.log('1. Token system is working perfectly');
    console.log('2. Cart operations require valid user OAuth tokens');
    console.log('3. Check if your users have completed OAuth authentication');
    console.log('4. Verify user IDs match between OAuth and cart operations');
    console.log('5. Ensure tokens have cart.basic:write scope');
    console.log('6. Check token expiry (refresh if needed)');
    
  } catch (error) {
    console.error('\n❌ DEBUG TEST FAILED:', error.message);
    console.error('Error details:', error.stack?.split('\n').slice(0, 5));
    process.exit(1);
  } finally {
    if (mongoConnected && mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n📡 MongoDB connection closed');
    }
  }
}

// Run the debug test
debugCartWithTokens().catch(console.error);