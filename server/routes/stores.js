// server/routes/stores.js - Kroger Store Location API
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
// const KrogerOrderService = require('../services/KrogerOrderService'); // ARCHIVED - Kroger integration disabled

// const krogerService = new KrogerOrderService(); // ARCHIVED - Kroger integration disabled

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

    // Kroger service disabled - return appropriate response
    console.log(`🚫 Kroger store search disabled for user ${userId}`);

    res.status(503).json({
      success: false,
      error: 'Service unavailable',
      message: 'Kroger store search has been disabled',
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

    // Kroger service disabled - no specific error handling needed

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

    // Kroger service disabled - return appropriate response
    console.log(`🚫 Kroger store details disabled for user ${userId}, store ${storeId}`);

    res.status(503).json({
      success: false,
      error: 'Service unavailable',
      message: 'Kroger store details service has been disabled',
      storeId: storeId
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

    // Kroger service disabled - return appropriate response
    console.log(`🚫 Kroger store departments disabled for user ${userId}, store ${storeId}`);

    res.status(503).json({
      success: false,
      error: 'Service unavailable',
      message: 'Kroger store departments service has been disabled',
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