// client/src/utils/debugHelpers.js - Debug tools for AI integration
export const debugAI = {
  // Test if AI endpoints are reachable
  async testEndpoints() {
    console.log('🧪 Testing AI endpoints...');
    
    try {
      // Test health
      const healthResponse = await fetch('/api/ai/health');
      const healthData = await healthResponse.json();
      console.log('✅ AI Health:', healthData);
      
      // Test Claude
      const claudeResponse = await fetch('/api/ai/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: 'Quick test: give me 3 grocery items',
          context: 'test'
        })
      });
      const claudeData = await claudeResponse.json();
      console.log('✅ Claude test:', claudeData.groceryList);
      
      // Test ChatGPT
      const chatgptResponse = await fetch('/api/ai/chatgpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: 'Quick test: give me 3 grocery items',
          context: 'test'
        })
      });
      const chatgptData = await chatgptResponse.json();
      console.log('✅ ChatGPT test:', chatgptData.groceryList);
      
      return {
        health: healthData,
        claude: claudeData,
        chatgpt: chatgptData
      };
      
    } catch (error) {
      console.error('❌ Endpoint test failed:', error);
      return { error: error.message };
    }
  },

  // Test grocery list extraction locally
  testExtraction(sampleText) {
    console.log('🔍 Testing grocery extraction...');
    
    const lines = sampleText.split('\n');
    const groceryItems = [];
    let inGrocerySection = false;
    
    const groceryHeaders = [
      'shopping list', 'grocery list', 'ingredients needed', 'what you need', 
      'buy these', 'purchase', 'grocery items', 'food items'
    ];
    
    const excludePatterns = [
      /recipe/i, /instructions/i, /directions/i, /steps/i, /method/i,
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
      /breakfast|lunch|dinner|snack/i, /day \d+/i, /week \d+/i,
      /serves/i, /calories/i, /prep time/i, /cook time/i, /total:/i,
      /preheat|bake|cook|heat|boil|fry|grill|roast|simmer/i
    ];

    const foodKeywords = [
      'chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'eggs', 'tofu', 'beans', 'lentils',
      'milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream',
      'banana', 'apple', 'orange', 'tomato', 'onion', 'garlic', 'potato', 'carrot', 'spinach', 
      'lettuce', 'broccoli', 'pepper', 'cucumber', 'avocado', 'strawberry', 'blueberry',
      'rice', 'pasta', 'bread', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'sauce',
      'quinoa', 'oats', 'cereal'
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
        console.log('📝 Found grocery section:', line);
        continue;
      }
      
      if (line.match(/^\*\*[^*]+\*\*$/) || line.match(/^#{1,6}\s/) || line.match(/^[A-Z][A-Z\s]+:$/)) {
        if (!groceryHeaders.some(header => lowerLine.includes(header))) {
          inGrocerySection = false;
        }
        continue;
      }
      
      const bulletMatch = line.match(/^[•\-\*\d+\.\)\s]*(.+)$/);
      if (bulletMatch) {
        let cleanedItem = bulletMatch[1].trim();
        cleanedItem = cleanedItem.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');
        
        if (excludePatterns.some(pattern => pattern.test(cleanedItem))) {
          console.log('🚫 Excluded (pattern):', cleanedItem);
          continue;
        }
        
        if (cleanedItem.length < 3 || cleanedItem.endsWith(':')) {
          console.log('🚫 Excluded (length/format):', cleanedItem);
          continue;
        }
        
        const hasQuantity = /^\d+/.test(cleanedItem) || 
                           measurements.some(unit => 
                             new RegExp(`\\b\\d+\\s*${unit}\\b`, 'i').test(cleanedItem)
                           );
        
        const hasCommonFood = foodKeywords.some(food => 
          new RegExp(`\\b${food}\\b`, 'i').test(cleanedItem)
        );
        
        let score = 0;
        if (inGrocerySection) score += 3;
        if (hasQuantity) score += 2;
        if (hasCommonFood) score += 2;
        
        console.log(`📊 Item: "${cleanedItem}" | Score: ${score} | Quantity: ${hasQuantity} | Food: ${hasCommonFood} | Section: ${inGrocerySection}`);
        
        if (score >= 2 || (hasQuantity && hasCommonFood)) {
          cleanedItem = cleanedItem.replace(/^(buy|get|purchase|add|include|need)\s+/i, '');
          
          if (cleanedItem && !groceryItems.some(existing => 
              existing.toLowerCase() === cleanedItem.toLowerCase())) {
            groceryItems.push(cleanedItem);
            console.log(`✅ Added: "${cleanedItem}"`);
          }
        } else {
          console.log(`🚫 Excluded (low score): "${cleanedItem}"`);
        }
      }
    }
    
    console.log(`🎯 Final result: ${groceryItems.length} items`);
    return groceryItems;
  },

  // Test the App.js handleAIGroceryList function
  async testAppIntegration() {
    console.log('🧪 Testing App.js AI integration...');
    
    // Simulate what happens when AI assistant calls onGroceryListGenerated
    const testList = `2 lbs chicken breast
1 dozen eggs
1 gallon milk
2 cups quinoa
1 bag spinach`;

    console.log('📝 Test grocery list:', testList);
    
    // Check if the main form input gets updated
    const textareas = document.querySelectorAll('textarea');
    const mainTextarea = Array.from(textareas).find(ta => 
      ta.placeholder && ta.placeholder.toLowerCase().includes('grocery')
    );
    
    if (mainTextarea) {
      console.log('✅ Found main form textarea');
      
      // Simulate setting the value
      const originalValue = mainTextarea.value;
      mainTextarea.value = testList;
      mainTextarea.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log('📝 Set textarea value to test list');
      console.log('🔄 Original value:', originalValue);
      console.log('🔄 New value:', mainTextarea.value);
      
      // Reset after 2 seconds
      setTimeout(() => {
        mainTextarea.value = originalValue;
        mainTextarea.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('🔄 Reset textarea to original value');
      }, 2000);
      
      return true;
    } else {
      console.log('❌ Could not find main form textarea');
      return false;
    }
  },

  // Test the SMASH button functionality
  async testSmashButton() {
    console.log('🧪 Testing SMASH button...');
    
    const smashButton = document.querySelector('button[style*="SMASH"], button:contains("SMASH")');
    if (smashButton) {
      console.log('✅ Found SMASH button');
      console.log('🔄 Button disabled?', smashButton.disabled);
      return true;
    } else {
      console.log('❌ Could not find SMASH button');
      return false;
    }
  },

  // Overall integration test
  async runFullTest() {
    console.log('🧪 Running full AI integration test...');
    console.log('==========================================');
    
    const results = {
      endpoints: await this.testEndpoints(),
      appIntegration: await this.testAppIntegration(),
      smashButton: await this.testSmashButton()
    };
    
    console.log('📊 Test Results Summary:');
    console.log('- Endpoints:', results.endpoints.error ? '❌' : '✅');
    console.log('- App Integration:', results.appIntegration ? '✅' : '❌');
    console.log('- SMASH Button:', results.smashButton ? '✅' : '❌');
    
    if (results.endpoints.error) {
      console.log('🔧 Endpoint issues detected. Check server logs.');
    }
    
    if (!results.appIntegration) {
      console.log('🔧 App integration issues. Check component props.');
    }
    
    return results;
  }
};

// Sample text for testing extraction
export const sampleAIResponse = `I'd be happy to help you create a comprehensive weekly meal plan! Here's a balanced approach:

**WEEKLY MEAL PLAN**

**Monday - Mediterranean Monday**
• Breakfast: Greek yogurt parfait with berries
• Lunch: Quinoa tabbouleh with grilled chicken
• Dinner: Baked salmon with roasted vegetables

**COMPLETE SHOPPING LIST:**

**Proteins:**
• 2 lbs salmon fillet
• 2 lbs boneless chicken breast  
• 1 lb lean ground beef
• 1 dozen eggs
• 1 container Greek yogurt (32oz)

**Fresh Produce:**
• 2 cups mixed berries
• 4 bananas
• 2 avocados
• 1 bag spinach (5oz)
• 2 bell peppers
• 1 large onion
• 3 cloves garlic

**Pantry Staples:**
• 2 cups quinoa
• 2 cups brown rice
• 1 container rolled oats
• 2 tbsp olive oil
• 1 loaf whole grain bread

This plan provides balanced nutrition throughout the week.`;

// Add to window for easy access in browser console
if (typeof window !== 'undefined') {
  window.debugAI = debugAI;
  window.sampleAIResponse = sampleAIResponse;
  
  console.log('🛠️ Debug tools loaded! Try:');
  console.log('- debugAI.runFullTest()');
  console.log('- debugAI.testExtraction(sampleAIResponse)');
  console.log('- debugAI.testEndpoints()');
}