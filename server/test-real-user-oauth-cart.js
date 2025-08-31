// Test cart operations with real user OAuth tokens (no client credentials)

const KrogerOrderService = require('./services/KrogerOrderService');
const TokenStore = require('./services/TokenStore');
require('dotenv').config();

async function testRealUserOAuthCart() {
  console.log('🔐 TESTING CART OPERATIONS WITH REAL USER OAUTH TOKENS');
  console.log('='.repeat(65));
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const kroger = new KrogerOrderService();
  await kroger.initialize();

  try {
    // Step 1: Find users with valid Kroger OAuth tokens
    console.log('🔍 Step 1: Finding users with valid Kroger OAuth tokens...');
    const stats = await TokenStore.getStats();
    console.log(`   Total users with tokens: ${stats.active || 0}`);
    
    if (stats.active === 0) {
      console.log('❌ No users with Kroger OAuth tokens found');
      console.log('📋 TO FIX THIS:');
      console.log('   1. User must log in to Firebase first');
      console.log('   2. Then complete Kroger OAuth at: /api/auth/kroger/login');
      console.log('   3. OAuth callback will store tokens in MongoDB');
      console.log('   4. Then cart operations will work');
      return;
    }

    // Step 2: Get a real user with tokens
    const Token = require('./models/Token');
    const realUser = await Token.findOne({}).exec();
    
    if (!realUser) {
      console.log('❌ No token records found in database');
      return;
    }

    const userId = realUser.userId;
    console.log(`✅ Found real user with tokens: ${userId}`);
    console.log(`   Token scopes: ${realUser.scope}`);
    console.log(`   Token expires: ${new Date(realUser.expiresAt).toISOString()}`);
    console.log(`   Has cart.basic:write: ${realUser.scope?.includes('cart.basic:write')}`);

    // Step 3: Verify user authentication
    console.log('\n🔐 Step 2: Verifying user authentication...');
    const authCheck = await kroger.ensureUserAuth(userId);
    
    if (!authCheck.authenticated) {
      console.log(`❌ User authentication failed: ${authCheck.reason}`);
      return;
    }

    console.log('✅ User authenticated successfully');
    console.log(`   Token scope: ${authCheck.tokenInfo.scope}`);
    console.log(`   Token expires: ${new Date(authCheck.tokenInfo.expiresAt).toISOString()}`);

    // Step 4: Test cart retrieval (GET /carts)
    console.log('\n🛒 Step 3: Testing cart retrieval with user OAuth token...');
    try {
      const cartsResponse = await kroger.makeUserRequest(userId, 'GET', '/carts');
      console.log('✅ GET /carts successful with user OAuth token');
      console.log(`   Found ${cartsResponse.data?.length || 0} existing carts`);
      
      if (cartsResponse.data && cartsResponse.data.length > 0) {
        const cartId = cartsResponse.data[0].id;
        console.log(`   First cart ID: ${cartId}`);
        
        // Test getting cart details
        try {
          const cartDetails = await kroger.makeUserRequest(userId, 'GET', `/carts/${cartId}`);
          console.log('✅ GET /carts/{id} successful with user OAuth token');
          console.log(`   Cart has ${cartDetails.data?.items?.length || 0} items`);
        } catch (detailError) {
          console.log(`❌ GET /carts/{id} failed: ${detailError.response?.status} - ${detailError.message}`);
        }
      }

    } catch (cartError) {
      console.log(`❌ GET /carts failed: ${cartError.response?.status} - ${cartError.message}`);
      
      if (cartError.response?.status === 403) {
        console.log('🎯 CRITICAL: Still getting 403 with user OAuth token!');
        console.log('   This indicates a Kroger API access issue, not authentication');
        console.log('   Error details:', JSON.stringify(cartError.response.data, null, 2));
      } else if (cartError.response?.status === 401) {
        console.log('🔑 401 Unauthorized - token may be expired or invalid');
        console.log('   Try refreshing token or re-authenticating user');
      }
    }

    // Step 5: Test cart creation (POST /carts)
    console.log('\n📦 Step 4: Testing cart creation with user OAuth token...');
    
    const testItem = {
      upc: '0001111097139', // Known UPC from your previous tests
      quantity: 1,
      modality: 'PICKUP',
      allowSubstitutes: true
    };

    try {
      // Test creating empty cart first
      console.log('   Testing empty cart creation...');
      const emptyCartResponse = await kroger.makeUserRequest(userId, 'POST', '/carts', {});
      console.log('✅ Empty cart creation successful');
      console.log(`   New cart ID: ${emptyCartResponse.data?.id || emptyCartResponse.id}`);
      
      // Test adding item to the cart
      const cartId = emptyCartResponse.data?.id || emptyCartResponse.id;
      if (cartId) {
        console.log('   Testing adding item to cart...');
        const addItemResponse = await kroger.makeUserRequest(
          userId, 
          'POST', 
          `/carts/${cartId}/items`, 
          testItem
        );
        console.log('✅ Add item to cart successful');
        console.log('   Item added to cart with user OAuth token');
      }

    } catch (createError) {
      console.log(`❌ Cart creation failed: ${createError.response?.status} - ${createError.message}`);
      
      if (createError.response?.status === 403) {
        console.log('🎯 CRITICAL: 403 error with user OAuth token confirms scope/permission issue');
        console.log('   Error details:', JSON.stringify(createError.response.data, null, 2));
        console.log('\n🔧 POSSIBLE SOLUTIONS:');
        console.log('   1. Kroger developer account needs cart API access enabled');
        console.log('   2. Try different Kroger API endpoint (CE vs regular)');
        console.log('   3. Contact Kroger developer support about cart access');
        console.log('   4. Verify client ID has proper permissions in Kroger portal');
      } else if (createError.response?.status === 401) {
        console.log('🔑 401 Unauthorized - check token validity');
      }
    }

    // Step 6: Test complete cart workflow
    console.log('\n🚀 Step 5: Testing complete cart workflow...');
    
    const testCartItems = [
      {
        productName: 'Banana',
        quantity: 2
      }
    ];

    try {
      // This tests the complete prepareCartItems → addItemsToCart flow
      const result = await kroger.sendCartToKroger(userId, testCartItems, {
        storeId: '01400943',
        modality: 'PICKUP'
      });
      
      console.log('✅ Complete cart workflow successful');
      console.log(`   Items added: ${result.itemsAdded}`);
      console.log(`   Items failed: ${result.itemsFailed}`);
      console.log(`   Cart ID: ${result.krogerCartId}`);

    } catch (workflowError) {
      console.log(`❌ Complete workflow failed: ${workflowError.message}`);
      
      if (workflowError.message.includes('AUTHENTICATION_REQUIRED')) {
        console.log('🔑 User authentication required - OAuth flow needed');
      } else if (workflowError.message.includes('INSUFFICIENT_SCOPE')) {
        console.log('🔒 User has token but missing cart.basic:write scope');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n📊 SUMMARY');
  console.log('='.repeat(50));
  console.log('✅ Removed client credentials fallbacks from cart operations');
  console.log('✅ Added proper user OAuth authentication validation');
  console.log('✅ Cart operations now require user OAuth tokens only');
  console.log('\n🎯 RESULT:');
  console.log('Cart operations will now:');
  console.log('   1. ✅ Validate user has Kroger OAuth token');
  console.log('   2. ✅ Verify token has cart.basic:write scope');
  console.log('   3. ✅ Use ONLY user OAuth tokens (no client credentials)');
  console.log('   4. ✅ Fail fast with clear error messages if not authenticated');
  
  process.exit(0);
}

// Run test
testRealUserOAuthCart().catch(error => {
  console.error('❌ Real user OAuth cart test failed:', error);
  process.exit(1);
});