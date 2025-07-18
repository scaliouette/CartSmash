// test-endpoints.js - Test the AI endpoints
const axios = require('axios').default;

const BASE_URL = 'http://localhost:3001';

async function testEndpoints() {
  console.log('🧪 Testing Cart Smash API endpoints...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health:', healthResponse.data.status);
    
    // Test AI health endpoint
    console.log('\n2. Testing AI health endpoint...');
    const aiHealthResponse = await axios.get(`${BASE_URL}/api/ai/health`);
    console.log('✅ AI Health:', aiHealthResponse.data);
    
    // Test Claude endpoint
    console.log('\n3. Testing Claude endpoint...');
    const claudeResponse = await axios.post(`${BASE_URL}/api/ai/claude`, {
      prompt: 'Create a simple grocery list for 2 people for one week',
      context: 'grocery_list_generation'
    });
    console.log('✅ Claude response received');
    console.log('📝 Response length:', claudeResponse.data.response.length);
    console.log('🛒 Grocery items found:', claudeResponse.data.groceryList.length);
    console.log('🛒 First few items:', claudeResponse.data.groceryList.slice(0, 3));
    
    // Test ChatGPT endpoint
    console.log('\n4. Testing ChatGPT endpoint...');
    const chatgptResponse = await axios.post(`${BASE_URL}/api/ai/chatgpt`, {
      prompt: 'Create a budget grocery list for $50',
      context: 'grocery_list_generation'
    });
    console.log('✅ ChatGPT response received');
    console.log('📝 Response length:', chatgptResponse.data.response.length);
    console.log('🛒 Grocery items found:', chatgptResponse.data.groceryList.length);
    console.log('🛒 First few items:', chatgptResponse.data.groceryList.slice(0, 3));
    
    // Test cart parse endpoint
    console.log('\n5. Testing cart parse endpoint...');
    const testList = claudeResponse.data.groceryList.join('\n');
    const cartResponse = await axios.post(`${BASE_URL}/api/cart/parse`, {
      listText: testList,
      action: 'replace'
    });
    console.log('✅ Cart parse successful');
    console.log('📊 Items in cart:', cartResponse.data.totalItems);
    
    // Test get current cart
    console.log('\n6. Testing get current cart...');
    const currentCartResponse = await axios.get(`${BASE_URL}/api/cart/current`);
    console.log('✅ Current cart retrieved');
    console.log('📊 Items in current cart:', currentCartResponse.data.itemCount);
    
    console.log('\n🎉 All endpoints are working correctly!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📄 Response:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure the server is running with: npm start');
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testEndpoints();
}

module.exports = testEndpoints;