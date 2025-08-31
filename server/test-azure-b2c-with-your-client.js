// Test Azure B2C authentication using your existing client ID

const KrogerAzureB2CService = require('./services/KrogerAzureB2CService');
const TokenStore = require('./services/TokenStore');
require('dotenv').config();

async function testAzureB2CWithYourClientID() {
  console.log('🔐 TESTING AZURE B2C WITH YOUR EXISTING CLIENT ID');
  console.log('='.repeat(65));
  console.log(`Client ID: ${process.env.KROGER_CLIENT_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const azureB2CService = new KrogerAzureB2CService();
  const testUserId = 'test-azure-b2c-' + Date.now();

  try {
    // Step 1: Service health check
    console.log('📊 Step 1: Service Health Check');
    console.log('-'.repeat(35));
    const health = azureB2CService.getServiceHealth();
    console.log(`Service: ${health.service}`);
    console.log(`Client ID: ${health.clientId}`);
    console.log(`Azure B2C Endpoint: ${health.azureB2CEndpoint}`);
    console.log(`Legacy Endpoint: ${health.legacyEndpoint}`);
    console.log(`Redirect URI: ${health.redirectUri}`);
    console.log(`Configured: ${health.configured ? '✅' : '❌'}`);
    console.log(`Legacy Scopes: ${health.scopes.legacy.join(', ')}`);
    console.log(`Azure B2C Scopes: ${health.scopes.azureB2C.join(', ')}`);

    // Step 2: Generate authentication URLs
    console.log('\n🔗 Step 2: Authentication URL Generation');
    console.log('-'.repeat(45));
    
    console.log('Generating hybrid authentication URLs...');
    const authURLs = azureB2CService.generateHybridAuthURL(testUserId);
    
    console.log(`\n✅ Generated ${authURLs.alternatives.length} authentication approaches:`);
    
    authURLs.alternatives.forEach((approach, index) => {
      console.log(`\n${index + 1}️⃣ ${approach.name.toUpperCase()}:`);
      console.log(`   URL: ${approach.url.authURL.substring(0, 80)}...`);
      console.log(`   Length: ${approach.url.authURL.length} characters`);
      console.log(`   Auth Type: ${approach.url.authType}`);
      console.log(`   Scopes: ${approach.url.scopes}`);
      
      if (approach.url.instructions) {
        console.log(`   Flow: ${approach.url.instructions.flow}`);
        console.log(`   PKCE: ${approach.url.instructions.pkce || 'Not specified'}`);
      }
    });

    console.log('\n📋 RECOMMENDED TESTING ORDER:');
    console.log('   1. Try "Azure B2C + Your Scopes" first');
    console.log('   2. If that fails, try "Azure B2C + Azure Scopes"');
    console.log('   3. If Azure B2C fails entirely, use "Legacy OAuth Fallback"');

    // Step 3: Detailed URL Analysis
    console.log('\n🔍 Step 3: URL Analysis');
    console.log('-'.repeat(30));
    
    const primaryURL = authURLs.primary.url.authURL;
    const url = new URL(primaryURL);
    
    console.log('PRIMARY AZURE B2C URL BREAKDOWN:');
    console.log(`   Base URL: ${url.origin}${url.pathname}`);
    console.log(`   Client ID: ${url.searchParams.get('client_id')}`);
    console.log(`   Scopes: ${url.searchParams.get('scope')}`);
    console.log(`   Redirect URI: ${url.searchParams.get('redirect_uri')}`);
    console.log(`   Response Type: ${url.searchParams.get('response_type')}`);
    console.log(`   Response Mode: ${url.searchParams.get('response_mode')}`);
    console.log(`   PKCE Challenge: ${url.searchParams.get('code_challenge') ? 'Present' : 'Missing'}`);
    console.log(`   State: ${url.searchParams.get('state')?.substring(0, 20)}...`);

    // Step 4: Check for existing authenticated users
    console.log('\n👥 Step 4: Checking Existing Users');
    console.log('-'.repeat(35));
    
    try {
      const stats = await TokenStore.getStats();
      console.log(`Users with tokens: ${stats.active || 0}`);
      
      if (stats.active > 0) {
        const Token = require('./models/Token');
        const existingUsers = await Token.find({}).limit(3).exec();
        
        console.log('\nExisting authenticated users:');
        for (let i = 0; i < existingUsers.length; i++) {
          const user = existingUsers[i];
          console.log(`   ${i + 1}. User: ${user.userId}`);
          console.log(`      Auth Type: ${user.authType || 'legacy'}`);
          console.log(`      Scopes: ${user.scope}`);
          console.log(`      Client ID: ${user.clientId || 'not stored'}`);
          console.log(`      Expires: ${new Date(user.expiresAt).toISOString()}`);
          console.log(`      Valid: ${user.expiresAt > Date.now() ? '✅' : '❌'}`);
          
          // Test cart operations with existing user if token is valid
          if (user.expiresAt > Date.now()) {
            console.log(`\n   🛒 Testing cart operations with user ${user.userId}...`);
            try {
              const cartTest = await azureB2CService.testCartOperationsWithStoredTokens(user.userId);
              console.log(`   ✅ Cart test successful: Found ${cartTest.cartsFound} carts`);
            } catch (cartError) {
              console.log(`   ❌ Cart test failed: ${cartError.response?.status} - ${cartError.message}`);
              
              if (cartError.response?.status === 403) {
                console.log('   🎯 403 Forbidden - confirms endpoint/auth system mismatch');
              } else if (cartError.response?.status === 401) {
                console.log('   🔑 401 Unauthorized - token invalid or expired');
              }
            }
          }
        }
      } else {
        console.log('No existing authenticated users found.');
        console.log('To test cart operations, complete the OAuth flow first.');
      }
    } catch (dbError) {
      console.log(`Database error: ${dbError.message}`);
    }

    // Step 5: Authentication simulation (showing what would happen)
    console.log('\n🎭 Step 5: Authentication Flow Simulation');
    console.log('-'.repeat(45));
    
    console.log('WHAT HAPPENS WHEN USER CLICKS THE AZURE B2C URL:');
    console.log('   1. User redirected to login.kroger.com');
    console.log('   2. Kroger shows login form (email/password or social)');
    console.log('   3. User authenticates with Kroger account');
    console.log('   4. Kroger redirects back with authorization code');
    console.log('   5. Your server exchanges code for access token');
    console.log('   6. If successful: cart operations should work');
    console.log('   7. If failed: may need different client ID or endpoints');

    console.log('\nEXPECTED OUTCOMES:');
    console.log('   ✅ SUCCESS: Your client ID works with Azure B2C');
    console.log('      → Cart operations will work');
    console.log('      → 403 errors will be resolved');
    console.log('   ❌ FAILURE: Client ID not registered for Azure B2C');
    console.log('      → Need to register with Kroger for Azure B2C access');
    console.log('      → Continue using legacy OAuth as fallback');

    // Step 6: Next Steps
    console.log('\n🚀 Step 6: Next Steps for Testing');
    console.log('-'.repeat(40));
    console.log('TO TEST THIS COMPLETELY:');
    console.log('   1. Start your server: npm start');
    console.log('   2. User logs in to Firebase first (required)');
    console.log('   3. Call: POST /api/auth/kroger/login');
    console.log('      - Include Firebase auth header');
    console.log('      - Server returns Azure B2C URL');
    console.log('   4. User completes OAuth at returned URL');
    console.log('   5. Test cart operations');
    
    console.log('\nMONITOR FOR THESE RESULTS:');
    console.log('   🎯 Azure B2C authentication success');
    console.log('   🎯 Token stored with authType: "azure_b2c"');
    console.log('   🎯 Cart operations return 200 OK (not 403)');
    console.log('   🎯 Or specific error about client registration');

    // Step 7: Integration points
    console.log('\n🔧 Step 7: Integration with Existing Code');
    console.log('-'.repeat(45));
    console.log('TO INTEGRATE THIS INTO YOUR EXISTING SYSTEM:');
    console.log('   1. Update your auth routes to use KrogerAzureB2CService');
    console.log('   2. Modify cart operations to handle Azure B2C tokens');
    console.log('   3. Update frontend to handle new authentication flow');
    console.log('   4. Add fallback to legacy OAuth if Azure B2C fails');

    console.log('\nUPDATE THESE FILES:');
    console.log('   - server/routes/auth.js or server.js (OAuth routes)');
    console.log('   - server/services/KrogerOrderService.js (token usage)');
    console.log('   - frontend authentication components');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    // Cleanup
    azureB2CService.destroy();
  }

  console.log('\n✅ AZURE B2C TEST COMPLETED');
  console.log('Check the generated URLs and test with a real user OAuth flow.');
}

// Run the test
testAzureB2CWithYourClientID().catch(error => {
  console.error('❌ Azure B2C test failed:', error);
  process.exit(1);
});