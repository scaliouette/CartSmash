// server/routes/ai.js - Enhanced with intelligent parsing
const express = require('express');
const router = express.Router();
const AIProductParser = require('../utils/aiProductParser');

console.log('🤖 Loading Enhanced AI routes with intelligent parsing...');

// Import AI SDKs
let Anthropic, OpenAI;
try {
  Anthropic = require('@anthropic-ai/sdk');
  console.log('✅ Anthropic SDK loaded');
} catch (error) {
  console.warn('⚠️ Anthropic SDK not found - install with: npm install @anthropic-ai/sdk');
}

try {
  OpenAI = require('openai');
  console.log('✅ OpenAI SDK loaded');
} catch (error) {
  console.warn('⚠️ OpenAI SDK not found - install with: npm install openai');
}

// Initialize AI clients
const anthropic = Anthropic && process.env.ANTHROPIC_API_KEY ? 
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

const openai = OpenAI && process.env.OPENAI_API_KEY ? 
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Initialize the intelligent product parser
const productParser = new AIProductParser();

// Health check for AI services
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      claude: {
        available: !!anthropic,
        hasKey: !!process.env.ANTHROPIC_API_KEY,
        keyLength: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0
      },
      chatgpt: {
        available: !!openai,
        hasKey: !!process.env.OPENAI_API_KEY,
        keyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0
      },
      productParser: {
        available: true,
        version: '2.0.0'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Enhanced Claude API Integration with intelligent parsing
router.post('/claude', async (req, res) => {
  console.log('🧠 Enhanced Claude API request received');
  
  try {
    const { prompt, context, options = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }
    
    // Enhanced prompt for better grocery list generation
    const enhancedPrompt = `${prompt}

Please provide a detailed response and then include a clear, specific grocery shopping list with quantities. Format grocery items as bulleted list with specific quantities:

• 2 lbs boneless chicken breast
• 1 gallon whole milk  
• 3 large bell peppers
• 1 bag (16 oz) quinoa

Focus on specific, measurable items that can be purchased at a grocery store. Avoid meal descriptions, cooking instructions, or generic terms.`;
    
    let responseText, usage, model;
    
    // Try real Claude API first
    if (anthropic) {
      try {
        console.log('🔄 Calling real Claude API...');
        
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          temperature: 0.7,
          messages: [{ 
            role: 'user', 
            content: enhancedPrompt 
          }]
        });
        
        responseText = response.content[0].text;
        usage = response.usage;
        model = response.model;
        
        console.log(`✅ Real Claude API success! (${usage?.input_tokens || 0} input tokens, ${usage?.output_tokens || 0} output tokens)`);
        
      } catch (apiError) {
        console.log('⚠️ Real Claude API failed:', apiError.message);
        // Fall through to fallback
      }
    }
    
    // Fallback if API unavailable
    if (!responseText) {
      console.log('🔄 Using enhanced fallback response...');
      responseText = generateEnhancedClaudeResponse(prompt);
      usage = { input_tokens: 150, output_tokens: 300 };
      model = 'claude-3-sonnet (demo)';
    }
    
    // 🚀 INTELLIGENT PARSING - Extract only real grocery products
    console.log('🎯 Starting intelligent product parsing...');
    const parsingResults = await productParser.parseGroceryProducts(responseText, {
      context: context,
      strictMode: options.strictMode || true
    });
    
    // Generate parsing statistics
    const parsingStats = productParser.getParsingStats(parsingResults);
    
    console.log(`✅ Intelligent parsing complete: ${parsingResults.products.length} validated products extracted`);
    console.log(`📊 Parsing efficiency: ${parsingStats.processingMetrics.filteringEfficiency}`);
    
    res.json({
      success: true,
      response: responseText,
      
      // 🎯 Enhanced Results
      products: parsingResults.products,  // Only validated grocery products
      parsingStats: parsingStats,
      
      // Legacy support
      groceryList: parsingResults.products.map(p => 
        `${p.quantity}${p.unit ? ' ' + p.unit : ''} ${p.productName}`
      ),
      
      // Metadata
      model: model,
      usage: usage,
      fallback: !anthropic,
      timestamp: new Date().toISOString(),
      
      // Intelligence metrics
      intelligence: {
        totalCandidates: parsingResults.totalCandidates,
        validProducts: parsingResults.validProducts,
        averageConfidence: parsingResults.averageConfidence,
        filteringEfficiency: parsingStats.processingMetrics.filteringEfficiency
      }
    });
    
  } catch (error) {
    console.error('❌ Enhanced Claude API error:', error);
    
    if (error.status === 401) {
      res.status(401).json({ 
        success: false,
        error: 'Invalid Claude API key',
        message: 'Please check your ANTHROPIC_API_KEY environment variable'
      });
    } else if (error.status === 429) {
      res.status(429).json({ 
        success: false,
        error: 'Claude API rate limit exceeded',
        message: 'Please try again in a few moments'
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: 'Failed to process request with Claude',
        message: error.message
      });
    }
  }
});

// Enhanced ChatGPT API Integration
router.post('/chatgpt', async (req, res) => {
  console.log('🤖 Enhanced ChatGPT API request received');
  
  try {
    const { prompt, context, options = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }
    
    // Enhanced prompt for better grocery list generation
    const enhancedPrompt = `${prompt}

Please provide a helpful response and include a specific shopping list with measurable quantities. Format like:
• 2 lbs ground beef
• 1 gallon milk
• 3 large tomatoes
• 1 bag (16 oz) pasta

Focus on specific, measurable grocery items that can be easily found in a store. Avoid meal descriptions or cooking steps.`;
    
    let responseText, usage, model;
    
    // Try real OpenAI API first
    if (openai) {
      try {
        console.log('🔄 Calling real OpenAI API...');
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ 
            role: 'user', 
            content: enhancedPrompt 
          }],
          max_tokens: 2000,
          temperature: 0.7
        });
        
        responseText = response.choices[0].message.content;
        usage = response.usage;
        model = response.model;
        
        console.log(`✅ Real OpenAI API success! (${usage?.prompt_tokens || 0} input tokens, ${usage?.completion_tokens || 0} output tokens)`);
        
      } catch (apiError) {
        console.log('⚠️ Real OpenAI API failed:', apiError.message);
        // Fall through to fallback
      }
    }
    
    // Fallback if API unavailable
    if (!responseText) {
      console.log('🔄 Using enhanced fallback response...');
      responseText = generateEnhancedChatGPTResponse(prompt);
      usage = { prompt_tokens: 120, completion_tokens: 250 };
      model = 'gpt-4o-mini (demo)';
    }
    
    // 🚀 INTELLIGENT PARSING - Extract only real grocery products
    console.log('🎯 Starting intelligent product parsing...');
    const parsingResults = await productParser.parseGroceryProducts(responseText, {
      context: context,
      strictMode: options.strictMode || true
    });
    
    // Generate parsing statistics
    const parsingStats = productParser.getParsingStats(parsingResults);
    
    console.log(`✅ Intelligent parsing complete: ${parsingResults.products.length} validated products extracted`);
    
    res.json({
      success: true,
      response: responseText,
      
      // 🎯 Enhanced Results
      products: parsingResults.products,  // Only validated grocery products
      parsingStats: parsingStats,
      
      // Legacy support
      groceryList: parsingResults.products.map(p => 
        `${p.quantity}${p.unit ? ' ' + p.unit : ''} ${p.productName}`
      ),
      
      // Metadata
      model: model,
      usage: usage,
      fallback: !openai,
      timestamp: new Date().toISOString(),
      
      // Intelligence metrics
      intelligence: {
        totalCandidates: parsingResults.totalCandidates,
        validProducts: parsingResults.validProducts,
        averageConfidence: parsingResults.averageConfidence,
        filteringEfficiency: parsingStats.processingMetrics.filteringEfficiency
      }
    });
    
  } catch (error) {
    console.error('❌ Enhanced ChatGPT API error:', error);
    
    if (error.status === 401) {
      res.status(401).json({ 
        success: false,
        error: 'Invalid OpenAI API key',
        message: 'Please check your OPENAI_API_KEY environment variable'
      });
    } else if (error.status === 429) {
      res.status(429).json({ 
        success: false,
        error: 'OpenAI API rate limit exceeded',
        message: 'Please try again in a few moments'
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: 'Failed to process request with ChatGPT',
        message: error.message
      });
    }
  }
});

// Smart parsing endpoint - re-parse existing text with intelligence
router.post('/smart-parse', async (req, res) => {
  console.log('🎯 Smart parsing request received');
  
  try {
    const { text, options = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required for parsing'
      });
    }
    
    console.log('🔄 Running intelligent parsing on provided text...');
    
    const parsingResults = await productParser.parseGroceryProducts(text, {
      strictMode: options.strictMode !== false, // Default to strict
      context: options.context || 'manual_parse'
    });
    
    const parsingStats = productParser.getParsingStats(parsingResults);
    
    console.log(`✅ Smart parsing complete: ${parsingResults.products.length} products extracted`);
    
    res.json({
      success: true,
      originalText: text,
      products: parsingResults.products,
      parsingStats: parsingStats,
      
      // Comparison with simple parsing
      comparison: {
        intelligentProducts: parsingResults.products.length,
        totalCandidates: parsingResults.totalCandidates,
        filteringEfficiency: parsingStats.processingMetrics.filteringEfficiency,
        averageConfidence: parsingResults.averageConfidence
      },
      
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Smart parsing error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to parse text intelligently',
      message: error.message
    });
  }
});

// Product validation integration
router.post('/validate-products', async (req, res) => {
  console.log('🔍 Product validation request received');
  
  try {
    const { products } = req.body;
    
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Products array is required'
      });
    }
    
    // This would integrate with the product validation system
    // For now, we'll simulate the validation
    const validatedProducts = products.map(product => ({
      ...product,
      isValidated: true,
      confidence: product.confidence || 0.9,
      validationSource: 'ai_parser'
    }));
    
    res.json({
      success: true,
      validatedProducts: validatedProducts,
      validationCount: validatedProducts.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Product validation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to validate products',
      message: error.message
    });
  }
});

// Test endpoint for the enhanced system
router.post('/test-enhanced', async (req, res) => {
  console.log('🧪 Enhanced system test endpoint called');
  
  const { service = 'claude' } = req.body;
  const testPrompt = 'Create a grocery list for a family of 4 for one week including breakfast, lunch, and dinner meals.';
  
  try {
    let response;
    
    if (service === 'claude' && anthropic) {
      const claudeResponse = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{ role: 'user', content: testPrompt }]
      });
      response = claudeResponse.content[0].text;
    } else if (service === 'chatgpt' && openai) {
      const chatgptResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: testPrompt }],
        max_tokens: 1000
      });
      response = chatgptResponse.choices[0].message.content;
    } else {
      // Use fallback
      response = generateEnhancedClaudeResponse(testPrompt);
    }
    
    // Test the intelligent parsing
    const parsingResults = await productParser.parseGroceryProducts(response);
    const parsingStats = productParser.getParsingStats(parsingResults);
    
    res.json({
      success: true,
      service: service,
      testPrompt: testPrompt,
      aiResponse: response.substring(0, 300) + '...',
      
      // Intelligence results
      productsExtracted: parsingResults.products.length,
      parsingStats: parsingStats,
      sampleProducts: parsingResults.products.slice(0, 5),
      
      // Performance metrics
      performance: {
        filteringEfficiency: parsingStats.processingMetrics.filteringEfficiency,
        averageConfidence: parsingResults.averageConfidence,
        highConfidenceProducts: parsingStats.highConfidence
      }
    });
    
  } catch (error) {
    console.error(`❌ Enhanced test ${service} error:`, error);
    res.status(500).json({
      success: false,
      error: `Enhanced test failed for ${service}`,
      message: error.message
    });
  }
});

// Enhanced fallback response generators
function generateEnhancedClaudeResponse(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('meal plan') || lowerPrompt.includes('week')) {
    return `I'd be happy to help you create a comprehensive weekly meal plan! Here's a balanced approach that focuses on nutrition, variety, and practical shopping.

**WEEKLY MEAL PLAN FOR FAMILY OF 4**

**Monday - Mediterranean Monday**
• Breakfast: Greek yogurt parfait with berries
• Lunch: Quinoa tabbouleh with grilled chicken
• Dinner: Baked salmon with roasted vegetables

**Tuesday - Comfort Tuesday** 
• Breakfast: Overnight oats with banana
• Lunch: Turkey and avocado wraps
• Dinner: Lean beef stir-fry with brown rice

**COMPLETE GROCERY SHOPPING LIST:**

**Proteins & Dairy:**
• 2 lbs salmon fillets
• 2 lbs boneless chicken breast  
• 1 lb lean ground beef
• 1 lb sliced turkey breast
• 1 container Greek yogurt (32 oz)
• 1 dozen large eggs
• 1 gallon whole milk

**Fresh Produce:**
• 2 cups mixed berries
• 4 bananas
• 2 avocados
• 1 bag spinach (5 oz)
• 3 bell peppers
• 1 large yellow onion
• 1 head garlic
• 2 large sweet potatoes
• 1 English cucumber
• 3 Roma tomatoes
• 2 lemons

**Pantry Staples:**
• 2 cups quinoa
• 2 cups brown rice
• 1 container rolled oats (42 oz)
• 1 can black beans (15 oz)
• 1 cup red lentils
• 1 bottle olive oil (16.9 fl oz)
• 1 loaf whole grain bread

This plan provides balanced nutrition with approximately 2000-2200 calories per day per person.`;
  }
  
  if (lowerPrompt.includes('budget') || lowerPrompt.includes('cheap')) {
    return `Here's a budget-friendly grocery plan that maximizes nutrition while minimizing cost:

**BUDGET-SMART GROCERY LIST:**

**Proteins (Budget-Friendly):**
• 3 lbs ground turkey
• 2 dozen eggs
• 1 container Greek yogurt (32 oz)
• 1 bag dried black beans (1 lb)
• 1 jar peanut butter (18 oz)

**Bulk Staples:**
• 5 lbs brown rice
• 2 lbs whole wheat pasta
• 1 loaf whole grain bread
• 1 container oats (42 oz)

**Affordable Produce:**
• 3 lbs bananas
• 2 lbs carrots
• 1 bag potatoes (5 lbs)
• 1 large onion
• 1 head garlic

**Pantry Essentials:**
• 1 bottle vegetable oil
• 1 bag flour (5 lbs)
• 1 container salt

Total estimated cost: $45-55 for a week's worth of nutritious meals.`;
  }
  
  return `Here's a practical grocery list tailored to your needs:

**GROCERY SHOPPING LIST:**

**Proteins:**
• 2 lbs chicken breast
• 1 dozen eggs
• 1 container Greek yogurt (32 oz)

**Fresh Produce:**
• 3 bananas
• 2 bell peppers
• 1 bag spinach (5 oz)
• 1 onion

**Pantry Items:**
• 2 cups brown rice
• 1 loaf bread
• 1 bottle olive oil (16.9 fl oz)

**Dairy:**
• 1 gallon milk

This provides a solid foundation for healthy, versatile meals throughout the week.`;
}

function generateEnhancedChatGPTResponse(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('healthy') || lowerPrompt.includes('nutrition')) {
    return `Here's a nutritionally balanced grocery list focused on whole foods and health:

**HEALTHY GROCERY LIST:**

**Lean Proteins:**
• 2 lbs wild-caught salmon
• 2 lbs organic chicken breast
• 1 dozen free-range eggs
• 1 container Greek yogurt (32 oz)

**Nutrient-Dense Produce:**
• 1 bag organic spinach (5 oz)
• 2 cups blueberries
• 3 avocados
• 2 bell peppers
• 1 bunch broccoli

**Whole Grains & Healthy Fats:**
• 2 cups quinoa
• 1 loaf sprouted grain bread
• 1 bottle extra virgin olive oil (16.9 fl oz)
• 1 bag raw almonds (1 lb)

Perfect for maintaining energy and supporting overall health goals!`;
  }
  
  return `Here's a practical shopping list for your needs:

**SHOPPING LIST:**

• 2 lbs chicken breast
• 1 dozen eggs
• 1 gallon milk
• 2 cups brown rice
• 1 bag mixed vegetables (frozen)
• 3 bananas
• 1 loaf whole grain bread
• 1 bottle cooking oil (16.9 fl oz)

This covers the essentials for quick, healthy meals throughout the week!`;
}

console.log('✅ Enhanced AI routes loaded with intelligent parsing');
module.exports = router;