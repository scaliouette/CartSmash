// server/routes/kroger-orders.js - Complete Kroger ordering workflow
const express = require('express');
const router = express.Router();

console.log('🛍️ Loading Kroger Order routes...');

// Import services
let KrogerOrderService;
try {
  KrogerOrderService = require('../services/KrogerOrderService');
  console.log('✅ Kroger Order Service loaded');
} catch (error) {
  console.error('❌ Kroger Order Service not found:', error.message);
}

// Initialize order service
const orderService = KrogerOrderService ? new KrogerOrderService() : null;

// Middleware to check if order service is available
const requireOrderService = (req, res, next) => {
  if (!orderService) {
    return res.status(503).json({
      success: false,
      error: 'Kroger Order Service not available',
      message: 'Please ensure KrogerOrderService is properly configured'
    });
  }
  next();
};

// Middleware to extract user ID (modify based on your auth system)
const getUserId = (req, res, next) => {
  // Get user ID from various sources
  const userId = req.headers['user-id'] || 
                req.body.userId || 
                req.query.userId || 
                req.session?.userId ||
                'demo-user'; // Fallback for testing
  
  req.userId = userId;
  next();
};

// Apply middleware to all routes
router.use(requireOrderService);
router.use(getUserId);

// Health check for order service
router.get('/health', (req, res) => {
  console.log('🏥 Kroger Order Service health check');
  
  try {
    const health = orderService.getServiceHealth(req.userId);
    
    res.json({
      success: true,
      ...health,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Order service health check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Step 1: Get Kroger authentication URL
router.post('/auth/start', (req, res) => {
  const { scopes = ['cart.basic:write', 'order.basic:write'] } = req.body;
  
  console.log(`🔐 Starting Kroger auth for user: ${req.userId}`);
  
  try {
    const authInfo = orderService.getAuthURL(req.userId, scopes);
    
    res.json({
      success: true,
      authURL: authInfo.authURL,
      state: authInfo.state,
      expiresIn: authInfo.expiresIn,
      instructions: 'Redirect user to authURL to complete Kroger authentication',
      callbackURL: process.env.KROGER_REDIRECT_URI
    });
    
  } catch (error) {
    console.error('❌ Auth start failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate auth URL',
      message: error.message
    });
  }
});

// Step 2: Handle Kroger auth callback
router.post('/auth/callback', async (req, res) => {
  const { code, state } = req.body;
  
  if (!code || !state) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: code and state'
    });
  }
  
  console.log(`🔄 Processing auth callback for user: ${req.userId}`);
  
  try {
    const tokenResult = await orderService.exchangeCodeForToken(code, state, req.userId);
    
    res.json({
      success: true,
      message: 'Authentication successful',
      ...tokenResult,
      userId: req.userId
    });
    
  } catch (error) {
    console.error('❌ Auth callback failed:', error);
    res.status(400).json({
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }
});

// Step 3: Send Smart Cart to Kroger
router.post('/cart/send', async (req, res) => {
  const { 
    cartItems, 
    storeId, 
    modality = 'PICKUP',
    clearExistingCart = false 
  } = req.body;
  
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'cartItems is required and must be a non-empty array'
    });
  }
  
  console.log(`🛒 Sending ${cartItems.length} items to Kroger for user: ${req.userId}`);
  
  try {
    const result = await orderService.sendCartToKroger(req.userId, cartItems, {
      storeId,
      modality,
      clearExistingCart
    });
    
    res.json({
      success: true,
      message: `Successfully sent ${result.itemsAdded} items to Kroger cart`,
      ...result
    });
    
  } catch (error) {
    console.error('❌ Send cart to Kroger failed:', error);
    
    // Handle specific authentication errors
    if (error.message.includes('not authenticated')) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated with Kroger',
        message: 'Please complete Kroger authentication first',
        needsAuth: true
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to send cart to Kroger',
      message: error.message
    });
  }
});

// Step 4: Get current Kroger cart
router.get('/cart', async (req, res) => {
  console.log(`🛒 Getting Kroger cart for user: ${req.userId}`);
  
  try {
    const cart = await orderService.getUserCart(req.userId);
    
    const cartSummary = {
      cartId: cart.data?.id,
      itemCount: cart.data?.items?.length || 0,
      items: cart.data?.items || [],
      total: cart.data?.total,
      modality: cart.data?.modality,
      storeId: cart.data?.storeId
    };
    
    res.json({
      success: true,
      cart: cartSummary,
      rawCart: cart.data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Get Kroger cart failed:', error);
    
    if (error.message.includes('not authenticated')) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated with Kroger',
        needsAuth: true
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to get Kroger cart',
      message: error.message
    });
  }
});

// Step 5: Place order (checkout)
router.post('/orders/place', async (req, res) => {
  const {
    storeId,
    modality = 'PICKUP',
    paymentMethod,
    pickupTime,
    deliveryAddress,
    customerInfo
  } = req.body;
  
  console.log(`🛍️ Placing order for user: ${req.userId}`);
  
  try {
    const orderDetails = {
      storeId,
      modality,
      paymentMethod,
      pickupTime,
      deliveryAddress,
      customerInfo
    };
    
    const orderResult = await orderService.placeOrder(req.userId, orderDetails);
    
    res.json({
      success: true,
      message: 'Order placed successfully',
      order: orderResult,
      nextSteps: {
        trackOrder: `/api/kroger-orders/orders/${orderResult.orderId}`,
        orderHistory: '/api/kroger-orders/orders/history'
      }
    });
    
  } catch (error) {
    console.error('❌ Order placement failed:', error);
    
    if (error.message.includes('not authenticated')) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated with Kroger',
        needsAuth: true
      });
    }
    
    res.status(400).json({
      success: false,
      error: 'Order placement failed',
      message: error.message
    });
  }
});

// Step 6: Get order status
router.get('/orders/:orderId', async (req, res) => {
  const { orderId } = req.params;
  
  console.log(`📋 Getting order status: ${orderId} for user: ${req.userId}`);
  
  try {
    const orderStatus = await orderService.getOrderStatus(req.userId, orderId);
    
    res.json({
      success: true,
      order: orderStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Get order status failed:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        orderId: orderId
      });
    }
    
    if (error.message.includes('not authenticated')) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated with Kroger',
        needsAuth: true
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to get order status',
      message: error.message
    });
  }
});

// Get order history
router.get('/orders/history', async (req, res) => {
  const { limit = 10 } = req.query;
  
  console.log(`📜 Getting order history for user: ${req.userId}`);
  
  try {
    const history = await orderService.getOrderHistory(req.userId, parseInt(limit));
    
    res.json({
      success: true,
      orderHistory: history,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Get order history failed:', error);
    
    if (error.message.includes('not authenticated')) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated with Kroger',
        needsAuth: true
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to get order history',
      message: error.message
    });
  }
});

// Cancel order
router.post('/orders/:orderId/cancel', async (req, res) => {
  const { orderId } = req.params;
  const { reason = 'Customer request' } = req.body;
  
  console.log(`❌ Cancelling order: ${orderId} for user: ${req.userId}`);
  
  try {
    const cancelResult = await orderService.cancelOrder(req.userId, orderId, reason);
    
    res.json({
      success: true,
      message: 'Order cancelled successfully',
      cancellation: cancelResult
    });
    
  } catch (error) {
    console.error('❌ Order cancellation failed:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        orderId: orderId
      });
    }
    
    if (error.response?.status === 409) {
      return res.status(409).json({
        success: false,
        error: 'Order cannot be cancelled',
        message: 'Order may already be processed or completed'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order',
      message: error.message
    });
  }
});

// Complete workflow: Smart Cart to Kroger Order
router.post('/workflow/complete', async (req, res) => {
  const {
    cartItems,
    storeId,
    modality = 'PICKUP',
    orderDetails = {},
    autoPlaceOrder = false
  } = req.body;
  
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'cartItems is required and must be a non-empty array'
    });
  }
  
  console.log(`🚀 Starting complete workflow for user: ${req.userId}`);
  
  try {
    const workflow = {
      steps: [],
      startTime: Date.now(),
      success: false
    };
    
    // Step 1: Send cart to Kroger
    console.log('📦 Step 1: Sending cart to Kroger...');
    const cartResult = await orderService.sendCartToKroger(req.userId, cartItems, {
      storeId,
      modality,
      clearExistingCart: true
    });
    
    workflow.steps.push({
      step: 'send_cart',
      success: true,
      result: cartResult,
      timestamp: new Date().toISOString()
    });
    
    // Step 2: Get updated cart to verify
    console.log('🔍 Step 2: Verifying cart...');
    const verifiedCart = await orderService.getUserCart(req.userId);
    
    workflow.steps.push({
      step: 'verify_cart',
      success: true,
      itemCount: verifiedCart.data?.items?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    // Step 3: Place order if requested
    let orderResult = null;
    if (autoPlaceOrder) {
      console.log('🛍️ Step 3: Placing order...');
      orderResult = await orderService.placeOrder(req.userId, {
        storeId,
        modality,
        ...orderDetails
      });
      
      workflow.steps.push({
        step: 'place_order',
        success: true,
        orderId: orderResult.orderId,
        timestamp: new Date().toISOString()
      });
    }
    
    workflow.success = true;
    workflow.completionTime = Date.now() - workflow.startTime;
    
    const response = {
      success: true,
      message: autoPlaceOrder ? 
        'Cart sent and order placed successfully' : 
        'Cart sent to Kroger successfully',
      workflow: workflow,
      cart: cartResult,
      krogerCart: verifiedCart.data,
      order: orderResult,
      summary: {
        itemsProcessed: cartItems.length,
        itemsAdded: cartResult.itemsAdded,
        itemsFailed: cartResult.itemsFailed,
        orderPlaced: !!orderResult,
        orderId: orderResult?.orderId
      }
    };
    
    if (orderResult) {
      response.nextSteps = {
        trackOrder: `/api/kroger-orders/orders/${orderResult.orderId}`,
        orderHistory: '/api/kroger-orders/orders/history'
      };
    } else {
      response.nextSteps = {
        viewCart: '/api/kroger-orders/cart',
        placeOrder: '/api/kroger-orders/orders/place'
      };
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Complete workflow failed:', error);
    
    if (error.message.includes('not authenticated')) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated with Kroger',
        message: 'Please complete Kroger authentication first',
        needsAuth: true,
        authURL: '/api/kroger-orders/auth/start'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Workflow failed',
      message: error.message,
      completedSteps: req.workflowSteps || []
    });
  }
});

// Authentication status check
router.get('/auth/status', (req, res) => {
  console.log(`🔐 Checking auth status for user: ${req.userId}`);
  
  try {
    const health = orderService.getServiceHealth(req.userId);
    
    res.json({
      success: true,
      userId: req.userId,
      authenticated: health.userAuth?.authenticated || false,
      authInfo: health.userAuth,
      needsAuth: !health.userAuth?.authenticated
    });
    
  } catch (error) {
    console.error('❌ Auth status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check auth status',
      message: error.message
    });
  }
});

// Logout (clear tokens)
router.post('/auth/logout', (req, res) => {
  console.log(`🚪 Logging out user: ${req.userId}`);
  
  try {
    orderService.clearUserTokens(req.userId);
    
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

// Test endpoint for development
router.post('/test/flow', async (req, res) => {
  const { step = 'auth', testData = {} } = req.body;
  
  console.log(`🧪 Testing Kroger order flow: ${step}`);
  
  try {
    let result;
    
    switch (step) {
      case 'auth':
        result = orderService.getAuthURL(req.userId);
        break;
        
      case 'cart':
        result = await orderService.getUserCart(req.userId);
        break;
        
      case 'send':
        const mockItems = testData.items || [
          { productName: 'Milk', quantity: 1, upc: '123456789' },
          { productName: 'Bread', quantity: 2, upc: '987654321' }
        ];
        result = await orderService.sendCartToKroger(req.userId, mockItems, {
          storeId: testData.storeId
        });
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid test step',
          validSteps: ['auth', 'cart', 'send']
        });
    }
    
    res.json({
      success: true,
      step: step,
      result: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Test ${step} failed:`, error);
    res.status(500).json({
      success: false,
      step: step,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

console.log('✅ Kroger Order routes loaded successfully');
module.exports = router;