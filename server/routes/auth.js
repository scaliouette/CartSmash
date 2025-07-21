// server/routes/auth.js - Express routes using your existing KrogerAuthService
const express = require('express');
const router = express.Router();

console.log('🔐 Loading auth routes...');

// Import your existing auth service
let KrogerAuthService;
try {
  KrogerAuthService = require('../services/KrogerAuthService');
  console.log('✅ KrogerAuthService loaded successfully');
} catch (error) {
  console.error('❌ Failed to load KrogerAuthService:', error.message);
}

// Initialize the service
const authService = KrogerAuthService ? new KrogerAuthService() : null;

// Middleware
const requireAuthService = (req, res, next) => {
  if (!authService) {
    return res.status(503).json({
      success: false,
      error: 'Authentication service not available',
      message: 'KrogerAuthService failed to initialize'
    });
  }
  next();
};

const getUserId = (req, res, next) => {
  req.userId = req.headers['user-id'] || 
                req.body.userId || 
                req.query.userId || 
                'demo-user';
  next();
};

router.use(requireAuthService);
router.use(getUserId);

/**
 * Health check for auth service
 */
router.get('/health', (req, res) => {
  console.log('🏥 Auth service health check');
  
  try {
    const health = authService.getServiceHealth();
    res.json({
      success: true,
      ...health,
      timestamp: new Date().toISOString()
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
 * Start Kroger OAuth2 authentication
 */
router.post('/kroger/login', (req, res) => {
  const { scopes = ['cart.basic:write', 'order.basic:write'], forceReauth = false } = req.body;
  
  console.log(`🔐 Starting Kroger OAuth for user: ${req.userId}`);
  
  try {
    // Check if user is already authenticated (unless force reauth)
    if (!forceReauth) {
      authService.isUserAuthenticated(req.userId).then(authStatus => {
        if (authStatus.authenticated) {
          return res.json({
            success: true,
            alreadyAuthenticated: true,
            message: 'User is already authenticated with Kroger',
            tokenInfo: authStatus.tokenInfo,
            suggestion: 'Use forceReauth=true to re-authenticate'
          });
        }
        
        // Generate new auth URL
        const authInfo = authService.generateAuthURL(req.userId, scopes, { forceReauth });
        
        res.json({
          success: true,
          message: 'Redirect user to authURL to complete Kroger authentication',
          ...authInfo,
          instructions: {
            step1: 'Open the authURL in a popup window',
            step2: 'User completes authentication on Kroger',
            step3: 'Kroger redirects to callback URL',
            step4: 'Popup will notify parent window of success/failure'
          }
        });
      }).catch(error => {
        // If auth check fails, just generate new auth URL
        const authInfo = authService.generateAuthURL(req.userId, scopes, { forceReauth });
        res.json({
          success: true,
          message: 'Redirect user to authURL to complete Kroger authentication',
          ...authInfo
        });
      });
    } else {
      // Force reauth - generate new auth URL
      const authInfo = authService.generateAuthURL(req.userId, scopes, { forceReauth });
      
      res.json({
        success: true,
        message: 'Redirect user to authURL to complete Kroger authentication',
        ...authInfo
      });
    }
    
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
 * Handle Kroger OAuth2 callback (serves HTML page)
 */
router.get('/kroger/callback', (req, res) => {
  const { code, state, error, error_description } = req.query;
  
  console.log('🔄 Handling Kroger OAuth callback');
  
  // Serve the callback HTML page
  const callbackHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kroger Authentication - Cart Smash</title>
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
                            if (window.opener) {
                                window.close();
                            } else {
                                window.location.href = '/';
                            }
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
router.post('/kroger/callback', async (req, res) => {
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
    
    res.json({
      success: true,
      message: 'Authentication completed successfully',
      ...result,
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
 * Logout user
 */
router.post('/kroger/logout', (req, res) => {
  console.log(`🚪 Logging out user: ${req.userId}`);
  
  try {
    const result = authService.logoutUser(req.userId);
    
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

console.log('✅ Auth routes loaded successfully');
module.exports = router;