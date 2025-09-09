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
import { unified as unifiedRecipeService } from '../services/unifiedRecipeService';

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
  console.log('🛒 Extracting grocery list from AI response...');
  console.log('📄 Text preview:', text.substring(0, 300));
  
  const lines = text.split('\n');
  const groceryItems = [];
  let inGrocerySection = false;
  let inRecipeSection = false;
  
  console.log('📊 Total lines to process:', lines.length);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    
    // Detect recipe sections to avoid parsing them as grocery items
    if (lowerLine.includes('recipe') || lowerLine.includes('instructions') || 
        lowerLine.includes('directions') || lowerLine.includes('method')) {
      inRecipeSection = true;
      inGrocerySection = false;
      continue;
    }
    
    // Detect start of grocery list section
    if (lowerLine.includes('grocery list') || lowerLine.includes('shopping list') || 
        lowerLine === 'produce:' || lowerLine === 'proteins & dairy:' ||
        lowerLine === 'grains & bakery:' || lowerLine === 'pantry:' ||
        lowerLine === 'produce' || lowerLine === 'dairy:' || lowerLine === 'meat & seafood:' ||
        lowerLine === 'pantry items:' || lowerLine === 'frozen:' || lowerLine === 'bakery:') {
      console.log('🛒 Found grocery section start on line', i, ':', line);
      inGrocerySection = true;
      inRecipeSection = false;
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
      lowerLine.includes('this plan emphasizes') ||
      lowerLine.includes('this meal plan')
    )) {
      break;
    }
    
    // If we're in grocery section and not in recipe section, collect items
    if (inGrocerySection && !inRecipeSection) {
      // Match items with bullets, dashes, or numbers
      const itemMatch = line.match(/^[-•*]\s*(.+)$|^\d+\.\s*(.+)$/);
      if (itemMatch) {
        const item = (itemMatch[1] || itemMatch[2]).trim();
        console.log('🥕 Found potential grocery item on line', i, ':', item);
        
        // Skip category headers and empty items
        if (item && !item.endsWith(':') && item.length > 2) {
          // Clean up the item text
          const cleanedItem = item
            .replace(/\*\*/g, '') // Remove markdown bold
            .replace(/\*/g, '')   // Remove markdown italic
            .trim();
          
          if (cleanedItem && !groceryItems.includes(cleanedItem)) {
            console.log('✅ Added grocery item:', cleanedItem);
            groceryItems.push(cleanedItem);
          }
        }
      } else if (line.length > 0 && !line.endsWith(':')) {
        // Handle items without bullets (some AI responses don't use bullets)
        const cleanedItem = line
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .trim();
        
        // Check if it looks like a grocery item (has quantity or common food words)
        if (cleanedItem.match(/^\d+/) || 
            cleanedItem.match(/\b(lb|lbs|oz|cup|cups|tbsp|tsp|dozen|bag|jar|can|bottle)\b/i)) {
          if (!groceryItems.includes(cleanedItem)) {
            groceryItems.push(cleanedItem);
          }
        }
      }
    }
  }
  
  // If no grocery section found, try to extract items from the entire text
  if (groceryItems.length === 0) {
    console.log('No grocery section found, attempting full text extraction...');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for lines that look like grocery items
      if (trimmed.match(/^[-•*]\s*\d+.*(lb|lbs|oz|cup|cups|tbsp|tsp|dozen|bag|jar|can|bottle|bunch|head|clove)/i) ||
          trimmed.match(/^[-•*]\s*\d+\s+\w+/)) {
        const item = trimmed.replace(/^[-•*]\s*/, '').trim();
        if (item && !groceryItems.includes(item)) {
          groceryItems.push(item);
        }
      }
    }
  }
  
  // Return clean list of items, one per line
  console.log(`🛒 Grocery extraction complete: Found ${groceryItems.length} items`);
  console.log('📋 Grocery items:', groceryItems);
  
  const result = groceryItems.join('\n');
  console.log('📄 Final grocery list text:', result);
  
  return result;
}

// Main Component
function GroceryListForm({ 
  currentCart, 
  setCurrentCart, 
  savedRecipes, 
  setSavedRecipes,
  parsedRecipes,
  setParsedRecipes,
  saveCartAsList,
  saveRecipe,
  loadRecipeToCart,
  saveMealPlan
}) {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mergeCart, setMergeCart] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Recipe Manager Modal State
  const [showRecipeManager, setShowRecipeManager] = useState(false);
  const [selectedRecipeForMealPlan, setSelectedRecipeForMealPlan] = useState(null);
  
  // Shopping List Manager Modal State
  const [showShoppingListManager, setShowShoppingListManager] = useState(false);
  const [parsingStats, setParsingStats] = useState(null);
  const [showValidator, setShowValidator] = useState(false);
  const [showInstacartCheckout, setShowInstacartCheckout] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [validatingAll, setValidatingAll] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [ingredientStyle, setIngredientStyle] = useState('basic');
  const [selectedAI] = useState('claude');
  const [mealPlanExpanded, setMealPlanExpanded] = useState(true);
  const [individualExpansionStates, setIndividualExpansionStates] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [recipes, setRecipes] = useState([]);
  const [waitingForAIResponse, setWaitingForAIResponse] = useState(false);
  const [recipeUrl, setRecipeUrl] = useState('');
  const [aiRecipeText, setAiRecipeText] = useState('');
  const [showRecipeImport, setShowRecipeImport] = useState(false);
  const [importingRecipe, setImportingRecipe] = useState(false);
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
                includeInstructions: true,
                formatAsList: true,
                structuredFormat: true,
                formatInstruction: `Please provide COMPLETE recipes with:

RECIPE FORMAT:
Recipe Name: [Name]
Servings: [Number]
Prep Time: [Minutes]
Cook Time: [Minutes]

Ingredients:
- [List each ingredient with quantities]

Instructions:
1. [Step-by-step cooking instructions]
2. [Continue with all steps]

Notes: [Any tips or variations]

Then provide:
Grocery List:
[Complete shopping list with all ingredients]

Please ensure each recipe has FULL cooking instructions, not just ingredient lists.`
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
          
          // 🎯 NEW: Use structured data directly from AI instead of manual parsing
          if (aiData.structuredData && aiData.recipes) {
            console.log('🎉 Using AI-generated structured data:', aiData.structuredData.type);
            console.log(`📊 Found ${aiData.recipes.length} recipes and ${aiData.products.length} products`);
            
            // Store structured recipes directly (no parsing needed!)
            if (aiData.recipes.length > 0) {
              console.log('📝 Setting structured recipes from AI:', aiData.recipes.map(r => r.name));
              setRecipes(aiData.recipes);
              
              // Enhanced debugging for each recipe
              aiData.recipes.forEach((recipe, index) => {
                console.log(`🔍 Recipe ${index + 1} Debug:`, {
                  name: recipe.name,
                  ingredients: recipe.ingredients?.length || 0,
                  instructions: recipe.instructions?.length || 0,
                  servings: recipe.servings,
                  prepTime: recipe.prepTime,
                  ingredientsPreview: recipe.ingredients?.slice(0, 2),
                  instructionsPreview: recipe.instructions?.slice(0, 1)
                });
              });
            }
            
            // 🎯 Use structured products directly from AI (no manual parsing!)
            if (aiData.products && aiData.products.length > 0) {
              console.log(`📦 Using ${aiData.products.length} AI-generated products directly`);
              
              // Convert structured products to grocery list format
              const groceryItems = aiData.products.map(product => {
                const quantity = product.quantity || '1';
                const unit = product.unit ? ` ${product.unit}` : '';
                const name = product.productName || product.name;
                return `• ${quantity}${unit} ${name}`;
              });
              
              const groceryListText = groceryItems.join('\n');
              setInputText(groceryListText);
              
              // Also update via ref as a backup
              if (textareaRef.current) {
                textareaRef.current.value = groceryListText;
              }
              
              console.log('✅ Set grocery list from structured AI data');
            } else {
              console.log('⚠️ No products found in structured data, checking fallback...');
              
              // Fallback to legacy groceryList format if available
              if (aiData.groceryList && aiData.groceryList.length > 0) {
                const fallbackList = aiData.groceryList.map(item => `• ${item}`).join('\n');
                setInputText(fallbackList);
                if (textareaRef.current) {
                  textareaRef.current.value = fallbackList;
                }
                console.log('✅ Used fallback grocery list format');
              }
            }
            
            // Trigger textarea auto-expansion after content is loaded
            setTimeout(() => {
              expandTextarea();
            }, 50);
            
            // Clear loading states but keep waitingForAIResponse true for next click
            clearInterval(progressInterval);
            clearTimeout(overlaySafety);
            setIsLoading(false);
            setShowProgress(false);
            setParsingProgress(0);
            // Keep waitingForAIResponse true so next click will parse to cart
            
            // Show success feedback
            const successMessage = `✅ ${selectedAI === 'claude' ? 'Claude' : 'ChatGPT'} has generated your list! Review it and hit CARTSMASH to add items to cart.`;
            console.log(successMessage);
            
            // Small delay to ensure state updates
            setTimeout(() => {
              console.log('Input text updated to:', inputText.substring(0, 50) + '...');
            }, 100);
            
          } else {
            // Fallback for non-structured responses (legacy support)
            console.log('⚠️ No structured data found, using legacy text parsing...');
            
            // Extract the response text using our helper function
            const aiResponseText = extractAIResponseText(aiData);
            
            if (aiResponseText) {
              // Basic text extraction for grocery list
              const cleanGroceryList = extractGroceryListOnly(aiResponseText);
              setInputText(cleanGroceryList);
              
              if (textareaRef.current) {
                textareaRef.current.value = cleanGroceryList;
              }
              console.log('✅ Used legacy text parsing fallback');
            } else {
              console.error('No usable response found in AI data:', Object.keys(aiData));
              throw new Error('AI response was empty');
            }
          }
          
          // Clear loading states but keep waitingForAIResponse true for next click
          clearInterval(progressInterval);
          clearTimeout(overlaySafety);
          setIsLoading(false);
          setShowProgress(false);
          setParsingProgress(0);
          // Keep waitingForAIResponse true so next click will parse to cart
          
          // Show success feedback
          const successMessage = `✅ ${selectedAI === 'claude' ? 'Claude' : 'ChatGPT'} has generated your list! Review it and hit CARTSMASH to add items to cart.`;
          console.log(successMessage);
          
          // Small delay to ensure state updates
          setTimeout(() => {
            console.log('Input text updated to:', inputText.substring(0, 50) + '...');
          }, 100);
          
          // Exit here - user needs to review and hit CARTSMASH again
          return;
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
      
      // Clear AI waiting state since we're now parsing
      setWaitingForAIResponse(false);
      
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
      console.log('🌐 API Request Details:', {
        url: `${API_URL}/api/cart/parse`,
        textLength: textToParse.length,
        textPreview: textToParse.substring(0, 100),
        action: mergeCart ? 'merge' : 'replace',
        userId: currentUser?.uid || null
      });

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

      console.log('📡 API Response Status:', response.status, response.statusText);

      clearInterval(progressInterval);
      setParsingProgress(100);

      const data = await response.json();
      
      console.log('📊 API Response Data:', {
        success: data.success,
        cartLength: data.cart?.length || 0,
        totalItems: data.totalItems,
        itemsAdded: data.itemsAdded,
        errorMessage: data.error || 'none'
      });

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
        console.log('❌ Parsing failed or no items found:', {
          success: data.success,
          hasCart: !!data.cart,
          cartLength: data.cart?.length || 0,
          errorMessage: data.error || 'Unknown error'
        });
        setError(data.error || 'No valid grocery items found in the text');
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

  // Emergency recipe creation when standard extraction fails
  const createEmergencyRecipes = (text) => {
    console.log('🚨 Emergency recipe creation starting...');
    const recipes = [];
    const lines = text.split('\n');
    
    // Look for any food-related words that could be recipe names
    const foodKeywords = [
      'chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 'pasta', 'rice', 
      'salad', 'soup', 'sandwich', 'pizza', 'tacos', 'burrito', 'stir fry',
      'casserole', 'curry', 'stew', 'omelet', 'pancakes', 'oatmeal', 'smoothie',
      'burgers', 'chili', 'lasagna', 'spaghetti', 'quinoa', 'vegetables'
    ];
    
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.length < 5 || cleanLine.length > 60) continue;
      
      // Check if line contains food keywords
      const lowerLine = cleanLine.toLowerCase();
      const hasFood = foodKeywords.some(keyword => lowerLine.includes(keyword));
      
      if (hasFood && !lowerLine.includes('grocery') && !lowerLine.includes('shopping') && !lowerLine.includes('list')) {
        // Generate better instructions based on recipe type
        let instructions = [];
        if (lowerLine.includes('wrap')) {
          instructions = [
            '1. Lay the tortilla flat on a clean surface',
            '2. Spread mayo or mustard evenly across the tortilla',
            '3. Layer the protein and cheese in the center',
            '4. Add fresh vegetables on top',
            '5. Season with salt and pepper to taste',
            '6. Fold the bottom edge up, then roll tightly from one side',
            '7. Cut in half diagonally and serve immediately'
          ];
        } else if (lowerLine.includes('sandwich')) {
          instructions = [
            '1. Toast the bread slices lightly if desired',
            '2. Spread mayo or mustard on one or both slices',
            '3. Layer the protein and cheese',
            '4. Add vegetables and seasonings',
            '5. Top with the second bread slice',
            '6. Cut diagonally and serve'
          ];
        } else if (lowerLine.includes('salad')) {
          instructions = [
            '1. Wash and dry all vegetables thoroughly',
            '2. Chop or slice ingredients as needed',
            '3. Combine all ingredients in a large bowl',
            '4. Drizzle with dressing and toss gently',
            '5. Serve immediately'
          ];
        } else {
          instructions = [`Prepare ${cleanLine} according to your preferred cooking method.`];
        }
        
        recipes.push({
          title: cleanLine,
          ingredients: inferIngredientsFromRecipeName(cleanLine),
          instructions: instructions,
          mealType: lowerLine.includes('breakfast') ? 'Breakfast' : 
                   lowerLine.includes('lunch') ? 'Lunch' : 'Dinner',
          tags: ['ai_generated', 'emergency_extracted'],
          notes: 'This recipe was automatically generated from AI response.',
          id: `emergency_recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        
        // Remove artificial limit - parse all recipes found
      }
    }
    
    console.log(`🆘 Emergency extraction created ${recipes.length} recipes`);
    return recipes;
  };

  // Transform recipes to unified format
  const transformToUnifiedFormat = (recipes) => {
    return recipes.map(recipe => ({
      id: recipe.id || `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: recipe.title || recipe.name || 'Untitled Recipe',
      description: recipe.description || recipe.notes || '',
      icon: getMealTypeIcon(recipe.mealType || 'Dinner'),
      mealType: recipe.mealType || 'Dinner',
      ingredients: (recipe.ingredients || []).map(ing => ({
        quantity: null,
        unit: null,
        item: typeof ing === 'string' ? ing : ing.item || ing.name || ing,
        original: typeof ing === 'string' ? ing : ing.original || ing.item || ing.name || ing
      })),
      instructions: (recipe.instructions || []).map(inst => ({
        instruction: typeof inst === 'string' ? inst : inst.instruction || inst.step || inst
      })),
      prepTime: recipe.prepTime || null,
      cookTime: recipe.cookTime || null,
      totalTime: recipe.totalTime || null,
      servings: recipe.servings || null,
      difficulty: recipe.difficulty || null,
      nutrition: recipe.nutrition || {},
      tags: recipe.tags || ['ai_generated'],
      source: 'AI Generated',
      sourceUrl: recipe.sourceUrl || null,
      imageUrl: recipe.imageUrl || null,
      dayAssigned: recipe.day || recipe.dayAssigned || null,
      mealTypePlanning: recipe.mealType || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Keep original fields for backward compatibility
      day: recipe.day,
      notes: recipe.notes
    }));
  };

  // Get meal type icon
  const getMealTypeIcon = (mealType) => {
    switch(mealType?.toLowerCase()) {
      case 'breakfast': return '🍳';
      case 'lunch': return '🥗';
      case 'dinner': return '🍽️';
      case 'snack': return '🍪';
      default: return '🍳';
    }
  };

  // Helper function to generate detailed instructions from recipe name
  const generateInstructionsFromRecipeName = (recipeName) => {
    const name = recipeName.toLowerCase();
    
    if (name.includes('oatmeal') || name.includes('oats')) {
      return [
        '1. Bring 1 cup water and pinch of salt to boil in a small saucepan',
        '2. Stir in 1/2 cup rolled oats and reduce heat to medium-low',
        '3. Cook for 5-7 minutes, stirring occasionally until creamy',
        '4. Remove from heat and stir in milk to desired consistency',
        '5. Top with berries and drizzle with honey',
        '6. Serve hot and enjoy'
      ];
    } else if (name.includes('wrap')) {
      return [
        '1. Lay the tortilla flat on a clean surface',
        '2. Spread mayo or mustard evenly across the tortilla',
        '3. Layer the protein and cheese in the center',
        '4. Add fresh vegetables on top',
        '5. Season with salt and pepper to taste',
        '6. Fold the bottom edge up, then roll tightly from one side',
        '7. Cut in half diagonally and serve immediately'
      ];
    } else if (name.includes('sandwich')) {
      return [
        '1. Toast the bread slices lightly if desired',
        '2. Spread mayo or mustard on one or both slices',
        '3. Layer the protein and cheese',
        '4. Add vegetables and seasonings',
        '5. Top with the second bread slice',
        '6. Cut diagonally and serve'
      ];
    } else if (name.includes('salad')) {
      return [
        '1. Wash and dry all vegetables thoroughly',
        '2. Chop or slice ingredients as needed',
        '3. Combine all ingredients in a large bowl',
        '4. Drizzle with dressing and toss gently',
        '5. Serve immediately'
      ];
    } else if (name.includes('scrambled') && name.includes('eggs')) {
      return [
        '1. Crack eggs into a bowl and whisk with salt and pepper',
        '2. Heat butter in a non-stick pan over medium-low heat',
        '3. Pour in eggs and let sit for 20 seconds',
        '4. Gently stir with a spatula, pushing eggs from edges to center',
        '5. Continue stirring gently until eggs are just set',
        '6. Remove from heat and serve immediately'
      ];
    } else if (name.includes('smoothie')) {
      return [
        '1. Add frozen fruits to blender first',
        '2. Pour in liquid (milk, yogurt, or juice)',
        '3. Add any sweeteners or protein powder',
        '4. Blend on high for 60-90 seconds until smooth',
        '5. Add ice if needed for consistency',
        '6. Pour into glass and serve immediately'
      ];
    } else if (name.includes('stir') && name.includes('fry')) {
      return [
        '1. Heat oil in a large wok or skillet over high heat',
        '2. Add protein and cook until nearly done, remove',
        '3. Add aromatics (garlic, ginger) and stir for 30 seconds',
        '4. Add vegetables and stir-fry for 2-3 minutes',
        '5. Return protein to pan and add sauce',
        '6. Toss everything together for 1 minute and serve'
      ];
    } else {
      return [`Prepare ${recipeName} according to your preferred cooking method.`];
    }
  };

  // Helper function to infer basic ingredients from recipe name
  const inferIngredientsFromRecipeName = (recipeName) => {
    const name = recipeName.toLowerCase();
    const ingredients = [];
    
    // Common ingredients based on recipe name patterns
    if (name.includes('oatmeal') || name.includes('oats')) {
      ingredients.push('Rolled oats', 'Milk', 'Salt');
      if (name.includes('berries')) ingredients.push('Mixed berries');
      if (name.includes('honey')) ingredients.push('Honey');
    } else if (name.includes('sandwich') || name.includes('sandwiches') || name.includes('wrap') || name.includes('wraps')) {
      // Base wrap/sandwich ingredients
      if (name.includes('wrap')) {
        ingredients.push('Large flour tortilla', 'Lettuce leaves');
      } else {
        ingredients.push('Whole wheat bread', 'Lettuce');
      }
      
      // Protein additions
      if (name.includes('turkey')) ingredients.push('Sliced turkey breast', 'Mayo or mustard');
      if (name.includes('ham')) ingredients.push('Ham slices', 'Swiss cheese');
      if (name.includes('chicken')) ingredients.push('Grilled chicken breast', 'Mayo');
      
      // Vegetable additions
      if (name.includes('avocado')) ingredients.push('Fresh avocado', 'Lime juice', 'Salt', 'Pepper');
      if (name.includes('tomato')) ingredients.push('Tomato slices');
      if (name.includes('cucumber')) ingredients.push('Cucumber slices');
      if (name.includes('vegetables') || name.includes('fresh')) {
        ingredients.push('Cucumber slices', 'Tomato slices', 'Red onion', 'Bell pepper strips');
      }
      
      // Cheese additions
      if (name.includes('cheese') && !ingredients.some(ing => ing.includes('cheese'))) {
        ingredients.push('Cheese slices');
      }
    } else if (name.includes('yogurt')) {
      ingredients.push('Greek yogurt');
      if (name.includes('granola')) ingredients.push('Granola');
      if (name.includes('berries')) ingredients.push('Mixed berries');
    } else if (name.includes('toast')) {
      // Toast-based dishes
      if (name.includes('whole grain') || name.includes('wholegrain')) {
        ingredients.push('Whole grain bread');
      } else if (name.includes('sourdough')) {
        ingredients.push('Sourdough bread');
      } else {
        ingredients.push('Bread');
      }
      
      // Common toast toppings
      if (name.includes('eggs') || name.includes('scrambled')) {
        ingredients.push('Eggs', 'Butter', 'Salt', 'Pepper');
      }
      if (name.includes('avocado')) ingredients.push('Avocado', 'Lime juice', 'Salt');
      if (name.includes('butter')) ingredients.push('Butter');
      if (name.includes('jam') || name.includes('jelly')) ingredients.push('Jam');
    } else if (name.includes('eggs')) {
      ingredients.push('Eggs');
      if (name.includes('scrambled')) ingredients.push('Butter', 'Salt', 'Pepper');
      if (name.includes('spinach')) ingredients.push('Fresh spinach');
      if (name.includes('cheese')) ingredients.push('Cheese');
    } else if (name.includes('chicken')) {
      ingredients.push('Chicken breast');
      if (name.includes('baked')) ingredients.push('Olive oil', 'Salt', 'Pepper');
      if (name.includes('caesar')) ingredients.push('Romaine lettuce', 'Caesar dressing');
    } else if (name.includes('salmon')) {
      ingredients.push('Salmon fillet', 'Olive oil', 'Lemon');
      if (name.includes('rice')) ingredients.push('Brown rice');
      if (name.includes('broccoli')) ingredients.push('Fresh broccoli');
    } else if (name.includes('quinoa')) {
      ingredients.push('Quinoa');
      if (name.includes('chickpeas')) ingredients.push('Chickpeas');
      if (name.includes('bowls')) ingredients.push('Mixed vegetables');
    } else if (name.includes('stir') && name.includes('fry')) {
      ingredients.push('Mixed vegetables', 'Soy sauce', 'Garlic', 'Ginger');
      if (name.includes('beef')) ingredients.push('Beef strips');
      if (name.includes('chicken')) ingredients.push('Chicken strips');
    } else if (name.includes('salad')) {
      // Base salad ingredients
      ingredients.push('Mixed greens');
      
      // Specific salad types
      if (name.includes('greek')) {
        ingredients.push('Tomatoes', 'Cucumbers', 'Red onion', 'Kalamata olives', 'Feta cheese', 'Olive oil', 'Red wine vinegar', 'Oregano');
      } else if (name.includes('caesar')) {
        ingredients.push('Romaine lettuce', 'Parmesan cheese', 'Caesar dressing', 'Croutons');
      } else if (name.includes('garden')) {
        ingredients.push('Tomatoes', 'Cucumbers', 'Carrots', 'Bell peppers', 'Red onion');
      } else {
        ingredients.push('Olive oil', 'Vinegar');
      }
      
      // Protein additions
      if (name.includes('chicken')) ingredients.push('Grilled chicken breast');
      if (name.includes('salmon')) ingredients.push('Grilled salmon');
      if (name.includes('shrimp')) ingredients.push('Cooked shrimp');
      
    } else if (name.includes('pasta')) {
      // Base pasta
      if (name.includes('whole wheat') || name.includes('wholemeal')) {
        ingredients.push('Whole wheat pasta');
      } else if (name.includes('penne')) {
        ingredients.push('Penne pasta');
      } else if (name.includes('spaghetti')) {
        ingredients.push('Spaghetti');
      } else if (name.includes('linguine')) {
        ingredients.push('Linguine');
      } else {
        ingredients.push('Pasta');
      }
      
      // Sauces
      if (name.includes('marinara')) {
        ingredients.push('Marinara sauce', 'Garlic', 'Onion');
      } else if (name.includes('tomato')) {
        ingredients.push('Tomato sauce');
      } else if (name.includes('pesto')) {
        ingredients.push('Pesto sauce');
      } else if (name.includes('alfredo')) {
        ingredients.push('Alfredo sauce');
      } else if (name.includes('carbonara')) {
        ingredients.push('Eggs', 'Parmesan cheese', 'Bacon', 'Black pepper');
      } else {
        ingredients.push('Olive oil');
      }
      
      // Protein additions
      if (name.includes('meatballs')) ingredients.push('Ground beef', 'Breadcrumbs', 'Egg', 'Italian seasoning');
      if (name.includes('chicken')) ingredients.push('Chicken breast');
      if (name.includes('shrimp')) ingredients.push('Shrimp');
    } else if (name.includes('nuts')) {
      ingredients.push('Mixed nuts');
    } else if (name.includes('cheese') && name.includes('crackers')) {
      ingredients.push('String cheese', 'Crackers');
    } else {
      // Generic fallback - extract key food words and expand them
      const name_processed = name.replace(/\b(with|and|&)\b/g, ' '); // Remove connecting words
      
      // Common ingredients mapping
      const ingredientMap = {
        'chicken': ['Chicken breast'],
        'beef': ['Beef'],
        'fish': ['Fish fillet'],
        'salmon': ['Salmon fillet'],
        'turkey': ['Turkey'],
        'pork': ['Pork'],
        'rice': ['Rice'],
        'bread': ['Bread'],
        'cheese': ['Cheese'],
        'eggs': ['Eggs'],
        'milk': ['Milk'],
        'butter': ['Butter'],
        'onion': ['Onion'],
        'garlic': ['Garlic'],
        'tomato': ['Tomatoes'],
        'lettuce': ['Lettuce'],
        'spinach': ['Spinach'],
        'broccoli': ['Broccoli'],
        'carrots': ['Carrots'],
        'potatoes': ['Potatoes'],
        'mushrooms': ['Mushrooms'],
        'peppers': ['Bell peppers'],
        'beans': ['Beans'],
        'avocado': ['Avocado'],
        'bacon': ['Bacon'],
        'ham': ['Ham'],
        'sausage': ['Sausage'],
        'shrimp': ['Shrimp'],
        'meatballs': ['Ground beef', 'Breadcrumbs', 'Egg'],
        'marinara': ['Marinara sauce'],
        'alfredo': ['Alfredo sauce'],
        'pesto': ['Pesto sauce'],
        'parmesan': ['Parmesan cheese'],
        'mozzarella': ['Mozzarella cheese'],
        'basil': ['Fresh basil'],
        'oregano': ['Oregano'],
        'thyme': ['Thyme']
      };
      
      // Find all matching ingredients
      Object.keys(ingredientMap).forEach(key => {
        if (name_processed.includes(key)) {
          ingredients.push(...ingredientMap[key]);
        }
      });
      
      // If still no ingredients found, add basic ones based on common patterns
      if (ingredients.length === 0) {
        // Try to extract any food-sounding words
        const foodWords = name.match(/\b[a-z]{4,}(s)?\b/g) || [];
        const likelyFoods = foodWords.filter(word => 
          !['with', 'and', 'the', 'for', 'this', 'that', 'from', 'your', 'some', 'very', 'much', 'good', 'best', 'easy', 'quick', 'fresh', 'healthy'].includes(word)
        );
        
        if (likelyFoods.length > 0) {
          ingredients.push(...likelyFoods.slice(0, 3).map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ));
        }
      }
    }
    
    // Ensure we have at least some basic ingredients
    if (ingredients.length === 0) {
      ingredients.push('Basic ingredients needed');
    }
    
    return ingredients;
  };

  // Extract single recipe from text (simplified parsing for single recipe content)
  const extractSingleRecipeFromText = (text) => {
    const lines = text.split('\n');
    let recipeName = '';
    let ingredients = [];
    let instructions = [];
    let currentSection = '';
    
    console.log('🔍 Single recipe extraction starting...');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Get recipe name from first significant header
      if (!recipeName && line.match(/^#\s*(.+)/)) {
        recipeName = line.replace(/^#\s*/, '').trim();
        console.log('📝 Found recipe name:', recipeName);
        continue;
      }
      
      // Detect ingredient sections (but don't treat as recipe names)
      if (line.match(/^##?\s*(Ingredients?|Main Components?|Sauce|Garnish|Protein|Dairy|Vegetables?|Spices?|Seasonings?)\s*$/i)) {
        currentSection = 'ingredients';
        console.log('📝 Found ingredients section:', line);
        continue;
      }
      
      // Detect instruction sections
      if (line.match(/^##?\s*(Instructions?|Directions?|Method|Steps|Preparation)\s*$/i)) {
        currentSection = 'instructions';
        console.log('👨‍🍳 Found instructions section:', line);
        continue;
      }
      
      // Parse content based on current section  
      if (currentSection === 'ingredients') {
        // Handle bulleted ingredients
        if (line.match(/^[-*•]\s*(.+)/)) {
          const ingredient = line.replace(/^[-*•]\s*/, '').trim();
          if (ingredient) {
            ingredients.push(ingredient);
            console.log('🥕 Added ingredient:', ingredient);
          }
        }
        // Handle plain text ingredients (lines that look like ingredients)
        else if (line.match(/^\d+.*\b(cups?|tbsp|tsp|oz|lbs?|g|kg|ml|l|cloves?|pieces?)\b/i) || 
                 line.match(/^[A-Z][a-z]+.*\b(salt|pepper|oil|butter|cheese|garlic|onion)\b/i)) {
          ingredients.push(line);
          console.log('🥕 Added plain ingredient:', line);
        }
      } else if (currentSection === 'instructions') {
        // Handle numbered instructions (1. 2. 3.)
        if (line.match(/^\d+\.\s*(.+)/)) {
          const instruction = line.replace(/^\d+\.\s*/, '').trim();
          if (instruction) {
            instructions.push(instruction);
            console.log('📋 Added numbered instruction:', instruction);
          }
        }
        // Handle bold instruction headers (**Header**)
        else if (line.match(/^\*\*(.+)\*\*$/)) {
          const header = line.replace(/^\*\*(.+)\*\*$/, '$1').trim();
          if (header) {
            instructions.push(header);
            console.log('📋 Added instruction header:', header);
          }
        }
        // Handle detailed instruction text (longer lines that aren't headers)
        else if (line.length > 15 && 
                 !line.match(/^(##?|Serves?|Prep|Cook|Total|\*\*)/i) &&
                 !line.match(/^[-*•]/) && // Not bullet points
                 line.match(/[a-z]/) && // Contains lowercase letters (likely descriptive text)
                 (line.includes(' and ') || line.includes(' until ') || line.includes(' for ') || 
                  line.includes(' with ') || line.includes(' over ') || line.includes(' in ') ||
                  line.match(/\b(cook|add|mix|stir|heat|place|remove|season|serve|garnish)\b/i))) {
          instructions.push(line);
          console.log('📋 Added detailed instruction:', line);
        }
      }
    }
    
    // If very few ingredients found, scan entire text for ingredient-like lines
    if (ingredients.length <= 2) {
      console.log('🔍 Scanning entire text for additional ingredients...');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && 
            !trimmed.match(/^#/) && // Not headers
            !trimmed.match(/^(Instructions?|Directions?|Method|Steps|Preparation)/i) && // Not instruction headers
            (trimmed.match(/^\d+.*\b(cups?|tbsp|tsp|oz|lbs?|g|kg|ml|l|cloves?|pieces?|strips?|slices?)\b/i) || 
             trimmed.match(/\b(chicken|beef|pork|salmon|pasta|rice|garlic|onion|salt|pepper|oil|butter|cheese|eggs?|milk|flour|sugar)\b/i))) {
          if (!ingredients.includes(trimmed)) {
            ingredients.push(trimmed);
            console.log('🥕 Scanned ingredient:', trimmed);
          }
        }
      }
    }
    
    // If still no ingredients found, try to infer from recipe name
    if (ingredients.length === 0 && recipeName) {
      ingredients = inferIngredientsFromRecipeName(recipeName);
      console.log('🔍 Inferred ingredients from recipe name:', ingredients);
    }
    
    // If instructions are too brief (only headers), scan for detailed steps
    if (instructions.length <= 6 && instructions.every(inst => inst.length < 30)) {
      console.log('🔍 Instructions appear to be headers only, scanning for detailed steps...');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && 
            line.length > 20 && // Longer lines likely to be detailed instructions
            !line.match(/^(#|##|###|\*\*.*\*\*|Ingredients?|Instructions?|Serves?|Prep|Cook|Total)/i) &&
            (line.match(/\b(cook|add|mix|stir|heat|place|remove|season|serve|garnish|combine|drain|slice|chop|dice|sauté|boil|simmer|bake|roast)\b/i) ||
             line.includes(' until ') || line.includes(' for ') || line.includes(' with ') || 
             line.includes(' over ') || line.includes(' in ') || line.includes(' and '))) {
          
          // Don't add if it's already included
          if (!instructions.some(existing => existing.includes(line.substring(0, 20)))) {
            instructions.push(line);
            console.log('🔍 Scanned detailed instruction:', line);
          }
        }
      }
    }
    
    // If still no detailed instructions found, generate basic ones
    if (instructions.length === 0 && recipeName) {
      instructions = [`Prepare ${recipeName} according to your preferred cooking method.`];
      console.log('🔍 Generated basic instruction');
    }
    
    const recipe = {
      title: recipeName || 'Untitled Recipe',
      ingredients: ingredients,
      instructions: instructions.map((inst, index) => ({ step: index + 1, instruction: inst })),
      servings: '',
      prepTime: '',
      cookTime: '',
      mealType: 'Dinner',
      day: '',
      tags: ['ai_generated', 'single_recipe'],
      notes: '',
      id: `single_recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    console.log('✅ Single recipe extraction complete:', {
      name: recipe.title,
      ingredients: recipe.ingredients.length,
      instructions: recipe.instructions.length
    });
    
    return {
      isMealPlan: true, // Still return as meal plan format for compatibility
      recipes: [recipe], // Single recipe in array
      totalRecipes: 1
    };
  };

  // Extract multiple recipes from a meal plan
  const extractMealPlanRecipes = (text) => {
    const recipes = [];
    const lines = text.split('\n');
    let currentRecipe = null;
    let currentSection = '';
    let currentDay = '';
    let captureNextAsRecipeName = false;
    
    console.log('🔍 Enhanced recipe extraction starting...');
    console.log('📊 Total lines to process:', lines.length);
    
    // Smart detection: Is this a single recipe or a meal plan?
    const dayIndicators = text.match(/\b(Day\s+[1-7]|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi) || [];
    const mealTypeCount = (text.match(/\b(Breakfast|Lunch|Dinner|Snack)\b/gi) || []).length;
    const recipeHeaders = text.match(/^(##?\s+)?(Day\s+\d+|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/gmi) || [];
    const multipleRecipeIndicators = text.match(/^(##?\s+)?[-*]\s*(Breakfast|Lunch|Dinner):\s*/gmi) || [];
    const singleRecipeIndicators = text.match(/^#\s+[^(Day|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)]/gmi) || [];
    
    // More sophisticated detection
    const hasMultipleDays = dayIndicators.length >= 3;
    const hasMultipleMealTypes = mealTypeCount >= 8; // 7-day plan would have ~21-28 meal types
    const hasMultipleRecipeHeaders = recipeHeaders.length >= 3;
    const hasListedMeals = multipleRecipeIndicators.length >= 3;
    const appearsToBeRecipe = singleRecipeIndicators.length >= 1 && !hasMultipleDays;
    
    const isTrueMealPlan = (hasMultipleDays || hasMultipleMealTypes || hasMultipleRecipeHeaders || hasListedMeals) && !appearsToBeRecipe;
    
    console.log('🔍 Content analysis:', {
      dayIndicators: dayIndicators.length,
      mealTypeCount: mealTypeCount,
      recipeHeaders: recipeHeaders.length,
      multipleRecipeIndicators: multipleRecipeIndicators.length,
      singleRecipeIndicators: singleRecipeIndicators.length,
      hasMultipleDays: hasMultipleDays,
      hasMultipleMealTypes: hasMultipleMealTypes,
      appearsToBeRecipe: appearsToBeRecipe,
      isTrueMealPlan: isTrueMealPlan
    });
    
    // If this looks like a single recipe, use simpler parsing
    if (!isTrueMealPlan) {
      console.log('📝 Content appears to be a single recipe, using simplified parsing...');
      return extractSingleRecipeFromText(text);
    }
    
    console.log('📅 Content appears to be a multi-day meal plan, using full parsing...');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines but don't reset section
      if (!line) continue;
      
      // Detect day headers (enhanced patterns)
      const dayMatch = line.match(/^(Day\s+\d+|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Week\s+\d+)[\s:]*(-.*)?$/i) ||
                       line.match(/^##\s+(Day\s+\d+|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
      if (dayMatch) {
        currentDay = dayMatch[1].replace(':', '').trim();
        console.log('📅 Found day header:', currentDay);
        continue;
      }
      
      // Detect meal type headers (enhanced patterns)
      const mealTypeMatch = line.match(/^(Breakfast|Lunch|Dinner|Snack|Snacks)[\s:]*$/i) ||
                           line.match(/^###?\s+(Breakfast|Lunch|Dinner|Snack|Snacks)/i) ||
                           line.match(/^\*\*(Breakfast|Lunch|Dinner|Snack|Snacks)\*\*/i);
      if (mealTypeMatch) {
        captureNextAsRecipeName = true;
        currentSection = ''; // Reset section when new meal starts
        console.log('🍽️ Found meal type header:', mealTypeMatch[1]);
        continue;
      }
      
      // Detect recipe patterns (exclude section headers) - enhanced for AI responses
      const recipeStartPatterns = [
        /^(Breakfast|Lunch|Dinner|Snack):\s*(.+)/i,  // "Breakfast: Oatmeal"
        /^-\s*(Breakfast|Lunch|Dinner|Snack):\s*(.+)/i, // "- Breakfast: Oatmeal with berries"
        /^\*\s*(Breakfast|Lunch|Dinner|Snack):\s*(.+)/i, // "* Lunch: Turkey sandwich"
        /^Recipe Name:\s*(.+)/i,                       // "Recipe Name: Chicken Stir-fry"
        /^Recipe:\s*(.+)/i,                           // "Recipe: Pasta"
        /^##\s+(?!(?:Ingredients?|Instructions?|Directions?|Method|Steps|Preparation|Notes?|Tips?|Grocery|Shopping|Main Components?|Sauce|Garnish|Protein|Dairy|Vegetables?|Spices?|Seasonings?)\s*$)(.+)/i, // "## Recipe Title" but not section headers
        /^###\s+(?!(?:Ingredients?|Instructions?|Directions?|Method|Steps|Preparation|Notes?|Tips?|Grocery|Shopping|Main Components?|Sauce|Garnish|Protein|Dairy|Vegetables?|Spices?|Seasonings?)\s*$)(.+)/i, // "### Recipe Title" but not section headers  
        /^Day\s+\d+\s*[-–]\s*(Breakfast|Lunch|Dinner|Snack):\s*(.+)/i, // "Day 1 - Breakfast: Oatmeal"
        /^\d+\.\s+(.+(?:recipe|meal|dish).*)/i,       // "1. Chicken stir-fry recipe"
        /^[🍳🥗🍽️🥪🍎🥞🥙🍲🍝🥘]\s*(.+)/i           // Emoji-prefixed meals
      ];
      
      let foundRecipe = false;
      
      // Check if this line starts a new recipe
      for (const pattern of recipeStartPatterns) {
        const match = line.match(pattern);
        if (match) {
          // Save previous recipe if exists
          if (currentRecipe && currentRecipe.title) {
            if (currentRecipe.ingredients.length === 0) {
              currentRecipe.ingredients = inferIngredientsFromRecipeName(currentRecipe.title);
            }
            if (currentRecipe.instructions.length === 0) {
              currentRecipe.instructions = generateInstructionsFromRecipeName(currentRecipe.title);
            }
            console.log('💾 Saving recipe:', currentRecipe.title, 
                       `(${currentRecipe.ingredients.length} ingredients)`);
            recipes.push(currentRecipe);
          }
          
          // Extract recipe info based on pattern
          let recipeName = '';
          let mealType = 'Dinner';
          
          if (pattern.toString().includes('Breakfast|Lunch|Dinner|Snack')) {
            // Pattern has meal type
            if (match[2]) {
              // "Breakfast: Recipe Name" format
              mealType = match[1];
              recipeName = match[2].trim();
            } else if (match[1]) {
              // Other formats
              recipeName = match[1].trim();
            }
          } else {
            // No meal type in pattern
            recipeName = match[1].trim();
          }
          
          currentRecipe = {
            title: recipeName,
            ingredients: [],
            instructions: [],
            servings: '',
            prepTime: '',
            cookTime: '',
            mealType: mealType,
            day: currentDay,
            tags: [currentDay || 'meal plan', mealType.toLowerCase()],
            notes: '',
            id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          
          currentSection = '';
          foundRecipe = true;
          console.log(`📝 Found ${mealType} recipe: "${recipeName}"`);
          break;
        }
      }
      
      if (foundRecipe) continue;
      
      // Check if we should capture this line as a recipe name
      if (captureNextAsRecipeName && line && !line.match(/^(Ingredients?|Instructions?|Directions?|Method|Grocery|Shopping)/i)) {
        // Save previous recipe
        if (currentRecipe && currentRecipe.title) {
          if (currentRecipe.ingredients.length === 0) {
            currentRecipe.ingredients = inferIngredientsFromRecipeName(currentRecipe.title);
          }
          if (currentRecipe.instructions.length === 0) {
            currentRecipe.instructions = generateInstructionsFromRecipeName(currentRecipe.title);
          }
          recipes.push(currentRecipe);
        }
        
        // Create new recipe
        currentRecipe = {
          title: line,
          ingredients: [],
          instructions: [],
          servings: '',
          prepTime: '',
          cookTime: '',
          mealType: 'Dinner',
          day: currentDay,
          tags: [currentDay || 'meal plan'],
          notes: '',
          id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        captureNextAsRecipeName = false;
        currentSection = '';
        console.log('📝 Captured recipe name:', line);
        continue;
      }
      
      // If no current recipe, check if this line could be a standalone recipe name
      if (!currentRecipe && !line.match(/^[-•*]/) && !line.match(/^\d+[.\)]/) && 
          line.length > 5 && line.length < 100 &&
          !line.match(/^(Grocery|Shopping|Estimated|Total|Tips|Notes|Ingredients?|Instructions?)/i)) {
        
        // This might be a recipe name without a prefix
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('with') || lowerLine.includes('and') || 
            lowerLine.includes('chicken') || lowerLine.includes('beef') || 
            lowerLine.includes('salmon') || lowerLine.includes('pasta') ||
            lowerLine.includes('salad') || lowerLine.includes('soup') ||
            lowerLine.includes('sandwich') || lowerLine.includes('oatmeal') ||
            lowerLine.includes('eggs') || lowerLine.includes('pancakes') ||
            lowerLine.includes('wrap') || lowerLine.includes('turkey') ||
            lowerLine.includes('avocado') || lowerLine.includes('vegetables') ||
            lowerLine.includes('fresh') || lowerLine.includes('grilled') ||
            lowerLine.includes('baked') || lowerLine.includes('roasted') ||
            lowerLine.includes('stir') || lowerLine.includes('rice') ||
            lowerLine.includes('quinoa') || lowerLine.includes('beans')) {
          
          currentRecipe = {
            title: line,
            ingredients: [],
            instructions: [],
            servings: '',
            prepTime: '',
            cookTime: '',
            mealType: 'Dinner',
            day: currentDay,
            tags: [currentDay || 'meal plan'],
            notes: '',
            id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          
          currentSection = '';
          console.log('📝 Found standalone recipe:', line);
          continue;
        }
      }
      
      // Only process further if we have a current recipe
      if (!currentRecipe) continue;
      
      // Detect metadata
      if (line.match(/^Servings?:/i)) {
        currentRecipe.servings = line.replace(/^Servings?:/i, '').trim();
        continue;
      }
      
      if (line.match(/^Prep\s+Time:|^Preparation\s+Time:/i)) {
        currentRecipe.prepTime = line.replace(/^Prep(?:aration)?\s+Time:/i, '').trim();
        continue;
      }
      
      if (line.match(/^Cook(?:ing)?\s+Time:/i)) {
        currentRecipe.cookTime = line.replace(/^Cook(?:ing)?\s+Time:/i, '').trim();
        continue;
      }
      
      // Detect section headers
      if (line.match(/^Ingredients?:?\s*$/i)) {
        currentSection = 'ingredients';
        console.log('  → Found ingredients section for:', currentRecipe.title);
        continue;
      }
      
      if (line.match(/^(Instructions?|Directions?|Method|Steps?):?\s*$/i)) {
        currentSection = 'instructions';
        console.log('  → Found instructions section for:', currentRecipe.title);
        continue;
      }
      
      if (line.match(/^(Notes?|Tips?):?\s*$/i)) {
        currentSection = 'notes';
        continue;
      }
      
      // Stop processing this recipe if we hit a new section
      if (line.match(/^(Grocery\s+List|Shopping\s+List|Estimated\s+Total|Money-Saving)/i)) {
        currentSection = '';
        continue;
      }
      
      // Add content to current section
      if (currentSection && line) {
        // Clean up the line
        let cleanLine = line
          .replace(/^[-•*]\s*/, '')
          .replace(/^\d+[.)]\s*/, '')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .trim();
        
        if (!cleanLine) continue;
        
        switch (currentSection) {
          case 'ingredients':
            // Skip if it looks like a new section header
            if (!cleanLine.match(/^(Instructions?|Directions?|Method|Steps?|Notes?|Tips?):/i)) {
              currentRecipe.ingredients.push(cleanLine);
              console.log(`    + Added ingredient to ${currentRecipe.title}: ${cleanLine}`);
            }
            break;
            
          case 'instructions':
            if (!cleanLine.match(/^(Notes?|Tips?|Grocery|Shopping):/i)) {
              currentRecipe.instructions.push(cleanLine);
              console.log(`    + Added instruction to ${currentRecipe.title}: ${cleanLine.substring(0, 50)}...`);
            }
            break;
            
          case 'notes':
            currentRecipe.notes += (currentRecipe.notes ? '\n' : '') + cleanLine;
            break;
        }
      } else if (currentRecipe && !currentSection && line) {
        // If we have a recipe but no section, try to guess what this content is
        const cleanLine = line
          .replace(/^[-•*]\s*/, '')
          .replace(/^\d+[.)]\s*/, '')
          .trim();
        
        // Check if it looks like an ingredient (has measurements or common ingredient words)
        if (cleanLine.match(/^\d+\s*(cup|tbsp|tsp|lb|oz|g|kg|ml|l|can|jar|bottle|bunch|cloves?)\b/i) ||
            cleanLine.match(/^(Salt|Pepper|Oil|Butter|Flour|Sugar|Milk|Eggs|Water|Onion|Garlic|Chicken|Beef|Fish|Rice|Pasta)\b/i)) {
          currentRecipe.ingredients.push(cleanLine);
          console.log(`    + Auto-detected ingredient for ${currentRecipe.title}: ${cleanLine}`);
        } else if (cleanLine.match(/^(Heat|Cook|Add|Mix|Stir|Combine|Place|Serve|Season|Chop|Dice|Slice)\b/i)) {
          // Looks like an instruction
          if (currentRecipe.instructions.length === 0) {
            currentSection = 'instructions'; // Switch to instructions mode
          }
          currentRecipe.instructions.push(cleanLine);
          console.log(`    + Auto-detected instruction for ${currentRecipe.title}: ${cleanLine.substring(0, 50)}...`);
        }
      }
    }
    
    // Save the last recipe
    if (currentRecipe && currentRecipe.title) {
      // Add default content if missing
      if (currentRecipe.ingredients.length === 0) {
        console.log('⚠️ No ingredients found for:', currentRecipe.title, '- using inference');
        currentRecipe.ingredients = inferIngredientsFromRecipeName(currentRecipe.title);
      }
      
      if (currentRecipe.instructions.length === 0) {
        currentRecipe.instructions = generateInstructionsFromRecipeName(currentRecipe.title);
      }
      
      console.log('💾 Saving final recipe:', currentRecipe.title, 
                 `(${currentRecipe.ingredients.length} ingredients, ${currentRecipe.instructions.length} steps)`);
      recipes.push(currentRecipe);
    }
    
    // Deduplicate recipes by title
    const seen = new Set();
    const uniqueRecipes = recipes.filter(recipe => {
      const key = recipe.title.toLowerCase().trim();
      if (seen.has(key)) {
        console.log(`🚫 Skipping duplicate recipe: ${recipe.title}`);
        return false;
      }
      seen.add(key);
      return true;
    });
    
    console.log(`✅ Extraction complete: Found ${uniqueRecipes.length} unique recipes (${recipes.length} total, ${recipes.length - uniqueRecipes.length} duplicates removed)`);
    uniqueRecipes.forEach(r => {
      console.log(`  - ${r.day || 'No day'} ${r.mealType}: ${r.title}`);
      console.log(`    Ingredients: ${r.ingredients.length}, Instructions: ${r.instructions.length}`);
    });
    
    return {
      isMealPlan: uniqueRecipes.length > 0,
      recipes: uniqueRecipes,
      totalRecipes: uniqueRecipes.length
    };
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
      recipes.push(...potentialRecipes); // Include all found recipes (removed 3-recipe limit)
    }
    
    console.log(`📝 Parsed ${recipes.length} recipes from AI response`);
    return recipes;
  };

  // Handle adding recipe to recipe library
  const handleAddToRecipeLibrary = (recipe) => {
    // Safely handle ingredients and instructions that might be arrays or strings
    const ingredientsText = Array.isArray(recipe.ingredients) 
      ? recipe.ingredients.join('\n')
      : recipe.ingredients || '';
    
    const instructionsText = Array.isArray(recipe.instructions)
      ? recipe.instructions.join('\n') 
      : recipe.instructions || '';

    const savedRecipe = {
      id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: recipe.title || recipe.name || 'Untitled Recipe',
      ingredients: ingredientsText,
      instructions: instructionsText,
      prepTime: recipe.prepTime || 'Not specified',
      cookTime: recipe.cookTime || 'Not specified',
      calories: recipe.calories || null,
      tags: Array.isArray(recipe.tags) ? recipe.tags : (recipe.tags ? [recipe.tags] : ['ai_generated']),
      createdAt: new Date().toISOString(),
      userId: currentUser?.uid || 'guest',
      source: 'ai_generated'
    };

    console.log('🔲 Adding recipe to library:', savedRecipe);

    // Use the existing saveRecipe function
    if (saveRecipe) {
      saveRecipe(savedRecipe);
      alert(`✅ Recipe "${savedRecipe.name}" added to Recipe Library!`);
    } else {
      alert('❌ Unable to save recipe. Recipe Library not available.');
      console.error('❌ saveRecipe function not available');
    }
  };

  // Handle adding recipe to meal plan
  const handleAddToMealPlan = (recipe) => {
    // Store the recipe and show the manager modal
    setSelectedRecipeForMealPlan(recipe);
    setShowRecipeManager(true);
  };

  // Helper function to get current day of week
  const getDayOfWeek = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  // Recipe Manager Modal Component
  const RecipeManagerModal = ({ recipe, onClose }) => {
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [selectedMealType, setSelectedMealType] = useState(recipe.mealType || 'Dinner');
    const [saveToLibrary, setSaveToLibrary] = useState(true);
    const [quickAddMode, setQuickAddMode] = useState(false);
    const [customName, setCustomName] = useState(recipe.title || '');
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

    const handleSaveMealPlan = async () => {
      try {
        // First save to recipe library if requested
        if (saveToLibrary) {
          handleAddToRecipeLibrary({
            ...recipe,
            title: customName || recipe.title,
            mealType: selectedMealType
          });
        }

        // Create meal plan
        const mealPlan = {
          id: `mealplan_${Date.now()}`,
          name: `${selectedDay} ${selectedMealType} - ${customName || recipe.title}`,
          weekOf: new Date().toISOString().split('T')[0],
          days: {
            [selectedDay]: {
              [selectedMealType]: [{
                id: `recipe_${Date.now()}`,
                title: customName || recipe.title,
                ingredients: recipe.ingredients || [],
                instructions: recipe.instructions || [],
                mealType: selectedMealType,
                source: 'ai_generated'
              }]
            }
          },
          totalMeals: 1,
          recipes: [{
            id: `recipe_${Date.now()}`,
            title: customName || recipe.title,
            ingredients: recipe.ingredients || [],
            instructions: recipe.instructions || [],
            mealType: selectedMealType,
            source: 'ai_generated'
          }],
          shoppingList: {
            items: recipe.ingredients?.map((ingredient, index) => ({
              id: `item_${Date.now()}_${index}`,
              itemName: ingredient,
              productName: ingredient,
              quantity: 1,
              unit: 'item',
              category: 'Other'
            })) || [],
            name: `${customName || recipe.title} - Shopping List`
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Save meal plan
        if (saveMealPlan) {
          const savedPlan = await saveMealPlan(mealPlan);
          if (savedPlan) {
            alert(`✅ Added to meal plan: ${selectedDay} ${selectedMealType}!`);
          }
        }
        
        onClose();
      } catch (error) {
        console.error('Error creating meal plan:', error);
        alert('Failed to create meal plan. Please try again.');
      }
    };

    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modalContent}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>
              {quickAddMode ? '⚡ Quick Add to Meal Plan' : '📅 Add to Meal Plan'}
            </h3>
            <button onClick={onClose} style={styles.closeButton}>✕</button>
          </div>

          <div style={styles.modalBody}>
            {/* Mode Toggle */}
            <div style={styles.modeToggle}>
              <button
                onClick={() => setQuickAddMode(false)}
                style={{
                  ...styles.modeButton,
                  ...(quickAddMode ? {} : styles.modeButtonActive)
                }}
              >
                📝 Full Details
              </button>
              <button
                onClick={() => setQuickAddMode(true)}
                style={{
                  ...styles.modeButton,
                  ...(quickAddMode ? styles.modeButtonActive : {})
                }}
              >
                ⚡ Quick Add
              </button>
            </div>

            {/* Recipe Name */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Recipe Name:</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                style={styles.input}
                placeholder="Enter recipe name..."
              />
            </div>

            {!quickAddMode && (
              <>
                {/* Day Selection */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Select Day:</label>
                  <div style={styles.dayGrid}>
                    {days.map(day => (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        style={{
                          ...styles.dayButton,
                          ...(selectedDay === day ? styles.dayButtonActive : {})
                        }}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Meal Type Selection */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Meal Type:</label>
                  <div style={styles.mealTypeGrid}>
                    {mealTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => setSelectedMealType(type)}
                        style={{
                          ...styles.mealButton,
                          ...(selectedMealType === type ? styles.mealButtonActive : {})
                        }}
                      >
                        {type === 'Breakfast' ? '🍳' : 
                         type === 'Lunch' ? '🥗' :
                         type === 'Dinner' ? '🍽️' : '🍪'} {type}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Save to Library Option */}
            <div style={styles.checkboxGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={saveToLibrary}
                  onChange={(e) => setSaveToLibrary(e.target.checked)}
                  style={styles.checkbox}
                />
                Also save to Recipe Library
              </label>
            </div>

            {/* Preview */}
            {!quickAddMode && (
              <div style={styles.preview}>
                <h4 style={styles.previewTitle}>Preview:</h4>
                <p style={styles.previewText}>
                  📅 <strong>{selectedDay}</strong> - {selectedMealType}<br/>
                  🍳 <strong>{customName || recipe.title}</strong><br/>
                  {recipe.ingredients?.length > 0 && (
                    <>📝 {recipe.ingredients.length} ingredients</>
                  )}
                </p>
              </div>
            )}
          </div>

          <div style={styles.modalFooter}>
            <button onClick={handleSaveMealPlan} style={styles.saveButton}>
              {quickAddMode ? '⚡ Quick Add' : '💾 Save to Meal Plan'}
            </button>
            <button onClick={onClose} style={styles.cancelButton}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // QuickSaveListButton Component  
  const QuickSaveListButton = ({ items, onSave, disabled = false }) => {
    const [isSaving, setIsSaving] = useState(false);

    const handleQuickSave = async () => {
      if (!items || items.length === 0) {
        alert('No items to save!');
        return;
      }

      const listName = `Shopping List ${new Date().toLocaleDateString()}`;
      setIsSaving(true);
      
      try {
        await onSave(listName, items);
        alert(`✅ Quick saved "${listName}"!`);
      } catch (error) {
        console.error('Quick save failed:', error);
        alert('Failed to quick save list');
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <button
        onClick={handleQuickSave}
        disabled={disabled || isSaving || !items || items.length === 0}
        style={{
          ...styles.quickSaveButton,
          opacity: disabled || !items || items.length === 0 ? 0.5 : 1,
          cursor: disabled || !items || items.length === 0 ? 'not-allowed' : 'pointer'
        }}
        onMouseEnter={(e) => {
          if (!disabled && items && items.length > 0) {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 34, 68, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && items && items.length > 0) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 34, 68, 0.2)';
          }
        }}
      >
        {isSaving ? (
          <div style={styles.quickSaveContent}>
            <ButtonSpinner size={16} />
            <span style={{ marginLeft: '8px' }}>Saving...</span>
          </div>
        ) : (
          <div style={styles.quickSaveContent}>
            <span style={styles.quickSaveIcon}>💾</span>
            <span>Quick Save ({items ? items.length : 0} items)</span>
          </div>
        )}
      </button>
    );
  };

  // ShoppingListManager Modal Component
  const ShoppingListManager = ({ items, onClose, onSave }) => {
    const [listName, setListName] = useState(`Shopping List ${new Date().toLocaleDateString()}`);
    const [selectedItems, setSelectedItems] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize selected items when modal opens
    useEffect(() => {
      if (items && items.length > 0) {
        setSelectedItems(items.map(item => item.id));
      }
    }, [items]);

    const toggleItem = (itemId) => {
      setSelectedItems(prev => 
        prev.includes(itemId) 
          ? prev.filter(id => id !== itemId)
          : [...prev, itemId]
      );
    };

    const handleSave = async () => {
      if (!listName.trim()) {
        alert('Please enter a list name');
        return;
      }

      if (selectedItems.length === 0) {
        alert('Please select at least one item');
        return;
      }

      setIsSaving(true);
      try {
        const itemsToSave = items.filter(item => selectedItems.includes(item.id));
        await onSave(listName.trim(), itemsToSave);
        alert(`✅ List "${listName}" saved successfully!`);
        onClose();
      } catch (error) {
        console.error('Save failed:', error);
        alert('Failed to save list. Please try again.');
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div style={styles.modalOverlay} onClick={onClose}>
        <div style={styles.shoppingListModal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>Save Shopping List</h3>
            <button onClick={onClose} style={styles.modalCloseButton}>×</button>
          </div>
          
          <div style={styles.modalBody}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>List Name:</label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                style={styles.modalInput}
                placeholder="Enter list name..."
              />
            </div>

            <div style={styles.itemsSection}>
              <div style={styles.itemsHeader}>
                <span style={styles.itemsTitle}>
                  Items ({selectedItems.length} of {items ? items.length : 0} selected)
                </span>
                <div style={styles.selectionButtons}>
                  <button
                    onClick={() => setSelectedItems(items ? items.map(item => item.id) : [])}
                    style={styles.selectionButton}
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedItems([])}
                    style={styles.selectionButton}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div style={styles.itemsList}>
                {items && items.map((item) => (
                  <div key={item.id} style={styles.itemRow}>
                    <label style={styles.itemLabel}>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                        style={styles.itemCheckbox}
                      />
                      <div style={styles.itemDetails}>
                        <div style={styles.itemName}>{item.productName}</div>
                        <div style={styles.itemInfo}>
                          Qty: {item.quantity} | ${item.price ? item.price.toFixed(2) : 'N/A'}
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={styles.modalFooter}>
            <button onClick={onClose} style={styles.cancelButton}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || selectedItems.length === 0 || !listName.trim()}
              style={{
                ...styles.saveButton,
                opacity: isSaving || selectedItems.length === 0 || !listName.trim() ? 0.5 : 1
              }}
            >
              {isSaving ? (
                <div style={styles.buttonContentOriginal}>
                  <ButtonSpinner size={16} />
                  <span style={{ marginLeft: '8px' }}>Saving...</span>
                </div>
              ) : (
                `Save List (${selectedItems.length} items)`
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Helper functions for individual recipe expansion
  const toggleIndividualRecipeExpansion = (index) => {
    setIndividualExpansionStates(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleCollapseExpandAll = () => {
    const allRecipes = [...parsedRecipes, ...recipes];
    const newExpandedState = !mealPlanExpanded;
    setMealPlanExpanded(newExpandedState);
    
    // Set all individual states to match the new expanded state
    const newIndividualStates = {};
    allRecipes.forEach((_, index) => {
      newIndividualStates[index] = newExpandedState;
    });
    setIndividualExpansionStates(newIndividualStates);
  };

  // Enhanced Recipe Card Component - supports both old and unified formats
  const RecipeCard = ({ recipe, index, onAddToCart, onAddToLibrary, onAddToMealPlan, onRemove, onEdit, externalExpanded, onToggleExpanded }) => {
    const [internalExpanded, setInternalExpanded] = useState(false);
    
    // Use external expanded state if provided, otherwise use internal state
    const expanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
    const setExpanded = externalExpanded !== undefined ? onToggleExpanded : setInternalExpanded;
    
    // Extract data with fallbacks for both formats
    const title = recipe.title || recipe.name || 'Untitled Recipe';
    const mealType = recipe.mealType || 'Dinner';
    const icon = recipe.icon || getMealTypeIcon(mealType);
    const day = recipe.day || recipe.dayAssigned;
    const ingredients = recipe.ingredients || [];
    const instructions = recipe.instructions || [];
    const servings = recipe.servings;
    const prepTime = recipe.prepTime;
    const cookTime = recipe.cookTime;
    
    // Handle both string arrays and object arrays for ingredients
    const displayIngredients = ingredients.map(ing => 
      typeof ing === 'string' ? ing : ing.item || ing.original || ing.name || ing
    );
    
    // Handle both string arrays and object arrays for instructions  
    const displayInstructions = instructions.map(inst =>
      typeof inst === 'string' ? inst : inst.instruction || inst.step || inst
    );
    
    return (
      <div style={styles.enhancedRecipeCard}>
        <div style={styles.recipeHeader}>
          <h4 style={styles.recipeTitle}>
            {icon} 
            <strong>{title}</strong>
            {mealType && (
              <span style={styles.mealTypeTag}>{mealType}</span>
            )}
            {day && (
              <span style={styles.dayTag}>{day}</span>
            )}
          </h4>
          <div style={styles.headerButtons}>
            <button 
              onClick={() => setExpanded(!expanded)}
              style={styles.expandButton}
              title={expanded ? "Show less" : "Show full recipe"}
            >
              {expanded ? '▼' : '▶'} {expanded ? 'Less' : 'More'}
            </button>
            <button 
              onClick={() => onAddToCart(recipe)}
              style={styles.addToCartHeaderButton}
            >
              🛒 Add to Cart
            </button>
            <button 
              onClick={() => onAddToLibrary(recipe)}
              style={styles.wideHeaderButton}
            >
              📖 Save Recipe
            </button>
            {onEdit && (
              <button 
                onClick={() => onEdit(recipe, index)}
                style={styles.wideHeaderButton}
                title="Edit this recipe"
              >
                ✏️ Edit Recipe
              </button>
            )}
            <button 
              onClick={() => onAddToMealPlan(recipe)}
              style={styles.wideHeaderButton}
            >
              📅 Meal Plan
            </button>
            <button 
              onClick={() => onRemove(index)}
              style={styles.wideDeleteButton}
            >
              🗑️ Remove
            </button>
          </div>
        </div>
        
        <div style={styles.recipeContent}>
          {/* Recipe Metadata */}
          <div style={styles.recipeMetadataOriginal}>
            {servings && (
              <span style={styles.metaItem}>👥 Servings: {servings}</span>
            )}
            {prepTime && (
              <span style={styles.metaItem}>⏱️ Prep: {prepTime}</span>
            )}
            {cookTime && (
              <span style={styles.metaItem}>🔥 Cook: {cookTime}</span>
            )}
          </div>
          
          {/* Ingredients */}
          {displayIngredients && displayIngredients.length > 0 && (
            <div style={styles.recipeSection}>
              <h5 style={styles.sectionTitle}>📝 Ingredients:</h5>
              {expanded ? (
                <ul style={styles.ingredientsList}>
                  {displayIngredients.map((ingredient, idx) => (
                    <li key={idx} style={styles.ingredientItem}>{ingredient}</li>
                  ))}
                </ul>
              ) : (
                <p style={styles.collapsedText}>
                  {displayIngredients.slice(0, 3).join(', ')}
                  {displayIngredients.length > 3 && ` ... +${displayIngredients.length - 3} more`}
                </p>
              )}
            </div>
          )}
          
          {/* Instructions */}
          {expanded && displayInstructions && displayInstructions.length > 0 && (
            <div style={styles.recipeSection}>
              <h5 style={styles.sectionTitle}>👨‍🍳 Instructions:</h5>
              <ol style={styles.instructionsList}>
                {displayInstructions.map((step, idx) => (
                  <li key={idx} style={styles.instructionItem}>{step}</li>
                ))}
              </ol>
            </div>
          )}
          
          {/* Notes */}
          {expanded && recipe.notes && (
            <div style={styles.recipeSection}>
              <h5 style={styles.sectionTitle}>💡 Notes:</h5>
              <p style={styles.notesText}>{recipe.notes}</p>
            </div>
          )}
          
          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div style={styles.recipeTagsOriginal}>
              {recipe.tags.map((tag, idx) => (
                <span key={idx} style={styles.tag}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Handle adding recipe ingredients to cart
  const handleAddRecipeToCart = async (recipe) => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      alert('❌ This recipe has no ingredients to add to cart');
      return;
    }

    console.log('🛒 Adding recipe to cart:', recipe.title);
    console.log('🥕 Recipe ingredients:', recipe.ingredients);

    try {
      // Convert ingredients array to text format
      const ingredientsText = recipe.ingredients.join('\n');
      
      // Use the same API endpoint as regular grocery list parsing
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/cart/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listText: ingredientsText,
          action: 'merge', // Merge with existing cart
          userId: currentUser?.uid || null,
          options: {
            mergeDuplicates: true,
            enhancedQuantityParsing: true,
            detectContainers: true
          }
        }),
      });

      const data = await response.json();
      
      if (data.success && data.cart) {
        // Update the cart with new items
        setCurrentCart(data.cart);
        
        const addedCount = data.cart.filter(item => 
          recipe.ingredients.some(ingredient => 
            ingredient.toLowerCase().includes(item.productName.toLowerCase().split(' ')[0])
          )
        ).length;
        
        alert(`✅ Added ${addedCount} ingredients from "${recipe.title}" to your cart!`);
        
        console.log(`✅ Successfully added ${addedCount} items to cart from recipe:`, recipe.title);
      } else {
        throw new Error('Failed to parse recipe ingredients');
      }
    } catch (error) {
      console.error('❌ Error adding recipe to cart:', error);
      alert('❌ Failed to add recipe ingredients to cart. Please try again.');
    }
  };

  // Handle removing a recipe from the parsed recipes list
  const handleRemoveRecipe = (recipeIndex) => {
    // Combined array for display, but need to remove from the correct source array
    const combinedRecipes = [...parsedRecipes, ...recipes];
    const parsedRecipesCount = parsedRecipes.length;
    
    if (recipeIndex < parsedRecipesCount) {
      // Recipe is from parsedRecipes array
      const updatedRecipes = parsedRecipes.filter((_, index) => index !== recipeIndex);
      setParsedRecipes(updatedRecipes);
      console.log(`🗑️ Removed parsed recipe at index ${recipeIndex}. ${updatedRecipes.length} parsed recipes remaining.`);
    } else {
      // Recipe is from recipes array (AI-generated)
      const aiRecipeIndex = recipeIndex - parsedRecipesCount;
      const updatedRecipes = recipes.filter((_, index) => index !== aiRecipeIndex);
      setRecipes(updatedRecipes);
      console.log(`🗑️ Removed AI recipe at index ${aiRecipeIndex}. ${updatedRecipes.length} AI recipes remaining.`);
    }
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

  // Recipe import handlers
  const handleImportFromUrl = async () => {
    if (!recipeUrl.trim()) {
      alert('Please enter a recipe URL');
      return;
    }

    setImportingRecipe(true);
    try {
      console.log('🔗 Importing recipe from URL:', recipeUrl);
      
      const result = await unifiedRecipeService.importOne({
        source: 'url',
        data: { url: recipeUrl.trim() },
        userId: currentUser?.uid || null
      });

      if (result.success && result.recipes?.length > 0) {
        const importedRecipes = result.recipes;
        console.log('✅ Successfully imported recipes:', importedRecipes);
        
        // Add to parsed recipes to display them
        setParsedRecipes(prev => [...prev, ...importedRecipes]);
        
        // Clear the URL input
        setRecipeUrl('');
        setShowRecipeImport(false);
        
        alert(`✅ Successfully imported ${importedRecipes.length} recipe(s) from URL!`);
      } else {
        console.error('❌ Recipe import failed:', result.error);
        alert(`❌ Failed to import recipe: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Recipe import error:', error);
      alert(`❌ Error importing recipe: ${error.message}`);
    } finally {
      setImportingRecipe(false);
    }
  };

  const handleImportFromAI = async () => {
    if (!aiRecipeText.trim()) {
      alert('Please enter some recipe text for AI to parse');
      return;
    }

    setImportingRecipe(true);
    try {
      console.log('🤖 Importing recipe from AI text:', aiRecipeText.substring(0, 100) + '...');
      
      const result = await unifiedRecipeService.importOne({
        source: 'ai-text',
        data: { text: aiRecipeText.trim() },
        userId: currentUser?.uid || null
      });

      if (result.success && result.recipes?.length > 0) {
        const importedRecipes = result.recipes;
        console.log('✅ Successfully imported recipes from AI:', importedRecipes);
        
        // Add to parsed recipes to display them
        setParsedRecipes(prev => [...prev, ...importedRecipes]);
        
        // Clear the text input
        setAiRecipeText('');
        setShowRecipeImport(false);
        
        alert(`✅ Successfully imported ${importedRecipes.length} recipe(s) from AI text!`);
      } else {
        console.error('❌ AI recipe import failed:', result.error);
        alert(`❌ Failed to import recipe: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ AI recipe import error:', error);
      alert(`❌ Error importing recipe: ${error.message}`);
    } finally {
      setImportingRecipe(false);
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

        {/* Recipe Import Section */}
        <div style={styles.recipeImportSection}>
          <div style={styles.recipeImportHeader}>
            <h3 style={styles.recipeImportTitle}>
              🍳 Recipe Import
              <span style={styles.recipeImportSubtitle}>Import recipes from URLs or AI-generated text</span>
            </h3>
            <button
              onClick={() => setShowRecipeImport(!showRecipeImport)}
              style={styles.recipeToggleBtn}
            >
              {showRecipeImport ? '▼' : '▶'} {showRecipeImport ? 'Hide' : 'Show'} Recipe Import
            </button>
          </div>

          {showRecipeImport && (
            <div style={styles.recipeImportContent}>
              {/* URL Import */}
              <div style={styles.importMethod}>
                <h4 style={styles.importMethodTitle}>🔗 Import from URL</h4>
                <div style={styles.importInputGroup}>
                  <input
                    type="url"
                    placeholder="Paste recipe URL (e.g., from AllRecipes, Food Network, etc.)"
                    value={recipeUrl}
                    onChange={(e) => setRecipeUrl(e.target.value)}
                    style={styles.importInput}
                    disabled={importingRecipe}
                  />
                  <button
                    onClick={handleImportFromUrl}
                    disabled={importingRecipe || !recipeUrl.trim()}
                    style={{
                      ...styles.importButton,
                      ...(importingRecipe || !recipeUrl.trim() ? styles.importButtonDisabled : {})
                    }}
                  >
                    {importingRecipe ? '⏳ Importing...' : '📥 Import'}
                  </button>
                </div>
              </div>

              {/* AI Text Import */}
              <div style={styles.importMethod}>
                <h4 style={styles.importMethodTitle}>🤖 Import from AI Text</h4>
                <div style={styles.importInputGroup}>
                  <textarea
                    placeholder="Paste recipe text or meal plan generated by AI..."
                    value={aiRecipeText}
                    onChange={(e) => setAiRecipeText(e.target.value)}
                    style={styles.importTextarea}
                    disabled={importingRecipe}
                    rows={4}
                  />
                  <button
                    onClick={handleImportFromAI}
                    disabled={importingRecipe || !aiRecipeText.trim()}
                    style={{
                      ...styles.importButton,
                      ...(importingRecipe || !aiRecipeText.trim() ? styles.importButtonDisabled : {})
                    }}
                  >
                    {importingRecipe ? '⏳ Importing...' : '🧠 Parse with AI'}
                  </button>
                </div>
              </div>
            </div>
          )}
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
      {(parsedRecipes.length > 0 || recipes.length > 0) && (
        <div style={styles.recipesContainer}>
          <div style={styles.recipesHeader}>
            <h3 style={styles.recipesTitle}>
              {(parsedRecipes.some(r => r.mealType || r.tags?.includes('meal plan')) || recipes.some(r => r.mealType || r.tags?.includes('meal plan'))) ? 
                '📋 Meal Plan Ideas' : '🍳 Recipes Found'}
            </h3>
            {(parsedRecipes.some(r => r.mealType || r.tags?.includes('meal plan')) || recipes.some(r => r.mealType || r.tags?.includes('meal plan'))) && (
              <button
                style={styles.collapseButton}
                onClick={handleCollapseExpandAll}
                title={mealPlanExpanded ? "Collapse all recipe details" : "Expand all recipe details"}
              >
                {mealPlanExpanded ? '▼ Collapse All' : '▶ Expand All'}
              </button>
            )}
          </div>
          
          {/* Always show recipe cards with individual expansion control */}
          {[...parsedRecipes, ...recipes].map((recipe, index) => (
            <RecipeCard 
              key={index} 
              recipe={recipe} 
              index={index}
              externalExpanded={individualExpansionStates[index] || false}
              onToggleExpanded={() => toggleIndividualRecipeExpansion(index)}
              onAddToCart={handleAddRecipeToCart}
              onAddToLibrary={handleAddToRecipeLibrary}
              onAddToMealPlan={handleAddToMealPlan}
              onRemove={handleRemoveRecipe}
            />
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
            saveCartAsList={saveCartAsList}
            // Pass a prop to hide the export button in ParsedResultsDisplay
            hideExportButton={true}
          />
          
          {/* Quick Save Actions */}
          <div style={styles.quickSaveSection}>
            <div style={styles.quickSaveTitle}>Save Your Shopping List</div>
            <div style={styles.quickSaveActions}>
              <QuickSaveListButton
                items={currentCart}
                onSave={saveCartAsList}
                disabled={!saveCartAsList}
              />
              <button
                onClick={() => setShowShoppingListManager(true)}
                style={styles.customSaveButton}
                disabled={currentCart.length === 0}
                onMouseEnter={(e) => {
                  if (currentCart.length > 0) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(251, 79, 20, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentCart.length > 0) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(251, 79, 20, 0.2)';
                  }
                }}
              >
                <span style={styles.customSaveIcon}>⚙️</span>
                <span>Custom Save</span>
              </button>
            </div>
          </div>
          
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
              <div style={styles.buttonContentOriginal}>
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

      {/* Recipe Manager Modal */}
      {showRecipeManager && selectedRecipeForMealPlan && (
        <RecipeManagerModal
          recipe={selectedRecipeForMealPlan}
          onClose={() => {
            setShowRecipeManager(false);
            setSelectedRecipeForMealPlan(null);
          }}
        />
      )}

      {/* Shopping List Manager Modal */}
      {showShoppingListManager && (
        <ShoppingListManager
          items={currentCart}
          onClose={() => setShowShoppingListManager(false)}
          onSave={saveCartAsList}
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

  buttonContentOriginal: {
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

  recipesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },

  collapseButton: {
    background: 'linear-gradient(135deg, #4A90E2 0%, #2171b5 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 6px rgba(74, 144, 226, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },

  compactRecipeList: {
    background: '#f8f9fa',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #e9ecef'
  },

  compactRecipeItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    marginBottom: '8px',
    backgroundColor: 'white',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid #e9ecef',
    gap: '8px',
    ':hover': {
      backgroundColor: '#f0f7ff',
      borderColor: '#4A90E2',
      transform: 'translateX(4px)',
      boxShadow: '0 2px 8px rgba(74, 144, 226, 0.2)'
    }
  },

  recipeIcon: {
    fontSize: '18px',
    minWidth: '24px'
  },

  recipeName: {
    fontWeight: '600',
    color: '#002244',
    flex: 1
  },

  recipeDay: {
    fontSize: '12px',
    color: '#6c757d',
    fontWeight: '500'
  },

  recipeMealType: {
    fontSize: '12px',
    color: '#28a745',
    fontWeight: '500'
  },

  expandHint: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: '14px',
    fontStyle: 'italic',
    marginTop: '12px',
    padding: '8px'
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

  mealTypeTag: {
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: '#FB4F14',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    marginLeft: '8px',
    textTransform: 'uppercase'
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

  recipeMetadataOriginal: {
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

  recipeTagsOriginal: {
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
  },

  addToCartButton: {
    padding: '10px 16px',
    background: '#FB4F14', // CartSmash orange color
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(251,79,20,0.3)',
    ':hover': {
      background: '#E0440F',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(251,79,20,0.4)'
    }
  },

  headerButtons: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },

  headerButton: {
    padding: '6px 10px',
    background: '#f8f9fa',
    color: '#002244',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
    ':hover': {
      background: '#e9ecef',
      borderColor: '#adb5bd'
    }
  },

  addToCartHeaderButton: {
    padding: '8px 16px',
    background: '#FB4F14', // CartSmash orange
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(251,79,20,0.3)',
    minWidth: '120px',
    ':hover': {
      background: '#E0440F',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(251,79,20,0.4)'
    }
  },

  wideHeaderButton: {
    padding: '8px 16px',
    background: '#f8f9fa',
    color: '#002244',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    minWidth: '100px',
    ':hover': {
      background: '#e9ecef',
      borderColor: '#adb5bd',
      transform: 'translateY(-1px)'
    }
  },

  wideDeleteButton: {
    padding: '8px 16px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    minWidth: '100px',
    ':hover': {
      background: '#c82333',
      transform: 'translateY(-1px)',
      boxShadow: '0 2px 4px rgba(220,53,69,0.3)'
    }
  },

  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 2, 68, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5000
  },
  
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    border: '3px solid #FB4F14'
  },
  
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '2px solid #FB4F14',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #FFF5F2 0%, #FFFFFF 100%)'
  },
  
  modalTitle: {
    margin: 0,
    fontSize: '24px',
    color: '#002244',
    fontWeight: 'bold'
  },
  
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#002244',
    padding: '0 8px'
  },
  
  modalBody: {
    padding: '24px'
  },
  
  modeToggle: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    justifyContent: 'center'
  },
  
  modeButton: {
    padding: '10px 20px',
    border: '2px solid #002244',
    backgroundColor: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    flex: 1
  },
  
  modeButtonActive: {
    backgroundColor: '#FB4F14',
    color: 'white',
    borderColor: '#FB4F14'
  },
  
  formGroup: {
    marginBottom: '20px'
  },
  
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#002244'
  },
  
  input: {
    width: '100%',
    padding: '10px',
    border: '2px solid #002244',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  
  dayGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px'
  },
  
  dayButton: {
    padding: '10px',
    border: '2px solid #002244',
    backgroundColor: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  
  dayButtonActive: {
    backgroundColor: '#002244',
    color: 'white'
  },
  
  mealTypeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px'
  },
  
  mealButton: {
    padding: '10px',
    border: '2px solid #002244',
    backgroundColor: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  
  mealButtonActive: {
    backgroundColor: '#FB4F14',
    color: 'white',
    borderColor: '#FB4F14'
  },
  
  checkboxGroup: {
    marginBottom: '20px'
  },
  
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#002244'
  },
  
  checkbox: {
    marginRight: '8px'
  },
  
  preview: {
    backgroundColor: '#FFF5F2',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #FB4F14'
  },
  
  previewTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#002244'
  },
  
  previewText: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#002244'
  },
  
  modalFooter: {
    padding: '20px 24px',
    borderTop: '2px solid #FB4F14',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    background: 'linear-gradient(135deg, #FFF5F2 0%, #FFFFFF 100%)'
  },
  
  saveButton: {
    padding: '12px 24px',
    backgroundColor: '#FB4F14',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#002244',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },

  // Quick Save Section Styles
  quickSaveSection: {
    backgroundColor: '#f8f9fa',
    border: '2px dashed #002244',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    textAlign: 'center'
  },

  quickSaveTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#002244',
    marginBottom: '16px'
  },

  quickSaveActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },

  quickSaveButton: {
    padding: '12px 20px',
    backgroundColor: '#002244',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(0, 34, 68, 0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  quickSaveContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  quickSaveIcon: {
    fontSize: '16px'
  },

  customSaveButton: {
    padding: '12px 20px',
    backgroundColor: '#FB4F14',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(251, 79, 20, 0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  customSaveIcon: {
    fontSize: '16px'
  },

  // Shopping List Manager Modal Styles
  shoppingListModal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },

  itemsSection: {
    marginTop: '20px'
  },

  itemsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },

  itemsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#002244'
  },

  selectionButtons: {
    display: 'flex',
    gap: '8px'
  },

  selectionButton: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: '#FB4F14',
    border: '1px solid #FB4F14',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },

  itemsList: {
    maxHeight: '300px',
    overflowY: 'auto',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '8px'
  },

  itemRow: {
    padding: '8px',
    borderRadius: '6px',
    marginBottom: '4px',
    backgroundColor: '#f8f9fa',
    transition: 'background-color 0.2s'
  },

  itemLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    gap: '12px'
  },

  itemCheckbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },

  itemDetails: {
    flex: 1
  },

  itemName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#002244',
    marginBottom: '4px'
  },

  itemInfo: {
    fontSize: '12px',
    color: '#666'
  },

  buttonContentExpanded: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  // Enhanced Recipe Card Styles
  enhancedRecipeCard: {
    background: '#FFF5F2',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    border: '2px solid #FB4F14',
    boxShadow: '0 4px 12px rgba(251,79,20,0.15)',
    transition: 'all 0.3s ease'
  },
  
  expandButton: {
    padding: '6px 12px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s',
    marginRight: '8px'
  },
  
  dayTag: {
    fontSize: '10px',
    fontWeight: '600',
    backgroundColor: '#002244',
    color: 'white',
    padding: '3px 8px',
    borderRadius: '12px',
    marginLeft: '8px',
    textTransform: 'uppercase'
  },
  
  recipeSection: {
    marginBottom: '16px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(251, 79, 20, 0.2)'
  },
  
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: '700',
    color: '#002244'
  },
  
  recipeMetadataExpanded: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(251, 79, 20, 0.1)'
  },
  
  metaItem: {
    display: 'inline-block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#666',
    backgroundColor: '#f8f9fa',
    padding: '4px 8px',
    borderRadius: '6px'
  },
  
  ingredientsList: {
    margin: '8px 0',
    paddingLeft: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '12px 20px'
  },
  
  ingredientItem: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#002244',
    marginBottom: '4px'
  },
  
  instructionsList: {
    margin: '8px 0',
    paddingLeft: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '12px 20px'
  },
  
  instructionItem: {
    fontSize: '14px',
    lineHeight: '1.8',
    color: '#002244',
    marginBottom: '8px',
    paddingLeft: '8px'
  },
  
  collapsedText: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic',
    margin: '4px 0',
    backgroundColor: '#f8f9fa',
    padding: '8px 12px',
    borderRadius: '6px'
  },
  
  notesText: {
    fontSize: '14px',
    color: '#495057',
    fontStyle: 'italic',
    backgroundColor: '#fff3cd',
    padding: '12px',
    borderRadius: '8px',
    margin: '8px 0',
    border: '1px solid #ffeaa7'
  },
  
  recipeTagsExpanded: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '12px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(251, 79, 20, 0.1)'
  },
  
  tag: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: '#e9ecef',
    color: '#495057',
    borderRadius: '15px',
    fontSize: '11px',
    fontWeight: '500',
    border: '1px solid #dee2e6'
  },

  // Recipe Import Styles
  recipeImportSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    border: '1px solid #e9ecef'
  },

  recipeImportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },

  recipeImportTitle: {
    margin: 0,
    color: '#002244',
    fontSize: '18px',
    fontWeight: '600',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },

  recipeImportSubtitle: {
    fontSize: '12px',
    fontWeight: '400',
    color: '#666',
    fontStyle: 'italic'
  },

  recipeToggleBtn: {
    padding: '8px 16px',
    backgroundColor: '#FB4F14',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },

  recipeImportContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },

  importMethod: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #e9ecef'
  },

  importMethodTitle: {
    margin: '0 0 12px 0',
    color: '#002244',
    fontSize: '16px',
    fontWeight: '600'
  },

  importInputGroup: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start'
  },

  importInput: {
    flex: 1,
    padding: '12px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
    outline: 'none'
  },

  importTextarea: {
    flex: 1,
    padding: '12px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
    outline: 'none',
    resize: 'vertical',
    minHeight: '100px'
  },

  importButton: {
    padding: '12px 20px',
    backgroundColor: '#FB4F14',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },

  importButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  }
};

export default GroceryListForm;
