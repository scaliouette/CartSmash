export const FEATURES = {
  // Core features
  INTELLIGENT_PARSING: true,
  PRODUCT_VALIDATION: true,
  REAL_TIME_PRICING: true, // Enabled - Now supports real Instacart pricing data
  
  // Advanced features
  ANALYTICS_DASHBOARD: process.env.NODE_ENV === 'development',
  PARSING_DEMO: true,
  ADVANCED_SETTINGS: true,
  
  // Experimental features
  MACHINE_LEARNING_FEEDBACK: false,
  VOICE_INPUT: false,
  IMAGE_RECOGNITION: false,
  
  // Integration features
  INSTACART_INTEGRATION: true,
  WALMART_INTEGRATION: false,
  TARGET_INTEGRATION: false
};