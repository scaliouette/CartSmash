// client/src/services/productValidationService.js
// AI-powered product validation with confidence matching and multi-store pricing

class ProductValidationService {
  constructor() {
    this.API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
    this.confidenceThresholds = {
      excellent: 0.8,
      good: 0.6,
      fair: 0.4,
      poor: 0.0
    };
  }

  /**
   * Validate shopping cart items against AI-powered product matching
   * @param {Array} cartItems - Array of cart items to validate
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} - Validation results with confidence scores
   */
  async validateCartItems(cartItems, options = {}) {
    const {
      includeAlternatives = true,
      minConfidence = 0.4,
      maxAlternatives = 3,
      includePricing = true,
      includeMultipleStores = true
    } = options;

    console.log(`🔍 Validating ${cartItems.length} cart items with AI confidence matching...`);

    try {
      const validationPromises = cartItems.map(item =>
        this.validateSingleItem(item, {
          includeAlternatives,
          minConfidence,
          maxAlternatives,
          includePricing,
          includeMultipleStores
        })
      );

      const validationResults = await Promise.all(validationPromises);

      const summary = this.generateValidationSummary(validationResults);

      return {
        success: true,
        validatedItems: validationResults,
        summary,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Cart validation failed:', error);
      return {
        success: false,
        error: error.message,
        validatedItems: []
      };
    }
  }

  /**
   * Validate a single cart item with AI-powered matching
   * @param {Object} item - Cart item to validate
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} - Validation result
   */
  async validateSingleItem(item, options = {}) {
    try {
      console.log(`🔎 Validating item: "${item.name || item.productName}"`);

      // Search for product matches with AI confidence scoring
      const searchResults = await this.searchProductMatches(item, options);

      // Calculate confidence score for current item
      const currentItemConfidence = this.calculateItemConfidence(item, searchResults.bestMatch);

      // Generate alternatives if requested
      const alternatives = options.includeAlternatives
        ? this.filterAlternatives(searchResults.matches, options)
        : [];

      // Get pricing from multiple stores if requested
      const multiStorePricing = options.includeMultipleStores
        ? await this.getMultiStorePricing(item, searchResults.bestMatch)
        : null;

      return {
        originalItem: item,
        confidence: currentItemConfidence,
        confidenceLevel: this.getConfidenceLevel(currentItemConfidence),
        bestMatch: searchResults.bestMatch,
        alternatives,
        multiStorePricing,
        validationFlags: this.generateValidationFlags(item, currentItemConfidence),
        recommendedActions: this.generateRecommendedActions(currentItemConfidence, alternatives),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to validate item "${item.name}":`, error);
      return {
        originalItem: item,
        confidence: 0,
        confidenceLevel: 'error',
        error: error.message,
        validationFlags: ['validation_failed'],
        recommendedActions: ['manual_review_required']
      };
    }
  }

  /**
   * Search for product matches using enhanced AI matching
   * @param {Object} item - Item to search for
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Search results with matches
   */
  async searchProductMatches(item, options = {}) {
    const searchTerm = item.name || item.productName || '';
    const category = item.category || 'general';
    const brand = item.brand || null;

    const response = await fetch(`${this.API_URL}/api/product-validation/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchTerm,
        category,
        brand,
        originalItem: item,
        options: {
          enableAIMatching: true,
          includeConfidenceScoring: true,
          maxResults: options.maxAlternatives + 1,
          minConfidence: options.minConfidence || 0.4
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Product search failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Product search failed');
    }

    return {
      matches: data.products || [],
      bestMatch: data.products?.[0] || null,
      totalFound: data.count || 0,
      searchTerm
    };
  }

  /**
   * Calculate confidence score for an item match
   * @param {Object} originalItem - Original cart item
   * @param {Object} matchedProduct - Matched product from search
   * @returns {number} - Confidence score (0-1)
   */
  calculateItemConfidence(originalItem, matchedProduct) {
    if (!matchedProduct) return 0;

    let confidence = 0;
    let factors = 0;

    // Name similarity (40% weight)
    const nameSimilarity = this.calculateNameSimilarity(
      originalItem.name || originalItem.productName || '',
      matchedProduct.name || ''
    );
    confidence += nameSimilarity * 0.4;
    factors++;

    // Brand matching (25% weight)
    if (originalItem.brand && matchedProduct.brand) {
      const brandMatch = originalItem.brand.toLowerCase() === matchedProduct.brand.toLowerCase();
      confidence += (brandMatch ? 1.0 : 0.0) * 0.25;
      factors++;
    }

    // Category matching (20% weight)
    if (originalItem.category && matchedProduct.category) {
      const categoryMatch = originalItem.category.toLowerCase() === matchedProduct.category.toLowerCase();
      confidence += (categoryMatch ? 1.0 : 0.0) * 0.20;
      factors++;
    }

    // Size/quantity matching (10% weight)
    if (originalItem.size && matchedProduct.size) {
      const sizeMatch = this.compareSizes(originalItem.size, matchedProduct.size);
      confidence += sizeMatch * 0.10;
      factors++;
    }

    // Availability bonus/penalty (5% weight)
    const availabilityScore = matchedProduct.availability === 'in_stock' ? 1.0 :
                             matchedProduct.availability === 'low_stock' ? 0.5 : 0.0;
    confidence += availabilityScore * 0.05;
    // eslint-disable-next-line no-unused-vars
    factors++;

    return Math.min(1.0, confidence);
  }

  /**
   * Calculate name similarity using enhanced algorithm
   * @param {string} name1 - First name
   * @param {string} name2 - Second name
   * @returns {number} - Similarity score (0-1)
   */
  calculateNameSimilarity(name1, name2) {
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
          } else if (this.levenshteinDistance(word1, word2) <= 2) {
            partialMatches += 0.3;
          }
        }
      });
    });

    const totalScore = (matchingWords + partialMatches) / Math.max(words1.length, words2.length);
    return Math.min(1.0, totalScore);
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Edit distance
   */
  levenshteinDistance(str1, str2) {
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

  /**
   * Compare size strings for similarity
   * @param {string} size1 - First size
   * @param {string} size2 - Second size
   * @returns {number} - Size similarity score (0-1)
   */
  compareSizes(size1, size2) {
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

    return this.calculateNameSimilarity(size1, size2);
  }

  /**
   * Get confidence level from score
   * @param {number} confidence - Confidence score (0-1)
   * @returns {string} - Confidence level
   */
  getConfidenceLevel(confidence) {
    if (confidence >= this.confidenceThresholds.excellent) return 'excellent';
    if (confidence >= this.confidenceThresholds.good) return 'good';
    if (confidence >= this.confidenceThresholds.fair) return 'fair';
    return 'poor';
  }

  /**
   * Filter alternatives based on criteria
   * @param {Array} matches - All matches
   * @param {Object} options - Filter options
   * @returns {Array} - Filtered alternatives
   */
  filterAlternatives(matches, options) {
    return matches
      .filter(match => match.confidence >= options.minConfidence)
      .slice(1, options.maxAlternatives + 1) // Skip first (best match)
      .map(match => ({
        ...match,
        confidenceLevel: this.getConfidenceLevel(match.confidence),
        reasons: this.generateMatchReasons(match)
      }));
  }

  /**
   * Get pricing from multiple stores
   * @param {Object} originalItem - Original cart item
   * @param {Object} bestMatch - Best matched product
   * @returns {Promise<Object>} - Multi-store pricing data
   */
  async getMultiStorePricing(originalItem, bestMatch) {
    try {
      const response = await fetch(`${this.API_URL}/api/product-validation/multi-store-pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: originalItem.name || originalItem.productName,
          productId: bestMatch?.id,
          category: originalItem.category,
          zipCode: '95670' // Default zip, should be user configurable
        })
      });

      if (!response.ok) {
        throw new Error(`Multi-store pricing failed: ${response.status}`);
      }

      const data = await response.json();
      return data.pricing || null;
    } catch (error) {
      console.warn('⚠️ Multi-store pricing unavailable:', error.message);
      return null;
    }
  }

  /**
   * Generate validation flags for an item
   * @param {Object} item - Cart item
   * @param {number} confidence - Confidence score
   * @returns {Array} - Array of validation flags
   */
  generateValidationFlags(item, confidence) {
    const flags = [];

    if (confidence < this.confidenceThresholds.fair) {
      flags.push('low_confidence');
    }

    if (confidence >= this.confidenceThresholds.excellent) {
      flags.push('high_confidence');
    }

    if (!item.price || item.price === 0) {
      flags.push('missing_price');
    }

    if (!item.category) {
      flags.push('missing_category');
    }

    if (!item.brand) {
      flags.push('missing_brand');
    }

    return flags;
  }

  /**
   * Generate recommended actions based on validation
   * @param {number} confidence - Confidence score
   * @param {Array} alternatives - Alternative products
   * @returns {Array} - Array of recommended actions
   */
  generateRecommendedActions(confidence, alternatives) {
    const actions = [];

    if (confidence < this.confidenceThresholds.fair) {
      actions.push('manual_review_recommended');
      if (alternatives.length > 0) {
        actions.push('consider_alternatives');
      }
    }

    if (confidence >= this.confidenceThresholds.good) {
      actions.push('ready_for_checkout');
    }

    if (alternatives.length > 0) {
      actions.push('alternatives_available');
    }

    return actions;
  }

  /**
   * Generate match reasons for a product
   * @param {Object} match - Matched product
   * @returns {Array} - Array of match reasons
   */
  generateMatchReasons(match) {
    const reasons = [];

    if (match.confidence >= this.confidenceThresholds.excellent) {
      reasons.push('Excellent name match');
    }

    if (match.brand) {
      reasons.push(`Same brand: ${match.brand}`);
    }

    if (match.category) {
      reasons.push(`Category: ${match.category}`);
    }

    if (match.availability === 'in_stock') {
      reasons.push('In stock');
    }

    return reasons;
  }

  /**
   * Generate validation summary
   * @param {Array} validationResults - All validation results
   * @returns {Object} - Validation summary
   */
  generateValidationSummary(validationResults) {
    const total = validationResults.length;
    const excellent = validationResults.filter(r => r.confidenceLevel === 'excellent').length;
    const good = validationResults.filter(r => r.confidenceLevel === 'good').length;
    const fair = validationResults.filter(r => r.confidenceLevel === 'fair').length;
    const poor = validationResults.filter(r => r.confidenceLevel === 'poor').length;

    const averageConfidence = validationResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / total;

    return {
      totalItems: total,
      confidenceDistribution: {
        excellent,
        good,
        fair,
        poor
      },
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      percentageExcellent: Math.round((excellent / total) * 100),
      percentageGoodOrBetter: Math.round(((excellent + good) / total) * 100),
      itemsNeedingAttention: validationResults.filter(r => r.confidence < this.confidenceThresholds.fair).length,
      readyForCheckout: validationResults.filter(r => r.confidence >= this.confidenceThresholds.good).length
    };
  }

  /**
   * Get confidence color for UI display
   * @param {number} confidence - Confidence score
   * @returns {string} - CSS color
   */
  getConfidenceColor(confidence) {
    if (confidence >= this.confidenceThresholds.excellent) return '#10b981'; // Green
    if (confidence >= this.confidenceThresholds.good) return '#f59e0b'; // Yellow
    if (confidence >= this.confidenceThresholds.fair) return '#ef4444'; // Red
    return '#6b7280'; // Gray
  }

  /**
   * Get confidence label for UI display
   * @param {number} confidence - Confidence score
   * @returns {string} - Confidence label
   */
  getConfidenceLabel(confidence) {
    if (confidence >= this.confidenceThresholds.excellent) return 'Excellent Match';
    if (confidence >= this.confidenceThresholds.good) return 'Good Match';
    if (confidence >= this.confidenceThresholds.fair) return 'Fair Match';
    return 'Poor Match';
  }
}

// Create and export a singleton instance
const productValidationService = new ProductValidationService();
export default productValidationService;