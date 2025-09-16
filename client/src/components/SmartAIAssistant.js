// client/src/components/SmartAIAssistant.js - ENHANCED VERSION with Loading States
import React, { useState, useRef, useEffect } from 'react';
import LoadingSpinner, { ButtonSpinner } from './LoadingSpinner';

function SmartAIAssistant({ onGroceryListGenerated, onRecipeGenerated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude');
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  
  // ✅ NEW: Recipe preservation and ingredient choice
  const [ingredientChoice, setIngredientChoice] = useState('basic'); // 'basic' or 'homemade'
  
  const messagesEndRef = useRef(null);

  const aiModels = {
    claude: {
      name: 'Claude (Anthropic)',
      icon: '🧠',
      color: '#D97706',
      description: 'Best for detailed meal planning and nutrition',
      endpoint: '/api/ai/claude'
    },
    chatgpt: {
      name: 'ChatGPT (OpenAI)',
      icon: '🤖',
      color: '#059669',
      description: 'Great for quick lists and budget planning',
      endpoint: '/api/ai/chatgpt'
    }
  };

  // ✅ ENHANCED: Quick prompts with ingredient choice context
  const quickPrompts = [
    {
      icon: '📅',
      title: 'Weekly Meal Plan',
      prompt: `Create a healthy 7-day meal plan with complete grocery shopping list for a family of 4. Include breakfast, lunch, dinner, and snacks. 

IMPORTANT: I prefer ${ingredientChoice === 'basic' ? 'BASIC/STORE-BOUGHT ingredients (pre-made sauces, store-bought items, minimal prep)' : 'HOMEMADE/FROM-SCRATCH ingredients (individual spices, base ingredients, more prep)'}.

Please provide:
1. The meal plan with recipe instructions
2. A clean grocery list with each item on a separate line
3. Include quantity and measurements for each ingredient`,
      category: 'planning'
    },
    {
      icon: '💰',
      title: 'Budget Shopping',
      prompt: `Create a budget-friendly grocery list for $75 per week for 2 people. Focus on nutritious, filling meals using ${ingredientChoice === 'basic' ? 'convenient store-bought ingredients' : 'homemade ingredients from scratch'}.

Please provide both the meal ideas with recipes AND the grocery list formatted as individual items, one per line.`,
      category: 'budget'
    },
    {
      icon: '⚡',
      title: 'Quick Dinners',
      prompt: `Give me 5 quick 30-minute dinner recipes using ${ingredientChoice === 'basic' ? 'basic store-bought ingredients (sauces, pre-made items)' : 'homemade ingredients from scratch'}. Family-friendly options please. 

Provide the complete recipes with instructions AND just the grocery list at the end, one item per line.`,
      category: 'quick'
    },
    {
      icon: '🌱',
      title: 'Healthy Options',
      prompt: `Create a clean eating grocery list and meal plan focused on whole foods, lean proteins, and fresh vegetables for one week. Use ${ingredientChoice === 'basic' ? 'convenient healthy options (pre-washed salads, rotisserie chicken, etc.)' : 'completely from-scratch preparation'}.

Include both recipes with instructions and a grocery list with each item on a separate line.`,
      category: 'health'
    },
    {
      icon: '🎉',
      title: 'Party Planning',
      prompt: `Plan a birthday party for 15 people with appetizers, main course, and desserts using ${ingredientChoice === 'basic' ? 'store-bought and easy-prep items' : 'homemade from-scratch recipes'}. 

Include complete recipes with instructions and shopping list with each item on a separate line.`,
      category: 'party'
    },
    {
      icon: '🥗',
      title: 'Special Diet',
      prompt: `Create a keto-friendly grocery list and meal plan for one week using ${ingredientChoice === 'basic' ? 'convenient keto products and pre-made items' : 'homemade keto recipes from scratch'}.

Provide recipes with instructions and list each grocery item on a separate line.`,
      category: 'diet'
    }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ✅ REMOVED: No more localStorage loading - recipes managed by parent component only

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ✅ ENHANCED: Better quantity parsing for fractions
  const parseQuantity = (text) => {
    // Handle fractions like "1 /4", "1/4", "2 1/2", etc.

    let cleanedText = text;
    
    // Handle mixed numbers like "2 1/4"
    cleanedText = cleanedText.replace(/(\d+)\s+(\d+)\s*\/\s*(\d+)/g, (match, whole, num, den) => {
      const wholeNum = parseInt(whole);
      const fraction = parseInt(num) / parseInt(den);
      const total = wholeNum + fraction;
      return total.toString();
    });
    
    // Handle simple fractions like "1/4" or "1 /4"
    cleanedText = cleanedText.replace(/(\d+)\s*\/\s*(\d+)/g, (match, num, den) => {
      const fraction = parseInt(num) / parseInt(den);
      return fraction.toString();
    });

    return cleanedText;
  };

  // ✅ ENHANCED: Improved grocery list extraction with better quantity parsing
  const extractGroceryItems = (text) => {
    console.log('🔍 Extracting grocery items from AI response...');
    
    const lines = text.split('\n');
    const groceryItems = [];
    let inGrocerySection = false;
    
    // Keywords that indicate grocery list sections
    const groceryHeaders = ['shopping list', 'grocery list', 'ingredients needed', 'ingredients', 'you need', 'buy', 'purchase'];
    const excludePatterns = [
      /recipe/i, /instructions/i, /directions/i, /steps/i, /method/i,
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
      /breakfast|lunch|dinner|snack/i, /day \d+/i, /week \d+/i,
      /serves/i, /calories/i, /prep time/i, /cook time/i, /total:/i,
      /^for delicious/i, /^here's a/i, /^these quantities/i, /should serve/i,
      /^perfect for/i, /^great for/i, /^ideal for/i, /people\./i,
      /^this will/i, /^you can/i, /^feel free/i, /^don't forget/i,
      /^make sure/i, /^remember to/i, /^note:/i, /^tip:/i
    ];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check if we're entering a grocery list section
      if (groceryHeaders.some(header => line.toLowerCase().includes(header))) {
        inGrocerySection = true;
        continue;
      }
      
      // If we hit a new section header, we might be leaving grocery section
      if (line.match(/^\*\*[^*]+\*\*$/) || line.match(/^#{1,6}\s/)) {
        if (!groceryHeaders.some(header => line.toLowerCase().includes(header))) {
          inGrocerySection = false;
        }
        continue;
      }
      
      // Look for bullet points, numbers, or dashes (grocery list items)
      const bulletMatch = line.match(/^[•\-*\d+.)\s]*(.+)$/);
      if (bulletMatch) {
        let cleanedItem = bulletMatch[1].trim();
        
        // Remove markdown formatting
        cleanedItem = cleanedItem.replace(/\*\*/g, '').replace(/\*/g, '');
        
        // ✅ FIX: Parse quantities better
        cleanedItem = parseQuantity(cleanedItem);
        
        // Skip if it matches exclude patterns
        if (excludePatterns.some(pattern => pattern.test(cleanedItem))) {
          continue;
        }
        
        // Skip if it's too short or looks like a header
        if (cleanedItem.length < 3 || cleanedItem.endsWith(':')) {
          continue;
        }
        
        // Skip if it contains cooking instructions
        if (cleanedItem.toLowerCase().includes('cook') || 
            cleanedItem.toLowerCase().includes('bake') ||
            cleanedItem.toLowerCase().includes('heat') ||
            cleanedItem.toLowerCase().includes('serve')) {
          continue;
        }
        
        // Check if it looks like a grocery item
        const hasQuantity = /^\d+/.test(cleanedItem) || 
                           cleanedItem.match(/\b\d+\s*(lb|lbs|oz|cup|cups|tbsp|tsp|clove|cloves|bunch|bag|container|jar|can|bottle|loaf|dozen|pack)\b/i);
        
        const hasCommonFood = /\b(chicken|beef|pork|fish|salmon|turkey|eggs|milk|cheese|bread|rice|pasta|oil|onion|garlic|tomato|potato|apple|banana|spinach|lettuce|yogurt|butter|flour|sugar|salt|pepper|beans|lentils|quinoa|oats|carrot|broccoli|avocado|strawberry|blueberry|sauce|spice)\b/i.test(cleanedItem);
        
        // If we're in a grocery section OR it has quantity OR it's a common food, include it
        if (inGrocerySection || hasQuantity || hasCommonFood) {
          if (!groceryItems.includes(cleanedItem)) {
            groceryItems.push(cleanedItem);
          }
        }
      }
    }
    
    console.log(`✅ Extracted ${groceryItems.length} grocery items:`, groceryItems.slice(0, 5));
    return groceryItems;
  };

  // ✅ ENHANCED: Extract multiple recipes from meal plan responses
  const extractRecipeInfo = (text) => {
    console.log('🔍 Extracting recipe(s) from AI response...');
    
    // Check if this looks like a meal plan with multiple recipes
    const isMealPlan = /day \d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|breakfast|lunch|dinner|meal \d+/i.test(text);
    
    if (isMealPlan) {
      console.log('📅 Detected meal plan format - extracting multiple recipes');
      return extractMealPlanRecipes(text);
    } else {
      console.log('📖 Detected single recipe format');
      return extractSingleRecipe(text);
    }
  };

  // Extract multiple recipes from a meal plan
  const extractMealPlanRecipes = (text) => {
    const recipes = [];
    const lines = text.split('\n');
    let currentDay = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Detect day headers: "Day 1 (Monday):" or "Day 1:"
      const dayMatch = line.match(/^Day\s+(\d+)\s*(?:\(([^)]+)\))?:?/i);
      if (dayMatch) {
        currentDay = `Day ${dayMatch[1]}`;
        if (dayMatch[2]) {
          currentDay += ` (${dayMatch[2]})`;
        }
        console.log('📅 Found day header:', currentDay);
        continue;
      }
      
      // Detect individual meal items: "- Breakfast: Oatmeal with berries and honey"
      const mealMatch = line.match(/^[-*•]\s*(Breakfast|Lunch|Dinner|Snack[s]?):\s*(.+)$/i);
      if (mealMatch) {
        const mealType = mealMatch[1];
        const recipeName = mealMatch[2].trim();
        
        // Create a recipe for this meal
        const recipe = {
          title: recipeName,
          ingredients: [recipeName], // Use the meal description as a basic ingredient
          instructions: [`Prepare ${recipeName.toLowerCase()}`],
          servings: '4 people',
          prepTime: '15-30 minutes',
          cookTime: 'Varies',
          mealType: mealType,
          day: currentDay,
          id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        recipes.push(recipe);
        console.log('🍽️ Found meal:', `${currentDay} ${mealType}: ${recipeName}`);
        continue;
      }
      
      // Legacy support for other formats
      const legacyMealMatch = line.match(/(day \d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday).*?(breakfast|lunch|dinner|snack)/i);
      const recipeMatch = line.match(/^[*#-]*\s*(.+?)(recipe|:|[*][*])/i);
      
      if (legacyMealMatch || (recipeMatch && line.length < 60)) {
        let recipeName = legacyMealMatch ? `${legacyMealMatch[1]} ${legacyMealMatch[2]}` : recipeMatch[1];
        recipeName = recipeName.replace(/[*#:-]/g, '').trim();
        
        const recipe = {
          title: recipeName,
          ingredients: [recipeName],
          instructions: [`Prepare ${recipeName.toLowerCase()}`],
          servings: '4 people',
          prepTime: '15-30 minutes',
          cookTime: 'Varies',
          mealType: legacyMealMatch ? legacyMealMatch[2] : 'meal',
          day: legacyMealMatch ? legacyMealMatch[1] : currentDay,
          id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        recipes.push(recipe);
        console.log('📍 Found legacy recipe:', recipeName);
        continue;
      }
    }
    
    console.log(`✅ Meal plan extraction complete: Found ${recipes.length} recipes`);
    
    // Return in meal plan format
    return {
      isMealPlan: true,
      recipes: recipes,
      totalRecipes: recipes.length
    };
  };

  // Extract single recipe (existing logic)
  const extractSingleRecipe = (text) => {
    const recipeInfo = {
      title: '',
      ingredients: [],
      instructions: [],
      servings: '',
      prepTime: '',
      cookTime: '',
      fullText: text,
      isMealPlan: false
    };

    const lines = text.split('\n');
    let currentSection = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Detect headers
      if (line.match(/^#{1,6}\s/) || line.match(/^\*\*.*\*\*$/) || line.includes('**')) {
        const headerText = line.toLowerCase();
        
        if (headerText.includes('ingredient') || headerText.includes('what you need')) {
          currentSection = 'ingredients';
        } else if (headerText.includes('instruction') || headerText.includes('method') || headerText.includes('steps') || headerText.includes('directions')) {
          currentSection = 'instructions';
        } else if (headerText.includes('recipe') && !recipeInfo.title) {
          recipeInfo.title = line.replace(/[*#:]/g, '').trim();
        } else {
          currentSection = null;
        }
        continue;
      }
      
      // Extract recipe metadata
      if (line.toLowerCase().includes('serves') || line.toLowerCase().includes('serving')) {
        recipeInfo.servings = line;
      } else if (line.toLowerCase().includes('prep time')) {
        recipeInfo.prepTime = line;
      } else if (line.toLowerCase().includes('cook time')) {
        recipeInfo.cookTime = line;
      }
      
      // Extract ingredients and instructions
      const bulletMatch = line.match(/^[•*-]\s*(.+)$/) || line.match(/^\d+[.)]\s*(.+)$/);
      if (bulletMatch && currentSection) {
        const content = bulletMatch[1].trim();
        if (currentSection === 'ingredients' && content.length > 2) {
          recipeInfo.ingredients.push(content);
        } else if (currentSection === 'instructions' && content.length > 5) {
          recipeInfo.instructions.push(content);
        }
      }
    }
    
    // Try to extract title from first meaningful line if none found
    if (!recipeInfo.title && lines.length > 0) {
      const firstLine = lines.find(line => line.trim().length > 5);
      if (firstLine) {
        recipeInfo.title = firstLine.trim().substring(0, 100);
      }
    }
    
    console.log(`✅ Single recipe extraction complete: "${recipeInfo.title}" with ${recipeInfo.ingredients.length} ingredients, ${recipeInfo.instructions.length} instructions`);
    return recipeInfo;
  };

  // ✅ SIMPLIFIED: Always delegate recipe saving to parent component
  const saveRecipe = (recipeInfo) => {
    const newRecipe = {
      id: Date.now().toString(),
      title: recipeInfo.title || `Recipe ${new Date().toLocaleDateString()}`,
      ...recipeInfo,
      savedAt: new Date().toISOString(),
      ingredientChoice: ingredientChoice
    };
    
    // Always delegate to parent component for proper Firestore/state management
    if (onRecipeGenerated) {
      onRecipeGenerated(newRecipe);
      console.log('✅ Recipe delegated to parent component:', newRecipe.title);
    } else {
      console.warn('⚠️ No onRecipeGenerated callback provided - recipe not saved');
    }
  };

  const handleSendMessage = async (message = inputText) => {
    if (!message.trim() || isLoading) return;

    const userMessage = { 
      role: 'user', 
      content: message, 
      timestamp: new Date() 
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setShowQuickPrompts(false);

    try {
      const selectedModelData = aiModels[selectedModel];
      console.log(`🤖 Sending request to ${selectedModelData.name}...`);
      
      // ✅ ENHANCED: Include ingredient choice in request
      const enhancedMessage = `${message}

INGREDIENT PREFERENCE: ${ingredientChoice === 'basic' ? 'Use BASIC/STORE-BOUGHT ingredients when possible (pre-made sauces, rotisserie chicken, pre-washed vegetables, etc.). Minimize prep time.' : 'Use HOMEMADE/FROM-SCRATCH ingredients. Include individual spices, base ingredients, and detailed preparation steps.'}

IMPORTANT FOR RECIPES: Provide DETAILED, step-by-step cooking instructions with:
- Specific temperatures (e.g., "375°F", "medium-high heat")
- Exact timing (e.g., "5-7 minutes until golden brown")
- Visual cues (e.g., "until fragrant and translucent")
- Equipment specifications (e.g., "12-inch skillet", "large heavy-bottomed pot")
- Professional techniques (e.g., "don't move for 4-6 minutes to develop sear")
- Minimum 6-8 detailed steps for complex dishes
- Each step should be comprehensive enough for a novice cook to follow successfully`;
      
      const response = await fetch(selectedModelData.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enhancedMessage,
          context: 'grocery_list_generation_with_recipes',
          ingredientChoice: ingredientChoice
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('🎯 AI Response received:', data);

      // ✅ ENHANCED: Extract both grocery items AND recipe information
      const aiResponseText = data.response || data.message || '';
      let extractedItems = [];
      let recipeInfo = null;
      
      // First try the server-provided grocery list
      if (data.groceryList && Array.isArray(data.groceryList) && data.groceryList.length > 0) {
        extractedItems = data.groceryList;
      } else {
        // If no grocery list provided, extract from the response text
        extractedItems = extractGroceryItems(aiResponseText);
      }
      
      // ✅ NEW: Extract recipe information (ask user before saving)
      if (aiResponseText.length > 200) { // Only extract recipes from substantial responses
        recipeInfo = extractRecipeInfo(aiResponseText);
      }
      
      const aiMessage = {
        role: 'assistant',
        content: aiResponseText,
        timestamp: new Date(),
        model: selectedModel,
        groceryList: extractedItems,
        recipeInfo: recipeInfo,
        ingredientChoice: ingredientChoice,
        isFallback: data.fallback || false
      };

      setMessages(prev => [...prev, aiMessage]);

      // ✅ ENHANCED: Auto-offer to add grocery items and ask to save recipe
      setTimeout(() => {
        // First, ask about saving recipe if one was detected (only for single recipes, not meal plans)
        if (recipeInfo && !recipeInfo.isMealPlan && (recipeInfo.ingredients.length > 0 || recipeInfo.instructions.length > 0)) {
          if (window.confirm(`📖 Recipe detected: "${recipeInfo.title}"\n\nWould you like to save this recipe for future use?`)) {
            saveRecipe(recipeInfo);
            console.log('✅ Recipe saved:', recipeInfo.title);
          }
        }
        
        // For meal plans, let the user save individual recipes via the UI buttons
        if (recipeInfo && recipeInfo.isMealPlan) {
          console.log(`✅ Meal plan detected with ${recipeInfo.recipes.length} recipes - use individual save buttons`);
        }
        
        // Then, ask about adding grocery items if found
        if (extractedItems && extractedItems.length > 0) {
          console.log(`🛒 Found ${extractedItems.length} grocery items, offering to add to cart...`);
          let confirmMessage = `Found ${extractedItems.length} grocery items!\n\nAdd them to your cart?\n\nFirst few items:\n${extractedItems.slice(0, 3).map(item => `• ${item}`).join('\n')}${extractedItems.length > 3 ? '\n...and more' : ''}`;
          
          if (window.confirm(confirmMessage)) {
            // Format the items properly for the main form
            const formattedList = extractedItems.join('\n');
            console.log('📝 Sending grocery list to main form:', formattedList);
            
            onGroceryListGenerated(formattedList);
            setIsOpen(false);
          }
        }
      }, 1000);

    } catch (error) {
      console.error('🚨 AI request failed:', error);
      
      // ✅ ENHANCED: Simple error fallback - AI should be primary
      const fallbackResponse = {
        content: `⚠️ AI service temporarily unavailable. Please try again in a moment.\n\nError: ${error.message}`,
        groceryList: []
      };
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: fallbackResponse.content,
        timestamp: new Date(),
        model: selectedModel,
        groceryList: fallbackResponse.groceryList,
        ingredientChoice: ingredientChoice,
        isFallback: true,
        error: true
      }]);

      if (fallbackResponse.groceryList.length > 0) {
        setTimeout(() => {
          if (window.confirm(`Found ${fallbackResponse.groceryList.length} grocery items! Add them to your cart?`)) {
            onGroceryListGenerated(fallbackResponse.groceryList.join('\n'));
            setIsOpen(false);
          }
        }, 1000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Removed generateFallbackResponse - AI should be the primary service

  const handleQuickPrompt = (prompt) => {
    handleSendMessage(prompt.prompt);
  };

  const clearChat = () => {
    setMessages([]);
    setShowQuickPrompts(true);
  };

  const selectedModelData = aiModels[selectedModel];

  // Create fun loading animation keyframes
  const loadingStyle = `
    @keyframes cartSmashThinking {
      0%, 100% { transform: rotate(0deg) scale(1); }
      25% { transform: rotate(-5deg) scale(1.05); }
      50% { transform: rotate(5deg) scale(1.1); }
      75% { transform: rotate(-3deg) scale(1.05); }
    }
    
    @keyframes groceryFloat {
      0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.8; }
      33% { transform: translateY(-8px) rotate(120deg); opacity: 1; }
      66% { transform: translateY(-4px) rotate(240deg); opacity: 0.9; }
    }
    
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 4px 20px rgba(255, 107, 53, 0.4); }
      50% { box-shadow: 0 8px 30px rgba(247, 147, 30, 0.7); }
    }
  `;

  return (
    <>
      {/* Add CSS animations */}
      <style>{loadingStyle}</style>
      
      {/* Floating Action Button */}
      <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000 }}>
        <button
          onClick={() => setIsOpen(true)}
          disabled={isLoading}
          style={{
            width: '70px',
            height: '70px',
            backgroundColor: isLoading ? '#FF6B35' : selectedModelData.color,
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            fontSize: isLoading ? '20px' : '24px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            boxShadow: isLoading ? '0 8px 30px rgba(255, 107, 53, 0.6)' : '0 4px 20px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'visible',
            animation: isLoading ? 'cartSmashThinking 1.5s ease-in-out infinite, pulseGlow 2s ease-in-out infinite' : 'none'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.target.style.transform = 'scale(1.1)';
              e.target.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
            }
          }}
        >
          {isLoading ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Main cart icon */}
              🛒
              
              {/* Floating grocery items */}
              <div style={{
                position: 'absolute',
                top: '-25px',
                left: '10px',
                fontSize: '12px',
                animation: 'groceryFloat 2s ease-in-out infinite',
                animationDelay: '0s'
              }}>🥕</div>
              
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '8px',
                fontSize: '10px',
                animation: 'groceryFloat 2s ease-in-out infinite',
                animationDelay: '0.5s'
              }}>🍎</div>
              
              <div style={{
                position: 'absolute',
                bottom: '-25px',
                left: '12px',
                fontSize: '11px',
                animation: 'groceryFloat 2s ease-in-out infinite',
                animationDelay: '1s'
              }}>🥛</div>
              
              <div style={{
                position: 'absolute',
                bottom: '-20px',
                right: '10px',
                fontSize: '9px',
                animation: 'groceryFloat 2s ease-in-out infinite',
                animationDelay: '1.5s'
              }}>🍞</div>
            </div>
          ) : (
            selectedModelData.icon
          )}
        </button>
        
        {/* Loading text that appears below button when loading */}
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(255, 107, 53, 0.95)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            animation: 'pulseGlow 2s ease-in-out infinite'
          }}>
            🧠 AI is thinking...
          </div>
        )}
      </div>

      {/* AI Chat Modal */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '800px',
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 10px 50px rgba(0,0,0,0.3)'
          }}>
            {/* Enhanced Header with Ingredient Choice */}
            <div style={{
              background: `linear-gradient(135deg, ${selectedModelData.color}, ${selectedModelData.color}dd)`,
              color: 'white',
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px' }}>
                  {selectedModelData.icon} AI Grocery Assistant
                </h2>
                <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                  {selectedModelData.description}
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {/* ✅ NEW: Ingredient Choice Toggle */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <label style={{ fontSize: '11px', opacity: 0.9 }}>Ingredient Style</label>
                  <select
                    value={ingredientChoice}
                    onChange={(e) => setIngredientChoice(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="basic" style={{ color: 'black' }}>🏪 Basic/Store-bought</option>
                    <option value="homemade" style={{ color: 'black' }}>🏠 Homemade/Scratch</option>
                  </select>
                </div>
                
                {/* Model Selector */}
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {Object.entries(aiModels).map(([key, model]) => (
                    <option key={key} value={key} style={{ color: 'black' }}>
                      {model.icon} {model.name.split(' ')[0]}
                    </option>
                  ))}
                </select>
                
                {/* ✅ REMOVED: Recipe Manager Button - recipes now managed by parent component */}
                
                <button
                  onClick={clearChat}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🗑️ Clear
                </button>
                
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '18px'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              backgroundColor: '#f8f9fa'
            }}>
              {messages.length === 0 && showQuickPrompts ? (
                <div>
                  <h3 style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
                    🎯 What would you like help with?
                  </h3>
                  
                  {/* ✅ NEW: Ingredient Choice Display */}
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '30px',
                    padding: '15px',
                    backgroundColor: ingredientChoice === 'basic' ? '#e6f3ff' : '#fff4e6',
                    borderRadius: '10px',
                    border: `2px solid ${ingredientChoice === 'basic' ? '#3b82f6' : '#f59e0b'}`
                  }}>
                    <h4 style={{ 
                      margin: '0 0 8px 0', 
                      color: ingredientChoice === 'basic' ? '#1e40af' : '#92400e'
                    }}>
                      {ingredientChoice === 'basic' ? '🏪 Basic/Store-Bought Mode' : '🏠 Homemade/From-Scratch Mode'}
                    </h4>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '14px',
                      color: ingredientChoice === 'basic' ? '#3730a3' : '#78350f'
                    }}>
                      {ingredientChoice === 'basic' 
                        ? 'Recipes will use convenient, pre-made ingredients to minimize prep time'
                        : 'Recipes will use individual ingredients for homemade cooking from scratch'
                      }
                    </p>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '15px',
                    marginBottom: '30px'
                  }}>
                    {quickPrompts.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickPrompt(prompt)}
                        style={{
                          padding: '20px',
                          backgroundColor: 'white',
                          border: `2px solid ${selectedModelData.color}20`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.borderColor = selectedModelData.color;
                          e.target.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.borderColor = `${selectedModelData.color}20`;
                          e.target.style.transform = 'translateY(0px)';
                        }}
                      >
                        <div style={{
                          fontSize: '24px',
                          marginBottom: '10px'
                        }}>
                          {prompt.icon}
                        </div>
                        <h4 style={{
                          margin: '0 0 8px 0',
                          color: '#333',
                          fontSize: '16px'
                        }}>
                          {prompt.title}
                        </h4>
                        <p style={{
                          margin: 0,
                          color: '#666',
                          fontSize: '14px',
                          lineHeight: '1.4'
                        }}>
                          {prompt.prompt.substring(0, 100)}...
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      style={{
                        marginBottom: '20px',
                        display: 'flex',
                        justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div style={{
                        maxWidth: '70%',
                        padding: '15px 20px',
                        borderRadius: message.role === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                        backgroundColor: message.role === 'user' ? selectedModelData.color : 'white',
                        color: message.role === 'user' ? 'white' : '#333',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        position: 'relative'
                      }}>
                        {message.role === 'assistant' && (
                          <div style={{
                            fontSize: '12px',
                            color: '#666',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            flexWrap: 'wrap'
                          }}>
                            {aiModels[message.model]?.icon} {aiModels[message.model]?.name.split(' ')[0]}
                            {message.ingredientChoice && (
                              <span style={{
                                background: message.ingredientChoice === 'basic' ? '#3b82f6' : '#f59e0b',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px'
                              }}>
                                {message.ingredientChoice === 'basic' ? '🏪 Basic' : '🏠 Homemade'}
                              </span>
                            )}
                            {message.isFallback && (
                              <span style={{ 
                                background: '#ffc107', 
                                color: 'white', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                fontSize: '10px'
                              }}>
                                Demo Mode
                              </span>
                            )}
                            {message.error && (
                              <span style={{ 
                                background: '#dc3545', 
                                color: 'white', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                fontSize: '10px'
                              }}>
                                Error - Using Fallback
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* ✅ NEW: AI Conversation as editable text field */}
                        <div style={{ marginBottom: '15px' }}>
                          <textarea
                            value={message.content}
                            onChange={(e) => {
                              const updatedMessages = messages.map((msg, idx) => 
                                idx === index ? { ...msg, content: e.target.value } : msg
                              );
                              setMessages(updatedMessages);
                            }}
                            style={{
                              width: '100%',
                              minHeight: '150px',
                              padding: '12px',
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              fontSize: '14px',
                              lineHeight: '1.5',
                              fontFamily: 'inherit',
                              resize: 'vertical',
                              backgroundColor: message.role === 'assistant' ? '#f8f9fa' : 'white'
                            }}
                            placeholder="AI conversation content..."
                          />
                        </div>
                        
                        {/* ✅ ENHANCED: Show meal plan with multiple recipes or single recipe with save option */}
                        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {message.recipeInfo && message.recipeInfo.isMealPlan && message.recipeInfo.recipes && message.recipeInfo.recipes.length > 0 && (
                            <div style={{
                              fontSize: '12px',
                              color: '#666',
                              backgroundColor: '#f0f9ff',
                              padding: '12px',
                              borderRadius: '8px',
                              border: '1px solid #bfdbfe'
                            }}>
                              <div style={{ 
                                fontSize: '14px', 
                                fontWeight: 'bold', 
                                marginBottom: '10px',
                                color: '#1f2937'
                              }}>
                                🍽️ Meal Plan Detected ({message.recipeInfo.recipes.length} recipes)
                              </div>
                              {message.recipeInfo.recipes.map((recipe, index) => (
                                <div key={index} style={{
                                  backgroundColor: 'white',
                                  padding: '10px',
                                  marginBottom: '8px',
                                  borderRadius: '6px',
                                  border: '1px solid #e5e7eb',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '2px' }}>
                                      {recipe.title}
                                    </div>
                                    <div style={{ color: '#6b7280', fontSize: '11px' }}>
                                      📝 {recipe.ingredients?.length || 0} ingredients, {recipe.instructions?.length || 0} steps
                                      {recipe.day && <span> • {recipe.day}</span>}
                                      {recipe.mealType && <span> • {recipe.mealType}</span>}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const recipeData = {
                                        name: recipe.title,
                                        ingredients: recipe.ingredients?.join('\n') || '',
                                        instructions: recipe.instructions?.join('\n') || '',
                                        day: recipe.day,
                                        mealType: recipe.mealType,
                                        savedFrom: 'ai_meal_plan',
                                        timestamp: new Date().toISOString()
                                      };
                                      
                                      if (onRecipeGenerated) {
                                        onRecipeGenerated(recipeData);
                                      }
                                      
                                      alert(`✅ Recipe "${recipe.title}" saved to your account!`);
                                    }}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#FF6B35',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      marginLeft: '10px',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    📖 Save
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {message.recipeInfo && !message.recipeInfo.isMealPlan && (message.recipeInfo.ingredients.length > 0 || message.recipeInfo.instructions.length > 0) && (
                            <div style={{
                              fontSize: '12px',
                              color: '#666',
                              backgroundColor: '#f0f9ff',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #bfdbfe',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div>
                                ✅ Recipe detected: "{message.recipeInfo.title}"
                                <br />
                                📝 {message.recipeInfo.ingredients.length} ingredients, {message.recipeInfo.instructions.length} steps
                              </div>
                              <button
                                onClick={() => {
                                  const recipeData = {
                                    name: message.recipeInfo.title,
                                    ingredients: message.content, // Use the full editable content
                                    instructions: message.recipeInfo.instructions.join('\n'),
                                    savedFrom: 'ai_conversation',
                                    timestamp: new Date().toISOString()
                                  };
                                  
                                  if (onRecipeGenerated) {
                                    onRecipeGenerated(recipeData);
                                  }
                                  
                                  alert(`✅ Recipe "${message.recipeInfo.title}" saved to your account!`);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#FF6B35',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  marginLeft: '10px'
                                }}
                              >
                                📖 Save Recipe
                              </button>
                            </div>
                          )}
                          
                          {/* ✅ NEW: General save recipe option for any AI response */}
                          {message.role === 'assistant' && message.content.length > 100 && (
                            <button
                              onClick={() => {
                                const recipeTitle = message.content.split('\n').find(line => 
                                  line.toLowerCase().includes('recipe') || 
                                  line.toLowerCase().includes('meal') ||
                                  line.length > 20
                                )?.trim() || `Recipe from AI - ${new Date().toLocaleDateString()}`;
                                
                                const recipeData = {
                                  name: recipeTitle.substring(0, 100),
                                  ingredients: message.content,
                                  instructions: '',
                                  savedFrom: 'ai_conversation',
                                  timestamp: new Date().toISOString()
                                };
                                
                                if (onRecipeGenerated) {
                                  onRecipeGenerated(recipeData);
                                }
                                
                                alert(`✅ AI response saved as recipe: "${recipeTitle.substring(0, 50)}..."`);
                              }}
                              style={{
                                padding: '8px 12px',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}
                            >
                              💾 Save as Recipe
                            </button>
                          )}
                          
                          {message.groceryList && message.groceryList.length > 0 && (
                            <div>
                              <div style={{
                                fontSize: '12px',
                                color: '#666',
                                marginBottom: '8px'
                              }}>
                                ✅ Found {message.groceryList.length} grocery items
                              </div>
                              <button
                                onClick={() => {
                                  onGroceryListGenerated(message.groceryList.join('\n'));
                                  setIsOpen(false);
                                }}
                                style={{
                                  padding: '10px 15px',
                                  backgroundColor: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: 'bold'
                                }}
                              >
                                🛒 Add {message.groceryList.length} Items to Cart
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div style={{
                          fontSize: '10px',
                          color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : '#999',
                          marginTop: '8px'
                        }}>
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      marginBottom: '20px'
                    }}>
                      <div style={{
                        padding: '15px 20px',
                        borderRadius: '20px 20px 20px 5px',
                        backgroundColor: 'white',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        position: 'relative',
                        animation: 'pulseGlow 2s ease-in-out infinite'
                      }}>
                        {/* CartSmash thinking animation */}
                        <div style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '40px',
                          height: '40px',
                          animation: 'cartSmashThinking 1.5s ease-in-out infinite'
                        }}>
                          <div style={{ fontSize: '20px' }}>🛒</div>
                          
                          {/* Mini floating groceries around the cart */}
                          <div style={{
                            position: 'absolute',
                            top: '-8px',
                            left: '8px',
                            fontSize: '8px',
                            animation: 'groceryFloat 2s ease-in-out infinite',
                            animationDelay: '0s'
                          }}>🥕</div>
                          
                          <div style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '6px',
                            fontSize: '7px',
                            animation: 'groceryFloat 2s ease-in-out infinite',
                            animationDelay: '0.7s'
                          }}>🍎</div>
                          
                          <div style={{
                            position: 'absolute',
                            bottom: '-8px',
                            left: '6px',
                            fontSize: '8px',
                            animation: 'groceryFloat 2s ease-in-out infinite',
                            animationDelay: '1.4s'
                          }}>🥛</div>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#FF6B35'
                          }}>
                            {selectedModelData.name.split(' ')[0]} is thinking...
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#666',
                            fontStyle: 'italic'
                          }}>
                            🧠 Processing your grocery request
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{
              padding: '20px',
              borderTop: '1px solid #eee',
              backgroundColor: 'white'
            }}>
              <div style={{
                display: 'flex',
                gap: '15px',
                alignItems: 'flex-end'
              }}>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Ask for meal plans, recipes, or grocery lists... (${ingredientChoice === 'basic' ? 'Basic ingredients mode' : 'Homemade ingredients mode'})`}
                  style={{
                    flex: 1,
                    padding: '15px',
                    border: '2px solid #eee',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    resize: 'none',
                    minHeight: '60px',
                    maxHeight: '120px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = selectedModelData.color}
                  onBlur={(e) => e.target.style.borderColor = '#eee'}
                />
                
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isLoading}
                  style={{
                    padding: '15px 25px',
                    backgroundColor: !inputText.trim() || isLoading ? '#ccc' : selectedModelData.color,
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: !inputText.trim() || isLoading ? 'not-allowed' : 'pointer',
                    minWidth: '120px',
                    transition: 'background-color 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isLoading ? (
                    <>
                      <ButtonSpinner />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>🚀 Send</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ DISABLED: Recipe Manager Modal - recipes now managed by parent component */}
      {/* eslint-disable */}
      {false && false && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '15px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'hidden',
            boxShadow: '0 10px 50px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#333' }}>
                📝 Saved Recipes ({savedRecipes.length})
              </h3>
              <button
                onClick={() => setShowRecipeManager(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{
              padding: '20px',
              maxHeight: '60vh',
              overflowY: 'auto'
            }}>
              {loadingRecipes ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <LoadingSpinner text="Loading recipes..." />
                </div>
              ) : savedRecipes.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#666'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                  <h4>No saved recipes yet</h4>
                  <p>Create meal plans or recipes with the AI assistant to see them here!</p>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '15px'
                }}>
                  {savedRecipes.map((recipe) => (
                    <div key={recipe.id} style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '15px',
                      backgroundColor: '#f9fafb'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '10px'
                      }}>
                        <h4 style={{ margin: 0, color: '#1f2937' }}>
                          {recipe.title}
                        </h4>
                        <div style={{
                          display: 'flex',
                          gap: '5px',
                          alignItems: 'center'
                        }}>
                          <span style={{
                            fontSize: '12px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: recipe.ingredientChoice === 'basic' ? '#3b82f6' : '#f59e0b',
                            color: 'white'
                          }}>
                            {recipe.ingredientChoice === 'basic' ? '🏪 Basic' : '🏠 Homemade'}
                          </span>
                          <button
                            onClick={() => {
                              const updatedRecipes = savedRecipes.filter(r => r.id !== recipe.id);
                              setSavedRecipes(updatedRecipes);
                              
                            }}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div style={{
                        fontSize: '12px',
                        color: '#666',
                        marginBottom: '10px'
                      }}>
                        Saved {new Date(recipe.savedAt).toLocaleDateString()} • 
                        {recipe.ingredients.length} ingredients • 
                        {recipe.instructions.length} steps
                      </div>
                      
                      <div style={{
                        fontSize: '14px',
                        color: '#374151',
                        maxHeight: '100px',
                        overflow: 'hidden'
                      }}>
                        {recipe.fullText.substring(0, 200)}...
                      </div>
                      
                      <div style={{
                        marginTop: '10px',
                        display: 'flex',
                        gap: '10px'
                      }}>
                        <button
                          onClick={() => {
                            // Re-generate grocery list from this recipe
                            onGroceryListGenerated(recipe.ingredients.join('\n'));
                            setShowRecipeManager(false);
                            setIsOpen(false);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          🛒 Use Ingredients
                        </button>
                        
                        <button
                          onClick={() => {
                            // Copy recipe to clipboard
                            navigator.clipboard.writeText(recipe.fullText);
                            alert('Recipe copied to clipboard!');
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          📋 Copy Recipe
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SmartAIAssistant;