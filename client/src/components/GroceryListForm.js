// client/src/components/GroceryListForm.js - FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ParsedResultsDisplay from './ParsedResultsDisplay';
// eslint-disable-next-line no-unused-vars
import SmartAIAssistant from './SmartAIAssistant';
import ProductValidator from './ProductValidator';
import InstacartCheckoutFlow from './InstacartCheckoutFlow';
import { ButtonSpinner, OverlaySpinner, ProgressSpinner } from './LoadingSpinner';
import { useGroceryListAutoSave } from '../hooks/useAutoSave';
import confetti from 'canvas-confetti';

// Helper functions
// eslint-disable-next-line no-unused-vars
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

// Extract only grocery list items from AI response (not full meal plan)
function extractGroceryListOnly(text) {
  const lines = text.split('\n');
  const groceryItems = [];
  let inGrocerySection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    
    // Detect start of grocery list section
    if (lowerLine.includes('grocery list') || lowerLine.includes('shopping list') || 
        lowerLine === 'produce:' || lowerLine === 'proteins & dairy:' ||
        lowerLine === 'grains & bakery:' || lowerLine === 'pantry:') {
      inGrocerySection = true;
      if (lowerLine.includes('grocery list') || lowerLine.includes('shopping list')) {
        continue; // Skip the header line
      }
    }
    
    // Stop if we hit non-grocery content while in grocery section
    if (inGrocerySection && (
      lowerLine.startsWith('estimated total cost:') ||
      lowerLine.startsWith('money-saving tips:') ||
      lowerLine.startsWith('sample recipe') ||
      lowerLine.startsWith('key recipes:') ||
      lowerLine.startsWith('instructions:') ||
      lowerLine.includes('this plan emphasizes') ||
      lowerLine.includes('this meal plan')
    )) {
      break;
    }
    
    // If we're in grocery section, collect items
    if (inGrocerySection) {
      if (line.startsWith('- ')) {
        // Extract item, removing quantity info in parentheses for cleaner display
        const item = line.substring(2).trim();
        groceryItems.push(item);
      } else if (lowerLine.endsWith(':') && (
        lowerLine.includes('produce') || lowerLine.includes('protein') || 
        lowerLine.includes('dairy') || lowerLine.includes('grain') ||
        lowerLine.includes('bakery') || lowerLine.includes('pantry')
      )) {
        // Category headers - skip but stay in grocery section
        continue;
      } else if (line.length === 0) {
        // Empty line - continue
        continue;
      }
    }
  }
  
  // If no grocery section found, fall back to original text
  if (groceryItems.length === 0) {
    return text;
  }
  
  // Return clean list of items, one per line
  return groceryItems.join('\n');
}

// Main Component
function GroceryListForm({ 
  currentCart, 
  setCurrentCart, 
  savedRecipes, 
  setSavedRecipes,
  saveRecipe,
  loadRecipeToCart
}) {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mergeCart, setMergeCart] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [parsingStats, setParsingStats] = useState(null);
  const [showValidator, setShowValidator] = useState(false);
  const [showInstacartCheckout, setShowInstacartCheckout] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [validatingAll, setValidatingAll] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [ingredientStyle, setIngredientStyle] = useState('basic');
  const [selectedAI] = useState('claude');
  // eslint-disable-next-line no-unused-vars
  const [recipes, setRecipes] = useState([]);
  const [waitingForAIResponse, setWaitingForAIResponse] = useState(false);
  const [parsedRecipes, setParsedRecipes] = useState([]); // Store parsed AI recipes
  const { currentUser } = useAuth();
  const textareaRef = useRef(null);

  // Function to trigger textarea auto-expansion
  const expandTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(80, textareaRef.current.scrollHeight) + 'px';
    }
  };

  // Auto-save hooks
  const { 
    // eslint-disable-next-line no-unused-vars
    draft, 
    clearDraft, 
    // eslint-disable-next-line no-unused-vars
    showDraftBanner, 
    // eslint-disable-next-line no-unused-vars
    setShowDraftBanner,
    // eslint-disable-next-line no-unused-vars
    isSaving: isDraftSaving
  } = useGroceryListAutoSave(inputText);

  // Show results when cart has items
  useEffect(() => {
    setShowResults(currentCart.length > 0);
  }, [currentCart]);

  const templates = [
    {
      id: 'weekly-meal',
      icon: '📅',
      title: 'Weekly Meal Plan',
      description: 'Create a healthy 7-day meal plan with complete grocery shopping list for a family of 4.',
      prompt: 'Create a healthy 7-day meal plan with complete grocery shopping list for a family of 4. Include breakfast, lunch, dinner, and snacks for each day.'
    },
    {
      id: 'budget',
      icon: '💰',
      title: 'Budget Shopping',
      description: 'Create a budget-friendly grocery list for $75 per week for 2 people.',
      prompt: 'Create a budget-friendly grocery list for $75 per week for 2 people. Focus on nutritious, filling meals with affordable ingredients.'
    },
    {
      id: 'quick-dinners',
      icon: '⚡',
      title: 'Quick Dinners',
      description: 'Get 5 quick 30-minute dinner recipes using convenience ingredients.',
      prompt: 'Give me 5 quick 30-minute dinner recipes using basic store-bought ingredients like jarred sauces, pre-made dough, and convenience items.'
    },
    {
      id: 'healthy',
      icon: '🥗',
      title: 'Healthy Options',
      description: 'Clean eating grocery list and meal plan focused on whole foods.',
      prompt: 'Create a clean eating grocery list and meal plan for one week, focused on whole foods, lean proteins, fresh vegetables, and minimal processed foods.'
    },
    {
      id: 'party',
      icon: '🎉',
      title: 'Party Planning',
      description: 'Plan a complete party menu for 10 people with shopping list.',
      prompt: 'Help me plan a party for 10 people. I need appetizers, main dishes, sides, desserts, and drinks with a complete shopping list.'
    },
    {
      id: 'special-diet',
      icon: '🍽️',
      title: 'Special Diet',
      description: 'Get customized meal plans for specific dietary needs.',
      prompt: 'Create a meal plan and grocery list for specific dietary needs. Please specify: keto, vegan, gluten-free, dairy-free, or other requirements.'
    }
  ];

  const handleTemplateClick = (template) => {
    setInputText(template.prompt);
    setWaitingForAIResponse(false);
    // Trigger textarea expansion after template content loads
    setTimeout(() => {
      expandTextarea();
    }, 50);
  };

  const extractAIResponseText = (aiData) => {
    // Check if the response is a string
    if (typeof aiData === 'string') {
      return aiData;
    }
    
    // Check various possible response structures
    const possiblePaths = [
      aiData?.response,
      aiData?.message,
      aiData?.text,
      aiData?.content,
      aiData?.data?.response,
      aiData?.data?.text,
      aiData?.data?.content,
      aiData?.result?.response,
      aiData?.result?.text,
      aiData?.completion,
      aiData?.choices?.[0]?.message?.content,
      aiData?.choices?.[0]?.text,
      aiData?.output,
      aiData?.generated_text
    ];
    
    // Find the first non-empty response
    for (const path of possiblePaths) {
      if (path && typeof path === 'string' && path.trim()) {
        return path;
      }
    }
    
    // If we still haven't found it, check if success is true and there's any string property
    if (aiData?.success) {
      for (const key in aiData) {
        if (typeof aiData[key] === 'string' && aiData[key].length > 50) {
          return aiData[key];
        }
      }
    }
    
    return null;
  };

  const submitGroceryList = async (listText, useAI = true) => {
    if (!listText.trim()) {
      setError('Please enter a grocery list');
      return;
    }

    setIsLoading(true);
    setError('');
    setShowProgress(true);
    setParsingProgress(0);
    // Safety: prevent overlays from blocking UI if a request hangs
    const overlaySafety = setTimeout(() => {
      setIsLoading(false);
      setShowProgress(false);
      setWaitingForAIResponse(false);
    }, 15000);
    
    // Track if we're waiting for AI
    if (useAI) {
      setWaitingForAIResponse(true);
    }

    let progressInterval;
    try {
      progressInterval = setInterval(() => {
        setParsingProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      
      // If using AI, first generate a response
      if (useAI && selectedAI) {
        try {
          console.log('🤖 Starting AI processing:', { prompt: listText.substring(0, 100), ai: selectedAI, useAI, selectedAI });
          
          const aiResponse = await fetch(`${API_URL}/api/ai/${selectedAI}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: listText,
              context: 'grocery_list_generation',
              ingredientChoice: ingredientStyle,
              options: {
                includeRecipes: true,
                formatAsList: true,
                structuredFormat: true,
                formatInstruction: "Please format your response with clear sections:\n\nRecipe Name:\n[Recipe name here]\n\nIngredients:\n[List ingredients here, one per line]\n\nInstructions:\n[Cooking instructions here]\n\nThis allows users to save the recipe to their collection before parsing ingredients for shopping."
              }
            })
          });

          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error('AI Response error:', errorText);
            throw new Error(`AI request failed: ${aiResponse.status}`);
          }

          const aiData = await aiResponse.json();
          console.log('AI response received, checking structure...');
          
          // Extract the response text using our helper function
          const aiResponseText = extractAIResponseText(aiData);
          
          if (aiResponseText) {
            console.log('AI response text found, length:', aiResponseText.length);
            
            // Parse and store recipes from AI response
            const foundRecipes = parseAIRecipes(aiResponseText);
            if (foundRecipes.length > 0) {
              console.log(`📝 Found ${foundRecipes.length} recipes in AI response`);
              setParsedRecipes(foundRecipes);
            }
            
            // IMPORTANT: Extract only grocery list items for the textarea (not the full meal plan)
            const cleanGroceryList = extractGroceryListOnly(aiResponseText);
            setInputText(cleanGroceryList);
            
            // Also update via ref as a backup
            if (textareaRef.current) {
              textareaRef.current.value = cleanGroceryList;
            }
            
            // Trigger textarea auto-expansion after content is loaded
            setTimeout(() => {
              expandTextarea();
            }, 50);
            
            // Clear loading states
            clearInterval(progressInterval);
            setIsLoading(false);
            setShowProgress(false);
            setParsingProgress(0);
            setWaitingForAIResponse(false);
            
            // Show success feedback
            const successMessage = `✅ ${selectedAI === 'claude' ? 'Claude' : 'ChatGPT'} has generated your list! Review it and hit CARTSMASH to add items to cart.`;
            console.log(successMessage);
            
            // Small delay to ensure state updates
            setTimeout(() => {
              console.log('Input text updated to:', inputText.substring(0, 50) + '...');
            }, 100);
            
            // Exit here - user needs to review and hit CARTSMASH again
            return;
          } else {
            console.error('No response text found in AI data:', Object.keys(aiData));
            throw new Error('AI response was empty');
          }
        } catch (aiError) {
          console.error('AI request failed:', aiError);
          setError(`AI request failed: ${aiError.message}`);
          clearInterval(progressInterval);
          setIsLoading(false);
          setShowProgress(false);
          setParsingProgress(0);
          setWaitingForAIResponse(false);
          return;
        }
      }
      
      // This part runs when parsing the list (not using AI)
      console.log('🔧 Manual parsing mode - no AI processing:', { useAI, selectedAI, textLength: listText.length });
      
      // Add confetti only when actually parsing items
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FB4F14', '#002244', '#FFFFFF']
      });
      
      // Extract ingredients from recipe text if it's a full recipe
      const extractIngredientsFromRecipe = (text) => {
        const lines = text.split('\n');
        const ingredients = [];
        let inIngredientsSection = false;
        
        for (const line of lines) {
          const trimmed = line.trim();
          
          // Check for ingredients section headers
          if (trimmed.match(/^(ingredients?:?\s*$|##?\s*ingredients?|Ingredients?:?\s*$)/i)) {
            inIngredientsSection = true;
            continue;
          }
          
          // Check for instructions/directions section (stop ingredients)
          if (trimmed.match(/^(instructions?:?\s*$|directions?:?\s*$|method:?\s*$|steps?:?\s*$|##?\s*(instructions?|directions?|method|steps?))/i)) {
            inIngredientsSection = false;
            continue;
          }
          
          // If we're in ingredients section, collect ingredient lines
          if (inIngredientsSection && trimmed.length > 0) {
            // Skip obvious non-ingredient lines
            if (!trimmed.match(/^(recipe|serves?|prep time|cook time|total time|yield)/i)) {
              ingredients.push(trimmed);
            }
          }
        }
        
        return ingredients.length > 0 ? ingredients.join('\n') : text;
      };
      
      // Check if this looks like a full recipe and extract ingredients
      const isFullRecipe = listText.toLowerCase().includes('ingredients') && 
                          (listText.toLowerCase().includes('instructions') || listText.toLowerCase().includes('directions'));
      
      const textToParse = isFullRecipe ? extractIngredientsFromRecipe(listText) : listText;
      
      console.log('Parsing type:', isFullRecipe ? 'Full Recipe (extracting ingredients)' : 'Regular List');
      if (isFullRecipe) {
        console.log('Extracted ingredients:', textToParse.substring(0, 200) + '...');
      }

      // Parse the list
      const response = await fetch(`${API_URL}/api/cart/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listText: textToParse,
          action: mergeCart ? 'merge' : 'replace',
          userId: currentUser?.uid || null,
          options: {
            mergeDuplicates: true,
            enhancedQuantityParsing: true,
            detectContainers: true
          }
        }),
      });

      clearInterval(progressInterval);
      setParsingProgress(100);

      const data = await response.json();
      
      if (data.success && data.cart && data.cart.length > 0) {
        // Attach the recipe to the cart items for persistence and ensure stable IDs/fields
        const cartWithRecipe = data.cart.map((item, index) => {
          // Generate a truly unique ID using timestamp + random string
          const uniqueId = item.id || item._id || `item_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Create clean item without undefined values
          const cleanItem = {
            id: uniqueId,
            productName: item.productName || item.itemName || item.name || '',
            quantity: typeof item.quantity === 'number' && !Number.isNaN(item.quantity) ? item.quantity : 1,
            unit: item.unit || 'each',
            category: item.category || 'other',
            confidence: typeof item.confidence === 'number' ? item.confidence : 0.7,
            // Store recipe only on first item to avoid duplication
            ...(index === 0 ? { _sourceRecipe: listText } : {})
          };
          
          // Only add optional fields if they have valid values
          if (item.realPrice !== undefined && item.realPrice !== null) cleanItem.realPrice = item.realPrice;
          if (item.salePrice !== undefined && item.salePrice !== null) cleanItem.salePrice = item.salePrice;
          if (item.availability !== undefined && item.availability !== null) cleanItem.availability = item.availability;
          if (item.upc !== undefined && item.upc !== null) cleanItem.upc = item.upc;
          if (item.productId !== undefined && item.productId !== null) cleanItem.productId = item.productId;
          if (item.krogerProduct !== undefined && item.krogerProduct !== null) cleanItem.krogerProduct = item.krogerProduct;
          if (item.matchedName !== undefined && item.matchedName !== null) cleanItem.matchedName = item.matchedName;
          if (item.brand !== undefined && item.brand !== null) cleanItem.brand = item.brand;
          if (item.size !== undefined && item.size !== null) cleanItem.size = item.size;
          if (item.storeId !== undefined && item.storeId !== null) cleanItem.storeId = item.storeId;
          if (item.original !== undefined && item.original !== null) cleanItem.original = item.original;
          
          return cleanItem;
        });
        
        // Debug logging before cart update
        console.log('🛒 Cart update debug:');
        console.log('- Current cart length:', currentCart.length);
        console.log('- New items length:', cartWithRecipe.length);
        console.log('- Merge mode:', mergeCart);
        console.log('- First few new items:', cartWithRecipe.slice(0, 3).map(item => ({id: item.id, name: item.productName})));
        
        if (mergeCart) {
          const newCart = [...currentCart, ...cartWithRecipe];
          console.log('- Merged cart length:', newCart.length);
          setCurrentCart(newCart);
        } else {
          console.log('- Replacing cart entirely');
          setCurrentCart([...cartWithRecipe]); // Force new array reference
        }
        
        // Verify update after state change
        setTimeout(() => {
          console.log('- Cart length after update:', currentCart.length);
        }, 100);
        
        // Store parsing stats with original text preserved for recipe display
        const statsToSet = {
          ...(data.parsing?.stats || {}),
          sourceRecipe: listText  // Preserve the original input for display
        };
        console.log('📝 Setting parsingStats:', {
          hasSourceRecipe: !!statsToSet.sourceRecipe,
          sourceRecipeLength: statsToSet.sourceRecipe?.length,
          firstChars: statsToSet.sourceRecipe?.substring(0, 50)
        });
        
        setParsingStats(statsToSet);
        
        // Auto-save recipes when parsing
        if (data.recipes && data.recipes.length > 0) {
          console.log(`📝 Auto-saving ${data.recipes.length} recipes from parsing...`);
          data.recipes.forEach(recipe => {
            const savedRecipe = {
              ...recipe,
              userId: currentUser?.uid || 'guest',
              source: 'auto_saved_from_parsing'
            };
            saveRecipe(savedRecipe);
          });
          console.log(`✅ Auto-saved ${data.recipes.length} recipes to collection`);
        }
        
        clearDraft();
        setInputText(''); // Clear input after successful parsing
        setWaitingForAIResponse(false);
        
        console.log(`✅ Successfully parsed ${data.cart.length} items`);
      } else {
        setError('No valid grocery items found in the text');
      }
      
    } catch (err) {
      console.error('Processing failed:', err);
      setError(`Failed to process: ${err.message}`);
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      clearTimeout(overlaySafety);
      setIsLoading(false);
      setShowProgress(false);
      setParsingProgress(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Always use AI on the first submission unless we're already waiting for a response
    // The key insight: if waitingForAIResponse is true, it means AI has already processed this and we should parse
    const shouldUseAI = !waitingForAIResponse && selectedAI && inputText.trim().length > 0;
    
    console.log('Submit clicked. Using AI:', shouldUseAI, '| Selected AI Model:', selectedAI, '| Waiting for AI Response:', waitingForAIResponse);
    console.log('Input text preview:', inputText.substring(0, 100));
    
    await submitGroceryList(inputText, shouldUseAI);
  };

  const handleNewList = () => {
    setInputText('');
    setError('');
    setWaitingForAIResponse(false);
    clearDraft();
    // Also clear the current cart and hide results so the list is truly empty
    setCurrentCart([]);
    setShowResults(false);
    setParsingStats(null);
    // Clear parsed recipes
    setParsedRecipes([]);
  };

  const handleSaveRecipeFromAI = () => {
    const aiResponseText = inputText;
    
    if (!aiResponseText) {
      alert('No recipe content to save');
      return;
    }

    // Parse the structured AI response
    const recipe = parseStructuredRecipe(aiResponseText);
    
    if (!recipe.name || !recipe.ingredients) {
      alert('Could not parse recipe format. Please ensure it has Recipe Name and Ingredients sections.');
      return;
    }

    // Generate unique ID for the recipe
    const savedRecipe = {
      id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...recipe,
      createdAt: new Date().toISOString(),
      userId: currentUser?.uid || 'guest',
      source: 'ai_generated'
    };

    // ✅ REMOVED: No more localStorage - recipes managed by parent component via saveRecipe prop

    // Try to save to server if user is logged in
    if (currentUser?.uid) {
      const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      fetch(`${API_URL}/api/recipes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'user-id': currentUser.uid
        },
        body: JSON.stringify(savedRecipe)
      }).catch(err => console.error('Failed to save to server, but saved locally:', err));
    }

    alert(`✅ Recipe "${recipe.name}" saved to My Recipes!`);
  };

  const parseStructuredRecipe = (text) => {
    const lines = text.split('\n');
    let name = '';
    let ingredients = '';
    let instructions = '';
    let currentSection = '';

    for (const line of lines) {
      const cleanLine = line.trim();
      
      if (cleanLine.toLowerCase().startsWith('recipe name:')) {
        currentSection = 'name';
        name = cleanLine.replace(/recipe name:/i, '').trim();
        continue;
      } else if (cleanLine.toLowerCase().startsWith('ingredients:')) {
        currentSection = 'ingredients';
        continue;
      } else if (cleanLine.toLowerCase().startsWith('instructions:')) {
        currentSection = 'instructions';
        continue;
      }

      if (cleanLine && currentSection) {
        if (currentSection === 'name' && !name) {
          name = cleanLine;
        } else if (currentSection === 'ingredients') {
          ingredients += (ingredients ? '\n' : '') + cleanLine;
        } else if (currentSection === 'instructions') {
          instructions += (instructions ? '\n' : '') + cleanLine;
        }
      }
    }

    // Fallback: if no structured format found, try to guess
    if (!name && lines.length > 0) {
      name = lines[0].trim() || 'AI Generated Recipe';
    }

    return { name, ingredients, instructions };
  };

  // Parse AI response for recipes in multiple formats
  const parseAIRecipes = (aiResponseText) => {
    if (!aiResponseText) return [];

    const recipes = [];
    const lines = aiResponseText.split('\n');
    
    console.log('🔍 Parsing AI response for recipes, line count:', lines.length);
    
    // Method 1: Look for structured recipe formats (Recipe Name:, Ingredients:, Instructions:)
    let currentRecipe = null;
    let currentSection = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect recipe name section
      if (line.toLowerCase().match(/^recipe\s*name\s*:/)) {
        if (currentRecipe) recipes.push(currentRecipe);
        currentRecipe = {
          title: line.replace(/^recipe\s*name\s*:/i, '').trim(),
          ingredients: [],
          instructions: [],
          prepTime: '',
          cookTime: '',
          calories: '',
          tags: []
        };
        currentSection = 'title';
        continue;
      }
      
      // Detect ingredients section
      if (line.toLowerCase().match(/^ingredients?\s*:/)) {
        currentSection = 'ingredients';
        continue;
      }
      
      // Detect instructions section
      if (line.toLowerCase().match(/^(instructions?|directions?|method|steps?)\s*:/)) {
        currentSection = 'instructions';
        continue;
      }
      
      // Add content to current section
      if (currentRecipe && line) {
        if (currentSection === 'title' && !currentRecipe.title) {
          currentRecipe.title = line;
        } else if (currentSection === 'ingredients') {
          const cleanIngredient = line.replace(/^[-*•]\s*/, '').trim();
          if (cleanIngredient && !cleanIngredient.toLowerCase().match(/^(instructions?|directions?|method|steps?)\s*:/)) {
            currentRecipe.ingredients.push(cleanIngredient);
          }
        } else if (currentSection === 'instructions') {
          const cleanInstruction = line.replace(/^[\d.-]*\s*/, '').trim();
          if (cleanInstruction) {
            currentRecipe.instructions.push(cleanInstruction);
          }
        }
      }
    }
    
    // Add the last recipe if it exists
    if (currentRecipe && currentRecipe.title) {
      recipes.push(currentRecipe);
    }
    
    // Method 2: If no structured recipes found, look for recipe-like sections in the text
    if (recipes.length === 0) {
      console.log('🔍 No structured recipes found, looking for recipe patterns...');
      
      // Look for lines that could be recipe titles (not grocery list items)
      const potentialRecipes = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip obvious grocery list headers and items
        if (!line || 
            line.toLowerCase().includes('grocery list') || 
            line.toLowerCase().includes('shopping list') ||
            line.startsWith('-') || 
            line.startsWith('•') ||
            line.match(/^\d+\s*(oz|lb|cups?|tbsp|tsp|cloves?|bunch|bag|jar|can|container|loaf|bottle)/i)) {
          continue;
        }
        
        // Look for potential recipe titles (descriptive food names)
        if (line.length > 8 && line.length < 60 &&
            !line.match(/^\d+\./) && // Not numbered steps
            (line.toLowerCase().includes('chicken') || 
             line.toLowerCase().includes('pasta') || 
             line.toLowerCase().includes('salad') ||
             line.toLowerCase().includes('soup') ||
             line.toLowerCase().includes('sandwich') ||
             line.toLowerCase().includes('recipe') ||
             line.toLowerCase().match(/(with|and|or|in)\s+/))) { // Contains food relationship words
          
          potentialRecipes.push({
            title: line.replace(/[*#]+/g, '').trim(), // Remove markdown formatting
            ingredients: [],
            instructions: [],
            prepTime: '',
            cookTime: '',
            calories: '',
            tags: []
          });
        }
      }
      
      console.log('🔍 Found potential recipes:', potentialRecipes.length);
      recipes.push(...potentialRecipes.slice(0, 3)); // Limit to 3 recipes
    }
    
    console.log(`📝 Parsed ${recipes.length} recipes from AI response`);
    return recipes;
  };

  // Handle adding recipe to recipe library
  const handleAddToRecipeLibrary = (recipe) => {
    const savedRecipe = {
      id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: recipe.title,
      ingredients: recipe.ingredients.join('\n'),
      instructions: recipe.instructions.join('\n'),
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      calories: recipe.calories,
      tags: recipe.tags,
      createdAt: new Date().toISOString(),
      userId: currentUser?.uid || 'guest',
      source: 'ai_generated'
    };

    // Use the existing saveRecipe function
    if (saveRecipe) {
      saveRecipe(savedRecipe);
      alert(`✅ Recipe "${recipe.title}" added to Recipe Library!`);
    } else {
      alert('❌ Unable to save recipe. Recipe Library not available.');
    }
  };

  // Handle adding recipe to meal plan
  const handleAddToMealPlan = (recipe) => {
    // For now, just show an alert. This could be enhanced to integrate with meal planning
    alert(`📅 "${recipe.title}" would be added to meal plan (feature to be implemented)`);
  };

  // Handle removing a recipe from the parsed recipes list
  const handleRemoveRecipe = (recipeIndex) => {
    const updatedRecipes = parsedRecipes.filter((_, index) => index !== recipeIndex);
    setParsedRecipes(updatedRecipes);
    console.log(`🗑️ Removed recipe at index ${recipeIndex}. ${updatedRecipes.length} recipes remaining.`);
  };

  const handleItemsChange = (updatedItems) => {
    console.log('🔄 Updating cart items:', {
      before: currentCart.length,
      after: updatedItems.length,
      items: updatedItems.map(item => ({
        id: item.id,
        name: item.productName
      }))
    });
    
    // Force a complete state refresh
    setCurrentCart([...updatedItems]);
  };

  // Debug delete function to test individual item removal
  const debugDeleteItem = (itemId) => {
    console.log('🗑️ Attempting to delete item:', itemId);
    const itemToDelete = currentCart.find(item => item.id === itemId);
    console.log('Item found:', itemToDelete);
    
    if (itemToDelete) {
      const newCart = currentCart.filter(item => item.id !== itemId);
      console.log('New cart after deletion:', newCart);
      setCurrentCart(newCart);
    } else {
      console.error('❌ Item not found in cart!');
    }
  };

  // Debug useEffect to expose cart debugging functions
  useEffect(() => {
    // Expose debug function to window for testing
    if (typeof window !== 'undefined') {
      window.debugCart = {
        showItems: () => {
          console.table(currentCart.map((item, index) => ({
            index: index,
            id: item.id,
            name: item.productName,
            quantity: item.quantity,
            hasId: !!item.id,
            idType: typeof item.id,
            hasUndefined: Object.values(item).includes(undefined),
            allKeys: Object.keys(item).join(', ')
          })));
        },
        deleteItem: (itemId) => debugDeleteItem(itemId),
        deleteByIndex: (index) => {
          console.log(`🗑️ Attempting to delete item at index ${index}`);
          if (currentCart[index]) {
            const item = currentCart[index];
            console.log('Item to delete:', item);
            debugDeleteItem(item.id);
          } else {
            console.error(`❌ No item at index ${index}`);
          }
        },
        forceDeleteByName: (productName) => {
          console.log(`🔨 Force deleting item by name: "${productName}"`);
          const beforeCount = currentCart.length;
          const newCart = currentCart.filter(item => 
            item.productName !== productName && 
            item.name !== productName
          );
          setCurrentCart(newCart);
          console.log(`Deleted ${beforeCount - newCart.length} items matching "${productName}"`);
        },
        findProblematicItems: () => {
          const problematic = currentCart.filter(item => 
            !item.id || item.id === undefined || item.id === null || typeof item.id !== 'string'
          );
          console.log('🚨 Problematic items (no valid ID):', problematic);
          return problematic;
        },
        regenerateIds: () => {
          console.log('🔄 Regenerating IDs for all items...');
          const updatedCart = currentCart.map((item, index) => ({
            ...item,
            id: `item-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
          }));
          setCurrentCart(updatedCart);
          console.log('✅ All IDs regenerated');
        },
        clearCart: () => setCurrentCart([]),
        getItem: (index) => currentCart[index],
        getFullCart: () => currentCart,
        testDeleteAll: () => {
          console.log('🧪 Testing deletion of all items one by one...');
          currentCart.forEach((item, index) => {
            console.log(`Testing deletion of item ${index + 1}:`, item.productName);
            if (item.id) {
              debugDeleteItem(item.id);
            } else {
              console.error(`❌ Item ${index + 1} has no ID, cannot delete`);
            }
          });
        },
        // Local Storage debugging
        checkLocalStorage: () => {
          const savedCart = [];
          console.log('💾 Current localStorage cart:', savedCart ? JSON.parse(savedCart) : 'empty');
          return savedCart ? JSON.parse(savedCart) : [];
        },
        clearLocalStorage: () => {
          console.log('🗑️ Cleared localStorage cart - refresh page to see effect');
        },
        updateLocalStorage: () => {
          console.log('🚫 Cart localStorage writes disabled (Firestore is cart authority)');
          console.log('💡 Cart authority system prevents localStorage cart writes');
        },
        compareWithLocalStorage: () => {
          const savedCart = [];
          const saved = savedCart ? JSON.parse(savedCart) : [];
          console.log('🔍 Comparison between current cart and localStorage:');
          console.log('Current cart items:', currentCart.length);
          console.log('LocalStorage items:', saved.length);
          console.log('Items in current but not in storage:', 
            currentCart.filter(current => !saved.some(s => s.id === current.id))
          );
          console.log('Items in storage but not in current:', 
            saved.filter(s => !currentCart.some(current => current.id === s.id))
          );
        },
        // EMERGENCY NUCLEAR OPTION - Clear ALL cart data sources
        nuclearClear: () => {
          console.log('💥 NUCLEAR CLEAR: Removing cart from ALL sources...');
          
          // 1. Clear localStorage
          localStorage.removeItem('cart-smash-draft');
          
          // 2. Clear current cart state
          setCurrentCart([]);
          
          // 3. Clear any auto-save data
          if (window.userDataService) {
            try {
              window.userDataService.saveShoppingList({id: 'current-cart', items: []});
            } catch(e) { console.log('Could not clear Firebase:', e); }
          }
          
          // 4. Server clearing skipped (no compatible endpoints found)
          console.log('⚠️ Server clearing skipped - no compatible API endpoints');
          
          console.log('💥 Nuclear clear completed. Refresh page to verify.');
        }
      };
      
      // Also expose to checkout debug
      if (window.checkoutDebug) {
        window.checkoutDebug.deleteItem = debugDeleteItem;
        window.checkoutDebug.regenerateIds = window.debugCart.regenerateIds;
      }
    }
  }, [currentCart, debugDeleteItem, setCurrentCart]);

  // Dedicated delete handler with multiple ID checks
  const handleDeleteItem = (itemId) => {
    setCurrentCart(prevCart => {
      const newCart = prevCart.filter(item => {
        // Use multiple checks to ensure we're comparing the right field
        const shouldKeep = item.id !== itemId && 
                           item._id !== itemId && 
                           item.productId !== itemId;
        return shouldKeep;
      });
      
      console.log(`🗑️ Deleted item ${itemId}. Cart went from ${prevCart.length} to ${newCart.length} items`);
      return newCart;
    });
  };

  return (
    <div className="container">
      {isLoading && (
        <OverlaySpinner text={waitingForAIResponse ? "AI is generating your list..." : "CARTSMASH is processing your list..."} />
      )}

      {showProgress && (
        <div className="progress-overlay">
          <ProgressSpinner 
            progress={parsingProgress} 
            text={waitingForAIResponse ? "AI is thinking..." : "Parsing your grocery list..."}
          />
        </div>
      )}

      <div className="hero-section" style={styles.heroSectionMinimal}>
        <h1 style={styles.heroTitleMinimal}>CARTSMASH</h1>
        <h2 style={styles.heroSubtitleMinimal}>Shop Smarter, Save Faster</h2>
        <p style={styles.heroDescriptionMinimal}>AI-powered grocery parsing that understands what you actually want to buy.</p>
      </div>

      {/* Unified AI Assistant Container */}
      <div style={styles.unifiedAssistantContainer}>
        {/* Templates Section */}
        <div style={styles.templatesSection}>
         
          <div style={styles.templatesGrid}>
            {templates.map(template => (
              <div
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                style={styles.templateCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#FB4F14';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(251,79,20,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#002244';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,2,68,0.08)';
                }}
              >
                <div style={styles.templateIcon}>{template.icon}</div>
                <h4 style={styles.templateTitle}>{template.title}</h4>
                <p style={styles.templateDescription}>{template.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Controls Bar */}
        <div style={styles.controlsBar}>
          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <button onClick={handleNewList} style={styles.actionBtn}>
              📝 Clear List
            </button>
          </div>

          {/* Settings */}
          <div style={styles.settings}>
            {/* Merge/Replace Toggle */}
            <div style={styles.settingGroup}>
              <label style={styles.settingLabel}>Mode:</label>
              <div style={styles.toggleButtons}>
                <button
                  onClick={() => setMergeCart(true)}
                  style={{
                    ...styles.toggleBtn,
                    ...(mergeCart ? styles.toggleActive : {})
                  }}
                  title={`Add to existing ${currentCart.length} items`}
                >
                  🔀 Merge
                </button>
                <button
                  onClick={() => setMergeCart(false)}
                  style={{
                    ...styles.toggleBtn,
                    ...(!mergeCart ? styles.toggleActive : {})
                  }}
                  title="Replace entire cart with new items"
                >
                  🔥 Replace
                </button>
              </div>
            </div>

            {/* Ingredient Style */}
            <div style={styles.settingGroup}>
              <label style={styles.settingLabel}>Style:</label>
              <div style={styles.toggleButtons}>
                <button
                  onClick={() => setIngredientStyle('basic')}
                  style={{
                    ...styles.toggleBtn,
                    ...(ingredientStyle === 'basic' ? styles.toggleActive : {})
                  }}
                >
                  🏪 Basic
                </button>
                <button
                  onClick={() => setIngredientStyle('homemade')}
                  style={{
                    ...styles.toggleBtn,
                    ...(ingredientStyle === 'homemade' ? styles.toggleActive : {})
                  }}
                >
                  🍳 Homemade
                </button>
              </div>
            </div>
            
            {/* AI Model */}
            {/*
            <div style={styles.settingGroup}>
              <label style={styles.settingLabel}>AI:</label>
              <div style={styles.toggleButtons}>
                <button
                  onClick={() => setSelectedAI('claude')}
                  style={{
                    ...styles.toggleBtn,
                    ...(selectedAI === 'claude' ? styles.toggleActive : {})
                  }}
                >
                  🤖 Claude
                </button>
                <button
                  onClick={() => setSelectedAI('chatgpt')}
                  style={{
                    ...styles.toggleBtn,
                    ...(selectedAI === 'chatgpt' ? styles.toggleActive : {})
                  }}
                >
                  🧠 GPT
                </button>
              </div>
            </div>
            */}
          </div>
        </div>

        {/* Main Input Area */}
        <div style={styles.mainInputArea}>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setWaitingForAIResponse(false);
              // Auto-expand textarea based on content
              expandTextarea();
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.shiftKey && e.ctrlKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask for meal plans, recipes, or grocery lists...

Examples:
• Create a healthy 7-day meal plan for my family
• I need ingredients for chicken tacos
• What can I make with chicken, rice, and broccoli?
• Plan a birthday party menu for 20 people
• Give me a keto-friendly shopping list

Or paste any grocery list directly!"
            style={{
              ...styles.mainTextarea,
              minHeight: '80px', // About 3-4 lines
              height: 'auto',
              resize: 'none'
            }}
            rows="3"
          />
          
          {waitingForAIResponse && (
            <div style={styles.aiStatusMessage}>
              💡 AI response loaded! Review it above and hit CARTSMASH to add items to your cart.
              <button 
                onClick={handleSaveRecipeFromAI}
                style={styles.saveRecipeButton}
                title="Save this recipe to My Recipes collection"
              >
                📖 Save to My Recipes
              </button>
            </div>
          )}
          
          <div style={styles.inputControls}>
            <button 
              onClick={handleSubmit}
              disabled={!inputText.trim() || isLoading}
              className={`smash-button ${isLoading ? 'smash-button-loading' : ''}`}
              style={styles.smashButton}
            >
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <ButtonSpinner />
                  <span>PROCESSING...</span>
                </div>
              ) : (
                'CARTSMASH IT!'
              )}
            </button>
          </div>
        </div>


      </div>

      {error && (
        <div className="error-message" style={styles.errorMessage}>
          ❌ {error}
        </div>
      )}

      {/* Display Parsed Recipes */}
      {parsedRecipes.length > 0 && (
        <div style={styles.recipesContainer}>
          <h3 style={styles.recipesTitle}>🍳 Recipes Found</h3>
          {parsedRecipes.map((recipe, index) => (
            <div key={index} style={styles.recipeCard}>
              <div style={styles.recipeHeader}>
                <h4 style={styles.recipeTitle}>🍳 <strong>{recipe.title}</strong></h4>
                <button 
                  onClick={() => handleRemoveRecipe(index)}
                  style={styles.deleteButton}
                  title="Remove this recipe"
                >
                  🗑️
                </button>
              </div>
              
              <div style={styles.recipeContent}>
                {recipe.ingredients.length > 0 && (
                  <div style={styles.recipeIngredients}>
                    • <strong>Ingredients:</strong> {recipe.ingredients.join(', ')}
                  </div>
                )}
                
                <div style={styles.recipeMetadata}>
                  {(recipe.prepTime || recipe.cookTime) && (
                    <div style={styles.recipeTime}>
                      • <strong>Time:</strong> 
                      {recipe.prepTime && ` Prep ${recipe.prepTime} min`}
                      {recipe.cookTime && ` | Cook ${recipe.cookTime} min`}
                      {recipe.calories && ` | `}
                      {recipe.calories && (
                        <span style={styles.recipeCalories}>
                          <strong>Calories:</strong> ~{recipe.calories}/serving
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {recipe.tags && recipe.tags.length > 0 && (
                  <div style={styles.recipeTags}>
                    • <strong>Tags:</strong> {recipe.tags.map(tag => `\`${tag}\``).join(' ')}
                  </div>
                )}
              </div>
              
              <div style={styles.recipeActions}>
                <button 
                  onClick={() => handleAddToRecipeLibrary(recipe)}
                  style={styles.recipeButton}
                  title="Add to Recipe Library"
                >
                  🔲 <strong>[Add to Recipe Library]</strong>
                </button>
                <button 
                  onClick={() => handleAddToMealPlan(recipe)}
                  style={styles.recipeButton}
                  title="Add to Meal Plan"
                >
                  📅 <strong>[Add to Meal Plan]</strong>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && currentCart.length > 0 && (
        <>
          <ParsedResultsDisplay
            items={currentCart} 
            currentUser={currentUser}
            onItemsChange={handleItemsChange}
            onDeleteItem={handleDeleteItem} // Add dedicated delete handler
            parsingStats={parsingStats}
            savedRecipes={savedRecipes}
            setSavedRecipes={setSavedRecipes}
            // Pass a prop to hide the export button in ParsedResultsDisplay
            hideExportButton={true}
          />
          
          {/* Single Unified Checkout Button */}
          <div style={styles.checkoutSection}>
            <button
              onClick={() => setShowInstacartCheckout(true)}
              style={styles.instacartButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(251, 79, 20, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(251, 79, 20, 0.25)';
              }}
              disabled={currentCart.length === 0}
            >
              <div style={styles.buttonIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>
                </svg>
              </div>
              <div style={styles.buttonContent}>
                <div style={styles.buttonTitle}>CARTSMASH to Instacart</div>
                <div style={styles.buttonSubtitle}>
                  Send {currentCart.length} items to your Instacart cart
                </div>
              </div>
              <div style={styles.buttonArrow}>→</div>
            </button>
            
            <div style={styles.checkoutFeatures}>
              <div style={styles.featureItem}>
                <span style={styles.featureCheck}>✓</span>
                <span>Auto-match products</span>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureCheck}>✓</span>
                <span>Find best prices</span>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureCheck}>✓</span>
                <span>Schedule delivery</span>
              </div>
            </div>
          </div>
        </>
      )}

      {showValidator && (
        <ProductValidator
          items={currentCart}
          onItemsUpdated={handleItemsChange}
          onClose={() => setShowValidator(false)}
        />
      )}


      {showInstacartCheckout && (
        <InstacartCheckoutFlow
          currentCart={currentCart}
          onClose={() => setShowInstacartCheckout(false)}
        />
      )}

    </div>
  );
}

// Styles
const styles = {
  heroSectionMinimal: {
    background: 'linear-gradient(135deg, #002244 0%, #003366 100%)',
    color: 'white',
    padding: '20px 16px',
    borderRadius: '12px',
    marginBottom: '20px',
    textAlign: 'center'
  },

  heroTitleMinimal: {
    fontSize: '42px',
    fontWeight: 'bold',
    color: 'white',
    margin: '0 0 2px 0',
    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
    lineHeight: '1'
  },

  heroSubtitleMinimal: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#FB4F14',
    margin: '0 0 2px 0',
    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
    lineHeight: '1'
  },

  heroDescriptionMinimal: {
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.9)',
    margin: '0',
    lineHeight: '1.2'
  },

  unifiedAssistantContainer: {
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,2,68,0.1)',
    overflow: 'hidden',
    marginBottom: '30px',
    border: '2px solid #002244'
  },
  
  unifiedHeader: {
    background: 'linear-gradient(135deg, #FB4F14 0%, #FF6B35 100%)',
    padding: '24px',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },
  
  headerContent: {
    flex: '1 1 auto'
  },
  
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '12px'
  },
  
  mainIcon: {
    fontSize: '48px'
  },
  
  mainTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 'bold',
    textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
  },
  
  subtitle: {
    margin: '4px 0 0 0',
    opacity: 0.95,
    fontSize: '14px'
  },
  
  featureBadges: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: '500',
    backdropFilter: 'blur(10px)'
  },
  
  cartStatus: {
    backgroundColor: 'rgba(0, 2, 68, 0.9)',
    padding: '16px 24px',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
    border: '2px solid rgba(255,255,255,0.3)'
  },
  
  cartIndicator: {
    textAlign: 'center'
  },
  
  cartCount: {
    fontSize: '36px',
    fontWeight: 'bold',
    display: 'block'
  },
  
  cartLabel: {
    fontSize: '14px',
    opacity: 0.9
  },
  
  controlsBar: {
    backgroundColor: '#FFF5F2',
    padding: '16px 24px',
    borderBottom: '2px solid #FB4F14',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  
  actionBtn: {
    padding: '8px 16px',
    backgroundColor: 'white',
    color: '#002244',
    border: '2px solid #002244',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  
  disabledBtn: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  
  settings: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center'
  },
  
  settingGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  settingLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#002244'
  },
  
  toggleButtons: {
    display: 'flex',
    backgroundColor: 'white',
    borderRadius: '6px',
    padding: '2px',
    border: '2px solid #002244'
  },
  
  toggleBtn: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    backgroundColor: 'transparent',
    color: '#002244',
    transition: 'all 0.2s',
    fontWeight: '500'
  },
  
  toggleActive: {
    backgroundColor: '#FB4F14',
    color: 'white'
  },
  
  mainInputArea: {
    padding: '30px',
    backgroundColor: 'white'
  },
  
  mainTextarea: {
    width: '100%',
    padding: '20px',
    fontSize: '16px',
    border: '3px solid #002244',
    borderRadius: '12px',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: '1.5',
    transition: 'border-color 0.2s, height 0.2s ease',
    outline: 'none',
    boxSizing: 'border-box',
    overflow: 'hidden',
    minHeight: '80px'
  },

  aiStatusMessage: {
    backgroundColor: '#E6F7FF',
    border: '2px solid #1890FF',
    borderRadius: '8px',
    padding: '12px 16px',
    marginTop: '12px',
    marginBottom: '12px',
    color: '#002244',
    fontSize: '14px',
    fontWeight: '500',
    textAlign: 'center'
  },
  
  inputControls: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '20px'
  },
  
  smashButton: {
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: 'bold',
    minWidth: '200px',
    background: 'linear-gradient(135deg, #FB4F14, #FF6B35)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(251,79,20,0.3)',
    transition: 'all 0.3s'
  },
  
  templatesSection: {
    padding: '30px',
    background: 'linear-gradient(135deg, #FB4F14, #FF6B35)',
    color: 'white'
  },
  
  templatesTitle: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'white'
  },
  
  templatesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px'
  },
  
  templateCard: {
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '2px solid #002244',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 2px 8px rgba(0,2,68,0.08)'
  },
  
  templateIcon: {
    fontSize: '32px',
    marginBottom: '8px'
  },
  
  templateTitle: {
    margin: '0 0 6px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#002244'
  },
  
  templateDescription: {
    margin: 0,
    fontSize: '13px',
    color: '#666',
    lineHeight: '1.4'
  },
  

  errorMessage: {
    backgroundColor: '#FEE',
    color: '#8B0000',
    padding: '12px',
    borderRadius: '8px',
    border: '2px solid #8B0000',
    marginTop: '16px',
    marginBottom: '16px',
    fontWeight: '500'
  },

  saveRecipeButton: {
    padding: '8px 16px',
    backgroundColor: '#FF6B35',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '8px'
  },

  // Updated Checkout Styles with CARTSMASH branding
  checkoutSection: {
    marginTop: '30px',
    padding: '24px',
    background: 'linear-gradient(135deg, #FFF5F2 0%, #FFFFFF 100%)',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 2, 68, 0.1)',
    border: '3px solid #FB4F14'
  },

  instacartButton: {
    width: '100%',
    padding: '24px',
    background: 'linear-gradient(135deg, #FB4F14 0%, #FF6B35 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.3s ease',
    fontSize: '16px',
    fontWeight: '700',
    boxShadow: '0 4px 16px rgba(251, 79, 20, 0.25)',
    gap: '20px',
    position: 'relative',
    overflow: 'hidden'
  },

  buttonIcon: {
    width: '48px',
    height: '48px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },

  buttonContent: {
    flex: 1,
    textAlign: 'left'
  },

  buttonTitle: {
    fontSize: '20px',
    fontWeight: '800',
    margin: '0 0 6px 0',
    letterSpacing: '0.5px',
    textTransform: 'uppercase'
  },

  buttonSubtitle: {
    fontSize: '15px',
    opacity: 0.95,
    margin: 0,
    fontWeight: '500'
  },

  buttonArrow: {
    fontSize: '28px',
    fontWeight: 'bold',
    flexShrink: 0,
    transition: 'transform 0.2s ease',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  checkoutFeatures: {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '2px solid rgba(251, 79, 20, 0.1)'
  },

  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#002244',
    fontSize: '14px',
    fontWeight: '500'
  },

  featureCheck: {
    color: '#FB4F14',
    fontWeight: 'bold',
    fontSize: '16px'
  },

  // Recipe Display Styles
  recipesContainer: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    margin: '20px 0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '2px solid #002244'
  },

  recipesTitle: {
    color: '#002244',
    margin: '0 0 20px 0',
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center'
  },

  recipeCard: {
    background: '#FFF5F2',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px',
    border: '1px solid #FB4F14',
    boxShadow: '0 2px 8px rgba(251,79,20,0.1)'
  },

  recipeHeader: {
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #FB4F14',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  recipeTitle: {
    color: '#002244',
    margin: '0',
    fontSize: '20px',
    fontWeight: 'bold',
    flex: 1
  },

  deleteButton: {
    backgroundColor: '#FF6B6B',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(255,107,107,0.3)',
    minWidth: '40px',
    height: '40px'
  },

  recipeContent: {
    marginBottom: '16px'
  },

  recipeIngredients: {
    color: '#002244',
    fontSize: '14px',
    lineHeight: '1.5',
    marginBottom: '8px'
  },

  recipeMetadata: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    marginBottom: '8px'
  },

  recipeTime: {
    color: '#002244',
    fontSize: '14px',
    fontWeight: '500'
  },

  recipeCalories: {
    color: '#002244',
    fontSize: '14px',
    fontWeight: '500'
  },

  recipeTags: {
    color: '#002244',
    fontSize: '14px',
    fontStyle: 'italic'
  },

  recipeActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },

  recipeButton: {
    padding: '10px 16px',
    background: '#002244',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,34,68,0.2)'
  }
};

export default GroceryListForm;
