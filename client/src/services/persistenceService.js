// client/src/services/persistenceService.js
// Data persistence service for CartSmash to maintain state across page refreshes

class PersistenceService {
  constructor() {
    this.storagePrefix = 'cartsmash_';
    this.compressionThreshold = 1000; // Compress data if larger than 1KB
    this.saveTimers = {}; // Track debounce timers for each key
    this.saveCache = {}; // Cache to detect duplicate saves
    this.debounceDelay = 500; // 500ms debounce

    // Initialize cleanup on load
    this.cleanupExpiredData();

    // Only log once
    if (!window.__persistenceInitialized) {
      console.log('💾 PersistenceService initialized');
      window.__persistenceInitialized = true;
    }
  }

  // Generate storage key with prefix
  getKey(key) {
    return `${this.storagePrefix}${key}`;
  }

  // Save data to localStorage with optional expiration (debounced)
  save(key, data, expirationHours = 24) {
    // Check if data is identical to cached version
    const dataString = JSON.stringify(data);
    if (this.saveCache[key] === dataString) {
      // Skip duplicate save
      return true;
    }

    // Clear existing timer if any
    if (this.saveTimers[key]) {
      clearTimeout(this.saveTimers[key]);
    }

    // Set up debounced save
    this.saveTimers[key] = setTimeout(() => {
      this._performSave(key, data, expirationHours);
      this.saveCache[key] = dataString;
    }, this.debounceDelay);

    return true;
  }

  // Immediate save without debouncing
  saveImmediate(key, data, expirationHours = 24) {
    return this._performSave(key, data, expirationHours);
  }

  // Internal save implementation
  _performSave(key, data, expirationHours = 24) {
    try {
      const storageKey = this.getKey(key);
      const expirationTime = Date.now() + (expirationHours * 60 * 60 * 1000);

      const payload = {
        data,
        timestamp: Date.now(),
        expires: expirationTime,
        version: '1.0'
      };

      const serialized = JSON.stringify(payload);

      // Only log for large data
      if (serialized.length > this.compressionThreshold) {
        console.log(`📦 Compressing large data for key: ${key} (${serialized.length} chars)`);
      }

      localStorage.setItem(storageKey, serialized);

      // Always log cart saves for debugging
      if (key === 'cart' || (process.env.NODE_ENV === 'development' && serialized.length > 100)) {
        console.log(`💾 Saved ${key}:`, {
          items: key === 'cart' ? JSON.parse(serialized).data?.length || 0 : undefined,
          size: `${Math.round(serialized.length / 1024 * 100) / 100}KB`,
          expires: new Date(expirationTime).toLocaleString()
        });
      }

      return true;
    } catch (error) {
      console.error(`❌ Error saving ${key}:`, error);
      
      // Handle quota exceeded error
      if (error.name === 'QuotaExceededError') {
        this.clearExpiredData();
        console.log('🧹 Cleared expired data, retrying save...');
        
        try {
          localStorage.setItem(this.getKey(key), JSON.stringify({ data, timestamp: Date.now() }));
          return true;
        } catch (retryError) {
          console.error('❌ Retry save failed:', retryError);
        }
      }
      
      return false;
    }
  }

  // Load data from localStorage
  load(key, defaultValue = null) {
    try {
      const storageKey = this.getKey(key);
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) {
        return defaultValue;
      }

      const payload = JSON.parse(stored);
      
      // Check expiration
      if (payload.expires && Date.now() > payload.expires) {
        console.log(`⏰ Data expired for key: ${key}`);
        localStorage.removeItem(storageKey);
        return defaultValue;
      }
      
      // Always log cart loads for debugging
      if (key === 'cart' || process.env.NODE_ENV === 'development') {
        console.log(`📖 Loaded ${key}:`, {
          items: key === 'cart' ? payload.data?.length || 0 : undefined,
          age: `${Math.round((Date.now() - payload.timestamp) / 1000 / 60)}min`,
          version: payload.version || 'legacy'
        });
      }
      
      return payload.data;
    } catch (error) {
      console.error(`❌ Error loading ${key}:`, error);
      return defaultValue;
    }
  }

  // Remove specific key
  remove(key) {
    const storageKey = this.getKey(key);
    localStorage.removeItem(storageKey);
    console.log(`🗑️ Removed ${key}`);
  }

  // Clear all CartSmash data
  clearAll() {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(this.storagePrefix)
    );
    
    keys.forEach(key => localStorage.removeItem(key));
    console.log(`🧹 Cleared ${keys.length} CartSmash storage items`);
    
    return keys.length;
  }

  // Clean up expired data
  cleanupExpiredData() {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(this.storagePrefix)
    );
    
    let cleanedCount = 0;
    
    keys.forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data.expires && Date.now() > data.expires) {
          localStorage.removeItem(key);
          cleanedCount++;
        }
      } catch (error) {
        // Invalid JSON, remove it
        localStorage.removeItem(key);
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired items`);
    }
    
    return cleanedCount;
  }

  // Clear expired data (public method)
  clearExpiredData() {
    return this.cleanupExpiredData();
  }

  // Get storage usage info
  getStorageInfo() {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(this.storagePrefix)
    );
    
    let totalSize = 0;
    const items = {};
    
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      const size = value ? value.length : 0;
      totalSize += size;
      
      const shortKey = key.replace(this.storagePrefix, '');
      items[shortKey] = {
        size: `${Math.round(size / 1024 * 100) / 100}KB`,
        sizeBytes: size
      };
    });
    
    return {
      totalItems: keys.length,
      totalSize: `${Math.round(totalSize / 1024 * 100) / 100}KB`,
      totalSizeBytes: totalSize,
      items,
      quotaUsage: this.getQuotaUsage()
    };
  }

  // Get localStorage quota usage
  getQuotaUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      return navigator.storage.estimate().then(estimate => ({
        used: estimate.usage,
        available: estimate.quota,
        percentage: Math.round((estimate.usage / estimate.quota) * 100)
      }));
    }
    
    return Promise.resolve({ used: 'unknown', available: 'unknown', percentage: 'unknown' });
  }

  // Cart-specific methods
  saveCart(cartItems, expirationHours = 48) {
    // Cart should always save immediately (no debouncing for critical data)
    return this.saveImmediate('cart', cartItems, expirationHours);
  }

  loadCart() {
    return this.load('cart', []);
  }

  clearCart() {
    this.remove('cart');
  }

  // Recipe-specific methods
  saveRecipes(recipes, expirationHours = 24) {
    return this.save('recipes', recipes, expirationHours);
  }

  loadRecipes() {
    return this.load('recipes', []);
  }

  clearRecipes() {
    this.remove('recipes');
  }

  // Ingredients-specific methods
  saveIngredients(ingredients, expirationHours = 24) {
    return this.save('ingredients', ingredients, expirationHours);
  }

  loadIngredients() {
    return this.load('ingredients', []);
  }

  clearIngredients() {
    this.remove('ingredients');
  }

  // Meal plan methods
  saveMealPlans(mealPlans, expirationHours = 72) {
    return this.save('meal_plans', mealPlans, expirationHours);
  }

  loadMealPlans() {
    return this.load('meal_plans', []);
  }

  clearMealPlans() {
    this.remove('meal_plans');
  }

  // User preferences
  saveUserPreferences(preferences, expirationHours = 168) { // 1 week
    return this.save('user_preferences', preferences, expirationHours);
  }

  loadUserPreferences() {
    return this.load('user_preferences', {
      theme: 'light',
      notifications: true,
      autoSave: true,
      preferredStores: [],
      dietaryRestrictions: []
    });
  }

  // Session data (shorter expiration)
  saveSessionData(key, data, expirationHours = 2) {
    return this.save(`session_${key}`, data, expirationHours);
  }

  loadSessionData(key, defaultValue = null) {
    return this.load(`session_${key}`, defaultValue);
  }

  removeSessionData(key) {
    this.remove(`session_${key}`);
  }

  // Backup and restore
  exportData() {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(this.storagePrefix)
    );
    
    const backup = {
      timestamp: Date.now(),
      version: '1.0',
      data: {}
    };
    
    keys.forEach(key => {
      const shortKey = key.replace(this.storagePrefix, '');
      backup.data[shortKey] = JSON.parse(localStorage.getItem(key));
    });
    
    console.log('📦 Exported data:', backup);
    return backup;
  }

  importData(backup) {
    if (!backup || !backup.data) {
      throw new Error('Invalid backup format');
    }
    
    let importedCount = 0;
    
    Object.entries(backup.data).forEach(([key, payload]) => {
      const storageKey = this.getKey(key);
      localStorage.setItem(storageKey, JSON.stringify(payload));
      importedCount++;
    });
    
    console.log(`📥 Imported ${importedCount} items`);
    return importedCount;
  }

  // Auto-save functionality
  enableAutoSave(callback, intervalMinutes = 5) {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    this.autoSaveInterval = setInterval(() => {
      try {
        callback();
        console.log('💾 Auto-save completed');
      } catch (error) {
        console.error('❌ Auto-save error:', error);
      }
    }, intervalMinutes * 60 * 1000);
    
    console.log(`⏰ Auto-save enabled (${intervalMinutes}min intervals)`);
    
    // Save immediately
    callback();
  }

  disableAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('⏰ Auto-save disabled');
    }
  }
}

// Export singleton instance
const persistenceService = new PersistenceService();
export default persistenceService;