// client/src/utils/imageService.js
// Centralized image service for reliable image loading across all environments

import debugService from '../services/debugService';

class ImageService {
  constructor() {
    // Image cache for performance improvement
    this.imageCache = new Map();
    this.cacheMaxSize = 100; // Maximum number of cached images
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes in milliseconds

    // SVG data URLs for reliable fallbacks
    this.fallbackImages = {
      recipe: this.generateSvg('R', '#FF6B35', 'Recipe'),
      shopping: this.generateSvg('S', '#00B894', 'Shop'),
      produce: this.generateSvg('P', '#4CAF50', 'Produce'),
      dairy: this.generateSvg('D', '#03A9F4', 'Dairy'),
      meat: this.generateSvg('M', '#F44336', 'Meat'),
      bakery: this.generateSvg('B', '#FF9800', 'Bakery'),
      beverages: this.generateSvg('V', '#9C27B0', 'Drinks'),
      frozen: this.generateSvg('F', '#00BCD4', 'Frozen'),
      snacks: this.generateSvg('N', '#FFC107', 'Snacks'),
      pantry: this.generateSvg('T', '#795548', 'Pantry'),
      default: this.generateSvg('I', '#9E9E9E', 'Item')
    };

    // Optimized external image URLs with fallbacks
    this.externalImages = {
      recipe: '/api/image/recipe-default.jpg',
      shopping: '/api/image/shopping-default.jpg',
      produce: '/api/image/produce-default.jpg',
      dairy: '/api/image/dairy-default.jpg',
      meat: '/api/image/meat-default.jpg',
      bakery: '/api/image/bakery-default.jpg',
      beverages: '/api/image/beverages-default.jpg',
      frozen: '/api/image/frozen-default.jpg',
      snacks: '/api/image/snacks-default.jpg',
      pantry: '/api/image/pantry-default.jpg',
      default: '/api/image/default-item.jpg'
    };
  }

  /**
   * Cache management methods
   */
  getCachedImage(url) {
    const cached = this.imageCache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      debugService.log('📷 Using cached image:', url);
      return cached.data;
    }
    if (cached) {
      // Remove expired cache entry
      this.imageCache.delete(url);
    }
    return null;
  }

  setCachedImage(url, data) {
    // Clean cache if it's getting too large
    if (this.imageCache.size >= this.cacheMaxSize) {
      const oldestKey = this.imageCache.keys().next().value;
      this.imageCache.delete(oldestKey);
    }

    this.imageCache.set(url, {
      data,
      timestamp: Date.now()
    });
    debugService.log('💾 Cached image:', url, `(${this.imageCache.size}/${this.cacheMaxSize})`);
  }

  clearExpiredCache() {
    const now = Date.now();
    for (const [url, cached] of this.imageCache.entries()) {
      if (now - cached.timestamp >= this.cacheExpiry) {
        this.imageCache.delete(url);
      }
    }
  }

  /**
   * Preload and cache image
   */
  async preloadImage(url) {
    if (!url || !this.isValidImageUrl(url)) return null;

    // Check cache first
    const cached = this.getCachedImage(url);
    if (cached) return cached;

    try {
      // Create a promise to load the image
      const imageData = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          // Convert to data URL for caching
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve(dataUrl);
          } catch (e) {
            // If canvas conversion fails, just use the original URL
            resolve(url);
          }
        };

        img.onerror = (e) => {
          // Prevent image load errors from appearing in console
          e.preventDefault && e.preventDefault();
          reject(new Error('Failed to load image'));
        };
        img.src = url;
      });

      // Cache the result
      this.setCachedImage(url, imageData);
      return imageData;
    } catch (error) {
      // Silently handle preload failures (common with external images)
      debugService.log('🔇 Preload failed (expected for external images):', url);
      return url; // Return original URL as fallback
    }
  }

  /**
   * Generate SVG data URL
   * @param {string} letter - Single letter character
   * @param {string} color - Background color
   * @param {string} text - Alt text
   * @returns {string} SVG data URL
   */
  generateSvg(letter, color, text) {
    const svg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="${color}"/>
        <text x="200" y="140" font-family="Arial, sans-serif" font-size="120" font-weight="bold" text-anchor="middle" fill="white">${letter}</text>
        <text x="200" y="220" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white">${text}</text>
      </svg>
    `.replace(/\s+/g, ' ').trim();

    // Use URL encoding instead of btoa for Unicode safety
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  /**
   * Get image URL with reliable fallback
   * @param {string} category - Image category
   * @param {Object} options - Options for image sizing and quality
   * @returns {string} Image URL
   */
  getImageUrl(category = 'default', options = {}) {
    // eslint-disable-next-line no-unused-vars
    const { width = 400, height = 300, quality = 80, useExternal = false } = options;

    // Always use SVG fallbacks for reliable display
    // External images can be enabled later when proper image CDN is set up
    return this.fallbackImages[category] || this.fallbackImages.default;
  }

  /**
   * Get recipe image with fallback
   * @param {string} recipeImageUrl - Original recipe image URL
   * @param {Object} options - Image options
   * @returns {string} Image URL with fallback
   */
  getRecipeImage(recipeImageUrl, options = {}) {
    if (recipeImageUrl && recipeImageUrl.startsWith('data:')) {
      return recipeImageUrl; // Already a data URL
    }

    if (recipeImageUrl && this.isValidImageUrl(recipeImageUrl)) {
      return recipeImageUrl;
    }

    return this.getImageUrl('recipe', options);
  }

  /**
   * Get product image based on category
   * @param {Object} item - Product item with category
   * @param {Object} options - Image options
   * @returns {string} Image URL
   */
  getProductImage(item, options = {}) {
    debugService.log('🖼️ Getting product image for:', {
      productName: item.productName || item.name,
      hasImageUrl: !!item.imageUrl,
      hasImage_url: !!item.image_url,
      hasImage: !!item.image,
      hasSpoonacularData: !!item.spoonacularData,
      hasInstacartData: !!item.instacartData,
      spoonacularImage: item.spoonacularData?.image_url,
      instacartImage: item.instacartData?.image_url
    });

    // First priority: Check all possible image fields (support both camelCase and snake_case)
    const possibleImageUrls = [
      item.imageUrl,
      item.image_url,  // Spoonacular/server format
      item.image,
      item.spoonacularData?.image_url,  // From Spoonacular enrichment
      item.instacartData?.image_url     // From Instacart data
    ].filter(Boolean);

    debugService.log('📷 Possible image URLs found:', possibleImageUrls);

    // Try each possible image URL
    for (const imageUrl of possibleImageUrls) {
      const optimizedUrl = this.optimizeImageUrl(imageUrl);
      if (optimizedUrl) {
        debugService.log('✅ Using optimized image URL:', optimizedUrl);

        // Check cache first for external images
        const cached = this.getCachedImage(imageUrl);
        if (cached) {
          return cached;
        }

        // Preload and cache in background (don't wait)
        if (options.enableCaching !== false) {
          this.preloadImage(imageUrl).catch(error => {
            // Silently handle image loading errors
            debugService.log('🔇 Image preload failed (silently handled):', imageUrl);
          });
        }

        return imageUrl;
      }
    }

    // No real image found - provide category-based fallback
    const category = this.getCategoryFromItem(item);
    const fallbackImage = this.getImageUrl(category);
    debugService.log('⚠️ No real image found, using fallback:', {
      category,
      fallbackImage: fallbackImage.substring(0, 100) + '...'
    });
    return fallbackImage;
  }

  /**
   * Get category from item data
   * @param {Object} item - Product item
   * @returns {string} Category name
   */
  getCategoryFromItem(item) {
    if (!item) return 'default';

    const category = (item.category || '').toLowerCase();
    const name = (item.productName || item.name || '').toLowerCase();

    // Category mapping
    if (category.includes('produce') || name.includes('fruit') || name.includes('vegetable')) return 'produce';
    if (category.includes('dairy') || name.includes('milk') || name.includes('cheese')) return 'dairy';
    if (category.includes('meat') || name.includes('beef') || name.includes('chicken')) return 'meat';
    if (category.includes('bakery') || name.includes('bread') || name.includes('baked')) return 'bakery';
    if (category.includes('beverage') || name.includes('drink') || name.includes('juice')) return 'beverages';
    if (category.includes('frozen') || name.includes('frozen')) return 'frozen';
    if (category.includes('snack') || name.includes('chip') || name.includes('cookie')) return 'snacks';
    if (category.includes('pantry') || name.includes('canned') || name.includes('pasta')) return 'pantry';

    return 'default';
  }

  /**
   * Check if URL is a valid image URL
   * @param {string} url - Image URL to validate
   * @returns {boolean} True if valid
   */
  isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;

    // Allow data URLs
    if (url.startsWith('data:image/')) return true;

    // Allow relative URLs
    if (url.startsWith('/')) return true;

    // Allow HTTPS URLs from trusted domains
    if (url.startsWith('https://')) {
      const trustedDomains = [
        'cdn.instacart.com',                // Instacart's official CDN (legacy)
        'd2lnr5mha7bycj.cloudfront.net',   // Instacart's CloudFront CDN (primary)
        'images.instacart.com',             // Instacart's image domain
        'img.instacart.com',                // Instacart's alternative image domain
        'img.spoonacular.com',              // Spoonacular's image CDN
        'cartsmash.com',                    // Our domain
        'cartsmash.netlify.app',            // Our deployment
        'cartsmash.vercel.app',             // Our deployment
        'via.placeholder.com',              // Reliable placeholder service
        'images.unsplash.com'               // Temporarily allow for mock data (development)
      ];

      // Note: Temporarily allowing Unsplash for mock data in development
      // Original note: Removed unreliable external services like Unsplash
      // to reduce 404 errors in production
      return trustedDomains.some(domain => url.includes(domain));
    }

    return false;
  }

  /**
   * Create image with error handling
   * @param {string} src - Image source
   * @param {string} fallbackCategory - Fallback category
   * @param {function} onLoad - Load callback
   * @param {function} onError - Error callback
   * @returns {Object} Image element configuration
   */
  createImageWithFallback(src, fallbackCategory = 'default', onLoad, onError) {
    const fallbackSrc = this.getImageUrl(fallbackCategory);

    return {
      src: src || fallbackSrc,
      onError: (e) => {
        // Prevent error from propagating to console
        e.preventDefault && e.preventDefault();

        if (e.target.src !== fallbackSrc) {
          debugService.log('🔄 Image failed, switching to fallback:', e.target.src);
          e.target.src = fallbackSrc;
        }
        if (onError) onError(e);
      },
      onLoad: onLoad
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    this.clearExpiredCache(); // Clean up first

    return {
      size: this.imageCache.size,
      maxSize: this.cacheMaxSize,
      usage: `${this.imageCache.size}/${this.cacheMaxSize}`,
      expiry: `${this.cacheExpiry / 1000 / 60} minutes`,
      urls: Array.from(this.imageCache.keys())
    };
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.imageCache.clear();
    debugService.log('🧹 Image cache cleared');
  }

  /**
   * Optimize image URLs to prevent 404s
   */
  optimizeImageUrl(url) {
    if (!url || !this.isValidImageUrl(url)) {
      return null;
    }

    // Allow Unsplash URLs temporarily for mock data (development)
    // Skip URLs that commonly cause 404s - but allow Unsplash for now
    if (url.includes('picsum.photos')) {
      return null;
    }

    return url;
  }

  /**
   * Bulk preload images for better performance
   */
  async bulkPreloadImages(urls, options = {}) {
    const { maxConcurrent = 3, timeout = 10000 } = options;
    const validUrls = urls.filter(url => url && this.isValidImageUrl(url));

    debugService.log(`📦 Bulk preloading ${validUrls.length} images...`);

    const chunks = [];
    for (let i = 0; i < validUrls.length; i += maxConcurrent) {
      chunks.push(validUrls.slice(i, i + maxConcurrent));
    }

    const results = [];
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(url =>
        Promise.race([
          this.preloadImage(url),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ]).catch(error => ({ url, error: error.message }))
      );

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    const successful = results.filter(r => !r.error).length;
    debugService.log(`✅ Preloaded ${successful}/${validUrls.length} images`);

    return results;
  }
}

// Create singleton instance
const imageService = new ImageService();

// Set up automatic cache cleanup every 5 minutes
setInterval(() => {
  imageService.clearExpiredCache();
}, 5 * 60 * 1000);

/**
 * Format product name to proper title case
 * @param {string} name - Product name to format
 * @returns {string} Properly formatted product name
 */
export const formatProductName = (name) => {
  if (!name || typeof name !== 'string') return '';

  // Words that should stay lowercase (articles, prepositions, etc.)
  const lowercaseWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];

  return name
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Always capitalize the first word, and any word not in the lowercase list
      if (index === 0 || !lowercaseWords.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
};

// Export cache management for debugging
if (typeof window !== 'undefined') {
  window.imageCache = {
    stats: () => imageService.getCacheStats(),
    clear: () => imageService.clearCache(),
    preload: (urls) => imageService.bulkPreloadImages(urls),
    service: imageService
  };
}

export default imageService;
export { ImageService };