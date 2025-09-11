#!/usr/bin/env node

// server/scripts/test-mongodb.js - Test MongoDB connection
const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 Testing MongoDB Connection...\n');

const testConnection = async () => {
  try {
    // Parse connection string to hide password
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable not set');
    }
    
    const hiddenUri = uri.replace(/:([^@]+)@/, ':****@');
    console.log(`Connecting to: ${hiddenUri}\n`);

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ MongoDB connection successful!\n');
    console.log(`✅ Database: ${mongoose.connection.db.databaseName}`);
    console.log(`✅ Host: ${mongoose.connection.host}`);
    console.log(`✅ Port: ${mongoose.connection.port}`);
    console.log(`✅ Ready State: ${mongoose.connection.readyState}`);
    
    // Test creating a document
    const Token = require('../models/Token');
    console.log('\n📝 Testing Token model...');
    
    const testToken = new Token({
      userId: 'test-user-' + Date.now(),
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      tokenType: 'Bearer',
      scope: 'test',
      expiresAt: new Date(Date.now() + 3600000)
    });
    
    await testToken.save();
    console.log('✅ Test token created successfully');
    console.log(`   Document ID: ${testToken._id}`);
    
    // Test retrieving the token
    const retrieved = await Token.findOne({ userId: testToken.userId });
    console.log('✅ Test token retrieved successfully');
    
    // Test decryption
    const decrypted = retrieved.getDecryptedTokens();
    console.log('✅ Token encryption/decryption working');
    
    // Clean up
    await Token.deleteOne({ userId: testToken.userId });
    console.log('✅ Test token deleted successfully');
    
    // Get collection stats
    const stats = await Token.collection.stats();
    console.log(`\n📊 Collection Stats:`);
    console.log(`   Documents: ${stats.count}`);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   Indexes: ${stats.nindexes}`);
    
    console.log('\n🎉 MongoDB connection test successful!');
    console.log('Your database is ready for production.');
    
  } catch (error) {
    console.error('\n❌ MongoDB connection test failed:');
    console.error(error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('\n⚠️  Check your username and password in MONGODB_URI');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n⚠️  Check your cluster address in MONGODB_URI');
    } else if (error.message.includes('whitelist')) {
      console.error('\n⚠️  Add your IP address to MongoDB Atlas Network Access');
      console.error('   For Render deployment, add 0.0.0.0/0');
    } else if (error.message.includes('MONGODB_URI')) {
      console.error('\n⚠️  Set MONGODB_URI in your .env file');
      console.error('   Example: mongodb+srv://username:password@cluster.mongodb.net/database');
    }
    
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n👋 Connection closed');
    }
    process.exit(0);
  }
};

testConnection();