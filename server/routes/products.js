// server/routes/products.js - Product validation and pricing system
const express = require('express');
const router = express.Router();

console.log('🛒 Loading Product Validation System...');

// Product database - In production, this would be a real database or API
const PRODUCT_DATABASE = {
  // Meat & Seafood
  'chicken breast': { 
    id: 'meat_001', name: 'Boneless Skinless Chicken Breast', category: 'meat', 
    avgPrice: 4.99, unit: 'lb', available: true, stores: ['instacart', 'walmart', 'target'],
    alternatives: ['chicken thighs', 'chicken tenderloins'],
    nutrition: { protein: 31, calories: 165 }
  },
  'ground beef': { 
    id: 'meat_002', name: '85/15 Ground Beef', category: 'meat', 
    avgPrice: 5.99, unit: 'lb', available: true, stores: ['instacart', 'walmart'],
    alternatives: ['ground turkey', 'ground chicken'],
    nutrition: { protein: 25, calories: 250 }
  },
  'salmon': { 
    id: 'meat_003', name: 'Atlantic Salmon Fillet', category: 'meat', 
    avgPrice: 12.99, unit: 'lb', available: true, stores: ['instacart', 'whole_foods'],
    alternatives: ['tilapia', 'cod', 'tuna'],
    nutrition: { protein: 28, calories: 208 }
  },

  // Dairy & Eggs
  'milk': { 
    id: 'dairy_001', name: 'Whole Milk 1 Gallon', category: 'dairy', 
    avgPrice: 3.49, unit: 'gallon', available: true, stores: ['instacart', 'walmart', 'target'],
    alternatives: ['2% milk', 'skim milk', 'oat milk'],
    nutrition: { protein: 8, calories: 150 }
  },
  'eggs': { 
    id: 'dairy_002', name: 'Large Grade A Eggs', category: 'dairy', 
    avgPrice: 2.99, unit: 'dozen', available: true, stores: ['instacart', 'walmart', 'target'],
    alternatives: ['egg whites', 'organic eggs'],
    nutrition: { protein: 6, calories: 70 }
  },
  'cheese': { 
    id: 'dairy_003', name: 'Sharp Cheddar Cheese Block', category: 'dairy', 
    avgPrice: 4.49, unit: 'block', available: true, stores: ['instacart', 'walmart'],
    alternatives: ['mozzarella', 'swiss cheese', 'american cheese'],
    nutrition: { protein: 7, calories: 113 }
  },

  // Produce
  'banana': { 
    id: 'produce_001', name: 'Fresh Bananas', category: 'produce', 
    avgPrice: 1.29, unit: 'lb', available: true, stores: ['instacart', 'walmart', 'target'],
    alternatives: ['plantains', 'apples'],
    nutrition: { potassium: 422, calories: 105 }
  },
  'apple': { 
    id: 'produce_002', name: 'Gala Apples', category: 'produce', 
    avgPrice: 1.99, unit: 'lb', available: true, stores: ['instacart', 'walmart', 'target'],
    alternatives: ['granny smith apples', 'red delicious apples'],
    nutrition: { fiber: 4, calories: 95 }
  },
  'onion': { 
    id: 'produce_003', name: 'Yellow Onions', category: 'produce', 
    avgPrice: 1.49, unit: 'lb', available: true, stores: ['instacart', 'walmart'],
    alternatives: ['red onions', 'white onions', 'shallots'],
    nutrition: { vitamin_c: 7, calories: 40 }
  },
  'tomato': { 
    id: 'produce_004', name: 'Roma Tomatoes', category: 'produce', 
    avgPrice: 2.49, unit: 'lb', available: true, stores: ['instacart', 'walmart'],
    alternatives: ['cherry tomatoes', 'beefsteak tomatoes'],
    nutrition: { lycopene: 'high', calories: 18 }
  },

  // Pantry
  'rice': { 
    id: 'pantry_001', name: 'Long Grain White Rice', category: 'pantry', 
    avgPrice: 2.99, unit: 'bag', available: true, stores: ['instacart', 'walmart', 'target'],
    alternatives: ['brown rice', 'jasmine rice', 'quinoa'],
    nutrition: { carbs: 45, calories: 205 }
  },
  'pasta': { 
    id: 'pantry_002', name: 'Penne Pasta', category: 'pantry', 
    avgPrice: 1.99, unit: 'box', available: true, stores: ['instacart', 'walmart'],
    alternatives: ['spaghetti', 'macaroni', 'rigatoni'],
    nutrition: { carbs: 43, calories: 200 }
  },
  'bread': { 
    id: 'pantry_003', name: 'Whole Wheat Bread', category: 'pantry', 
    avgPrice: 2.49, unit: 'loaf', available: true, stores: ['instacart', 'walmart', 'target'],
    alternatives: ['white bread', 'sourdough bread'],
    nutrition: { fiber: 3, calories: 80 }
  },

  // Beverages  
  'water': { 
    id: 'beverage_001', name: 'Spring Water 24-pack', category: 'beverages', 
    avgPrice: 3.99, unit: 'case', available: true, stores: ['instacart', 'walmart', 'target'],
    alternatives: ['sparkling water', 'filtered water'],
    nutrition: { calories: 0 }
  },
  'orange juice': { 
    id: 'beverage_002', name: 'Pure Orange Juice', category: 'beverages', 
    avgPrice: 4.49, unit: 'carton', available: true, stores: ['instacart', 'walmart'],
    alternatives: ['apple juice', 'cranberry juice'],
    nutrition: { vitamin_c: 124, calories: 110 }
  }
};

// Store-specific pricing and availability
const STORE_DATA = {
  instacart: {
    name: 'Instacart',
    deliveryFee: 3.99,
    serviceFee: 1.99,
    minOrder: 35.00,
    estimatedDelivery: '1-2 hours',
    coverage: 'nationwide'
  },
  walmart: {
    name: 'Walmart Grocery',
    deliveryFee: 7.95,
    serviceFee: 0,
    minOrder: 35.00,
    estimatedDelivery: '2-4 hours',
    coverage: 'most cities'
  },
  target: {
    name: 'Target Same Day',
    deliveryFee: 9.99,
    serviceFee: 0,
    minOrder: 35.00,
    estimatedDelivery: '1-3 hours',
    coverage: 'major cities'
  }
};

/**
 * Validate a single product by name
 */
router.post('/validate', async (req, res) => {
  console.log('🔍 Product validation request received');
  
  try {
    const { productName, quantity = 1, preferredStores = [] } = req.body;
    
    if (!productName) {
      return res.status(400).json({
        success: false,
        error: 'Product name is required'
      });
    }

    const validation = await validateProduct(productName, quantity, preferredStores);
    
    res.json({
      success: true,
      query: productName,
      validation: validation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Product validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate product',
      message: error.message
    });
  }
});

/**
 * Validate multiple products at once
 */
router.post('/validate-batch', async (req, res) => {
  console.log('🔍 Batch product validation request received');
  
  try {
    const { products, preferredStores = [] } = req.body;
    
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Products array is required'
      });
    }

    const validations = await Promise.all(
      products.map(async (product) => {
        const productName = typeof product === 'string' ? product : product.productName;
        const quantity = typeof product === 'object' ? product.quantity || 1 : 1;
        
        return {
          originalInput: product,
          validation: await validateProduct(productName, quantity, preferredStores)
        };
      })
    );

    const summary = generateValidationSummary(validations);

    res.json({
      success: true,
      validations: validations,
      summary: summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Batch validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate products',
      message: error.message
    });
  }
});

/**
 * Get product pricing across different stores
 */
router.get('/pricing/:productId', async (req, res) => {
  console.log('💰 Product pricing request received');
  
  try {
    const { productId } = req.params;
    const { stores = [], zipCode } = req.query;
    
    const pricing = await getProductPricing(productId, stores.split(','), zipCode);
    
    res.json({
      success: true,
      productId: productId,
      pricing: pricing,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Pricing lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pricing',
      message: error.message
    });
  }
});

/**
 * Get product alternatives/substitutions
 */
router.get('/alternatives/:productName', async (req, res) => {
  console.log('🔄 Product alternatives request received');
  
  try {
    const { productName } = req.params;
    const { category, priceRange, dietary } = req.query;
    
    const alternatives = await findProductAlternatives(productName, {
      category,
      priceRange,
      dietary: dietary ? dietary.split(',') : []
    });
    
    res.json({
      success: true,
      originalProduct: productName,
      alternatives: alternatives,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Alternatives lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find alternatives',
      message: error.message
    });
  }
});

/**
 * Calculate cart totals with real pricing
 */
router.post('/calculate-cart', async (req, res) => {
  console.log('🧮 Cart calculation request received');
  
  try {
    const { items, store = 'instacart', zipCode, promoCode } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required'
      });
    }

    const calculation = await calculateCartTotal(items, store, zipCode, promoCode);
    
    res.json({
      success: true,
      calculation: calculation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cart calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate cart',
      message: error.message
    });
  }
});

/**
 * Search products by name or category
 */
router.get('/search', async (req, res) => {
  console.log('🔎 Product search request received');
  
  try {
    const { q, category, store, limit = 20 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }

    const results = searchProducts(q, { category, store, limit: parseInt(limit) });
    
    res.json({
      success: true,
      query: q,
      results: results,
      resultCount: results.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Product search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search products',
      message: error.message
    });
  }
});

// Core validation functions

/**
 * Validate a single product
 */
async function validateProduct(productName, quantity = 1, preferredStores = []) {
  const normalizedName = productName.toLowerCase().trim();
  
  // Direct match in database
  let product = PRODUCT_DATABASE[normalizedName];
  
  // Fuzzy matching if no direct match
  if (!product) {
    product = findBestMatch(normalizedName);
  }

  if (!product) {
    return {
      isValid: false,
      confidence: 0.2,
      reason: 'Product not found in database',
      suggestions: getSimilarProducts(normalizedName),
      originalQuery: productName
    };
  }

  // Check availability in preferred stores
  const availableStores = preferredStores.length > 0 ? 
    product.stores.filter(store => preferredStores.includes(store)) :
    product.stores;

  // Calculate total price
  const unitPrice = product.avgPrice;
  const totalPrice = unitPrice * quantity;

  return {
    isValid: true,
    confidence: 0.95,
    product: {
      id: product.id,
      name: product.name,
      category: product.category,
      unitPrice: unitPrice,
      unit: product.unit,
      quantity: quantity,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      nutrition: product.nutrition
    },
    availability: {
      available: product.available,
      stores: availableStores,
      estimatedDelivery: availableStores.length > 0 ? STORE_DATA[availableStores[0]]?.estimatedDelivery : null
    },
    alternatives: product.alternatives || [],
    originalQuery: productName
  };
}

/**
 * Find best matching product using fuzzy logic
 */
function findBestMatch(query) {
  const products = Object.entries(PRODUCT_DATABASE);
  let bestMatch = null;
  let bestScore = 0;

  for (const [key, product] of products) {
    const score = calculateSimilarity(query, key) + 
                  calculateSimilarity(query, product.name.toLowerCase()) * 0.7;
    
    if (score > bestScore && score > 0.6) {
      bestScore = score;
      bestMatch = product;
    }
  }

  return bestMatch;
}

/**
 * Calculate string similarity (simplified Levenshtein-based)
 */
function calculateSimilarity(str1, str2) {
  const words1 = str1.split(' ');
  const words2 = str2.split(' ');
  
  let matchingWords = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1.includes(word2) || word2.includes(word1)) {
        matchingWords++;
        break;
      }
    }
  }
  
  return matchingWords / Math.max(words1.length, words2.length);
}

/**
 * Get similar products for suggestions
 */
function getSimilarProducts(query, limit = 5) {
  const products = Object.entries(PRODUCT_DATABASE);
  const similar = [];

  for (const [key, product] of products) {
    const score = calculateSimilarity(query, key);
    if (score > 0.3) {
      similar.push({
        name: product.name,
        category: product.category,
        price: product.avgPrice,
        similarity: score
      });
    }
  }

  return similar
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Get product pricing across stores
 */
async function getProductPricing(productId, stores = [], zipCode = null) {
  // In a real implementation, this would call store APIs
  const baseProduct = Object.values(PRODUCT_DATABASE).find(p => p.id === productId);
  
  if (!baseProduct) {
    throw new Error('Product not found');
  }

  const pricing = {};
  const availableStores = stores.length > 0 ? stores : baseProduct.stores;

  for (const store of availableStores) {
    if (STORE_DATA[store]) {
      // No mock price generation - return error instead
      console.log('🚫 Mock pricing generation disabled for store:', store);
      pricing[store] = {
        ...STORE_DATA[store],
        price: null,
        inStock: false,
        deliveryAvailable: false,
        error: 'Mock pricing eliminated - use real store API integration',
        lastUpdated: new Date().toISOString()
      };
    }
  }

  return pricing;
}

/**
 * Find product alternatives
 */
async function findProductAlternatives(productName, options = {}) {
  const normalizedName = productName.toLowerCase().trim();
  const product = PRODUCT_DATABASE[normalizedName] || findBestMatch(normalizedName);
  
  if (!product) {
    return [];
  }

  const alternatives = [];
  
  // Add predefined alternatives
  if (product.alternatives) {
    for (const altName of product.alternatives) {
      const altProduct = PRODUCT_DATABASE[altName.toLowerCase()];
      if (altProduct) {
        alternatives.push({
          name: altProduct.name,
          price: altProduct.avgPrice,
          category: altProduct.category,
          reason: 'common substitute',
          available: altProduct.available
        });
      }
    }
  }

  // Add category-based alternatives
  const categoryProducts = Object.values(PRODUCT_DATABASE)
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  for (const catProduct of categoryProducts) {
    alternatives.push({
      name: catProduct.name,
      price: catProduct.avgPrice,
      category: catProduct.category,
      reason: 'same category',
      available: catProduct.available
    });
  }

  return alternatives.slice(0, 8); // Limit to 8 alternatives
}

/**
 * Calculate cart total with real pricing
 */
async function calculateCartTotal(items, store = 'instacart', zipCode = null, promoCode = null) {
  let subtotal = 0;
  const calculatedItems = [];
  let unavailableItems = [];

  // Process each item
  for (const item of items) {
    const validation = await validateProduct(
      item.productName || item.name, 
      item.quantity || 1
    );

    if (validation.isValid) {
      calculatedItems.push({
        name: validation.product.name,
        quantity: validation.product.quantity,
        unitPrice: validation.product.unitPrice,
        totalPrice: validation.product.totalPrice,
        category: validation.product.category
      });
      subtotal += validation.product.totalPrice;
    } else {
      unavailableItems.push({
        originalName: item.productName || item.name,
        reason: validation.reason,
        suggestions: validation.suggestions
      });
    }
  }

  // Get store fees
  const storeInfo = STORE_DATA[store] || STORE_DATA.instacart;
  const deliveryFee = subtotal >= storeInfo.minOrder ? storeInfo.deliveryFee : storeInfo.deliveryFee + 5.00;
  const serviceFee = storeInfo.serviceFee;

  // Calculate tax (approximate)
  const taxRate = 0.08; // 8% average
  const tax = subtotal * taxRate;

  // Apply promo code (simplified)
  let discount = 0;
  if (promoCode === 'FIRST10') {
    discount = subtotal * 0.1; // 10% off
  } else if (promoCode === 'SAVE5') {
    discount = 5.00;
  }

  const total = subtotal + deliveryFee + serviceFee + tax - discount;

  return {
    items: calculatedItems,
    unavailableItems: unavailableItems,
    pricing: {
      subtotal: parseFloat(subtotal.toFixed(2)),
      deliveryFee: parseFloat(deliveryFee.toFixed(2)),
      serviceFee: parseFloat(serviceFee.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    },
    store: storeInfo,
    itemCount: calculatedItems.length,
    unavailableCount: unavailableItems.length,
    meetsMinimumOrder: subtotal >= storeInfo.minOrder
  };
}

/**
 * Search products in database
 */
function searchProducts(query, options = {}) {
  const { category, store, limit = 20 } = options;
  const lowerQuery = query.toLowerCase();
  
  let products = Object.entries(PRODUCT_DATABASE);
  
  // Filter by category if specified
  if (category) {
    products = products.filter(([key, product]) => 
      product.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  // Filter by store availability if specified
  if (store) {
    products = products.filter(([key, product]) => 
      product.stores.includes(store.toLowerCase())
    );
  }
  
  // Score and sort by relevance
  const scoredProducts = products.map(([key, product]) => ({
    ...product,
    relevanceScore: calculateSimilarity(lowerQuery, key) + 
                   calculateSimilarity(lowerQuery, product.name.toLowerCase()) * 0.8
  }))
  .filter(product => product.relevanceScore > 0.1)
  .sort((a, b) => b.relevanceScore - a.relevanceScore)
  .slice(0, limit);

  return scoredProducts;
}

/**
 * Generate validation summary
 */
function generateValidationSummary(validations) {
  const total = validations.length;
  const valid = validations.filter(v => v.validation.isValid).length;
  const invalid = total - valid;
  
  const categories = {};
  validations.forEach(v => {
    if (v.validation.isValid) {
      const cat = v.validation.product.category;
      categories[cat] = (categories[cat] || 0) + 1;
    }
  });

  return {
    totalProducts: total,
    validProducts: valid,
    invalidProducts: invalid,
    validationRate: parseFloat((valid / total * 100).toFixed(1)),
    categoriesFound: Object.keys(categories).length,
    categoryBreakdown: categories
  };
}

console.log('✅ Product Validation System loaded successfully');
module.exports = router;