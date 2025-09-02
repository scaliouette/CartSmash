// Kroger Azure B2C Authentication Service using existing client ID
// Attempts to use your current client ID with Azure B2C endpoints

const axios = require('axios');
const crypto = require('crypto');
const tokenStore = require('./TokenStore');

class KrogerAzureB2CService {
  constructor() {
    // Your existing client configuration
    this.clientId = process.env.KROGER_CLIENT_ID; // cartsmashproduction-bbc7zd3f
    this.clientSecret = process.env.KROGER_CLIENT_SECRET;
    this.redirectUri = process.env.KROGER_REDIRECT_URI;
    
    // Kroger's Azure B2C endpoints (discovered from your URL)
    this.azureB2CBaseURL = 'https://login.kroger.com/eciamp.onmicrosoft.com/b2c_1a__ciam_signin_signup/oauth2/v2.0';
    this.krogerAPIBaseURL = process.env.KROGER_BASE_URL || 'https://api.kroger.com/v1';
    
    // Azure B2C specific scopes (try both approaches)
    this.azureB2CScopes = [
      'openid',
      'profile',
      'https://eciamp.onmicrosoft.com/Login-Channel/kroger_idp_federation',
      'offline_access'
    ];
    
    // Your existing scopes as backup
    this.legacyScopes = ['cart.basic:rw', 'profile.compact', 'product.compact'];
    
    // State management
    this.pendingStates = new Map();
    this.stateExpiry = 15 * 60 * 1000; // 15 minutes
    
    console.log('🔐 Kroger Azure B2C Service initialized');
    console.log(`   Using your client ID: ${this.clientId}`);
    console.log(`   Azure B2C endpoint: ${this.azureB2CBaseURL}`);
    console.log(`   Redirect URI: ${this.redirectUri}`);
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  /**
   * Generate Azure B2C authentication URL using your existing client ID
   */
  generateAzureB2CAuthURL(userId, options = {}) {
    const { 
      useYourScopes = true,
      includeAzureScopes = false 
    } = options;
    
    const state = this.generateSecureState(userId);
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    const nonce = crypto.randomUUID();
    
    // Store state with PKCE verifier
    this.pendingStates.set(state, {
      userId,
      timestamp: Date.now(),
      codeVerifier,
      nonce,
      authType: 'azure_b2c_with_your_client_id'
    });
    
    // Build scopes - try your existing scopes with Azure B2C
    let scopes;
    if (useYourScopes && includeAzureScopes) {
      scopes = [...this.legacyScopes, ...this.azureB2CScopes];
    } else if (useYourScopes) {
      scopes = this.legacyScopes;
    } else {
      scopes = this.azureB2CScopes;
    }
    
    const params = new URLSearchParams({
      client_id: this.clientId, // Use YOUR client ID, not the discovered one
      scope: scopes.join(' '),
      redirect_uri: this.redirectUri, // Use YOUR redirect URI
      response_type: 'code',
      response_mode: 'query', // Use query instead of fragment for server-side handling
      state: state,
      nonce: nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'login'
    });
    
    const authURL = `${this.azureB2CBaseURL}/authorize?${params.toString()}`;
    
    console.log('🔗 Generated Azure B2C auth URL with your client ID');
    console.log(`   Client ID: ${this.clientId}`);
    console.log(`   Scopes: ${scopes.join(', ')}`);
    console.log(`   URL length: ${authURL.length} characters`);
    
    return {
      authURL,
      state,
      authType: 'azure_b2c_with_your_client_id',
      scopes: scopes.join(' '),
      expiresIn: this.stateExpiry / 1000,
      instructions: {
        flow: 'Azure B2C with your existing client ID',
        redirect: 'Query parameters (not fragment)',
        pkce: 'PKCE enabled for security'
      }
    };
  }

  /**
   * Generate hybrid auth URL - tries multiple approaches
   */
  generateHybridAuthURL(userId) {
    console.log('🔄 Generating hybrid auth URLs for testing...');
    
    const approaches = [
      {
        name: 'Azure B2C + Your Scopes',
        url: this.generateAzureB2CAuthURL(userId, { useYourScopes: true, includeAzureScopes: false })
      },
      {
        name: 'Azure B2C + Azure Scopes',
        url: this.generateAzureB2CAuthURL(userId, { useYourScopes: false, includeAzureScopes: false })
      },
      {
        name: 'Azure B2C + Combined Scopes',
        url: this.generateAzureB2CAuthURL(userId, { useYourScopes: true, includeAzureScopes: true })
      },
      {
        name: 'Legacy OAuth Fallback',
        url: this.generateLegacyAuthURL(userId)
      }
    ];
    
    return {
      primary: approaches[0],
      alternatives: approaches,
      instructions: {
        step1: 'Try primary approach first',
        step2: 'If that fails, try alternatives in order',
        step3: 'Monitor server logs for specific error messages'
      }
    };
  }

  /**
   * Generate legacy OAuth URL as fallback
   */
  generateLegacyAuthURL(userId) {
    const state = this.generateSecureState(userId);
    
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
    
    return {
      authURL,
      state,
      authType: 'legacy_oauth',
      scopes: this.legacyScopes.join(' '),
      expiresIn: this.stateExpiry / 1000
    };
  }

  /**
   * Handle authentication callback (supports both Azure B2C and legacy)
   */
  async processAuthCallback(code, state, additionalParams = {}) {
    console.log('🔄 Processing authentication callback...');
    console.log(`   Code: ${code?.substring(0, 20)}...`);
    console.log(`   State: ${state?.substring(0, 30)}...`);
    
    const stateInfo = this.pendingStates.get(state);
    
    if (!stateInfo) {
      throw new Error('Invalid or expired state parameter. Please restart authentication.');
    }
    
    // Clean up state
    this.pendingStates.delete(state);
    
    if (stateInfo.authType === 'azure_b2c_with_your_client_id') {
      return await this.processAzureB2CCallback(code, stateInfo, additionalParams);
    } else if (stateInfo.authType === 'legacy_oauth') {
      return await this.processLegacyCallback(code, stateInfo);
    } else {
      throw new Error(`Unknown auth type: ${stateInfo.authType}`);
    }
  }

  /**
   * Process Azure B2C callback with your client ID
   */
  async processAzureB2CCallback(code, stateInfo, additionalParams) {
    try {
      console.log('🔄 Processing Azure B2C callback with your client ID...');
      console.log(`   User: ${stateInfo.userId}`);
      console.log(`   Client ID: ${this.clientId}`);
      
      // Try token exchange with Azure B2C endpoints
      const tokenData = await this.exchangeAzureB2CCodeWithYourClientID(code, stateInfo.codeVerifier);
      
      console.log('✅ Azure B2C token exchange successful!');
      console.log(`   Access token received: ${!!tokenData.access_token}`);
      console.log(`   Refresh token received: ${!!tokenData.refresh_token}`);
      console.log(`   Token scope: ${tokenData.scope || 'Not provided'}`);
      
      // Store tokens in MongoDB
      await tokenStore.setTokens(stateInfo.userId, {
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        scope: tokenData.scope || 'azure_b2c_authenticated',
        authType: 'azure_b2c',
        clientId: this.clientId
      }, tokenData.refresh_token);
      
      console.log('✅ Azure B2C authentication completed successfully');
      
      return {
        success: true,
        userId: stateInfo.userId,
        authType: 'azure_b2c',
        scope: tokenData.scope,
        expiresIn: tokenData.expires_in,
        message: 'Azure B2C authentication successful with your client ID'
      };
      
    } catch (error) {
      console.error('❌ Azure B2C callback failed:', error.message);
      
      // Enhanced error logging for debugging
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      // If Azure B2C fails, try legacy as fallback
      console.log('🔄 Trying legacy OAuth fallback...');
      try {
        return await this.processLegacyCallback(code, { ...stateInfo, authType: 'legacy_oauth' });
      } catch (fallbackError) {
        console.error('❌ Legacy fallback also failed:', fallbackError.message);
        throw new Error(`Both Azure B2C and legacy OAuth failed. Azure B2C error: ${error.message}`);
      }
    }
  }

  /**
   * Exchange authorization code for tokens using Azure B2C with your client ID
   */
  async exchangeAzureB2CCodeWithYourClientID(code, codeVerifier) {
    console.log('🔄 Exchanging code for tokens via Azure B2C...');
    
    const tokenEndpoint = `${this.azureB2CBaseURL}/token`;
    
    // Try different approaches for token exchange
    const approaches = [
      {
        name: 'With client secret (confidential client)',
        params: {
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          redirect_uri: this.redirectUri,
          code_verifier: codeVerifier
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      {
        name: 'Without client secret (public client)',
        params: {
          grant_type: 'authorization_code',
          client_id: this.clientId,
          code: code,
          redirect_uri: this.redirectUri,
          code_verifier: codeVerifier
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      {
        name: 'With Basic Auth',
        params: {
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri,
          code_verifier: codeVerifier
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
        }
      }
    ];
    
    for (const approach of approaches) {
      try {
        console.log(`   Trying: ${approach.name}`);
        
        const params = new URLSearchParams(approach.params).toString();
        
        const response = await axios.post(tokenEndpoint, params, {
          headers: approach.headers,
          timeout: 10000
        });
        
        console.log(`✅ Success with: ${approach.name}`);
        return response.data;
        
      } catch (error) {
        console.log(`❌ Failed with ${approach.name}: ${error.response?.status} - ${error.message}`);
        if (error.response?.data) {
          console.log(`   Error details:`, JSON.stringify(error.response.data, null, 2));
        }
      }
    }
    
    throw new Error('All Azure B2C token exchange approaches failed');
  }

  /**
   * Process legacy OAuth callback
   */
  async processLegacyCallback(code, stateInfo) {
    try {
      console.log('🔄 Processing legacy OAuth callback...');
      
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
        authType: 'legacy_oauth',
        clientId: this.clientId
      }, tokenData.refresh_token);
      
      console.log('✅ Legacy OAuth authentication completed');
      
      return {
        success: true,
        userId: stateInfo.userId,
        authType: 'legacy_oauth',
        scope: tokenData.scope,
        expiresIn: tokenData.expires_in,
        message: 'Legacy OAuth authentication successful'
      };
      
    } catch (error) {
      console.error('❌ Legacy OAuth callback failed:', error.message);
      if (error.response?.data) {
        console.error('   Error details:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Test cart operations with stored tokens
   */
  async testCartOperationsWithStoredTokens(userId) {
    console.log('🛒 Testing cart operations with stored tokens...');
    
    try {
      // Get stored tokens
      const tokenInfo = await tokenStore.getTokens(userId);
      
      if (!tokenInfo) {
        throw new Error('No tokens found for user');
      }
      
      console.log(`   Token type: ${tokenInfo.authType}`);
      console.log(`   Token scope: ${tokenInfo.scope}`);
      console.log(`   Token expires: ${new Date(tokenInfo.expiresAt).toISOString()}`);
      
      // Test GET /carts
      console.log('   Testing GET /carts...');
      const response = await axios.get(`${this.krogerAPIBaseURL}/carts`, {
        headers: {
          'Authorization': `${tokenInfo.tokenType} ${tokenInfo.accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'CartSmash/1.0 (Azure B2C Test)'
        }
      });
      
      console.log('✅ Cart operation successful!');
      console.log(`   Status: ${response.status}`);
      console.log(`   Found ${response.data?.length || 0} carts`);
      
      return {
        success: true,
        cartsFound: response.data?.length || 0,
        authType: tokenInfo.authType
      };
      
    } catch (error) {
      console.log(`❌ Cart operation failed: ${error.response?.status} - ${error.message}`);
      
      if (error.response?.status === 403) {
        console.log('🎯 Still getting 403 - this confirms the authentication endpoint issue');
        console.log('   Your tokens are valid but may be from wrong auth system');
      } else if (error.response?.status === 401) {
        console.log('🔑 401 Unauthorized - token may be invalid or expired');
      }
      
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isUserAuthenticated(userId) {
    try {
      const tokenInfo = await tokenStore.getTokens(userId);
      
      if (!tokenInfo) {
        return { 
          authenticated: false, 
          reason: 'No tokens found',
          nextStep: 'Complete authentication flow'
        };
      }
      
      // Check expiry
      if (Date.now() >= tokenInfo.expiresAt) {
        return { 
          authenticated: false, 
          reason: 'Token expired',
          nextStep: 'Refresh token or re-authenticate'
        };
      }
      
      return {
        authenticated: true,
        tokenInfo: {
          scope: tokenInfo.scope,
          expiresAt: tokenInfo.expiresAt,
          authType: tokenInfo.authType,
          clientId: tokenInfo.clientId
        },
        nextStep: 'Ready for API operations'
      };
      
    } catch (error) {
      return { 
        authenticated: false, 
        reason: error.message,
        nextStep: 'Check system configuration'
      };
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
    let cleaned = 0;
    
    for (const [state, info] of this.pendingStates.entries()) {
      if (now - info.timestamp > this.stateExpiry) {
        this.pendingStates.delete(state);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired auth states`);
    }
  }

  /**
   * Get service health and configuration
   */
  getServiceHealth() {
    return {
      service: 'kroger_azure_b2c',
      clientId: this.clientId,
      azureB2CEndpoint: this.azureB2CBaseURL,
      legacyEndpoint: `${this.krogerAPIBaseURL}/connect/oauth2`,
      redirectUri: this.redirectUri,
      pendingStates: this.pendingStates.size,
      configured: !!(this.clientId && this.clientSecret && this.redirectUri),
      scopes: {
        legacy: this.legacyScopes,
        azureB2C: this.azureB2CScopes
      }
    };
  }

  /**
   * Cleanup when service is destroyed
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.pendingStates.clear();
    console.log('🔐 Kroger Azure B2C Service destroyed');
  }
}

module.exports = KrogerAzureB2CService;