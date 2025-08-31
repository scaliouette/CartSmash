// test-real-user.js
const testRealUser = async () => {
  const API_URL = 'https://cartsmash-api.onrender.com';
  const userId = 'kNTfuJTdRUXouxzSr44QoPWCNIv2'; // Your actual Firebase UID
  
  console.log('Checking auth for real user...');
  const response = await fetch(`${API_URL}/api/auth/kroger/status?userId=${userId}`);
  const data = await response.json();
  
  console.log('Auth status:', data);
  
  if (!data.authenticated) {
    console.log('\nAuthenticate at:');
    console.log(`${API_URL}/api/auth/kroger/login?userId=${userId}`);
  } else {
    console.log('✅ User is authenticated and ready!');
  }
};

testRealUser().catch(console.error);