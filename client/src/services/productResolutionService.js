// client/src/services/productResolutionService.js
// Enhanced product ID resolution for CartSmash to Instacart integration

import instacartService from './instacartService';

class ProductResolutionService {
  constructor() {
    this.cache = new Map(); // Cache for resolved products
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    
    // Common unit mappings
    this.unitMappings = {
      'lb': 'pound',
      'lbs': 'pound', 
      'pound': 'pound',
      'pounds': 'pound',
      'oz': 'ounce',
      'ounce': 'ounce',
      'ounces': 'ounce',
      'kg': 'kilogram',
      'gram': 'gram',
      'grams': 'gram',
      'cup': 'cup',
      'cups': 'cup',
      'tsp': 'teaspoon',
      'teaspoon': 'teaspoon',
      'tbsp': 'tablespoon',
      'tablespoon': 'tablespoon',
      'piece': 'each',
      'pieces': 'each',
      'item': 'each',
      'items': 'each',
      'each': 'each',
      'bunch': 'bunch',
      'bag': 'bag',
      'box': 'box',
      'bottle': 'bottle',
      'can': 'can',
      'jar': 'jar',
      'package': 'package',
      'pack': 'package'
    };

    console.log('🔧 ProductResolutionService initialized');
  }

  // Main method to resolve CartSmash items to Instacart products
  async resolveCartSmashItems(cartItems, retailerId = null) {
    console.log('🔍 ===== PRODUCT RESOLUTION DEBUG =====');
    console.log(`📝 Input: ${cartItems.length} CartSmash items to resolve`);
    console.log(`🏪 Retailer: ${retailerId || 'default'}`);
    console.log('📋 Items to resolve:', cartItems.map((item, index) => ({
      index,
      productName: item.productName || item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      hasRequiredFields: !!(item.productName || item.name)
    })));
    console.log('🛒 Using direct Instacart API search for product matching');
    
    // Use the legacy resolution method as primary method since catalog service doesn't exist
    const result = await this.legacyResolveCartSmashItems(cartItems, retailerId);
    
    console.log('✅ ===== PRODUCT RESOLUTION RESULTS =====');
    console.log(`📊 Resolution stats:`, result.stats);
    console.log(`✅ Resolved items (${result.resolved.length}):`, result.resolved.map(item => ({
      originalName: item.originalItem?.productName || item.originalItem?.name,
      resolvedName: item.instacartProduct?.name,
      productId: item.instacartProduct?.id,
      retailerSku: item.instacartProduct?.retailer_sku,
      price: item.instacartProduct?.price,
      confidence: item.confidence
    })));
    console.log(`❌ Unresolved items (${result.unresolved.length}):`, result.unresolved.map(item => ({
      originalName: item.originalItem?.productName || item.originalItem?.name,
      reason: item.reason
    })));
    
    return result;
  }

  // Legacy resolution method as fallback
  async legacyResolveCartSmashItems(cartItems, retailerId = null) {
    const resolvedItems = [];
    const unresolvedItems = [];

    for (const item of cartItems) {
      try {
        const resolved = await this.resolveItem(item, retailerId);
        if (resolved.success) {
          resolvedItems.push(resolved);
        } else {
          unresolvedItems.push({
            originalItem: item,
            reason: resolved.error || 'No matching product found'
          });
        }
      } catch (error) {
        console.error('❌ Error resolving item:', item, error);
        unresolvedItems.push({
          originalItem: item,
          reason: error.message
        });
      }
    }

    return {
      success: true,
      resolved: resolvedItems,
      unresolved: unresolvedItems,
      stats: {
        total: cartItems.length,
        resolved: resolvedItems.length,
        unresolved: unresolvedItems.length,
        resolutionRate: ((resolvedItems.length / cartItems.length) * 100).toFixed(1) + '%'
      }
    };
  }

  // Resolve individual CartSmash item to Instacart product with vendor-specific validation
  async resolveItem(item, retailerId = null) {
    const cacheKey = this.getCacheKey(item, retailerId);
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      console.log('📦 Using cached result for:', item.productName || item.name || item.item || 'unknown item');
      return cached;
    }

    try {
      // Extract item details
      const itemDetails = this.parseItemDetails(item);
      console.log('📝 Parsed item details:', itemDetails);

      // Search for matching products in Instacart with vendor-specific context
      const searchResults = await this.searchInstacartProducts(itemDetails, retailerId);
      
      if (searchResults.products && searchResults.products.length > 0) {
        // Find best match with AI-enhanced vendor-specific scoring
        const bestMatch = await this.findBestMatch(itemDetails, searchResults.products);
        const alternativeMatches = this.getAlternativeMatches(itemDetails, searchResults.products, 3);
        
        const resolved = {
          success: true,
          originalItem: item,
          instacartProduct: {
            ...bestMatch,
            // Ensure we have the required fields for Instacart API
            id: bestMatch.id || `instacart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sku: bestMatch.sku || bestMatch.id || `sku_${Date.now()}`,
            retailer_sku: bestMatch.retailer_sku || bestMatch.sku || bestMatch.id
          },
          resolvedDetails: {
            productId: bestMatch.id || `instacart_${Date.now()}`,
            name: bestMatch.name,
            brand: bestMatch.brand,
            size: bestMatch.size,
            price: bestMatch.price,
            quantity: itemDetails.quantity, // Number of items to purchase
            measurement: itemDetails.measurement, // Size/weight of each item
            unit: itemDetails.unit,
            displayName: itemDetails.measurement > 1 && ['pound', 'ounce', 'kilogram', 'gram', 'cup', 'teaspoon', 'tablespoon'].includes(itemDetails.unit) 
              ? `${itemDetails.measurement} ${itemDetails.unit} ${itemDetails.cleanName}` 
              : itemDetails.cleanName,
            totalPrice: (bestMatch.price * itemDetails.quantity).toFixed(2)
          },
          vendorSpecific: {
            retailerId: retailerId,
            searchQuery: itemDetails.searchQuery,
            totalSearchResults: searchResults.products.length,
            alternativeMatches: alternativeMatches,
            needsApproval: this.requiresUserApproval(itemDetails, bestMatch),
            matchReason: this.getMatchReason(itemDetails, bestMatch)
          },
          confidence: this.calculateConfidence(itemDetails, bestMatch)
        };

        // Cache the result
        this.cacheResult(cacheKey, resolved);
        return resolved;
        
      } else {
        const failed = {
          success: false,
          originalItem: item,
          error: 'No matching products found in Instacart catalog',
          searchQuery: itemDetails.searchQuery
        };
        
        // Cache failed result for shorter time
        this.cacheResult(cacheKey, failed, 5 * 60 * 1000); // 5 minutes
        return failed;
      }
      
    } catch (error) {
      console.error('❌ Error resolving item:', error);
      return {
        success: false,
        originalItem: item,
        error: error.message
      };
    }
  }

  // Parse CartSmash item details into structured format
  parseItemDetails(item) {
    // Handle different item formats from CartSmash
    const rawName = item.productName || item.name || item.item || '';
    const rawQuantity = item.quantity || 1;
    const rawUnit = item.unit || '';
    
    // Extract quantity and unit from name if not separate
    let cleanName = rawName;
    let measurement = parseFloat(rawQuantity) || 1;
    let unit = rawUnit.toLowerCase();
    let itemCount = 1; // Default to 1 item

    // Parse patterns like "2 lbs apples" or "1 cup flour" or "20 oz chicken breast"
    const quantityPattern = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/;
    const match = rawName.match(quantityPattern);
    
    if (match && !rawUnit) {
      const [, extractedQty, extractedUnit, extractedName] = match;
      measurement = parseFloat(extractedQty) || measurement;
      unit = extractedUnit ? extractedUnit.toLowerCase() : unit;
      cleanName = extractedName;
    }

    // Normalize unit
    const normalizedUnit = this.unitMappings[unit] || unit || 'each';

    // Determine if this is a measurement (weight/volume) or item count
    // Weight/volume units should be treated as measurements, not item counts
    const measurementUnits = ['pound', 'ounce', 'kilogram', 'gram', 'cup', 'teaspoon', 'tablespoon'];
    
    if (measurementUnits.includes(normalizedUnit)) {
      // This is a measurement - keep itemCount as 1, measurement as the amount
      itemCount = 1;
      // Keep measurement as is for product description
    } else {
      // This is a count-based unit (each, piece, bottle, etc.)
      itemCount = measurement;
      measurement = 1; // Reset measurement since it's about count
    }

    // Create search query - include measurement in product name for weight/volume items
    let searchQuery;
    if (measurementUnits.includes(normalizedUnit) && measurement > 1) {
      searchQuery = this.createSearchQuery(`${measurement} ${unit} ${cleanName}`);
    } else {
      searchQuery = this.createSearchQuery(cleanName);
    }

    return {
      originalName: rawName,
      cleanName: cleanName.trim(),
      quantity: itemCount, // Number of items to purchase
      measurement, // Size/weight/volume of each item
      unit: normalizedUnit,
      searchQuery,
      category: item.category || '',
      brand: item.brand || ''
    };
  }

  // Create optimized search query for Instacart
  createSearchQuery(name) {
    // Remove common words that might confuse search
    const stopWords = ['fresh', 'organic', 'natural', 'free', 'range', 'local'];
    const words = name.toLowerCase().split(/\s+/);
    const cleanedWords = words.filter(word => 
      word.length > 2 && !stopWords.includes(word)
    );
    
    return cleanedWords.join(' ').trim() || name;
  }

  // Search Instacart products using the existing service
  async searchInstacartProducts(itemDetails, retailerId) {
    try {
      console.log('🔍 Searching Instacart for:', itemDetails.searchQuery);
      return await instacartService.searchProducts(itemDetails.searchQuery, retailerId);
    } catch (error) {
      console.error('❌ Instacart search error:', error);
      throw error;
    }
  }

  // Find best matching product from search results
  async findBestMatch(itemDetails, products) {
    if (products.length === 1) {
      return products[0];
    }

    // First, use basic scoring to narrow down candidates
    const scoredProducts = products.map(product => ({
      ...product,
      basicScore: this.calculateMatchScore(itemDetails, product)
    }));

    // Sort by basic score (highest first)
    scoredProducts.sort((a, b) => b.basicScore - a.basicScore);
    
    // Take top 3 candidates for AI evaluation if we have multiple good matches
    const topCandidates = scoredProducts.slice(0, Math.min(3, scoredProducts.length));
    
    // If top candidate has very high confidence or only one candidate, skip AI
    if (topCandidates.length === 1 || topCandidates[0].basicScore >= 75) {
      console.log('🎯 Best match for', itemDetails.cleanName, ':', topCandidates[0].name, 'Score:', topCandidates[0].basicScore);
      return topCandidates[0];
    }
    
    // Use AI to determine best match among top candidates
    try {
      const aiEnhancedMatch = await this.getAIEnhancedMatch(itemDetails, topCandidates);
      if (aiEnhancedMatch) {
        console.log('🤖 AI-enhanced match for', itemDetails.cleanName, ':', aiEnhancedMatch.name, 'AI Score:', aiEnhancedMatch.aiScore);
        return aiEnhancedMatch;
      }
    } catch (error) {
      console.warn('🤖 AI matching failed, falling back to basic scoring:', error);
    }
    
    // Fallback to basic scoring
    console.log('🎯 Best match for', itemDetails.cleanName, ':', topCandidates[0].name, 'Score:', topCandidates[0].basicScore);
    return topCandidates[0];
  }

  // Calculate match score for product relevance
  calculateMatchScore(itemDetails, product) {
    let score = 0;
    const productName = (product.name || '').toLowerCase();
    const itemName = itemDetails.cleanName.toLowerCase();
    const searchQuery = itemDetails.searchQuery.toLowerCase();

    // Exact name match bonus
    if (productName.includes(itemName)) {
      score += 50;
    }

    // Search query word matches
    const queryWords = searchQuery.split(/\s+/);
    queryWords.forEach(word => {
      if (productName.includes(word)) {
        score += 10;
      }
    });

    // Brand match bonus
    if (itemDetails.brand && product.brand) {
      const itemBrand = itemDetails.brand.toLowerCase();
      const productBrand = (product.brand || '').toLowerCase();
      if (productBrand.includes(itemBrand) || itemBrand.includes(productBrand)) {
        score += 25;
      }
    }

    // Availability bonus
    if (product.availability === 'in_stock') {
      score += 15;
    } else if (product.availability === 'limited_stock') {
      score += 5;
    }

    // Price reasonableness (prefer mid-range prices)
    if (product.price && product.price > 0.50 && product.price < 50) {
      score += 5;
    }

    return score;
  }

  // Calculate confidence level for the match
  calculateConfidence(itemDetails, product) {
    const score = this.calculateMatchScore(itemDetails, product);
    
    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    if (score >= 25) return 'low';
    return 'very_low';
  }

  // Cache management
  getCacheKey(item, retailerId) {
    const itemKey = item.productName || item.name || item.item || '';
    return `${itemKey}_${retailerId || 'default'}_${item.quantity || 1}_${item.unit || ''}`;
  }

  getCachedResult(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key); // Remove expired
    }
    return null;
  }

  cacheResult(key, result, ttl = this.cacheExpiry) {
    this.cache.set(key, {
      data: result,
      timestamp: Date.now(),
      ttl
    });
  }

  // Clear expired cache entries
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Get alternative matches for user approval
  getAlternativeMatches(itemDetails, products, limit = 3) {
    const scoredProducts = products.map(product => ({
      ...product,
      score: this.calculateMatchScore(itemDetails, product)
    }));

    // Sort by score and return top alternatives (excluding the best match)
    scoredProducts.sort((a, b) => b.score - a.score);
    return scoredProducts.slice(1, limit + 1).map(product => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      size: product.size,
      score: product.score,
      availability: product.availability || 'unknown'
    }));
  }

  // Determine if user approval is required
  requiresUserApproval(itemDetails, bestMatch) {
    const confidence = this.calculateConfidence(itemDetails, bestMatch);
    const score = this.calculateMatchScore(itemDetails, bestMatch);
    
    // Require approval for low confidence matches or significant price differences
    if (confidence === 'low' || confidence === 'very_low') {
      return true;
    }

    // Require approval if the match seems questionable
    const itemName = itemDetails.cleanName.toLowerCase();
    const productName = (bestMatch.name || '').toLowerCase();
    
    // Check for potential category mismatches
    const foodCategories = ['meat', 'dairy', 'produce', 'frozen', 'canned', 'bakery', 'snack'];
    const itemHasCategory = foodCategories.some(cat => itemName.includes(cat));
    const productHasCategory = foodCategories.some(cat => productName.includes(cat));
    
    if (itemHasCategory && productHasCategory) {
      // Both have categories - check if they're different
      for (const cat of foodCategories) {
        if (itemName.includes(cat) && !productName.includes(cat)) {
          return true; // Potential category mismatch
        }
      }
    }

    // Check for unusual price points (very cheap or very expensive)
    if (bestMatch.price && (bestMatch.price < 0.99 || bestMatch.price > 25.00)) {
      return true;
    }

    return false;
  }

  // Get human-readable match reason
  getMatchReason(itemDetails, bestMatch) {
    const score = this.calculateMatchScore(itemDetails, bestMatch);
    const productName = (bestMatch.name || '').toLowerCase();
    const itemName = itemDetails.cleanName.toLowerCase();

    if (productName.includes(itemName)) {
      return 'Exact name match found in product title';
    }

    if (score >= 75) {
      return 'High confidence match based on keywords and brand';
    }

    if (score >= 50) {
      return 'Good match based on product name similarity';
    }

    if (score >= 25) {
      return 'Potential match found, please verify details';
    }

    return 'Low confidence match, manual review recommended';
  }

  // AI-Enhanced Product Matching
  async getAIEnhancedMatch(itemDetails, candidates) {
    const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
    
    try {
      console.log('🤖 Requesting AI product matching for:', itemDetails.cleanName);
      
      const prompt = this.buildAIMatchingPrompt(itemDetails, candidates);
      
      const response = await fetch(`${API_URL}/api/ai/enhance-product-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          itemDetails: itemDetails,
          candidates: candidates.map(candidate => ({
            id: candidate.id,
            name: candidate.name,
            brand: candidate.brand,
            size: candidate.size,
            price: candidate.price,
            availability: candidate.availability,
            basicScore: candidate.basicScore
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error(`AI matching API failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.bestMatch) {
        // Find the full product object that matches the AI selection
        const selectedProduct = candidates.find(candidate => 
          candidate.id === result.bestMatch.id || candidate.name === result.bestMatch.name
        );
        
        if (selectedProduct) {
          return {
            ...selectedProduct,
            aiScore: result.bestMatch.aiScore || 95,
            aiReason: result.bestMatch.reason || 'AI selected as best match',
            aiConfidence: result.bestMatch.confidence || 'high'
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('🤖 AI product matching error:', error);
      throw error;
    }
  }

  // Build AI prompt for product matching
  buildAIMatchingPrompt(itemDetails, candidates) {
    return `You are a grocery product matching expert. Help me find the best match for a recipe ingredient.

INGREDIENT TO MATCH:
- Name: "${itemDetails.cleanName}"
- Quantity: ${itemDetails.quantity} ${itemDetails.unit}
- Original: "${itemDetails.originalName}"
- Search Query: "${itemDetails.searchQuery}"

VENDOR PRODUCT OPTIONS:
${candidates.map((candidate, index) => `
${index + 1}. ${candidate.name}
   - Brand: ${candidate.brand || 'N/A'}
   - Size: ${candidate.size || 'N/A'}
   - Price: $${candidate.price || 'N/A'}
   - Availability: ${candidate.availability || 'unknown'}
   - Basic Score: ${candidate.basicScore}
`).join('')}

INSTRUCTIONS:
Analyze which vendor product best matches the recipe ingredient considering:
1. Product name similarity and relevance
2. Appropriate size/quantity for the recipe
3. Brand quality and recognition
4. Price reasonableness
5. Availability

Respond with ONLY a JSON object:
{
  "bestMatch": {
    "id": "selected_product_id_or_name",
    "aiScore": 85,
    "confidence": "high|medium|low",
    "reason": "Brief explanation of why this is the best match"
  }
}`;
  }
}

// Export singleton instance
const productResolutionService = new ProductResolutionService();
export default productResolutionService;