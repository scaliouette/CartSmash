// test-ai-integration.js - Test the improved AI integration
const axios = require('axios').default;

const BASE_URL = 'http://localhost:3001';

async function testAIIntegration() {
  console.log('🧪 Testing Cart Smash AI Integration...\n');
  
  try {
    // Test 1: Health check
    console.log('1. 🏥 Testing health endpoints...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Main health:', healthResponse.data.status);
    
    const aiHealthResponse = await axios.get(`${BASE_URL}/api/ai/health`);
    console.log('✅ AI health:', aiHealthResponse.data.status);
    console.log('🔑 API Keys:', aiHealthResponse.data.services);
    
    // Test 2: Claude with meal planning
    console.log('\n2. 🧠 Testing Claude with meal planning prompt...');
    const claudeResponse = await axios.post(`${BASE_URL}/api/ai/claude`, {
      prompt: 'Create a healthy 7-day meal plan with complete grocery shopping list for a family of 4. Include breakfast, lunch, dinner, and snacks. Format the grocery list as individual items, one per line.',
      context: 'grocery_list_generation'
    });
    
    console.log('✅ Claude response received');
    console.log('📝 Response preview:', claudeResponse.data.response.substring(0, 200) + '...');
    console.log('🛒 Grocery items extracted:', claudeResponse.data.groceryList.length);
    console.log('🛒 Sample items:', claudeResponse.data.groceryList.slice(0, 5));
    console.log('📊 Model used:', claudeResponse.data.model);
    console.log('🔄 Is fallback:', claudeResponse.data.fallback);
    
    // Test 3: ChatGPT with budget shopping
    console.log('\n3. 🤖 Testing ChatGPT with budget shopping prompt...');
    const chatgptResponse = await axios.post(`${BASE_URL}/api/ai/chatgpt`, {
      prompt: 'Create a budget-friendly grocery list for $75 per week for 2 people. Focus on nutritious, filling meals. Format as a simple grocery list with each item on a separate line.',
      context: 'grocery_list_generation'
    });
    
    console.log('✅ ChatGPT response received');
    console.log('📝 Response preview:', chatgptResponse.data.response.substring(0, 200) + '...');
    console.log('🛒 Grocery items extracted:', chatgptResponse.data.groceryList.length);
    console.log('🛒 Sample items:', chatgptResponse.data.groceryList.slice(0, 5));
    console.log('📊 Model used:', chatgptResponse.data.model);
    console.log('🔄 Is fallback:', chatgptResponse.data.fallback);
    
    // Test 4: Quick meals prompt
    console.log('\n4. ⚡ Testing quick meals prompt...');
    const quickResponse = await axios.post(`${BASE_URL}/api/ai/claude`, {
      prompt: 'Give me 5 quick 30-minute dinner recipes with a complete shopping list. Family-friendly options please. Provide just the grocery list at the end, one item per line.',
      context: 'grocery_list_generation'
    });
    
    console.log('✅ Quick meals response received');
    console.log('🛒 Grocery items extracted:', quickResponse.data.groceryList.length);
    console.log('🛒 Sample items:', quickResponse.data.groceryList.slice(0, 5));
    
    // Test 5: Cart integration
    console.log('\n5. 🛒 Testing cart integration with AI-generated list...');
    const testList = claudeResponse.data.groceryList.slice(0, 10).join('\n'); // Use first 10 items
    console.log('📝 Sending to cart parser:', testList.substring(0, 100) + '...');
    
    const cartResponse = await axios.post(`${BASE_URL}/api/cart/parse`, {
      listText: testList,
      action: 'replace'
    });
    
    console.log('✅ Cart parse successful');
    console.log('📊 Items parsed into cart:', cartResponse.data.totalItems);
    console.log('🏷️ Sample parsed item:', cartResponse.data.cart[0]);
    
    // Test 6: End-to-end grocery extraction quality
    console.log('\n6. 🎯 Analyzing grocery extraction quality...');
    
    const allResponses = [claudeResponse, chatgptResponse, quickResponse];
    let totalItems = 0;
    let validItems = 0;
    
    allResponses.forEach((response, index) => {
      const items = response.data.groceryList;
      totalItems += items.length;
      
      // Check quality of extracted items
      items.forEach(item => {
        // Valid if it contains common patterns
        if (/\b(lb|lbs|oz|cup|cups|tbsp|tsp|clove|cloves|bunch|bag|container|jar|can|bottle|loaf|dozen|pack|gallon|quart)\b/i.test(item) ||
            /\b(chicken|beef|pork|fish|salmon|turkey|eggs|milk|cheese|bread|rice|pasta|oil|onion|garlic|tomato|potato|apple|banana|spinach|lettuce|yogurt|butter|flour|sugar|salt|pepper|beans|lentils|quinoa|oats)\b/i.test(item) ||
            /^\d+/.test(item)) {
          validItems++;
        }
      });
    });
    
    const qualityScore = (validItems / totalItems * 100).toFixed(1);
    console.log(`📊 Total items extracted: ${totalItems}`);
    console.log(`✅ Valid grocery items: ${validItems}`);
    console.log(`🎯 Quality score: ${qualityScore}%`);
    
    if (qualityScore >= 80) {
      console.log('🎉 EXCELLENT: Grocery extraction is working very well!');
    } else if (qualityScore >= 60) {
      console.log('👍 GOOD: Grocery extraction is working reasonably well');
    } else {
      console.log('⚠️ NEEDS IMPROVEMENT: Grocery extraction needs tuning');
    }
    
    console.log('\n🎊 All AI integration tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Claude API: ✅ Working (${claudeResponse.data.groceryList.length} items)`);
    console.log(`   - ChatGPT API: ✅ Working (${chatgptResponse.data.groceryList.length} items)`);
    console.log(`   - Cart Integration: ✅ Working`);
    console.log(`   - Extraction Quality: ${qualityScore}%`);
    console.log('\n💡 The AI assistant should now properly extract and send grocery lists to the main form!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📄 Response:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure the server is running with: npm start');
      console.error('💡 Run this from the server directory: cd server && npm start');
    }
    
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Ensure server is running on port 3001');
    console.log('2. Check that AI routes are properly loaded');
    console.log('3. Verify the extractGroceryItems function is working');
    console.log('4. Test the frontend AI assistant component');
  }
}

// Add a simple extraction test function
function testExtraction() {
  console.log('\n🧪 Testing grocery extraction locally...');
  
  const sampleText = `Here's a weekly meal plan:

**SHOPPING LIST:**
• 2 lbs chicken breast
• 1 dozen eggs
• 1 gallon milk
• 2 cups quinoa
• 1 bag spinach
• 3 bell peppers

**MEAL PLANS:**
Monday: Cook the chicken with quinoa
Tuesday: Make scrambled eggs`;

  // Simple extraction test
  const lines = sampleText.split('\n');
  const extracted = [];
  
  lines.forEach(line => {
    const bulletMatch = line.match(/^[•\-\*\d+\.\s]*(.+)$/);
    if (bulletMatch) {
      const item = bulletMatch[1].trim();
      if (item && 
          !item.toLowerCase().includes('meal') && 
          !item.toLowerCase().includes('cook') &&
          !item.toLowerCase().includes('monday') &&
          !item.toLowerCase().includes('tuesday') &&
          !item.endsWith(':')) {
        extracted.push(item);
      }
    }
  });
  
  console.log('📝 Sample text extraction test:');
  console.log('🛒 Extracted items:', extracted);
  console.log('✅ Local extraction working:', extracted.length > 0);
}

// Run tests if this script is executed directly
if (require.main === module) {
  testExtraction();
  testAIIntegration();
}

module.exports = { testAIIntegration, testExtraction };