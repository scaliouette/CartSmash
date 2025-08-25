// test-endpoints.js
const http = require('http');

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3001${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`\n✅ ${path}`);
          console.log(JSON.stringify(json, null, 2));
          resolve(json);
        } catch (e) {
          console.log(`\n❌ ${path}`);
          console.log(data);
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('🧪 Testing API Endpoints...\n');
  
  try {
    await testEndpoint('/api/kroger/health');
    await testEndpoint('/api/kroger/products/search?q=milk');
    await testEndpoint('/api/kroger/stores?zipCode=95670');
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

runTests();