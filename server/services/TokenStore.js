// server/services/TokenStore.js - Persistent token storage
const fs = require('fs');
const path = require('path');

class TokenStore {
  constructor() {
    this.tokensFile = path.join(__dirname, '../.tokens.json');
    this.refreshTokensFile = path.join(__dirname, '../.refresh-tokens.json');
    this.tokens = this.loadTokens(this.tokensFile);
    this.refreshTokens = this.loadTokens(this.refreshTokensFile);
    console.log('🔐 TokenStore initialized with', this.tokens.size, 'user tokens');
  }

  loadTokens(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(data);
        console.log(`📁 Loaded ${Object.keys(parsed).length} tokens from ${path.basename(filePath)}`);
        return new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.log('📁 No existing tokens found at', path.basename(filePath));
    }
    return new Map();
  }

  saveTokens() {
    try {
      // Save access tokens
      const tokenData = {};
      this.tokens.forEach((value, key) => {
        tokenData[key] = value;
      });
      fs.writeFileSync(this.tokensFile, JSON.stringify(tokenData, null, 2), 'utf8');
      
      // Save refresh tokens
      const refreshData = {};
      this.refreshTokens.forEach((value, key) => {
        refreshData[key] = value;
      });
      fs.writeFileSync(this.refreshTokensFile, JSON.stringify(refreshData, null, 2), 'utf8');
      
      console.log('💾 Tokens saved to disk');
    } catch (error) {
      console.error('❌ Failed to save tokens:', error.message);
    }
  }

  setTokens(userId, tokenInfo, refreshToken = null) {
    this.tokens.set(userId, {
      accessToken: tokenInfo.accessToken,
      expiresAt: tokenInfo.expiresAt,
      scope: tokenInfo.scope,
      savedAt: Date.now()
    });
    
    if (refreshToken) {
      this.refreshTokens.set(userId, refreshToken);
    }
    
    this.saveTokens();
    console.log(`✅ Tokens stored for user: ${userId}`);
    return tokenInfo;
  }

  getTokens(userId) {
    const token = this.tokens.get(userId);
    if (token && Date.now() < token.expiresAt) {
      return token;
    }
    return null;
  }

  getRefreshToken(userId) {
    return this.refreshTokens.get(userId);
  }

  updateTokens(userId, newTokenInfo) {
    const existing = this.tokens.get(userId);
    if (existing) {
      this.tokens.set(userId, {
        ...existing,
        ...newTokenInfo,
        updatedAt: Date.now()
      });
      this.saveTokens();
      console.log(`🔄 Tokens updated for user: ${userId}`);
    }
  }

  deleteTokens(userId) {
    this.tokens.delete(userId);
    this.refreshTokens.delete(userId);
    this.saveTokens();
    console.log(`🗑️ Tokens deleted for user: ${userId}`);
  }

  hasValidToken(userId) {
    const token = this.getTokens(userId);
    return token !== null;
  }

  getAllUsers() {
    return Array.from(this.tokens.keys());
  }

  clearAll() {
    this.tokens.clear();
    this.refreshTokens.clear();
    this.saveTokens();
    console.log('🗑️ All tokens cleared');
  }
}

// Export singleton instance
module.exports = new TokenStore();