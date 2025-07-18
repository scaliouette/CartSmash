// server/routes/settings.js - Configuration management for AI parsing system
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

console.log('⚙️ Loading Settings routes...');

// Default settings configuration
const DEFAULT_SETTINGS = {
  aiParsing: {
    // Parsing behavior
    strictMode: true,
    confidenceThreshold: 0.6,
    enableAIValidation: true,
    fallbackToSimple: true,
    
    // Processing options
    maxProcessingTime: 30,
    enableCaching: true,
    batchSize: 50,
    
    // Product validation
    enableProductValidation: true,
    enablePriceCheck: true,
    enableAlternatives: true,
    
    // User experience
    showConfidenceScores: true,
    autoReviewLowConfidence: true,
    enableSmartSuggestions: true,
    
    // API preferences
    preferredAI: 'claude',
    enableGeminiValidation: false,
    apiTimeout: 10,
    
    // Advanced filters
    excludePatterns: [
      'cooking instructions',
      'meal descriptions', 
      'day names',
      'time references',
      'recipe steps',
      'preparation methods'
    ],
    includePatterns: [
      'quantity + product',
      'measurements',
      'food keywords',
      'grocery terms'
    ],
    
    // Categories
    enableAutoCategories: true,
    customCategories: [],
    
    // Performance
    cacheExpiryMinutes: 60,
    maxConcurrentRequests: 10,
    
    // Export/Import
    exportFormat: 'json'
  },
  
  productValidation: {
    enableRealTimeValidation: true,
    enablePriceChecking: true,
    enableAvailabilityCheck: true,
    preferredStores: ['instacart', 'walmart'],
    maxAlternatives: 5,
    priceThreshold: 100.00, // Flag expensive items
    validationTimeout: 5
  },
  
  userInterface: {
    theme: 'light',
    showAdvancedFeatures: true,
    enableAnimations: true,
    autoSaveInterval: 30,
    showParsingStats: true,
    enableNotifications: true
  },
  
  analytics: {
    enableTracking: true,
    enablePerformanceMonitoring: true,
    enableUserFeedbackCollection: true,
    retentionDays: 30,
    enableExport: true
  },
  
  system: {
    environment: 'development',
    logLevel: 'info',
    enableDebugMode: false,
    enableAPIRateLimiting: true,
    maxRequestsPerMinute: 100
  }
};

// In-memory settings storage (in production, use a database)
let currentSettings = { ...DEFAULT_SETTINGS };

// Settings file path for persistence
const SETTINGS_FILE = path.join(__dirname, '../config/settings.json');

// Load settings from file on startup
const loadSettingsFromFile = async () => {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf8');
    const fileSettings = JSON.parse(data);
    currentSettings = mergeSettings(DEFAULT_SETTINGS, fileSettings);
    console.log('✅ Settings loaded from file');
  } catch (error) {
    console.log('📝 Settings file not found, using defaults');
    await saveSettingsToFile(); // Create file with defaults
  }
};

// Save settings to file
const saveSettingsToFile = async () => {
  try {
    // Ensure config directory exists
    const configDir = path.dirname(SETTINGS_FILE);
    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
    }
    
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(currentSettings, null, 2));
    console.log('💾 Settings saved to file');
  } catch (error) {
    console.error('❌ Failed to save settings:', error);
  }
};

// Merge settings objects recursively
const mergeSettings = (defaults, overrides) => {
  const result = { ...defaults };
  
  for (const key in overrides) {
    if (overrides[key] && typeof overrides[key] === 'object' && !Array.isArray(overrides[key])) {
      result[key] = mergeSettings(defaults[key] || {}, overrides[key]);
    } else {
      result[key] = overrides[key];
    }
  }
  
  return result;
};

// Validate settings
const validateSettings = (settings) => {
  const errors = [];
  
  // Validate AI parsing settings
  if (settings.aiParsing) {
    const ai = settings.aiParsing;
    
    if (ai.confidenceThreshold < 0.1 || ai.confidenceThreshold > 1.0) {
      errors.push('Confidence threshold must be between 0.1 and 1.0');
    }
    
    if (ai.maxProcessingTime < 5 || ai.maxProcessingTime > 120) {
      errors.push('Max processing time must be between 5 and 120 seconds');
    }
    
    if (ai.batchSize < 1 || ai.batchSize > 200) {
      errors.push('Batch size must be between 1 and 200');
    }
    
    if (!['claude', 'chatgpt', 'auto'].includes(ai.preferredAI)) {
      errors.push('Preferred AI must be claude, chatgpt, or auto');
    }
  }
  
  // Validate product validation settings
  if (settings.productValidation) {
    const pv = settings.productValidation;
    
    if (pv.maxAlternatives < 0 || pv.maxAlternatives > 20) {
      errors.push('Max alternatives must be between 0 and 20');
    }
    
    if (pv.priceThreshold < 0 || pv.priceThreshold > 1000) {
      errors.push('Price threshold must be between 0 and 1000');
    }
  }
  
  return errors;
};

// Initialize settings on module load
loadSettingsFromFile();

// Get all settings
router.get('/', (req, res) => {
  console.log('⚙️ Get all settings request');
  
  res.json({
    success: true,
    settings: currentSettings,
    timestamp: new Date().toISOString()
  });
});

// Get specific settings section
router.get('/:section', (req, res) => {
  const { section } = req.params;
  console.log(`⚙️ Get ${section} settings request`);
  
  if (!currentSettings[section]) {
    return res.status(404).json({
      success: false,
      error: `Settings section '${section}' not found`,
      availableSections: Object.keys(currentSettings)
    });
  }
  
  res.json({
    success: true,
    section: section,
    settings: currentSettings[section],
    timestamp: new Date().toISOString()
  });
});

// Update specific settings section
router.post('/:section', async (req, res) => {
  const { section } = req.params;
  const { settings } = req.body;
  
  console.log(`⚙️ Update ${section} settings request`);
  
  if (!currentSettings[section]) {
    return res.status(404).json({
      success: false,
      error: `Settings section '${section}' not found`
    });
  }
  
  if (!settings) {
    return res.status(400).json({
      success: false,
      error: 'Settings data is required'
    });
  }
  
  try {
    // Create updated settings
    const updatedSettings = {
      ...currentSettings,
      [section]: mergeSettings(currentSettings[section], settings)
    };
    
    // Validate the updated settings
    const validationErrors = validateSettings(updatedSettings);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Settings validation failed',
        validationErrors: validationErrors
      });
    }
    
    // Apply the changes
    currentSettings = updatedSettings;
    
    // Save to file
    await saveSettingsToFile();
    
    console.log(`✅ ${section} settings updated successfully`);
    
    res.json({
      success: true,
      section: section,
      settings: currentSettings[section],
      message: `${section} settings updated successfully`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Failed to update ${section} settings:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      message: error.message
    });
  }
});

// Reset settings to defaults
router.post('/reset/:section?', async (req, res) => {
  const { section } = req.params;
  const { confirm } = req.body;
  
  if (!confirm) {
    return res.status(400).json({
      success: false,
      error: 'Reset confirmation required',
      message: 'Include { "confirm": true } in request body'
    });
  }
  
  try {
    if (section) {
      console.log(`🔄 Resetting ${section} settings to defaults`);
      
      if (!DEFAULT_SETTINGS[section]) {
        return res.status(404).json({
          success: false,
          error: `Settings section '${section}' not found`
        });
      }
      
      currentSettings[section] = { ...DEFAULT_SETTINGS[section] };
      
      res.json({
        success: true,
        section: section,
        settings: currentSettings[section],
        message: `${section} settings reset to defaults`
      });
    } else {
      console.log('🔄 Resetting all settings to defaults');
      currentSettings = { ...DEFAULT_SETTINGS };
      
      res.json({
        success: true,
        settings: currentSettings,
        message: 'All settings reset to defaults'
      });
    }
    
    await saveSettingsToFile();
    
  } catch (error) {
    console.error('❌ Failed to reset settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset settings',
      message: error.message
    });
  }
});

// Export settings
router.get('/export/:format?', (req, res) => {
  const { format = 'json' } = req.params;
  console.log(`📤 Export settings in ${format} format`);
  
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=ai-parsing-settings-${timestamp}.json`);
      res.json({
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        settings: currentSettings
      });
    } else if (format === 'env') {
      // Export as environment variables
      const envContent = generateEnvFormat(currentSettings);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename=ai-parsing-settings-${timestamp}.env`);
      res.send(envContent);
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported export format',
        supportedFormats: ['json', 'env']
      });
    }
  } catch (error) {
    console.error('❌ Export failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export settings',
      message: error.message
    });
  }
});

// Import settings
router.post('/import', async (req, res) => {
  const { settings, merge = true } = req.body;
  console.log('📥 Import settings request');
  
  if (!settings) {
    return res.status(400).json({
      success: false,
      error: 'Settings data is required'
    });
  }
  
  try {
    let importedSettings;
    
    if (merge) {
      // Merge with current settings
      importedSettings = mergeSettings(currentSettings, settings);
    } else {
      // Replace entirely, but keep structure
      importedSettings = mergeSettings(DEFAULT_SETTINGS, settings);
    }
    
    // Validate imported settings
    const validationErrors = validateSettings(importedSettings);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Imported settings validation failed',
        validationErrors: validationErrors
      });
    }
    
    // Apply imported settings
    currentSettings = importedSettings;
    await saveSettingsToFile();
    
    console.log('✅ Settings imported successfully');
    
    res.json({
      success: true,
      settings: currentSettings,
      message: 'Settings imported successfully',
      merged: merge,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import settings',
      message: error.message
    });
  }
});

// Get settings schema/documentation
router.get('/schema/:section?', (req, res) => {
  const { section } = req.params;
  console.log(`📋 Get settings schema for ${section || 'all sections'}`);
  
  const schema = {
    aiParsing: {
      description: 'AI parsing behavior and intelligence settings',
      fields: {
        strictMode: { type: 'boolean', description: 'Enable strict parsing for higher accuracy' },
        confidenceThreshold: { type: 'number', min: 0.1, max: 1.0, description: 'Minimum confidence for auto-acceptance' },
        enableAIValidation: { type: 'boolean', description: 'Use AI for additional validation' },
        preferredAI: { type: 'string', enum: ['claude', 'chatgpt', 'auto'], description: 'Preferred AI service' }
      }
    },
    productValidation: {
      description: 'Product validation and pricing settings',
      fields: {
        enableRealTimeValidation: { type: 'boolean', description: 'Validate products against databases' },
        maxAlternatives: { type: 'number', min: 0, max: 20, description: 'Maximum alternatives to suggest' }
      }
    },
    userInterface: {
      description: 'User interface and experience settings',
      fields: {
        theme: { type: 'string', enum: ['light', 'dark'], description: 'UI theme' },
        showAdvancedFeatures: { type: 'boolean', description: 'Show advanced features to users' }
      }
    }
  };
  
  if (section) {
    if (!schema[section]) {
      return res.status(404).json({
        success: false,
        error: `Schema for section '${section}' not found`
      });
    }
    
    res.json({
      success: true,
      section: section,
      schema: schema[section]
    });
  } else {
    res.json({
      success: true,
      schema: schema
    });
  }
});

// Health check for settings
router.get('/health/check', (req, res) => {
  console.log('🏥 Settings health check');
  
  const validationErrors = validateSettings(currentSettings);
  const isHealthy = validationErrors.length === 0;
  
  res.json({
    success: true,
    healthy: isHealthy,
    validationErrors: validationErrors,
    settingsCount: Object.keys(currentSettings).length,
    lastModified: new Date().toISOString(),
    defaults: Object.keys(DEFAULT_SETTINGS)
  });
});

// Helper Functions

function generateEnvFormat(settings) {
  const lines = ['# AI Parsing Settings - Generated ' + new Date().toISOString()];
  
  const flatten = (obj, prefix = '') => {
    Object.entries(obj).forEach(([key, value]) => {
      const envKey = (prefix + key).toUpperCase().replace(/[^A-Z0-9]/g, '_');
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        flatten(value, prefix + key + '_');
      } else {
        lines.push(`${envKey}=${JSON.stringify(value)}`);
      }
    });
  };
  
  flatten(settings, 'AI_PARSING_');
  return lines.join('\n');
}

// Middleware to get current settings (for use by other routes)
router.getCurrentSettings = () => currentSettings;

// Middleware to update specific setting
router.updateSetting = async (section, key, value) => {
  if (currentSettings[section] && currentSettings[section].hasOwnProperty(key)) {
    currentSettings[section][key] = value;
    await saveSettingsToFile();
    return true;
  }
  return false;
};

console.log('✅ Settings routes loaded successfully');
module.exports = router;