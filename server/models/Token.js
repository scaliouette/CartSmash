// server/models/Token.js - MongoDB Schema for secure token storage
const mongoose = require('mongoose');
const crypto = require('crypto');
const Token = require('../models/Token'); 

const tokenSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    default: null
  },
  tokenType: {
    type: String,
    default: 'Bearer'
  },
  scope: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  lastRefreshed: {
    type: Date,
    default: null
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  metadata: {
    ip: String,
    userAgent: String,
    source: String
  }
}, {
  timestamps: true,
  collection: 'kroger_tokens'
});

// Encrypt token before saving
tokenSchema.pre('save', function(next) {
  if (this.isModified('accessToken')) {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET, 'base64');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(this.accessToken, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    this.accessToken = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }
  
  if (this.isModified('refreshToken') && this.refreshToken) {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET, 'base64');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(this.refreshToken, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    this.refreshToken = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }
  
  next();
});

// Decrypt token when retrieving
tokenSchema.methods.getDecryptedTokens = function() {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET, 'base64');
  
  const decryptToken = (encryptedToken) => {
    if (!encryptedToken) return null;
    
    const parts = encryptedToken.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  };
  
  return {
    accessToken: decryptToken(this.accessToken),
    refreshToken: decryptToken(this.refreshToken),
    tokenType: this.tokenType,
    scope: this.scope,
    expiresAt: this.expiresAt,
    userId: this.userId
  };
};

// Clean up expired tokens
tokenSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return result.deletedCount;
};

// Update last used timestamp
tokenSchema.methods.updateLastUsed = async function() {
  this.lastUsed = new Date();
  return this.save();
};

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;