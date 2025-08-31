// test-kroger-auth.js
const axios = require('axios');

async function testKrogerAuth() {
  const clientId = 'cartsmashproduction-bbc7zd3f';
  const clientSecret = '5HGaUxKf1AEbhCoLlBpwbZOn82cavi2VLhVoPQws';
  const baseURL = 'https://api.kroger.com/v1';
  
  try {
    console.log('Testing Kroger client credentials...');
    
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('scope', 'product.compact');
    
    const response = await axios.post(
      `${baseURL}/connect/oauth2/token`,
      params.toString(),
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('SUCCESS! Token received:', response.data.access_token.substring(0, 20) + '...');
    console.log('Expires in:', response.data.expires_in, 'seconds');
    
  } catch (error) {
    console.error('FAILED:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('Invalid client credentials - check with Kroger');
    }
  }
}

testKrogerAuth();