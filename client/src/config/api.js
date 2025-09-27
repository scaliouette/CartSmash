// Centralized API configuration
// Check if we're in development mode or if production API is unavailable
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const API_URL = process.env.REACT_APP_API_URL || (isDevelopment ? 'http://localhost:3001' : 'https://cartsmash-api.onrender.com');

// API endpoints
export const API_ENDPOINTS = {
  // AI endpoints
  AI_ANTHROPIC: `${API_URL}/api/ai/anthropic`,
  AI_OPENAI: `${API_URL}/api/ai/openai`,
  AI_GOOGLE: `${API_URL}/api/ai/google`,

  // Cart endpoints
  CART_PARSE: `${API_URL}/api/cart/parse`,

  // Recipe endpoints
  RECIPES: `${API_URL}/api/recipes`,

  // Instacart endpoints
  INSTACART_SEARCH: `${API_URL}/api/instacart/search`,
  INSTACART_BATCH_SEARCH: `${API_URL}/api/instacart/batch-search`,
  INSTACART_COMPARE_PRICES: `${API_URL}/api/instacart/compare-prices`,

  // Meal plan endpoints
  MEAL_PLAN_GENERATE: `${API_URL}/api/meal-plans/generate-meal-plan`,
  MEAL_PLAN_REGENERATE: `${API_URL}/api/meal-plans/regenerate-meal`,
};

// Helper function to get AI endpoint by provider
export const getAIEndpoint = (provider) => {
  return `${API_URL}/api/ai/${provider}`;
};