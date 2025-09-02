// Kroger Modern Authentication Service - Handles Azure B2C OAuth flow
// Based on the discovery that Kroger uses login.kroger.com with Azure B2C

const axios = require('axios');
const crypto = require('crypto');
const tokenStore = require('./TokenStore');

class KrogerModernAuthService {
  constructor() {
    // Kroger's actual Azure B2C endpoints (discovered from the URL you provided)
    this.azureB2CBaseURL = 'https://login.kroger.com/eciamp.onmicrosoft.com/b2c_1a__ciam_signin_signup/oauth2/v2.0';
    this.krogerAPIBaseURL = process.env.KROGER_BASE_URL || 'https://api.kroger.com/v1';
    
    // Client configuration
    this.clientId = process.env.KROGER_CLIENT_ID;
    this.clientSecret = process.env.KROGER_CLIENT_SECRET;
    this.redirectUri = process.env.KROGER_REDIRECT_URI;
    
    // Azure B2C specific configuration (extracted from your URL)
    this.azureClientId = 'cc725f44-b50a-4be8-9295-05b5389365f4'; // From the B2C URL
    this.azureScopes = [
      'openid',
      'profile', 
      'https://eciamp.onmicrosoft.com/Login-Channel/kroger_idp_federation',
      'offline_access'
    ];
    
    // Legacy OAuth fallback - use cart.basic:rw for cart API compatibility
    this.legacyScopes = ['cart.basic:rw', 'profile.compact', 'product.compact'];
    
    // State management
    this.pendingStates = new Map();
    this.stateExpiry = 10 * 60 * 1000; // 10 minutes
    
    console.log('🔐 Kroger Modern Auth Service initialized');
    console.log(`   Azure B2C URL: ${this.azureB2CBaseURL}`);
    console.log(`   API Base URL: ${this.krogerAPIBaseURL}`);
  }

  /**
   * Generate authentication URL using Kroger's Azure B2C flow
   */
  generateModernAuthURL(userId, useAzureB2C = true) {
    const state = this.generateSecureState(userId);
    
    if (useAzureB2C) {
      return this.generateAzureB2CAuthURL(userId, state);
    } else {
      return this.generateLegacyAuthURL(userId, state);
    }
  }

  /**
   * Generate Azure B2C authentication URL (Kroger's current flow)
   */
  generateAzureB2CAuthURL(userId, state) {
    // Generate PKCE challenge for security
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    
    // Store PKCE verifier with state
    this.pendingStates.set(state, {
      userId,
      timestamp: Date.now(),
      codeVerifier,
      authType: 'azure_b2c'
    });
    
    const params = new URLSearchParams({
      client_id: this.azureClientId,
      scope: this.azureScopes.join(' '),
      redirect_uri: 'https://api.kroger.com/v1/connect/auth/signin-redirect', // Kroger's B2C redirect
      'client-request-id': crypto.randomUUID(),
      response_mode: 'fragment', // B2C uses fragment for client-side flow
      response_type: 'code',
      'x-client-SKU': 'msal.js.browser',
      'x-client-VER': '2.35.0',
      client_info: '1',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      nonce: crypto.randomUUID(),
      state: state,
      prompt: 'login',
      enable_create_account: 'true'
    });
    
    const authURL = `${this.azureB2CBaseURL}/authorize?${params.toString()}`;
    
    console.log('🔗 Generated Azure B2C auth URL for user:', userId);
    console.log('   URL length:', authURL.length);
    
    return {
      authURL,
      state,
      authType: 'azure_b2c',
      expiresIn: this.stateExpiry / 1000,
      instructions: {
        note: 'Kroger uses Azure B2C for authentication',
        flow: 'Client-side tokens via fragment response',
        redirect: 'Tokens returned in URL fragment to Kroger API'
      }
    };
  }

  /**
   * Generate legacy OAuth URL (fallback)
   */
  generateLegacyAuthURL(userId, state) {
    this.pendingStates.set(state, {
      userId,
      timestamp: Date.now(),
      authType: 'legacy_oauth'
    });
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.legacyScopes.join(' '),
      state: state
    });
    
    const authURL = `${this.krogerAPIBaseURL}/connect/oauth2/authorize?${params.toString()}`;
    
    console.log('🔗 Generated legacy OAuth URL for user:', userId);
    
    return {
      authURL,
      state,
      authType: 'legacy_oauth',
      expiresIn: this.stateExpiry / 1000
    };
  }

  /**
   * Handle authentication callback (supports both Azure B2C and legacy)
   */
  async processAuthCallback(code, state, additionalParams = {}) {
    const stateInfo = this.pendingStates.get(state);
    
    if (!stateInfo) {
      throw new Error('Invalid or expired state parameter');
    }
    
    this.pendingStates.delete(state);
    
    if (stateInfo.authType === 'azure_b2c') {
      return await this.processAzureB2CCallback(code, stateInfo, additionalParams);
    } else {
      return await this.processLegacyCallback(code, stateInfo);
    }
  }

  /**
   * Process Azure B2C callback
   */
  async processAzureB2CCallback(code, stateInfo, additionalParams) {
    try {
      console.log('🔄 Processing Azure B2C callback for user:', stateInfo.userId);
      
      // Azure B2C token exchange
      const tokenData = await this.exchangeAzureB2CCode(code, stateInfo.codeVerifier);
      
      // Store tokens in MongoDB
      await tokenStore.setTokens(stateInfo.userId, {
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        scope: tokenData.scope || this.azureScopes.join(' '),
        authType: 'azure_b2c'
      }, tokenData.refresh_token);
      
      console.log('✅ Azure B2C authentication completed for user:', stateInfo.userId);
      
      return {
        success: true,
        userId: stateInfo.userId,
        authType: 'azure_b2c',
        scope: tokenData.scope,
        expiresIn: tokenData.expires_in
      };
      
    } catch (error) {
      console.error('❌ Azure B2C callback failed:', error.message);
      throw error;
    }
  }

  /**
   * Process legacy OAuth callback
   */
  async processLegacyCallback(code, stateInfo) {
    try {
      console.log('🔄 Processing legacy OAuth callback for user:', stateInfo.userId);
      
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(`${this.krogerAPIBaseURL}/connect/oauth2/token`, 
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const tokenData = response.data;
      
      // Store tokens in MongoDB
      await tokenStore.setTokens(stateInfo.userId, {
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        scope: tokenData.scope,
        authType: 'legacy_oauth'
      }, tokenData.refresh_token);
      
      console.log('✅ Legacy OAuth authentication completed for user:', stateInfo.userId);
      
      return {
        success: true,
        userId: stateInfo.userId,
        authType: 'legacy_oauth',
        scope: tokenData.scope,
        expiresIn: tokenData.expires_in
      };
      
    } catch (error) {
      console.error('❌ Legacy OAuth callback failed:', error.message);
      throw error;
    }
  }

  /**
   * Exchange Azure B2C authorization code for tokens
   */
  async exchangeAzureB2CCode(code, codeVerifier) {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.azureClientId,
      scope: this.azureScopes.join(' '),
      code: code,
      redirect_uri: 'https://api.kroger.com/v1/connect/auth/signin-redirect',
      code_verifier: codeVerifier
    });
    
    const response = await axios.post(`${this.azureB2CBaseURL}/token`, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return response.data;
  }

  /**
   * Check if user is authenticated
   */
  async isUserAuthenticated(userId) {
    try {
      const tokenInfo = await tokenStore.getTokens(userId);
      
      if (!tokenInfo) {
        return { authenticated: false, reason: 'No tokens found' };
      }
      
      // Check expiry
      if (Date.now() >= tokenInfo.expiresAt) {
        return { authenticated: false, reason: 'Token expired' };
      }
      
      return {
        authenticated: true,
        tokenInfo: {
          scope: tokenInfo.scope,
          expiresAt: tokenInfo.expiresAt,
          authType: tokenInfo.authType || 'unknown'
        }
      };
      
    } catch (error) {
      return { authenticated: false, reason: error.message };
    }
  }

  /**
   * Generate secure state parameter
   */
  generateSecureState(userId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const data = `${userId}:${timestamp}:${random}`;
    return Buffer.from(data).toString('base64url');
  }

  /**
   * Generate PKCE code verifier
   */
  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge
   */
  generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  /**
   * Cleanup expired states
   */
  cleanup() {
    const now = Date.now();
    for (const [state, info] of this.pendingStates.entries()) {
      if (now - info.timestamp > this.stateExpiry) {
        this.pendingStates.delete(state);
      }
    }
    console.log(`🧹 Cleaned up expired auth states`);
  }

  /**
   * Get service health
   */
  getServiceHealth() {
    return {
      service: 'kroger_modern_auth',
      azureB2CEndpoint: this.azureB2CBaseURL,
      legacyEndpoint: `${this.krogerAPIBaseURL}/connect/oauth2`,
      pendingStates: this.pendingStates.size,
      configured: !!(this.clientId && this.clientSecret)
    };
  }
}

module.exports = KrogerModernAuthService;