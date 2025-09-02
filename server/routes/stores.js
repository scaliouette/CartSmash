// server/routes/stores.js - Kroger Store Location API
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const KrogerOrderService = require('../services/KrogerOrderService');

const krogerService = new KrogerOrderService();

// GET /api/stores - Get nearby Kroger stores
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { lat, lng, zipCode, radius = 25, limit = 20 } = req.query;

    console.log(`🏪 Store search request for user ${userId}:`, {
      lat, lng, zipCode, radius, limit
    });

    // Validate input
    if (!lat && !lng && !zipCode) {
      return res.status(400).json({
        success: false,
        error: 'Location required',
        message: 'Please provide either coordinates (lat, lng) or zipCode'
      });
    }

    // Validate coordinates if provided
    if ((lat || lng) && (!lat || !lng)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates',
        message: 'Both latitude and longitude are required'
      });
    }

    // Validate coordinate ranges
    if (lat && (lat < -90 || lat > 90)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid latitude',
        message: 'Latitude must be between -90 and 90'
      });
    }

    if (lng && (lng < -180 || lng > 180)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid longitude',
        message: 'Longitude must be between -180 and 180'
      });
    }

    // Validate ZIP code if provided
    if (zipCode && !/^\d{5}(-\d{4})?$/.test(zipCode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ZIP code',
        message: 'ZIP code must be in format 12345 or 12345-6789'
      });
    }

    // Check if user is authenticated with Kroger
    const authCheck = await krogerService.checkUserAuth(userId);
    if (!authCheck.authenticated) {
      return res.status(401).json({
        success: false,
        error: 'Kroger authentication required',
        message: 'Please connect your Kroger account first',
        authUrl: krogerService.getAuthURL(userId).authURL
      });
    }

    // Search for stores
    const stores = await krogerService.findNearbyStores({
      userId,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      zipCode,
      radius: Math.min(parseInt(radius), 50), // Max 50 mile radius
      limit: Math.min(parseInt(limit), 50)    // Max 50 stores
    });

    console.log(`✅ Found ${stores.length} stores for user ${userId}`);

    res.json({
      success: true,
      stores: stores,
      count: stores.length,
      searchCriteria: {
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        zipCode,
        radius: parseInt(radius),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Store search error:', error);

    // Handle specific error types
    if (error.message.includes('INSUFFICIENT_SCOPE')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'Please reconnect your Kroger account',
        authUrl: krogerService.getAuthURL(req.user.uid).authURL
      });
    }

    if (error.message.includes('TOKEN_EXPIRED')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication expired',
        message: 'Please reconnect your Kroger account',
        authUrl: krogerService.getAuthURL(req.user.uid).authURL
      });
    }

    res.status(500).json({
      success: false,
      error: 'Store search failed',
      message: error.message || 'Failed to search for stores'
    });
  }
});

// GET /api/stores/:storeId - Get specific store details
router.get('/:storeId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { storeId } = req.params;

    console.log(`🏪 Store details request for user ${userId}, store ${storeId}`);

    // Validate store ID
    if (!storeId || !storeId.match(/^\d{8}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID',
        message: 'Store ID must be an 8-digit number'
      });
    }

    // Check authentication
    const authCheck = await krogerService.checkUserAuth(userId);
    if (!authCheck.authenticated) {
      return res.status(401).json({
        success: false,
        error: 'Kroger authentication required',
        message: 'Please connect your Kroger account first'
      });
    }

    // Get store details
    const store = await krogerService.getStoreDetails(userId, storeId);

    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found',
        message: `Store ${storeId} not found or not accessible`
      });
    }

    console.log(`✅ Store details retrieved for ${storeId}`);

    res.json({
      success: true,
      store: store
    });

  } catch (error) {
    console.error('❌ Store details error:', error);

    res.status(500).json({
      success: false,
      error: 'Store details failed',
      message: error.message || 'Failed to get store details'
    });
  }
});

// GET /api/stores/:storeId/departments - Get store departments
router.get('/:storeId/departments', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { storeId } = req.params;

    console.log(`🏪 Store departments request for user ${userId}, store ${storeId}`);

    // Validate store ID
    if (!storeId || !storeId.match(/^\d{8}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID',
        message: 'Store ID must be an 8-digit number'
      });
    }

    // Check authentication
    const authCheck = await krogerService.checkUserAuth(userId);
    if (!authCheck.authenticated) {
      return res.status(401).json({
        success: false,
        error: 'Kroger authentication required',
        message: 'Please connect your Kroger account first'
      });
    }

    // Get store departments
    const departments = await krogerService.getStoreDepartments(userId, storeId);

    console.log(`✅ Found ${departments.length} departments for store ${storeId}`);

    res.json({
      success: true,
      departments: departments,
      count: departments.length,
      storeId: storeId
    });

  } catch (error) {
    console.error('❌ Store departments error:', error);

    res.status(500).json({
      success: false,
      error: 'Departments request failed',
      message: error.message || 'Failed to get store departments'
    });
  }
});

module.exports = router;