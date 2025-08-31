// server/services/KrogerAuthService.js - Production OAuth2 with MongoDB token storage
const axios = require('axios');
const crypto = require('crypto');
const tokenStore = require('./TokenStore');
const config = require('../config');

class KrogerAuthService {
  constructor() {
    // Load configuration dynamically based on environment
    this.loadConfiguration();
    
    // Pending OAuth states (temporary storage)
    this.pendingStates = new Map();
    
    // Security settings
    this.stateExpiry = 10 * 60 * 1000; // 10 minutes
    this.tokenRefreshBuffer = 5 * 60 * 1000; // Refresh 5 minutes before expiry
    
    // Cleanup expired states every hour (store interval ID for proper cleanup)
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000);
    
    console.log('🔐 Kroger Auth Service initialized');
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    console.log(`   API Endpoint: ${this.baseURL}`);
    
    try {
      this.validateConfiguration();
    } catch (error) {
      console.warn('⚠️ Kroger OAuth not fully configured:', error.message);
    }
  }

  loadConfiguration() {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    // Use CE API for development, production API for production
    this.baseURL = isDevelopment 
      ? 'https://api.kroger.com/v1'
      : (process.env.KROGER_BASE_URL || 'https://api.kroger.com/v1');
    
    // Use appropriate credentials based on environment
    this.clientId = process.env.KROGER_CLIENT_ID;
    this.clientSecret = process.env.KROGER_CLIENT_SECRET;
    
    // Dynamic redirect URI based on environment
    this.redirectUri = isDevelopment
      ? 'http://localhost:3001/api/auth/kroger/callback'
      : 'https://cartsmash-api.onrender.com/api/auth/kroger/callback';
    
    // Override with env variable if set
    if (process.env.KROGER_REDIRECT_URI) {
      this.redirectUri = process.env.KROGER_REDIRECT_URI;
    }
    
    // Default scopes - OAuth portal requires cart.basic:rw
    this.defaultScopes = (process.env.KROGER_OAUTH_SCOPES || 'cart.basic:rw profile.compact product.compact').split(' ');
    
    // Encryption key for state tokens
    this.encryptionKey = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET;
    
    if (!this.encryptionKey || this.encryptionKey.length < 32) {
      console.warn('⚠️ Encryption key too short or missing - generate with: openssl rand -base64 32');
    }
  }

  validateConfiguration() {
    const required = ['clientId', 'clientSecret', 'redirectUri'];
    const missing = [];
    
    if (!this.clientId) missing.push('KROGER_CLIENT_ID');
    if (!this.clientSecret) missing.push('KROGER_CLIENT_SECRET');
    if (!this.redirectUri) missing.push('KROGER_REDIRECT_URI');
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    console.log('✅ Kroger OAuth configuration validated');
  }

  /**
   * Generate authorization URL for user authentication
   */
  generateAuthURL(userId, scopes = null, options = {}) {
    try {
      const {
        customState = null,
        forceReauth = false
      } = options;

      // Generate secure state parameter
      const state = customState || this.generateSecureState(userId);
      const scopeString = (scopes || this.defaultScopes).join(' ');
      
      // Store state with expiry for security
      this.pendingStates.set(state, {
        userId: userId,
        timestamp: Date.now(),
        scopes: scopeString,
        forceReauth: forceReauth
      });

      // Build OAuth2 authorization URL
      const authParams = new URLSearchParams({
        response_type: 'code',
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        scope: scopeString,
        state: state
      });

      // Add optional parameters
      if (forceReauth) {
        authParams.append('prompt', 'consent');
      }

      const authURL = `${this.baseURL}/connect/oauth2/authorize?${authParams.toString()}`;
      
      console.log(`🔗 Generated auth URL for user ${userId}`);
      console.log(`   Scopes: ${scopeString}`);
      console.log(`🔍 [AUTH DEBUG] OAUTH URL ANALYSIS:`);
      console.log(`   Base URL: ${this.baseURL}`);
      console.log(`   Client ID: ${this.clientId}`);
      console.log(`   Redirect URI: ${this.redirectUri}`);
      console.log(`   Full auth URL: ${authURL}`);
      console.log(`   URL Length: ${authURL.length} characters`);
      
      return {
        authURL: authURL,
        state: state,
        scopes: scopeString,
        expiresIn: this.stateExpiry / 1000, // Convert to seconds
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Failed to generate auth URL:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code, state) {
    try {
      console.log('🔄 Exchanging authorization code for tokens...');

      // Validate state parameter
      const stateInfo = this.validateState(state);
      if (!stateInfo) {
        throw new Error('Invalid or expired state parameter');
      }

      const userId = stateInfo.userId;

      // Prepare token exchange request
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri
      });

      const response = await axios.post(
        `${this.baseURL}/connect/oauth2/token`,
        tokenParams.toString(),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );

      const tokenData = response.data;

      // Store tokens in MongoDB via TokenStore
      await tokenStore.setTokens(userId, {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        scope: tokenData.scope || stateInfo.scopes,
        metadata: {
          source: 'kroger_oauth',
          ip: stateInfo.ip,
          userAgent: stateInfo.userAgent
        }
      }, tokenData.refresh_token);

      // Clean up used state
      this.pendingStates.delete(state);

      console.log(`✅ Token exchange successful for user ${userId}`);

      return {
        success: true,
        userId: userId,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope,
        hasRefreshToken: !!tokenData.refresh_token,
        tokenInfo: {
          expiresAt: Date.now() + (tokenData.expires_in * 1000),
          scope: tokenData.scope,
          createdAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Token exchange failed:', error.response?.data || error.message);
      
      if (error.response?.status === 400) {
        throw new Error('Invalid authorization code or expired request');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid client credentials');
      } else {
        throw new Error('Token exchange failed: ' + (error.response?.data?.error_description || error.message));
      }
    }
  }

  /**
   * Get valid access token for user (refresh if needed)
   */
  async getValidToken(userId) {
    try {
      // Get tokens from MongoDB
      const tokenInfo = await tokenStore.getTokens(userId);
      
      if (!tokenInfo) {
        return null;
      }
      
      // Check if token needs refresh
      const needsRefresh = this.needsTokenRefresh(tokenInfo);
      
      if (needsRefresh && tokenInfo.refreshToken) {
        console.log(`🔄 Token needs refresh for user ${userId}`);
        const refreshed = await this.refreshToken(userId, tokenInfo);
        if (refreshed) {
          return await tokenStore.getTokens(userId);
        }
      }

      // Check if token is still valid
      if (Date.now() >= tokenInfo.expiresAt) {
        console.warn(`⚠️ Token expired for user ${userId}`);
        await tokenStore.deleteTokens(userId);
        return null;
      }

      return tokenInfo;

    } catch (error) {
      console.error(`❌ Failed to get valid token for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(userId, tokenInfo) {
    try {
      console.log(`🔄 Refreshing access token for user ${userId}`);

      const refreshToken = tokenInfo.refreshToken || await tokenStore.getRefreshToken(userId);
      
      if (!refreshToken) {
        console.error(`❌ No refresh token available for user ${userId}`);
        return false;
      }

      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const refreshParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      const response = await axios.post(
        `${this.baseURL}/connect/oauth2/token`,
        refreshParams.toString(),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );

      const newTokenData = response.data;

      // Update tokens in MongoDB
      await tokenStore.setTokens(userId, {
        accessToken: newTokenData.access_token,
        refreshToken: newTokenData.refresh_token || refreshToken,
        tokenType: newTokenData.token_type || 'Bearer',
        expiresAt: Date.now() + (newTokenData.expires_in * 1000),
        scope: newTokenData.scope || tokenInfo.scope,
        lastRefreshed: new Date().toISOString(),
        metadata: tokenInfo.metadata
      }, newTokenData.refresh_token || refreshToken);

      console.log(`✅ Token refreshed successfully for user ${userId}`);
      return true;

    } catch (error) {
      console.error(`❌ Token refresh failed for user ${userId}:`, error.response?.data || error.message);
      
      // If refresh fails, remove stored tokens
      await tokenStore.deleteTokens(userId);
      return false;
    }
  }

  /**
   * Make authenticated API request for user
   */
  async makeAuthenticatedRequest(userId, method, endpoint, data = null, headers = {}) {
    const tokenInfo = await this.getValidToken(userId);
    
    if (!tokenInfo) {
      throw new Error('User not authenticated or token expired');
    }

    const config = {
      method: method.toUpperCase(),
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Authorization': `${tokenInfo.tokenType || 'Bearer'} ${tokenInfo.accessToken}`,
        'Accept': 'application/json',
        ...headers
      },
      timeout: 15000
    };

    if (data) {
      config.headers['Content-Type'] = 'application/json';
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      // Handle token expiry
      if (error.response?.status === 401) {
        console.warn(`🔒 Token expired for user ${userId}, attempting refresh...`);
        
        // Try to refresh token
        const refreshed = await this.refreshToken(userId, tokenInfo);
        if (refreshed) {
          // Retry the request with new token
          const newTokenInfo = await tokenStore.getTokens(userId);
          config.headers['Authorization'] = `${newTokenInfo.tokenType || 'Bearer'} ${newTokenInfo.accessToken}`;
          const retryResponse = await axios(config);
          return retryResponse.data;
        }
        
        throw new Error('Authentication expired, please re-authenticate');
      }
      
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isUserAuthenticated(userId) {
    try {
      console.log(`🔍 [AUTH DEBUG] Checking authentication for user: ${userId}`);
      const hasToken = await tokenStore.hasValidToken(userId);
      console.log(`🔍 [AUTH DEBUG] hasValidToken result: ${hasToken}`);
      
      if (!hasToken) {
        return { authenticated: false };
      }
      
      const tokenInfo = await tokenStore.getTokens(userId);
      console.log(`🔍 [AUTH DEBUG] Retrieved token info:`, {
        hasToken: !!tokenInfo,
        scope: tokenInfo?.scope,
        expiresAt: tokenInfo?.expiresAt ? new Date(tokenInfo.expiresAt).toISOString() : null,
        tokenType: tokenInfo?.tokenType,
        isExpired: tokenInfo?.expiresAt ? tokenInfo.expiresAt <= Date.now() : null
      });
      
      return {
        authenticated: true,
        tokenInfo: {
          expiresAt: tokenInfo.expiresAt,
          scope: tokenInfo.scope,
          hasRefreshToken: !!tokenInfo.refreshToken,
          createdAt: tokenInfo.createdAt || tokenInfo.savedAt,
          lastRefreshed: tokenInfo.lastRefreshed
        }
      };
    } catch (error) {
      console.error(`Error checking auth for ${userId}:`, error);
      return { authenticated: false, error: error.message };
    }
  }

  /**
   * Logout user (clear stored tokens)
   */
  async logoutUser(userId) {
    console.log(`🚪 Logging out user ${userId}`);
    
    await tokenStore.deleteTokens(userId);
    
    // Clean up any pending states for this user
    for (const [state, stateInfo] of this.pendingStates.entries()) {
      if (stateInfo.userId === userId) {
        this.pendingStates.delete(state);
      }
    }
    
    return { success: true, message: 'User logged out successfully' };
  }

  /**
   * Security utility methods
   */
  generateSecureState(userId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const payload = `${userId}:${timestamp}:${random}`;
    return Buffer.from(payload).toString('base64url');
  }

  validateState(state) {
    const stateInfo = this.pendingStates.get(state);
    
    if (!stateInfo) {
      console.warn('⚠️ Invalid state parameter received');
      return null;
    }
    
    // Check if state has expired
    if (Date.now() - stateInfo.timestamp > this.stateExpiry) {
      console.warn('⚠️ Expired state parameter received');
      this.pendingStates.delete(state);
      return null;
    }
    
    return stateInfo;
  }

  needsTokenRefresh(tokenInfo) {
    return Date.now() >= (tokenInfo.expiresAt - this.tokenRefreshBuffer);
  }

  /**
   * Cleanup expired states
   */
  cleanup() {
    const now = Date.now();
    let cleanedStates = 0;
    
    // Clean expired states
    for (const [state, stateInfo] of this.pendingStates.entries()) {
      if (now - stateInfo.timestamp > this.stateExpiry) {
        this.pendingStates.delete(state);
        cleanedStates++;
      }
    }
    
    if (cleanedStates > 0) {
      console.log(`🧹 Cleaned ${cleanedStates} expired OAuth states`);
    }
  }

  /**
   * Get service health and statistics
   */
  async getServiceHealth() {
    const stats = await tokenStore.getStats();
    
    return {
      service: 'kroger_auth',
      status: 'active',
      environment: process.env.NODE_ENV,
      configured: !!(this.clientId && this.clientSecret && this.redirectUri),
      activeUsers: stats.active || 0,
      pendingAuthentications: this.pendingStates.size,
      baseURL: this.baseURL,
      redirectUri: this.redirectUri,
      defaultScopes: this.defaultScopes,
      securitySettings: {
        stateExpiryMinutes: this.stateExpiry / (60 * 1000),
        tokenRefreshBufferMinutes: this.tokenRefreshBuffer / (60 * 1000),
        encryptionEnabled: true,
        usingMongoDB: true
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cleanup method to clear intervals and prevent memory leaks
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🧹 KrogerAuthService cleanup interval cleared');
    }
  }
}

module.exports = KrogerAuthService;