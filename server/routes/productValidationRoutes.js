// server/routes/productValidationRoutes.js
// Enhanced product validation with AI-powered confidence matching and multi-store pricing

const express = require('express');
const router = express.Router();

// Product validation with enhanced AI confidence matching
router.post('/search', async (req, res) => {
  try {
    const { searchTerm, category, brand, originalItem, options = {} } = req.body;

    console.log(`🔍 Enhanced product search for: "${searchTerm}"`);

    // Simulate calling Instacart API for product search
    const instacartData = await mockInstacartProductSearch(searchTerm, category, brand);

    // Enhance products with AI confidence scoring
    const enhancedProducts = await enhanceProductsWithAI(instacartData.products, originalItem, options);

    // Sort by confidence score (highest first)
    enhancedProducts.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

    // Filter by minimum confidence if specified
    const filteredProducts = enhancedProducts.filter(product =>
      (product.confidence || 0) >= (options.minConfidence || 0)
    );

    console.log(`✅ Found ${filteredProducts.length} products matching confidence threshold`);

    res.json({
      success: true,
      products: filteredProducts,
      count: filteredProducts.length,
      searchTerm,
      metadata: {
        originalQuery: searchTerm,
        confidenceRange: {
          min: Math.min(...filteredProducts.map(p => p.confidence || 0)),
          max: Math.max(...filteredProducts.map(p => p.confidence || 0)),
          average: filteredProducts.reduce((sum, p) => sum + (p.confidence || 0), 0) / filteredProducts.length
        }
      }
    });
  } catch (error) {
    console.error('❌ Product search failed:', error);
    res.status(500).json({
      success: false,
      error: 'Product search failed',
      message: error.message
    });
  }
});

// Multi-store pricing comparison
router.post('/multi-store-pricing', async (req, res) => {
  try {
    const { productName, productId, category, zipCode = '95670' } = req.body;

    console.log(`💰 Getting multi-store pricing for: "${productName}"`);

    // Define retailers to check
    const retailers = [
      { id: 'safeway', name: 'Safeway', multiplier: 1.0 },
      { id: 'whole_foods', name: 'Whole Foods', multiplier: 1.3 },
      { id: 'kroger', name: 'Kroger', multiplier: 0.95 },
      { id: 'target', name: 'Target', multiplier: 1.05 },
      { id: 'costco', name: 'Costco', multiplier: 0.9 }
    ];

    // Get pricing from each retailer
    const pricingPromises = retailers.map(retailer =>
      getRetailerPricing(productName, retailer, zipCode, category)
    );

    const pricingResults = await Promise.allSettled(pricingPromises);

    const pricing = {};
    retailers.forEach((retailer, index) => {
      const result = pricingResults[index];
      if (result.status === 'fulfilled' && result.value) {
        pricing[retailer.id] = {
          retailerName: retailer.name,
          price: result.value.price,
          availability: result.value.availability,
          thumbnail: result.value.thumbnail,
          deliveryFee: result.value.deliveryFee || 5.99,
          serviceFee: result.value.serviceFee || 3.99,
          estimatedDelivery: result.value.estimatedDelivery || '2-3 hours'
        };
      }
    });

    // Calculate price comparison metrics
    const prices = Object.values(pricing).map(p => p.price).filter(p => p > 0);
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    // Add savings calculations
    Object.keys(pricing).forEach(retailerId => {
      const retailerPrice = pricing[retailerId].price;
      pricing[retailerId].savingsVsHighest = highestPrice - retailerPrice;
      pricing[retailerId].savingsVsAverage = averagePrice - retailerPrice;
      pricing[retailerId].isLowestPrice = retailerPrice === lowestPrice;
    });

    console.log(`✅ Multi-store pricing retrieved for ${Object.keys(pricing).length} retailers`);

    res.json({
      success: true,
      pricing,
      comparison: {
        lowestPrice,
        highestPrice,
        averagePrice,
        priceRange: highestPrice - lowestPrice,
        retailerCount: Object.keys(pricing).length
      },
      metadata: {
        productName,
        zipCode,
        category,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Multi-store pricing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Multi-store pricing failed',
      message: error.message
    });
  }
});

// Validate entire shopping cart
router.post('/validate-cart', async (req, res) => {
  try {
    const { cartItems, options = {} } = req.body;

    console.log(`🛒 Validating cart with ${cartItems.length} items`);

    const validationPromises = cartItems.map(item => validateSingleCartItem(item, options));
    const validationResults = await Promise.allSettled(validationPromises);

    const validatedItems = validationResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          originalItem: cartItems[index],
          confidence: 0,
          confidenceLevel: 'error',
          error: result.reason?.message || 'Validation failed',
          validationFlags: ['validation_failed']
        };
      }
    });

    // Generate summary statistics
    const summary = generateValidationSummary(validatedItems);

    console.log(`✅ Cart validation completed: ${summary.percentageGoodOrBetter}% ready for checkout`);

    res.json({
      success: true,
      validatedItems,
      summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Cart validation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Cart validation failed',
      message: error.message
    });
  }
});

// Helper function to enhance products with AI confidence scoring
async function enhanceProductsWithAI(products, originalItem, options) {
  return products.map(product => {
    // Calculate enhanced confidence score
    const confidence = calculateEnhancedConfidence(originalItem, product);

    // Ensure thumbnail is available
    const thumbnail = product.image_url || generateProductThumbnail(product.name, product.category);

    // Add enhanced metadata
    return {
      ...product,
      confidence,
      confidenceLevel: getConfidenceLevel(confidence),
      thumbnail,
      enhancedMetadata: {
        nameSimilarity: calculateNameSimilarity(originalItem?.name || '', product.name || ''),
        brandMatch: compareBrands(originalItem?.brand, product.brand),
        categoryMatch: compareCategories(originalItem?.category, product.category),
        availabilityScore: getAvailabilityScore(product.availability),
        priceReasonableness: assessPriceReasonableness(product.price, product.category)
      },
      matchReasons: generateMatchReasons(originalItem, product, confidence)
    };
  });
}

// Enhanced confidence calculation
function calculateEnhancedConfidence(originalItem, matchedProduct) {
  if (!originalItem || !matchedProduct) return 0;

  let confidence = 0;
  let totalWeight = 0;

  // Name similarity (40% weight)
  const nameSimilarity = calculateNameSimilarity(
    originalItem.name || originalItem.productName || '',
    matchedProduct.name || ''
  );
  confidence += nameSimilarity * 0.4;
  totalWeight += 0.4;

  // Brand matching (25% weight)
  if (originalItem.brand && matchedProduct.brand) {
    const brandMatch = originalItem.brand.toLowerCase() === matchedProduct.brand.toLowerCase();
    confidence += (brandMatch ? 1.0 : 0.0) * 0.25;
    totalWeight += 0.25;
  }

  // Category matching (20% weight)
  if (originalItem.category && matchedProduct.category) {
    const categoryMatch = originalItem.category.toLowerCase() === matchedProduct.category.toLowerCase();
    confidence += (categoryMatch ? 1.0 : 0.0) * 0.20;
    totalWeight += 0.20;
  }

  // Size/quantity matching (10% weight)
  if (originalItem.size && matchedProduct.size) {
    const sizeMatch = compareSizes(originalItem.size, matchedProduct.size);
    confidence += sizeMatch * 0.10;
    totalWeight += 0.10;
  }

  // Availability bonus (5% weight)
  const availabilityScore = matchedProduct.availability === 'in_stock' ? 1.0 :
                           matchedProduct.availability === 'low_stock' ? 0.5 : 0.0;
  confidence += availabilityScore * 0.05;
  totalWeight += 0.05;

  return Math.min(1.0, confidence);
}

// Name similarity using enhanced algorithm
function calculateNameSimilarity(name1, name2) {
  const clean1 = name1.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const clean2 = name2.toLowerCase().replace(/[^\w\s]/g, '').trim();

  if (clean1 === clean2) return 1.0;

  const words1 = clean1.split(/\s+/);
  const words2 = clean2.split(/\s+/);

  let matchingWords = 0;
  let partialMatches = 0;

  words1.forEach(word1 => {
    words2.forEach(word2 => {
      if (word1 === word2) {
        matchingWords++;
      } else if (word1.length >= 3 && word2.length >= 3) {
        if (word1.includes(word2) || word2.includes(word1)) {
          partialMatches += 0.5;
        } else if (levenshteinDistance(word1, word2) <= 2) {
          partialMatches += 0.3;
        }
      }
    });
  });

  const totalScore = (matchingWords + partialMatches) / Math.max(words1.length, words2.length);
  return Math.min(1.0, totalScore);
}

// Levenshtein distance calculation
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Size comparison helper
function compareSizes(size1, size2) {
  if (!size1 || !size2) return 0;

  const clean1 = size1.toLowerCase().replace(/[^\w\d.]/g, '');
  const clean2 = size2.toLowerCase().replace(/[^\w\d.]/g, '');

  if (clean1 === clean2) return 1.0;

  // Extract numbers for comparison
  const nums1 = clean1.match(/\d+\.?\d*/g) || [];
  const nums2 = clean2.match(/\d+\.?\d*/g) || [];

  if (nums1.length > 0 && nums2.length > 0) {
    const num1 = parseFloat(nums1[0]);
    const num2 = parseFloat(nums2[0]);
    const diff = Math.abs(num1 - num2) / Math.max(num1, num2);
    return Math.max(0, 1 - diff);
  }

  return calculateNameSimilarity(size1, size2);
}

// Brand comparison helper
function compareBrands(brand1, brand2) {
  if (!brand1 || !brand2) return false;
  return brand1.toLowerCase() === brand2.toLowerCase();
}

// Category comparison helper
function compareCategories(category1, category2) {
  if (!category1 || !category2) return false;
  return category1.toLowerCase() === category2.toLowerCase();
}

// Availability scoring
function getAvailabilityScore(availability) {
  switch (availability) {
    case 'in_stock': return 1.0;
    case 'low_stock': return 0.5;
    case 'out_of_stock': return 0.0;
    default: return 0.7; // Unknown availability
  }
}

// Price reasonableness assessment
function assessPriceReasonableness(price, category) {
  // Simple heuristic - more sophisticated logic could be added
  if (!price || price <= 0) return 0;

  const categoryExpectedRanges = {
    'produce': { min: 0.5, max: 10 },
    'dairy': { min: 2, max: 15 },
    'meat': { min: 3, max: 25 },
    'bakery': { min: 1, max: 12 },
    'pantry': { min: 1, max: 20 }
  };

  const range = categoryExpectedRanges[category] || { min: 0.5, max: 50 };
  if (price >= range.min && price <= range.max) {
    return 1.0;
  } else if (price < range.min) {
    return 0.8; // Suspiciously cheap
  } else {
    return 0.6; // Expensive but possible
  }
}

// Generate match reasons
function generateMatchReasons(originalItem, matchedProduct, confidence) {
  const reasons = [];

  if (confidence >= 0.8) {
    reasons.push('Excellent name match');
  }

  if (compareBrands(originalItem?.brand, matchedProduct.brand)) {
    reasons.push(`Same brand: ${matchedProduct.brand}`);
  }

  if (compareCategories(originalItem?.category, matchedProduct.category)) {
    reasons.push(`Category: ${matchedProduct.category}`);
  }

  if (matchedProduct.availability === 'in_stock') {
    reasons.push('In stock');
  }

  return reasons;
}

// Get confidence level from score
function getConfidenceLevel(confidence) {
  if (confidence >= 0.8) return 'excellent';
  if (confidence >= 0.6) return 'good';
  if (confidence >= 0.4) return 'fair';
  return 'poor';
}

// Generate product thumbnail
function generateProductThumbnail(productName, category) {
  const categoryImages = {
    'produce': 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=100&h=100&fit=crop',
    'dairy': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=100&h=100&fit=crop',
    'meat': 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=100&h=100&fit=crop',
    'bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop',
    'beverages': 'https://images.unsplash.com/photo-1623065422902-4fa88dc2584b?w=100&h=100&fit=crop',
    'frozen': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100&h=100&fit=crop',
    'snacks': 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=100&h=100&fit=crop',
    'default': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop'
  };

  return categoryImages[category] || categoryImages.default;
}

// Mock Instacart product search
async function mockInstacartProductSearch(searchTerm, category, brand) {
  // In production, this would call the actual Instacart API
  const mockProducts = [
    {
      id: 'product_1',
      name: searchTerm,
      brand: brand || 'Generic Brand',
      category: category || 'general',
      price: Math.random() * 10 + 2,
      availability: 'in_stock',
      size: '1 lb',
      image_url: generateProductThumbnail(searchTerm, category)
    },
    {
      id: 'product_2',
      name: `Organic ${searchTerm}`,
      brand: 'Organic Valley',
      category: category || 'general',
      price: Math.random() * 15 + 3,
      availability: 'in_stock',
      size: '1 lb',
      image_url: generateProductThumbnail(searchTerm, category)
    },
    {
      id: 'product_3',
      name: `Premium ${searchTerm}`,
      brand: 'Premium Brand',
      category: category || 'general',
      price: Math.random() * 20 + 5,
      availability: 'low_stock',
      size: '2 lb',
      image_url: generateProductThumbnail(searchTerm, category)
    }
  ];

  return {
    products: mockProducts,
    count: mockProducts.length
  };
}

// Get retailer pricing
async function getRetailerPricing(productName, retailer, zipCode, category) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

  // Generate realistic pricing based on retailer multiplier
  const basePrice = Math.random() * 8 + 2;
  const price = basePrice * retailer.multiplier;

  return {
    price: Math.round(price * 100) / 100,
    availability: Math.random() > 0.1 ? 'in_stock' : 'low_stock',
    thumbnail: generateProductThumbnail(productName, category),
    deliveryFee: retailer.id === 'costco' ? 0 : 5.99,
    serviceFee: retailer.id === 'costco' ? 0 : 3.99,
    estimatedDelivery: retailer.id === 'costco' ? '1-2 days' : '2-3 hours'
  };
}

// Validate single cart item
async function validateSingleCartItem(item, options) {
  try {
    // Search for product matches
    const searchResults = await mockInstacartProductSearch(
      item.name || item.productName,
      item.category,
      item.brand
    );

    // Enhance with AI scoring
    const enhancedProducts = await enhanceProductsWithAI(searchResults.products, item, options);

    // Get best match
    const bestMatch = enhancedProducts[0] || null;
    const confidence = bestMatch ? bestMatch.confidence : 0;

    return {
      originalItem: item,
      confidence,
      confidenceLevel: getConfidenceLevel(confidence),
      bestMatch,
      alternatives: enhancedProducts.slice(1, (options.maxAlternatives || 3) + 1),
      validationFlags: generateValidationFlags(item, confidence),
      recommendedActions: generateRecommendedActions(confidence),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Validation failed for item "${item.name}": ${error.message}`);
  }
}

// Generate validation flags
function generateValidationFlags(item, confidence) {
  const flags = [];

  if (confidence < 0.4) flags.push('low_confidence');
  if (confidence >= 0.8) flags.push('high_confidence');
  if (!item.price || item.price === 0) flags.push('missing_price');
  if (!item.category) flags.push('missing_category');
  if (!item.brand) flags.push('missing_brand');

  return flags;
}

// Generate recommended actions
function generateRecommendedActions(confidence) {
  const actions = [];

  if (confidence < 0.4) {
    actions.push('manual_review_recommended');
  }

  if (confidence >= 0.6) {
    actions.push('ready_for_checkout');
  }

  return actions;
}

// Generate validation summary
function generateValidationSummary(validationResults) {
  const total = validationResults.length;
  const excellent = validationResults.filter(r => r.confidenceLevel === 'excellent').length;
  const good = validationResults.filter(r => r.confidenceLevel === 'good').length;
  const fair = validationResults.filter(r => r.confidenceLevel === 'fair').length;
  const poor = validationResults.filter(r => r.confidenceLevel === 'poor').length;

  const averageConfidence = validationResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / total;

  return {
    totalItems: total,
    confidenceDistribution: { excellent, good, fair, poor },
    averageConfidence: Math.round(averageConfidence * 100) / 100,
    percentageExcellent: Math.round((excellent / total) * 100),
    percentageGoodOrBetter: Math.round(((excellent + good) / total) * 100),
    itemsNeedingAttention: validationResults.filter(r => r.confidence < 0.4).length,
    readyForCheckout: validationResults.filter(r => r.confidence >= 0.6).length
  };
}

module.exports = router;