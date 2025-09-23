// server/routes/kroger-orders.js - Express routes using your existing KrogerOrderService
const express = require('express');
const router = express.Router();

console.log('🛍️ Loading Kroger Orders routes...');

// Import your existing services
let KrogerOrderService, KrogerAuthService;
try {
  KrogerOrderService = require('../services/KrogerOrderService');
  KrogerAuthService = require('../services/KrogerAuthService');
  console.log('✅ Kroger services loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Kroger services:', error.message);
}

// Initialize services
const orderService = KrogerOrderService ? new KrogerOrderService() : null;
const authService = KrogerAuthService ? new KrogerAuthService() : null;

// Initialize async operations for services
if (orderService) {
  orderService.initialize().catch(error => {
    console.warn('⚠️ KrogerOrderService initialization failed:', error.message);
  });
}

// Middleware
const requireServices = (req, res, next) => {
  if (!orderService) {
    return res.status(503).json({
      success: false,
      error: 'Order service not available',
      message: 'KrogerOrderService failed to initialize'
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

router.use(requireServices);
router.use(getUserId);

/**
 * Health check for order service
 */
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

/**
 * Send Cart Smash to Kroger
 */
router.post('/cart/send', async (req, res) => {
  const { 
    cartItems, 
    storeId, 
    modality = 'PICKUP',
    clearExistingCart = false 
  } = req.body;

  console.log('📦 [RENDER DEBUG] Cart Send Request Received:');
  console.log(`   User ID: ${req.userId}`);
  console.log(`   Item Count: ${cartItems?.length || 0}`);
  console.log(`   Store ID: ${storeId || 'NOT_PROVIDED'}`);
  console.log(`   Modality: ${modality}`);
  console.log(`   Clear Existing: ${clearExistingCart}`);
  console.log(`   Request Headers: ${JSON.stringify({
    'user-id': req.headers['user-id'],
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent']
  }, null, 2)}`);
  console.log(`   First Item Preview: ${JSON.stringify(cartItems?.[0] || {}, null, 2)}`);
  console.log(`   Environment: NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}`);
  
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    console.error('❌ [RENDER DEBUG] Invalid cartItems array');
    return res.status(400).json({
      success: false,
      error: 'cartItems is required and must be a non-empty array'
    });
  }
  
  console.log(`🛒 [RENDER DEBUG] Sending ${cartItems.length} items to Kroger for user: ${req.userId}`);
  
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
    console.error('❌ [RENDER DEBUG] Send cart to Kroger failed - Complete Error Analysis:');
    console.error(`   Error Type: ${error.constructor.name}`);
    console.error(`   Error Message: ${error.message}`);
    console.error(`   HTTP Status: ${error.response?.status || 'NO_STATUS'}`);
    console.error(`   HTTP Status Text: ${error.response?.statusText || 'NO_STATUS_TEXT'}`);
    console.error(`   Response Headers: ${JSON.stringify(error.response?.headers || {}, null, 2)}`);
    console.error(`   Response Data: ${JSON.stringify(error.response?.data || {}, null, 2)}`);
    console.error(`   Request URL: ${error.config?.url || 'NO_URL'}`);
    console.error(`   Request Method: ${error.config?.method || 'NO_METHOD'}`);
    console.error(`   Request Headers: ${JSON.stringify(error.config?.headers || {}, null, 2)}`);
    console.error(`   Network Error: ${!error.response ? 'YES (no response)' : 'NO (response received)'}`);
    console.error(`   Error Code: ${error.code || 'NO_CODE'}`);
    console.error(`   Error Stack: ${error.stack}`);
    console.error(`   Current Time: ${new Date().toISOString()}`);
    
    // Handle specific authentication errors
    if (error.message.includes('not authenticated') || error.message.includes('REAUTHENTICATION_REQUIRED')) {
      console.error('🔐 [RENDER DEBUG] Authentication error detected - sending 401 response');
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
        message: error.message.includes('REAUTHENTICATION_REQUIRED') 
          ? error.message.split(': ')[1] 
          : 'Please complete Kroger authentication first',
        needsAuth: true,
        requiresReauth: error.message.includes('REAUTHENTICATION_REQUIRED'),
        details: error.message,
        debugInfo: {
          errorType: error.constructor.name,
          hasResponse: !!error.response,
          status: error.response?.status,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    console.error('🚨 [RENDER DEBUG] Sending 500 error response to client');
    res.status(500).json({
      success: false,
      error: 'Failed to send cart to Kroger',
      message: error.message,
      details: error.stack,
      debugInfo: {
        errorType: error.constructor.name,
        hasResponse: !!error.response,
        status: error.response?.status,
        statusText: error.response?.statusText,
        networkError: !error.response,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    });
  }
});

/**
 * Get current Kroger cart
 */
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



/**
 * Place order (checkout)
 */
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

/**
 * Get order status
 */
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

/**
 * Get order history
 */
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

/**
 * Cancel order
 */
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

/**
 * Complete workflow: Cart Smash to Kroger Order
 */
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
        authURL: '/api/auth/kroger/login'
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

/**
 * Authentication status check (for convenience)
 */
router.get('/auth/status', async (req, res) => {
  console.log(`🔍 Checking auth status for user: ${req.userId}`);
  
  try {
    let authStatus = { authenticated: false };
    
    // Use KrogerAuthService if available, otherwise fall back to KrogerOrderService
    if (authService) {
      authStatus = await authService.isUserAuthenticated(req.userId);
    } else {
      const orderHealth = orderService.getServiceHealth(req.userId);
      authStatus = {
        authenticated: orderHealth.userAuth?.authenticated || false,
        tokenInfo: orderHealth.userAuth
      };
    }
    
    res.json({
      success: true,
      userId: req.userId,
      ...authStatus,
      needsAuth: !authStatus.authenticated
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

console.log('✅ Kroger Orders routes loaded successfully');
module.exports = router;