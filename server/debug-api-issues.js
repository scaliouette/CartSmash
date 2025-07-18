// server/debug-api-issues.js - Get detailed error information
require('dotenv').config(); // Add this line to load .env file
const axios = require('axios');

async function debugAPIIssues() {
  console.log('🔍 Debugging API issues in detail...\n');
  
  // Test Claude with detailed error handling
  console.log('1️⃣ Testing Claude API in detail...');
  try {
    const claudeResponse = await axios.post('http://localhost:3001/api/ai/claude', {
      prompt: 'List 3 grocery items',
      context: 'grocery_list_generation'
    }, { timeout: 30000 });
    
    console.log('✅ Claude Success!');
    console.log('Response:', claudeResponse.data);
    
  } catch (error) {
    console.log('❌ Claude Error Details:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
    console.log('Message:', error.message);
    
    if (error.response?.status === 401) {
      console.log('🔧 ACTION: Check your ANTHROPIC_API_KEY format');
      console.log('   Should start with: sk-ant-');
    } else if (error.response?.status === 400) {
      console.log('🔧 ACTION: Check Claude model name or request format');
    } else if (error.response?.status === 404) {
      console.log('🔧 ACTION: Model not found - try claude-3-haiku-20240307 instead');
    }
  }
  
  // Wait a bit before testing ChatGPT to avoid rate limits
  console.log('\n⏳ Waiting 5 seconds before testing ChatGPT...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('\n2️⃣ Testing ChatGPT API in detail...');
  try {
    const chatgptResponse = await axios.post('http://localhost:3001/api/ai/chatgpt', {
      prompt: 'List 3 grocery items',
      context: 'grocery_list_generation'
    }, { timeout: 30000 });
    
    console.log('✅ ChatGPT Success!');
    console.log('Response:', chatgptResponse.data);
    
  } catch (error) {
    console.log('❌ ChatGPT Error Details:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
    console.log('Message:', error.message);
    
    if (error.response?.status === 429) {
      console.log('🔧 ACTION: Rate limit exceeded');
      console.log('   - Wait 1 minute and try again');
      console.log('   - Or add billing to your OpenAI account');
      console.log('   - Check usage at: https://platform.openai.com/usage');
    } else if (error.response?.status === 401) {
      console.log('🔧 ACTION: Check your OPENAI_API_KEY format');
      console.log('   Should start with: sk-');
    } else if (error.response?.status === 402) {
      console.log('🔧 ACTION: Billing required');
      console.log('   Add a payment method at: https://platform.openai.com/account/billing');
    }
  }
  
  // Test simple API key validation
  console.log('\n3️⃣ API Key Validation...');
  
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  
  console.log('Anthropic Key:', anthropicKey ? `${anthropicKey.substring(0, 15)}...` : 'Not set');
  console.log('OpenAI Key:', openaiKey ? `${openaiKey.substring(0, 15)}...` : 'Not set');
  
  if (anthropicKey && !anthropicKey.startsWith('sk-ant-')) {
    console.log('⚠️ Anthropic key format looks wrong - should start with sk-ant-');
  }
  
  if (openaiKey && !openaiKey.startsWith('sk-')) {
    console.log('⚠️ OpenAI key format looks wrong - should start with sk-');
  }
}

debugAPIIssues().catch(console.error);