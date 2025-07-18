// server/verify-deployment.js - Run this before going live
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

console.log('🔍 Cart Smash - Deployment Verification\n');

async function verifyDeployment() {
  const checks = [];
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
  
  // 1. Environment Variables Check
  console.log('1️⃣ Checking environment variables...');
  const envCheck = {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT
  };
  
  console.log('   Environment:', envCheck);
  checks.push({
    name: 'Environment Variables',
    passed: envCheck.ANTHROPIC_API_KEY || envCheck.OPENAI_API_KEY,
    details: 'At least one AI API key is required'
  });
  
  // 2. Dependencies Check
  console.log('\n2️⃣ Checking dependencies...');
  const packagePath = './package.json';
  let dependencies = {};
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    dependencies = {
      ...packageJson.dependencies,
      ...packageJson.optionalDependencies
    };
    
    const requiredDeps = {
      '@anthropic-ai/sdk': dependencies['@anthropic-ai/sdk'],
      'openai': dependencies['openai'],
      'express': dependencies['express'],
      'cors': dependencies['cors']
    };
    
    console.log('   Dependencies:', requiredDeps);
    checks.push({
      name: 'Dependencies',
      passed: requiredDeps['@anthropic-ai/sdk'] || requiredDeps['openai'],
      details: 'AI SDK dependencies installed'
    });
  } catch (error) {
    console.log('   ❌ Could not read package.json');
    checks.push({
      name: 'Dependencies',
      passed: false,
      details: 'Could not verify package.json'
    });
  }
  
  // 3. Server Health Check
  console.log('\n3️⃣ Checking server health...');
  try {
    const healthResponse = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('   Server status:', healthResponse.data.status);
    console.log('   APIs configured:', healthResponse.data.apis);
    
    checks.push({
      name: 'Server Health',
      passed: healthResponse.data.status === 'healthy',
      details: `Server responding at ${BASE_URL}`
    });
  } catch (error) {
    console.log('   ❌ Server not responding:', error.message);
    checks.push({
      name: 'Server Health',
      passed: false,
      details: 'Server not accessible - is it running?'
    });
    return displayResults(checks); // Exit early if server is down
  }
  
  // 4. AI Health Check
  console.log('\n4️⃣ Checking AI services...');
  try {
    const aiHealthResponse = await axios.get(`${BASE_URL}/api/ai/health`, { timeout: 5000 });
    console.log('   AI services:', aiHealthResponse.data.services);
    
    const claudeAvailable = aiHealthResponse.data.services.claude.available;
    const chatgptAvailable = aiHealthResponse.data.services.chatgpt.available;
    
    checks.push({
      name: 'AI Services',
      passed: claudeAvailable || chatgptAvailable,
      details: `Claude: ${claudeAvailable ? '✅' : '❌'}, ChatGPT: ${chatgptAvailable ? '✅' : '❌'}`
    });
  } catch (error) {
    console.log('   ❌ AI health check failed:', error.message);
    checks.push({
      name: 'AI Services',
      passed: false,
      details: 'AI endpoints not responding'
    });
  }
  
  // 5. Claude API Test
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('\n5️⃣ Testing Claude API...');
    try {
      const claudeResponse = await axios.post(`${BASE_URL}/api/ai/claude`, {
        prompt: 'Create a simple grocery list with 3 items',
        context: 'grocery_list_generation'
      }, { timeout: 30000 });
      
      const success = claudeResponse.data.success && !claudeResponse.data.fallback;
      const itemCount = claudeResponse.data.groceryList?.length || 0;
      
      console.log(`   Claude response: ${success ? '✅' : '❌'}`);
      console.log(`   Grocery items extracted: ${itemCount}`);
      console.log(`   Model: ${claudeResponse.data.model}`);
      
      checks.push({
        name: 'Claude API',
        passed: success && itemCount > 0,
        details: `Real API call successful, ${itemCount} items extracted`
      });
    } catch (error) {
      console.log('   ❌ Claude test failed:', error.response?.data?.error || error.message);
      checks.push({
        name: 'Claude API',
        passed: false,
        details: error.response?.data?.error || 'API call failed'
      });
    }
  }
  
  // 6. ChatGPT API Test
  if (process.env.OPENAI_API_KEY) {
    console.log('\n6️⃣ Testing ChatGPT API...');
    try {
      const chatgptResponse = await axios.post(`${BASE_URL}/api/ai/chatgpt`, {
        prompt: 'Create a simple grocery list with 3 items',
        context: 'grocery_list_generation'
      }, { timeout: 30000 });
      
      const success = chatgptResponse.data.success && !chatgptResponse.data.fallback;
      const itemCount = chatgptResponse.data.groceryList?.length || 0;
      
      console.log(`   ChatGPT response: ${success ? '✅' : '❌'}`);
      console.log(`   Grocery items extracted: ${itemCount}`);
      console.log(`   Model: ${chatgptResponse.data.model}`);
      
      checks.push({
        name: 'ChatGPT API',
        passed: success && itemCount > 0,
        details: `Real API call successful, ${itemCount} items extracted`
      });
    } catch (error) {
      console.log('   ❌ ChatGPT test failed:', error.response?.data?.error || error.message);
      checks.push({
        name: 'ChatGPT API',
        passed: false,
        details: error.response?.data?.error || 'API call failed'
      });
    }
  }
  
  // 7. Cart Integration Test
  console.log('\n7️⃣ Testing cart integration...');
  try {
    const testList = '2 lbs chicken breast\n1 cup quinoa\n3 bell peppers';
    const cartResponse = await axios.post(`${BASE_URL}/api/cart/parse`, {
      listText: testList,
      action: 'replace'
    }, { timeout: 10000 });
    
    const success = cartResponse.data.success;
    const itemCount = cartResponse.data.totalItems;
    
    console.log(`   Cart parsing: ${success ? '✅' : '❌'}`);
    console.log(`   Items parsed: ${itemCount}`);
    
    checks.push({
      name: 'Cart Integration',
      passed: success && itemCount > 0,
      details: `Successfully parsed ${itemCount} items`
    });
  } catch (error) {
    console.log('   ❌ Cart test failed:', error.message);
    checks.push({
      name: 'Cart Integration',
      passed: false,
      details: 'Cart parsing failed'
    });
  }
  
  // Display Results
  displayResults(checks);
}

function displayResults(checks) {
  console.log('\n' + '='.repeat(50));
  console.log('📊 DEPLOYMENT VERIFICATION RESULTS');
  console.log('='.repeat(50));
  
  const passed = checks.filter(check => check.passed).length;
  const total = checks.length;
  
  checks.forEach(check => {
    const status = check.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${check.name}`);
    if (check.details) {
      console.log(`        ${check.details}`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
  console.log(`OVERALL SCORE: ${passed}/${total} checks passed`);
  
  if (passed === total) {
    console.log('🎉 ALL CHECKS PASSED - READY FOR PRODUCTION!');
    console.log('\nNext steps:');
    console.log('1. Deploy your app to your hosting platform');
    console.log('2. Update your frontend BASE_URL if needed');
    console.log('3. Monitor API usage and costs');
    console.log('4. Set up error logging and monitoring');
  } else {
    console.log('⚠️  SOME CHECKS FAILED - NEEDS ATTENTION');
    console.log('\nFailed checks need to be resolved before deployment.');
    console.log('Refer to the setup guide for troubleshooting.');
  }
  
  console.log('='.repeat(50));
}

// Run verification
if (require.main === module) {
  verifyDeployment().catch(error => {
    console.error('💥 Verification script failed:', error.message);
    process.exit(1);
  });
}

module.exports = verifyDeployment;