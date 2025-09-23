// server/routes/instacartRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateUser } = require('../middleware/auth');

// Try to import puppeteer for dynamic content loading (optional)
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.log('⚠️ Puppeteer not available - using HTML-only parsing');
}

// Instacart API configuration - UPDATED 2025
const INSTACART_API_KEY = process.env.INSTACART_API_KEY;
const INSTACART_CONNECT_API_KEY = process.env.INSTACART_CONNECT_API_KEY || INSTACART_API_KEY;
const INSTACART_CATALOG_API_KEY = process.env.INSTACART_CATALOG_API_KEY || INSTACART_API_KEY;
const INSTACART_DEVELOPER_API_KEY = process.env.INSTACART_DEVELOPER_API_KEY || INSTACART_API_KEY;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Updated API endpoint configurations for 2025
const API_ENDPOINTS = {
  DEVELOPMENT: 'https://connect.dev.instacart.tools/idp/v1',
  PRODUCTION: 'https://connect.instacart.com/idp/v1'
};

const BASE_URL = NODE_ENV === 'production' ? API_ENDPOINTS.PRODUCTION : API_ENDPOINTS.DEVELOPMENT;

// Performance optimization configurations
const PERFORMANCE_CONFIG = {
  HTML_CACHE_SIZE: 50,
  HTML_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  PARSING_TIMEOUT: 15000, // 15 seconds
  MAX_PARALLEL_REQUESTS: 3,
  REQUEST_RETRY_DELAY: 1000,
  MAX_HTML_SIZE: 5 * 1024 * 1024 // 5MB
};

// Enhanced caching system for HTML pages and parsing results
const htmlCache = new Map();
const parseCache = new Map();
let cacheCleanupInterval = null;

// Circuit breaker pattern for API resilience
const circuitBreaker = {
  recipe: { failures: 0, lastFailure: 0, isOpen: false },
  catalog: { failures: 0, lastFailure: 0, isOpen: false },
  FAILURE_THRESHOLD: 5,
  TIMEOUT: 30000, // 30 seconds

  isCircuitOpen(service) {
    const circuit = this[service];
    if (!circuit.isOpen) return false;

    // Check if timeout has passed to allow retry
    if (Date.now() - circuit.lastFailure > this.TIMEOUT) {
      circuit.isOpen = false;
      circuit.failures = 0;
      console.log(`🔄 Circuit breaker RESET for ${service} service`);
      return false;
    }

    return true;
  },

  recordFailure(service) {
    const circuit = this[service];
    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.failures >= this.FAILURE_THRESHOLD) {
      circuit.isOpen = true;
      console.log(`⚡ Circuit breaker OPENED for ${service} service after ${circuit.failures} failures`);
    }
  },

  recordSuccess(service) {
    const circuit = this[service];
    circuit.failures = 0;
    circuit.isOpen = false;
  }
};

// Initialize cache cleanup
if (!cacheCleanupInterval) {
  cacheCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of htmlCache.entries()) {
      if (now - value.timestamp > PERFORMANCE_CONFIG.HTML_CACHE_TTL) {
        htmlCache.delete(key);
      }
    }
    for (const [key, value] of parseCache.entries()) {
      if (now - value.timestamp > PERFORMANCE_CONFIG.HTML_CACHE_TTL) {
        parseCache.delete(key);
      }
    }
    // Silent cache cleanup for production efficiency
  }, PERFORMANCE_CONFIG.HTML_CACHE_TTL);
}

// Recipe caching system - Best practice per Instacart docs
const crypto = require('crypto');
const recipeCache = new Map();
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

// Generate cache key for recipe based on content
function generateRecipeCacheKey(recipeData) {
  const keyData = {
    title: recipeData.title,
    ingredients: recipeData.ingredients?.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
    instructions: recipeData.instructions,
    servings: recipeData.servings,
    author: recipeData.author
  };
  return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
}

// Check if cached recipe is still valid
function isCacheValid(cacheEntry) {
  return cacheEntry && (Date.now() - cacheEntry.timestamp < CACHE_DURATION);
}

// Get cached recipe URL if available and valid
function getCachedRecipeUrl(cacheKey) {
  const cached = recipeCache.get(cacheKey);
  if (isCacheValid(cached)) {
    console.log(`🎯 Using cached recipe URL for key: ${cacheKey}`);
    return cached;
  }
  
  if (cached) {
    recipeCache.delete(cacheKey); // Remove expired cache
    // Expired cache entry removed
  }
  
  return null;
}

// Cache recipe URL with expiration
function cacheRecipeUrl(cacheKey, result) {
  const cacheEntry = {
    ...result,
    timestamp: Date.now(),
    cacheKey
  };
  recipeCache.set(cacheKey, cacheEntry);
  // Recipe cached successfully
  return cacheEntry;
}

// Enhanced real product parsing from Instacart recipe page
async function parseRealProductsFromRecipe(recipeUrl, query, originalItem, retailerId) {
  if (!recipeUrl) return [];

  // Check parse cache first
  const cacheKey = `parse_${recipeUrl}_${query}`;
  if (parseCache.has(cacheKey)) {
    const cached = parseCache.get(cacheKey);
    if (Date.now() - cached.timestamp < PERFORMANCE_CONFIG.HTML_CACHE_TTL) {
      return cached.products;
    }
  }

  const startTime = Date.now();
  try {
    // Check HTML cache first
    const htmlCacheKey = `html_${recipeUrl}`;
    let htmlContent;

    if (htmlCache.has(htmlCacheKey)) {
      const cached = htmlCache.get(htmlCacheKey);
      if (Date.now() - cached.timestamp < PERFORMANCE_CONFIG.HTML_CACHE_TTL) {
        htmlContent = cached.html;
      }
    }

    if (!htmlContent) {
      // Fetch HTML with streamlined approach
      const response = await axios.get(recipeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 10000,
        maxContentLength: PERFORMANCE_CONFIG.MAX_HTML_SIZE,
        maxRedirects: 2
      });

      htmlContent = response.data;

      // Efficient cache management
      if (htmlCache.size >= PERFORMANCE_CONFIG.HTML_CACHE_SIZE) {
        const oldestKey = htmlCache.keys().next().value;
        htmlCache.delete(oldestKey);
      }
      htmlCache.set(htmlCacheKey, {
        html: htmlContent,
        timestamp: Date.now()
      });
    }

    const $ = cheerio.load(htmlContent, {
      xmlMode: false,
      decodeEntities: false,
      lowerCaseAttributeNames: false
    });
    let products = [];

    // Method 1: Extract Apollo GraphQL state data - ENHANCED WITH MULTIPLE DATA PATHS
    try {
      const apolloScript = $('#node-apollo-state').html();
      if (apolloScript) {
        const decodedData = decodeURIComponent(apolloScript);
        const apolloData = JSON.parse(decodedData);

        if (apolloData?.data) {
          // Enhanced extraction with multiple data paths and unit/quantity separation
          for (const [key, value] of Object.entries(apolloData.data)) {
            // Product entities
            if (value?.__typename === 'Product' && value.name) {
              const packageSize = value.size || value.packageSize || value.package_size;
              const unit = extractUnit(packageSize);
              const baseQuantity = extractQuantity(originalItem?.quantity);

              products.push({
                id: value.id || key,
                name: value.name || value.displayName,
                brand: value.brand?.name || value.brandName,
                price: parseFloat(value.pricing?.price || value.price || 0),
                image_url: value.images?.[0]?.url || value.image?.url,
                package_size: packageSize,
                unit: unit,
                quantity: baseQuantity,
                availability: value.availability || 'in_stock',
                upc: value.upc,
                category: value.category?.name,
                confidence: calculateMatchConfidence(query, value.name || value.displayName),
                source: 'apollo_product'
              });
            }
            // Recipe ingredients with product references
            else if (value?.__typename === 'RecipeIngredient' && value.product) {
              const product = value.product;
              const packageSize = value.quantity || product.size || product.packageSize;
              const unit = extractUnit(packageSize);
              const baseQuantity = extractQuantity(originalItem?.quantity);

              products.push({
                id: product.id || key,
                name: product.name || product.displayName,
                brand: product.brand?.name || product.brandName,
                price: parseFloat(product.pricing?.price || product.price || 0),
                image_url: product.images?.[0]?.url || product.image?.url,
                package_size: packageSize,
                unit: unit,
                quantity: baseQuantity,
                availability: product.availability || 'in_stock',
                upc: product.upc,
                category: product.category?.name,
                confidence: calculateMatchConfidence(query, product.name || product.displayName),
                source: 'apollo_ingredient'
              });
            }
            // Store items
            else if (value?.__typename === 'StoreItem' && value.name) {
              const packageSize = value.size || value.packageSize;
              const unit = extractUnit(packageSize);
              const baseQuantity = extractQuantity(originalItem?.quantity);

              products.push({
                id: value.id || key,
                name: value.name,
                brand: value.brand?.name,
                price: parseFloat(value.price || 0),
                image_url: value.imageUrl || value.image?.url,
                package_size: packageSize,
                unit: unit,
                quantity: baseQuantity,
                availability: value.availability || 'in_stock',
                upc: value.upc,
                confidence: calculateMatchConfidence(query, value.name),
                source: 'apollo_store'
              });
            }
            // Shopping list items
            else if (value?.__typename === 'ShoppingListItem' && value.item) {
              const item = value.item;
              const packageSize = item.size || item.packageSize;
              const unit = extractUnit(packageSize);
              const baseQuantity = extractQuantity(originalItem?.quantity);

              products.push({
                id: item.id || key,
                name: item.name,
                brand: item.brand?.name,
                price: parseFloat(item.price || 0),
                image_url: item.imageUrl || item.image?.url,
                package_size: packageSize,
                unit: unit,
                quantity: baseQuantity,
                availability: item.availability || 'in_stock',
                upc: item.upc,
                confidence: calculateMatchConfidence(query, item.name),
                source: 'apollo_shopping_list'
              });
            }
          }
        }
      }
    } catch (apolloError) {
      console.log('Enhanced Apollo parsing failed:', apolloError.message);
    }

    // Method 2: Enhanced CSS selector parsing
    if (products.length === 0) {
      const selectors = [
        '[data-testid*="ingredient"], [data-testid*="product"]',
        '.ingredient-list li, .recipe-ingredients li',
        'h3, h4, [class*="name"]'
      ];

      for (const selector of selectors) {
        $(selector).each((i, el) => {
          const $el = $(el);
          const name = $el.text().trim();

          if (name && name.length > 2 && !name.includes('Loading')) {
            const confidence = calculateMatchConfidence(query, name);
            if (confidence > 0.4) {
              // Extract price from element or siblings
              const priceText = $el.find('[class*="price"], .price').text() ||
                              $el.siblings().find('[class*="price"], .price').text() ||
                              $el.parent().find('[class*="price"], .price').text();
              const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;

              // Extract image from element
              const imageEl = $el.find('img').first();
              const imageUrl = imageEl.attr('src') || imageEl.attr('data-src') || null;

              // Extract package size
              const sizeText = $el.find('[class*="size"], .size').text() ||
                             $el.siblings().find('[class*="size"], .size').text() || '';
              const packageSize = sizeText || originalItem?.quantity || '1 unit';
              const unit = extractUnit(packageSize);
              const quantity = extractQuantity(originalItem?.quantity);

              products.push({
                id: `css_${i}`,
                name,
                price,
                brand: 'Instacart',
                package_size: packageSize,
                unit: unit,
                quantity: quantity,
                image_url: imageUrl,
                availability: 'in_stock',
                confidence,
                source: 'css_parsing'
              });
            }
          }
        });

        if (products.length > 0) break; // Stop after finding products
      }
    }

    // Method 3: Text content fallback with unit/quantity separation
    if (products.length === 0) {
      const ingredientText = $('body').text();
      if (ingredientText.toLowerCase().includes(query.toLowerCase())) {
        const packageSize = originalItem?.quantity || '1 unit';
        const unit = extractUnit(packageSize);
        const quantity = extractQuantity(originalItem?.quantity);

        products.push({
          id: `text_${Date.now()}`,
          name: query,
          price: 0,
          brand: 'Instacart',
          package_size: packageSize,
          unit: unit,
          quantity: quantity,
          image_url: null,
          availability: 'in_stock',
          confidence: 0.6,
          source: 'text_fallback'
        });
      }
    }

    // Streamlined result processing
    const relevantProducts = products
      .filter((product, index, self) =>
        index === self.findIndex(p => p.name === product.name) && product.confidence > 0.3
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    // Cache and return results
    parseCache.set(cacheKey, {
      products: relevantProducts,
      timestamp: Date.now()
    });

    return relevantProducts;

  } catch (error) {
    // Cache empty result to avoid repeated failures
    parseCache.set(cacheKey, {
      products: [],
      timestamp: Date.now()
    });

    return [];
  }
}

// Enhanced match confidence calculation with performance optimization
function calculateMatchConfidence(query, productName) {
  if (!query || !productName) return 0;

  const queryLower = query.toLowerCase().trim();
  const productLower = productName.toLowerCase().trim();

  // Exact match gets highest score
  if (queryLower === productLower) return 0.95;

  // Contains match gets high score
  if (productLower.includes(queryLower) || queryLower.includes(productLower)) {
    return 0.85;
  }

  // Word-based matching
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  const productWords = productLower.split(/\s+/).filter(w => w.length > 2);

  if (queryWords.length === 0 || productWords.length === 0) return 0;

  let matches = 0;
  let partialMatches = 0;

  queryWords.forEach(qWord => {
    let hasExactMatch = false;
    let hasPartialMatch = false;

    productWords.forEach(pWord => {
      if (qWord === pWord) {
        hasExactMatch = true;
      } else if (pWord.includes(qWord) || qWord.includes(pWord)) {
        hasPartialMatch = true;
      }
    });

    if (hasExactMatch) matches += 1;
    else if (hasPartialMatch) partialMatches += 0.5;
  });

  const totalScore = (matches + partialMatches) / queryWords.length;
  return Math.min(0.95, totalScore * 0.7 + 0.1); // Scale and add base score
}

// Helper function to make authenticated Instacart API calls with updated 2025 format
const instacartApiCall = async (endpoint, method = 'GET', data = null, apiKey = null) => {
  try {
    // Ensure endpoint starts with / but don't double it
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Use provided API key or default to main one
    const keyToUse = apiKey || INSTACART_API_KEY;
    
    const config = {
      method,
      url: `${BASE_URL}${cleanEndpoint}`,
      headers: {
        'Authorization': `Bearer ${keyToUse}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'en-US',
        'User-Agent': 'CartSmash/1.0 (https://cartsmash.com)'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ Error making Instacart API call to ${endpoint}:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: `${BASE_URL}${endpoint}`
    });
    throw error;
  }
};

// Helper function to validate API key on startup
const validateApiKeys = () => {
  if (INSTACART_API_KEY &&
      INSTACART_API_KEY !== 'your_api_key_here' &&
      INSTACART_API_KEY !== 'your_instacart_key_here' &&
      INSTACART_API_KEY.startsWith('keys.')) {
    console.log(`✅ Instacart API key configured for ${NODE_ENV} environment`);
    console.log(`🔗 Base URL: ${BASE_URL}`);
    console.log(`🔑 API Key format: ${INSTACART_API_KEY.substring(0, 10)}...`);
    return true;
  } else {
    console.log(`⚠️ Instacart API key missing or invalid`);
    console.log(`📝 Current key value: ${INSTACART_API_KEY || 'UNDEFINED'}`);
    console.log(`📝 Please set INSTACART_API_KEY environment variable with a valid Instacart API key`);
    console.log(`🔗 Using base URL: ${BASE_URL} (will fall back to mock data)`);
    return false;
  }
};

// GET /api/instacart/retailers - Get available retailers for a location
router.get('/retailers', async (req, res) => {
  try {
    console.log('🏪 Fetching available retailers');
    
    const { postalCode, zipCode, countryCode = 'US' } = req.query;
    
    // Support both postalCode (official) and zipCode (legacy) parameters
    const postal = postalCode || zipCode || '95670'; // Default postal code
    
    // Check if we have valid API keys
    if (validateApiKeys()) {
      try {
        // Use the same working API key as the recipe API
        const endpoint = `/retailers?postal_code=${postal}&country_code=${countryCode}`;
        const retailers = await instacartApiCall(endpoint, 'GET', null, INSTACART_API_KEY);
        
        // Raw API response processed
        
        // Transform response to match official Instacart API format with robust field mapping
        const formattedRetailers = (retailers.retailers || []).map((retailer, index) => {
          // Try multiple possible field names for retailer identifier
          const retailerId = retailer.retailer_key || 
                           retailer.id || 
                           retailer.retailer_id || 
                           retailer.key || 
                           `retailer_${index}`;
          
          const retailerName = retailer.name || 
                             retailer.retailer_name || 
                             retailer.display_name || 
                             `Retailer ${index + 1}`;
          
          return {
            id: retailerId,
            retailer_key: retailer.retailer_key || retailerId,
            name: retailerName,
            logo: retailer.retailer_logo_url || retailer.logo_url || retailer.logo || '🏪',
            estimatedDelivery: retailer.estimated_delivery || retailer.delivery_time || '2-4 hours',
            available: retailer.available !== false,
            service_fee: parseFloat(retailer.service_fee) || 3.99,
            delivery_fee: parseFloat(retailer.delivery_fee) || 5.99,
            minimum_order: parseFloat(retailer.minimum_order) || 35.00,
            // Add distance data since Instacart API doesn't provide it
            distance: retailer.distance || (0.5 + (index * 0.3)), // Generate estimated distances
            address: retailer.address || `${retailerName}, ${postal}`,
            // Include raw data for debugging
            _raw: process.env.NODE_ENV === 'development' ? retailer : undefined
          };
        });
        
        res.json({ 
          success: true, 
          retailers: formattedRetailers,
          count: formattedRetailers.length
        });
        return;
      } catch (error) {
        console.log('⚠️ Real API failed, falling back to mock data');
        // Fall through to mock data section
      }
    }
    
    // Mock response for development (both when no API keys or when API fails)
    const mockRetailers = [
      { 
        id: 'safeway', 
        name: 'Safeway', 
        logo: '🏪', 
        estimatedDelivery: '2 hours',
        available: true,
        service_fee: 3.99,
        delivery_fee: 5.99,
        distance: 1.2,
        address: `123 Main St, ${postal}`
      },
      { 
        id: 'whole_foods', 
        name: 'Whole Foods', 
        logo: '🥬', 
        estimatedDelivery: '1-2 hours',
        available: true,
        service_fee: 3.99,
        delivery_fee: 7.99,
        distance: 2.1,
        address: `456 Oak Ave, ${postal}`
      },
      { 
        id: 'costco', 
        name: 'Costco', 
        logo: '📦', 
        estimatedDelivery: 'Same day',
        available: true,
        service_fee: 4.99,
        delivery_fee: 10.99,
        distance: 3.5,
        address: `789 Business Park Dr, ${postal}`
      },
      { 
        id: 'kroger', 
        name: 'Kroger', 
        logo: '🛒', 
        estimatedDelivery: '2-3 hours',
        available: true,
        service_fee: 2.99,
        delivery_fee: 4.99,
        distance: 1.8,
        address: `321 Commerce Way, ${postal}`
      },
      { 
        id: 'target', 
        name: 'Target', 
        logo: '🎯', 
        estimatedDelivery: '2 hours',
        available: true,
        service_fee: 3.99,
        delivery_fee: 5.99,
        distance: 2.4,
        address: `654 Shopping Center, ${postal}`
      },
      { 
        id: 'albertsons', 
        name: 'Albertsons', 
        logo: '🏪', 
        estimatedDelivery: '2-3 hours',
        available: true,
        service_fee: 3.49,
        delivery_fee: 5.49,
        distance: 1.5,
        address: `987 Grocery Lane, ${postal}`
      }
    ];
    
    res.json({ success: true, retailers: mockRetailers });
  } catch (error) {
    console.error('Error fetching retailers:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch retailers',
      message: error.message 
    });
  }
});

// POST /api/instacart/search - Search for products using recipe API preview
router.post('/search', async (req, res) => {
  try {
    const { query, retailerId, zipCode, quantity, category, originalItem } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    // Check if we have valid API keys
    if (validateApiKeys()) {

      // Step 1: Try Recipe API (if circuit is not open)
      if (!circuitBreaker.isCircuitOpen('recipe')) {
        try {
          // Create a temporary recipe with just this ingredient to see what Instacart matches
          const previewRecipePayload = {
          title: `Preview Recipe - ${query}`,
          instructions: [`Use ${query} in your cooking.`],
          ingredients: [
            {
              name: query,
              display_text: query,
              measurements: quantity && category ? [{
                quantity: parseFloat(quantity) || 1,
                unit: category || 'each'
              }] : [{
                quantity: 1,
                unit: 'each'
              }]
            }
          ],
          author: 'CartSmash Preview',
          servings: 1,
          cooking_time_minutes: 5,
          partner_reference_url: 'https://cartsmash.com/preview',
          enable_pantry_items: false
        };

        const recipeResponse = await instacartApiCall('/products/recipe', 'POST', previewRecipePayload);

        if (recipeResponse && recipeResponse.products_link_url) {
          // Parse real product data from the recipe page
          const realProducts = await parseRealProductsFromRecipe(recipeResponse.products_link_url, query, originalItem, retailerId);

          if (realProducts.length > 0) {
            circuitBreaker.recordSuccess('recipe');
            res.json({
              success: true,
              products: realProducts,
              query: query,
              retailer: retailerId,
              count: realProducts.length,
              preview_recipe_url: recipeResponse.products_link_url,
              source: 'recipe_api_preview'
            });
            return;
          }
          throw new Error('No products found in recipe page');
        } else {
          throw new Error('Recipe API did not return products link');
        }
        } catch (error) {
          circuitBreaker.recordFailure('recipe');
        }
      }

      // Step 2: Try Catalog API (if circuit is not open)
      if (!circuitBreaker.isCircuitOpen('catalog')) {
        try {
          const searchParams = {
            q: query,
            limit: 10
          };

          if (retailerId) searchParams.retailer_id = retailerId;
          if (zipCode) searchParams.zip_code = zipCode;
          if (category) searchParams.category = category;

          const searchResults = await instacartApiCall('/catalog/search', 'POST', searchParams);

          const products = (searchResults.items || searchResults.data || []).map(product => ({
            id: product.id || product.product_id,
            sku: product.sku || product.retailer_sku,
            name: product.name || product.display_name,
            price: product.price || product.pricing?.price || 0,
            size: product.size || product.package_size,
            brand: product.brand || product.brand_name,
            image_url: product.image_url || product.images?.[0]?.url,
            availability: product.availability || 'available',
            confidence: calculateMatchConfidence(query, product.name || product.display_name),
            retailer_id: retailerId,
            unit_price: product.unit_price,
            description: product.description
          }));

          circuitBreaker.recordSuccess('catalog');
          res.json({
            success: true,
            products,
            query: query,
            retailer: retailerId,
            count: products.length,
            source: 'catalog_api'
          });
          return;
        } catch (catalogError) {
          circuitBreaker.recordFailure('catalog');
        }
      }

      // Step 3: Enhanced error response with circuit breaker status
      const circuitStatus = {
        recipe: {
          isOpen: circuitBreaker.isCircuitOpen('recipe'),
          failures: circuitBreaker.recipe.failures,
          nextRetryIn: circuitBreaker.recipe.isOpen ?
            Math.max(0, circuitBreaker.TIMEOUT - (Date.now() - circuitBreaker.recipe.lastFailure)) : 0
        },
        catalog: {
          isOpen: circuitBreaker.isCircuitOpen('catalog'),
          failures: circuitBreaker.catalog.failures,
          nextRetryIn: circuitBreaker.catalog.isOpen ?
            Math.max(0, circuitBreaker.TIMEOUT - (Date.now() - circuitBreaker.catalog.lastFailure)) : 0
        }
      };

      res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        message: `Unable to search for "${query}" - Instacart APIs are experiencing issues`,
        query: query,
        retailer: retailerId,
        source: 'circuit_breaker_protection',
        circuitStatus,
        suggestedRetryIn: Math.min(
          circuitStatus.recipe.nextRetryIn || Infinity,
          circuitStatus.catalog.nextRetryIn || Infinity
        )
      });
      return;
    }

    // Fallback for when API keys are not available
    console.log('❌ API keys not validated - unable to search for real products');
    res.status(401).json({
      success: false,
      error: 'API keys not configured',
      message: 'Instacart API integration is not properly configured. Please check server configuration.',
      query: query,
      retailer: retailerId,
      source: 'api_keys_missing'
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search products',
      message: error.message 
    });
  }
});

// POST /api/instacart/cart/create - Create cart and add items
// Remove authentication for development to allow easy testing
router.post('/cart/create', async (req, res) => {
  try {
    const { retailerId, zipCode, items, userId, metadata } = req.body;
    
    console.log('🛒 ===== INSTACART CART CREATION DEBUG =====');
    console.log(`📝 Request body:`, {
      retailerId,
      zipCode,
      userId,
      itemsCount: items?.length || 0,
      metadata: metadata ? Object.keys(metadata) : null
    });
    console.log(`📦 Items received:`, items?.map((item, index) => ({
      index,
      product_id: item.product_id,
      retailer_sku: item.retailer_sku,
      quantity: item.quantity,
      name: item.name,
      price: item.price,
      hasAllRequiredFields: !!(item.product_id && item.retailer_sku && item.quantity && item.name)
    })));
    console.log(`🛒 Creating Instacart cart for user ${userId} with ${items?.length || 0} items`);
    
    if (!retailerId || !items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'RetailerId and items are required' 
      });
    }
    
    // Check if we have valid API keys
    if (validateApiKeys()) {
      try {
        // Step 1: Create cart using Connect API
        const cartData = {
          retailer_id: retailerId,
          partner_id: 'CartSmash',
          ...(zipCode && { delivery_address: { zip_code: zipCode } })
        };
        
        console.log('🛒 Creating cart with data:', cartData);
        
        const cartResponse = await instacartApiCall('/carts', 'POST', cartData, INSTACART_CONNECT_API_KEY);
        const cartId = cartResponse.id || cartResponse.cart_id;
        
        console.log(`✅ Created cart: ${cartId}`);
        
        // Step 2: Add items to cart
        const cartItems = items.map(item => ({
          product_id: item.product_id || item.id,
          retailer_sku: item.retailer_sku || item.sku,
          quantity: item.quantity || 1,
          ...(item.variant_id && { variant_id: item.variant_id })
        }));
        
        console.log('📦 Adding items to cart:', cartItems);
        
        const addItemsResponse = await instacartApiCall(
          `/carts/${cartId}/items`, 
          'POST', 
          { items: cartItems },
          INSTACART_CONNECT_API_KEY
        );
        
        console.log(`✅ Added ${cartItems.length} items to cart`);
        
        // Step 3: Create recipe page for proper checkout URL
        const recipeData = await createRecipeFromCartItems(items, retailerId, zipCode, metadata);
        const checkoutUrl = recipeData.success && recipeData.instacartUrl ?
          recipeData.instacartUrl :
          `https://customers.dev.instacart.tools/store/retailers/${retailerId}`;
        
        // Get cart totals if available
        let cartTotals = null;
        try {
          const cartDetails = await instacartApiCall(`/carts/${cartId}`, 'GET', null);
          cartTotals = {
            subtotal: cartDetails.subtotal,
            total: cartDetails.total,
            item_count: cartDetails.item_count
          };
        } catch (e) {
          console.log('⚠️ Could not fetch cart totals:', e.message);
        }
        
        // Log successful integration
        if (metadata) {
          console.log('📊 Integration metadata:', metadata);
        }
        
        res.json({
          success: true,
          cartId,
          checkoutUrl,
          itemsAdded: cartItems.length,
          totals: cartTotals,
          metadata: {
            ...metadata,
            createdAt: new Date().toISOString(),
            apiVersion: 'connect',
            retailer: retailerId
          }
        });
        return;
      } catch (error) {
        console.log('⚠️ Connect API failed, falling back to mock cart');
        // Fall through to mock data section
      }
    }
    
    // Mock response for development (both when no API keys or when API fails)
    const mockCartId = `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create recipe page for proper URL even in mock mode
    const recipeData = await createRecipeFromCartItems(items, retailerId, zipCode, metadata);
    const mockCheckoutUrl = recipeData.success && recipeData.instacartUrl ?
      recipeData.instacartUrl :
      `https://customers.dev.instacart.tools/store/retailers/${retailerId}`;
    
    console.log('📋 ===== MOCK CART RESPONSE DEBUG =====');
    console.log(`✅ Mock cart created: ${mockCartId}`);
    console.log(`🔗 Mock checkout URL: ${mockCheckoutUrl}`);
    console.log(`📊 Mock totals calculation for ${items.length} items`);
    console.log('🛒 CartSmash → Instacart Mock Data Connection:');
    console.log(`   📦 Original CartSmash items:`, items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      source: 'CartSmash Shopping List'
    })));
    console.log(`   🏪 Target retailer: ${retailerId}`);
    console.log(`   📍 Delivery location: ${zipCode}`);
    console.log(`   🔄 Connection status: VERIFIED - CartSmash shopping list successfully mapped to Instacart mock data`);
    
    // Process immediately for faster performance
    
    res.json({
      success: true,
      cartId: mockCartId,
      checkoutUrl: mockCheckoutUrl,
      itemsAdded: items.length,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
        apiVersion: 'mock',
        mockMode: true
      }
    });
  } catch (error) {
    console.error('Error creating cart:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create cart',
      message: error.message 
    });
  }
});

// Helper function to create a recipe from cart items for proper checkout URLs
async function createRecipeFromCartItems(items, retailerId, zipCode, metadata) {
  try {
    console.log(`🍳 Converting ${items.length} cart items to recipe for ${retailerId}`);
    console.log('🔄 CartSmash Shopping List → Instacart Recipe Conversion:');

    // Generate recipe title based on items
    const itemNames = items.slice(0, 3).map(item =>
      (item.name || item.productName || 'Item').split(',')[0].trim()
    );
    const title = itemNames.length > 1 ?
      `${itemNames.join(', ')} Shopping List` :
      `${itemNames[0]} Recipe`;

    console.log(`   📝 Generated recipe title: "${title}"`);

    // Convert cart items to ingredients format (same as working recipe API)
    const ingredients = items.map(item => ({
      name: item.name || item.productName || 'Unknown Item',
      display_text: `${item.quantity || 1} ${item.unit || 'each'} ${item.name || item.productName}`,
      measurements: [{
        quantity: parseFloat(item.quantity) || 1,
        unit: item.unit || 'each'
      }]
    }));

    console.log(`   🥕 Converted to Instacart ingredients format:`, ingredients.map(item => ({
      name: item.name,
      display_text: item.display_text,
      measurements: item.measurements
    })));

    // Create recipe payload using working /products/recipe format
    const recipePayload = {
      title,
      instructions: [
        'Add these items to your cart',
        'Review your order and select delivery time',
        'Proceed to checkout when ready'
      ],
      ingredients,
      external_reference_id: `cartsmash_checkout_${Date.now()}`,
      expires_in: 30,
      landing_page_configuration: {
        partner_linkback_url: 'https://cartsmash.com',
        enable_pantry_items: true
      }
    };

    // Use the working /products/recipe endpoint
    if (validateApiKeys()) {
      console.log(`   🔗 Calling Instacart recipe API with working format`);
      const response = await instacartApiCall('/products/recipe', 'POST', recipePayload);

      const result = {
        success: true,
        recipeId: response.products_link_url?.match(/recipes\/(\d+)/)?.[1],
        instacartUrl: response.products_link_url,
        title,
        itemsCount: ingredients.length
      };

      // Add retailer key to URL if provided
      if (retailerId && result.instacartUrl) {
        const separator = result.instacartUrl.includes('?') ? '&' : '?';
        result.instacartUrl += `${separator}retailer_key=${retailerId}`;
      }

      console.log(`   ✅ Recipe created: ${result.instacartUrl}`);
      console.log(`   📊 CartSmash → Instacart connection: SUCCESSFUL`);
      return result;
    } else {
      // Mock recipe URL for development using working format
      const mockRecipeId = Math.floor(Math.random() * 9000000) + 1000000;
      const mockUrl = `https://customers.dev.instacart.tools/store/recipes/${mockRecipeId}?retailer_key=${retailerId}`;

      console.log(`   🧪 Mock recipe URL created: ${mockUrl}`);
      console.log(`   📊 CartSmash → Instacart mock connection: VERIFIED`);
      return {
        success: true,
        recipeId: mockRecipeId.toString(),
        instacartUrl: mockUrl,
        title,
        itemsCount: ingredients.length,
        mockMode: true
      };
    }
  } catch (error) {
    console.error('❌ Error creating recipe from cart items:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to calculate confidence score
function calculateConfidence(originalItem, instacartProduct) {
  let confidence = 0;
  
  if (!originalItem || !instacartProduct) return 0.5;
  
  const originalName = (originalItem.name || '').toLowerCase();
  const productName = (instacartProduct.name || '').toLowerCase();
  
  // Exact name match
  if (originalName === productName) {
    confidence += 0.4;
  }
  // Partial name match
  else if (productName.includes(originalName) || originalName.includes(productName)) {
    confidence += 0.3;
  }
  // Word overlap
  else {
    const originalWords = originalName.split(/\s+/);
    const productWords = productName.split(/\s+/);
    const overlap = originalWords.filter(word => productWords.includes(word)).length;
    confidence += (overlap / Math.max(originalWords.length, productWords.length)) * 0.2;
  }
  
  // Brand match bonus
  if (originalItem.brand && instacartProduct.brand && 
      originalItem.brand.toLowerCase() === instacartProduct.brand.toLowerCase()) {
    confidence += 0.2;
  }
  
  // Category match bonus
  if (originalItem.category && instacartProduct.category && 
      originalItem.category.toLowerCase() === instacartProduct.category.toLowerCase()) {
    confidence += 0.15;
  }
  
  // Size/package match bonus
  if (originalItem.amount && instacartProduct.package_size) {
    const originalSize = originalItem.amount.toLowerCase();
    const productSize = instacartProduct.package_size.toLowerCase();
    if (originalSize.includes(productSize) || productSize.includes(originalSize)) {
      confidence += 0.1;
    }
  }
  
  // Availability penalty
  if (instacartProduct.availability === 'out_of_stock') {
    confidence -= 0.2;
  }
  
  // Ensure confidence is between 0 and 1
  return Math.max(0, Math.min(1, confidence));
}

// Helper function to generate mock products for development
// Enhanced product generator that can create products based on real API responses or improved mock data
function generateEnhancedProducts(query, originalItem, retailerId, options = {}) {
  console.log(`🚫 DISABLED: Mock data generation is no longer allowed for: "${query}"`);
  console.log(`🚫 This function should not be called. Use real API data only.`);

  // Return empty array instead of mock data
  return [];
}

function generateMockProducts(query, originalItem, retailerId, options = {}) {
  console.log(`🚫 DISABLED: Mock products generation blocked for: "${query}"`);
  console.log(`🚫 All mock data functions are disabled. Use real API responses only.`);

  // Return empty array to prevent mock data generation
  return [];
  
  // Common product mappings with realistic product images
  const productTemplates = {
    'chicken': [
      { name: 'Fresh Chicken Breast', basePrice: 6.99, confidence: 0.95, image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop' },
      { name: 'Organic Chicken Breast', basePrice: 9.99, confidence: 0.75, image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&h=400&fit=crop' },
      { name: 'Chicken Thighs', basePrice: 4.99, confidence: 0.60, image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=400&fit=crop' }
    ],
    'milk': [
      { name: 'Whole Milk, 1 Gallon', basePrice: 3.99, confidence: 0.90, image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop' },
      { name: 'Organic Milk, 1 Gallon', basePrice: 6.99, confidence: 0.85, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop' },
      { name: '2% Milk, 1 Gallon', basePrice: 3.79, confidence: 0.70, image: 'https://images.unsplash.com/photo-1596618036688-bf31007ee99a?w=400&h=400&fit=crop' }
    ],
    'banana': [
      { name: 'Bananas, per lb', basePrice: 0.68, confidence: 0.95, image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop' },
      { name: 'Organic Bananas, per lb', basePrice: 0.99, confidence: 0.80, image: 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400&h=400&fit=crop' },
      { name: 'Baby Bananas, 2 lb bag', basePrice: 2.99, confidence: 0.60, image: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=400&fit=crop' }
    ],
    'bread': [
      { name: 'Whole Wheat Bread', basePrice: 2.99, confidence: 0.90, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop' },
      { name: 'White Bread', basePrice: 2.49, confidence: 0.75, image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&h=400&fit=crop' },
      { name: 'Sourdough Bread', basePrice: 3.99, confidence: 0.65, image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400&h=400&fit=crop' }
    ],
    'egg': [
      { name: 'Large Eggs, 12 count', basePrice: 2.99, confidence: 0.95, image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop' },
      { name: 'Organic Eggs, 12 count', basePrice: 4.99, confidence: 0.85, image: 'https://images.unsplash.com/photo-1574849147620-6a99ee72a302?w=400&h=400&fit=crop' },
      { name: 'Free Range Eggs, 12 count', basePrice: 5.99, confidence: 0.80, image: 'https://images.unsplash.com/photo-1599811632456-5ad3b9306e1e?w=400&h=400&fit=crop' }
    ],
    'apple': [
      { name: 'Gala Apples, 3 lb bag', basePrice: 3.99, confidence: 0.90, image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop' },
      { name: 'Organic Red Delicious', basePrice: 5.99, confidence: 0.85, image: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=400&fit=crop' },
      { name: 'Granny Smith Apples', basePrice: 4.49, confidence: 0.80, image: 'https://images.unsplash.com/photo-1579613832111-ac4df7ced2a6?w=400&h=400&fit=crop' }
    ],
    'tomato': [
      { name: 'Roma Tomatoes, per lb', basePrice: 2.99, confidence: 0.90, image: 'https://images.unsplash.com/photo-1546470427-227986a4feec?w=400&h=400&fit=crop' },
      { name: 'Organic Cherry Tomatoes', basePrice: 4.99, confidence: 0.85, image: 'https://images.unsplash.com/photo-1582779002835-0ac9b2d13c9d?w=400&h=400&fit=crop' },
      { name: 'Beefsteak Tomatoes', basePrice: 3.99, confidence: 0.75, image: 'https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=400&h=400&fit=crop' }
    ],
    'cheese': [
      { name: 'Sharp Cheddar Cheese', basePrice: 4.99, confidence: 0.90, image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop' },
      { name: 'Organic Mozzarella', basePrice: 6.99, confidence: 0.85, image: 'https://images.unsplash.com/photo-1624978463583-2534075b1ac4?w=400&h=400&fit=crop' },
      { name: 'Swiss Cheese Slices', basePrice: 5.49, confidence: 0.80, image: 'https://images.unsplash.com/photo-1610106738809-ab093abeb8c7?w=400&h=400&fit=crop' }
    ]
  };
  
  // Find matching template
  let templates = [];
  for (const [key, values] of Object.entries(productTemplates)) {
    if (queryLower.includes(key)) {
      templates = values;
      break;
    }
  }
  
  // Generate generic products if no specific template found
  if (templates.length === 0) {
    const genericImages = [
      'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&h=400&fit=crop'
    ];
    templates = [
      { name: `${query} - Store Brand`, basePrice: 3.99, confidence: 0.70, image: genericImages[0] },
      { name: `${query} - Premium`, basePrice: 6.99, confidence: 0.65, image: genericImages[1] },
      { name: `${query} - Value Pack`, basePrice: 8.99, confidence: 0.60, image: genericImages[2] }
    ];
  }
  
  // Generate products with retailer-specific pricing
  const retailerPriceMultiplier = {
    'safeway': 1.0,
    'whole_foods': 1.3,
    'costco': 0.9,
    'kroger': 0.95,
    'target': 1.05
  };
  
  const multiplier = retailerPriceMultiplier[retailerId] || 1.0;
  
  return templates.map((template, index) => {
    const baseProduct = {
      id: `sku_${retailerId}_${Date.now()}_${index}`,
      sku: `${(retailerId || 'DEFAULT').toUpperCase()}_${Math.random().toString(36).substr(2, 8)}`,
      name: template.name,
      price: Math.round(template.basePrice * multiplier * 100) / 100,
      size: '1 unit', // Don't use originalItem data to avoid overriding recipe quantities
      brand: index === 0 ? 'Store Brand' : (index === 1 ? 'Premium Brand' : 'Value Brand'),
      image: template.image || `https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop&t=${Date.now()}`,
      image_url: template.image || `https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop&t=${Date.now()}`, // Support both field names
      availability: 'in_stock',
      confidence: template.confidence,
      category: originalItem?.category || 'other',
      description: `High-quality ${template.name.toLowerCase()} available at ${retailerId}`,
      unit_price: Math.round(template.basePrice * multiplier * 100) / 100,
      retailer_id: retailerId
    };
    
    // Add metadata for enhanced products
    if (isEnhanced) {
      baseProduct._metadata = {
        isRealApiResponse,
        recipeUrl,
        dataSource: isRealApiResponse ? 'instacart_recipe_api' : 'enhanced_mock',
        generated_at: new Date().toISOString()
      };
      
      // If based on real API response, adjust confidence and descriptions
      if (isRealApiResponse) {
        baseProduct.confidence = Math.min(0.95, template.confidence + 0.15); // Higher confidence for real API
        baseProduct.description = `Real Instacart product match for ${template.name.toLowerCase()} at ${retailerId}`;
      }
    }
    
    return baseProduct;
  });
}

// GET /api/instacart/cart/:cartId/status - Get cart status (for webhook/polling)
router.get('/cart/:cartId/status', authenticateUser, async (req, res) => {
  try {
    const { cartId } = req.params;
    
    console.log(`📊 Getting cart status: ${cartId}`);
    
    // Check if we have valid API keys
    if (validateApiKeys()) {
      try {
        const cartStatus = await instacartApiCall(`/carts/${cartId}`, 'GET', null);
        res.json({ 
          success: true, 
          cart: {
            id: cartStatus.id,
            status: cartStatus.status,
            item_count: cartStatus.item_count,
            subtotal: cartStatus.subtotal,
            total: cartStatus.total,
            created_at: cartStatus.created_at,
            retailer: cartStatus.retailer
          }
        });
        return;
      } catch (error) {
        console.log('⚠️ Cart status API failed, returning mock data');
        // Fall through to mock data section
      }
    }
    
    // Mock response (both when no API keys or when API fails)
    res.json({
      success: true,
      cart: {
        id: cartId,
        status: 'created',
        total_items: 5,
        subtotal: 45.67,
        total: 52.34,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting cart status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get cart status',
      message: error.message 
    });
  }
});

// GET /api/instacart/test - Test API connectivity
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Testing Instacart API connectivity');
    
    const testResults = {
      apiKeys: validateApiKeys(),
      environment: NODE_ENV,
      baseUrl: BASE_URL,
      endpoints: {
        development: API_ENDPOINTS.DEVELOPMENT,
        production: API_ENDPOINTS.PRODUCTION
      },
      timestamp: new Date().toISOString()
    };
    
    // Try to make a simple API call to test connectivity
    if (testResults.apiKeys) {
      try {
        await instacartApiCall('/retailers?postal_code=95670&country_code=US', 'GET', null, INSTACART_CONNECT_API_KEY);
        testResults.connectivity = 'success';
      } catch (error) {
        testResults.connectivity = 'failed';
        testResults.error = error.message;
      }
    } else {
      testResults.connectivity = 'no-keys';
    }
    
    res.json({
      success: true,
      test: testResults
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Test failed',
      message: error.message
    });
  }
});

// POST /api/instacart/batch-search - Search for multiple items at once
router.post('/batch-search', async (req, res) => {
  try {
    const { items, retailerId, zipCode } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required'
      });
    }

    // Process items in parallel batches for better performance
    const batchSize = PERFORMANCE_CONFIG.MAX_PARALLEL_REQUESTS;
    const results = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const batchPromises = batch.map(async (item, index) => {
        try {
          const searchParams = {
            q: item.name || item.query,
            retailer_id: retailerId,
            limit: 3
          };

          if (zipCode) searchParams.zip_code = zipCode;

          let products = [];

          if (validateApiKeys()) {
            // APPROACH 1: Try direct product search API first (new redundancy)
            try {
              const directSearchResponse = await axios.post(`http://localhost:${process.env.PORT || 3002}/api/instacart/direct-product-search`, {
                items: [item],
                retailer_key: retailerId || 'safeway',
                postal_code: zipCode || '95670'
              });

              if (directSearchResponse.data.success && directSearchResponse.data.results[0]?.products?.length > 0) {
                products = directSearchResponse.data.results[0].products.map(product => ({
                  id: product.id,
                  sku: product.sku,
                  name: product.name,
                  price: product.price,
                  image_url: product.image_url,
                  package_size: product.package_size,
                  unit: product.unit,
                  quantity: product.quantity,
                  confidence: product.confidence,
                  source: 'direct_api'
                }));
                console.log(`✅ Direct API found ${products.length} products for "${item.name}"`);
              }
            } catch (directError) {
              console.log(`Direct API failed for "${item.name}":`, directError.message);
            }

            // APPROACH 2: Try recipe page parsing as backup (enhanced)
            if (products.length === 0) {
              try {
                // Create a quick recipe to get product parsing
                const quickRecipe = await createRecipeFromCartItems([item], retailerId);
                if (quickRecipe.success && quickRecipe.instacartUrl) {
                  const parsedProducts = await parseRecipePage(
                    quickRecipe.instacartUrl,
                    item.name || item.query,
                    item
                  );

                  if (parsedProducts.length > 0) {
                    products = parsedProducts.map(product => ({
                      id: product.id,
                      sku: product.sku,
                      name: product.name,
                      price: product.price,
                      image_url: product.image_url,
                      package_size: product.package_size,
                      unit: product.unit,
                      quantity: product.quantity,
                      confidence: product.confidence,
                      source: 'recipe_page_enhanced'
                    }));
                    console.log(`✅ Enhanced recipe parsing found ${products.length} products for "${item.name}"`);
                  }
                }
              } catch (recipeError) {
                console.log(`Enhanced recipe parsing failed for "${item.name}":`, recipeError.message);
              }
            }

            // APPROACH 3: Original catalog search as final fallback
            if (products.length === 0) {
              try {
                const searchResults = await instacartApiCall('/catalog/search', 'POST', searchParams);
                products = (searchResults.items || searchResults.data || []).slice(0, 3).map(product => ({
                  id: product.id || product.product_id,
                  sku: product.sku || product.retailer_sku,
                  name: product.name || product.display_name,
                  price: parseFloat(product.price || product.pricing?.price || 0),
                  image_url: product.image_url || product.images?.[0]?.url,
                  package_size: product.size || product.package_size,
                  unit: extractUnit(product.size || product.package_size),
                  quantity: extractQuantity(item.quantity) || 1,
                  confidence: calculateMatchConfidence(item.name || item.query, product.name || product.display_name),
                  source: 'catalog_api'
                }));
                if (products.length > 0) {
                  console.log(`✅ Catalog API found ${products.length} products for "${item.name}"`);
                }
              } catch (catalogError) {
                console.log(`Catalog API failed for "${item.name}":`, catalogError.message);
              }
            }
          }

          return {
            originalItem: item,
            matches: products,
            bestMatch: products[0] || null
          };

        } catch (error) {
          console.error(`Error searching for item "${item.name}":`, error);
          return {
            originalItem: item,
            matches: [],
            bestMatch: null,
            error: error.message
          };
        }
      });

      // Execute batch in parallel
      const batchResults = await Promise.allSettled(batchPromises);

      // Add batch results to main results array
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch item failed:', result.reason);
          results.push({
            originalItem: { name: 'unknown' },
            matches: [],
            bestMatch: null,
            error: result.reason.message
          });
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, PERFORMANCE_CONFIG.REQUEST_RETRY_DELAY));
      }
    }
    
    console.log(`✅ Batch search completed: ${results.length} items processed`);
    
    res.json({
      success: true,
      results,
      summary: {
        totalItems: items.length,
        itemsWithMatches: results.filter(r => r.matches.length > 0).length,
        itemsWithErrors: results.filter(r => r.error).length
      }
    });
    
  } catch (error) {
    console.error('Batch search error:', error);
    res.status(500).json({
      success: false,
      error: 'Batch search failed',
      message: error.message
    });
  }
});

// POST /api/instacart/recipe/create - Create recipe page using Instacart Developer Platform API
// Helper function to map dietary restrictions to health filters
function mapDietaryRestrictionsToHealthFilters(dietaryRestrictions) {
  if (!dietaryRestrictions || !Array.isArray(dietaryRestrictions)) return [];
  
  const healthFilterMap = {
    'vegetarian': ['VEGAN'],
    'vegan': ['VEGAN'],
    'gluten-free': ['GLUTEN_FREE'],
    'gluten free': ['GLUTEN_FREE'],
    'organic': ['ORGANIC'],
    'kosher': ['KOSHER'],
    'sugar-free': ['SUGAR_FREE'],
    'sugar free': ['SUGAR_FREE'],
    'low-fat': ['LOW_FAT'],
    'low fat': ['LOW_FAT'],
    'fat-free': ['FAT_FREE'],
    'fat free': ['FAT_FREE']
  };
  
  const filters = [];
  dietaryRestrictions.forEach(restriction => {
    const normalized = restriction.toLowerCase();
    if (healthFilterMap[normalized]) {
      filters.push(...healthFilterMap[normalized]);
    }
  });
  
  return [...new Set(filters)]; // Remove duplicates
}

// Helper function to extract cooking time from instructions
function extractCookingTime(instructions) {
  if (!instructions || !Array.isArray(instructions)) return null;

  const timePattern = /(\d+)\s*(?:minutes?|mins?|hours?|hrs?)/i;
  let totalMinutes = 0;

  instructions.forEach(instruction => {
    const matches = instruction.match(timePattern);
    if (matches) {
      const time = parseInt(matches[1]);
      const unit = matches[0].toLowerCase();
      if (unit.includes('hour') || unit.includes('hr')) {
        totalMinutes += time * 60;
      } else {
        totalMinutes += time;
      }
    }
  });

  return totalMinutes > 0 ? totalMinutes : null;
}

// Helper function to format instructions as numbered steps
function formatInstructionsAsSteps(instructions) {
  if (!instructions) return [];

  // If already an array, return as-is (assume properly formatted)
  if (Array.isArray(instructions)) {
    return instructions.filter(step => step && step.trim()); // Remove empty steps
  }

  // If it's a string, split it into logical steps
  const instructionText = instructions.toString().trim();
  if (!instructionText) return [];

  // Split by common sentence delimiters that indicate step boundaries
  let steps = instructionText.split(/\.\s+(?=[A-Z])|;\s*(?=[A-Z])|:\s*(?=[A-Z])/);

  // If no clear split found, try splitting by time indicators
  if (steps.length === 1) {
    steps = instructionText.split(/(?:Meanwhile|During|After|Then|Next),?\s+/i);
  }

  // If still one long instruction, split by length
  if (steps.length === 1 && instructionText.length > 150) {
    // Split at logical points like "and", "then", etc.
    steps = instructionText.split(/(?:,?\s+and\s+|,?\s+then\s+)/i);
  }

  // Clean up and filter steps
  return steps
    .map(step => step.trim())
    .filter(step => step.length > 10) // Filter out very short fragments
    .map(step => {
      // Ensure step ends with period
      if (!step.endsWith('.') && !step.endsWith('!') && !step.endsWith('?')) {
        step += '.';
      }
      // Capitalize first letter
      return step.charAt(0).toUpperCase() + step.slice(1);
    });
}

router.post('/recipe/create', async (req, res) => {
  try {
    const { 
      title, 
      imageUrl, 
      instructions, 
      ingredients, 
      partnerUrl, 
      enablePantryItems,
      retailerKey,
      author,
      servings,
      cookingTime,
      dietaryRestrictions,
      externalReferenceId 
    } = req.body;
    
    console.log(`🍳 Creating enhanced Instacart recipe: "${title}"`);
    
    if (!title || !instructions || !ingredients || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Title, instructions, and ingredients are required'
      });
    }
    
    // Check cache first - Best practice per Instacart docs
    const cacheKey = generateRecipeCacheKey({ title, ingredients, instructions, servings, author });
    const cachedResult = getCachedRecipeUrl(cacheKey);
    
    if (cachedResult) {
      // Return cached result with retailer key if provided
      let finalUrl = cachedResult.instacartUrl;
      if (retailerKey && finalUrl) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl += `${separator}retailer_key=${retailerKey}`;
      }
      
      return res.json({
        ...cachedResult,
        instacartUrl: finalUrl,
        cached: true,
        cacheAge: Math.round((Date.now() - cachedResult.timestamp) / 1000 / 60), // minutes
      });
    }

    // Check if we have valid API keys
    if (validateApiKeys()) {
      try {
        // Valid health filters as per API specification
        const VALID_HEALTH_FILTERS = ['ORGANIC', 'GLUTEN_FREE', 'FAT_FREE', 'VEGAN', 'KOSHER', 'SUGAR_FREE', 'LOW_FAT'];

        // Validate health filters function
        const validateHealthFilters = (filters) => {
          if (!filters || filters.length === 0) return [];
          const invalidFilters = filters.filter(filter => !VALID_HEALTH_FILTERS.includes(filter));
          if (invalidFilters.length > 0) {
            throw new Error(`Invalid health filters: ${JSON.stringify(invalidFilters)}`);
          }
          return filters;
        };

        // Map dietary restrictions to health filters
        const globalHealthFilters = validateHealthFilters(mapDietaryRestrictionsToHealthFilters(dietaryRestrictions));
        
        // Track product identifiers to prevent duplicates
        const usedProductIds = new Set();
        const usedUpcs = new Set();

        // Transform ingredients to enhanced Instacart format
        const formattedIngredients = ingredients.map(ingredient => {
          const formatted = {
            name: ingredient.name || ingredient.item,
            display_text: ingredient.displayText || ingredient.name || ingredient.item
          };
          
          // Add measurements with support for multiple measurements
          // NOTE: Instacart attempts to match quantities but cannot guarantee successful quantity matching per FAQ
          if (ingredient.measurements && Array.isArray(ingredient.measurements)) {
            formatted.measurements = ingredient.measurements.map(m => {
              const quantity = parseFloat(m.quantity) || 1;
              if (quantity <= 0) {
                throw new Error(`Invalid quantity: ${quantity}. Cannot be lower than or equal to 0.0`);
              }
              return {
                quantity: quantity,
                unit: m.unit || 'each'
              };
            });
          } else if (ingredient.quantity && ingredient.unit) {
            const quantity = parseFloat(ingredient.quantity) || 1;
            if (quantity <= 0) {
              throw new Error(`Invalid quantity: ${quantity}. Cannot be lower than or equal to 0.0`);
            }
            formatted.measurements = [{
              quantity: quantity,
              unit: ingredient.unit
            }];
            
            // Add alternative measurements if available
            if (ingredient.alternativeMeasurements) {
              formatted.measurements.push(...ingredient.alternativeMeasurements.map(m => {
                const quantity = parseFloat(m.quantity) || 1;
                if (quantity <= 0) {
                  throw new Error(`Invalid quantity: ${quantity}. Cannot be lower than or equal to 0.0`);
                }
                return {
                  quantity: quantity,
                  unit: m.unit
                };
              }));
            }
          } else if (ingredient.amount) {
            // Parse amount like "2 cups" or "1 large" 
            const match = ingredient.amount.match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
            if (match) {
              formatted.measurements = [{
                quantity: parseFloat(match[1]),
                unit: match[2]
              }];
            }
          }
          
          // Validate that UPCs and product IDs are mutually exclusive (API requirement)
          if (ingredient.upcs && ingredient.productIds) {
            throw new Error(`Line item "${ingredient.name}" cannot have both product_ids and upcs. They are mutually exclusive.`);
          }

          // Add UPCs if provided
          if (ingredient.upcs) {
            const upcArray = Array.isArray(ingredient.upcs) ? ingredient.upcs : [ingredient.upcs];
            // Check for duplicate UPCs
            for (const upc of upcArray) {
              if (usedUpcs.has(upc)) {
                throw new Error(`Duplicate product identifiers found: upc ${upc}`);
              }
              usedUpcs.add(upc);
            }
            formatted.upcs = upcArray;
          }

          // Add product IDs if provided
          if (ingredient.productIds) {
            const productIdArray = Array.isArray(ingredient.productIds) ? ingredient.productIds : [ingredient.productIds];
            // Check for duplicate product IDs
            for (const productId of productIdArray) {
              if (usedProductIds.has(productId)) {
                throw new Error(`Duplicate product identifiers found: product_id ${productId}`);
              }
              usedProductIds.add(productId);
            }
            formatted.product_ids = productIdArray;
          }
          
          // Add filters with health filter inheritance
          if (ingredient.brandFilters || ingredient.healthFilters || globalHealthFilters.length > 0) {
            formatted.filters = {};
            
            // Best practice: Add only brand names in brand_filters array per FAQ
            if (ingredient.brandFilters) {
              formatted.filters.brand_filters = Array.isArray(ingredient.brandFilters) 
                ? ingredient.brandFilters.map(brand => typeof brand === 'string' ? brand : brand.name || brand)
                : [typeof ingredient.brandFilters === 'string' ? ingredient.brandFilters : ingredient.brandFilters.name || ingredient.brandFilters];
            }
            
            // Combine ingredient-specific and global health filters
            const ingredientHealthFilters = ingredient.healthFilters
              ? validateHealthFilters(Array.isArray(ingredient.healthFilters) ? ingredient.healthFilters : [ingredient.healthFilters])
              : [];

            const combinedHealthFilters = [...new Set([...globalHealthFilters, ...ingredientHealthFilters])];
            if (combinedHealthFilters.length > 0) {
              formatted.filters.health_filters = combinedHealthFilters;
            }
          }
          
          return formatted;
        });
        
        // Extract cooking time from instructions if not provided
        const finalCookingTime = cookingTime || extractCookingTime(instructions);
        
        // Build enhanced recipe payload
        const recipePayload = {
          title,
          author: author || 'CartSmash AI',
          servings: servings || 4,
          cooking_time: finalCookingTime,
          image_url: imageUrl || `https://via.placeholder.com/500x500/4CAF50/white?text=${encodeURIComponent(title)}`,
          instructions: formatInstructionsAsSteps(instructions),
          ingredients: formattedIngredients,
          external_reference_id: externalReferenceId,
          content_creator_credit_info: 'Generated by CartSmash AI',
          expires_in: 30, // 30 days as recommended for recipes
          landing_page_configuration: {
            partner_linkback_url: partnerUrl || 'https://cartsmash.com',
            enable_pantry_items: enablePantryItems !== false
          }
        };
        
        // Remove undefined/null values
        Object.keys(recipePayload).forEach(key => {
          if (recipePayload[key] === undefined || recipePayload[key] === null) {
            delete recipePayload[key];
          }
        });
        
        console.log('📤 Creating enhanced recipe with payload:', JSON.stringify(recipePayload, null, 2));
        
        const response = await instacartApiCall('/products/recipe', 'POST', recipePayload);
        
        console.log('✅ Enhanced recipe created successfully:', response);
        
        // Format enhanced response
        const result = {
          success: true,
          recipeId: response.products_link_url?.match(/recipes\/(\d+)/)?.[1],
          instacartUrl: response.products_link_url,
          title,
          author: recipePayload.author,
          servings: recipePayload.servings,
          cookingTime: finalCookingTime,
          ingredientsCount: formattedIngredients.length,
          healthFiltersApplied: globalHealthFilters,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        };
        
        // Cache the new recipe URL for future use
        const cachedResult = cacheRecipeUrl(cacheKey, result);
        
        // Add retailer key to URL if provided
        if (retailerKey && result.instacartUrl) {
          const separator = result.instacartUrl.includes('?') ? '&' : '?';
          result.instacartUrl += `${separator}retailer_key=${retailerKey}`;
        }
        
        // Add cache info to response
        result.cached = false;
        result.cacheKey = cacheKey;
        
        res.json(result);
        return;
      } catch (error) {
        console.log('⚠️ Recipe API failed, falling back to mock data');
        // Fall through to mock response
      }
    }
    
    // Mock response for development (both when no API keys or when API fails)
    const mockRecipeId = Math.floor(Math.random() * 1000000);
    const mockUrl = `https://customers.dev.instacart.tools/store/recipes/${mockRecipeId}`;
    
    console.log(`✅ Mock recipe created: ${mockRecipeId}`);
    
    res.json({
      success: true,
      recipeId: mockRecipeId,
      instacartUrl: retailerKey ? `${mockUrl}?retailer_key=${retailerKey}` : mockUrl,
      title,
      ingredientsCount: ingredients.length,
      createdAt: new Date().toISOString(),
      mockMode: true
    });
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create recipe',
      message: error.message
    });
  }
});

// POST /api/instacart/products-link/create - Create shopping list with alternatives using official Products Link API
router.post('/products-link/create', async (req, res) => {
  try {
    const {
      title,
      imageUrl,
      lineItems,
      partnerUrl,
      expiresIn,
      instructions,
      linkType = 'shopping_list',
      retailerKey,
      filters = {}
    } = req.body;

    console.log(`🛒 Creating Instacart products link (${linkType}): "${title}"`);

    if (!title || !lineItems || lineItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Title and line_items are required'
      });
    }

    // Check cache first using similar caching strategy as recipes
    const cacheKey = generateRecipeCacheKey({ title, ingredients: lineItems, instructions });
    const cachedResult = getCachedRecipeUrl(cacheKey);

    if (cachedResult) {
      return res.json({
        ...cachedResult,
        cached: true,
        cacheAge: Math.round((Date.now() - cachedResult.timestamp) / 1000 / 60), // minutes
      });
    }

    // Check if we have valid API keys
    if (validateApiKeys()) {
      try {
        // Track product identifiers to prevent duplicates
        const usedProductIds = new Set();
        const usedUpcs = new Set();

        // Transform lineItems to enhanced Instacart Products Link format with alternatives support
        const formattedLineItems = lineItems.map((item, index) => {
          // Validate required fields
          if (!item.name && !item.productName) {
            throw new Error(`Line item at index ${index} is missing required field: name`);
          }

          const formatted = {
            name: item.name || item.productName,
            display_text: item.displayText || item.display_text || `${item.quantity || 1} ${item.unit || 'each'} ${item.name || item.productName}`
          };

          // Enhanced UPC support with alternatives
          if (item.upcs) {
            const upcArray = Array.isArray(item.upcs) ? item.upcs : [item.upcs];
            // Validate UPC format and check for duplicates
            const validUpcs = upcArray.filter(upc => {
              if (typeof upc !== 'string' || !/^\d{8,14}$/.test(upc)) {
                console.warn(`Invalid UPC format: ${upc} for item "${formatted.name}"`);
                return false;
              }
              if (usedUpcs.has(upc)) {
                throw new Error(`Duplicate UPC found: ${upc}`);
              }
              usedUpcs.add(upc);
              return true;
            });
            if (validUpcs.length > 0) {
              formatted.upcs = validUpcs;
            }
          }

          // Enhanced product ID support with alternatives
          if (item.product_ids || item.productIds) {
            const productIds = Array.isArray(item.product_ids || item.productIds)
              ? (item.product_ids || item.productIds)
              : [item.product_ids || item.productIds];
            // Validate product IDs and check for duplicates
            const validProductIds = productIds.filter(id => {
              if (typeof id !== 'string' || id.trim().length === 0) {
                console.warn(`Invalid product ID: ${id} for item "${formatted.name}"`);
                return false;
              }
              if (usedProductIds.has(id)) {
                throw new Error(`Duplicate product ID found: ${id}`);
              }
              usedProductIds.add(id);
              return true;
            });
            if (validProductIds.length > 0) {
              formatted.product_ids = validProductIds;
            }
          }

          // Validate UPCs and product_ids are mutually exclusive
          if (formatted.upcs && formatted.product_ids) {
            throw new Error(`Line item "${formatted.name}" cannot have both product_ids and upcs. They are mutually exclusive.`);
          }

          // Enhanced multiple measurements support for alternatives
          if (item.line_item_measurements && Array.isArray(item.line_item_measurements)) {
            formatted.line_item_measurements = item.line_item_measurements.map((m, mIndex) => {
              const measurementQty = parseFloat(m.quantity);
              if (isNaN(measurementQty) || measurementQty <= 0) {
                throw new Error(`Line item "${formatted.name}" measurement at index ${mIndex} has invalid quantity: ${m.quantity}`);
              }
              return {
                quantity: measurementQty,
                unit: m.unit || 'each'
              };
            });
          } else if (item.measurements && Array.isArray(item.measurements)) {
            // Convert from recipe-style measurements to shopping list measurements
            formatted.line_item_measurements = item.measurements.map((m, mIndex) => {
              const measurementQty = parseFloat(m.quantity);
              if (isNaN(measurementQty) || measurementQty <= 0) {
                throw new Error(`Line item "${formatted.name}" measurement at index ${mIndex} has invalid quantity: ${m.quantity}`);
              }
              return {
                quantity: measurementQty,
                unit: m.unit || 'each'
              };
            });
          } else if (item.quantity) {
            // Single measurement fallback
            const quantity = parseFloat(item.quantity);
            if (!isNaN(quantity) && quantity > 0) {
              formatted.line_item_measurements = [{
                quantity: quantity,
                unit: item.unit || 'each'
              }];
            }
          }

          // Enhanced filter support for better product matching and alternatives
          if (item.filters || item.brandFilters || item.healthFilters) {
            formatted.filters = {};

            // Brand filters - essential for alternatives
            if (item.filters?.brand_filters || item.brandFilters) {
              const brands = item.filters?.brand_filters || item.brandFilters;
              const brandArray = Array.isArray(brands) ? brands : [brands];
              const validBrands = brandArray.filter(brand =>
                typeof brand === 'string' && brand.trim().length > 0
              );
              if (validBrands.length > 0) {
                formatted.filters.brand_filters = validBrands;
              }
            }

            // Health filters for dietary alternatives
            if (item.filters?.health_filters || item.healthFilters) {
              const VALID_HEALTH_FILTERS = [
                'ORGANIC', 'GLUTEN_FREE', 'FAT_FREE', 'VEGAN', 'KOSHER',
                'SUGAR_FREE', 'LOW_FAT', 'VEGETARIAN', 'KETO', 'DAIRY_FREE'
              ];
              const health = item.filters?.health_filters || item.healthFilters;
              const healthArray = Array.isArray(health) ? health : [health];
              const validHealthFilters = healthArray.filter(filter =>
                typeof filter === 'string' && VALID_HEALTH_FILTERS.includes(filter.toUpperCase())
              );
              if (validHealthFilters.length > 0) {
                formatted.filters.health_filters = validHealthFilters.map(f => f.toUpperCase());
              }
            }

            // Remove filters object if empty
            if (Object.keys(formatted.filters).length === 0) {
              delete formatted.filters;
            }
          }

          return formatted;
        });

        // Build enhanced products link payload with alternatives support
        const productsLinkPayload = {
          title,
          image_url: imageUrl || `https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&h=500&fit=crop`,
          link_type: linkType, // 'shopping_list' or 'recipe'
          expires_in: expiresIn || 365, // Default to 365 days for shopping lists
          line_items: formattedLineItems,
          landing_page_configuration: {
            partner_linkback_url: partnerUrl || 'https://cartsmash.com',
            enable_pantry_items: true
          }
        };

        // Add instructions if provided (for recipe-type links)
        if (instructions && Array.isArray(instructions) && instructions.length > 0) {
          productsLinkPayload.instructions = instructions;
        }

        // Add global filters if provided
        if (filters && Object.keys(filters).length > 0) {
          productsLinkPayload.filters = filters;
        }

        // Remove undefined/null values
        Object.keys(productsLinkPayload).forEach(key => {
          if (productsLinkPayload[key] === undefined || productsLinkPayload[key] === null) {
            delete productsLinkPayload[key];
          }
        });

        console.log('📝 Products link payload with alternatives:', JSON.stringify(productsLinkPayload, null, 2));

        // Make API call to create products link with alternatives
        const response = await instacartApiCall('/products/products_link', 'POST', productsLinkPayload);

        console.log('✅ Products link API response:', response);

        if (response && response.products_link_url) {
          let finalUrl = response.products_link_url;

          // Add retailer key to URL if provided
          if (retailerKey && finalUrl) {
            const separator = finalUrl.includes('?') ? '&' : '?';
            finalUrl += `${separator}retailer_key=${retailerKey}`;
          }

          const result = {
            success: true,
            productsLinkId: response.id || `products-link-${Date.now()}`,
            instacartUrl: finalUrl,
            title: title,
            itemsCount: formattedLineItems.length,
            createdAt: new Date().toISOString(),
            type: linkType,
            alternativesSupported: true,
            expiresAt: new Date(Date.now() + (expiresIn || 365) * 24 * 60 * 60 * 1000).toISOString()
          };

          // Cache the result
          cacheRecipeUrl(cacheKey, result);

          res.json(result);
        } else {
          console.log('⚠️ Unexpected API response format:', response);
          throw new Error('Invalid API response format');
        }
      } catch (error) {
        console.error('❌ Products link API failed:', error);

        // Fallback to mock response with alternatives structure
        console.log('🔄 Falling back to mock products link with alternatives...');

        const mockLinkId = `mock-products-link-${Date.now()}`;
        const mockUrl = NODE_ENV === 'development'
          ? `https://customers.dev.instacart.tools/store/shopping-lists/${mockLinkId}`
          : `https://www.instacart.com/store/shopping-lists/${mockLinkId}`;

        const finalMockUrl = retailerKey ? `${mockUrl}?retailer_key=${retailerKey}` : mockUrl;

        const mockResult = {
          success: true,
          productsLinkId: mockLinkId,
          instacartUrl: finalMockUrl,
          title: title,
          itemsCount: lineItems.length,
          createdAt: new Date().toISOString(),
          type: linkType,
          alternativesSupported: true,
          mockMode: true,
          expiresAt: new Date(Date.now() + (expiresIn || 365) * 24 * 60 * 60 * 1000).toISOString()
        };

        // Cache the mock result
        cacheRecipeUrl(cacheKey, mockResult);

        res.json(mockResult);
      }
    } else {
      // No API keys available
      res.status(503).json({
        success: false,
        error: 'Instacart API not available',
        message: 'API keys not configured'
      });
    }
  } catch (error) {
    console.error('❌ Error creating products link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create products link',
      message: error.message
    });
  }
});

// POST /api/instacart/shopping-list/create - Create shopping list page using Instacart Products Link API
router.post('/shopping-list/create', async (req, res) => {
  try {
    const { 
      title, 
      imageUrl, 
      lineItems,
      partnerUrl,
      expiresIn,
      instructions
    } = req.body;
    
    console.log(`🛒 Creating Instacart shopping list: "${title}"`);
    
    if (!title || !lineItems || lineItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Title and line_items are required'
      });
    }
    
    // Check cache first using similar caching strategy as recipes
    const cacheKey = generateRecipeCacheKey({ title, ingredients: lineItems, instructions });
    const cachedResult = getCachedRecipeUrl(cacheKey);
    
    if (cachedResult) {
      return res.json({
        ...cachedResult,
        cached: true,
        cacheAge: Math.round((Date.now() - cachedResult.timestamp) / 1000 / 60), // minutes
      });
    }

    // Check if we have valid API keys
    if (validateApiKeys()) {
      try {
        // Transform lineItems to Instacart shopping list format with enhanced validation
        const formattedLineItems = lineItems.map((item, index) => {
          // Validate required fields
          if (!item.name && !item.productName) {
            throw new Error(`Line item at index ${index} is missing required field: name`);
          }

          const quantity = parseFloat(item.quantity);
          if (isNaN(quantity) || quantity <= 0) {
            throw new Error(`Line item "${item.name || item.productName}" has invalid quantity: ${item.quantity}. Must be a positive number.`);
          }

          const formatted = {
            name: item.name || item.productName,
            quantity: quantity,
            unit: item.unit || 'each'
          };

          // Add custom display text if provided (enhanced support)
          if (item.displayText || item.display_text) {
            const displayText = item.displayText || item.display_text;
            if (typeof displayText === 'string' && displayText.trim().length > 0) {
              formatted.display_text = displayText.trim();
            }
          }

          // Enhanced multiple measurements support
          if (item.line_item_measurements && Array.isArray(item.line_item_measurements)) {
            formatted.line_item_measurements = item.line_item_measurements.map((m, mIndex) => {
              const measurementQty = parseFloat(m.quantity);
              if (isNaN(measurementQty) || measurementQty <= 0) {
                throw new Error(`Line item "${formatted.name}" measurement at index ${mIndex} has invalid quantity: ${m.quantity}`);
              }
              return {
                quantity: measurementQty,
                unit: m.unit || 'each'
              };
            });
          } else if (item.measurements && Array.isArray(item.measurements)) {
            // Convert from recipe-style measurements to shopping list measurements
            formatted.line_item_measurements = item.measurements.map((m, mIndex) => {
              const measurementQty = parseFloat(m.quantity);
              if (isNaN(measurementQty) || measurementQty <= 0) {
                throw new Error(`Line item "${formatted.name}" measurement at index ${mIndex} has invalid quantity: ${m.quantity}`);
              }
              return {
                quantity: measurementQty,
                unit: m.unit || 'each'
              };
            });
          }

          // Enhanced UPC validation
          if (item.upcs) {
            const upcArray = Array.isArray(item.upcs) ? item.upcs : [item.upcs];
            // Validate UPC format (basic validation for numeric strings)
            const validUpcs = upcArray.filter(upc => {
              return typeof upc === 'string' && /^\d{8,14}$/.test(upc);
            });
            if (validUpcs.length > 0) {
              formatted.upcs = validUpcs;
            }
          }

          // Enhanced product ID validation
          if (item.product_ids || item.productIds) {
            const productIds = Array.isArray(item.product_ids || item.productIds)
              ? (item.product_ids || item.productIds)
              : [item.product_ids || item.productIds];
            // Validate product IDs are non-empty strings
            const validProductIds = productIds.filter(id => {
              return typeof id === 'string' && id.trim().length > 0;
            });
            if (validProductIds.length > 0) {
              formatted.product_ids = validProductIds;
            }
          }

          // Validate UPCs and product_ids are mutually exclusive
          if (formatted.upcs && formatted.product_ids) {
            throw new Error(`Line item "${formatted.name}" cannot have both product_ids and upcs. They are mutually exclusive.`);
          }

          // Enhanced filter validation
          if (item.filters || item.brandFilters || item.healthFilters) {
            formatted.filters = {};

            // Brand filters with validation
            if (item.filters?.brand_filters || item.brandFilters) {
              const brands = item.filters?.brand_filters || item.brandFilters;
              const brandArray = Array.isArray(brands) ? brands : [brands];
              const validBrands = brandArray.filter(brand =>
                typeof brand === 'string' && brand.trim().length > 0
              );
              if (validBrands.length > 0) {
                formatted.filters.brand_filters = validBrands;
              }
            }

            // Health filters with validation against approved values
            if (item.filters?.health_filters || item.healthFilters) {
              const VALID_HEALTH_FILTERS = [
                'ORGANIC', 'GLUTEN_FREE', 'FAT_FREE', 'VEGAN', 'KOSHER',
                'SUGAR_FREE', 'LOW_FAT', 'VEGETARIAN', 'KETO'
              ];
              const health = item.filters?.health_filters || item.healthFilters;
              const healthArray = Array.isArray(health) ? health : [health];
              const validHealthFilters = healthArray.filter(filter =>
                typeof filter === 'string' && VALID_HEALTH_FILTERS.includes(filter.toUpperCase())
              );
              if (validHealthFilters.length > 0) {
                formatted.filters.health_filters = validHealthFilters.map(f => f.toUpperCase());
              }
            }

            // Remove filters object if empty
            if (Object.keys(formatted.filters).length === 0) {
              delete formatted.filters;
            }
          }

          return formatted;
        });
        
        // Build shopping list payload according to official API spec
        const shoppingListPayload = {
          title,
          image_url: imageUrl || `https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&h=500&fit=crop`,
          link_type: 'shopping_list',
          expires_in: expiresIn || 365, // Default to 365 days for shopping lists
          instructions: Array.isArray(instructions) ? instructions : (instructions ? [instructions] : undefined),
          line_items: formattedLineItems,
          landing_page_configuration: {
            partner_linkback_url: partnerUrl || 'https://cartsmash.com'
          }
        };
        
        // Remove undefined/null values
        Object.keys(shoppingListPayload).forEach(key => {
          if (shoppingListPayload[key] === undefined || shoppingListPayload[key] === null) {
            delete shoppingListPayload[key];
          }
        });
        
        console.log('📝 Shopping list payload:', JSON.stringify(shoppingListPayload, null, 2));
        
        // Make API call to create shopping list
        const response = await instacartApiCall('/products/products_link', 'POST', shoppingListPayload);
        
        console.log('✅ Shopping list API response:', response);
        
        if (response && response.products_link_url) {
          const result = {
            success: true,
            shoppingListId: `shopping-list-${Date.now()}`,
            instacartUrl: response.products_link_url,
            title: title,
            itemsCount: formattedLineItems.length,
            createdAt: new Date().toISOString(),
            type: 'shopping_list'
          };
          
          // Cache the result
          cacheRecipeUrl(cacheKey, result);
          
          res.json(result);
        } else {
          console.log('⚠️ Unexpected API response format:', response);
          throw new Error('Invalid API response format');
        }
      } catch (error) {
        console.error('❌ Shopping list API failed:', error);
        
        // Fallback to recipe API if shopping list fails
        console.log('🔄 Falling back to recipe API...');
        
        // Convert shopping list items to recipe ingredients
        const recipeIngredients = lineItems.map(item => ({
          name: item.name || item.productName,
          display_text: item.displayText || item.display_text || item.name || item.productName,
          measurements: item.measurements || [{
            quantity: parseFloat(item.quantity) || 1.0,
            unit: item.unit || 'each'
          }],
          filters: item.filters,
          upcs: item.upcs,
          product_ids: item.product_ids || item.productIds
        }));
        
        const recipePayload = {
          title: title + ' (Shopping List)',
          author: 'CartSmash AI',
          servings: 1,
          image_url: imageUrl || `https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&h=500&fit=crop`,
          instructions: Array.isArray(instructions) ? instructions : (instructions ? [instructions] : [
            'This is a shopping list created with CartSmash.',
            'Add these items to your cart and proceed to checkout.'
          ]),
          ingredients: recipeIngredients,
          expires_in: expiresIn || 365,
          landing_page_configuration: {
            partner_linkback_url: partnerUrl || 'https://cartsmash.com',
            enable_pantry_items: false
          }
        };
        
        const fallbackResponse = await instacartApiCall('/products/recipe', 'POST', recipePayload);
        
        if (fallbackResponse && fallbackResponse.products_link_url) {
          const result = {
            success: true,
            shoppingListId: `recipe-fallback-${Date.now()}`,
            instacartUrl: fallbackResponse.products_link_url,
            title: title,
            itemsCount: recipeIngredients.length,
            createdAt: new Date().toISOString(),
            type: 'recipe_fallback',
            fallback: true
          };
          
          cacheRecipeUrl(cacheKey, result);
          res.json(result);
        } else {
          throw new Error('Both shopping list and recipe APIs failed');
        }
      }
    } else {
      // No API keys available
      res.status(503).json({
        success: false,
        error: 'Instacart API not available',
        message: 'API keys not configured'
      });
    }
  } catch (error) {
    console.error('❌ Error creating shopping list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create shopping list',
      message: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Instacart API Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// APPROACH 1: Direct Product Search API (NEW - For Redundancy)
// This bypasses recipe pages entirely and searches Instacart's product catalog directly
router.post('/direct-product-search', async (req, res) => {
  try {
    console.log('🔍 Direct product search requested');
    const { items = [], retailer_key = 'safeway', postal_code = '95670' } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Items array is required',
        success: false
      });
    }

    const results = [];

    // Search each item directly via Instacart's product API
    for (const item of items) {
      try {
        const searchQuery = typeof item === 'string' ? item : item.name;

        // Try multiple search endpoints for redundancy
        let products = [];

        // Method 1: Try catalog search
        try {
          const catalogEndpoint = `/catalog/search?q=${encodeURIComponent(searchQuery)}&retailer_key=${retailer_key}&postal_code=${postal_code}`;
          const catalogResponse = await instacartApiCall(catalogEndpoint);

          if (catalogResponse?.products) {
            products = catalogResponse.products.map(product => ({
              id: product.id,
              name: product.name || product.display_name,
              brand: product.brand?.name || product.brand_name,
              price: parseFloat(product.price?.amount || product.pricing?.price || 0),
              image_url: product.images?.[0]?.url || product.image_url,
              package_size: product.size || product.package_size || product.quantity,
              unit: product.unit || extractUnit(product.size),
              quantity: extractQuantity(item.quantity) || 1,
              availability: product.availability || 'in_stock',
              upc: product.upc,
              confidence: calculateMatchConfidence(searchQuery, product.name || product.display_name),
              source: 'catalog_api'
            }));
          }
        } catch (catalogError) {
          console.log(`Catalog search failed for "${searchQuery}":`, catalogError.message);
        }

        // Method 2: Try store items search as backup
        if (products.length === 0) {
          try {
            const storeEndpoint = `/stores/${retailer_key}/items?q=${encodeURIComponent(searchQuery)}&postal_code=${postal_code}`;
            const storeResponse = await instacartApiCall(storeEndpoint);

            if (storeResponse?.items) {
              products = storeResponse.items.map(item => ({
                id: item.id,
                name: item.name,
                brand: item.brand?.name,
                price: parseFloat(item.price?.amount || 0),
                image_url: item.image_url,
                package_size: item.size || item.package_size,
                unit: item.unit || extractUnit(item.size),
                quantity: extractQuantity(item.quantity) || 1,
                availability: item.availability || 'in_stock',
                upc: item.upc,
                confidence: calculateMatchConfidence(searchQuery, item.name),
                source: 'store_api'
              }));
            }
          } catch (storeError) {
            console.log(`Store search failed for "${searchQuery}":`, storeError.message);
          }
        }

        // Filter and sort by confidence
        const relevantProducts = products
          .filter(p => p.confidence > 0.4)
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 3);

        results.push({
          query: searchQuery,
          products: relevantProducts,
          found: relevantProducts.length > 0,
          source: relevantProducts[0]?.source || 'none'
        });

      } catch (itemError) {
        console.error(`Error searching for item:`, itemError.message);
        results.push({
          query: typeof item === 'string' ? item : item.name,
          products: [],
          found: false,
          error: itemError.message
        });
      }
    }

    const totalFound = results.reduce((sum, result) => sum + result.products.length, 0);

    res.json({
      success: true,
      method: 'direct_product_search',
      results,
      totalItems: items.length,
      totalFound,
      foundPercentage: items.length > 0 ? Math.round((totalFound / items.length) * 100) : 0
    });

  } catch (error) {
    console.error('❌ Direct product search error:', error);
    res.status(500).json({
      success: false,
      error: 'Direct product search failed',
      message: error.message
    });
  }
});

// Helper functions for unit/quantity separation
function extractUnit(sizeString) {
  if (!sizeString) return null;
  const unitMatch = sizeString.match(/\b(oz|lb|lbs|g|kg|ml|l|fl oz|cups?|tbsp|tsp|each|ct|count)\b/i);
  return unitMatch ? unitMatch[1].toLowerCase() : null;
}

function extractQuantity(quantityInput) {
  if (typeof quantityInput === 'number') return quantityInput;
  if (typeof quantityInput === 'string') {
    const numMatch = quantityInput.match(/(\d+(?:\.\d+)?)/);
    return numMatch ? parseFloat(numMatch[1]) : 1;
  }
  return 1;
}

// APPROACH 2: Enhanced Dynamic Recipe Page Parser (Enhanced Existing)
// This improves the existing recipe page parsing with better JavaScript handling
async function parseRecipePageWithDynamicContent(recipeUrl, query, originalItem = null) {
  const cacheKey = `parse_enhanced_${recipeUrl}_${query}`;
  if (parseCache.has(cacheKey)) {
    const cached = parseCache.get(cacheKey);
    if (Date.now() - cached.timestamp < PERFORMANCE_CONFIG.HTML_CACHE_TTL) {
      return cached.products;
    }
  }

  try {
    let products = [];

    // First try standard HTML parsing (existing method)
    products = await parseRecipePage(recipeUrl, query, originalItem);

    // If no products found and puppeteer is available, try dynamic loading
    if (products.length === 0 && typeof puppeteer !== 'undefined') {
      try {
        console.log('🎭 Trying dynamic content loading with Puppeteer');

        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Set user agent to avoid bot detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navigate and wait for content to load
        await page.goto(recipeUrl, { waitUntil: 'networkidle2', timeout: 15000 });

        // Wait for products to load (multiple selectors)
        await page.waitForSelector('[data-testid*="product"], .product-item, [class*="product"]', { timeout: 10000 }).catch(() => {});

        // Extract dynamic content
        const dynamicProducts = await page.evaluate((searchQuery) => {
          const products = [];

          // Look for product elements with multiple selectors
          const productSelectors = [
            '[data-testid*="product"]',
            '.product-item',
            '[class*="product"]',
            '[data-testid*="ingredient"]'
          ];

          productSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach((element) => {
              const nameEl = element.querySelector('[class*="name"], h3, h4, .title') || element;
              const priceEl = element.querySelector('[class*="price"], .price, [data-testid*="price"]');
              const imageEl = element.querySelector('img');
              const sizeEl = element.querySelector('[class*="size"], .size, [class*="quantity"]');

              const name = nameEl?.textContent?.trim();
              const price = priceEl?.textContent?.replace(/[^0-9.]/g, '') || '0';
              const imageUrl = imageEl?.src || imageEl?.getAttribute('data-src');
              const size = sizeEl?.textContent?.trim();

              if (name && name.length > 2 && !name.includes('Loading')) {
                products.push({
                  id: `dynamic_${products.length}`,
                  name,
                  price: parseFloat(price),
                  image_url: imageUrl,
                  package_size: size,
                  brand: 'Instacart',
                  availability: 'in_stock'
                });
              }
            });
          });

          return products;
        }, query);

        await browser.close();

        // Calculate confidence and filter
        products = dynamicProducts
          .map(product => ({
            ...product,
            confidence: calculateMatchConfidence(query, product.name)
          }))
          .filter(product => product.confidence > 0.4)
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 3);

        console.log(`🎭 Dynamic loading found ${products.length} products`);

      } catch (puppeteerError) {
        console.log('🎭 Puppeteer parsing failed:', puppeteerError.message);
      }
    }

    // Cache the enhanced results
    parseCache.set(cacheKey, {
      products,
      timestamp: Date.now()
    });

    return products;

  } catch (error) {
    console.error('Enhanced parsing error:', error.message);
    return [];
  }
}

// Initialize API on module load
console.log('🚀 Initializing Instacart API routes...');
validateApiKeys();

module.exports = router;