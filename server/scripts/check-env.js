#!/usr/bin/env node

// server/scripts/check-env.js - Verify environment setup
require('dotenv').config();

const requiredEnvVars = {
  // MongoDB
  'MONGODB_URI': {
    description: 'MongoDB connection string',
    example: 'mongodb+srv://user:pass@cluster.mongodb.net/db'
  },
  
  // Firebase
  'FIREBASE_PROJECT_ID': {
    description: 'Firebase project ID',
    example: 'your-project-id'
  },
  'FIREBASE_PRIVATE_KEY': {
    description: 'Firebase service account private key',
    example: '-----BEGIN PRIVATE KEY-----...'
  },
  'FIREBASE_CLIENT_EMAIL': {
    description: 'Firebase service account email',
    example: 'firebase-adminsdk@project.iam.gserviceaccount.com'
  },
  
  // Security
  'JWT_SECRET': {
    description: 'JWT signing secret (64 chars)',
    example: 'Use: openssl rand -hex 32'
  },
  
  // Kroger
  'KROGER_CLIENT_ID': {
    description: 'Kroger OAuth client ID',
    example: 'your-client-id'
  },
  'KROGER_CLIENT_SECRET': {
    description: 'Kroger OAuth client secret',
    example: 'your-client-secret'
  }
};

const optionalEnvVars = {
  'TOKEN_ENCRYPTION_KEY': {
    description: 'Token encryption key (base64)',
    example: 'Use: openssl rand -base64 32'
  },
  'SESSION_SECRET': {
    description: 'Session secret for cookies',
    example: 'random-string'
  },
  'OPENAI_API_KEY': {
    description: 'OpenAI API key',
    example: 'sk-...'
  },
  'ANTHROPIC_API_KEY': {
    description: 'Anthropic Claude API key',
    example: 'sk-ant-...'
  },
  'GOOGLE_AI_API_KEY': {
    description: 'Google AI API key',
    example: 'your-key'
  },
  'CLIENT_URL': {
    description: 'Frontend URL for CORS',
    example: 'https://cart-smash.vercel.app'
  },
  'KROGER_REDIRECT_URI': {
    description: 'Kroger OAuth callback URL',
    example: 'https://your-api.onrender.com/api/auth/kroger/callback'
  }
};

console.log('🔍 Checking environment configuration...\n');
console.log('Environment: ' + (process.env.NODE_ENV || 'development'));
console.log('=' .repeat(50) + '\n');

// Check required variables
console.log('📋 Required Environment Variables:\n');
const missing = [];
const present = [];

for (const [varName, info] of Object.entries(requiredEnvVars)) {
  if (process.env[varName]) {
    const value = process.env[varName];
    let displayValue = value.substring(0, 20);
    
    // Special handling for sensitive values
    if (varName.includes('KEY') || varName.includes('SECRET')) {
      displayValue = value.substring(0, 10) + '...';
    } else if (varName === 'MONGODB_URI') {
      displayValue = value.replace(/:([^@]+)@/, ':****@').substring(0, 40) + '...';
    }
    
    present.push(varName);
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    missing.push(varName);
    console.log(`❌ ${varName}: Missing`);
    console.log(`   ${info.description}`);
    console.log(`   Example: ${info.example}\n`);
  }
}

// Check optional variables
console.log('\n📋 Optional Environment Variables:\n');
const optionalPresent = [];
const optionalMissing = [];

for (const [varName, info] of Object.entries(optionalEnvVars)) {
  if (process.env[varName]) {
    const value = process.env[varName];
    let displayValue = value.substring(0, 20);
    
    if (varName.includes('KEY') || varName.includes('SECRET')) {
      displayValue = value.substring(0, 10) + '...';
    }
    
    optionalPresent.push(varName);
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    optionalMissing.push(varName);
    console.log(`⚠️  ${varName}: Not set (optional)`);
  }
}

// Summary
console.log('\n' + '=' .repeat(50));
console.log('📊 Summary:\n');
console.log(`Required: ${present.length}/${Object.keys(requiredEnvVars).length} configured`);
console.log(`Optional: ${optionalPresent.length}/${Object.keys(optionalEnvVars).length} configured`);

if (missing.length > 0) {
  console.log('\n⚠️  Missing required variables:', missing.join(', '));
  console.log('\n❌ Environment check failed!');
  console.log('Please set all required environment variables before deployment.');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set!');
  
  if (optionalMissing.length > 0) {
    console.log('\n💡 Consider setting these optional variables:');
    optionalMissing.forEach(v => console.log(`   - ${v}`));
  }
  
  console.log('\n🎉 Your environment is ready for deployment!');
}