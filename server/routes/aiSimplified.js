// server/routes/aiSimplified.js - Clean, Simplified AI System
const express = require('express');
const router = express.Router();
const AIShoppingListLoader = require('../utils/simpleProductParser');
const AIRecipeExtractor = require('../utils/simpleRecipeExtractor');

console.log('🤖 Loading Simplified AI routes...');

// Import AI SDKs
let Anthropic, OpenAI;
try {
  Anthropic = require('@anthropic-ai/sdk');
  console.log('✅ Anthropic SDK loaded');
} catch (error) {
  console.warn('⚠️ Anthropic SDK not found');
}

try {
  OpenAI = require('openai');
  console.log('✅ OpenAI SDK loaded');
} catch (error) {
  console.warn('⚠️ OpenAI SDK not found');
}

// Initialize AI clients
const anthropic = Anthropic && process.env.ANTHROPIC_API_KEY ? 
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

const openai = OpenAI && process.env.OPENAI_API_KEY ? 
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Initialize AI parsers
const productParser = new AIShoppingListLoader();
const recipeExtractor = new AIRecipeExtractor();

// Simple CORS middleware
const setCORSHeaders = (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://cart-smash.vercel.app',
    'https://cartsmash.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [])
  ];
  
  const vercelPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;
  
  if (!origin || allowedOrigins.includes(origin) || vercelPattern.test(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  next();
};

// Apply CORS to all routes
router.use(setCORSHeaders);

// OPTIONS handler
router.options('*', (req, res) => {
  res.sendStatus(204);
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      claude: !!anthropic,
      chatgpt: !!openai
    },
    timestamp: new Date().toISOString()
  });
});



// Detect content type
function detectContentType(prompt) {
  const lower = prompt.toLowerCase();
  
  if (lower.includes('recipe') && (lower.includes('ingredient') || lower.includes('instruction'))) {
    return 'recipe';
  }
  
  if (lower.includes('meal plan') || lower.includes('weekly') || lower.includes('7 day') || lower.includes('menu')) {
    return 'meal_plan';
  }
  
  return 'grocery_list';
}

// Simple, consistent AI prompts
function createSimplePrompt(userPrompt, contentType) {
  const baseInstruction = "You are a helpful grocery shopping assistant. Always respond with a grocery list and DETAILED cooking instructions. For instructions, always include specific temperatures, cooking times, techniques, and visual cues. Never use vague terms like 'cook according to package' - always be specific.";
  
  switch (contentType) {
    case 'recipe':
      return `${baseInstruction}

User request: ${userPrompt}

Please provide:
1. A recipe with ingredients and DETAILED step-by-step instructions (include specific temperatures, cooking times, techniques, and visual cues)
2. Followed by a grocery shopping list

IMPORTANT: Each cooking instruction must include specific details like temperatures (e.g., "375°F"), times (e.g., "5-7 minutes"), techniques (e.g., "sauté until golden brown"), and visual cues (e.g., "until translucent").

Format like this:
**Recipe Name**
Ingredients:
- 2 lbs chicken breast
- 1 onion
- 2 cups rice

Instructions:
1. Preheat oven to 375°F (190°C). Season 2 lbs chicken breast with salt, pepper, and your favorite herbs. Heat 2 tablespoons olive oil in a large oven-safe skillet over medium-high heat until shimmering.
2. Sear chicken breasts for 3-4 minutes per side until golden brown. Add diced onion to the pan and sauté for 5-7 minutes until softened and translucent, stirring occasionally.
3. Transfer skillet to preheated oven and bake for 15-20 minutes until chicken reaches internal temperature of 165°F (74°C). Meanwhile, prepare rice according to package directions (typically 1:2 ratio rice to water, bring to boil, then simmer covered for 18 minutes).
4. Remove chicken from oven and let rest for 5 minutes before slicing. Serve sliced chicken over fluffy rice with the caramelized onions from the pan.

**Grocery List:**
- 2 lbs chicken breast
- 1 onion
- 2 cups rice`;

    case 'meal_plan':
      return `${baseInstruction}

User request: ${userPrompt}

Please provide a simple meal plan followed by a consolidated grocery list.

Format like this:
**Meal Plan**
Monday: Chicken and rice
Tuesday: Pasta with vegetables
Wednesday: Fish and salad

**Grocery List:**
- 2 lbs chicken breast
- 2 cups rice
- 1 lb pasta
- 1 fish fillet
- 1 bag mixed vegetables
- 1 head lettuce`;

    default:
      return `${baseInstruction}

User request: ${userPrompt}

Please provide a simple grocery shopping list with quantities.

Format like this:
- 2 lbs ground beef
- 1 gallon milk
- 3 apples
- 1 loaf bread`;
  }
}

// Main simplified Claude endpoint
router.post('/claude', async (req, res) => {
  console.log('🚫 AI-ONLY: Simplified route disabled');
  
  return res.status(403).json({
    success: false,
    error: 'AI-only mode: Simplified route disabled. Use enhanced AI route with functional AI service.',
    message: 'Manual fallbacks and templates removed to ensure pure AI processing.'
  });
  
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }
    
    // Detect what type of content the user wants
    const contentType = detectContentType(prompt);
    console.log(`📋 Detected content type: ${contentType}`);
    
    // Create simple, consistent prompt
    const aiPrompt = createSimplePrompt(prompt, contentType);
    
    let responseText = '';
    let model = 'fallback';
    
    // Try Claude API first
    if (anthropic) {
      try {
        console.log('🔄 Calling Claude API...');
        
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          temperature: 0.3, // Lower temperature for more consistent output
          messages: [{ 
            role: 'user', 
            content: aiPrompt 
          }]
        });
        
        responseText = response.content[0].text;
        model = response.model;
        
        console.log('✅ Claude API success');
        
      } catch (apiError) {
        console.log('⚠️ Claude API failed:', apiError.message);
        throw apiError;
      }
    } else if (openai) {
      try {
        console.log('🔄 Calling OpenAI API...');
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ 
            role: 'user', 
            content: aiPrompt 
          }],
          max_tokens: 1500,
          temperature: 0.3
        });
        
        responseText = response.choices[0].message.content;
        model = response.model;
        
        console.log('✅ OpenAI API success');
        
      } catch (apiError) {
        console.log('⚠️ OpenAI API failed:', apiError.message);
        throw apiError;
      }
    } else {
      // AI-ONLY: No manual fallbacks allowed
      throw new Error('AI-only mode: Manual fallback parsing disabled. Requires functional AI service.');
    }
    
    // Simple, reliable parsing using the utilities
    console.log('🎯 Parsing response...');
    
    const products = await productParser.parseProducts(responseText);
    const recipes = await recipeExtractor.extractRecipes(responseText);
    
    console.log(`✅ Parsed ${products.length} products and ${recipes.length} recipes`);
    
    // Validate that all products have string productName
    const validatedProducts = products.map(product => ({
      ...product,
      productName: typeof product.productName === 'string' ? product.productName : String(product.productName || 'Unknown Item')
    }));
    
    // Simple, consistent response format
    res.json({
      success: true,
      response: responseText,
      products: validatedProducts,
      recipes: recipes,
      contentType: contentType,
      model: model,
      timestamp: new Date().toISOString(),
      stats: {
        productsFound: validatedProducts.length,
        recipesFound: recipes.length,
        aiUsed: model !== 'fallback'
      }
    });
    
  } catch (error) {
    console.error('❌ Simplified Claude API error:', error);
    
    // Simple error response
    res.status(500).json({ 
      success: false,
      error: 'Failed to process request',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Simplified ChatGPT endpoint (same logic as Claude for consistency)
router.post('/chatgpt', async (req, res) => {
  console.log('🧠 Simplified ChatGPT API request received');
  
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }
    
    const contentType = detectContentType(prompt);
    const aiPrompt = createSimplePrompt(prompt, contentType);
    
    let responseText = '';
    let model = 'fallback';
    
    // Try OpenAI first for ChatGPT endpoint
    if (openai) {
      try {
        console.log('🔄 Calling OpenAI API...');
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ 
            role: 'user', 
            content: aiPrompt 
          }],
          max_tokens: 1500,
          temperature: 0.3
        });
        
        responseText = response.choices[0].message.content;
        model = response.model;
        
        console.log('✅ OpenAI API success');
        
      } catch (apiError) {
        console.log('⚠️ OpenAI API failed, trying Claude...');
        
        // Fallback to Claude if available
        if (anthropic) {
          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            temperature: 0.3,
            messages: [{ 
              role: 'user', 
              content: aiPrompt 
            }]
          });
          
          responseText = response.content[0].text;
          model = response.model + ' (fallback)';
        } else {
          throw apiError;
        }
      }
    } else if (anthropic) {
      // Use Claude as backup
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        temperature: 0.3,
        messages: [{ 
          role: 'user', 
          content: aiPrompt 
        }]
      });
      
      responseText = response.content[0].text;
      model = response.model + ' (backup)';
    } else {
      // AI-ONLY: No manual fallbacks allowed
      throw new Error('AI-only mode: Manual fallback parsing disabled. Requires functional AI service.');
    }
    
    const products = await productParser.parseProducts(responseText);
    const recipes = await recipeExtractor.extractRecipes(responseText);
    
    const validatedProducts = products.map(product => ({
      ...product,
      productName: typeof product.productName === 'string' ? product.productName : String(product.productName || 'Unknown Item')
    }));
    
    res.json({
      success: true,
      response: responseText,
      products: validatedProducts,
      recipes: recipes,
      contentType: contentType,
      model: model,
      timestamp: new Date().toISOString(),
      stats: {
        productsFound: validatedProducts.length,
        recipesFound: recipes.length,
        aiUsed: model !== 'fallback'
      }
    });
    
  } catch (error) {
    console.error('❌ Simplified ChatGPT API error:', error);
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to process request',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

console.log('✅ Simplified AI routes loaded');
module.exports = router;