// test-kroger-flow.js - Complete test
const testKrogerFlow = async () => {
  const API_URL = 'https://cartsmash-api.onrender.com';
  const userId = 'test-user-001';
  
  // 1. Check auth status
  console.log('1. Checking auth status...');
  const authCheck = await fetch(`${API_URL}/api/kroger-orders/auth/status`, {
    headers: { 'user-id': userId }
  });
  const authStatus = await authCheck.json();
  console.log('Auth status:', authStatus);
  
  if (!authStatus.authenticated) {
    console.log('\n⚠️ User needs to authenticate first!');
    console.log('Visit this URL to authenticate:');
    console.log(`${API_URL}/api/auth/kroger/login?userId=${userId}`);
    console.log('\nAfter authenticating, run this script again.');
    return;
  }
  
  console.log('✅ User is authenticated!');
  
  // 2. Send test cart
  console.log('\n2. Sending test cart...');
  const cartResponse = await fetch(`${API_URL}/api/kroger-orders/cart/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'user-id': userId
    },
    body: JSON.stringify({
      cartItems: [
        { productName: 'Milk 2% Reduced Fat', quantity: 1, unit: 'gallon' },
        { productName: 'Wonder Bread White', quantity: 2, unit: 'loaf' },
        { productName: 'Large Eggs Grade A', quantity: 1, unit: 'dozen' },
        { productName: 'Bananas Yellow', quantity: 5, unit: 'each' },
        { productName: 'Chicken Breast Boneless', quantity: 2, unit: 'lb' }
      ],
      storeId: '01400943',
      modality: 'PICKUP'
    })
  });
  
  const cartResult = await cartResponse.json();
  console.log('\n3. Cart result:', JSON.stringify(cartResult, null, 2));
  
  if (cartResult.success) {
    console.log('\n✅ SUCCESS! Items sent to Kroger cart');
    console.log(`   Items added: ${cartResult.itemsAdded}`);
    console.log(`   Items failed: ${cartResult.itemsFailed}`);
    console.log('\n🛒 View your cart at: https://www.kroger.com/cart');
  } else {
    console.log('\n❌ Failed:', cartResult.message || cartResult.error);
  }
};

// Run with error handling
testKrogerFlow().catch(console.error);