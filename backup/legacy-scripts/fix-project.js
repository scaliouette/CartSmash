// fix-project.js - Run this script to automatically fix all issues
// Usage: node fix-project.js

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting HulkCart project fixes...\n');

// Step 1: Remove duplicate files
console.log('📁 Removing duplicate files...');
const duplicateFiles = [
  'App.js',
  'index.js', 
  'server.js'
];

duplicateFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`✅ Removed duplicate: ${file}`);
  }
});

// Step 2: Update server/server.js with correct port and regex
console.log('\n🔧 Updating server/server.js...');
const serverJsPath = path.join(__dirname, 'server', 'server.js');
if (fs.existsSync(serverJsPath)) {
  let serverContent = fs.readFileSync(serverJsPath, 'utf8');
  
  // Fix port
  serverContent = serverContent.replace(
    /const PORT = process\.env\.PORT \|\| 3000;/,
    'const PORT = process.env.PORT || 3001;'
  );
  
  // Fix regex
  serverContent = serverContent.replace(
    /line\.replace\(\/\[-\*\]\\\\s\*\//,
    'line.replace(/^[-*•]\\s*/'
  );
  
  fs.writeFileSync(serverJsPath, serverContent);
  console.log('✅ Updated server/server.js');
} else {
  console.log('❌ server/server.js not found');
}

// Step 3: Update client/src/App.js with correct port
console.log('\n🔧 Updating client/src/App.js...');
const clientAppPath = path.join(__dirname, 'client', 'src', 'App.js');
if (fs.existsSync(clientAppPath)) {
  let appContent = fs.readFileSync(clientAppPath, 'utf8');
  
  // Fix API URL
  appContent = appContent.replace(
    /http:\/\/localhost:3000\/api/g,
    'http://localhost:3001/api'
  );
  
  fs.writeFileSync(clientAppPath, appContent);
  console.log('✅ Updated client/src/App.js');
} else {
  console.log('❌ client/src/App.js not found');
}

// Step 4: Check and create missing directories
console.log('\n📁 Checking project structure...');
const requiredDirs = [
  'server',
  'client',
  'client/src',
  'client/public'
];

requiredDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Step 5: Update package.json scripts
console.log('\n🔧 Updating package.json scripts...');
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Update scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    "dev": "concurrently \"npm run server:dev\" \"npm run client:dev\"",
    "server:dev": "cd server && npm run dev",
    "client:dev": "cd client && npm start",
    "install:all": "npm install && cd server && npm install && cd client && npm install"
  };
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Updated root package.json');
}

// Step 6: Check server package.json
console.log('\n🔧 Checking server package.json...');
const serverPackageJsonPath = path.join(__dirname, 'server', 'package.json');
if (fs.existsSync(serverPackageJsonPath)) {
  const serverPackageJson = JSON.parse(fs.readFileSync(serverPackageJsonPath, 'utf8'));
  
  // Ensure required dependencies
  const requiredDeps = {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  };
  
  const requiredDevDeps = {
    "nodemon": "^2.0.22"
  };
  
  serverPackageJson.dependencies = { ...requiredDeps, ...serverPackageJson.dependencies };
  serverPackageJson.devDependencies = { ...requiredDevDeps, ...serverPackageJson.devDependencies };
  
  // Ensure scripts
  serverPackageJson.scripts = {
    ...serverPackageJson.scripts,
    "start": "node server.js",
    "dev": "nodemon server.js"
  };
  
  fs.writeFileSync(serverPackageJsonPath, JSON.stringify(serverPackageJson, null, 2));
  console.log('✅ Updated server package.json');
}

// Step 7: Create .env file if it doesn't exist
console.log('\n🔧 Setting up environment file...');
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  const envContent = `# HulkCart Environment Variables
NODE_ENV=development
PORT=3001

# Database (for future use)
DATABASE_URL=postgresql://user:password@localhost:5432/hulkcart

# Redis (for future use)
REDIS_URL=redis://localhost:6379

# Instacart API (for future use)
INSTACART_API_KEY=your_api_key_here

# Security
JWT_SECRET=your_jwt_secret_here
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file');
}

console.log('\n✨ All fixes completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Run: npm run install:all');
console.log('2. Run: npm run dev');
console.log('3. Open client at: http://localhost:3000');
console.log('4. Server API at: http://localhost:3001');
console.log('\n🎉 HulkCart is ready to smash through grocery lists!');