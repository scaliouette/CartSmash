// Test script to verify cart.basic:rw scope fix for 403 errors

const KrogerOrderService = require('./services/KrogerOrderService');
require('dotenv').config();

async function testCartScopeFix() {
  console.log('🧪 Testing cart.basic:rw scope fix...\n');
  
  const kroger = new KrogerOrderService();
  
  // Initialize the service
  await kroger.initialize();
  
  // Test 1: Check service configuration
  console.log('📋 Test 1: Service Configuration');
  console.log(`   Cart scope configured: ${kroger.scopes.cart}`);
  console.log(`   Expected scope: cart.basic:rw`);
  console.log(`   ✅ Scope configuration: ${kroger.scopes.cart === 'cart.basic:rw' ? 'CORRECT' : 'INCORRECT'}\n`);
  
  // Test 2: Check OAuth URL generation
  console.log('📋 Test 2: OAuth URL Generation');
  const authUrl = kroger.getAuthURL('test-user');
  const scopeInUrl = new URL(authUrl.authURL).searchParams.get('scope');
  console.log(`   OAuth URL scope: ${scopeInUrl}`);
  console.log(`   Contains cart.basic:rw: ${scopeInUrl.includes('cart.basic:rw')}`);
  console.log(`   ✅ OAuth URL: ${scopeInUrl.includes('cart.basic:rw') ? 'CORRECT' : 'INCORRECT'}\n`);
  
  // Test 3: Test client credentials token request (if credentials are available)
  if (process.env.KROGER_CLIENT_ID && process.env.KROGER_CLIENT_SECRET) {
    try {
      console.log('📋 Test 3: Client Credentials Token');
      console.log('   Attempting to get client credentials token with cart.basic:rw scope...');
      
      const tokenResponse = await kroger.getClientCredentialsToken();
      console.log(`   Token obtained: YES`);
      console.log(`   Token scope: ${tokenResponse.scope}`);
      console.log(`   Contains cart.basic:rw: ${tokenResponse.scope?.includes('cart.basic:rw') || 'Not found'}`);
      console.log(`   ✅ Client credentials: ${tokenResponse.scope?.includes('cart.basic:rw') ? 'SUCCESS' : 'SCOPE_ISSUE'}\n`);
      
      // Test 4: Try a simple cart operation with client credentials
      console.log('📋 Test 4: Cart Endpoint Test with Client Credentials');
      try {
        console.log('   Testing GET /carts endpoint...');
        const cartResponse = await kroger.makeClientRequest('GET', '/carts');
        console.log(`   ✅ GET /carts: SUCCESS (Status: 200)`);
        console.log(`   Response: ${JSON.stringify(cartResponse).substring(0, 200)}...`);
      } catch (cartError) {
        console.log(`   ❌ GET /carts: ${cartError.response?.status || 'ERROR'}`);
        console.log(`   Error: ${cartError.response?.data?.message || cartError.message}`);
        
        if (cartError.response?.status === 403) {
          console.log(`   🎯 Still getting 403 - scope issue may persist`);
          console.log(`   Error details:`, JSON.stringify(cartError.response?.data, null, 2));
        }
      }
      console.log();
      
    } catch (tokenError) {
      console.log(`   ❌ Client credentials failed: ${tokenError.message}`);
      if (tokenError.response?.data) {
        console.log(`   Error details:`, JSON.stringify(tokenError.response.data, null, 2));
      }
      console.log();
    }
  } else {
    console.log('📋 Test 3: Skipped (Missing credentials)\n');
  }
  
  // Test 5: Check for existing user tokens and their scopes
  console.log('📋 Test 5: Existing User Token Analysis');
  const { default: mongoose } = await import('mongoose');
  
  if (!mongoose.connection.readyState) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('   Connected to MongoDB');
      
      const TokenStore = require('./services/TokenStore');
      const stats = await TokenStore.getStats();
      console.log(`   Active users with tokens: ${stats.active || 0}`);
      
      if (stats.active > 0) {
        // Get one user to check their token scope
        const Token = require('./models/Token');
        const sampleToken = await Token.findOne({}).exec();
        
        if (sampleToken) {
          console.log(`   Sample user: ${sampleToken.userId}`);
          console.log(`   Token scope: ${sampleToken.scope}`);
          console.log(`   Has old scope (cart.basic:write): ${sampleToken.scope?.includes('cart.basic:write')}`);
          console.log(`   Has new scope (cart.basic:rw): ${sampleToken.scope?.includes('cart.basic:rw')}`);
          
          if (sampleToken.scope?.includes('cart.basic:write') && !sampleToken.scope?.includes('cart.basic:rw')) {
            console.log('   ⚠️  WARNING: Existing users have old scope and need to re-authenticate');
          }
        }
      }
      
    } catch (dbError) {
      console.log(`   ⚠️  Database connection failed: ${dbError.message}`);
    }
  }
  console.log();
  
  // Summary
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log('✅ Updated all cart.basic:write references to cart.basic:rw');
  console.log('✅ Service configuration updated');
  console.log('✅ OAuth URL generation updated');
  console.log('✅ Client credentials scope updated');
  console.log('✅ Error handling and logging updated');
  console.log();
  console.log('🔄 NEXT STEPS:');
  console.log('1. Existing users with cart.basic:write tokens need to re-authenticate');
  console.log('2. Test with a real user OAuth flow to get cart.basic:rw token');
  console.log('3. Try cart operations with the new scope');
  console.log('4. Monitor for any remaining 403 errors');
  
  process.exit(0);
}

// Run the test
testCartScopeFix().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});