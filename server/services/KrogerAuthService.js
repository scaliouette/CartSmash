// server/services/KrogerAuthService.js - Enhanced OAuth2 authentication with secure token storage
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class KrogerAuthService {
  constructor() {
    this.baseURL = process.env.KROGER_BASE_URL || 'https://api-ce.kroger.com/v1';
    this.clientId = process.env.KROGER_CLIENT_ID;
    this.clientSecret = process.env.KROGER_CLIENT_SECRET;
    this.redirectUri = process.env.KROGER_REDIRECT_URI;
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    
    // Default scopes for Kroger API
    this.defaultScopes = (process.env.KROGER_OAUTH_SCOPES || 'cart.basic:write order.basic:write profile.compact').split(' ');
    
    // In-memory token storage (use Redis/Database in production)
    this.userTokens = new Map();
    this.pendingStates = new Map();
    
    // Security settings
    this.stateExpiry = 10 * 60 * 1000; // 10 minutes
    this.tokenRefreshBuffer = 5 * 60 * 1000; // Refresh 5 minutes before expiry
    
    console.log('🔐 Kroger Auth Service initialized');
  

    // TO:
    try {
      this.validateConfiguration();
    } catch (error) {
      console.warn('⚠️ Kroger OAuth not fully configured:', error.message);
      console.warn('⚠️ Routes will load but OAuth will not work until credentials are set');
    }
  }

  /**
   * Validate that all required environment variables are set
   */
  validateConfiguration() {
    const required = ['KROGER_CLIENT_ID', 'KROGER_CLIENT_SECRET', 'KROGER_REDIRECT_URI'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required Kroger OAuth configuration:', missing);
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️ Using default JWT_SECRET - set JWT_SECRET in production!');
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
        forceReauth = false,
        locale = 'en-US'
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
      
      console.log(`🔗 Generated auth URL for user ${userId} with scopes: ${scopeString}`);
      
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
  async exchangeCodeForToken(code, state, options = {}) {
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
          timeout: 10000 // 10 second timeout
        }
      );

      const tokenData = response.data;

      // Store tokens securely
      const tokenInfo = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        scope: tokenData.scope || stateInfo.scopes,
        userId: userId,
        createdAt: new Date().toISOString(),
        lastRefreshed: null
      };

      // Encrypt tokens before storage (in production, use proper encryption)
      const encryptedTokens = this.encryptTokens(tokenInfo);
      this.userTokens.set(userId, encryptedTokens);

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
          expiresAt: tokenInfo.expiresAt,
          scope: tokenInfo.scope,
          createdAt: tokenInfo.createdAt
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
      const encryptedTokens = this.userTokens.get(userId);
      if (!encryptedTokens) {
        return null;
      }

      const tokenInfo = this.decryptTokens(encryptedTokens);
      
      // Check if token needs refresh
      const needsRefresh = this.needsTokenRefresh(tokenInfo);
      
      if (needsRefresh && tokenInfo.refreshToken) {
        console.log(`🔄 Refreshing token for user ${userId}`);
        const refreshed = await this.refreshToken(userId, tokenInfo);
        if (refreshed) {
          return this.decryptTokens(this.userTokens.get(userId));
        }
      }

      // Check if token is still valid
      if (Date.now() >= tokenInfo.expiresAt) {
        console.warn(`⚠️ Token expired for user ${userId}`);
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

      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const refreshParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenInfo.refreshToken
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

      // Update token info
      const updatedTokenInfo = {
        ...tokenInfo,
        accessToken: newTokenData.access_token,
        refreshToken: newTokenData.refresh_token || tokenInfo.refreshToken, // Keep old refresh token if not provided
        expiresAt: Date.now() + (newTokenData.expires_in * 1000),
        scope: newTokenData.scope || tokenInfo.scope,
        lastRefreshed: new Date().toISOString()
      };

      // Store updated tokens
      const encryptedTokens = this.encryptTokens(updatedTokenInfo);
      this.userTokens.set(userId, encryptedTokens);

      console.log(`✅ Token refreshed successfully for user ${userId}`);
      return true;

    } catch (error) {
      console.error(`❌ Token refresh failed for user ${userId}:`, error.response?.data || error.message);
      
      // If refresh fails, remove stored tokens
      this.userTokens.delete(userId);
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
        'Authorization': `${tokenInfo.tokenType} ${tokenInfo.accessToken}`,
        'Accept': 'application/json',
        ...headers
      },
      timeout: 15000 // 15 second timeout
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
        console.warn(`🔒 Token expired for user ${userId}, removing stored tokens`);
        this.userTokens.delete(userId);
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
      const tokenInfo = await this.getValidToken(userId);
      return {
        authenticated: !!tokenInfo,
        tokenInfo: tokenInfo ? {
          expiresAt: tokenInfo.expiresAt,
          scope: tokenInfo.scope,
          hasRefreshToken: !!tokenInfo.refreshToken,
          createdAt: tokenInfo.createdAt,
          lastRefreshed: tokenInfo.lastRefreshed
        } : null
      };
    } catch (error) {
      return { authenticated: false, error: error.message };
    }
  }

  /**
   * Logout user (clear stored tokens)
   */
  logoutUser(userId) {
    console.log(`🚪 Logging out user ${userId}`);
    this.userTokens.delete(userId);
    
    // Clean up any pending states for this user
    for (const [state, stateInfo] of this.pendingStates.entries()) {
      if (stateInfo.userId === userId) {
        this.pendingStates.delete(state);
      }
    }
    
    return { success: true, message: 'User logged out successfully' };
  }

  /**
   * Security and utility methods
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

  encryptTokens(tokenInfo) {
    // Simple encryption (use proper encryption library in production)
    const cipher = crypto.createCipher('aes-256-cbc', this.jwtSecret);
    let encrypted = cipher.update(JSON.stringify(tokenInfo), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decryptTokens(encryptedData) {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.jwtSecret);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('❌ Failed to decrypt tokens:', error);
      throw new Error('Token decryption failed');
    }
  }

  /**
   * Cleanup expired states and tokens
   */
  cleanup() {
    const now = Date.now();
    
    // Clean expired states
    for (const [state, stateInfo] of this.pendingStates.entries()) {
      if (now - stateInfo.timestamp > this.stateExpiry) {
        this.pendingStates.delete(state);
      }
    }
    
    // Clean expired tokens (optional - tokens are refreshed automatically)
    for (const [userId, encryptedTokens] of this.userTokens.entries()) {
      try {
        const tokenInfo = this.decryptTokens(encryptedTokens);
        if (now >= tokenInfo.expiresAt && !tokenInfo.refreshToken) {
          this.userTokens.delete(userId);
          console.log(`🗑️ Cleaned expired token for user ${userId}`);
        }
      } catch (error) {
        // Remove corrupted token data
        this.userTokens.delete(userId);
      }
    }
    
    console.log(`🧹 Cleanup completed: ${this.pendingStates.size} pending states, ${this.userTokens.size} active tokens`);
  }

  /**
   * Get service health and statistics
   */
  getServiceHealth() {
    const activeUsers = this.userTokens.size;
    const pendingAuths = this.pendingStates.size;
    
    return {
      service: 'kroger_auth',
      status: 'active',
      configured: !!(this.clientId && this.clientSecret && this.redirectUri),
      activeUsers: activeUsers,
      pendingAuthentications: pendingAuths,
      baseURL: this.baseURL,
      redirectUri: this.redirectUri,
      defaultScopes: this.defaultScopes,
      securitySettings: {
        stateExpiryMinutes: this.stateExpiry / (60 * 1000),
        tokenRefreshBufferMinutes: this.tokenRefreshBuffer / (60 * 1000),
        encryptionEnabled: true
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = KrogerAuthService;