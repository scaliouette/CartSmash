// health-check.js - Verify HulkCart setup and functionality
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🔍 HulkCart Health Check Starting...\n');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'server/package.json',
  'server/server.js',
  'client/package.json',
  'client/src/App.js',
  'client/src/GroceryListForm.js',
  'client/src/api/groceryService.js',
  '.env'
];

console.log('📁 Checking required files...');
let missingFiles = [];

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.log('\n❌ Missing files detected. Run complete-fix.js first.');
  process.exit(1);
}

// Check package.json configurations
console.log('\n📦 Checking package.json configurations...');

try {
  const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const serverPackage = JSON.parse(fs.readFileSync('server/package.json', 'utf8'));
  const clientPackage = JSON.parse(fs.readFileSync('client/package.json', 'utf8'));

  // Check root package
  if (rootPackage.scripts && rootPackage.scripts.dev) {
    console.log('✅ Root package.json has dev script');
  } else {
    console.log('❌ Root package.json missing dev script');
  }

  // Check server package
  if (serverPackage.dependencies && serverPackage.dependencies.express) {
    console.log('✅ Server has Express dependency');
  } else {
    console.log('❌ Server missing Express dependency');
  }

  // Check client package
  if (clientPackage.dependencies && clientPackage.dependencies.react) {
    console.log('✅ Client has React dependency');
  } else {
    console.log('❌ Client missing React dependency');
  }

  // Check proxy configuration
  if (clientPackage.proxy === 'http://localhost:3001') {
    console.log('✅ Client proxy correctly configured');
  } else {
    console.log('❌ Client proxy not configured correctly');
  }

} catch (error) {
  console.log('❌ Error reading package.json files:', error.message);
}

// Check .env file
console.log('\n🔧 Checking environment configuration...');
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  
  if (envContent.includes('PORT=3001')) {
    console.log('✅ Server port correctly set to 3001');
  } else {
    console.log('❌ Server port not set correctly');
  }

  if (envContent.includes('REACT_APP_API_URL=http://localhost:3001')) {
    console.log('✅ Client API URL correctly configured');
  } else {
    console.log('❌ Client API URL not configured correctly');
  }

} catch (error) {
  console.log('❌ Error reading .env file:', error.message);
}

// Check node_modules
console.log('\n📚 Checking dependencies...');

const checkDependencies = (dir, name) => {
  const nodeModulesPath = path.join(dir, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log(`✅ ${name} dependencies installed`);
    return true;
  } else {
    console.log(`❌ ${name} dependencies not installed`);
    return false;
  }
};

const rootDepsOk = checkDependencies('.', 'Root');
const serverDepsOk = checkDependencies('server', 'Server');
const clientDepsOk = checkDependencies('client', 'Client');

// Test server startup (quick check)
console.log('\n🚀 Testing server startup...');

const testServer = () => {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn('node', ['server/server.js'], {
      env: { ...process.env, PORT: '3002' }, // Use different port for testing
      stdio: 'pipe'
    });

    let output = '';
    let started = false;

    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Server running on') || output.includes('HulkCart Server')) {
        started = true;
        serverProcess.kill();
        resolve(true);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.log('Server stderr:', data.toString());
    });

    serverProcess.on('close', (code) => {
      if (started) {
        resolve(true);
      } else {
        reject(new Error(`Server failed to start. Exit code: ${code}`));
      }
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!started) {
        serverProcess.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 5000);
  });
};

testServer()
  .then(() => {
    console.log('✅ Server can start successfully');
    
    // Final health check summary
    console.log('\n🏁 Health Check Summary:');
    console.log('=====================================');
    
    const allGood = missingFiles.length === 0 && rootDepsOk && serverDepsOk && clientDepsOk;
    
    if (allGood) {
      console.log('✅ ALL SYSTEMS GO!');
      console.log('');
      console.log('🚀 Ready to start development:');
      console.log('   1. Run: npm run dev');
      console.log('   2. Open: http://localhost:3000');
      console.log('   3. API: http://localhost:3001');
      console.log('');
      console.log('💚 HulkCart is ready to SMASH through grocery lists!');
    } else {
      console.log('❌ ISSUES DETECTED');
      console.log('');
      console.log('🔧 Next steps:');
      
      if (missingFiles.length > 0) {
        console.log('   • Run: node complete-fix.js');
      }
      
      if (!rootDepsOk || !serverDepsOk || !clientDepsOk) {
        console.log('   • Run: npm run install:all');
      }
      
      console.log('   • Run health check again: node health-check.js');
    }
  })
  .catch((error) => {
    console.log('❌ Server startup test failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('   1. Check server/server.js for syntax errors');
    console.log('   2. Ensure all dependencies are installed');
    console.log('   3. Check .env file configuration');
    console.log('   4. Run: node complete-fix.js');
  });

// Test API endpoint function
async function testAPI() {
  console.log('\n🌐 Testing API endpoints...');
  
  try {
    const response = await fetch('http://localhost:3001/health');
    if (response.ok) {
      console.log('✅ Health endpoint working');
    } else {
      console.log('❌ Health endpoint not responding');
    }
  } catch (error) {
    console.log('❌ Cannot connect to server (this is expected if not running)');
  }
}

// Export for use in other scripts
module.exports = {
  checkDependencies,
  testServer,
  testAPI
};