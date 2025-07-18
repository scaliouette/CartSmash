// server/routes/cart.js - Enhanced with intelligent parsing
const express = require('express');
const router = express.Router();
const AIProductParser = require('../utils/aiProductParser');

console.log('🛒 Loading Enhanced Cart routes with intelligent parsing...');

// Initialize the intelligent product parser
const productParser = new AIProductParser();

// Simple in-memory storage (in production, use a database)
let cart = [];

// Enhanced parse grocery list with AI intelligence
router.post('/parse', async (req, res) => {
  console.log('📝 Enhanced cart parse request received');
  const { listText, action = 'replace', userId = null, options = {} } = req.body;
  
  if (!listText) {
    return res.status(400).json({ error: 'listText required' });
  }
  
  try {
    // 🚀 Use intelligent parsing instead of simple regex
    console.log('🎯 Starting intelligent product parsing...');
    const parsingResults = await productParser.parseGroceryProducts(listText, {
      context: 'cart_parsing',
      strictMode: options.strictMode !== false, // Default to strict
      userId: userId
    });
    
    // Convert parsed products to cart format
    const intelligentItems = parsingResults.products.map((product, index) => ({
      id: product.id,
      original: product.original,
      itemName: product.productName,
      productName: product.productName,
      quantity: product.quantity || 1,
      unit: product.unit,
      category: product.category,
      confidence: product.confidence,
      isProduct: product.isProduct,
      factors: product.factors,
      timestamp: product.timestamp,
      userId: userId,
      
      // Additional cart-specific fields
      addedBy: 'ai_parser',
      parsingMethod: 'intelligent',
      needsReview: product.confidence < 0.6
    }));
    
    // Handle action type
    if (action === 'replace') {
      cart = intelligentItems;
    } else if (action === 'merge') {
      // Smart merge - avoid duplicates by product name
      const existingNames = cart.map(item => 
        (item.productName || item.itemName || '').toLowerCase().trim()
      );
      
      const newItems = intelligentItems.filter(item => {
        const productName = (item.productName || '').toLowerCase().trim();
        return !existingNames.includes(productName);
      });
      
      cart = [...cart, ...newItems];
    }
    
    // Generate parsing statistics
    const parsingStats = productParser.getParsingStats(parsingResults);
    
    console.log(`✅ Intelligent parsing complete: ${intelligentItems.length} products extracted`);
    console.log(`📊 Parsing efficiency: ${parsingStats.processingMetrics.filteringEfficiency}`);
    console.log(`🎯 Average confidence: ${(parsingResults.averageConfidence * 100).toFixed(1)}%`);
    
    res.json({
      success: true,
      cart: cart,
      action: action,
      
      // Enhanced response data
      parsing: {
        method: 'intelligent',
        itemsExtracted: intelligentItems.length,
        totalCandidates: parsingResults.totalCandidates,
        filteringEfficiency: parsingStats.processingMetrics.filteringEfficiency,
        averageConfidence: parsingResults.averageConfidence,
        stats: parsingStats
      },
      
      // Legacy support
      itemsAdded: intelligentItems.length,
      totalItems: cart.length,
      
      // Quality metrics
      quality: {
        highConfidenceItems: intelligentItems.filter(item => item.confidence >= 0.8).length,
        mediumConfidenceItems: intelligentItems.filter(item => item.confidence >= 0.6 && item.confidence < 0.8).length,
        needsReviewItems: intelligentItems.filter(item => item.confidence < 0.6).length,
        categoriesFound: [...new Set(intelligentItems.map(item => item.category))].length
      }
    });
    
  } catch (error) {
    console.error('❌ Intelligent parsing failed:', error);
    
    // Fallback to simple parsing if AI parsing fails
    console.log('🔄 Falling back to simple parsing...');
    try {
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
      
      res.json({
        success: true,
        cart: cart,
        action: action,
        parsing: {
          method: 'fallback',
          itemsExtracted: fallbackItems.length,
          warning: 'Intelligent parsing failed, used simple parsing'
        },
        itemsAdded: fallbackItems.length,
        totalItems: cart.length,
        fallback: true,
        error: error.message
      });
      
    } catch (fallbackError) {
      console.error('❌ Fallback parsing also failed:', fallbackError);
      res.status(500).json({
        success: false,
        error: 'Both intelligent and fallback parsing failed',
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
    
    // Use intelligent parsing on the reconstructed text
    const parsingResults = await productParser.parseGroceryProducts(originalText, {
      context: 'smart_reparse',
      strictMode: true // Use strict mode for reparse
    });
    
    // Convert to cart format
    const enhancedItems = parsingResults.products.map((product, index) => ({
      id: product.id,
      original: product.original,
      itemName: product.productName,
      productName: product.productName,
      quantity: product.quantity || 1,
      unit: product.unit,
      category: product.category,
      confidence: product.confidence,
      isProduct: product.isProduct,
      factors: product.factors,
      timestamp: new Date().toISOString(),
      
      // Mark as reparsed
      addedBy: 'smart_reparse',
      parsingMethod: 'intelligent_reparse',
      needsReview: product.confidence < 0.6
    }));
    
    // Replace cart with enhanced items
    const oldCartLength = cart.length;
    cart = enhancedItems;
    
    const parsingStats = productParser.getParsingStats(parsingResults);
    
    console.log(`✅ Smart reparse complete: ${oldCartLength} → ${enhancedItems.length} items`);
    
    res.json({
      success: true,
      cart: cart,
      reparse: {
        originalItemCount: oldCartLength,
        newItemCount: enhancedItems.length,
        improvement: enhancedItems.length - oldCartLength,
        stats: parsingStats,
        averageConfidence: parsingResults.averageConfidence
      },
      parsing: {
        method: 'intelligent_reparse',
        filteringEfficiency: parsingStats.processingMetrics.filteringEfficiency
      }
    });
    
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
  
  // Calculate cart statistics
  const stats = {
    totalItems: cart.length,
    categories: {},
    confidenceDistribution: {
      high: cart.filter(item => (item.confidence || 0) >= 0.8).length,
      medium: cart.filter(item => (item.confidence || 0) >= 0.6 && (item.confidence || 0) < 0.8).length,
      low: cart.filter(item => (item.confidence || 0) < 0.6).length
    },
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
  
  // Count by parsing method
  cart.forEach(item => {
    const method = item.parsingMethod || 'unknown';
    stats.parsingMethods[method] = (stats.parsingMethods[method] || 0) + 1;
  });
  
  res.json({
    success: true,
    cart: cart,
    itemCount: cart.length,
    stats: stats,
    timestamp: new Date().toISOString(),
    
    // Intelligence insights
    intelligence: {
      totalValidated: stats.confidenceDistribution.high + stats.confidenceDistribution.medium,
      validationRate: cart.length > 0 ? 
        ((stats.confidenceDistribution.high + stats.confidenceDistribution.medium) / cart.length * 100).toFixed(1) + '%' : '0%',
      averageConfidence: (stats.averageConfidence * 100).toFixed(1) + '%',
      needsReview: stats.needsReview
    }
  });
});

// Enhanced item management with validation
router.put('/item/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  console.log(`📝 Enhanced update item request: ${id}`, updates);
  
  const itemIndex = cart.findIndex(item => item.id === id);
  
  if (itemIndex !== -1) {
    const originalItem = cart[itemIndex];
    
    // If product name changed, re-validate with AI
    if (updates.productName && updates.productName !== originalItem.productName) {
      try {
        console.log('🔄 Product name changed, re-validating with AI...');
        
        const revalidationResults = await productParser.parseGroceryProducts(updates.productName, {
          context: 'item_update',
          strictMode: false
        });
        
        if (revalidationResults.products.length > 0) {
          const revalidatedProduct = revalidationResults.products[0];
          
          // Merge revalidation results
          updates.confidence = revalidatedProduct.confidence;
          updates.category = revalidatedProduct.category;
          updates.factors = revalidatedProduct.factors;
          updates.needsReview = revalidatedProduct.confidence < 0.6;
          updates.lastRevalidated = new Date().toISOString();
        }
      } catch (error) {
        console.warn('⚠️ Re-validation failed:', error);
        // Continue with manual update
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
    
    console.log(`✅ Item ${id} updated successfully`);
    
    res.json({
      success: true,
      cart: cart,
      updatedItem: cart[itemIndex],
      message: 'Item updated successfully',
      revalidated: !!updates.lastRevalidated
    });
  } else {
    console.log(`❌ Item ${id} not found for update`);
    res.status(404).json({
      success: false,
      error: 'Item not found',
      itemId: id
    });
  }
});

// Bulk validate cart items
router.post('/validate-all', async (req, res) => {
  console.log('🔍 Bulk validate cart request received');
  
  try {
    if (!cart || cart.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No items in cart to validate'
      });
    }
    
    // Re-validate all items with fresh AI analysis
    const validationPromises = cart.map(async (item, index) => {
      try {
        const productName = item.productName || item.itemName || item.original;
        const validationResults = await productParser.parseGroceryProducts(productName, {
          context: 'bulk_validation',
          strictMode: true
        });
        
        if (validationResults.products.length > 0) {
          const validatedProduct = validationResults.products[0];
          return {
            ...item,
            confidence: validatedProduct.confidence,
            category: validatedProduct.category,
            factors: validatedProduct.factors,
            isProduct: validatedProduct.isProduct,
            needsReview: validatedProduct.confidence < 0.6,
            lastValidated: new Date().toISOString(),
            validationMethod: 'bulk_ai'
          };
        }
        return item;
      } catch (error) {
        console.warn(`⚠️ Validation failed for item ${index}:`, error);
        return item;
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
      needsReview: validatedItems.filter(item => item.needsReview).length,
      averageConfidence: validatedItems.length > 0 ? 
        validatedItems.reduce((sum, item) => sum + (item.confidence || 0), 0) / validatedItems.length : 0
    };
    
    console.log(`✅ Bulk validation complete: ${summary.totalItems} items processed`);
    
    res.json({
      success: true,
      cart: cart,
      validation: {
        summary: summary,
        timestamp: new Date().toISOString(),
        method: 'bulk_ai_validation'
      }
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
  
  const needsReviewItems = cart.filter(item => 
    item.needsReview || (item.confidence || 0) < 0.6
  );
  
  const suggestions = needsReviewItems.map(item => ({
    ...item,
    suggestions: generateSuggestions(item)
  }));
  
  res.json({
    success: true,
    needsReview: suggestions,
    count: suggestions.length,
    totalItems: cart.length,
    reviewRate: cart.length > 0 ? (suggestions.length / cart.length * 100).toFixed(1) + '%' : '0%'
  });
});

// Clear entire cart
router.post('/clear', (req, res) => {
  console.log('🗑️ Enhanced cart clear request');
  const previousCount = cart.length;
  cart = [];
  
  res.json({ 
    success: true, 
    cart: [],
    message: 'Cart cleared successfully',
    previousItemCount: previousCount,
    timestamp: new Date().toISOString()
  });
});

// Delete specific item by ID
router.delete('/item/:id', (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ Enhanced delete item request: ${id}`);
  
  const initialLength = cart.length;
  const deletedItem = cart.find(item => item.id === id);
  cart = cart.filter(item => item.id !== id);
  
  if (cart.length < initialLength) {
    console.log(`✅ Item ${id} deleted successfully`);
    res.json({
      success: true,
      cart: cart,
      message: 'Item deleted successfully',
      deletedItem: deletedItem,
      deletedItemId: id,
      newItemCount: cart.length
    });
  } else {
    console.log(`❌ Item ${id} not found`);
    res.status(404).json({
      success: false,
      error: 'Item not found',
      itemId: id
    });
  }
});

// Get enhanced cart statistics
router.get('/stats', (req, res) => {
  const stats = {
    totalItems: cart.length,
    categories: {},
    confidenceStats: {
      high: 0,
      medium: 0,
      low: 0,
      average: 0
    },
    parsingMethods: {},
    qualityMetrics: {
      validationRate: 0,
      needsReviewCount: 0,
      averageConfidence: 0
    },
    lastModified: cart.length > 0 ? 
      Math.max(...cart.map(item => new Date(item.timestamp || item.lastModified || 0))) : null
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
  
  // Calculate quality metrics
  stats.qualityMetrics.needsReviewCount = cart.filter(item => item.needsReview).length;
  stats.qualityMetrics.averageConfidence = cart.length > 0 ? 
    cart.reduce((sum, item) => sum + (item.confidence || 0), 0) / cart.length : 0;
  stats.qualityMetrics.validationRate = cart.length > 0 ? 
    (stats.confidenceStats.high + stats.confidenceStats.medium) / cart.length : 0;
  
  res.json({
    success: true,
    stats: stats,
    intelligence: {
      totalValidated: stats.confidenceStats.high + stats.confidenceStats.medium,
      validationPercentage: (stats.qualityMetrics.validationRate * 100).toFixed(1) + '%',
      averageConfidencePercentage: (stats.qualityMetrics.averageConfidence * 100).toFixed(1) + '%'
    }
  });
});

// Enhanced search with intelligence features
router.get('/search', (req, res) => {
  const { q, confidence, category, needsReview } = req.query;
  
  if (!q || q.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Search query (q) must be at least 2 characters'
    });
  }
  
  const searchTerm = q.toLowerCase();
  let results = cart.filter(item => 
    (item.itemName || '').toLowerCase().includes(searchTerm) ||
    (item.productName || '').toLowerCase().includes(searchTerm) ||
    (item.category || '').toLowerCase().includes(searchTerm) ||
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
  
  res.json({
    success: true,
    query: q,
    results: results,
    resultCount: results.length,
    filters: { confidence, category, needsReview }
  });
});

// Fallback simple parsing function
function parseGroceryItemsSimple(listText, userId) {
  const items = listText.split('\n')
    .filter(line => line.trim())
    .map((line, index) => parseGroceryItemSimple(line, index, userId));
  
  return items;
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
    needsReview: true // Simple parsing always needs review
  };
}

// Helper function to generate suggestions for low-confidence items
function generateSuggestions(item) {
  const suggestions = [];
  const itemName = (item.productName || item.itemName || '').toLowerCase();
  
  // Common corrections
  if (itemName.includes('chicken')) {
    suggestions.push('chicken breast', 'chicken thighs', 'whole chicken');
  } else if (itemName.includes('milk')) {
    suggestions.push('whole milk', '2% milk', 'skim milk');
  } else if (itemName.includes('bread')) {
    suggestions.push('white bread', 'whole wheat bread', 'sourdough bread');
  }
  
  return suggestions.slice(0, 3); // Limit to 3 suggestions
}

console.log('✅ Enhanced Cart routes loaded with intelligent parsing');
module.exports = router;