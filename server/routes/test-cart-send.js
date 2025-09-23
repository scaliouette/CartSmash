// server/test-cart-send.js
require('dotenv').config();
// const KrogerOrderService = require('./services/KrogerOrderService'); // ARCHIVED - Kroger integration disabled
// const KrogerAPIService = require('./services/KrogerAPIService'); // ARCHIVED - Kroger integration disabled

// const orderService = new KrogerOrderService(); // ARCHIVED - Kroger integration disabled
// const apiService = new KrogerAPIService(); // ARCHIVED - Kroger integration disabled

async function testCartPrep() {
  console.log('🚫 Kroger Cart Integration Test - DISABLED');
  console.log('=====================================\n');
  console.log('❌ Kroger integration has been archived and disabled.');
  console.log('   This test cannot run as the services are no longer available.');
  console.log('=====================================');
  return;
  
  // Test items from your cart
  const testItems = [
    {
      id: 'item1',
      productName: 'Milk',
      quantity: 1,
      unit: 'gallon',
      category: 'dairy'
    },
    {
      id: 'item2', 
      productName: 'Bread',
      quantity: 2,
      unit: 'loaf',
      category: 'bakery'
    },
    {
      id: 'item3',
      productName: 'Bananas',
      quantity: 3,
      unit: 'lb',
      category: 'produce'
    }
  ];
  
  console.log('📦 Test Items:', testItems.length);
  console.log('-----------------------------------\n');
  
  // Step 1: Test API Authentication
  console.log('1️⃣ Testing API Authentication...');
  try {
    const authResult = await apiService.authenticate();
    if (authResult) {
      console.log('✅ API Authentication successful');
      console.log('   Token expires:', new Date(apiService.tokenExpiry).toLocaleTimeString());
    } else {
      console.log('❌ API Authentication failed');
      return;
    }
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    return;
  }
  
  console.log('\n-----------------------------------\n');
  
  // Step 2: Test Product Search
  console.log('2️⃣ Testing Product Search...');
  for (const item of testItems) {
    try {
      console.log(`\n🔍 Searching for: "${item.productName}"`);
      const products = await apiService.searchProducts(item.productName, '01400943', 3);
      
      if (products.length > 0) {
        console.log(`✅ Found ${products.length} products`);
        const firstProduct = products[0];
        console.log(`   - ${firstProduct.description}`);
        console.log(`   - UPC: ${firstProduct.upc || 'N/A'}`);
        console.log(`   - ID: ${firstProduct.productId}`);
      } else {
        console.log(`❌ No products found for "${item.productName}"`);
      }
    } catch (error) {
      console.error(`❌ Search failed for "${item.productName}":`, error.message);
    }
  }
  
  console.log('\n-----------------------------------\n');
  
  // Step 3: Test Cart Preparation
  console.log('3️⃣ Testing Cart Item Preparation...');
  
  try {
    const result = await orderService.prepareCartItems(testItems, '01400943');
    
    console.log('\n📊 Preparation Results:');
    console.log(`   ✅ Prepared: ${result.preparedItems.length} items`);
    console.log(`   ❌ Failed: ${result.failedItems.length} items`);
    console.log(`   📈 Success Rate: ${result.summary.successRate}`);
    
    if (result.preparedItems.length > 0) {
      console.log('\n✅ Prepared Items:');
      result.preparedItems.forEach(item => {
        console.log(`   - ${item.originalItem.productName}: UPC ${item.upc || 'MISSING'}`);
      });
    }
    
    if (result.failedItems.length > 0) {
      console.log('\n❌ Failed Items:');
      result.failedItems.forEach(failed => {
        console.log(`   - ${failed.item.productName}: ${failed.reason}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Cart preparation failed:', error.message);
  }
  
  console.log('\n-----------------------------------\n');
  
  // Step 4: Test User Authentication (will fail without OAuth)
  console.log('4️⃣ Testing User Authentication...');
  const testUserId = 'demo-user';
  
  try {
    const authStatus = await orderService.ensureUserAuth(testUserId);
    if (authStatus.authenticated) {
      console.log('✅ User authenticated');
      console.log('   Token info:', authStatus.tokenInfo);
    } else {
      console.log('❌ User not authenticated');
      console.log('   Reason:', authStatus.reason);
      console.log('\n⚠️  NOTE: User authentication requires completing OAuth flow');
      console.log('   This is why "Send to Kroger" is failing!');
    }
  } catch (error) {
    console.error('❌ Auth check failed:', error.message);
  }
  
  console.log('\n=====================================');
  console.log('🏁 Test Complete!');
}

// Run the test
testCartPrep().catch(console.error);