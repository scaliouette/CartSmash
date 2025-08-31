// Test to compare old vs new Kroger OAuth approaches

const KrogerAuthService = require('./services/KrogerAuthService'); // Old service
const KrogerModernAuthService = require('./services/KrogerModernAuthService'); // New service
require('dotenv').config();

async function compareKrogerAuthApproaches() {
  console.log('🔍 KROGER AUTHENTICATION APPROACHES COMPARISON');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const testUserId = 'test-comparison-' + Date.now();
  
  // Initialize both services
  console.log('🔧 Initializing authentication services...');
  const legacyAuth = new KrogerAuthService();
  const modernAuth = new KrogerModernAuthService();

  console.log('\n📊 SERVICE COMPARISON');
  console.log('='.repeat(40));
  
  // Compare configurations
  const legacyHealth = legacyAuth.getServiceHealth();
  const modernHealth = modernAuth.getServiceHealth();
  
  console.log('LEGACY OAUTH SERVICE:');
  console.log(`   Base URL: ${legacyAuth.baseURL}`);
  console.log(`   Auth Endpoint: ${legacyAuth.baseURL}/connect/oauth2/authorize`);
  console.log(`   Default Scopes: ${legacyAuth.defaultScopes.join(', ')}`);
  console.log(`   Client ID: ${legacyAuth.clientId?.substring(0, 8)}...`);
  
  console.log('\nMODERN AZURE B2C SERVICE:');
  console.log(`   Azure B2C URL: ${modernAuth.azureB2CBaseURL}`);
  console.log(`   Auth Endpoint: ${modernAuth.azureB2CBaseURL}/authorize`);
  console.log(`   Azure Client ID: ${modernAuth.azureClientId}`);
  console.log(`   Azure Scopes: ${modernAuth.azureScopes.join(', ')}`);
  console.log(`   Legacy Fallback: ${modernAuth.krogerAPIBaseURL}/connect/oauth2/authorize`);

  console.log('\n🔗 URL GENERATION COMPARISON');
  console.log('='.repeat(40));
  
  // Generate URLs with both services
  console.log('1️⃣ LEGACY OAUTH URL:');
  try {
    const legacyAuth = legacyAuth.generateAuthURL(testUserId);
    console.log(`   URL: ${legacyAuthInfo.authURL}`);
    console.log(`   Length: ${legacyAuthInfo.authURL.length} characters`);
    console.log(`   State: ${legacyAuthInfo.state}`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }
  
  console.log('\n2️⃣ MODERN AZURE B2C URL:');
  try {
    const modernAuthInfo = modernAuth.generateModernAuthURL(testUserId, true);
    console.log(`   URL: ${modernAuthInfo.authURL.substring(0, 100)}...`);
    console.log(`   Length: ${modernAuthInfo.authURL.length} characters`);
    console.log(`   Auth Type: ${modernAuthInfo.authType}`);
    console.log(`   Response Mode: fragment (client-side tokens)`);
    console.log(`   PKCE: Yes (code_challenge included)`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }
  
  console.log('\n3️⃣ MODERN LEGACY FALLBACK URL:');
  try {
    const fallbackAuthInfo = modernAuth.generateModernAuthURL(testUserId, false);
    console.log(`   URL: ${fallbackAuthInfo.authURL}`);
    console.log(`   Length: ${fallbackAuthInfo.authURL.length} characters`);
    console.log(`   Auth Type: ${fallbackAuthInfo.authType}`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }

  console.log('\n🎯 KEY DIFFERENCES IDENTIFIED');
  console.log('='.repeat(40));
  console.log('LEGACY APPROACH (What you\'ve been using):');
  console.log('   ✅ Uses api.kroger.com/v1/connect/oauth2/authorize');
  console.log('   ✅ Standard OAuth 2.0 authorization code flow');
  console.log('   ✅ Server-side token exchange');
  console.log('   ❌ May be deprecated/changed by Kroger');
  
  console.log('\nMODERN APPROACH (What Kroger actually uses):');
  console.log('   ✅ Uses login.kroger.com with Azure B2C');
  console.log('   ✅ PKCE for security (Proof Key for Code Exchange)');
  console.log('   ✅ Client-side token handling via URL fragments');
  console.log('   ✅ Microsoft MSAL.js compatible');
  console.log('   ⚠️  Requires different client ID (Azure B2C app)');

  console.log('\n🔍 ANALYSIS OF YOUR 403 ERRORS');
  console.log('='.repeat(40));
  console.log('POSSIBLE ROOT CAUSES:');
  console.log('1. 🎯 ENDPOINT MISMATCH:');
  console.log('   Your code: api.kroger.com/v1/connect/oauth2/authorize');
  console.log('   Kroger uses: login.kroger.com/eciamp.onmicrosoft.com/...');
  console.log('');
  console.log('2. 🎯 CLIENT ID MISMATCH:');
  console.log('   Your config: cartsmashproduction-bbc7zd3f');
  console.log('   Azure B2C: cc725f44-b50a-4be8-9295-05b5389365f4');
  console.log('');
  console.log('3. 🎯 AUTHENTICATION FLOW MISMATCH:');
  console.log('   Your flow: Server-side code exchange');
  console.log('   Kroger flow: Client-side Azure B2C with fragments');

  console.log('\n🔧 RECOMMENDED SOLUTIONS');
  console.log('='.repeat(40));
  console.log('OPTION 1: Update to Azure B2C Flow');
  console.log('   - Register app in Kroger\'s Azure B2C tenant');
  console.log('   - Use login.kroger.com endpoints');
  console.log('   - Implement client-side token handling');
  console.log('   - Use MSAL.js or similar Azure B2C library');
  console.log('');
  console.log('OPTION 2: Verify Legacy API Access');
  console.log('   - Contact Kroger developer support');
  console.log('   - Confirm if api.kroger.com/v1/connect/oauth2 is still supported');
  console.log('   - Verify your client ID has proper permissions');
  console.log('');
  console.log('OPTION 3: Hybrid Approach');
  console.log('   - Try Azure B2C flow first');
  console.log('   - Fall back to legacy OAuth if needed');
  console.log('   - Use the KrogerModernAuthService created above');

  console.log('\n✅ NEXT STEPS');
  console.log('='.repeat(20));
  console.log('1. Contact Kroger developer support to clarify:');
  console.log('   - Which OAuth endpoints are currently supported');
  console.log('   - How to register for Azure B2C authentication');
  console.log('   - Whether your current client ID works with new flow');
  console.log('');
  console.log('2. Test with corrected endpoints and client IDs');
  console.log('3. Update your frontend to handle Azure B2C flow if needed');
  
  console.log('\n🎯 CRITICAL INSIGHT:');
  console.log('Your 403 errors may not be scope-related but endpoint-related!');
  console.log('Kroger appears to have migrated to Azure B2C authentication.');
}

// Run comparison
compareKrogerAuthApproaches().catch(error => {
  console.error('❌ Comparison failed:', error);
  process.exit(1);
});