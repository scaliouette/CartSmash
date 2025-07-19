// server/routes/auth.js - Enhanced OAuth2 authentication routes
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

console.log('🔐 Loading enhanced authentication routes...');

// Import services
let KrogerAuthService;
try {
  KrogerAuthService = require('../services/KrogerAuthService');
  console.log('✅ Kroger Auth Service loaded');
} catch (error) {
  console.error('❌ Kroger Auth Service not found:', error.message);
}

// Initialize auth service
const authService = KrogerAuthService ? new KrogerAuthService() : null;

// Rate limiting for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware to check if auth service is available
const requireAuthService = (req, res, next) => {
  if (!authService) {
    return res.status(503).json({
      success: false,
      error: 'Authentication service not available',
      message: 'Please ensure Kroger Auth Service is properly configured'
    });
  }
  next();
};

// Middleware to extract and validate user ID
const getUserId = (req, res, next) => {
  const userId = req.headers['user-id'] || 
                req.body.userId || 
                req.query.userId || 
                req.session?.userId ||
                req.user?.id || // If using passport or similar
                'demo-user'; // Fallback for development
  
  if (!userId || userId.length < 1) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required',
      message: 'Please provide a valid user identifier'
    });
  }
  
  req.userId = userId;
  next();
};

// Apply middleware
router.use(requireAuthService);
router.use(getUserId);

// Run periodic cleanup every 30 minutes
setInterval(() => {
  if (authService) {
    authService.cleanup();
  }
}, 30 * 60 * 1000);

/**
 * Health check for authentication service
 */
router.get('/health', (req, res) => {
  console.log('🏥 Auth service health check');
  
  try {
    const health = authService.getServiceHealth();
    
    res.json({
      success: true,
      ...health
    });
    
  } catch (error) {
    console.error('❌ Auth health check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Start Kroger OAuth2 authentication flow
 */
router.post('/kroger/login', authRateLimit, async (req, res) => {
  const {
    scopes = null,
    forceReauth = false,
    returnUrl = null
  } = req.body;
  
  console.log(`🔐 Starting Kroger OAuth for user: ${req.userId}`);
  
  try {
    // Check if user is already authenticated (unless force reauth)
    if (!forceReauth) {
      const authStatus = await authService.isUserAuthenticated(req.userId);
      if (authStatus.authenticated) {
        return res.json({
          success: true,
          alreadyAuthenticated: true,
          message: 'User is already authenticated with Kroger',
          tokenInfo: authStatus.tokenInfo,
          suggestion: 'Use forceReauth=true to re-authenticate'
        });
      }
    }
    
    // Generate OAuth2 authorization URL
    const authInfo = authService.generateAuthURL(req.userId, scopes, {
      forceReauth: forceReauth
    });
    
    // Store return URL in session if provided
    if (returnUrl && req.session) {
      req.session.krogerReturnUrl = returnUrl;
    }
    
    res.json({
      success: true,
      message: 'Redirect user to authURL to complete Kroger authentication',
      ...authInfo,
      instructions: {
        step1: 'Redirect user to the provided authURL',
        step2: 'User completes authentication on Kroger',
        step3: 'Kroger redirects to callback URL with authorization code',
        step4: 'Call /auth/kroger/callback to exchange code for tokens'
      }
    });
    
  } catch (error) {
    console.error('❌ Auth start failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start authentication',
      message: error.message
    });
  }
});

/**
 * Handle Kroger OAuth2 callback
 */
router.get('/kroger/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  
  console.log(`🔄 Handling Kroger OAuth callback`);
  
  // Serve the callback HTML page that will process the authentication
  const callbackHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kroger Authentication - Smart Cart</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }

            .auth-container {
                background: white;
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                text-align: center;
                max-width: 500px;
                width: 90%;
            }

            .logo { font-size: 48px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; }
            .subtitle { color: #666; margin-bottom: 30px; line-height: 1.5; }

            .status {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 20px;
                font-weight: 500;
            }

            .status.processing {
                background: #fef3c7;
                color: #d97706;
                border: 1px solid #fbbf24;
            }

            .status.success {
                background: #dcfce7;
                color: #16a34a;
                border: 1px solid #22c55e;
            }

            .status.error {
                background: #fef2f2;
                color: #dc2626;
                border: 1px solid #ef4444;
            }

            .spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #d97706;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .action-button {
                background: #3b82f6;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s;
                margin: 10px;
            }

            .action-button:hover { background: #2563eb; }
        </style>
    </head>
    <body>
        <div class="auth-container">
            <div class="logo">🏪</div>
            <h1 class="title">Kroger Authentication</h1>
            <p class="subtitle">Processing your Kroger account connection...</p>

            <div id="status" class="status processing">
                <div class="spinner"></div>
                <span id="status-text">Verifying authentication...</span>
            </div>

            <div id="actions" style="display: none;">
                <button id="close-button" class="action-button">Close Window</button>
            </div>
        </div>

        <script>
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const error = urlParams.get('error');
            const errorDescription = urlParams.get('error_description');

            async function processAuth() {
                const statusEl = document.getElementById('status');
                const statusTextEl = document.getElementById('status-text');
                const actionsEl = document.getElementById('actions');

                if (error) {
                    // Handle OAuth error
                    statusEl.className = 'status error';
                    statusEl.innerHTML = '<span style="font-size: 24px;">❌</span><span>Authentication failed: ' + (errorDescription || error) + '</span>';
                    
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'KROGER_AUTH_ERROR',
                            error: errorDescription || error
                        }, window.location.origin);
                    }
                    
                    actionsEl.style.display = 'block';
                    return;
                }

                if (!code || !state) {
                    statusEl.className = 'status error';
                    statusEl.innerHTML = '<span style="font-size: 24px;">❌</span><span>Invalid authentication response</span>';
                    actionsEl.style.display = 'block';
                    return;
                }

                try {
                    // Process the authorization code
                    const response = await fetch('/api/auth/kroger/callback', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'User-ID': localStorage.getItem('userId') || 'demo-user'
                        },
                        body: JSON.stringify({ code, state })
                    });

                    const result = await response.json();

                    if (result.success) {
                        statusEl.className = 'status success';
                        statusEl.innerHTML = '<span style="font-size: 24px;">✅</span><span>Authentication successful!</span>';
                        
                        if (window.opener) {
                            window.opener.postMessage({
                                type: 'KROGER_AUTH_SUCCESS',
                                code: code,
                                state: state,
                                result: result
                            }, window.location.origin);
                        }

                        setTimeout(() => {
                            window.close();
                        }, 3000);

                    } else {
                        throw new Error(result.message || 'Authentication failed');
                    }

                } catch (error) {
                    statusEl.className = 'status error';
                    statusEl.innerHTML = '<span style="font-size: 24px;">❌</span><span>Processing failed: ' + error.message + '</span>';
                    
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'KROGER_AUTH_ERROR',
                            error: error.message
                        }, window.location.origin);
                    }
                }

                actionsEl.style.display = 'block';
            }

            document.getElementById('close-button').onclick = () => {
                if (window.opener) {
                    window.close();
                } else {
                    window.location.href = '/';
                }
            };

            // Start processing when page loads
            processAuth();
        </script>
    </body>
    </html>
  `;
  
  res.send(callbackHTML);
});

/**
 * Process OAuth2 callback (API endpoint)
 */
router.post('/kroger/callback', authRateLimit, async (req, res) => {
  const { code, state } = req.body;
  
  if (!code || !state) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters',
      message: 'Both code and state parameters are required'
    });
  }
  
  console.log(`🔄 Processing OAuth callback for user: ${req.userId}`);
  
  try {
    const result = await authService.exchangeCodeForToken(code, state);
    
    // Get return URL from session
    const returnUrl = req.session?.krogerReturnUrl;
    if (returnUrl) {
      delete req.session.krogerReturnUrl;
    }
    
    res.json({
      success: true,
      message: 'Authentication completed successfully',
      ...result,
      returnUrl: returnUrl,
      nextSteps: {
        makeAuthenticatedRequests: 'Use the stored tokens to make API calls',
        checkStatus: '/api/auth/kroger/status',
        placeOrder: '/api/kroger-orders/workflow/complete'
      }
    });
    
  } catch (error) {
    console.error('❌ OAuth callback processing failed:', error);
    res.status(400).json({
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }
});

/**
 * Check authentication status
 */
router.get('/kroger/status', async (req, res) => {
  console.log(`🔍 Checking auth status for user: ${req.userId}`);
  
  try {
    const authStatus = await authService.isUserAuthenticated(req.userId);
    
    res.json({
      success: true,
      userId: req.userId,
      ...authStatus
    });
    
  } catch (error) {
    console.error('❌ Auth status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check authentication status',
      message: error.message
    });
  }
});

/**
 * Refresh user tokens
 */
router.post('/kroger/refresh', authRateLimit, async (req, res) => {
  console.log(`🔄 Refreshing tokens for user: ${req.userId}`);
  
  try {
    const tokenInfo = await authService.getValidToken(req.userId);
    
    if (!tokenInfo) {
      return res.status(401).json({
        success: false,
        error: 'No valid tokens found',
        message: 'User needs to re-authenticate'
      });
    }
    
    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      tokenInfo: {
        expiresAt: tokenInfo.expiresAt,
        scope: tokenInfo.scope,
        lastRefreshed: tokenInfo.lastRefreshed
      }
    });
    
  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      message: error.message
    });
  }
});

/**
 * Logout user
 */
router.post('/kroger/logout', (req, res) => {
  console.log(`🚪 Logging out user: ${req.userId}`);
  
  try {
    const result = authService.logoutUser(req.userId);
    
    // Clear session data
    if (req.session) {
      delete req.session.krogerReturnUrl;
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully',
      userId: req.userId
    });
    
  } catch (error) {
    console.error('❌ Logout failed:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message
    });
  }
});

/**
 * Test authenticated API call
 */
router.get('/kroger/test', async (req, res) => {
  const { endpoint = '/profile' } = req.query;
  
  console.log(`🧪 Testing authenticated API call for user: ${req.userId}`);
  
  try {
    const result = await authService.makeAuthenticatedRequest(
      req.userId, 
      'GET', 
      endpoint
    );
    
    res.json({
      success: true,
      endpoint: endpoint,
      result: result,
      message: 'Authenticated API call successful'
    });
    
  } catch (error) {
    console.error('❌ Test API call failed:', error);
    
    if (error.message.includes('not authenticated')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please authenticate with Kroger first',
        authUrl: '/api/auth/kroger/login'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'API call failed',
      message: error.message
    });
  }
});

/**
 * Get authentication statistics (admin only)
 */
router.get('/stats', (req, res) => {
  // In production, add admin authentication check here
  
  console.log('📊 Auth statistics requested');
  
  try {
    const health = authService.getServiceHealth();
    
    res.json({
      success: true,
      ...health,
      endpoints: [
        'POST /auth/kroger/login',
        'GET /auth/kroger/callback',
        'POST /auth/kroger/callback', 
        'GET /auth/kroger/status',
        'POST /auth/kroger/refresh',
        'POST /auth/kroger/logout',
        'GET /auth/kroger/test'
      ]
    });
    
  } catch (error) {
    console.error('❌ Stats request failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error.message
    });
  }
});

console.log('✅ Enhanced authentication routes loaded');
module.exports = router;