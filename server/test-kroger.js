// test-kroger.js
require('dotenv').config();
const axios = require('axios');

async function testKrogerSetup() {
  console.log('🔍 Testing Kroger API Setup...\n');
  
  // Check credentials
  if (!process.env.KROGER_CLIENT_ID || !process.env.KROGER_CLIENT_SECRET) {
    console.error('❌ Missing credentials!');
    console.log('KROGER_CLIENT_ID:', process.env.KROGER_CLIENT_ID ? '✅ Set' : '❌ Missing');
    console.log('KROGER_CLIENT_SECRET:', process.env.KROGER_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
    return;
  }
  
  try {
    // 1. Test Authentication
    console.log('1️⃣ Testing Authentication...');
    const credentials = Buffer.from(
      `${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`
    ).toString('base64');
    
    const authResponse = await axios.post(
      'https://api-ce.kroger.com/v1/connect/oauth2/token',
      'grant_type=client_credentials&scope=product.compact',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const token = authResponse.data.access_token;
    console.log('✅ Authentication successful!\n');
    
    // 2. Test Product Search
    console.log('2️⃣ Testing Product Search...');
    const productResponse = await axios.get(
      'https://api-ce.kroger.com/v1/products',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        params: {
          'filter.term': 'milk',
          'filter.locationId': process.env.KROGER_DEFAULT_STORE,
          'filter.limit': 3
        }
      }
    );
    
    console.log(`✅ Found ${productResponse.data.data.length} products:`);
    productResponse.data.data.forEach(p => {
      console.log(`   - ${p.description}`);
    });
    console.log();
    
    // 3. Test Store Location
    console.log('3️⃣ Testing Store Location...');
    const storeResponse = await axios.get(
      `https://api-ce.kroger.com/v1/locations/${process.env.KROGER_DEFAULT_STORE}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );
    
    const store = storeResponse.data.data;
    console.log(`✅ Store found: ${store.name}`);
    console.log(`   ${store.address.addressLine1}, ${store.address.city}, ${store.address.state}`);
    console.log();
    
    console.log('🎉 All tests passed! Your Kroger API is ready!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n⚠️  Check your Client Secret is correct');
    }
  }
}

testKrogerSetup();