#!/usr/bin/env node

// server/scripts/generate-keys.js - Generate secure keys for production
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating secure keys for CARTSMASH...\n');

// Generate JWT Secret (64 characters hex)
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('JWT_SECRET:');
console.log(jwtSecret);
console.log('');

// Generate Token Encryption Key (base64 encoded 32 bytes)
const encryptionKey = crypto.randomBytes(32).toString('base64');
console.log('TOKEN_ENCRYPTION_KEY:');
console.log(encryptionKey);
console.log('');

// Generate Session Secret
const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log('SESSION_SECRET:');
console.log(sessionSecret);
console.log('');

console.log('⚠️  IMPORTANT: Save these keys securely!');
console.log('Add them to your production environment variables.');
console.log('Never commit these keys to version control.\n');

// Optionally create a .env.local file (git ignored)
const promptUser = () => {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Do you want to save these to .env.local? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      const envContent = `# Generated Security Keys - ${new Date().toISOString()}
# DO NOT COMMIT THIS FILE

JWT_SECRET=${jwtSecret}
TOKEN_ENCRYPTION_KEY=${encryptionKey}
SESSION_SECRET=${sessionSecret}
`;

      const envPath = path.join(__dirname, '..', '.env.local');
      fs.writeFileSync(envPath, envContent);
      console.log(`\n✅ Keys saved to ${envPath}`);
      console.log('Remember to add .env.local to .gitignore!');
    }
    rl.close();
  });
};

promptUser();