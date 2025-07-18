// server/quick-diagnostic.js - Run this to see what's happening
const axios = require('axios');

async function quickDiagnostic() {
  console.log('🔍 Quick diagnostic for Cart Smash AI...\n');
  
  try {
    // Test Claude
    console.log('Testing Claude...');
    const claudeResponse = await axios.post('http://localhost:3001/api/ai/claude', {
      prompt: 'List 3 grocery items',
      context: 'grocery_list_generation'
    });
    
    console.log('Claude response details:');
    console.log('- Success:', claudeResponse.data.success);
    console.log('- Fallback:', claudeResponse.data.fallback);
    console.log('- Model:', claudeResponse.data.model);
    console.log('- Items found:', claudeResponse.data.groceryList?.length || 0);
    console.log('- Items:', claudeResponse.data.groceryList);
    
    // Test ChatGPT
    console.log('\nTesting ChatGPT...');
    const chatgptResponse = await axios.post('http://localhost:3001/api/ai/chatgpt', {
      prompt: 'List 3 grocery items',
      context: 'grocery_list_generation'
    });
    
    console.log('ChatGPT response details:');
    console.log('- Success:', chatgptResponse.data.success);
    console.log('- Fallback:', chatgptResponse.data.fallback);
    console.log('- Model:', chatgptResponse.data.model);
    console.log('- Items found:', chatgptResponse.data.groceryList?.length || 0);
    console.log('- Items:', chatgptResponse.data.groceryList);
    
    // Determine what needs to be done
    console.log('\n' + '='.repeat(50));
    console.log('📊 DIAGNOSIS:');
    
    const claudeFallback = claudeResponse.data.fallback;
    const chatgptFallback = chatgptResponse.data.fallback;
    
    if (claudeFallback || chatgptFallback) {
      console.log('❌ You are still using DEMO MODE');
      console.log('🔧 ACTION NEEDED: Replace your server/routes/ai.js file');
      console.log('   with the production version provided above.');
    } else {
      console.log('✅ You are using PRODUCTION MODE');
      console.log('🎉 Your APIs are working correctly!');
    }
    
    if (claudeResponse.data.groceryList?.length > 0 || chatgptResponse.data.groceryList?.length > 0) {
      console.log('✅ Grocery extraction is working');
    } else {
      console.log('❌ Grocery extraction needs improvement');
    }
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

quickDiagnostic();