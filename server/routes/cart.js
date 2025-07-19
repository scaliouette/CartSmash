// server/routes/cart.js - Enhanced cart routes with Kroger API integration
const express = require('express');
const router = express.Router();

console.log('🛒 Loading Enhanced Cart routes with Kroger integration...');

// Import services
let AIProductParser, KrogerAPIService;
try {
  AIProductParser = require('../utils/aiProductParser');
  console.log('✅ AI Product Parser loaded');
} catch (error) {
  console.warn('⚠️ AI Product Parser not found, using fallback parsing');
}

try {
  KrogerAPIService = require('../services/KrogerAPIService');
  console.log('✅ Kroger API Service loaded');
} catch (error) {
  console.warn('⚠️ Kroger API Service not found, continuing without Kroger integration');
}

// Initialize services
const productParser = AIProductParser ? new AIProductParser() : null;
const krogerService = KrogerAPIService ? new KrogerAPIService() : null;

// Simple in-memory storage (in production, use a database)
let cart = [];
let cartMetadata = {
  lastModified: new Date().toISOString(),
  totalItems: 0,
  estimatedValue: 0,
  validationStatus: 'pending'
};

// Enhanced parse grocery list with AI intelligence + Kroger validation
router.post('/parse', async (req, res) => {
  console.log('📝 Enhanced cart parse request received');
  const { 
    listText, 
    action = 'replace', 
    userId = null, 
    options = {} 
  } = req.body;
  
  if (!listText) {
    return res.status(400).json({ 
      success: false,
      error: 'listText is required' 
    });
  }
  
  const startTime = Date.now();
  
  try {
    // Step 1: 🎯 Intelligent AI Parsing
    console.log('🎯 Starting intelligent product parsing...');
    let parsingResults;
    
    if (productParser) {
      parsingResults = await productParser.parseGroceryProducts(listText, {
        context: 'cart_parsing',
        strictMode: options.strictMode !== false,
        userId: userId
      });
    } else {
      // Fallback to simple parsing
      parsingResults = await parseGroceryItemsSimple(listText, userId);
    }
    
    console.log(`✅ AI parsing complete: ${parsingResults.products?.length || parsingResults.length} items extracted`);
    
    // Step 2: 🏪 Kroger Validation Enhancement
    let enhancedItems = parsingResults.products || parsingResults;
    let krogerStats = {
      enabled: false,
      validatedItems: 0,
      totalPrice: 0,
      averageConfidence: 0,
      processingTime: 0
    };
    
    if (krogerService && options.enableKrogerValidation !== false) {
      console.log('🏪 Enhancing with Kroger validation...');
      const krogerStartTime = Date.now();
      
      try {
        const itemNames = enhancedItems.map(item => 
          item.productName || item.itemName || item.name
        );
        
        // Batch validate with Kroger
        const krogerValidation = await krogerService.batchValidateItems(itemNames, {
          locationId: options.storeLocationId || process.env.KROGER_DEFAULT_STORE,
          includePricing: true,
          fuzzyMatch: true
        });
        
        // Merge Kroger results with AI parsing
        enhancedItems = enhancedItems.map((item, index) => {
          const krogerResult = krogerValidation.items[index];
          const validation = krogerResult?.validation || { isValid: false, confidence: 0 };
          
          // Calculate combined confidence (AI 60%, Kroger 40%)
          const aiConfidence = item.confidence || 0.5;
          const krogerConfidence = validation.confidence || 0;
          const combinedConfidence = (aiConfidence * 0.6) + (krogerConfidence * 0.4);
          
          return {
            ...item,
            
            // Original AI data
            aiConfidence: aiConfidence,
            aiFactors: item.factors,
            
            // Kroger validation data
            krogerValidation: validation,
            isKrogerValidated: validation.isValid,
            krogerConfidence: krogerConfidence,
            krogerProduct: validation.product,
            
            // Enhanced product data
            realPrice: validation.product?.price || null,
            salePrice: validation.product?.salePrice || null,
            brand: validation.product?.brand || item.brand,
            size: validation.product?.size || item.size,
            upc: validation.product?.upc || null,
            imageUrl: validation.product?.imageUrl || null,
            availability: validation.product?.availability || 'unknown',
            storeId: validation.product?.storeId || options.storeLocationId,
            
            // Combined metrics
            confidence: combinedConfidence,
            validationSources: ['ai', validation.isValid ? 'kroger' : null].filter(Boolean),
            
            // Suggestions for improvement
            suggestions: validation.alternatives || [],
            needsReview: combinedConfidence < 0.6 || (!validation.isValid && aiConfidence < 0.8)
          };
        });
        
        // Calculate Kroger statistics
        const validatedItems = enhancedItems.filter(item => item.isKrogerValidated);
        krogerStats = {
          enabled: true,
          validatedItems: validatedItems.length,
          validationRate: enhancedItems.length > 0 ? 
            (validatedItems.length / enhancedItems.length * 100).toFixed(1) + '%' : '0%',
          totalPrice: enhancedItems.reduce((sum, item) => {
            if (item.realPrice) {
              return sum + (item.realPrice * (parseFloat(item.quantity) || 1));
            }
            return sum;
          }, 0),
          averageConfidence: krogerValidation.summary?.averageConfidence || 0,
          processingTime: Date.now() - krogerStartTime,
          storeId: options.storeLocationId || process.env.KROGER_DEFAULT_STORE
        };
        
        console.log(`✅ Kroger validation complete: ${krogerStats.validatedItems}/${enhancedItems.length} items validated`);
        
      } catch (krogerError) {
        console.warn('⚠️ Kroger validation failed, using AI-only results:', krogerError.message);
        krogerStats.enabled = false;
        krogerStats.error = krogerError.message;
      }
    }
    
    // Step 3: 🔧 Convert to Cart Format
    const cartItems = enhancedItems.map((item, index) => ({
      id: item.id || `item_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      original: item.original || listText.split('\n')[index] || '',
      itemName: item.productName || item.itemName || 'Unknown Item',
      productName: item.productName || item.itemName || 'Unknown Item',
      quantity: parseFloat(item.quantity) || 1,
      unit: item.unit || null,
      category: item.category || 'other',
      
      // Confidence and validation
      confidence: item.confidence || 0.5,
      aiConfidence: item.aiConfidence || item.confidence || 0.5,
      isKrogerValidated: item.isKrogerValidated || false,
      krogerConfidence: item.krogerConfidence || 0,
      validationSources: item.validationSources || ['ai'],
      
      // Product details
      brand: item.brand || null,
      size: item.size || null,
      upc: item.upc || null,
      imageUrl: item.imageUrl || null,
      
      // Pricing
      realPrice: item.realPrice || null,
      salePrice: item.salePrice || null,
      estimatedPrice: item.estimatedPrice || null,
      
      // Availability
      availability: item.availability || 'unknown',
      storeId: item.storeId || null,
      
      // Metadata
      factors: item.factors || [],
      suggestions: item.suggestions || [],
      needsReview: item.needsReview || false,
      timestamp: item.timestamp || new Date().toISOString(),
      userId: userId,
      addedBy: krogerStats.enabled ? 'enhanced_ai_kroger_parser' : 'ai_parser',
      parsingMethod: krogerStats.enabled ? 'intelligent_with_kroger' : 'intelligent'
    }));
    
    // Step 4: 🛒 Update Cart Based on Action
    let previousCartSize = cart.length;
    
    if (action === 'replace') {
      cart = cartItems;
    } else if (action === 'merge') {
      // Smart merge - avoid duplicates by product name
      const existingNames = cart.map(item => 
        (item.productName || item.itemName || '').toLowerCase().trim()
      );
      
      const newItems = cartItems.filter(item => {
        const productName = (item.productName || '').toLowerCase().trim();
        return !existingNames.includes(productName);
      });
      
      cart = [...cart, ...newItems];
    }
    
    // Step 5: 📊 Update Cart Metadata
    cartMetadata = {
      lastModified: new Date().toISOString(),
      totalItems: cart.length,
      estimatedValue: cart.reduce((sum, item) => {
        const price = item.realPrice || item.estimatedPrice || 0;
        return sum + (price * item.quantity);
      }, 0),
      validationStatus: krogerStats.enabled ? 'kroger_validated' : 'ai_validated',
      lastParsingMethod: krogerStats.enabled ? 'intelligent_with_kroger' : 'intelligent'
    };
    
    // Step 6: 📈 Generate Statistics
    const parsingStats = productParser ? 
      productParser.getParsingStats(parsingResults) : 
      generateSimpleStats(cartItems);
    
    const qualityMetrics = {
      highConfidenceItems: cartItems.filter(item => item.confidence >= 0.8).length,
      mediumConfidenceItems: cartItems.filter(item => item.confidence >= 0.6 && item.confidence < 0.8).length,
      needsReviewItems: cartItems.filter(item => item.needsReview).length,
      pricingAvailable: cartItems.filter(item => item.realPrice).length,
      categoriesFound: [...new Set(cartItems.map(item => item.category))].length,
      averageConfidence: cartItems.length > 0 ? 
        cartItems.reduce((sum, item) => sum + item.confidence, 0) / cartItems.length : 0
    };
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Enhanced parsing complete in ${processingTime}ms: ${cartItems.length} items processed`);
    
    // Step 7: 📤 Send Enhanced Response
    res.json({
      success: true,
      cart: cart,
      action: action,
      
      // Parsing information
      parsing: {
        method: krogerStats.enabled ? 'intelligent_with_kroger' : 'intelligent',
        itemsExtracted: cartItems.length,
        itemsAdded: action === 'replace' ? cartItems.length : cart.length - previousCartSize,
        totalProcessingTime: processingTime,
        stats: parsingStats
      },
      
      // Kroger integration results
      kroger: krogerStats,
      
      // Quality assessment
      quality: qualityMetrics,
      
      // Cart summary
      summary: {
        totalItems: cart.length,
        estimatedTotal: cartMetadata.estimatedValue > 0 ? 
          `$${cartMetadata.estimatedValue.toFixed(2)}` : null,
        validationRate: qualityMetrics.highConfidenceItems > 0 ? 
          (qualityMetrics.highConfidenceItems / cart.length * 100).toFixed(1) + '%' : '0%',
        needsReview: qualityMetrics.needsReviewItems
      },
      
      // Metadata
      metadata: cartMetadata,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Enhanced parsing failed:', error);
    
    // Fallback to simple parsing
    try {
      console.log('🔄 Falling back to simple parsing...');
      const fallbackItems = parseGroceryItemsSimple(listText, userId);
      
      if (action === 'replace') {
        cart = fallbackItems;
      } else if (action === 'merge') {
        const existingNames = cart.map(item => 
          (item.itemName || '').toLowerCase().trim()
        );
        const newItems = fallbackItems.filter(item => 
          !existingNames.includes((item.itemName || '').toLowerCase().trim())
        );
        cart = [...cart, ...newItems];
      }
      
      cartMetadata.lastModified = new Date().toISOString();
      cartMetadata.totalItems = cart.length;
      cartMetadata.validationStatus = 'fallback_parsed';
      
      res.json({
        success: true,
        cart: cart,
        action: action,
        parsing: {
          method: 'fallback',
          itemsExtracted: fallbackItems.length,
          warning: 'Enhanced parsing failed, used simple parsing'
        },
        itemsAdded: fallbackItems.length,
        totalItems: cart.length,
        fallback: true,
        error: error.message,
        metadata: cartMetadata
      });
      
    } catch (fallbackError) {
      console.error('❌ Fallback parsing also failed:', fallbackError);
      res.status(500).json({
        success: false,
        error: 'Both enhanced and fallback parsing failed',
        details: {
          primaryError: error.message,
          fallbackError: fallbackError.message
        }
      });
    }
  }
});

// Smart reparse endpoint - re-analyze existing cart with enhanced intelligence
router.post('/smart-reparse', async (req, res) => {
  console.log('🎯 Smart reparse request received');
  
  try {
    if (!cart || cart.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No items in cart to reparse'
      });
    }
    
    // Reconstruct original text from cart items
    const originalText = cart
      .map(item => item.original || item.itemName || item.productName)
      .filter(text => text && text.trim())
      .join('\n');
    
    console.log('🔄 Re-analyzing cart with enhanced intelligence...');
    
    // Re-parse with enhanced settings
    const options = {
      strictMode: true,
      enableKrogerValidation: true,
      storeLocationId: cart.find(item => item.storeId)?.storeId
    };
    
    // Use the parse endpoint logic but with reparse context
    const mockRequest = {
      body: {
        listText: originalText,
        action: 'replace',
        userId: cart[0]?.userId,
        options: options
      }
    };
    
    // Create a mock response object to capture the result
    let result = null;
    const mockResponse = {
      json: (data) => { result = data; },
      status: () => mockResponse
    };
    
    // Temporarily override console.log to capture the parse process
    const originalLog = console.log;
    console.log = () => {}; // Suppress logs during reparse
    
    try {
      await router.stack.find(layer => layer.route.path === '/parse')
        .route.stack[0].handle(mockRequest, mockResponse);
    } finally {
      console.log = originalLog; // Restore logging
    }
    
    if (result && result.success) {
      const oldCartLength = cart.length;
      
      console.log(`✅ Smart reparse complete: ${oldCartLength} → ${result.cart.length} items`);
      
      res.json({
        success: true,
        cart: result.cart,
        reparse: {
          originalItemCount: oldCartLength,
          newItemCount: result.cart.length,
          improvement: result.cart.length - oldCartLength,
          enhancedValidation: result.kroger?.enabled || false,
          krogerValidatedItems: result.kroger?.validatedItems || 0,
          qualityImprovement: result.quality || {}
        },
        parsing: result.parsing,
        kroger: result.kroger,
        metadata: result.metadata
      });
    } else {
      throw new Error('Reparse failed to produce valid results');
    }
    
  } catch (error) {
    console.error('❌ Smart reparse failed:', error);
    res.status(500).json({
      success: false,
      error: 'Smart reparse failed',
      message: error.message
    });
  }
});

// Get current cart with enhanced metadata
router.get('/current', (req, res) => {
  console.log('🛒 Enhanced cart current request');
  
  try {
    // Calculate enhanced statistics
    const stats = {
      totalItems: cart.length,
      categories: {},
      confidenceDistribution: {
        high: cart.filter(item => (item.confidence || 0) >= 0.8).length,
        medium: cart.filter(item => (item.confidence || 0) >= 0.6 && (item.confidence || 0) < 0.8).length,
        low: cart.filter(item => (item.confidence || 0) < 0.6).length
      },
      validationSources: {
        ai: cart.filter(item => item.validationSources?.includes('ai')).length,
        kroger: cart.filter(item => item.validationSources?.includes('kroger')).length,
        both: cart.filter(item => 
          item.validationSources?.includes('ai') && 
          item.validationSources?.includes('kroger')
        ).length
      },
      pricing: {
        itemsWithPricing: cart.filter(item => item.realPrice).length,
        totalValue: cart.reduce((sum, item) => {
          if (item.realPrice) {
            return sum + (item.realPrice * item.quantity);
          }
          return sum;
        }, 0),
        averageItemPrice: 0
      },
      availability: {},
      parsingMethods: {},
      needsReview: cart.filter(item => item.needsReview).length,
      averageConfidence: cart.length > 0 ? 
        cart.reduce((sum, item) => sum + (item.confidence || 0), 0) / cart.length : 0
    };
    
    // Count items by category
    cart.forEach(item => {
      const category = item.category || 'other';
      stats.categories[category] = (stats.categories[category] || 0) + 1;
    });
    
    // Count by availability
    cart.forEach(item => {
      const availability = item.availability || 'unknown';
      stats.availability[availability] = (stats.availability[availability] || 0) + 1;
    });
    
    // Count by parsing method
    cart.forEach(item => {
      const method = item.parsingMethod || 'unknown';
      stats.parsingMethods[method] = (stats.parsingMethods[method] || 0) + 1;
    });
    
    // Calculate average item price
    const itemsWithPricing = cart.filter(item => item.realPrice);
    if (itemsWithPricing.length > 0) {
      stats.pricing.averageItemPrice = itemsWithPricing.reduce((sum, item) => 
        sum + item.realPrice, 0) / itemsWithPricing.length;
    }
    
    res.json({
      success: true,
      cart: cart,
      itemCount: cart.length,
      stats: stats,
      metadata: cartMetadata,
      timestamp: new Date().toISOString(),
      
      // Enhanced insights
      insights: {
        totalValidated: stats.confidenceDistribution.high + stats.confidenceDistribution.medium,
        validationRate: cart.length > 0 ? 
          ((stats.confidenceDistribution.high + stats.confidenceDistribution.medium) / cart.length * 100).toFixed(1) + '%' : '0%',
        averageConfidence: (stats.averageConfidence * 100).toFixed(1) + '%',
        krogerCoverage: cart.length > 0 ? 
          (stats.validationSources.kroger / cart.length * 100).toFixed(1) + '%' : '0%',
        estimatedTotal: stats.pricing.totalValue > 0 ? 
          `$${stats.pricing.totalValue.toFixed(2)}` : null,
        needsReview: stats.needsReview,
        mostCommonCategory: Object.keys(stats.categories).reduce((a, b) => 
          stats.categories[a] > stats.categories[b] ? a : b, 'other')
      }
    });
    
  } catch (error) {
    console.error('❌ Get current cart failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current cart',
      message: error.message
    });
  }
});

// Enhanced item management with validation
router.put('/item/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  console.log(`📝 Enhanced update item request: ${id}`);
  
  try {
    const itemIndex = cart.findIndex(item => item.id === id);
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
        itemId: id
      });
    }
    
    const originalItem = cart[itemIndex];
    
    // If product name changed, re-validate with both AI and Kroger
    if (updates.productName && updates.productName !== originalItem.productName) {
      try {
        console.log('🔄 Product name changed, re-validating...');
        
        let revalidationData = {
          confidence: 0.5,
          needsReview: true,
          validationSources: ['manual']
        };
        
        // AI re-validation
        if (productParser) {
          const aiResults = await productParser.parseGroceryProducts(updates.productName, {
            context: 'item_update',
            strictMode: false
          });
          
          if (aiResults.products.length > 0) {
            const aiProduct = aiResults.products[0];
            revalidationData.aiConfidence = aiProduct.confidence;
            revalidationData.category = aiProduct.category;
            revalidationData.factors = aiProduct.factors;
            revalidationData.validationSources.push('ai');
          }
        }
        
        // Kroger re-validation
        if (krogerService) {
          const krogerValidation = await krogerService.validateGroceryItem(updates.productName, {
            locationId: originalItem.storeId,
            includePricing: true
          });
          
          if (krogerValidation.isValid) {
            revalidationData.krogerConfidence = krogerValidation.confidence;
            revalidationData.krogerProduct = krogerValidation.product;
            revalidationData.isKrogerValidated = true;
            revalidationData.realPrice = krogerValidation.product?.price;
            revalidationData.salePrice = krogerValidation.product?.salePrice;
            revalidationData.availability = krogerValidation.product?.availability;
            revalidationData.suggestions = krogerValidation.alternatives;
            revalidationData.validationSources.push('kroger');
          }
        }
        
        // Calculate combined confidence
        const aiConf = revalidationData.aiConfidence || 0.5;
        const krogerConf = revalidationData.krogerConfidence || 0;
        revalidationData.confidence = krogerConf > 0 ? 
          (aiConf * 0.6) + (krogerConf * 0.4) : aiConf;
        
        revalidationData.needsReview = revalidationData.confidence < 0.6;
        revalidationData.lastRevalidated = new Date().toISOString();
        
        // Merge revalidation results
        Object.assign(updates, revalidationData);
        
      } catch (error) {
        console.warn('⚠️ Re-validation failed:', error);
        // Continue with manual update
        updates.needsReview = true;
        updates.validationSources = ['manual'];
      }
    }
    
    // Update the item while preserving important fields
    cart[itemIndex] = {
      ...originalItem,
      ...updates,
      id: id, // Ensure ID doesn't change
      lastModified: new Date().toISOString(),
      modifiedBy: 'user'
    };
    
    // Update cart metadata
    cartMetadata.lastModified = new Date().toISOString();
    cartMetadata.estimatedValue = cart.reduce((sum, item) => {
      const price = item.realPrice || item.estimatedPrice || 0;
      return sum + (price * item.quantity);
    }, 0);
    
    console.log(`✅ Item ${id} updated successfully`);
    
    res.json({
      success: true,
      cart: cart,
      updatedItem: cart[itemIndex],
      message: 'Item updated successfully',
      revalidated: !!updates.lastRevalidated,
      metadata: cartMetadata
    });
    
  } catch (error) {
    console.error(`❌ Update item ${id} failed:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update item',
      message: error.message,
      itemId: id
    });
  }
});

// Bulk validate cart items with Kroger
router.post('/validate-all', async (req, res) => {
  console.log('🔍 Bulk validate cart request received');
  
  try {
    if (!cart || cart.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No items in cart to validate'
      });
    }
    
    const { forceRevalidation = false, includeKroger = true } = req.body;
    
    // Re-validate all items
    const validationPromises = cart.map(async (item, index) => {
      try {
        // Skip if already validated and not forcing revalidation
        if (!forceRevalidation && item.isKrogerValidated && item.confidence >= 0.8) {
          return item;
        }
        
        const productName = item.productName || item.itemName || item.original;
        let validatedItem = { ...item };
        
        // AI validation if available
        if (productParser) {
          const aiResults = await productParser.parseGroceryProducts(productName, {
            context: 'bulk_validation',
            strictMode: true
          });
          
          if (aiResults.products.length > 0) {
            const aiProduct = aiResults.products[0];
            validatedItem.aiConfidence = aiProduct.confidence;
            validatedItem.category = aiProduct.category;
            validatedItem.factors = aiProduct.factors;
          }
        }
        
        // Kroger validation if available and requested
        if (krogerService && includeKroger) {
          const krogerValidation = await krogerService.validateGroceryItem(productName, {
            locationId: item.storeId,
            includePricing: true
          });
          
          if (krogerValidation.isValid) {
            validatedItem.krogerConfidence = krogerValidation.confidence;
            validatedItem.isKrogerValidated = true;
            validatedItem.krogerProduct = krogerValidation.product;
            validatedItem.realPrice = krogerValidation.product?.price;
            validatedItem.salePrice = krogerValidation.product?.salePrice;
            validatedItem.availability = krogerValidation.product?.availability;
            validatedItem.suggestions = krogerValidation.alternatives;
            
            // Update validation sources
            validatedItem.validationSources = ['ai', 'kroger'];
          }
        }
        
        // Recalculate combined confidence
        const aiConf = validatedItem.aiConfidence || validatedItem.confidence || 0.5;
        const krogerConf = validatedItem.krogerConfidence || 0;
        validatedItem.confidence = krogerConf > 0 ? 
          (aiConf * 0.6) + (krogerConf * 0.4) : aiConf;
        
        validatedItem.needsReview = validatedItem.confidence < 0.6;
        validatedItem.lastValidated = new Date().toISOString();
        validatedItem.validationMethod = 'bulk_validation';
        
        return validatedItem;
        
      } catch (error) {
        console.warn(`⚠️ Validation failed for item ${index}:`, error);
        return { ...item, validationError: error.message };
      }
    });
    
    const validatedItems = await Promise.all(validationPromises);
    cart = validatedItems;
    
    // Calculate validation summary
    const summary = {
      totalItems: validatedItems.length,
      highConfidence: validatedItems.filter(item => (item.confidence || 0) >= 0.8).length,
      mediumConfidence: validatedItems.filter(item => (item.confidence || 0) >= 0.6 && (item.confidence || 0) < 0.8).length,
      lowConfidence: validatedItems.filter(item => (item.confidence || 0) < 0.6).length,
      krogerValidated: validatedItems.filter(item => item.isKrogerValidated).length,
      needsReview: validatedItems.filter(item => item.needsReview).length,
      averageConfidence: validatedItems.length > 0 ? 
        validatedItems.reduce((sum, item) => sum + (item.confidence || 0), 0) / validatedItems.length : 0,
      estimatedTotal: validatedItems.reduce((sum, item) => {
        if (item.realPrice) {
          return sum + (item.realPrice * item.quantity);
        }
        return sum;
      }, 0)
    };
    
    // Update metadata
    cartMetadata.lastModified = new Date().toISOString();
    cartMetadata.validationStatus = 'fully_validated';
    cartMetadata.estimatedValue = summary.estimatedTotal;
    
    console.log(`✅ Bulk validation complete: ${summary.totalItems} items processed`);
    
    res.json({
      success: true,
      cart: cart,
      validation: {
        summary: summary,
        timestamp: new Date().toISOString(),
        method: 'bulk_validation',
        krogerEnabled: includeKroger && !!krogerService,
        forceRevalidation: forceRevalidation
      },
      metadata: cartMetadata
    });
    
  } catch (error) {
    console.error('❌ Bulk validation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Bulk validation failed',
      message: error.message
    });
  }
});

// Get items that need review (low confidence)
router.get('/needs-review', (req, res) => {
  console.log('⚠️ Items needing review request');
  
  try {
    const needsReviewItems = cart.filter(item => 
      item.needsReview || (item.confidence || 0) < 0.6
    );
    
    const enhancedItems = needsReviewItems.map(item => ({
      ...item,
      reviewReasons: generateReviewReasons(item),
      suggestions: item.suggestions || generateSuggestions(item),
      improvementTips: generateImprovementTips(item)
    }));
    
    res.json({
      success: true,
      needsReview: enhancedItems,
      count: enhancedItems.length,
      totalItems: cart.length,
      reviewRate: cart.length > 0 ? (enhancedItems.length / cart.length * 100).toFixed(1) + '%' : '0%',
      recommendations: {
        enableKrogerValidation: !enhancedItems.some(item => item.isKrogerValidated),
        useMoreSpecificNames: enhancedItems.filter(item => item.confidence < 0.4).length > 0,
        checkSpelling: enhancedItems.filter(item => !item.validationSources?.includes('kroger')).length > 0
      }
    });
    
  } catch (error) {
    console.error('❌ Get needs review items failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get items needing review',
      message: error.message
    });
  }
});

// Clear entire cart
router.post('/clear', (req, res) => {
  console.log('🗑️ Enhanced cart clear request');
  const previousCount = cart.length;
  const previousValue = cartMetadata.estimatedValue;
  
  cart = [];
  cartMetadata = {
    lastModified: new Date().toISOString(),
    totalItems: 0,
    estimatedValue: 0,
    validationStatus: 'empty'
  };
  
  res.json({ 
    success: true, 
    cart: [],
    message: 'Cart cleared successfully',
    cleared: {
      itemCount: previousCount,
      estimatedValue: previousValue,
      timestamp: new Date().toISOString()
    },
    metadata: cartMetadata
  });
});

// Delete specific item by ID
router.delete('/item/:id', (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ Enhanced delete item request: ${id}`);
  
  try {
    const initialLength = cart.length;
    const deletedItem = cart.find(item => item.id === id);
    cart = cart.filter(item => item.id !== id);
    
    if (cart.length < initialLength) {
      // Update metadata
      cartMetadata.lastModified = new Date().toISOString();
      cartMetadata.totalItems = cart.length;
      cartMetadata.estimatedValue = cart.reduce((sum, item) => {
        const price = item.realPrice || item.estimatedPrice || 0;
        return sum + (price * item.quantity);
      }, 0);
      
      console.log(`✅ Item ${id} deleted successfully`);
      res.json({
        success: true,
        cart: cart,
        message: 'Item deleted successfully',
        deletedItem: deletedItem,
        deletedItemId: id,
        newItemCount: cart.length,
        metadata: cartMetadata
      });
    } else {
      console.log(`❌ Item ${id} not found`);
      res.status(404).json({
        success: false,
        error: 'Item not found',
        itemId: id
      });
    }
    
  } catch (error) {
    console.error(`❌ Delete item ${id} failed:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete item',
      message: error.message,
      itemId: id
    });
  }
});

// Get enhanced cart statistics
router.get('/stats', (req, res) => {
  console.log('📊 Enhanced cart statistics request');
  
  try {
    const stats = {
      totalItems: cart.length,
      categories: {},
      confidenceStats: {
        high: 0,
        medium: 0,
        low: 0,
        average: 0
      },
      validationStats: {
        aiValidated: cart.filter(item => item.validationSources?.includes('ai')).length,
        krogerValidated: cart.filter(item => item.validationSources?.includes('kroger')).length,
        manuallyAdded: cart.filter(item => item.validationSources?.includes('manual')).length
      },
      pricingStats: {
        itemsWithPricing: cart.filter(item => item.realPrice).length,
        itemsOnSale: cart.filter(item => item.salePrice && item.salePrice < item.realPrice).length,
        totalValue: 0,
        totalSavings: 0,
        averageItemPrice: 0
      },
      qualityMetrics: {
        validationRate: 0,
        needsReviewCount: 0,
        averageConfidence: 0,
        krogerCoverage: 0
      },
      lastModified: cartMetadata.lastModified,
      parsingMethods: {}
    };
    
    // Count items by category
    cart.forEach(item => {
      const category = item.category || 'other';
      stats.categories[category] = (stats.categories[category] || 0) + 1;
    });
    
    // Calculate confidence statistics
    cart.forEach(item => {
      const confidence = item.confidence || 0;
      if (confidence >= 0.8) stats.confidenceStats.high++;
      else if (confidence >= 0.6) stats.confidenceStats.medium++;
      else stats.confidenceStats.low++;
    });
    
    // Calculate pricing statistics
    cart.forEach(item => {
      if (item.realPrice) {
        stats.pricingStats.totalValue += item.realPrice * item.quantity;
        
        if (item.salePrice && item.salePrice < item.realPrice) {
          stats.pricingStats.totalSavings += (item.realPrice - item.salePrice) * item.quantity;
        }
      }
    });
    
    if (stats.pricingStats.itemsWithPricing > 0) {
      stats.pricingStats.averageItemPrice = 
        stats.pricingStats.totalValue / stats.pricingStats.itemsWithPricing;
    }
    
    // Calculate quality metrics
    stats.qualityMetrics.needsReviewCount = cart.filter(item => item.needsReview).length;
    stats.qualityMetrics.averageConfidence = cart.length > 0 ? 
      cart.reduce((sum, item) => sum + (item.confidence || 0), 0) / cart.length : 0;
    stats.qualityMetrics.validationRate = cart.length > 0 ? 
      (stats.confidenceStats.high + stats.confidenceStats.medium) / cart.length : 0;
    stats.qualityMetrics.krogerCoverage = cart.length > 0 ?
      stats.validationStats.krogerValidated / cart.length : 0;
    
    // Count by parsing method
    cart.forEach(item => {
      const method = item.parsingMethod || 'unknown';
      stats.parsingMethods[method] = (stats.parsingMethods[method] || 0) + 1;
    });
    
    res.json({
      success: true,
      stats: stats,
      metadata: cartMetadata,
      insights: {
        totalValidated: stats.confidenceStats.high + stats.confidenceStats.medium,
        validationPercentage: (stats.qualityMetrics.validationRate * 100).toFixed(1) + '%',
        krogerCoveragePercentage: (stats.qualityMetrics.krogerCoverage * 100).toFixed(1) + '%',
        averageConfidencePercentage: (stats.qualityMetrics.averageConfidence * 100).toFixed(1) + '%',
        estimatedTotal: stats.pricingStats.totalValue > 0 ? 
          `$${stats.pricingStats.totalValue.toFixed(2)}` : null,
        potentialSavings: stats.pricingStats.totalSavings > 0 ?
          `$${stats.pricingStats.totalSavings.toFixed(2)}` : null
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Get cart statistics failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cart statistics',
      message: error.message
    });
  }
});

// Enhanced search with intelligence features
router.get('/search', (req, res) => {
  const { q, confidence, category, needsReview, hasPrice, isValidated } = req.query;
  
  if (!q || q.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Search query (q) must be at least 2 characters'
    });
  }
  
  console.log(`🔍 Enhanced cart search: "${q}"`);
  
  try {
    const searchTerm = q.toLowerCase();
    let results = cart.filter(item => 
      (item.itemName || '').toLowerCase().includes(searchTerm) ||
      (item.productName || '').toLowerCase().includes(searchTerm) ||
      (item.category || '').toLowerCase().includes(searchTerm) ||
      (item.brand || '').toLowerCase().includes(searchTerm) ||
      (item.original || '').toLowerCase().includes(searchTerm)
    );
    
    // Apply additional filters
    if (confidence) {
      const minConfidence = parseFloat(confidence);
      results = results.filter(item => (item.confidence || 0) >= minConfidence);
    }
    
    if (category) {
      results = results.filter(item => 
        (item.category || '').toLowerCase() === category.toLowerCase()
      );
    }
    
    if (needsReview === 'true') {
      results = results.filter(item => item.needsReview);
    }
    
    if (hasPrice === 'true') {
      results = results.filter(item => item.realPrice);
    }
    
    if (isValidated === 'true') {
      results = results.filter(item => item.isKrogerValidated);
    }
    
    res.json({
      success: true,
      query: q,
      results: results,
      resultCount: results.length,
      filters: { confidence, category, needsReview, hasPrice, isValidated },
      suggestions: results.length === 0 ? generateSearchSuggestions(q, cart) : []
    });
    
  } catch (error) {
    console.error(`❌ Cart search failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message,
      query: q
    });
  }
});

// Export cart in various formats
router.get('/export', (req, res) => {
  const { format = 'json', includeMetadata = true } = req.query;
  
  console.log(`📤 Exporting cart in ${format} format`);
  
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'json') {
      const exportData = {
        exportDate: new Date().toISOString(),
        cart: cart,
        metadata: includeMetadata === 'true' ? cartMetadata : undefined,
        summary: {
          totalItems: cart.length,
          estimatedValue: cartMetadata.estimatedValue
        }
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=smart-cart-${timestamp}.json`);
      res.json(exportData);
      
    } else if (format === 'csv') {
      const csvRows = [
        ['Product Name', 'Quantity', 'Unit', 'Category', 'Price', 'Confidence', 'Validated']
      ];
      
      cart.forEach(item => {
        csvRows.push([
          item.productName || item.itemName,
          item.quantity || 1,
          item.unit || '',
          item.category || 'other',
          item.realPrice || item.estimatedPrice || '',
          ((item.confidence || 0) * 100).toFixed(1) + '%',
          item.isKrogerValidated ? 'Yes' : 'No'
        ]);
      });
      
      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=smart-cart-${timestamp}.csv`);
      res.send(csvContent);
      
    } else if (format === 'txt') {
      const txtContent = [
        'Smart Cart - Grocery List',
        `Generated: ${new Date().toLocaleDateString()}`,
        `Total Items: ${cart.length}`,
        cartMetadata.estimatedValue > 0 ? `Estimated Total: $${cartMetadata.estimatedValue.toFixed(2)}` : '',
        '',
        'ITEMS:',
        ...cart.map(item => 
          `• ${item.quantity || 1}${item.unit ? ' ' + item.unit : ''} ${item.productName || item.itemName}${item.realPrice ? ' - $' + item.realPrice.toFixed(2) : ''}`
        )
      ].filter(Boolean).join('\n');
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename=smart-cart-${timestamp}.txt`);
      res.send(txtContent);
      
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported export format',
        supportedFormats: ['json', 'csv', 'txt']
      });
    }
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    res.status(500).json({
      success: false,
      error: 'Export failed',
      message: error.message
    });
  }
});

// Helper Functions

// Fallback simple parsing function
function parseGroceryItemsSimple(listText, userId) {
  const items = listText.split('\n')
    .filter(line => line.trim())
    .map((line, index) => parseGroceryItemSimple(line, index, userId));
  
  return {
    products: items,
    totalCandidates: items.length,
    validProducts: items.length,
    averageConfidence: 0.5
  };
}

function parseGroceryItemSimple(line, index, userId) {
  let cleaned = line.trim()
    .replace(/^[-*•·◦▪▫◆◇→➤➢>]\s*/, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/^[a-z]\)\s*/i, '');

  // Extract quantity if present
  const quantityMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*(.+)/);
  let quantity = 1;
  let itemName = cleaned;
  
  if (quantityMatch) {
    quantity = parseFloat(quantityMatch[1]);
    itemName = quantityMatch[2];
  }

  // Determine category (simple)
  let category = 'other';
  const itemLower = itemName.toLowerCase();
  
  if (itemLower.match(/milk|cheese|yogurt|butter|cream|eggs/)) category = 'dairy';
  else if (itemLower.match(/bread|bagel|muffin|cake|cookie/)) category = 'bakery';
  else if (itemLower.match(/apple|banana|orange|fruit|vegetable|carrot|lettuce|tomato|potato|onion|spinach|broccoli/)) category = 'produce';
  else if (itemLower.match(/chicken|beef|pork|turkey|fish|salmon|meat/)) category = 'meat';
  else if (itemLower.match(/cereal|pasta|rice|beans|soup|sauce|flour|sugar|salt/)) category = 'pantry';

  return {
    id: `item_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
    original: line.trim(),
    itemName: itemName.trim(),
    productName: itemName.trim(),
    quantity: quantity,
    category: category,
    confidence: 0.5, // Default confidence for simple parsing
    timestamp: new Date().toISOString(),
    userId: userId,
    addedBy: 'simple_parser',
    parsingMethod: 'simple',
    needsReview: true, // Simple parsing always needs review
    validationSources: ['simple']
  };
}

function generateSimpleStats(items) {
  return {
    totalProducts: items.length,
    highConfidence: items.filter(item => item.confidence >= 0.8).length,
    mediumConfidence: items.filter(item => item.confidence >= 0.6 && item.confidence < 0.8).length,
    lowConfidence: items.filter(item => item.confidence < 0.6).length,
    categoriesFound: [...new Set(items.map(item => item.category))],
    averageConfidence: items.length > 0 ? 
      items.reduce((sum, item) => sum + item.confidence, 0) / items.length : 0,
    processingMetrics: {
      candidateItems: items.length,
      validProducts: items.length,
      filteringEfficiency: '100%'
    }
  };
}

function generateReviewReasons(item) {
  const reasons = [];
  
  if (item.confidence < 0.4) reasons.push('Very low confidence score');
  if (!item.isKrogerValidated) reasons.push('Not validated against store catalog');
  if (!item.realPrice) reasons.push('No pricing information available');
  if (item.category === 'other') reasons.push('Category not determined');
  if (!item.validationSources?.includes('ai')) reasons.push('Not processed by AI');
  
  return reasons;
}

function generateSuggestions(item) {
  const suggestions = [];
  const itemName = (item.productName || item.itemName || '').toLowerCase();
  
  // Common corrections
  if (itemName.includes('chicken')) {
    suggestions.push('chicken breast', 'chicken thighs', 'whole chicken');
  } else if (itemName.includes('milk')) {
    suggestions.push('whole milk', '2% milk', 'skim milk', 'almond milk');
  } else if (itemName.includes('bread')) {
    suggestions.push('white bread', 'whole wheat bread', 'sourdough bread');
  } else if (itemName.includes('cheese')) {
    suggestions.push('cheddar cheese', 'mozzarella cheese', 'swiss cheese');
  }
  
  return suggestions.slice(0, 3); // Limit to 3 suggestions
}

function generateImprovementTips(item) {
  const tips = [];
  
  if (item.confidence < 0.6) {
    tips.push('Try using more specific product names');
    tips.push('Include brand names when possible');
  }
  
  if (!item.isKrogerValidated) {
    tips.push('Check spelling and try alternative names');
  }
  
  if (!item.realPrice) {
    tips.push('Ensure item is available at your selected store');
  }
  
  return tips;
}

function generateSearchSuggestions(query, cartItems) {
  const suggestions = [];
  
  // Find similar items in cart
  cartItems.forEach(item => {
    const itemName = (item.productName || item.itemName || '').toLowerCase();
    if (itemName.includes(query.toLowerCase().substring(0, 3))) {
      suggestions.push(item.productName || item.itemName);
    }
  });
  
  return [...new Set(suggestions)].slice(0, 5);
}

console.log('✅ Enhanced Cart routes loaded with Kroger integration');
module.exports = router;