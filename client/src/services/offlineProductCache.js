// client/src/services/offlineProductCache.js
// Client-side offline product caching using IndexedDB
// Provides fast local search and offline capabilities

import debugService from './debugService';

class OfflineProductCache {
  constructor() {
    this.dbName = 'CartSmashProductCache';
    this.dbVersion = 1;
    this.storeName = 'products';
    this.db = null;
    this.isSupported = this.checkIndexedDBSupport();
    this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.popularProducts = new Map(); // In-memory cache for frequently accessed items
  }

  // Check if IndexedDB is supported
  checkIndexedDBSupport() {
    try {
      return 'indexedDB' in window && window.indexedDB !== null;
    } catch (e) {
      return false;
    }
  }

  // Initialize the database
  async init() {
    if (!this.isSupported) {
      debugService.log('❌ IndexedDB not supported');
      return false;
    }

    if (this.db) {
      return true; // Already initialized
    }

    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        debugService.logError('Failed to open IndexedDB', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        debugService.log('✅ Offline cache database initialized');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });

          // Create indexes for efficient searching
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('brand', 'brand', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('spoonacularId', 'spoonacularId', { unique: false });
          store.createIndex('upc', 'upc', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });

          debugService.log('📦 Created product object store with indexes');
        }
      };
    });
  }

  // Generate a placeholder image for products without images
  generatePlaceholderImage(productName) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFB6C1'];
    const color = colors[Math.abs(productName.charCodeAt(0)) % colors.length];
    const emoji = this.getProductEmoji(productName);

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="${color}"/>
        <text x="100" y="90" font-family="Arial, sans-serif" font-size="60" text-anchor="middle" fill="white">${emoji}</text>
        <text x="100" y="140" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="white">${productName.slice(0, 15)}</text>
      </svg>
    `.replace(/\s+/g, ' ').trim())}`;
  }

  // Get appropriate emoji for product
  getProductEmoji(productName) {
    const lowerName = productName.toLowerCase();

    const emojiMap = {
      'milk': '🥛', 'cheese': '🧀', 'bread': '🍞', 'egg': '🥚',
      'apple': '🍎', 'banana': '🍌', 'orange': '🍊', 'lemon': '🍋',
      'tomato': '🍅', 'potato': '🥔', 'carrot': '🥕', 'broccoli': '🥦',
      'meat': '🥩', 'chicken': '🍗', 'fish': '🐟', 'shrimp': '🦐',
      'rice': '🍚', 'pasta': '🍝', 'pizza': '🍕', 'burger': '🍔',
      'coffee': '☕', 'tea': '🍵', 'water': '💧', 'juice': '🧃',
      'wine': '🍷', 'beer': '🍺', 'cookie': '🍪', 'cake': '🎂',
      'candy': '🍬', 'chocolate': '🍫', 'ice cream': '🍨', 'honey': '🍯'
    };

    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (lowerName.includes(key)) {
        return emoji;
      }
    }

    return '📦'; // Default package emoji
  }

  // Store a product in the cache
  async cacheProduct(product) {
    if (!this.db) await this.init();
    if (!this.db) return false;

    try {
      // Ensure product has an image
      if (!product.image_url && !product.imageUrl) {
        product.image_url = this.generatePlaceholderImage(product.name || product.productName || 'Product');
      }

      const productToCache = {
        ...product,
        id: product.id || `${product.spoonacularId || Date.now()}_${Math.random()}`,
        cached: true,
        cachedAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        // Ensure all required fields
        name: product.name || product.productName || product.title,
        imageUrl: product.image_url || product.imageUrl,
        brand: product.brand || 'Generic',
        category: product.category || product.aisle || 'General',
        badges: product.badges || [],
        nutrition: product.nutrition || null,
        enrichmentSource: product.source || 'offline_cache'
      };

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      await new Promise((resolve, reject) => {
        const request = store.put(productToCache);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });

      debugService.log(`📦 Cached product: ${productToCache.name}`);
      return true;
    } catch (error) {
      debugService.logError('Failed to cache product', error);
      return false;
    }
  }

  // Batch cache multiple products
  async cacheProducts(products) {
    if (!this.db) await this.init();
    if (!this.db) return 0;

    let cached = 0;
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    for (const product of products) {
      try {
        // Ensure product has an image
        if (!product.image_url && !product.imageUrl) {
          product.image_url = this.generatePlaceholderImage(product.name || product.productName || 'Product');
        }

        const productToCache = {
          ...product,
          id: product.id || `${product.spoonacularId || Date.now()}_${Math.random()}`,
          cached: true,
          cachedAt: Date.now(),
          lastAccessed: Date.now(),
          accessCount: 0,
          name: product.name || product.productName || product.title,
          imageUrl: product.image_url || product.imageUrl,
          brand: product.brand || 'Generic',
          category: product.category || product.aisle || 'General',
          badges: product.badges || [],
          nutrition: product.nutrition || null,
          enrichmentSource: product.source || 'offline_cache'
        };

        await new Promise((resolve, reject) => {
          const request = store.put(productToCache);
          request.onsuccess = () => {
            cached++;
            resolve(true);
          };
          request.onerror = () => resolve(false); // Continue with other products
        });
      } catch (error) {
        debugService.logError(`Failed to cache product: ${product.name}`, error);
      }
    }

    debugService.log(`📦 Batch cached ${cached}/${products.length} products`);
    return cached;
  }

  // Search cached products
  async searchProducts(query, limit = 20) {
    if (!this.db) await this.init();
    if (!this.db) return [];

    const lowerQuery = query.toLowerCase();
    const results = [];

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      const products = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Filter and score products
      const scoredProducts = products
        .filter(p => {
          const name = (p.name || '').toLowerCase();
          const brand = (p.brand || '').toLowerCase();
          const category = (p.category || '').toLowerCase();

          return name.includes(lowerQuery) ||
                 brand.includes(lowerQuery) ||
                 category.includes(lowerQuery) ||
                 (p.searchKeywords || []).some(k => k.toLowerCase().includes(lowerQuery));
        })
        .map(p => {
          let score = 0;
          const name = (p.name || '').toLowerCase();

          // Scoring logic
          if (name === lowerQuery) score += 10;
          else if (name.startsWith(lowerQuery)) score += 5;
          else if (name.includes(lowerQuery)) score += 3;

          if ((p.brand || '').toLowerCase().includes(lowerQuery)) score += 2;
          if ((p.category || '').toLowerCase().includes(lowerQuery)) score += 1;

          // Boost recently accessed items
          const daysSinceAccess = (Date.now() - p.lastAccessed) / (1000 * 60 * 60 * 24);
          if (daysSinceAccess < 1) score += 2;
          else if (daysSinceAccess < 7) score += 1;

          // Boost popular items
          score += Math.min(p.accessCount * 0.1, 2);

          return { ...p, searchScore: score };
        })
        .sort((a, b) => b.searchScore - a.searchScore)
        .slice(0, limit);

      // Update access counts
      const updateTransaction = this.db.transaction([this.storeName], 'readwrite');
      const updateStore = updateTransaction.objectStore(this.storeName);

      for (const product of scoredProducts) {
        product.lastAccessed = Date.now();
        product.accessCount = (product.accessCount || 0) + 1;
        updateStore.put(product);
      }

      debugService.log(`🔍 Found ${scoredProducts.length} cached products for: ${query}`);
      return scoredProducts;
    } catch (error) {
      debugService.logError('Failed to search cached products', error);
      return [];
    }
  }

  // Get product by ID
  async getProduct(id) {
    if (!this.db) await this.init();
    if (!this.db) return null;

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      const product = await new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (product) {
        // Update access info
        const updateTransaction = this.db.transaction([this.storeName], 'readwrite');
        const updateStore = updateTransaction.objectStore(this.storeName);

        product.lastAccessed = Date.now();
        product.accessCount = (product.accessCount || 0) + 1;
        updateStore.put(product);
      }

      return product;
    } catch (error) {
      debugService.logError('Failed to get product from cache', error);
      return null;
    }
  }

  // Clear old cached products
  async clearOldCache(daysOld = 30) {
    if (!this.db) await this.init();
    if (!this.db) return 0;

    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let deleted = 0;

    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('lastAccessed');

      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);

      await new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            deleted++;
            cursor.continue();
          } else {
            resolve(deleted);
          }
        };
        request.onerror = () => reject(request.error);
      });

      debugService.log(`🧹 Cleared ${deleted} old cached products`);
      return deleted;
    } catch (error) {
      debugService.logError('Failed to clear old cache', error);
      return 0;
    }
  }

  // Get cache statistics
  async getCacheStats() {
    if (!this.db) await this.init();
    if (!this.db) return null;

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      const count = await new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Get size estimate
      const estimate = await navigator.storage?.estimate();

      return {
        productCount: count,
        estimatedSize: estimate?.usage || 0,
        quotaAvailable: estimate?.quota || 0,
        supported: this.isSupported
      };
    } catch (error) {
      debugService.logError('Failed to get cache stats', error);
      return null;
    }
  }

  // Clear all cached products
  async clearAllCache() {
    if (!this.db) await this.init();
    if (!this.db) return false;

    try {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });

      this.popularProducts.clear();
      debugService.log('🧹 Cleared all cached products');
      return true;
    } catch (error) {
      debugService.logError('Failed to clear cache', error);
      return false;
    }
  }

  // Sync with server cache
  async syncWithServer() {
    try {
      debugService.log('🔄 Syncing with server cache...');

      const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const response = await fetch(`${API_URL}/api/cache/search?query=popular&limit=100`);

      if (!response.ok) {
        throw new Error(`Server sync failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.products) {
        const cached = await this.cacheProducts(data.products);
        debugService.log(`✅ Synced ${cached} products from server`);
        return cached;
      }

      return 0;
    } catch (error) {
      debugService.logError('Failed to sync with server', error);
      return 0;
    }
  }
}

// Export singleton instance
const offlineCache = new OfflineProductCache();
export default offlineCache;