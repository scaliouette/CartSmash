// client/src/utils/imageService.js
// Centralized image service for reliable image loading across all environments

class ImageService {
  constructor() {
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
    console.log('🖼️ getProductImage called for:', item.productName, {
      hasImage: !!item.image,
      hasImageUrl: !!item.imageUrl,
      hasInstacartData: !!item.instacartData,
      enriched: !!item.enriched
    });

    // First priority: Use real product images from Instacart API if available
    if (item.imageUrl && this.isValidImageUrl(item.imageUrl)) {
      console.log('✅ Using real Instacart image:', item.imageUrl);
      return item.imageUrl;
    }

    if (item.image && this.isValidImageUrl(item.image)) {
      console.log('✅ Using real product image:', item.image);
      return item.image;
    }

    // Check if instacartData has image URLs
    if (item.instacartData) {
      const instacartImageUrl = item.instacartData.image_url || item.instacartData.imageUrl || item.instacartData.image;
      if (instacartImageUrl && this.isValidImageUrl(instacartImageUrl)) {
        console.log('✅ Using Instacart data image:', instacartImageUrl);
        return instacartImageUrl;
      }
    }

    // Fallback to category-based SVG
    console.log('⚠️ No real image found, using SVG fallback');
    const category = this.getCategoryFromItem(item);
    return this.fallbackImages[category] || this.fallbackImages.default;
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
        'images.unsplash.com',
        'picsum.photos',
        'via.placeholder.com',
        'cdn.instacart.com',
        'cartsmash.com',
        'cartsmash.netlify.app',
        'cartsmash.vercel.app'
      ];

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
        if (e.target.src !== fallbackSrc) {
          e.target.src = fallbackSrc;
        }
        if (onError) onError(e);
      },
      onLoad: onLoad
    };
  }
}

// Create singleton instance
const imageService = new ImageService();

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

export default imageService;
export { ImageService };