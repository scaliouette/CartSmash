// server/test-kroger-creds.js
require('dotenv').config();
const axios = require('axios');

async function testKrogerAuth() {
  const clientId = process.env.KROGER_CLIENT_ID;
  const clientSecret = process.env.KROGER_CLIENT_SECRET;
  
  console.log('\n🧪 Testing Kroger API Credentials');
  console.log('==================================');
  console.log('Client ID:', clientId);
  console.log('Has Secret:', !!clientSecret);
  
  if (!clientId || !clientSecret) {
    console.error('❌ Missing credentials in .env file!');
    return;
  }
  
  // Create base64 credentials
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  // Test function
  async function testEndpoint(name, url) {
    console.log(`\n📍 Testing ${name}...`);
    try {
      const response = await axios.post(url, 
        'grant_type=client_credentials&scope=product.compact',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      console.log(`✅ ${name}: SUCCESS!`);
      console.log(`   Token: ${response.data.access_token.substring(0, 20)}...`);
      console.log(`   Expires: ${response.data.expires_in} seconds`);
      console.log(`   Type: ${response.data.token_type}`);
      return true;
    } catch (error) {
      console.log(`❌ ${name}: FAILED!`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${JSON.stringify(error.response.data)}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
      return false;
    }
  }
  
  // Test both environments
  const prodSuccess = await testEndpoint('PRODUCTION', 'https://api.kroger.com/v1/connect/oauth2/token');
  const certSuccess = await testEndpoint('CERTIFICATION', 'https://api-ce.kroger.com/v1/connect/oauth2/token');
  
  // Recommendation
  console.log('\n📊 RESULTS:');
  console.log('==================================');
  if (prodSuccess) {
    console.log('✅ Your app is registered for PRODUCTION');
    console.log('   Update .env: KROGER_BASE_URL=https://api.kroger.com/v1');
  } else if (certSuccess) {
    console.log('✅ Your app is registered for CERTIFICATION (testing)');
    console.log('   Update .env: KROGER_BASE_URL=https://api-ce.kroger.com/v1');
    console.log('\n⚠️  NOTE: Certification uses test accounts, not real Kroger accounts!');
    console.log('   Consider registering for Production to use real accounts.');
  } else {
    console.log('❌ Authentication failed for both environments!');
    console.log('   Check your CLIENT_ID and CLIENT_SECRET');
  }
}

testKrogerAuth();