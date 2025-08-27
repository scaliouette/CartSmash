// server/config/index.js - Environment-aware configuration loader
const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    const env = process.env.NODE_ENV || 'development';
    
    // Load base configuration
    const baseConfigPath = path.join(__dirname, 'settings.json');
    const baseConfig = this.loadJsonFile(baseConfigPath);
    
    // Load environment-specific configuration
    const envConfigPath = path.join(__dirname, `settings.${env}.json`);
    const envConfig = this.loadJsonFile(envConfigPath);
    
    // Merge configurations (env config overrides base)
    const mergedConfig = this.deepMerge(baseConfig, envConfig);
    
    // Apply environment variable overrides
    this.applyEnvOverrides(mergedConfig);
    
    console.log(`⚙️ Configuration loaded for environment: ${env}`);
    
    return mergedConfig;
  }

  loadJsonFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn(`Failed to load config file: ${filePath}`, error.message);
    }
    return {};
  }

  deepMerge(target, source) {
    const output = Object.assign({}, target);
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  applyEnvOverrides(config) {
    // Override with environment variables
    if (process.env.AI_CONFIDENCE_THRESHOLD) {
      config.aiParsing.confidenceThreshold = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD);
    }
    
    if (process.env.AI_PREFERRED) {
      config.aiParsing.preferredAI = process.env.AI_PREFERRED;
    }
    
    if (process.env.ENABLE_DEBUG === 'true') {
      config.system.enableDebugMode = true;
      config.system.logLevel = 'debug';
    }
    
    if (process.env.MAINTENANCE_MODE === 'true') {
      config.system.maintenanceMode = true;
    }
    
    if (process.env.KROGER_ENABLE_VALIDATION) {
      config.kroger.enableValidation = process.env.KROGER_ENABLE_VALIDATION === 'true';
    }
  }

  get(path, defaultValue = null) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.config;
    
    for (const key of keys) {
      if (!(key in target) || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }
    
    target[lastKey] = value;
  }

  getAll() {
    return this.config;
  }

  isProduction() {
    return this.config.system.environment === 'production';
  }

  isDevelopment() {
    return this.config.system.environment === 'development';
  }

  isMaintenanceMode() {
    return this.config.system.maintenanceMode === true;
  }
}

// Export singleton instance
module.exports = new ConfigManager();