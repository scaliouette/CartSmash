#!/usr/bin/env node

// Check if tokens were stored after OAuth completion
require('dotenv').config();

const mongoose = require('mongoose');
const TokenStore = require('./services/TokenStore');

async function checkTokenAfterOAuth() {
  console.log('🔍 CHECKING TOKENS AFTER OAUTH COMPLETION');
  console.log('=========================================\n');

  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      console.log('📡 Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      console.log('✅ MongoDB connected successfully');
    }

    // Check for tokens
    const Token = require('./models/Token');
    const allTokens = await Token.find({}).lean();
    
    console.log(`📊 Total tokens in database: ${allTokens.length}`);
    
    if (allTokens.length === 0) {
      console.log('❌ Still no tokens found');
      console.log('   The OAuth callback may have failed to process the code');
      console.log('   Check server logs for OAuth callback processing errors');
    } else {
      console.log('✅ TOKENS FOUND!');
      
      allTokens.forEach((token, index) => {
        const isExpired = new Date(token.expiresAt) < new Date();
        const isManualTest = token.userId === 'manual-test-user-1756667547475';
        
        console.log(`\n${index + 1}. User ID: ${token.userId}`);
        console.log(`   ${isManualTest ? '🎯 THIS IS YOUR MANUAL TEST USER' : '👤 Regular user'}`);
        console.log(`   Created: ${token.createdAt}`);
        console.log(`   Expires: ${token.expiresAt}`);
        console.log(`   Expired: ${isExpired ? '❌ Yes' : '✅ No'}`);
        console.log(`   Scope: ${token.scope}`);
        console.log(`   Has cart scope: ${token.scope?.includes('cart.basic:write') ? '✅ Yes' : '❌ No'}`);
        console.log(`   Token type: ${token.tokenType}`);
        console.log(`   Access token: ${token.accessToken?.substring(0, 30)}...`);
        console.log(`   Refresh token: ${token.refreshToken ? 'Present' : 'Missing'}`);
        
        if (isManualTest) {
          console.log(`\n🎉 SUCCESS! Your manual test created a real token!`);
          console.log(`   User ID for cart testing: ${token.userId}`);
          console.log(`   This user should be able to use cart operations`);
        }
      });
      
      // Test token retrieval
      console.log('\n🧪 Testing TokenStore retrieval...');
      const manualTestUserId = 'manual-test-user-1756667547475';
      const retrievedToken = await TokenStore.getTokens(manualTestUserId);
      
      if (retrievedToken) {
        console.log('✅ TokenStore can retrieve the token');
        console.log(`   Access token: ${retrievedToken.accessToken?.substring(0, 30)}...`);
        console.log(`   Scope: ${retrievedToken.scope}`);
        console.log(`   Expires: ${new Date(retrievedToken.expiresAt).toISOString()}`);
        console.log(`   Valid: ${retrievedToken.expiresAt > Date.now()}`);
      } else {
        console.log('❌ TokenStore cannot retrieve the token');
      }
    }
    
    console.log('\n🎯 NEXT STEPS:');
    if (allTokens.length > 0) {
      console.log('✅ OAuth authentication is working!');
      console.log('✅ Real tokens are being stored!');
      console.log('🔧 Now test cart operations with the user ID shown above');
      console.log('📋 Cart operations should now work for this authenticated user');
      
      // Show test command
      const testUserId = allTokens[0]?.userId;
      if (testUserId) {
        console.log(`\n🧪 Test cart operations with:`);
        console.log(`   User ID: ${testUserId}`);
        console.log(`   The cart.basic:write scope is present, so cart operations should work`);
      }
    } else {
      console.log('❌ OAuth callback processing failed');
      console.log('🔧 Check server logs for callback processing errors');
      console.log('🔧 Verify the authorization code was processed correctly');
    }
    
  } catch (error) {
    console.error('\n❌ TOKEN CHECK FAILED:', error.message);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n📡 MongoDB connection closed');
    }
  }
}

// Run the check
checkTokenAfterOAuth().catch(console.error);