// client/src/components/SmartAIAssistant.js - ENHANCED VERSION with Recipe Preservation
import React, { useState, useRef, useEffect } from 'react';

function SmartAIAssistant({ onGroceryListGenerated, onRecipeGenerated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude');
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  
  // ✅ NEW: Recipe preservation and ingredient choice
  const [ingredientChoice, setIngredientChoice] = useState('basic'); // 'basic' or 'homemade'
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [showRecipeManager, setShowRecipeManager] = useState(false);
  
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

  useEffect(() => {
    // Load saved recipes from localStorage
    const saved = localStorage.getItem('cart-smash-recipes');
    if (saved) {
      try {
        setSavedRecipes(JSON.parse(saved));
      } catch (error) {
        console.warn('Failed to load saved recipes:', error);
      }
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ✅ ENHANCED: Better quantity parsing for fractions
  const parseQuantity = (text) => {
    // Handle fractions like "1 /4", "1/4", "2 1/2", etc.
    const fractionPatterns = [
      /(\d+)\s*\/\s*(\d+)/g,           // "1/4" or "1 / 4"
      /(\d+)\s+(\d+)\s*\/\s*(\d+)/g    // "2 1/4" or "2 1 / 4"
    ];

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
      /serves/i, /calories/i, /prep time/i, /cook time/i, /total:/i
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
      const bulletMatch = line.match(/^[•\-\*\d+\.\)\s]*(.+)$/);
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

  // ✅ NEW: Extract recipe information
  const extractRecipeInfo = (text) => {
    console.log('📝 Extracting recipe information...');
    
    const recipeInfo = {
      title: '',
      ingredients: [],
      instructions: [],
      servings: '',
      prepTime: '',
      cookTime: '',
      fullText: text
    };

    const lines = text.split('\n');
    let currentSection = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) continue;
      
      // Detect sections
      if (line.match(/^\*\*.*\*\*$/) || line.match(/^#{1,6}\s/)) {
        const cleanLine = line.replace(/[\*#]/g, '').trim();
        if (cleanLine.toLowerCase().includes('ingredient')) {
          currentSection = 'ingredients';
        } else if (cleanLine.toLowerCase().includes('instruction') || 
                   cleanLine.toLowerCase().includes('direction') ||
                   cleanLine.toLowerCase().includes('step')) {
          currentSection = 'instructions';
        } else if (cleanLine.toLowerCase().includes('recipe') && !recipeInfo.title) {
          recipeInfo.title = cleanLine;
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
      const bulletMatch = line.match(/^[•\-\*\d+\.\)\s]*(.+)$/);
      if (bulletMatch && currentSection) {
        const content = bulletMatch[1].trim();
        if (currentSection === 'ingredients') {
          recipeInfo.ingredients.push(content);
        } else if (currentSection === 'instructions') {
          recipeInfo.instructions.push(content);
        }
      }
    }
    
    console.log('✅ Extracted recipe info:', recipeInfo.title);
    return recipeInfo;
  };

  // ✅ NEW: Save recipe information
  const saveRecipe = (recipeInfo) => {
    const newRecipe = {
      id: Date.now().toString(),
      title: recipeInfo.title || `Recipe ${new Date().toLocaleDateString()}`,
      ...recipeInfo,
      savedAt: new Date().toISOString(),
      ingredientChoice: ingredientChoice
    };
    
    const updatedRecipes = [...savedRecipes, newRecipe];
    setSavedRecipes(updatedRecipes);
    
    try {
      localStorage.setItem('cart-smash-recipes', JSON.stringify(updatedRecipes));
      console.log('✅ Recipe saved:', newRecipe.title);
    } catch (error) {
      console.error('❌ Failed to save recipe:', error);
    }
    
    // Notify parent component if provided
    if (onRecipeGenerated) {
      onRecipeGenerated(newRecipe);
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

INGREDIENT PREFERENCE: ${ingredientChoice === 'basic' ? 'Use BASIC/STORE-BOUGHT ingredients when possible (pre-made sauces, rotisserie chicken, pre-washed vegetables, etc.). Minimize prep time.' : 'Use HOMEMADE/FROM-SCRATCH ingredients. Include individual spices, base ingredients, and detailed preparation steps.'}`;
      
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
      
      // ✅ NEW: Extract and save recipe information
      if (aiResponseText.length > 200) { // Only extract recipes from substantial responses
        recipeInfo = extractRecipeInfo(aiResponseText);
        if (recipeInfo.ingredients.length > 0 || recipeInfo.instructions.length > 0) {
          saveRecipe(recipeInfo);
        }
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

      // ✅ ENHANCED: Auto-offer to add grocery items and save recipe
      if (extractedItems && extractedItems.length > 0) {
        console.log(`🛒 Found ${extractedItems.length} grocery items, offering to add to cart...`);
        setTimeout(() => {
          let confirmMessage = `Found ${extractedItems.length} grocery items!`;
          
          if (recipeInfo && (recipeInfo.ingredients.length > 0 || recipeInfo.instructions.length > 0)) {
            confirmMessage += `\n\n✅ Recipe saved for future reference!\n🍳 "${recipeInfo.title}"`;
          }
          
          confirmMessage += `\n\nAdd grocery items to your cart?\n\nFirst few items:\n${extractedItems.slice(0, 3).map(item => `• ${item}`).join('\n')}${extractedItems.length > 3 ? '\n...and more' : ''}`;
          
          if (window.confirm(confirmMessage)) {
            // Format the items properly for the main form
            const formattedList = extractedItems.join('\n');
            console.log('📝 Sending grocery list to main form:', formattedList);
            
            onGroceryListGenerated(formattedList);
            setIsOpen(false);
          }
        }, 1000);
      } else {
        console.log('⚠️ No grocery items found in AI response');
      }

    } catch (error) {
      console.error('🚨 AI request failed:', error);
      
      // ✅ ENHANCED: Better fallback with ingredient choice consideration
      const fallbackResponse = generateFallbackResponse(message, ingredientChoice);
      
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

  // ✅ ENHANCED: Better fallback response generation with ingredient choice
  const generateFallbackResponse = (prompt, ingredientChoice) => {
    console.log('🔄 Generating fallback response for:', prompt.substring(0, 50));
    
    let groceryItems = [];
    let response = '';
    const isBasic = ingredientChoice === 'basic';

    if (prompt.toLowerCase().includes('meal plan') || prompt.toLowerCase().includes('weekly')) {
      groceryItems = isBasic ? [
        '1 rotisserie chicken',
        '2 bags pre-washed salad mix',
        '1 bottle Italian dressing', 
        '1 bag frozen mixed vegetables',
        '2 boxes instant rice',
        '1 jar pasta sauce',
        '2 lbs ground turkey',
        '1 package taco seasoning',
        '8 flour tortillas',
        '1 container Greek yogurt (32oz)',
        '1 dozen eggs',
        '1 gallon milk',
        '1 loaf whole grain bread',
        '1 jar peanut butter'
      ] : [
        '3 lbs chicken breast',
        '2 heads romaine lettuce',
        '3 bell peppers',
        '2 large onions',
        '4 cloves garlic',
        '1 bottle olive oil',
        '2 cups quinoa', 
        '1 lb ground turkey',
        '2 cans black beans',
        '1 container Greek yogurt (32oz)',
        '1 dozen eggs',
        '1 gallon milk',
        '2 lbs sweet potatoes'
      ];

      response = `Here's a ${isBasic ? 'convenient' : 'from-scratch'} weekly meal plan with shopping list:

**WEEKLY MEAL PLAN (${ingredientChoice.toUpperCase()} INGREDIENTS)**

**Monday**: ${isBasic ? 'Rotisserie chicken salad with bagged greens' : 'Grilled chicken breast with homemade quinoa salad'}
**Tuesday**: ${isBasic ? 'Ground turkey tacos with seasoning packet' : 'Seasoned ground turkey tacos with fresh spices'}  
**Wednesday**: ${isBasic ? 'Frozen veggie stir-fry over instant rice' : 'Fresh vegetable stir-fry with brown rice'}
**Thursday**: ${isBasic ? 'Greek yogurt parfait with granola' : 'Homemade Greek yogurt bowl with fresh fruit'}
**Friday**: ${isBasic ? 'Pasta with jar sauce' : 'Fresh pasta with homemade tomato sauce'}

**SHOPPING LIST (${ingredientChoice.toUpperCase()} APPROACH):**
${groceryItems.map(item => `• ${item}`).join('\n')}

This plan ${isBasic ? 'minimizes prep time with convenient options' : 'uses fresh ingredients for maximum nutrition and flavor'}.`;

    } else if (prompt.toLowerCase().includes('budget')) {
      groceryItems = isBasic ? [
        '1 whole rotisserie chicken',
        '2 dozen eggs',
        '1 5lb bag potatoes',
        '2 lb bag carrots',
        '1 bag yellow onions',
        '5 lbs rice',
        '2 lbs pasta',
        '2 jars pasta sauce',
        '1 large container oats',
        '1 jar peanut butter',
        '1 gallon milk',
        '2 loaves bread'
      ] : [
        '1 whole chicken',
        '2 dozen eggs',
        '1 lb dried black beans',
        '5 lb bag potatoes',
        '2 lb bag carrots',
        '1 bag yellow onions',
        '5 lbs rice',
        '2 lbs pasta',
        '2 cans crushed tomatoes',
        '1 container oats',
        '1 jar natural peanut butter',
        '1 gallon milk'
      ];

      response = `Budget-friendly grocery plan (${ingredientChoice.toUpperCase()} approach):

**BUDGET GROCERIES ($75 total)**

${groceryItems.map(item => `• ${item}`).join('\n')}

This plan ${isBasic ? 'maximizes convenience while staying budget-friendly' : 'uses basic ingredients you can transform into many meals'}.`;

    } else {
      // Default response
      groceryItems = isBasic ? [
        '1 rotisserie chicken',
        '1 bag mixed vegetables',
        '3 pieces fruit',
        '1 dozen eggs',
        '1 gallon milk',
        '2 cups instant rice',
        '1 loaf bread',
        '1 bottle olive oil'
      ] : [
        '2 lbs chicken breast',
        '1 bag mixed vegetables',
        '3 pieces fruit',
        '1 dozen eggs',
        '1 gallon milk',
        '2 cups brown rice',
        '1 loaf bread',
        '1 bottle olive oil'
      ];

      response = `Here's a ${isBasic ? 'convenient' : 'homemade'} grocery list based on your request:

**ESSENTIAL GROCERIES (${ingredientChoice.toUpperCase()}):**

${groceryItems.map(item => `• ${item}`).join('\n')}

This covers basic nutrition needs with ${isBasic ? 'minimal prep required' : 'flexibility for scratch cooking'}.`;
    }

    return { content: response, groceryList: groceryItems };
  };

  const handleQuickPrompt = (prompt) => {
    handleSendMessage(prompt.prompt);
  };

  const clearChat = () => {
    setMessages([]);
    setShowQuickPrompts(true);
  };

  const selectedModelData = aiModels[selectedModel];

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '70px',
          height: '70px',
          backgroundColor: selectedModelData.color,
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 1000,
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        }}
      >
        {selectedModelData.icon}
      </button>

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
                
                {/* ✅ NEW: Recipe Manager Button */}
                <button
                  onClick={() => setShowRecipeManager(true)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  title="View saved recipes"
                >
                  📝 Recipes ({savedRecipes.length})
                </button>
                
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
                        
                        <div style={{
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.5',
                          fontSize: '14px'
                        }}>
                          {message.content}
                        </div>
                        
                        {/* ✅ ENHANCED: Show both grocery list and recipe info */}
                        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {message.recipeInfo && (message.recipeInfo.ingredients.length > 0 || message.recipeInfo.instructions.length > 0) && (
                            <div style={{
                              fontSize: '12px',
                              color: '#666',
                              backgroundColor: '#f0f9ff',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #bfdbfe'
                            }}>
                              ✅ Recipe saved: "{message.recipeInfo.title}"
                              <br />
                              📝 {message.recipeInfo.ingredients.length} ingredients, {message.recipeInfo.instructions.length} steps
                            </div>
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
                        gap: '10px'
                      }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          border: `3px solid ${selectedModelData.color}`,
                          borderTop: '3px solid transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        <span style={{ color: '#666' }}>
                          {selectedModelData.name.split(' ')[0]} is thinking...
                        </span>
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
                    minWidth: '80px',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  {isLoading ? '...' : '🚀 Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Recipe Manager Modal */}
      {showRecipeManager && (
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
              {savedRecipes.length === 0 ? (
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
                              localStorage.setItem('cart-smash-recipes', JSON.stringify(updatedRecipes));
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

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
}

export default SmartAIAssistant;