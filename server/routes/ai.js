// server/routes/ai.js - Production version with real API calls
const express = require('express');
const router = express.Router();

console.log('🤖 Loading AI routes (Production Mode)...');

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
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Enhanced grocery item extraction
const extractGroceryItems = (text) => {
  console.log('🔍 Extracting grocery items from AI response...');
  
  const lines = text.split('\n');
  const groceryItems = [];
  
  // Common grocery keywords to help identify items
  const groceryKeywords = [
    'cup', 'cups', 'lb', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'ounces',
    'tsp', 'tbsp', 'tablespoon', 'teaspoon', 'clove', 'cloves', 'bunch',
    'bag', 'container', 'jar', 'can', 'bottle', 'loaf', 'dozen', 'pack',
    'gallon', 'quart', 'pint', 'slice', 'slices', 'piece', 'pieces'
  ];

  // Food items to help identify grocery items
  const foodKeywords = [
    'chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'eggs', 'milk',
    'cheese', 'yogurt', 'butter', 'bread', 'rice', 'pasta', 'potato', 'onion',
    'garlic', 'tomato', 'pepper', 'carrot', 'broccoli', 'spinach', 'lettuce',
    'apple', 'banana', 'orange', 'strawberry', 'blueberry', 'avocado',
    'beans', 'lentils', 'quinoa', 'oats', 'flour', 'sugar', 'salt', 'oil'
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines or obvious headers
    if (!trimmed || trimmed.length < 3) continue;
    
    // Skip meal plan headers and day names
    if (trimmed.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|breakfast|lunch|dinner|snack|meal|recipe|serves|total|budget|plan|shopping|grocery)/i)) {
      continue;
    }
    
    // Look for list items (bullets, numbers, dashes)
    if (trimmed.match(/^[•\-\*\d+\.\)\s]*/) && trimmed.length > 3) {
      let cleaned = trimmed.replace(/^[•\-\*\d+\.\)\s]+/, '').trim();
      
      // Remove common prefixes
      cleaned = cleaned.replace(/^(buy|get|purchase|add|include|pick up|grab)\s+/i, '');
      
      // Check if it contains grocery indicators
      const hasGroceryKeyword = groceryKeywords.some(keyword => 
        cleaned.toLowerCase().includes(keyword)
      );
      
      const hasFoodKeyword = foodKeywords.some(keyword => 
        cleaned.toLowerCase().includes(keyword)
      );
      
      // Additional check for quantity patterns (numbers at start)
      const hasQuantityPattern = /^\d+/.test(trimmed);
      
      if ((hasGroceryKeyword || hasFoodKeyword || hasQuantityPattern) && 
          cleaned.length > 2 && 
          !groceryItems.includes(cleaned)) {
        groceryItems.push(cleaned);
      }
    }
  }
  
  console.log(`✅ Extracted ${groceryItems.length} grocery items`);
  return groceryItems;
};

// Claude API Integration
router.post('/claude', async (req, res) => {
  console.log('🧠 Claude API request received');
  
  try {
    const { prompt, context } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }
    
    if (!anthropic) {
      return res.status(503).json({
        success: false,
        error: 'Claude API not available - missing API key or SDK',
        fallback: false
      });
    }
    
    // Enhanced prompt for grocery list generation
    const enhancedPrompt = context === 'grocery_list_generation' ? 
      `${prompt}

Please provide a detailed response and include a clear, bulleted shopping list. Format grocery items as:
• [quantity] [item name]

Example:
• 2 lbs chicken breast
• 1 cup quinoa
• 3 bell peppers

Focus on specific, purchasable items with quantities.` : prompt;
    
    console.log('🔄 Calling Claude API...');
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{ 
        role: 'user', 
        content: enhancedPrompt 
      }]
    });
    
    const responseText = response.content[0].text;
    const groceryList = extractGroceryItems(responseText);
    
    console.log(`✅ Claude response received (${response.usage?.input_tokens || 0} input tokens, ${response.usage?.output_tokens || 0} output tokens)`);
    console.log(`🛒 Extracted ${groceryList.length} grocery items`);
    
    res.json({
      success: true,
      response: responseText,
      groceryList: groceryList,
      model: response.model, // Use the actual model from the response
      usage: response.usage,
      fallback: false
    });
    
  } catch (error) {
    console.error('❌ Claude API error:', error);
    
    // Determine error type and provide appropriate response
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
    } else if (error.status === 400) {
      res.status(400).json({ 
        success: false,
        error: 'Invalid request to Claude API',
        message: error.message
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

// ChatGPT API Integration  
router.post('/chatgpt', async (req, res) => {
  console.log('🤖 ChatGPT API request received');
  
  try {
    const { prompt, context } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }
    
    if (!openai) {
      return res.status(503).json({
        success: false,
        error: 'ChatGPT API not available - missing API key or SDK',
        fallback: false
      });
    }
    
    // Enhanced prompt for grocery list generation
    const enhancedPrompt = context === 'grocery_list_generation' ? 
      `${prompt}

Please provide a helpful response and include a clear shopping list with specific items and quantities. Format like:
• 2 lbs ground beef
• 1 gallon milk
• 3 large tomatoes

Focus on specific, measurable grocery items that can be easily found in a store.` : prompt;
    
    console.log('🔄 Calling ChatGPT API...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // More cost-effective than gpt-4
      messages: [{ 
        role: 'user', 
        content: enhancedPrompt 
      }],
      max_tokens: 2000,
      temperature: 0.7
    });
    
    const responseText = response.choices[0].message.content;
    const groceryList = extractGroceryItems(responseText);
    
    console.log(`✅ ChatGPT response received (${response.usage?.prompt_tokens || 0} input tokens, ${response.usage?.completion_tokens || 0} output tokens)`);
    console.log(`🛒 Extracted ${groceryList.length} grocery items`);
    
    res.json({
      success: true,
      response: responseText,
      groceryList: groceryList,
      model: response.model,
      usage: response.usage,
      fallback: false
    });
    
  } catch (error) {
    console.error('❌ ChatGPT API error:', error);
    
    // Determine error type and provide appropriate response
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
    } else if (error.status === 400) {
      res.status(400).json({ 
        success: false,
        error: 'Invalid request to OpenAI API',
        message: error.message
      });
    } else if (error.code === 'insufficient_quota') {
      res.status(402).json({ 
        success: false,
        error: 'OpenAI API quota exceeded',
        message: 'Please check your OpenAI billing and usage limits'
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

// Test endpoint for development
router.post('/test', async (req, res) => {
  console.log('🧪 Test endpoint called');
  
  const { service = 'claude' } = req.body;
  const testPrompt = 'Create a simple grocery list for 2 people for 3 days. Include breakfast, lunch, and dinner items.';
  
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
      return res.status(400).json({
        success: false,
        error: `${service} API not available`
      });
    }
    
    const groceryList = extractGroceryItems(response);
    
    res.json({
      success: true,
      service: service,
      response: response.substring(0, 200) + '...',
      groceryItemsFound: groceryList.length,
      groceryList: groceryList
    });
    
  } catch (error) {
    console.error(`Test ${service} error:`, error);
    res.status(500).json({
      success: false,
      error: `Test failed for ${service}`,
      message: error.message
    });
  }
});

console.log('✅ AI routes loaded successfully (Production Mode)');
module.exports = router;