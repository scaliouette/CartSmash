#!/usr/bin/env node

// Check for Real User Tokens and OAuth Flow Issues
require('dotenv').config();

const mongoose = require('mongoose');
const TokenStore = require('./services/TokenStore');
const KrogerAuthService = require('./services/KrogerAuthService');
const axios = require('axios');

async function checkRealUsers() {
  console.log('🔍 CHECKING FOR REAL USERS AND OAUTH FLOW ISSUES');
  console.log('=================================================\n');

  let mongoConnected = false;

  try {
    // Step 1: Connect to Database
    if (mongoose.connection.readyState !== 1) {
      console.log('📡 Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      mongoConnected = true;
      console.log('✅ MongoDB connected successfully');
    }

    const authService = new KrogerAuthService();
    const Token = require('./models/Token');
    
    // Step 2: Query Database for All Tokens
    console.log('📋 Step 2: Database Token Analysis');
    console.log('-'.repeat(50));
    
    const allTokens = await Token.find({}).lean();
    console.log(`📊 Total tokens in database: ${allTokens.length}`);
    
    if (allTokens.length === 0) {
      console.log('❌ NO TOKENS FOUND IN DATABASE');
      console.log('   This confirms users have never completed OAuth authentication');
      console.log('\n🎯 ROOT CAUSE: Users are not completing the OAuth flow');
    } else {
      console.log('\n🔍 Token Analysis:');
      
      // Categorize tokens
      const realUserTokens = [];
      const testTokens = [];
      const expiredTokens = [];
      const validTokens = [];
      
      allTokens.forEach(token => {
        const isTestToken = /^(test|debug|token-flow-test|expired|wrong-scope|no-tokens)/.test(token.userId);
        const isExpired = new Date(token.expiresAt) < new Date();
        
        if (isTestToken) {
          testTokens.push(token);
        } else {
          realUserTokens.push(token);
        }
        
        if (isExpired) {
          expiredTokens.push(token);
        } else {
          validTokens.push(token);
        }
      });
      
      console.log(`   Real user tokens: ${realUserTokens.length}`);
      console.log(`   Test tokens: ${testTokens.length}`);
      console.log(`   Expired tokens: ${expiredTokens.length}`);
      console.log(`   Valid tokens: ${validTokens.length}`);
      
      // Detailed analysis of real user tokens
      if (realUserTokens.length > 0) {
        console.log('\n📋 Real User Token Details:');
        realUserTokens.forEach((token, index) => {
          console.log(`\n   ${index + 1}. User ID: ${token.userId}`);
          console.log(`      Created: ${token.createdAt}`);
          console.log(`      Expires: ${token.expiresAt}`);
          console.log(`      Expired: ${new Date(token.expiresAt) < new Date()}`);
          console.log(`      Scope: ${token.scope}`);
          console.log(`      Has cart scope: ${token.scope?.includes('cart.basic:write')}`);
          console.log(`      Token type: ${token.tokenType}`);
          console.log(`      Access token format: ${token.accessToken ? token.accessToken.substring(0, 30) + '...' : 'N/A'}`);
          console.log(`      Refresh token: ${token.refreshToken ? 'Present' : 'Missing'}`);
        });
      } else {
        console.log('\n❌ NO REAL USER TOKENS FOUND');
        console.log('   Users have generated OAuth URLs but never completed authentication');
      }
    }
    
    // Step 3: Test OAuth URL Generation
    console.log('\n📋 Step 3: OAuth URL Generation Test');
    console.log('-'.repeat(50));
    
    const testUserId = 'oauth-test-' + Date.now();
    const authURL = authService.generateAuthURL(testUserId);
    
    console.log('🔗 OAuth URL Details:');
    console.log(`   URL: ${authURL.authURL}`);
    console.log(`   State: ${authURL.state}`);
    console.log(`   Scopes: ${authURL.scopes}`);
    
    // Parse and verify URL components
    const url = new URL(authURL.authURL);
    console.log('\n🔍 URL Component Analysis:');
    console.log(`   Domain: ${url.origin}`);
    console.log(`   Endpoint: ${url.pathname}`);
    console.log(`   Client ID: ${url.searchParams.get('client_id')}`);
    console.log(`   Redirect URI: ${url.searchParams.get('redirect_uri')}`);
    console.log(`   Scopes: ${url.searchParams.get('scope')}`);
    console.log(`   Response Type: ${url.searchParams.get('response_type')}`);
    
    // Step 4: Test Callback Endpoint Accessibility
    console.log('\n📋 Step 4: Callback Endpoint Test');
    console.log('-'.repeat(50));
    
    const redirectUri = url.searchParams.get('redirect_uri');
    console.log(`🌐 Testing callback endpoint: ${redirectUri}`);
    
    try {
      // Test if callback endpoint is accessible (expect error, but should respond)
      const callbackTest = await axios.get(redirectUri, { 
        timeout: 10000,
        validateStatus: () => true // Accept any status code
      });
      
      console.log(`✅ Callback endpoint accessible: ${callbackTest.status}`);
      if (callbackTest.status === 200) {
        console.log('   Response indicates endpoint is working');
      } else if (callbackTest.status === 400 || callbackTest.status === 404) {
        console.log('   Expected error (no code/state parameters) - endpoint exists');
      }
      
    } catch (callbackError) {
      if (callbackError.code === 'ECONNREFUSED') {
        console.error('❌ Callback endpoint UNREACHABLE');
        console.error('   Your server may not be running or accessible');
        console.error('   This could prevent users from completing OAuth');
      } else if (callbackError.code === 'ENOTFOUND') {
        console.error('❌ Callback domain does not exist');
        console.error('   Check your KROGER_REDIRECT_URI setting');
      } else {
        console.log(`⚠️  Callback test error: ${callbackError.message}`);
        console.log('   This may be normal if server requires specific parameters');
      }
    }
    
    // Step 5: Environment Configuration Check
    console.log('\n📋 Step 5: Environment Configuration Check');
    console.log('-'.repeat(50));
    
    const config = {
      KROGER_CLIENT_ID: process.env.KROGER_CLIENT_ID ? 'SET' : 'MISSING',
      KROGER_CLIENT_SECRET: process.env.KROGER_CLIENT_SECRET ? 'SET' : 'MISSING',
      KROGER_BASE_URL: process.env.KROGER_BASE_URL,
      KROGER_REDIRECT_URI: process.env.KROGER_REDIRECT_URI,
      KROGER_OAUTH_SCOPES: process.env.KROGER_OAUTH_SCOPES,
      CLIENT_URL: process.env.CLIENT_URL,
      NODE_ENV: process.env.NODE_ENV
    };
    
    console.log('🔧 Configuration Status:');
    Object.entries(config).forEach(([key, value]) => {
      console.log(`   ${key}: ${value || 'NOT SET'}`);
    });
    
    // Step 6: Potential Issues Analysis
    console.log('\n📋 Step 6: Potential Issues Analysis');
    console.log('-'.repeat(50));
    
    const issues = [];
    const warnings = [];
    const recommendations = [];
    
    // Check for common issues
    if (allTokens.length === 0) {
      issues.push('No tokens in database - users not completing OAuth');
      recommendations.push('Check if users are clicking OAuth links');
      recommendations.push('Verify OAuth callback endpoint is accessible');
      recommendations.push('Check frontend OAuth flow implementation');
    }
    
    if (realUserTokens.length === 0 && allTokens.length > 0) {
      warnings.push('Only test tokens found - no real user authentication');
      recommendations.push('Test with actual users');
    }
    
    if (expiredTokens.length > validTokens.length) {
      warnings.push('More expired tokens than valid tokens');
      recommendations.push('Implement token refresh mechanism');
    }
    
    if (!process.env.CLIENT_URL) {
      warnings.push('CLIENT_URL not set - may affect OAuth callbacks');
    }
    
    if (process.env.KROGER_BASE_URL?.includes('api-ce')) {
      warnings.push('Using CE API - ensure this is intentional for production');
    }
    
    // Display analysis
    if (issues.length > 0) {
      console.log('❌ Critical Issues:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
    
    // Step 7: Test Frontend Integration Points
    console.log('\n📋 Step 7: Frontend Integration Points');
    console.log('-'.repeat(50));
    
    console.log('🔗 Check these in your frontend application:');
    console.log('');
    console.log('1. OAuth Button/Link:');
    console.log(`   Should redirect to: ${authURL.authURL.substring(0, 80)}...`);
    console.log('');
    console.log('2. User clicks and authenticates on Kroger\'s site');
    console.log('');
    console.log('3. Kroger redirects back to:');
    console.log(`   ${redirectUri}?code=XXXXX&state=${authURL.state}`);
    console.log('');
    console.log('4. Your server processes callback and stores tokens');
    console.log('');
    console.log('5. Frontend receives success confirmation');
    console.log('');
    console.log('6. Cart operations can now work with stored tokens');
    
    // Step 8: Action Plan
    console.log('\n📋 Step 8: Action Plan to Fix Cart Issues');
    console.log('-'.repeat(50));
    
    if (allTokens.length === 0) {
      console.log('🎯 PRIMARY ACTION NEEDED:');
      console.log('   1. ✅ OAuth URL generation is working');
      console.log('   2. ❌ Users are not completing OAuth authentication');
      console.log('   3. 🔧 Debug the user authentication flow:');
      console.log('      a. Check if users are clicking OAuth links');
      console.log('      b. Verify OAuth callback endpoint is accessible');
      console.log('      c. Test complete OAuth flow manually');
      console.log('      d. Check browser console for JavaScript errors');
      console.log('      e. Verify server logs during OAuth callback');
    } else if (allTokens.filter(t => !/^(test|debug|token-flow-test|expired|wrong-scope|no-tokens)/.test(t.userId)).length > 0) {
      console.log('🎯 TOKEN-RELATED DEBUGGING NEEDED:');
      console.log('   1. ✅ Real user tokens exist');
      console.log('   2. 🔧 Debug why cart operations still fail:');
      console.log('      a. Check token validity and expiry');
      console.log('      b. Verify correct user IDs are being used');
      console.log('      c. Test cart operations with specific user tokens');
      console.log('      d. Check token refresh mechanism');
    }
    
    console.log('\n✅ REAL USER CHECK COMPLETED');
    
  } catch (error) {
    console.error('\n❌ REAL USER CHECK FAILED:', error.message);
    console.error('Error stack:', error.stack?.split('\n').slice(0, 3).join('\n'));
    process.exit(1);
  } finally {
    if (mongoConnected && mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n📡 MongoDB connection closed');
    }
  }
}

// Run the check
checkRealUsers().catch(console.error);