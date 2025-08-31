// server/services/TokenStore.js - Production MongoDB-based token storage
const Token = require('../models/Token');

class TokenStore {
  constructor() {
    this.cache = new Map(); // In-memory cache for performance
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
    console.log('🔐 MongoDB TokenStore initialized');
    
    // Cleanup expired tokens every hour (store interval ID for proper cleanup)
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredTokens();
    }, 60 * 60 * 1000);
  }

  async setTokens(userId, tokenInfo, refreshToken = null) {
    try {
      const tokenData = {
        userId,
        accessToken: tokenInfo.accessToken,
        refreshToken: refreshToken || tokenInfo.refreshToken,
        tokenType: tokenInfo.tokenType || 'Bearer',
        scope: tokenInfo.scope || 'cart.basic:write cart.basic:rw profile.compact product.compact',
        expiresAt: new Date(tokenInfo.expiresAt || Date.now() + 3600000),
        lastRefreshed: tokenInfo.lastRefreshed || null,
        metadata: tokenInfo.metadata || {}
      };

      // Update or create token in database
      const token = await Token.findOneAndUpdate(
        { userId },
        tokenData,
        { 
          upsert: true, 
          new: true,
          runValidators: true
        }
      );

      // Update cache
      this.cache.set(userId, {
        ...tokenData,
        cacheExpiry: Date.now() + this.cacheExpiry
      });

      console.log(`✅ Tokens stored for user: ${userId}`);
      return tokenData;
    } catch (error) {
      console.error(`❌ Failed to store tokens for ${userId}:`, error);
      throw error;
    }
  }

  async getTokens(userId) {
    try {
      // Check cache first
      const cached = this.cache.get(userId);
      if (cached && cached.cacheExpiry > Date.now() && cached.expiresAt > Date.now()) {
        return cached;
      }

      // Fetch from database
      const token = await Token.findOne({ userId });
      
      if (!token) {
        return null;
      }

      // Check if token is expired
      if (token.expiresAt < new Date()) {
        await Token.deleteOne({ userId });
        this.cache.delete(userId);
        return null;
      }

      // Decrypt and cache the tokens
      const decrypted = token.getDecryptedTokens();
      
      const tokenData = {
        accessToken: decrypted.accessToken,
        refreshToken: decrypted.refreshToken,
        tokenType: decrypted.tokenType,
        scope: decrypted.scope,
        expiresAt: token.expiresAt.getTime(),
        savedAt: token.createdAt.getTime()
      };

      // Update cache
      this.cache.set(userId, {
        ...tokenData,
        cacheExpiry: Date.now() + this.cacheExpiry
      });

      // Update last used timestamp asynchronously
      token.updateLastUsed().catch(err => 
        console.error(`Failed to update last used for ${userId}:`, err)
      );

      return tokenData;
    } catch (error) {
      console.error(`❌ Failed to get tokens for ${userId}:`, error);
      return null;
    }
  }

  async getRefreshToken(userId) {
    try {
      const token = await Token.findOne({ userId });
      if (!token) return null;
      
      const decrypted = token.getDecryptedTokens();
      return decrypted.refreshToken;
    } catch (error) {
      console.error(`❌ Failed to get refresh token for ${userId}:`, error);
      return null;
    }
  }

  async updateTokens(userId, newTokenInfo) {
    try {
      const token = await Token.findOne({ userId });
      if (!token) {
        throw new Error('Token not found for user');
      }

      Object.assign(token, newTokenInfo);
      await token.save();

      // Clear cache to force refresh
      this.cache.delete(userId);
      
      console.log(`🔄 Tokens updated for user: ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update tokens for ${userId}:`, error);
      return false;
    }
  }

  async deleteTokens(userId) {
    try {
      await Token.deleteOne({ userId });
      this.cache.delete(userId);
      console.log(`🗑️ Tokens deleted for user: ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete tokens for ${userId}:`, error);
      return false;
    }
  }

  async hasValidToken(userId) {
    const tokens = await this.getTokens(userId);
    return tokens !== null && tokens.expiresAt > Date.now();
  }

  async getAllUsers() {
    try {
      const tokens = await Token.find({}, 'userId').lean();
      return tokens.map(t => t.userId);
    } catch (error) {
      console.error('❌ Failed to get all users:', error);
      return [];
    }
  }

  async cleanupExpiredTokens() {
    try {
      const count = await Token.cleanupExpired();
      
      // Clear expired cache entries
      for (const [userId, cached] of this.cache.entries()) {
        if (cached.expiresAt < Date.now()) {
          this.cache.delete(userId);
        }
      }
      
      if (count > 0) {
        console.log(`🧹 Cleaned up ${count} expired tokens`);
      }
      return count;
    } catch (error) {
      console.error('❌ Failed to cleanup tokens:', error);
      return 0;
    }
  }

  async getStats() {
    try {
      const total = await Token.countDocuments();
      const expired = await Token.countDocuments({ 
        expiresAt: { $lt: new Date() } 
      });
      const active = total - expired;
      
      return {
        total,
        active,
        expired,
        cached: this.cache.size
      };
    } catch (error) {
      console.error('❌ Failed to get stats:', error);
      return { total: 0, active: 0, expired: 0, cached: 0 };
    }
  }

  clearCache() {
    this.cache.clear();
    console.log('🗑️ Token cache cleared');
  }

  /**
   * Cleanup method to clear intervals and prevent memory leaks
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🧹 TokenStore cleanup interval cleared');
    }
  }
}

// Export singleton instance
module.exports = new TokenStore();