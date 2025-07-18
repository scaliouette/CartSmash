// server/routes/ai.js
const express = require('express');
const router = express.Router();

console.log('🤖 Loading AI routes...');

// Health check for AI services
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      claude: !!process.env.ANTHROPIC_API_KEY,
      chatgpt: !!process.env.OPENAI_API_KEY
    },
    timestamp: new Date().toISOString()
  });
});

// Extract grocery items from AI response text
const extractGroceryItems = (text) => {
  const lines = text.split('\n');
  const groceryItems = [];
  const groceryKeywords = [
    'cup', 'cups', 'lb', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'ounces',
    'tsp', 'tbsp', 'tablespoon', 'teaspoon', 'clove', 'cloves', 'bunch',
    'bag', 'container', 'jar', 'can', 'bottle', 'loaf', 'dozen', 'pack'
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Look for bullet points, numbers, or dashes
    if (trimmed.match(/^[•\-\*\d+\.\)\s]*/) && trimmed.length > 3) {
      let cleaned = trimmed.replace(/^[•\-\*\d+\.\)\s]+/, '').trim();
      
      // Skip if it's clearly not a grocery item
      if (cleaned.toLowerCase().includes('meal plan') || 
          cleaned.toLowerCase().includes('monday') ||
          cleaned.toLowerCase().includes('tuesday') ||
          cleaned.toLowerCase().includes('wednesday') ||
          cleaned.toLowerCase().includes('thursday') ||
          cleaned.toLowerCase().includes('friday') ||
          cleaned.toLowerCase().includes('saturday') ||
          cleaned.toLowerCase().includes('sunday') ||
          cleaned.toLowerCase().includes('breakfast') ||
          cleaned.toLowerCase().includes('lunch') ||
          cleaned.toLowerCase().includes('dinner') ||
          cleaned.toLowerCase().includes('recipe') ||
          cleaned.toLowerCase().includes('total:') ||
          cleaned.toLowerCase().includes('serves:') ||
          cleaned.length < 3) {
        continue;
      }
      
      // Check if it contains grocery-related keywords or common foods
      const hasGroceryKeyword = groceryKeywords.some(keyword => 
        cleaned.toLowerCase().includes(keyword)
      );
      
      const hasCommonFood = /\b(chicken|beef|pork|fish|salmon|rice|pasta|bread|milk|cheese|eggs|butter|oil|onion|garlic|tomato|pepper|carrot|potato|apple|banana|lettuce|spinach|broccoli|beans|lentils|quinoa|oats|yogurt|flour|sugar|salt)\b/i.test(cleaned);
      
      if (hasGroceryKeyword || hasCommonFood || /^\d+/.test(trimmed)) {
        // Clean up common prefixes
        cleaned = cleaned.replace(/^(buy|get|purchase|add|include)\s+/i, '');
        
        if (cleaned && !groceryItems.includes(cleaned)) {
          groceryItems.push(cleaned);
        }
      }
    }
  }
  
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
    
    // Check if we have a real API key
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
      // TODO: Implement real Claude API call
      // const response = await fetch('https://api.anthropic.com/v1/messages', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
      //     'Content-Type': 'application/json',
      //     'anthropic-version': '2023-06-01'
      //   },
      //   body: JSON.stringify({
      //     model: 'claude-3-sonnet-20240229',
      //     messages: [{ role: 'user', content: prompt }],
      //     max_tokens: 1000
      //   })
      // });
      
      console.log('⚠️ Real Claude API not implemented yet, using fallback');
    }
    
    // Fallback: Generate a realistic response for demo purposes
    const mockResponse = generateClaudeResponse(prompt);
    const groceryList = extractGroceryItems(mockResponse);
    
    console.log(`✅ Claude response generated, extracted ${groceryList.length} grocery items`);
    
    res.json({
      success: true,
      response: mockResponse,
      groceryList: groceryList,
      model: 'claude-3-sonnet (demo)',
      tokensUsed: Math.floor(Math.random() * 500) + 200,
      fallback: true
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
    
    // Check if we have a real API key
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      // TODO: Implement real OpenAI API call
      // const response = await fetch('https://api.openai.com/v1/chat/completions', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     model: 'gpt-4',
      //     messages: [{ role: 'user', content: prompt }],
      //     max_tokens: 1000,
      //     temperature: 0.7
      //   })
      // });
      
      console.log('⚠️ Real ChatGPT API not implemented yet, using fallback');
    }
    
    // Fallback: Generate a realistic response for demo purposes
    const mockResponse = generateChatGPTResponse(prompt);
    const groceryList = extractGroceryItems(mockResponse);
    
    console.log(`✅ ChatGPT response generated, extracted ${groceryList.length} grocery items`);
    
    res.json({
      success: true,
      response: mockResponse,
      groceryList: groceryList,
      model: 'gpt-4 (demo)',
      tokensUsed: Math.floor(Math.random() * 400) + 150,
      fallback: true
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

// Generate realistic Claude-style response
function generateClaudeResponse(prompt) {
  if (prompt.toLowerCase().includes('meal plan') || prompt.toLowerCase().includes('weekly')) {
    return `I'd be happy to help you create a comprehensive weekly meal plan! Here's a balanced approach focusing on nutrition and variety:

**WEEKLY MEAL PLAN**

**MONDAY - Mediterranean Monday**
• Breakfast: Greek yogurt parfait with berries
• Lunch: Quinoa tabbouleh with grilled chicken
• Dinner: Baked salmon with roasted vegetables

**TUESDAY - Comfort Tuesday** 
• Breakfast: Overnight oats with banana
• Lunch: Turkey and avocado wrap
• Dinner: Lean beef stir-fry with brown rice

**WEDNESDAY - Plant-Powered Wednesday**
• Breakfast: Smoothie bowl with spinach and fruits
• Lunch: Lentil soup with whole grain bread
• Dinner: Black bean and sweet potato tacos

**COMPLETE SHOPPING LIST:**

**PROTEINS:**
• 2 lbs salmon fillet
• 2 lbs boneless chicken breast  
• 1 lb lean ground beef
• 1 lb turkey deli meat
• 1 container Greek yogurt (32oz)
• 1 dozen eggs

**PRODUCE:**
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

**PANTRY STAPLES:**
• 2 cups quinoa
• 2 cups brown rice
• 1 container rolled oats
• 1 can black beans
• 1 cup red lentils
• 2 tbsp olive oil
• 1 loaf whole grain bread

This plan provides balanced macronutrients with approximately 2000-2200 calories per day, emphasizing lean proteins, complex carbohydrates, and plenty of vegetables for optimal nutrition.`;
  }
  
  if (prompt.toLowerCase().includes('budget')) {
    return `I'll help you create a budget-conscious grocery plan that doesn't compromise on nutrition:

**BUDGET-FRIENDLY WEEKLY PLAN ($75 total)**

**STRATEGIC PROTEIN CHOICES:**
• 3 lbs ground turkey
• 1 whole chicken
• 2 dozen eggs
• 1 lb dried black beans
• 1 container Greek yogurt

**SMART PRODUCE PICKS:**
• 5 lb bag potatoes
• 2 lb bag carrots  
• 1 bag yellow onions
• 1 head cabbage
• 3 lbs bananas
• 2 lbs seasonal apples

**PANTRY FOUNDATIONS:**
• 5 lbs rice
• 2 lbs pasta
• 1 container oats
• 1 jar peanut butter
• 1 bottle cooking oil
• Basic spices

This plan maximizes nutrition per dollar while providing satisfying, filling meals throughout the week.`;
  }
  
  return `Here's a personalized grocery plan based on your request:

**RECOMMENDED ITEMS:**

**FRESH PRODUCE:**
• 2 lbs mixed vegetables
• 3 pieces seasonal fruit
• 1 bag leafy greens
• 2 onions
• 1 head garlic

**PROTEINS:**
• 2 lbs chicken breast
• 1 dozen eggs
• 1 container Greek yogurt

**PANTRY ESSENTIALS:**
• 2 cups rice or quinoa
• 1 bottle olive oil
• Basic seasonings

This selection provides flexibility for various cooking styles while maintaining nutritional balance.`;
}

// Generate realistic ChatGPT-style response
function generateChatGPTResponse(prompt) {
  if (prompt.toLowerCase().includes('quick') || prompt.toLowerCase().includes('30 minute')) {
    return `Here are 5 quick dinner recipes under 30 minutes with shopping list:

**QUICK DINNER RECIPES**

1. **Chicken Fried Rice** (20 mins)
2. **Pasta Aglio e Olio** (15 mins) 
3. **Beef Stir-Fry** (25 mins)
4. **Quesadillas** (10 mins)
5. **Egg Fried Noodles** (18 mins)

**COMPLETE SHOPPING LIST:**

**PROTEINS:**
• 2 lbs ground beef
• 2 lbs chicken thighs
• 1 dozen eggs

**CARBS:**
• 2 lbs spaghetti
• 2 cups jasmine rice  
• 8 flour tortillas
• 4 packs ramen noodles

**VEGETABLES:**
• 3 bell peppers
• 1 bag frozen mixed vegetables
• 6 cloves garlic
• 1 onion

**PANTRY:**
• 1 bottle soy sauce
• 1 bottle olive oil
• 1 container parmesan cheese
• 1 bag shredded cheese
• 1 jar salsa

These recipes use common ingredients and simple techniques - perfect for busy weeknights!`;
  }
  
  if (prompt.toLowerCase().includes('party')) {
    return `Birthday Party for 15 People - Complete Shopping List:

**APPETIZERS**
• 2 lbs chicken wings
• 1 bag tortilla chips
• 2 containers hummus
• 1 lb cheese cubes

**MAIN COURSE**
• 4 lbs ground beef
• 15 burger buns  
• 3 lbs hot dogs
• 15 hot dog buns

**SIDES**
• 5 lbs potatoes
• 2 bags coleslaw mix
• 1 container mayonnaise

**DRINKS**
• 4 cases soda/water
• 1 gallon fruit punch

**DESSERT**
• 1 birthday cake
• 1 container ice cream

Pro tip: Prep potato salad the day before to save time!`;
  }
  
  return `Here's a practical grocery list based on your needs:

**ESSENTIALS:**
• 2 lbs protein of choice
• 1 bag mixed vegetables
• 3 pieces fruit
• 1 dozen eggs
• 1 gallon milk

**PANTRY BASICS:**
• 2 cups rice/pasta
• 1 loaf bread
• 1 jar peanut butter
• 1 bottle cooking oil

This list covers basic nutrition needs while staying budget-friendly.`;
}

console.log('✅ AI routes loaded successfully');
module.exports = router;