// server/routes/ai.js - REAL AI API INTEGRATION
const express = require('express');
const router = express.Router();

console.log('🤖 Loading AI routes with real API integration...');

// Import AI SDKs
let Anthropic, OpenAI;
try {
  Anthropic = require('@anthropic-ai/sdk');
  console.log('✅ Anthropic SDK loaded');
} catch (error) {
  console.log('⚠️ Anthropic SDK not installed. Run: npm install @anthropic-ai/sdk');
}

try {
  OpenAI = require('openai');
  console.log('✅ OpenAI SDK loaded');
} catch (error) {
  console.log('⚠️ OpenAI SDK not installed. Run: npm install openai');
}

// Initialize AI clients
let anthropicClient, openaiClient;

if (Anthropic && process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
  anthropicClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  console.log('🧠 Anthropic client initialized');
} else {
  console.log('⚠️ Anthropic API key not configured');
}

if (OpenAI && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('🤖 OpenAI client initialized');
} else {
  console.log('⚠️ OpenAI API key not configured');
}

// Health check for AI services
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      claude: !!anthropicClient,
      chatgpt: !!openaiClient
    },
    apiKeys: {
      anthropic: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here',
      openai: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'
    },
    timestamp: new Date().toISOString()
  });
});

// Enhanced grocery item extraction
const extractGroceryItems = (text) => {
  console.log('🔍 Extracting grocery items from AI response...');
  
  const lines = text.split('\n');
  const groceryItems = [];
  let inGrocerySection = false;
  
  const groceryHeaders = [
    'shopping list', 'grocery list', 'ingredients needed', 'what you need', 
    'buy these', 'purchase', 'grocery items', 'food items', 'supplies needed',
    'complete shopping list', 'grocery shopping', 'items to buy'
  ];
  
  const excludePatterns = [
    /recipe/i, /instructions/i, /directions/i, /steps/i, /method/i,
    /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
    /breakfast|lunch|dinner|snack/i, /day \d+/i, /week \d+/i,
    /serves/i, /calories/i, /prep time/i, /cook time/i, /total:/i,
    /preheat|bake|cook|heat|boil|fry|grill|roast|simmer/i,
    /season with|add salt|taste and adjust/i,
    /meal plan/i, /budget/i, /tips/i, /notes/i, /optional/i
  ];

  const foodKeywords = [
    'chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'eggs', 'tofu', 'beans', 'lentils',
    'milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream',
    'banana', 'apple', 'orange', 'tomato', 'onion', 'garlic', 'potato', 'carrot', 'spinach', 
    'lettuce', 'broccoli', 'pepper', 'cucumber', 'avocado', 'strawberry', 'blueberry',
    'rice', 'pasta', 'bread', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'sauce',
    'quinoa', 'oats', 'cereal', 'pasta sauce', 'olive oil', 'coconut oil',
    'nuts', 'almonds', 'walnuts', 'honey', 'maple syrup'
  ];

  const measurements = [
    'cup', 'cups', 'lb', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'ounces',
    'tsp', 'tbsp', 'tablespoon', 'teaspoon', 'clove', 'cloves', 'bunch',
    'bag', 'container', 'jar', 'can', 'bottle', 'loaf', 'dozen', 'pack',
    'gallon', 'quart', 'pint', 'box', 'package', 'head', 'piece', 'pieces'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;
    
    const lowerLine = line.toLowerCase();
    if (groceryHeaders.some(header => lowerLine.includes(header))) {
      inGrocerySection = true;
      console.log('📝 Found grocery list section:', line);
      continue;
    }
    
    if (line.match(/^\*\*[^*]+\*\*$/) || line.match(/^#{1,6}\s/) || line.match(/^[A-Z][A-Z\s]+:$/)) {
      if (!groceryHeaders.some(header => lowerLine.includes(header))) {
        if (inGrocerySection) {
          console.log('📝 Left grocery section at:', line);
        }
        inGrocerySection = false;
      }
      continue;
    }
    
    const bulletMatch = line.match(/^[•\-\*\d+\.\)\s]*(.+)$/);
    if (bulletMatch) {
      let cleanedItem = bulletMatch[1].trim();
      
      cleanedItem = cleanedItem.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');
      
      if (excludePatterns.some(pattern => pattern.test(cleanedItem))) {
        continue;
      }
      
      if (cleanedItem.length < 3 || 
          cleanedItem.endsWith(':') ||
          cleanedItem.toLowerCase().includes('cook') || 
          cleanedItem.toLowerCase().includes('bake') ||
          cleanedItem.toLowerCase().includes('heat') ||
          cleanedItem.toLowerCase().includes('serve') ||
          cleanedItem.toLowerCase().includes('mix') ||
          cleanedItem.toLowerCase().includes('stir')) {
        continue;
      }
      
      const hasQuantity = /^\d+/.test(cleanedItem) || 
                         measurements.some(unit => 
                           new RegExp(`\\b\\d+\\s*${unit}\\b`, 'i').test(cleanedItem)
                         );
      
      const hasCommonFood = foodKeywords.some(food => 
        new RegExp(`\\b${food}\\b`, 'i').test(cleanedItem)
      );
      
      const looksLikeGroceryItem = 
        /\b(fresh|organic|free.range|grass.fed|whole|ground|sliced|diced|chopped)\b/i.test(cleanedItem) ||
        /\b(bag|container|jar|can|bottle|loaf|dozen|pack|box)\s+of\b/i.test(cleanedItem) ||
        /\b(vegetable|fruit|meat|dairy|grain|spice|herb)\b/i.test(cleanedItem);
      
      let score = 0;
      if (inGrocerySection) score += 3;
      if (hasQuantity) score += 2;
      if (hasCommonFood) score += 2;
      if (looksLikeGroceryItem) score += 1;
      
      if (score >= 2 || (hasQuantity && hasCommonFood)) {
        cleanedItem = cleanedItem.replace(/^(buy|get|purchase|add|include|need)\s+/i, '');
        
        if (cleanedItem && !groceryItems.some(existing => 
            existing.toLowerCase() === cleanedItem.toLowerCase())) {
          groceryItems.push(cleanedItem);
          console.log(`✅ Added grocery item: "${cleanedItem}" (score: ${score})`);
        }
      }
    }
  }
  
  console.log(`🎯 Final extraction: ${groceryItems.length} grocery items found`);
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
    
    // Try real Claude API first
    if (anthropicClient) {
      try {
        console.log('🔄 Calling real Claude API...');
        
        // Enhanced prompt for better grocery list generation
        const enhancedPrompt = `${prompt}

Please format your response with a clear grocery shopping list section. List each grocery item on a separate line with bullet points, including quantities where appropriate. Focus on practical shopping items rather than cooking instructions.`;

        const message = await anthropicClient.messages.create({
          model: "claude-3-sonnet-20240229",
          max_tokens: 1000,
          system: "You are a helpful AI that converts recipes and meal plans into clear grocery lists.",
          messages: [{ role: "user", content: enhancedPrompt }]
        });

        const responseText = message.content[0].text;
        const groceryList = extractGroceryItems(responseText);

        console.log(`✅ Real Claude API success! Extracted ${groceryList.length} grocery items`);

        return res.json({
          success: true,
          response: responseText,
          groceryList: groceryList,
          model: 'claude-3-sonnet',
          tokensUsed: message.usage.output_tokens,
          fallback: false
        });

      } catch (apiError) {
        console.log('⚠️ Real Claude API failed:', apiError.message);
        // Fall through to fallback
      }
    }
    
    // Fallback: Generate a realistic response
    console.log('🔄 Using fallback Claude response...');
    const mockResponse = generateClaudeResponse(prompt);
    const groceryList = extractGroceryItems(mockResponse);
    
    console.log(`✅ Fallback Claude response generated, extracted ${groceryList.length} grocery items`);
    
    res.json({
      success: true,
      response: mockResponse,
      groceryList: groceryList,
      model: 'claude-3-sonnet (demo)',
      tokensUsed: Math.floor(Math.random() * 500) + 200,
      fallback: true,
      reason: anthropicClient ? 'API call failed' : 'No API key configured'
    });
    
  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process request with Claude',
      message: error.message
    });
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
    
    // Try real OpenAI API first
    if (openaiClient) {
      try {
        console.log('🔄 Calling real OpenAI API...');
        
        // Enhanced prompt for better grocery list generation
        const enhancedPrompt = `${prompt}

Please format your response with a clear grocery shopping list section. List each grocery item on a separate line with bullet points, including quantities where appropriate. Focus on practical shopping items rather than cooking instructions.`;

        const completion = await openaiClient.chat.completions.create({
          messages: [{ role: 'user', content: enhancedPrompt }],
          model: 'gpt-4',
          max_tokens: 1000,
          temperature: 0.7
        });

        const responseText = completion.choices[0].message.content;
        const groceryList = extractGroceryItems(responseText);

        console.log(`✅ Real OpenAI API success! Extracted ${groceryList.length} grocery items`);

        return res.json({
          success: true,
          response: responseText,
          groceryList: groceryList,
          model: 'gpt-4',
          tokensUsed: completion.usage.total_tokens,
          fallback: false
        });

      } catch (apiError) {
        console.log('⚠️ Real OpenAI API failed:', apiError.message);
        // Fall through to fallback
      }
    }
    
    // Fallback: Generate a realistic response
    console.log('🔄 Using fallback ChatGPT response...');
    const mockResponse = generateChatGPTResponse(prompt);
    const groceryList = extractGroceryItems(mockResponse);
    
    console.log(`✅ Fallback ChatGPT response generated, extracted ${groceryList.length} grocery items`);
    
    res.json({
      success: true,
      response: mockResponse,
      groceryList: groceryList,
      model: 'gpt-4 (demo)',
      tokensUsed: Math.floor(Math.random() * 400) + 150,
      fallback: true,
      reason: openaiClient ? 'API call failed' : 'No API key configured'
    });
    
  } catch (error) {
    console.error('ChatGPT API error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process request with ChatGPT',
      message: error.message
    });
  }
});

// Fallback response generators (same as before)
function generateClaudeResponse(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('meal plan') || lowerPrompt.includes('weekly')) {
    return `I'd be happy to help you create a comprehensive weekly meal plan! Here's a balanced approach focusing on nutrition and variety:

**WEEKLY MEAL PLAN**

**Monday - Mediterranean Monday**
• Breakfast: Greek yogurt parfait with mixed berries
• Lunch: Quinoa tabbouleh with grilled chicken
• Dinner: Baked salmon with roasted vegetables

**Tuesday - Comfort Tuesday** 
• Breakfast: Overnight oats with sliced banana
• Lunch: Turkey and avocado wrap with whole grain tortilla
• Dinner: Lean beef stir-fry with brown rice

**COMPLETE SHOPPING LIST:**

**Proteins:**
• 2 lbs salmon fillet
• 2 lbs boneless chicken breast  
• 1 lb lean ground beef
• 1 lb turkey deli meat
• 1 container Greek yogurt (32oz)
• 1 dozen eggs

**Fresh Produce:**
• 2 cups mixed berries
• 4 bananas
• 2 avocados
• 1 bag spinach (5oz)
• 2 bell peppers
• 1 large onion
• 3 cloves garlic
• 2 large sweet potatoes
• 1 cucumber
• 2 tomatoes
• 1 lemon

**Pantry Staples:**
• 2 cups quinoa
• 2 cups brown rice
• 1 container rolled oats
• 1 can black beans
• 1 cup red lentils
• 2 tbsp olive oil
• 1 loaf whole grain bread

This plan provides balanced macronutrients with approximately 2000-2200 calories per day.`;
  }
  
  // Add other response templates here...
  return `Here's a personalized grocery plan based on your request:

**GROCERY SHOPPING LIST:**

• 2 lbs protein of choice
• 1 dozen eggs
• 1 gallon milk
• 2 cups rice
• 1 bag vegetables
• 3 pieces fruit
• 1 loaf bread
• 1 bottle olive oil

This provides a solid foundation for healthy meals.`;
}

function generateChatGPTResponse(prompt) {
  // Similar fallback structure...
  return `Here's a practical grocery list:

**SHOPPING LIST:**

• 2 lbs chicken breast
• 1 dozen eggs
• 1 gallon milk
• 2 cups rice
• 1 bag mixed vegetables
• 3 bananas
• 1 loaf bread
• 1 bottle cooking oil

Perfect for quick, healthy meals!`;
}

console.log('✅ AI routes loaded with real API integration');
module.exports = router;