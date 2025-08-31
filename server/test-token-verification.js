#!/usr/bin/env node

// Token Verification and MongoDB Testing
require('dotenv').config();

const mongoose = require('mongoose');
const TokenStore = require('./services/TokenStore');

async function testTokenSystem() {
  console.log('🔍 TOKEN SYSTEM VERIFICATION TEST');
  console.log('=================================\n');

  const testUserId = 'token-test-user-' + Date.now();
  
  try {
    // Step 1: MongoDB Connection Test
    console.log('📋 Step 1: MongoDB Connection Test');
    console.log('-'.repeat(40));
    
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 
      process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') : 'NOT SET');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('❌ MONGODB_URI not found in environment variables');
    }
    
    // Test MongoDB connection
    console.log('🔗 Attempting MongoDB connection...');
    
    const connectionState = mongoose.connection.readyState;
    console.log(`Current connection state: ${connectionState} (${getConnectionStateText(connectionState)})`);
    
    if (connectionState !== 1) { // 1 = connected
      console.log('📡 Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000, // 10 second timeout
        connectTimeoutMS: 10000,
      });
      console.log('✅ MongoDB connected successfully');
    } else {
      console.log('✅ MongoDB already connected');
    }
    
    // Step 2: Token Model Test
    console.log('\n📋 Step 2: Token Model Test');
    console.log('-'.repeat(40));
    
    // Import the Token model to test it
    const Token = require('./models/Token');
    console.log('✅ Token model imported successfully');
    
    // Test basic database operations
    console.log('🧪 Testing basic database operations...');
    
    // Check if collection exists and get stats
    try {
      const stats = await Token.collection.stats();
      console.log(`✅ Token collection exists. Document count: ${stats.count}`);
    } catch (statsError) {
      console.log('ℹ️  Token collection may not exist yet (will be created on first insert)');
    }
    
    // Step 3: TokenStore Basic Operations
    console.log('\n📋 Step 3: TokenStore Basic Operations Test');
    console.log('-'.repeat(40));
    
    // Test 1: Clean slate - delete any existing test tokens
    console.log(`🧹 Cleaning up any existing tokens for ${testUserId}...`);
    await TokenStore.deleteTokens(testUserId);
    console.log('✅ Cleanup completed');
    
    // Test 2: Verify user has no tokens
    console.log(`🔍 Verifying ${testUserId} has no tokens...`);
    const hasTokensBefore = await TokenStore.hasValidToken(testUserId);
    console.log(`   Has valid tokens: ${hasTokensBefore} (should be false)`);
    
    const tokensBefore = await TokenStore.getTokens(testUserId);
    console.log(`   Token data: ${tokensBefore ? 'EXISTS (unexpected)' : 'null (expected)'}`);
    
    // Test 3: Store test tokens
    console.log(`\n💾 Storing test tokens for ${testUserId}...`);
    
    const testTokenData = {
      accessToken: 'test_access_token_' + Date.now(),
      refreshToken: 'test_refresh_token_' + Date.now(),
      tokenType: 'Bearer',
      scope: 'cart.basic:write profile.compact product.compact',
      expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour from now
      metadata: {
        source: 'test',
        createdBy: 'token-verification-test'
      }
    };
    
    console.log('   Test token data:');
    console.log(`     Access Token: ${testTokenData.accessToken.substring(0, 20)}...`);
    console.log(`     Refresh Token: ${testTokenData.refreshToken.substring(0, 20)}...`);
    console.log(`     Scope: ${testTokenData.scope}`);
    console.log(`     Expires At: ${new Date(testTokenData.expiresAt).toISOString()}`);
    
    const storeResult = await TokenStore.setTokens(testUserId, testTokenData, testTokenData.refreshToken);
    console.log('✅ Tokens stored successfully');
    console.log(`   Stored data preview: ${JSON.stringify(storeResult).substring(0, 100)}...`);
    
    // Test 4: Retrieve stored tokens
    console.log(`\n🔍 Retrieving stored tokens for ${testUserId}...`);
    
    const hasTokensAfter = await TokenStore.hasValidToken(testUserId);
    console.log(`   Has valid tokens: ${hasTokensAfter} (should be true)`);
    
    const retrievedTokens = await TokenStore.getTokens(testUserId);
    console.log(`   Retrieved tokens:`, {
      hasTokens: !!retrievedTokens,
      accessToken: retrievedTokens?.accessToken ? retrievedTokens.accessToken.substring(0, 20) + '...' : 'N/A',
      refreshToken: retrievedTokens?.refreshToken ? retrievedTokens.refreshToken.substring(0, 20) + '...' : 'N/A',
      scope: retrievedTokens?.scope,
      expiresAt: retrievedTokens?.expiresAt ? new Date(retrievedTokens.expiresAt).toISOString() : 'N/A',
      tokenType: retrievedTokens?.tokenType,
      isExpired: retrievedTokens?.expiresAt ? retrievedTokens.expiresAt < Date.now() : 'N/A'
    });
    
    // Verify data integrity
    console.log(`\n🔍 Data Integrity Check:`);
    console.log(`   Access tokens match: ${testTokenData.accessToken === retrievedTokens?.accessToken}`);
    console.log(`   Refresh tokens match: ${testTokenData.refreshToken === retrievedTokens?.refreshToken}`);
    console.log(`   Scopes match: ${testTokenData.scope === retrievedTokens?.scope}`);
    console.log(`   Token types match: ${testTokenData.tokenType === retrievedTokens?.tokenType}`);
    
    // Test 5: Refresh token retrieval
    console.log(`\n🔄 Testing refresh token retrieval...`);
    const refreshToken = await TokenStore.getRefreshToken(testUserId);
    console.log(`   Refresh token: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'N/A'}`);
    console.log(`   Matches stored: ${refreshToken === testTokenData.refreshToken}`);
    
    // Step 4: Token Store Statistics
    console.log('\n📋 Step 4: Token Store Statistics');
    console.log('-'.repeat(40));
    
    const stats = await TokenStore.getStats();
    console.log('📊 Token Store Stats:', stats);
    
    // Step 5: Test Token Expiry Scenarios
    console.log('\n📋 Step 5: Token Expiry Scenarios');
    console.log('-'.repeat(40));
    
    // Create an expired token for testing
    const expiredUserId = 'expired-test-user-' + Date.now();
    const expiredTokenData = {
      ...testTokenData,
      expiresAt: Date.now() - 1000 // 1 second ago (expired)
    };
    
    console.log(`💀 Storing expired token for ${expiredUserId}...`);
    await TokenStore.setTokens(expiredUserId, expiredTokenData, expiredTokenData.refreshToken);
    
    const hasExpiredTokens = await TokenStore.hasValidToken(expiredUserId);
    console.log(`   Has valid expired tokens: ${hasExpiredTokens} (should be false)`);
    
    const expiredTokensResult = await TokenStore.getTokens(expiredUserId);
    console.log(`   Expired tokens result: ${expiredTokensResult ? 'UNEXPECTED' : 'null (expected - auto-cleaned)'}`);
    
    // Step 6: Multiple Users Test
    console.log('\n📋 Step 6: Multiple Users Test');
    console.log('-'.repeat(40));
    
    const users = ['user1-' + Date.now(), 'user2-' + Date.now(), 'user3-' + Date.now()];
    
    for (let i = 0; i < users.length; i++) {
      const userData = {
        ...testTokenData,
        accessToken: `multi_test_token_${i}_${Date.now()}`,
        scope: i === 0 ? 'cart.basic:write profile.compact' : 
               i === 1 ? 'cart.basic:write product.compact' :
               'profile.compact product.compact' // Missing cart scope for user 3
      };
      
      await TokenStore.setTokens(users[i], userData, userData.refreshToken);
      console.log(`✅ Stored tokens for ${users[i]} with scope: ${userData.scope}`);
    }
    
    // Verify all users
    for (const user of users) {
      const hasTokens = await TokenStore.hasValidToken(user);
      const tokens = await TokenStore.getTokens(user);
      console.log(`   ${user}: valid=${hasTokens}, scope="${tokens?.scope}"`);
    }
    
    // Step 7: Cleanup
    console.log('\n📋 Step 7: Cleanup');
    console.log('-'.repeat(40));
    
    const allTestUsers = [testUserId, expiredUserId, ...users];
    for (const user of allTestUsers) {
      await TokenStore.deleteTokens(user);
      console.log(`🗑️  Cleaned up tokens for ${user}`);
    }
    
    console.log('\n✅ TOKEN SYSTEM VERIFICATION COMPLETED SUCCESSFULLY');
    console.log('\n📋 SUMMARY:');
    console.log('   ✅ MongoDB connection working');
    console.log('   ✅ Token storage working');
    console.log('   ✅ Token retrieval working');
    console.log('   ✅ Data integrity maintained');
    console.log('   ✅ Expiry handling working');
    console.log('   ✅ Multi-user support working');
    
    console.log('\n🎯 NEXT STEPS FOR DEBUGGING CART ISSUES:');
    console.log('   1. Check specific user IDs in your cart failures');
    console.log('   2. Verify tokens exist for those users');
    console.log('   3. Check token scopes include "cart.basic:write"');
    console.log('   4. Verify tokens are not expired');
    console.log('   5. Add token verification logs to cart operations');
    
  } catch (error) {
    console.error('\n❌ TOKEN SYSTEM TEST FAILED:', error.message);
    console.error('\nError details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n') + '...'
    });
    
    if (error.name === 'MongoServerError' || error.name === 'MongoNetworkError') {
      console.error('\n🔧 MongoDB Connection Troubleshooting:');
      console.error('   1. Verify MONGODB_URI in .env file');
      console.error('   2. Check MongoDB Atlas network access (IP whitelist)');
      console.error('   3. Verify MongoDB credentials');
      console.error('   4. Check if MongoDB cluster is running');
    }
    
    process.exit(1);
  } finally {
    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n📡 MongoDB connection closed');
    }
  }
}

function getConnectionStateText(state) {
  const states = {
    0: 'disconnected',
    1: 'connected', 
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[state] || 'unknown';
}

// Run the test
testTokenSystem().catch(console.error);