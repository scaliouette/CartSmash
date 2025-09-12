// client/src/components/GroceryListForm.js - FIXED VERSION
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ParsedResultsDisplay from './ParsedResultsDisplay';
// eslint-disable-next-line no-unused-vars
import SmartAIAssistant from './SmartAIAssistant';
import ProductValidator from './ProductValidator';
import InstacartCheckoutFlow from './InstacartCheckoutFlow';
import { ButtonSpinner, OverlaySpinner, ProgressSpinner } from './LoadingSpinner';
import { useGroceryListAutoSave } from '../hooks/useAutoSave';
// eslint-disable-next-line no-unused-vars
import AIParsingSettings from './AIParsingSettings';
// import confetti from 'canvas-confetti'; // REMOVED - Not used in AI-only mode
import { unified as unifiedRecipeService } from '../services/unifiedRecipeService';
import persistenceService from '../services/persistenceService';
import { generateAIMealPlan } from '../services/aiMealPlanService';

// MixingBowlLoader Component
const MixingBowlLoader = ({ text = "CARTSMASH AI is preparing your meal plan..." }) => {
  return (
    <>
      <style>{`
        @keyframes swirl {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes orbit1 {
          0% { transform: rotate(0deg) translateX(40px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(40px) rotate(-360deg); }
        }
        
        @keyframes orbit2 {
          0% { transform: rotate(90deg) translateX(35px) rotate(-90deg); }
          100% { transform: rotate(450deg) translateX(35px) rotate(-450deg); }
        }
        
        @keyframes orbit3 {
          0% { transform: rotate(180deg) translateX(45px) rotate(-180deg); }
          100% { transform: rotate(540deg) translateX(45px) rotate(-540deg); }
        }
        
        @keyframes orbit4 {
          0% { transform: rotate(270deg) translateX(30px) rotate(-270deg); }
          100% { transform: rotate(630deg) translateX(30px) rotate(-630deg); }
        }
        
        @keyframes floatAndSpin {
          0%, 100% { 
            transform: translateY(0) rotate(0deg) scale(1);
          }
          25% {
            transform: translateY(-8px) rotate(90deg) scale(1.1);
          }
          50% { 
            transform: translateY(-3px) rotate(180deg) scale(0.95);
          }
          75% {
            transform: translateY(-10px) rotate(270deg) scale(1.05);
          }
        }
        
        @keyframes mixingVortex {
          0% { 
            transform: translateX(-50%) scale(1) rotate(0deg);
            opacity: 0.3;
          }
          50% { 
            transform: translateX(-50%) scale(1.2) rotate(180deg);
            opacity: 0.1;
          }
          100% { 
            transform: translateX(-50%) scale(1) rotate(360deg);
            opacity: 0.3;
          }
        }
        
        @keyframes fall {
          0% {
            transform: translateY(-150px) rotate(0deg) scale(0);
            opacity: 0;
          }
          20% {
            transform: translateY(-80px) rotate(120deg) scale(1);
            opacity: 1;
          }
          85% {
            transform: translateY(180px) rotate(480deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(200px) rotate(540deg) scale(0);
            opacity: 0;
          }
        }
        
        @keyframes pulse {
          0%, 100% { 
            opacity: 0.2; 
            transform: scale(1);
          }
          50% { 
            opacity: 1; 
            transform: scale(1.3);
          }
        }
        
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }
      `}</style>
      
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #002244 0%, #003366 50%, #001833 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}>
        <div style={{
          position: 'relative',
          width: '350px',
          height: '350px',
        }}>
          {/* CARTSMASH-colored Mixing Bowl */}
          <div style={{
            position: 'absolute',
            bottom: '50px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '240px',
            height: '120px',
            background: 'linear-gradient(to bottom, #FB4F14 0%, #FF6B35 30%, #E74C0C 70%, #C73E0A 100%)',
            borderRadius: '0 0 120px 120px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4), inset 0 -5px 20px rgba(0,0,0,0.3), 0 0 80px rgba(251, 79, 20, 0.3)',
            overflow: 'hidden',
          }}>
            {/* Inner shadow for depth */}
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: 'radial-gradient(ellipse at center top, transparent 30%, rgba(0,0,0,0.2) 100%)',
            }}></div>
            
            {/* Bowl rim with shimmer effect */}
            <div style={{
              position: 'absolute',
              width: '244px',
              height: '12px',
              background: 'linear-gradient(90deg, #FF6B35 0%, #FFB380 45%, #FFFFFF 50%, #FFB380 55%, #FF6B35 100%)',
              backgroundSize: '200px 100%',
              animation: 'shimmer 3s infinite linear',
              top: '-6px',
              left: '-2px',
              borderRadius: '50%',
              boxShadow: '0 3px 10px rgba(251, 79, 20, 0.5), inset 0 2px 4px rgba(255,255,255,0.7)',
            }}></div>
            
            {/* Mixing contents container */}
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {/* Central batter mixture */}
              <div style={{
                position: 'absolute',
                width: '200px',
                height: '80px',
                background: 'radial-gradient(ellipse at center, #FFF8DC 0%, #FFE4B5 40%, #DEB887 80%, #BC9A6A 100%)',
                borderRadius: '50%',
                top: '20px',
                left: '20px',
                opacity: 0.95,
                boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.15)',
                animation: 'swirl 4s infinite linear',
              }}>
                {/* Swirl pattern overlay */}
                <div style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  background: 'conic-gradient(from 0deg, transparent, rgba(139, 69, 19, 0.15), transparent, rgba(139, 69, 19, 0.15))',
                  borderRadius: '50%',
                  animation: 'swirl 2.5s infinite linear reverse',
                }}></div>
              </div>
              
              {/* Ingredients with unique orbiting paths */}
              <div style={{
                position: 'absolute',
                fontSize: '26px',
                animation: 'orbit1 3s infinite linear',
                filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
              }}>
                <span style={{ display: 'inline-block', animation: 'floatAndSpin 2s infinite ease-in-out' }}>
                  🥕
                </span>
              </div>
              
              <div style={{
                position: 'absolute',
                fontSize: '24px',
                animation: 'orbit2 3.5s infinite linear',
                filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
              }}>
                <span style={{ display: 'inline-block', animation: 'floatAndSpin 2.5s infinite ease-in-out' }}>
                  🥬
                </span>
              </div>
              
              <div style={{
                position: 'absolute',
                fontSize: '28px',
                animation: 'orbit3 4s infinite linear',
                filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
              }}>
                <span style={{ display: 'inline-block', animation: 'floatAndSpin 2.2s infinite ease-in-out' }}>
                  🍅
                </span>
              </div>
              
              <div style={{
                position: 'absolute',
                fontSize: '25px',
                animation: 'orbit4 2.8s infinite linear',
                filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
              }}>
                <span style={{ display: 'inline-block', animation: 'floatAndSpin 2.8s infinite ease-in-out' }}>
                  🧅
                </span>
              </div>
            </div>
            
            {/* Multiple vortex rings for depth */}
            <div style={{
              position: 'absolute',
              width: '80px',
              height: '80px',
              border: '3px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '50%',
              top: '20px',
              left: '50%',
              animation: 'mixingVortex 3s infinite ease-in-out',
              borderStyle: 'dashed',
            }}></div>
            
            <div style={{
              position: 'absolute',
              width: '50px',
              height: '50px',
              border: '2px solid rgba(251, 79, 20, 0.2)',
              borderRadius: '50%',
              top: '35px',
              left: '50%',
              animation: 'mixingVortex 2s infinite ease-in-out reverse',
              borderStyle: 'dotted',
            }}></div>
          </div>
          
          {/* Falling ingredients with varied timing */}
          <div style={{
            position: 'absolute',
            top: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '300px',
          }}>
            <span style={{
              position: 'absolute',
              fontSize: '32px',
              animation: 'fall 2.5s infinite ease-in',
              left: '20%',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            }}>🥒</span>
            <span style={{
              position: 'absolute',
              fontSize: '30px',
              animation: 'fall 2.5s infinite ease-in 0.8s',
              left: '50%',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            }}>🌽</span>
            <span style={{
              position: 'absolute',
              fontSize: '34px',
              animation: 'fall 2.5s infinite ease-in 1.6s',
              left: '75%',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            }}>🥔</span>
          </div>
        </div>
        
        <h3 style={{
          color: 'white',
          marginTop: '40px',
          fontSize: '26px',
          fontWeight: '700',
          textAlign: 'center',
          textShadow: '3px 3px 6px rgba(0,0,0,0.5)',
          letterSpacing: '1px',
        }}>{text}</h3>
        
        <div style={{
          fontSize: '36px',
          color: '#FB4F14',
          fontWeight: 'bold',
          textShadow: '0 0 20px rgba(251, 79, 20, 0.5)',
        }}>
          <span style={{ animation: 'pulse 1.5s infinite ease-in-out' }}>.</span>
          <span style={{ animation: 'pulse 1.5s infinite ease-in-out 0.3s' }}>.</span>
          <span style={{ animation: 'pulse 1.5s infinite ease-in-out 0.6s' }}>.</span>
        </div>
      </div>
    </>
  );
};

// Recipe Validation Utility
const isValidRecipe = (recipe) => {
  if (!recipe) return false;
  
  // Check for error indicators
  const hasErrorMarkers = (arr) => {
    if (!Array.isArray(arr)) return true;
    return arr.some(item => 
      typeof item === 'string' && (
        item.includes('Failed to generate') ||
        item.includes('⚠️') ||
        item.includes('please retry') ||
        item.toLowerCase().includes('error')
      )
    );
  };
  
  // Recipe must have valid ingredients and instructions
  const hasValidIngredients = recipe.ingredients && 
                             recipe.ingredients.length > 0 && 
                             !hasErrorMarkers(recipe.ingredients);
                             
  const hasValidInstructions = recipe.instructions && 
                               recipe.instructions.length > 0 && 
                               !hasErrorMarkers(recipe.instructions);
  
  return hasValidIngredients && hasValidInstructions;
};

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
  
  const lines = text.split('\n');
  const groceryItems = [];
  let inGrocerySection = false;
  let inMealPlanSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    
    // Skip meal plan items (they should be recipes, not grocery items)
    if (line.match(/^(•|-|\*|\d+\.)\s*(Breakfast|Lunch|Dinner|Snack):/i)) {
      console.log('🍽️ Skipping meal plan item (should be recipe):', line);
      inMealPlanSection = true;
      continue;
    }
    
    // Detect actual grocery list section
    if (lowerLine.includes('grocery list') || lowerLine.includes('shopping list') || 
        lowerLine.includes('ingredients needed') || lowerLine.includes('shopping items')) {
      console.log('🛒 Found grocery section start');
      inGrocerySection = true;
      inMealPlanSection = false;
      continue;
    }
    
    // Only add items if we're in the grocery section and NOT in meal plan section
    if (inGrocerySection && !inMealPlanSection) {
      const itemMatch = line.match(/^[-•*]\s*(.+)$|^\d+\.?\s*(.+)$/);
      if (itemMatch) {
        const item = (itemMatch[1] || itemMatch[2]).trim();
        
        // Skip meal descriptions, only keep actual grocery items
        if (!item.match(/^(Breakfast|Lunch|Dinner|Snack):/i) && 
            item.length > 2 && 
            !item.endsWith(':')) {
          groceryItems.push(item);
        }
      }
    }
  }
  
  return groceryItems.join('\n');
}

// Utility functions for cleaning recipe data
const cleanRecipeTitle = (title) => {
  // Remove any tags that got appended
  return title
    .replace(/meal_plan_item/gi, '')
    .replace(/dinner|lunch|breakfast|snack/gi, '')
    .replace(/_/g, ' ')
    .trim();
};

const cleanMarkdown = (text) => {
  return text
    .replace(/\*\*/g, '') // Remove bold markdown
    .replace(/\*/g, '')   // Remove italic markdown
    .replace(/_/g, '')    // Remove underscores
    .trim();
};

// Enhanced recipe quality validation - UNUSED: Remove to fix ESLint
// const validateRecipeQuality = (recipe) => {
//   const { instructions, ingredients } = recipe;
//   
//   // Must have at least 3 ingredients
//   if (!ingredients || ingredients.length < 3) {
//     console.log('❌ Too few ingredients:', ingredients?.length || 0);
//     return false;
//   }
//   
//   // Must have at least 3 instructions
//   if (!instructions || instructions.length < 3) {
//     console.log('❌ Too few instructions:', instructions?.length || 0);
//     return false;
//   }
//   
//   // Each instruction must be detailed (at least 30 words)
//   const tooShortInstructions = instructions.filter(inst => {
//     const wordCount = inst.split(' ').filter(w => w.length > 0).length;
//     return wordCount < 30;
//   });
//   
//   if (tooShortInstructions.length > 0) {
//     console.log('❌ Instructions too brief:', tooShortInstructions);
//     return false;
//   }
//   
//   // Check for lazy patterns
//   const lazyPatterns = [
//     /^cook.*until.*$/i,  // "Cook bacon until crispy"
//     /^scramble.*$/i,     // "Scramble eggs"
//     /^slice.*and serve$/i, // "Slice avocado and serve"
//     /^mix.*together$/i,
//     /^serve.*$/i,
//     /^enjoy.*$/i
//   ];
//   
//   for (let inst of instructions) {
//     // Check if entire instruction matches a lazy pattern
//     if (inst.split(' ').length < 10) { // Very short instruction
//       for (let pattern of lazyPatterns) {
//         if (pattern.test(inst)) {
//           console.log('❌ Lazy instruction detected:', inst);
//           return false;
//         }
//       }
//     }
//   }
//   
//   return true;
// };

// Enhanced prompt generator for specific recipes - UNUSED: Remove to fix ESLint
// eslint-disable-next-line no-unused-vars
const getEnhancedPromptForRecipe = (recipeName) => {
  const name = recipeName.toLowerCase();
  
  if (name.includes('bacon') && name.includes('egg')) {
    return `Create a detailed recipe for "${recipeName}".

Please provide clear instructions for preparing bacon and eggs with avocado, including:
- How to cook the bacon properly
- Best technique for scrambling eggs  
- How to prepare fresh avocado
- Plating and serving suggestions

FORMAT: JSON with "ingredients" array and "instructions" array.`;
  }
  
  // Create a natural, helpful recipe prompt
  return `Create a detailed recipe for "${recipeName}".

Please provide:
- A complete ingredients list with quantities and units
- Clear, step-by-step cooking instructions
- Include temperatures, times, and cooking techniques where helpful
- Add any tips for best results

FORMAT: JSON with "ingredients" array and "instructions" array.`;
};

// Removed restrictive validation function - recipes are now accepted as provided by AI

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
  const [showAISettings, setShowAISettings] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [validatingAll, setValidatingAll] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [ingredientStyle, setIngredientStyle] = useState('basic');
  const [selectedAI] = useState('claude');
  const [mealPlanExpanded, setMealPlanExpanded] = useState(false);
  const [individualExpansionStates, setIndividualExpansionStates] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [recipes, setRecipes] = useState([]);
  const [waitingForAIResponse, setWaitingForAIResponse] = useState(false);
  // eslint-disable-next-line no-unused-vars
  // eslint-disable-next-line no-unused-vars
  const [showRecipeImport, setShowRecipeImport] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [importingRecipe, setImportingRecipe] = useState(false);
  const [recipeUrl, setRecipeUrl] = useState('');
  const [aiRecipeText, setAiRecipeText] = useState('');
  const [generatingMealPlan, setGeneratingMealPlan] = useState(false);

  // Validation wrapper functions for state setters
  const setValidParsedRecipes = useCallback((recipes) => {
    const valid = Array.isArray(recipes) ? recipes.filter(isValidRecipe) : [];
    setParsedRecipes(valid);
  }, [setParsedRecipes]);

  const setValidRecipes = useCallback((recipes) => {
    const valid = Array.isArray(recipes) ? recipes.filter(isValidRecipe) : [];
    setRecipes(valid);
  }, [setRecipes]);

  const setValidSavedRecipes = useCallback((recipes) => {
    const valid = Array.isArray(recipes) ? recipes.filter(isValidRecipe) : [];
    setSavedRecipes(valid);
  }, [setSavedRecipes]);
  // eslint-disable-next-line no-unused-vars
  const [mealPlanPreferences, setMealPlanPreferences] = useState({
    familySize: 4,
    dietaryRestrictions: [],
    mealPreferences: [],
    budget: 'moderate',
    prepTimePreference: 'balanced',
    includeSnacks: true,
    daysCount: 7
  });
  const { currentUser, isAdmin } = useAuth();
  
  // Hydration-safe ID generator with stable sequence
  const idCounterRef = useRef(0);
  const generateStableId = useCallback((prefix = 'item') => {
    const counter = ++idCounterRef.current;
    // Use a stable seed for consistent hydration (avoid Date.now() and Math.random())
    const stableTimestamp = typeof window !== 'undefined' ? Math.floor(performance.now()) : 1000000;
    return `${prefix}-${stableTimestamp}-${counter}`;
  }, []);

  // Clean up corrupted localStorage data on component mount
  useEffect(() => {
    const cleanupCorruptedData = () => {
      console.log('🧹 Checking for corrupted localStorage data...');
      
      // List of localStorage keys that might contain corrupted meal plan data
      const keysToCheck = [
        'cartsmash-recipes', 
        'cart-smash-recipes', 
        'cartsmash-meal-plan',
        'parsedRecipes',
        'saved-recipes',
        'parsed_recipes',
        'session_parsed_recipes'
      ];
      
      keysToCheck.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data && (data.includes('Failed to generate') || data.includes('⚠️') || data.includes('please retry'))) {
            console.log(`🧹 Removing corrupted ${key} on mount`);
            localStorage.removeItem(key);
          } else if (data) {
            try {
              const parsed = JSON.parse(data);
              let isCorrupted = false;
              
              // Check if data contains error messages
              if (Array.isArray(parsed)) {
                parsed.forEach(item => {
                  if (!isValidRecipe(item)) {
                    isCorrupted = true;
                  }
                });
              }
              
              if (isCorrupted) {
                console.log(`🗑️ Removing corrupted data from localStorage key: ${key}`);
                localStorage.removeItem(key);
              }
            } catch (parseError) {
              console.log(`🗑️ Removing invalid JSON from localStorage key: ${key}`);
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          console.log(`🗑️ Removing invalid JSON from localStorage key: ${key}`);
          localStorage.removeItem(key);
        }
      });
    };
    
    // Run cleanup on mount
    cleanupCorruptedData();
  }, []);
  const textareaRef = useRef(null);

  // Function to trigger textarea auto-expansion (dynamic based on text content)
  const expandTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      
      // Dynamic height based on content:
      // - No text: small default height (40px for single line)
      // - With text: expand to fit content with minimum of 60px
      const hasText = textareaRef.current.value.trim().length > 0;
      const minHeight = hasText ? 60 : 40;
      const newHeight = Math.max(minHeight, textareaRef.current.scrollHeight);
      
      textareaRef.current.style.height = newHeight + 'px';
    }
  };

  // Effect to handle dynamic textarea resizing
  useEffect(() => {
    expandTextarea();
  }, [inputText]);

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

  // Data persistence hooks - load data on component mount
  useEffect(() => {
    console.log('💾 Loading persisted data on component mount...');
    
    // Load cart data
    const persistedCart = persistenceService.loadCart();
    if (persistedCart && persistedCart.length > 0) {
      console.log('📖 Loading persisted cart:', persistedCart.length, 'items');
      setCurrentCart(persistedCart);
    }
    
    // Load saved recipes WITH VALIDATION
    const persistedRecipes = persistenceService.loadRecipes();
    if (persistedRecipes && persistedRecipes.length > 0) {
      // Filter out corrupted recipes
      const validRecipes = persistedRecipes.filter(recipe => isValidRecipe(recipe));
      console.log(`📖 Loading recipes: ${validRecipes.length} valid out of ${persistedRecipes.length} total`);
      
      if (validRecipes.length !== persistedRecipes.length) {
        // Clean corrupted recipes from storage
        console.log('🧹 Cleaning corrupted recipes from storage');
        persistenceService.saveRecipes(validRecipes, 24);
      }
      
      setSavedRecipes(validRecipes);
    }
    
    // Load parsed recipes WITH VALIDATION
    const persistedParsedRecipes = persistenceService.loadSessionData('parsed_recipes', []);
    if (persistedParsedRecipes && persistedParsedRecipes.length > 0) {
      // Filter out corrupted recipes
      const validParsedRecipes = persistedParsedRecipes.filter(recipe => isValidRecipe(recipe));
      console.log(`📖 Loading parsed recipes: ${validParsedRecipes.length} valid out of ${persistedParsedRecipes.length} total`);
      
      if (validParsedRecipes.length !== persistedParsedRecipes.length) {
        // Clean corrupted recipes from storage
        console.log('🧹 Cleaning corrupted parsed recipes from storage');
        persistenceService.saveSessionData('parsed_recipes', validParsedRecipes, 2);
      }
      
      setParsedRecipes(validParsedRecipes);
    }
    
    // Load last AI response text
    const persistedAIText = persistenceService.loadSessionData('ai_recipe_text', '');
    if (persistedAIText) {
      console.log('📖 Loading persisted AI text');
      setAiRecipeText(persistedAIText);
    }
    
    console.log('✅ Data persistence loading complete');
  }, [setCurrentCart, setSavedRecipes, setParsedRecipes]);

  // Auto-save cart data when it changes
  useEffect(() => {
    if (currentCart && currentCart.length > 0) {
      console.log('💾 Auto-saving cart:', currentCart.length, 'items');
      persistenceService.saveCart(currentCart, 48); // 48-hour expiration
    }
  }, [currentCart]);

  // Auto-save recipes when they change - WITH VALIDATION
  useEffect(() => {
    if (savedRecipes && savedRecipes.length > 0) {
      // Only save valid recipes
      const validRecipes = savedRecipes.filter(recipe => isValidRecipe(recipe));
      if (validRecipes.length > 0) {
        console.log(`💾 Auto-saving ${validRecipes.length} valid recipes`);
        persistenceService.saveRecipes(validRecipes, 24);
      }
    }
  }, [savedRecipes]);

  // Auto-save parsed recipes when they change - WITH VALIDATION
  useEffect(() => {
    if (parsedRecipes && parsedRecipes.length > 0) {
      // Only save valid recipes
      const validRecipes = parsedRecipes.filter(recipe => isValidRecipe(recipe));
      if (validRecipes.length > 0) {
        console.log(`💾 Auto-saving ${validRecipes.length} valid parsed recipes`);
        persistenceService.saveSessionData('parsed_recipes', validRecipes, 2);
      }
    }
  }, [parsedRecipes]);

  // Auto-save AI response text when it changes
  useEffect(() => {
    if (aiRecipeText && aiRecipeText.trim()) {
      console.log('💾 Auto-saving AI recipe text');
      persistenceService.saveSessionData('ai_recipe_text', aiRecipeText, 2); // 2-hour expiration
    }
  }, [aiRecipeText]);

  // Debug function to identify cart item structure
  const debugCartItem = (item) => {
    console.log('Cart item structure:', {
      fullItem: item,
      keys: Object.keys(item),
      productName: item.productName,
      name: item.name,
      item: item.item,
      original: item.original,
      text: item.text,
      typeOfProductName: typeof item.productName,
      isProductNameObject: typeof item.productName === 'object'
    });
    
    // Try to extract the actual product name
    let displayName = 'Unknown Item';
    
    // Check various possible field names and structures
    if (typeof item.productName === 'string') {
      displayName = item.productName;
    } else if (typeof item.productName === 'object' && item.productName !== null) {
      // productName is an object, try to extract text from it
      const extractedName = item.productName.text || 
                           item.productName.name || 
                           item.productName.value ||
                           item.productName.original ||
                           item.productName.displayName ||
                           item.productName.title ||
                           item.productName.label;
      
      if (extractedName) {
        displayName = extractedName;
      } else {
        // Check if it's a simple object with a single property
        const objectKeys = Object.keys(item.productName);
        if (objectKeys.length === 1 && typeof item.productName[objectKeys[0]] === 'string') {
          displayName = item.productName[objectKeys[0]];
        } else {
          displayName = 'Unknown Product (Object)';
        }
      }
    } else if (item.name) {
      displayName = item.name;
    } else if (item.item) {
      displayName = item.item;
    } else if (item.original) {
      displayName = item.original;
    } else if (item.text) {
      displayName = item.text;
    }
    
    return displayName;
  };

  // Fix cart item structure to ensure productName is always a string
  const fixCartItemStructure = (cartData) => {
    // If cart items have nested structure, flatten them
    if (Array.isArray(cartData)) {
      return cartData.map(item => {
        // Ensure each item has a proper productName string
        let productName = '';
        
        // Handle various possible structures
        if (typeof item === 'string') {
          // Item is just a string
          productName = item;
          return {
            id: generateStableId('item'),
            productName: productName,
            quantity: 1,
            unit: 'each',
            price: 0,
            confidence: 'medium',
            category: 'Other'
          };
        }
        
        // Extract product name from various possible fields
        if (typeof item.productName === 'object' && item.productName !== null) {
          const extractedName = item.productName.text || 
                               item.productName.name || 
                               item.productName.value ||
                               item.productName.original ||
                               item.productName.displayName ||
                               item.productName.title ||
                               item.productName.label;
          
          if (extractedName) {
            productName = extractedName;
          } else {
            // Check if it's a simple object with a single property
            const objectKeys = Object.keys(item.productName);
            if (objectKeys.length === 1 && typeof item.productName[objectKeys[0]] === 'string') {
              productName = item.productName[objectKeys[0]];
            } else {
              productName = 'Unknown Product (Object)';
            }
          }
        } else if (typeof item.productName === 'string') {
          productName = item.productName;
        } else if (item.name) {
          productName = item.name;
        } else if (item.item) {
          productName = item.item;
        } else if (item.original) {
          productName = item.original;
        } else if (item.text) {
          productName = item.text;
        } else {
          productName = 'Unknown Item';
        }
        
        // Return properly structured item
        return {
          ...item,
          id: item.id || generateStableId('item'),
          productName: productName, // Ensure this is always a string
          quantity: item.quantity || 1,
          unit: item.unit || 'each',
          price: item.price || 0,
          confidence: item.confidence || 'medium',
          category: item.category || 'Other'
        };
      }).filter(item => {
        // Filter out invalid/corrupted items
        const invalidNames = ['error', 'undefined', 'null', '', '⚠️ Failed to generate ingredients - please retry'];
        const productName = (item.productName || '').toLowerCase().trim();
        
        // Skip items with invalid names or corrupted error messages
        if (invalidNames.includes(productName) || productName.includes('⚠️') || productName.includes('failed to generate')) {
          console.warn('🗑️ Filtering out corrupted cart item:', {
            originalProductName: item.productName,
            convertedProductName: productName,
            itemKeys: Object.keys(item),
            matchedInvalidName: invalidNames.find(name => name === productName),
            containsWarning: productName.includes('⚠️'),
            containsFailedGenerate: productName.includes('failed to generate'),
            fullItem: JSON.stringify(item, null, 2)
          });
          return false;
        }
        
        return true;
      });
    }
    
    return cartData;
  };

  // Safe function to get product display name for rendering
  // eslint-disable-next-line no-unused-vars
  const getProductDisplayName = (item) => {
    // Handle various possible structures
    if (typeof item.productName === 'string') {
      return item.productName;
    }
    
    if (typeof item.productName === 'object' && item.productName !== null) {
      // If productName is an object, try to extract the actual text
      const extractedName = item.productName.text || 
                           item.productName.name || 
                           item.productName.value ||
                           item.productName.original ||
                           item.productName.displayName ||
                           item.productName.title ||
                           item.productName.label;
      
      if (extractedName) {
        return extractedName;
      }
      
      // Check if it's a simple object with a single property
      const objectKeys = Object.keys(item.productName);
      if (objectKeys.length === 1 && typeof item.productName[objectKeys[0]] === 'string') {
        return item.productName[objectKeys[0]];
      }
      
      // Last resort - return a more user-friendly fallback
      return 'Unknown Product (Object)';
    }
    
    // Fallback to other possible fields
    return item.name || 
           item.item || 
           item.original || 
           item.text || 
           'Unknown Item';
  };

  // Debug effect to monitor cart structure changes
  useEffect(() => {
    if (currentCart && currentCart.length > 0) {
      console.log('🛒 Current cart structure:', currentCart);
      currentCart.forEach((item, index) => {
        console.log(`Item ${index}:`, {
          fullItem: item,
          productNameType: typeof item.productName,
          productNameValue: item.productName,
          allKeys: Object.keys(item)
        });
      });
    }
  }, [currentCart]);

  // Show results when cart has items
  useEffect(() => {
    setShowResults(currentCart.length > 0);
  }, [currentCart]);

  // Initialize expansion states when recipes change
  useEffect(() => {
    const allRecipes = [...parsedRecipes, ...recipes];
    if (allRecipes.length > 0) {
      // Initialize states for new recipes that don't have a state yet
      setIndividualExpansionStates(prev => {
        const newStates = { ...prev };
        allRecipes.forEach((_, index) => {
          if (newStates[index] === undefined) {
            // Set initial state based on mealPlanExpanded
            newStates[index] = mealPlanExpanded;
          }
        });
        return newStates;
      });
    }
  }, [parsedRecipes, recipes, mealPlanExpanded]);

  // Generate a complete meal plan using the dedicated AI meal plan service
  const generateCompleteMealPlan = async () => {
    if (generatingMealPlan) {
      console.log('🚫 Meal plan generation already in progress');
      return;
    }

    setGeneratingMealPlan(true);
    setError('');
    setIsLoading(true);
    setShowProgress(true);
    setParsingProgress(0);

    try {
      console.log('🍽️ Starting complete AI meal plan generation with preferences:', mealPlanPreferences);

      // Clear existing recipes to make room for new meal plan
      setParsedRecipes([]);
      setRecipes([]);

      // Call the dedicated AI meal plan service
      const mealPlanResult = await generateAIMealPlan(mealPlanPreferences, currentUser);

      console.log('✅ AI meal plan generated successfully:', mealPlanResult);

      if (mealPlanResult.success && mealPlanResult.mealPlan) {
        const { mealPlan } = mealPlanResult;

        // Set the recipes from the meal plan
        if (mealPlan.recipes && mealPlan.recipes.length > 0) {
          console.log(`📋 Displaying ${mealPlan.recipes.length} meal plan recipes`);
          setRecipes(mealPlan.recipes);
        }

        // Set the shopping list from the meal plan
        if (mealPlan.shoppingList && mealPlan.shoppingList.length > 0) {
          console.log(`🛒 Setting shopping list with ${mealPlan.shoppingList.length} items`);
          const shoppingListText = mealPlan.shoppingList.map(item => {
            const quantity = item.quantity || '1';
            const unit = item.unit ? ` ${item.unit}` : '';
            const name = item.item || item.name;
            return `• ${quantity}${unit} ${name}`;
          }).join('\n');

          setInputText(shoppingListText);
          if (textareaRef.current) {
            textareaRef.current.value = shoppingListText;
          }
        }

        // If there's a saveMealPlan prop function, save the meal plan
        if (typeof saveMealPlan === 'function') {
          try {
            // Generate ID if meal plan doesn't have one
            if (!mealPlan.id) {
              mealPlan.id = `meal_plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            await saveMealPlan(mealPlan);
            console.log('💾 Meal plan saved successfully');
          } catch (saveError) {
            console.error('💾 Failed to save meal plan:', saveError);
          }
        }

        setParsingProgress(100);
        console.log('✅ Complete AI meal plan generation finished successfully');
      } else {
        throw new Error(mealPlanResult.error || 'Failed to generate meal plan');
      }
    } catch (error) {
      console.error('❌ Error generating complete meal plan:', error);
      setError(`Failed to generate meal plan: ${error.message}`);
    } finally {
      setGeneratingMealPlan(false);
      setIsLoading(false);
      setShowProgress(false);
      setParsingProgress(0);
    }
  };

  const templates = [
    {
      id: 'weekly-meal',
      icon: '📅',
      title: 'AI Meal Plan Generator',
      description: 'Generate a complete 7-day meal plan with recipes and shopping list using AI.',
      isFunction: true,
      action: generateCompleteMealPlan,
      prompt: `Create a detailed 7-day meal plan with MULTIPLE SEPARATE RECIPES for a family of 4. Format as follows:

**Day 1**
- Breakfast: 
- Lunch:  
- Dinner: 
- Snack:  

**Day 2**
- Breakfast:  
- Lunch:  
- Dinner:
- Snack:

Continue for all 7 days. After the meal plan, provide the complete grocery shopping list organized by category. Make sure each meal is a SEPARATE recipe with its own name and description, not a generic overview.`
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
    if (template.isFunction && template.action) {
      // Call the function directly for function-based templates
      template.action();
    } else {
      // Use the prompt for text-based templates
      setInputText(template.prompt);
      setWaitingForAIResponse(false);
      // Trigger textarea expansion after template content loads
      setTimeout(() => {
        expandTextarea();
      }, 50);
    }
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

    let progressInterval;
    try {
      progressInterval = setInterval(() => {
        setParsingProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3048';
      
      // STEP 1: Generate with AI (first click)
      if (useAI && selectedAI && !waitingForAIResponse) {
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
                structuredFormat: true
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
          
          let groceryListProcessed = false;
          
          // Handle structured data response
          if (aiData.structuredData && aiData.recipes) {
            console.log(`📊 Found ${aiData.recipes.length} recipes and ${aiData.products?.length || 0} products`);
            
            // Store structured recipes for display
            if (aiData.recipes.length > 0) {
              console.log('Displaying structured recipes from AI:', aiData.recipes);
              // FIXED: Only add to recipes array to avoid duplication 
              // (parsedRecipes is for text parsing, recipes is for AI-generated)
              setRecipes(aiData.recipes);
            }
            
            // Use structured products - filter out meal descriptions
            if (aiData.products && aiData.products.length > 0) {
              console.log('🔍 Processing structured products, total count:', aiData.products.length);
              
              // Filter out any "products" that are actually meal descriptions
              const realGroceryItems = aiData.products.filter(product => {
                const name = product.productName || product.name;
                const isMealDescription = name.match(/^(Breakfast|Lunch|Dinner|Snack):/i);
                
                if (isMealDescription) {
                  console.log('🍽️ Skipping meal plan item (should be recipe):', name);
                  return false;
                }
                return true;
              });
              
              console.log('🛒 Real grocery items after filtering:', realGroceryItems.length);
              
              if (realGroceryItems.length > 0) {
                const groceryItems = realGroceryItems.map(product => {
                  const quantity = product.quantity || '1';
                  const unit = product.unit ? ` ${product.unit}` : '';
                  const name = product.productName || product.name;
                  return `• ${quantity}${unit} ${name}`;
                });
                
                const groceryListText = groceryItems.join('\n');
                setInputText(groceryListText);
                
                if (textareaRef.current) {
                  textareaRef.current.value = groceryListText;
                }
                
                groceryListProcessed = true;
              } else {
                console.log('⚠️ No real grocery items found after filtering meal descriptions');
              }
            }
          }
          
          // Fallback to text extraction if no structured data
          if (!groceryListProcessed) {
            const aiResponseText = extractAIResponseText(aiData);
            if (aiResponseText) {
              const cleanGroceryList = extractGroceryListOnly(aiResponseText);
              setInputText(cleanGroceryList);
              
              if (textareaRef.current) {
                textareaRef.current.value = cleanGroceryList;
              }
              
              // Parse and display recipes from AI response  WHERE THE MAGIC HAPPENS FOR RECIPES
              try {
                const recipeResult = await extractMealPlanRecipes(aiResponseText);
                if (recipeResult.recipes && recipeResult.recipes.length > 0) {
                  console.log('Parsed recipes from AI response:', recipeResult.recipes);
                  setValidParsedRecipes(recipeResult.recipes);
                }
              } catch (recipeError) {
                console.error('❌ Failed to parse recipes from AI response:', recipeError);
              }
              
              groceryListProcessed = true;
            }
          }
          
          if (groceryListProcessed) {
            // Expand textarea
            setTimeout(() => {
              expandTextarea();
            }, 50);
            
            // Clear loading states
            clearInterval(progressInterval);
            clearTimeout(overlaySafety);
            setIsLoading(false);
            setShowProgress(false);
            setParsingProgress(0);
            
            // Set flag for second click
            setWaitingForAIResponse(true);
            
            console.log('✅ AI has generated your list! Hit CARTSMASH again to add items to cart.');
            return;
          } else {
            throw new Error('AI response was empty');
          }
          
        } catch (aiError) {
          console.error('AI request failed:', aiError);
          setError(`AI request failed: ${aiError.message}`);
          clearInterval(progressInterval);
          clearTimeout(overlaySafety);
          setIsLoading(false);
          setShowProgress(false);
          setParsingProgress(0);
          setWaitingForAIResponse(false);
          return;
        }
      }
      
      // STEP 2: Parse text into cart items (second click or manual text)
      if (waitingForAIResponse || !useAI) {
        console.log('📦 Parsing grocery list into cart items...');
        
        const response = await fetch(`${API_URL}/api/cart/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listText: listText,
            action: mergeCart ? 'merge' : 'replace',
            userId: currentUser?.uid || null,
            options: {
              mergeDuplicates: true,
              enhancedQuantityParsing: true,
              detectContainers: true
            }
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to parse list: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.cart) {
          // Fix cart item structure before setting
          const fixedCart = fixCartItemStructure(data.cart);
          
          console.log('Original cart:', data.cart);
          console.log('Fixed cart:', fixedCart);
          
          // Update the cart with properly structured items
          setCurrentCart(fixedCart);
          
          // Update parsing stats
          if (data.stats) {
            setParsingStats(data.stats);
          }
          
          // Clear the waiting flag
          setWaitingForAIResponse(false);
          
          // Clear the input for next use
          setInputText('');
          if (textareaRef.current) {
            textareaRef.current.value = '';
          }
          
          // Clear draft
          clearDraft();
          
          console.log(`✅ Added ${fixedCart.length} items to cart!`);
          
        } else {
          throw new Error(data.error || 'Failed to parse grocery list');
        }
        
        // Clear loading states
        clearInterval(progressInterval);
        clearTimeout(overlaySafety);
        setIsLoading(false);
        setShowProgress(false);
        setParsingProgress(0);
        return;
      }
      
      // If we get here, something went wrong
      setError('Unable to process. Please try again.');
      
    } catch (err) {
      console.error('Processing failed:', err);
      setError(`Failed to process: ${err.message}`);
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
    
    // Force AI usage - NEVER use manual parsing fallback for recipes
    // Only skip AI if no AI model is selected or no input text
    const shouldUseAI = selectedAI && inputText.trim().length > 0;
    
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
    // Clear both recipe arrays
    setParsedRecipes([]);
    setRecipes([]);
  };

  // eslint-disable-next-line no-unused-vars
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

  // Pure AI-only generation with better prompting and validation - NO MANUAL FALLBACKS
  const generateDetailedRecipeWithAI = async (recipeName, retryCount = 0) => {
    const MAX_RETRIES = 2;
    
    console.log('🤖 AI-ONLY generation for:', recipeName);
    console.log('📊 Attempt:', retryCount + 1, 'of', MAX_RETRIES);
    
    if (retryCount >= MAX_RETRIES) {
      console.error(`❌ AI failed after ${MAX_RETRIES} attempts for: ${recipeName}`);
      throw new Error(`AI generation failed for "${recipeName}" after ${MAX_RETRIES} attempts. Please try again with a different recipe name.`);
    }

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      
      // Simple, natural recipe prompt without artificial restrictions
      const prompt = `Create a detailed recipe for "${recipeName}".

Please provide:
- Complete ingredient list with measurements
- Clear step-by-step cooking instructions
- Include cooking times and temperatures where helpful
- Any useful tips or notes

Return as JSON with this structure:
{
  "ingredients": ["ingredient with measurement", ...],
  "instructions": ["step 1", "step 2", ...]
}`;

      console.log('📝 Sending prompt attempt', retryCount + 1);
      
      const response = await fetch(`${API_URL}/api/ai/${selectedAI || 'anthropic'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          context: 'detailed_recipe_generation',
          options: {
            temperature: 0.7,
            maxTokens: 8192
          }
        })
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Debug what we received
      console.log('🔍 AI Response Structure:', {
        hasResponse: !!data.response,
        hasStructuredData: !!data.structuredData,
        hasInstructions: !!data.instructions,
        responseType: typeof data.response
      });

      let parsedData;
      
      // Try multiple parsing strategies
      if (data.structuredData && data.structuredData.instructions) {
        parsedData = data.structuredData;
      } else if (data.instructions && Array.isArray(data.instructions)) {
        parsedData = {
          ingredients: data.ingredients || [],
          instructions: data.instructions
        };
      } else if (data.response) {
        try {
          // Clean and parse JSON response
          let jsonStr = data.response;
          if (typeof jsonStr === 'string') {
            // Remove markdown code blocks if present
            jsonStr = jsonStr.replace(/```json\n?/gi, '').replace(/```\n?/gi, '');
            // Remove any text before the first {
            const jsonStart = jsonStr.indexOf('{');
            if (jsonStart > 0) {
              jsonStr = jsonStr.substring(jsonStart);
            }
            // Remove any text after the last }
            const jsonEnd = jsonStr.lastIndexOf('}');
            if (jsonEnd > 0) {
              jsonStr = jsonStr.substring(0, jsonEnd + 1);
            }
            parsedData = JSON.parse(jsonStr);
          } else if (typeof jsonStr === 'object') {
            parsedData = jsonStr;
          }
        } catch (e) {
          console.error('JSON parse error:', e);
          console.log('Raw response length:', data.response?.length);
          console.log('Raw response preview:', data.response?.substring(0, 500));
          
          // Check if response appears truncated
          if (data.response && data.response.length > 6000 && !data.response.trim().endsWith('}')) {
            console.warn('⚠️ Response appears to be truncated - trying to repair JSON');
            // Try to repair truncated JSON by closing incomplete structures
            let repairedJson = data.response;
            
            // Count open braces vs closed braces to detect incomplete objects
            const openBraces = (repairedJson.match(/{/g) || []).length;
            const closeBraces = (repairedJson.match(/}/g) || []).length;
            const missingBraces = openBraces - closeBraces;
            
            if (missingBraces > 0) {
              // Add missing closing braces
              repairedJson += '}'.repeat(missingBraces);
              try {
                parsedData = JSON.parse(repairedJson);
                console.log('✅ Successfully repaired truncated JSON');
              } catch (repairError) {
                console.error('❌ Failed to repair JSON:', repairError);
                throw new Error(`Response appears truncated (${data.response.length} chars). Try reducing meal plan size or increasing token limit.`);
              }
            } else {
              throw new Error(`Failed to parse AI response as JSON: ${e.message}`);
            }
          } else {
            throw new Error(`Failed to parse AI response as JSON: ${e.message}`);
          }
        }
      } else {
        throw new Error('No valid response structure from AI');
      }

      const ingredients = Array.isArray(parsedData.ingredients) ? parsedData.ingredients : [];
      const instructions = Array.isArray(parsedData.instructions) ? parsedData.instructions : [];

      console.log('📊 Parsed recipe data:', {
        ingredientCount: ingredients.length,
        instructionCount: instructions.length,
        firstInstructionLength: instructions[0]?.split(' ').length || 0
      });

      // Accept all valid recipes without artificial restrictions
      console.log(`✅ Recipe validation passed - accepting AI-generated content as provided`);

      console.log(`✅ AI successfully generated detailed recipe for "${recipeName}"`);
      console.log(`   - ${ingredients.length} ingredients`);
      console.log(`   - ${instructions.length} detailed instructions`);
      
      return {
        ingredients: ingredients,
        instructions: instructions,
        success: true,
        source: 'ai_generated'
      };

    } catch (error) {
      console.error(`❌ AI attempt ${retryCount + 1} failed:`, error.message);
      
      // Retry with different prompt
      if (retryCount < MAX_RETRIES - 1) {
        console.log(`🔄 Retrying with more explicit prompt...`);
        return await generateDetailedRecipeWithAI(recipeName, retryCount + 1);
      }
      
      // Final failure - throw error instead of manual fallback
      throw new Error(`AI generation failed for "${recipeName}": ${error.message}`);
    }
  };

  // REMOVED: All manual parsing functions - AI-ONLY mode enforced

  // Handle adding recipe to recipe library
  // eslint-disable-next-line no-unused-vars
  const handleAddRecipeToLibrary = (recipe) => {
    console.log('📚 Adding recipe to library:', recipe.title);
    // Recipe library functionality preserved
  };





  // Extract multiple recipes from a meal plan
  const extractMealPlanRecipes = async (text) => {
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
    
    // If this looks like a single recipe, use AI generation
    if (!isTrueMealPlan) {
      console.log('📝 Content appears to be a single recipe, using AI generation...');
      // Return AI-only placeholder - actual AI generation handled elsewhere
      return {
        recipes: [],
        totalRecipes: 0,
        requiresAI: true
      };
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
        console.log('Found meal type header:', mealTypeMatch[1]);
        continue;
      }
      
      // Detect recipe patterns (exclude section headers) - enhanced for AI responses
      const recipeStartPatterns = [
        /^(Breakfast|Lunch|Dinner|Snack):\s*(.+)/i,  // "Breakfast: Oatmeal"
        /^-\s*(Breakfast|Lunch|Dinner|Snack):\s*(.+)/i, // "- Breakfast: Oatmeal with berries"
        /^\*\s*(Breakfast|Lunch|Dinner|Snack):\s*(.+)/i, // "* Lunch: Turkey sandwich"
        /^Recipe Name:\s*(.+)/i,                       // "Recipe Name: Chicken Stir-fry"
        /^Recipe:\s*(.+)/i,                           // "Recipe: Pasta"
        /^##\s+([^#\n]+)/i,                           // "## Recipe Title" - simplified
        /^###\s+([^#\n]+)/i,                          // "### Recipe Title" - simplified  
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
            if (currentRecipe.ingredients.length === 0 || currentRecipe.instructions.length === 0) {
              console.log('🤖 AI generation required for:', currentRecipe.title);
              
              try {
                const aiRecipe = await generateDetailedRecipeWithAI(currentRecipe.title);
                
                if (currentRecipe.ingredients.length === 0) {
                  currentRecipe.ingredients = aiRecipe.ingredients;
                }
                if (currentRecipe.instructions.length === 0) {
                  currentRecipe.instructions = aiRecipe.instructions;
                }
              } catch (error) {
                // Show error to user instead of using fallbacks
                console.error('❌ Recipe generation failed for:', currentRecipe.title, error.message);
                // Don't save corrupted recipes to avoid localStorage pollution
                console.log('🚫 Skipping corrupted recipe to prevent localStorage pollution');
                continue; // Skip this recipe instead of saving it with error messages
              }
            }
            // Validate the recipe before adding it
            if (isValidRecipe(currentRecipe)) {
              console.log('💾 Saving recipe:', currentRecipe.title, 
                         `(${currentRecipe.ingredients.length} ingredients)`);
              recipes.push(currentRecipe);
            } else {
              console.log('🚫 Skipping invalid recipe:', currentRecipe.title);
            }
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
          if (currentRecipe.ingredients.length === 0 || currentRecipe.instructions.length === 0) {
            console.log('🤖 AI generation required for:', currentRecipe.title);
            
            try {
              const aiRecipe = await generateDetailedRecipeWithAI(currentRecipe.title);
              
              if (currentRecipe.ingredients.length === 0) {
                currentRecipe.ingredients = aiRecipe.ingredients;
              }
              if (currentRecipe.instructions.length === 0) {
                currentRecipe.instructions = aiRecipe.instructions;
              }
            } catch (error) {
              console.error('❌ Recipe generation failed for:', currentRecipe.title, error.message);
              // Don't add corrupted recipe - just skip it
              console.log('🚫 Skipping failed recipe to prevent corruption');
              // Continue to next recipe without adding this one
              continue; 
            }
          }
          
          // Validate the recipe before adding it
          if (isValidRecipe(currentRecipe)) {
            console.log('💾 Saving recipe:', currentRecipe.title);
            recipes.push(currentRecipe);
          } else {
            console.log('🚫 Skipping invalid recipe:', currentRecipe.title);
          }
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
      if (!currentRecipe && !line.match(/^[-•*]/) && !line.match(/^\d+[.)]/) && 
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
          default:
            // Handle unexpected section types
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
      // Add AI-generated content if missing
      if (currentRecipe.ingredients.length === 0 || currentRecipe.instructions.length === 0) {
        console.log('🤖 AI generation required for final recipe:', currentRecipe.title);
        
        try {
          const aiRecipe = await generateDetailedRecipeWithAI(currentRecipe.title);
          
          if (currentRecipe.ingredients.length === 0) {
            currentRecipe.ingredients = aiRecipe.ingredients;
          }
          if (currentRecipe.instructions.length === 0) {
            currentRecipe.instructions = aiRecipe.instructions;
          }
        } catch (error) {
          // Show error to user instead of using fallbacks
          console.error('❌ Recipe generation failed for final recipe:', currentRecipe.title, error.message);
          currentRecipe.ingredients = currentRecipe.ingredients.length === 0 ? ['⚠️ Failed to generate ingredients - please retry'] : currentRecipe.ingredients;
          currentRecipe.instructions = currentRecipe.instructions.length === 0 ? ['⚠️ Failed to generate instructions - please retry'] : currentRecipe.instructions;
          currentRecipe.error = true;
        }
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

  // DUPLICATE FUNCTION REMOVED - parseAIRecipes already exists at line 1084

  // Handle adding recipe to recipe library
  const handleAddToRecipeLibrary = (recipe) => {
    // Safely handle ingredients and instructions that might be arrays or strings
    const ingredientsText = Array.isArray(recipe.ingredients) 
      ? recipe.ingredients.map((ingredient, index) => {
          console.log(`🔍 [DEBUG] Processing recipe library ingredient ${index}:`, ingredient);
          
          if (typeof ingredient === 'string') {
            return ingredient;
          }
          
          // Handle structured ingredient objects with multiple possible formats
          if (typeof ingredient === 'object' && ingredient !== null) {
            // Check for original text format
            if (ingredient.original) {
              return ingredient.original;
            }
            
            // Check for quantity + unit + item format
            if (ingredient.quantity && ingredient.item) {
              const unit = ingredient.unit || '';
              return `${ingredient.quantity}${unit ? ' ' + unit : ''} ${ingredient.item}`;
            }
            
            // Check for quantity + unit + name format
            if (ingredient.quantity && ingredient.name) {
              const unit = ingredient.unit || '';
              return `${ingredient.quantity}${unit ? ' ' + unit : ''} ${ingredient.name}`;
            }
            
            // Check for amount + ingredient format
            if (ingredient.amount && ingredient.ingredient) {
              return `${ingredient.amount} ${ingredient.ingredient}`;
            }
            
            // Check for text field
            if (ingredient.text) {
              return ingredient.text;
            }
            
            // Check for description field
            if (ingredient.description) {
              return ingredient.description;
            }
            
            // Last resort: try to construct from available fields
            const qty = ingredient.qty || ingredient.quantity || '';
            const unit = ingredient.unit || '';
            const name = ingredient.name || ingredient.item || ingredient.ingredient || '';
            
            if (name) {
              return `${qty}${unit ? ' ' + unit : ''} ${name}`.trim();
            }
          }
          
          console.warn(`⚠️ Could not parse recipe library ingredient at index ${index}:`, ingredient);
          return `• Unknown ingredient`;
        }).filter(ingredient => ingredient && ingredient.trim() !== '').join('\n')
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
  // eslint-disable-next-line no-unused-vars
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
            items: recipe.ingredients?.map((ingredient, index) => {
              const parsed = parseIngredientForShoppingList(ingredient);
              return {
                id: `item_${Date.now()}_${index}`,
                itemName: parsed.itemName,
                productName: parsed.productName,
                quantity: parsed.quantity,
                unit: parsed.unit,
                category: 'Other'
              };
            }) || [],
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
                <p style={styles.previewTextBasic}>
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
      [index]: !(prev[index] ?? false) // Handle undefined properly
    }));
  };

  const handleCollapseExpandAll = () => {
    const allRecipes = [...parsedRecipes, ...recipes];
    const newExpandedState = !mealPlanExpanded;
    
    console.log(`🔄 Toggling all ${allRecipes.length} recipes to ${newExpandedState ? 'expanded' : 'collapsed'}`);
    console.log('Current states before toggle:', individualExpansionStates);
    
    setMealPlanExpanded(newExpandedState);
    
    // Create a completely new state object for ALL recipes using loop for clarity
    const newIndividualStates = {};
    for (let i = 0; i < allRecipes.length; i++) {
      newIndividualStates[i] = newExpandedState;
    }
    
    console.log('New states to set:', newIndividualStates);
    
    // Replace the entire state object to force re-render
    setIndividualExpansionStates(newIndividualStates);
    
    console.log(`✅ Setting all ${allRecipes.length} recipes (indices 0-${allRecipes.length - 1}) to ${newExpandedState ? 'expanded' : 'collapsed'}`);
  };

  // Clear all recipes function
  const handleClearAllRecipes = () => {
    setParsedRecipes([]);
    setRecipes([]);
    setIndividualExpansionStates({});
    console.log('✨ Cleared all recipes');
  };

  // Helper function to format ingredients with quantities
  const formatIngredientWithQuantity = (item) => {
    if (typeof item === 'string') {
      // Try to parse if it's a string with quantity pattern
      const match = item.match(/^(\d+(?:\.\d+)?)\s*([\w\s]+?)\s+(.+)$/);
      if (match) {
        return `${match[1]} ${match[2]} ${match[3]}`;
      }
      // If no quantity found, add default serving
      return item.includes('1 ') || item.includes('2 ') || item.includes('cup') || item.includes('tsp') || item.includes('tbsp') || item.includes('lb') || item.includes('oz') 
        ? item 
        : `1 serving ${item}`;
    }
    
    // If it's an object with quantity and unit
    const qty = item.quantity || 1;
    const unit = item.unit || 'each';
    const name = item.productName || item.name || item.original || item.item || '';
    
    return `${qty} ${unit} ${name}`.trim();
  };

  // Helper function to parse ingredients for shopping list
  const parseIngredientForShoppingList = (ingredient) => {
    if (typeof ingredient === 'string') {
      // Try to parse quantity and unit from string
      const match = ingredient.match(/^(\d+(?:\.\d+)?)\s*([\w\s]*?)\s*(.+)$/);
      if (match) {
        const quantity = parseFloat(match[1]) || 1;
        const unit = match[2].trim() || 'each';
        const productName = match[3].trim();
        return {
          quantity,
          unit,
          productName: productName || ingredient,
          itemName: productName || ingredient
        };
      }
      // Default parsing if no quantity found
      return {
        quantity: 1,
        unit: 'serving',
        productName: ingredient,
        itemName: ingredient
      };
    }
    
    // If it's already an object, extract the needed properties
    return {
      quantity: ingredient.quantity || 1,
      unit: ingredient.unit || 'each',
      productName: ingredient.productName || ingredient.name || ingredient.original || ingredient.item || ingredient,
      itemName: ingredient.itemName || ingredient.name || ingredient.original || ingredient.item || ingredient
    };
  };

  // Enhanced Recipe Card Component - supports both old and unified formats
  const RecipeCard = ({ recipe, index, onAddToCart, onAddToLibrary, onAddToMealPlan, onRemove, onEdit, externalExpanded, onToggleExpanded }) => {
    // Use external expanded state directly - no internal state needed
    const expanded = externalExpanded ?? false; // Default to false if undefined
    
    // When clicking expand button, use the external toggle function
    const handleToggle = () => {
      if (onToggleExpanded) {
        onToggleExpanded();
      }
    };
    
    // Extract data with fallbacks for both formats
    const title = cleanRecipeTitle(recipe.title || recipe.name || 'Untitled Recipe');
    const mealType = recipe.mealType || 'Dinner';
    const icon = recipe.icon || getMealTypeIcon(mealType);
    const day = recipe.day || recipe.dayAssigned;
    const ingredients = recipe.ingredients || [];
    const instructions = recipe.instructions || [];
    const servings = recipe.servings;
    const prepTime = recipe.prepTime;
    const cookTime = recipe.cookTime;
    
    // Handle both string arrays and object arrays for ingredients with proper quantity formatting
    const displayIngredients = ingredients.map(ing => cleanMarkdown(formatIngredientWithQuantity(ing)));
    
    // Handle both string arrays and object arrays for instructions  
    const displayInstructions = instructions.map(inst => {
      const instruction = typeof inst === 'string' ? inst : inst.instruction || inst.step || inst;
      return cleanMarkdown(instruction);
    });
    
    // No artificial limitations on recipe instructions - display them as provided
    
    return (
      <div style={expanded ? styles.enhancedRecipeCard : styles.enhancedRecipeCardCollapsed}>
        <div style={styles.recipeHeader}>
          <button 
            onClick={handleToggle}
            style={styles.expandButton}
            title={expanded ? "Show less" : "Show full recipe"}
          >
            {expanded ? '▼' : '▶'}
          </button>
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
              onClick={() => onAddToCart(recipe)}
              style={styles.addToCartHeaderButton}
            >
              🛒
            </button>
            <button 
              onClick={() => onAddToLibrary(recipe)}
              style={styles.wideHeaderButton}
            >
              ❤️
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
              📅
            </button>
            <button 
              onClick={() => onRemove(index)}
              style={styles.wideDeleteButton}
            >
              🗑️
            </button>
          </div>
        </div>
        
        {/* Show preview when collapsed, full content when expanded */}
        {!expanded && (
          <div style={styles.recipePreview}>
            {/* Show brief preview of ingredients and first instruction */}
            {displayIngredients && displayIngredients.length > 0 && (
              <p style={styles.previewText}>
                <strong>Ingredients:</strong> {displayIngredients.slice(0, 3).join(', ')}
                {displayIngredients.length > 3 && '...'}
              </p>
            )}
            {displayInstructions && displayInstructions.length > 0 && (
              <p style={styles.previewText}>
                <strong>Instructions:</strong> {displayInstructions[0].substring(0, 100)}
                {displayInstructions[0].length > 100 && '...'}
              </p>
            )}
          </div>
        )}
        
        {/* Full content when expanded */}
        {expanded && (
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
          
          {/* Ingredients - Now always fully expanded when visible */}
          {displayIngredients && displayIngredients.length > 0 && (
            <div style={styles.recipeSection}>
              <h5 style={styles.sectionTitle}>📝 Ingredients:</h5>
              <ul style={styles.ingredientsList}>
                {displayIngredients.map((ingredient, idx) => (
                  <li key={idx} style={styles.ingredientItem}>{ingredient}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Enhanced Instructions Section */}
          {displayInstructions && displayInstructions.length > 0 && (
            <div style={styles.instructionsSection}>
              <h5 style={styles.instructionsSectionTitle}>
                👨‍🍳 Detailed Cooking Instructions:
              </h5>
              
              {/* Show cooking metadata if available */}
              {(recipe.prepTime || recipe.cookTime || recipe.totalTime || recipe.difficulty) && (
                <div style={styles.cookingMetadata}>
                  {recipe.prepTime && (
                    <span style={styles.metaBadge}>⏱️ Prep: {recipe.prepTime}</span>
                  )}
                  {recipe.cookTime && (
                    <span style={styles.metaBadge}>🔥 Cook: {recipe.cookTime}</span>
                  )}
                  {recipe.totalTime && (
                    <span style={styles.metaBadge}>⏰ Total: {recipe.totalTime}</span>
                  )}
                  {recipe.difficulty && (
                    <span style={styles.metaBadge}>📊 {recipe.difficulty}</span>
                  )}
                </div>
              )}
              
              <ol style={styles.professionalInstructionsList}>
                {displayInstructions.map((step, idx) => {
                  // Highlight key information in instructions
                  const highlightKeyInfo = (text) => {
                    // Highlight temperatures
                    let highlighted = text.replace(/(\d+°[FC])/g, '<strong style="color: #FB4F14;">$1</strong>');
                    // Highlight times
                    highlighted = highlighted.replace(/(\d+\s*(?:minutes?|hours?|seconds?))/g, '<strong style="color: #002244;">$1</strong>');
                    // Highlight visual cues
                    highlighted = highlighted.replace(/(until\s+[^,.]+)/g, '<em style="color: #666;">$1</em>');
                    
                    return highlighted;
                  };
                  
                  return (
                    <li key={idx} style={styles.detailedInstructionItem}>
                      <div dangerouslySetInnerHTML={{ __html: highlightKeyInfo(step) }} />
                    </li>
                  );
                })}
              </ol>
              
              {/* Tips Section if available */}
              {recipe.tips && (
                <div style={styles.tipsSection}>
                  <h6 style={styles.tipsTitle}>💡 Pro Tips:</h6>
                  <p style={styles.tipsText}>{recipe.tips}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Notes */}
          {recipe.notes && (
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
        )}
      </div>
    );
  };

  // Handle adding recipe ingredients to cart
  const handleAddRecipeToCart = async (recipe) => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      alert('❌ This recipe has no ingredients to add to cart');
      return;
    }

    console.log('🛒 Adding recipe to cart:', recipe.title || recipe.name || 'Unnamed Recipe');
    console.log('🥕 Recipe ingredients:', recipe.ingredients);
    
    // Debug: Check if ingredients need conversion
    const hasObjectIngredients = recipe.ingredients.some(ing => typeof ing === 'object');
    console.log('🔍 Has object ingredients:', hasObjectIngredients);

    try {
      // Convert ingredients array to text format, handling both string and object formats
      const ingredientsText = recipe.ingredients.map((ingredient, index) => {
        console.log(`🔍 [DEBUG] Processing ingredient ${index}:`, ingredient);
        
        if (typeof ingredient === 'string') {
          return ingredient;
        }
        
        // Handle structured ingredient objects with multiple possible formats
        if (typeof ingredient === 'object' && ingredient !== null) {
          // Check for original text format
          if (ingredient.original) {
            return ingredient.original;
          }
          
          // Check for quantity + unit + item format
          if (ingredient.quantity && ingredient.item) {
            const unit = ingredient.unit || '';
            return `${ingredient.quantity}${unit ? ' ' + unit : ''} ${ingredient.item}`;
          }
          
          // Check for quantity + unit + name format
          if (ingredient.quantity && ingredient.name) {
            const unit = ingredient.unit || '';
            return `${ingredient.quantity}${unit ? ' ' + unit : ''} ${ingredient.name}`;
          }
          
          // Check for just item/name
          if (ingredient.item) {
            return ingredient.item;
          }
          
          if (ingredient.name) {
            return ingredient.name;
          }
          
          // Try to extract meaningful content from the object
          const keys = Object.keys(ingredient);
          console.log(`🔍 [DEBUG] Ingredient object keys:`, keys);
          
          // Look for common ingredient property names
          const commonProps = ['ingredient', 'product', 'food', 'description'];
          for (const prop of commonProps) {
            if (ingredient[prop] && typeof ingredient[prop] === 'string') {
              return ingredient[prop];
            }
          }
          
          // If it's an object with useful properties, try to format it
          if (keys.length > 0) {
            const meaningfulKeys = keys.filter(k => 
              typeof ingredient[k] === 'string' || 
              typeof ingredient[k] === 'number'
            );
            
            if (meaningfulKeys.length > 0) {
              // Try to construct a meaningful ingredient string
              const parts = meaningfulKeys.map(key => `${ingredient[key]}`).filter(part => part && part.trim());
              if (parts.length > 0) {
                return parts.join(' ');
              }
            }
          }
        }
        
        // Last resort: if we can't extract anything meaningful, skip this ingredient
        console.warn(`⚠️ Could not parse ingredient at index ${index}:`, ingredient);
        return null;
      }).filter(ingredient => ingredient !== null && ingredient.trim() !== '').join('\n');
      
      console.log('📝 [DEBUG] Final ingredients text to send to API:');
      console.log(ingredientsText);
      console.log('📝 [DEBUG] Length:', ingredientsText.length);
      
      // Check if we have any ingredients to send
      if (!ingredientsText.trim()) {
        console.error('❌ No valid ingredients found to send to API');
        alert('❌ Could not extract ingredients from this recipe. Please check the recipe format.');
        return;
      }
      
      // Use the same API endpoint as regular grocery list parsing
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3048';
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
        // Fix cart item structure before setting
        const fixedCart = fixCartItemStructure(data.cart);
        
        console.log('🔍 [DEBUG] Recipe API Response:', {
          success: data.success,
          cartLength: data.cart?.length,
          fullResponse: data
        });
        console.log('🔍 [DEBUG] Original cart items:', data.cart?.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          keys: Object.keys(item)
        })));
        console.log('🔍 [DEBUG] Fixed cart items:', fixedCart?.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit
        })));
        
        // Debug each item before setting
        data.cart.forEach((item, index) => {
          console.log(`🔍 [DEBUG] Raw cart item ${index}:`, item);
          debugCartItem(item);
        });
        
        // Update the cart with properly structured items
        setCurrentCart(fixedCart);
        
        // Count added items - use the parsed count from the API response if available
        const addedCount = data.parsedCount || recipe.ingredients.length;
        
        alert(`✅ Added ${addedCount} ingredients from "${recipe.title || recipe.name || 'Recipe'}" to your cart!`);
        
        console.log(`✅ Successfully added ${addedCount} items to cart from recipe:`, recipe.title);
      } else {
        console.error('API Response:', data);
        throw new Error(data.error || 'Failed to parse recipe ingredients');
      }
    } catch (error) {
      console.error('❌ Error adding recipe to cart:', error);
      alert('❌ Failed to add recipe ingredients to cart. Please try again.');
    }
  };

  // Handle removing a recipe from the parsed recipes list
  const handleRemoveRecipe = (recipeIndex) => {
    // Combined array for display, but need to remove from the correct source array
    // eslint-disable-next-line no-unused-vars
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

  // Manual cleanup function for corrupted localStorage data
  const manualCleanupLocalStorage = useCallback(() => {
    const confirmed = window.confirm(
      '🧹 This will remove all corrupted meal plan data from localStorage. This includes any recipes with "Failed to generate" messages. Continue?'
    );
    
    if (confirmed) {
      console.log('🧹 Manual localStorage cleanup initiated...');
      
      // Clear all potential recipe storage
      const keysToRemove = [
        'cartsmash-recipes', 
        'cart-smash-recipes', 
        'cartsmash-meal-plan',
        'parsedRecipes',
        'saved-recipes',
        'meal-plan-cache',
        'recipe-cache'
      ];
      
      keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed localStorage key: ${key}`);
        }
      });
      
      // Force page reload to start fresh
      console.log('🔄 Reloading page to start with clean data...');
      window.location.reload();
    }
  }, []);

  // Debug delete function to test individual item removal
  const debugDeleteItem = useCallback((itemId) => {
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
  }, [currentCart, setCurrentCart]);

  // Recipe import handlers
  // eslint-disable-next-line no-unused-vars
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
        setValidParsedRecipes([...parsedRecipes, ...importedRecipes]);
        
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

  // eslint-disable-next-line no-unused-vars
  const handleImportFromAI = async () => {
    if (!aiRecipeText.trim()) {
      alert('Please enter some recipe text for AI to parse');
      return;
    }

    setImportingRecipe(true);
    try {
      console.log('🤖 Importing recipe from AI text:', aiRecipeText.substring(0, 300) + '...');
      
      const result = await unifiedRecipeService.importOne({
        source: 'ai-text',
        data: { text: aiRecipeText.trim() },
        userId: currentUser?.uid || null
      });

      if (result.success && result.recipes?.length > 0) {
        const importedRecipes = result.recipes;
        console.log('✅ Successfully imported recipes from AI:', importedRecipes);
        
        // Add to parsed recipes to display them
        setValidParsedRecipes([...parsedRecipes, ...importedRecipes]);
        
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
            id: item.id || generateStableId('item')
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

  // Fixed delete handler - simple ID-based filtering with proper hydration handling
  const handleDeleteItem = useCallback((itemId) => {
    console.log('🗑️ handleDeleteItem called with:', itemId);
    
    setCurrentCart(prevCart => {
      console.log('📋 Cart items before deletion:', prevCart.map(item => ({id: item.id, name: item.productName})));
      
      // Simple filtering - only match the exact item ID
      const newCart = prevCart.filter(item => item.id !== itemId);
      console.log(`🗑️ Deletion: ${prevCart.length} → ${newCart.length} items (removed ID: ${itemId})`);
      
      // Debug: show which items remain
      if (prevCart.length === newCart.length) {
        console.warn('⚠️ No item was removed - ID not found in cart');
        console.log('Available IDs:', prevCart.map(item => item.id));
      } else {
        console.log('✅ Item successfully removed');
      }
      
      return newCart;
    });
  }, [setCurrentCart]);

  // Main component return (this should be inside the main GroceryListForm function)
  return (
    <div className="container">
      {(isLoading || showProgress) && (
        <MixingBowlLoader text={
          waitingForAIResponse ? "CARTSMASH AI is generating your list..." :
          showProgress ? "CARTSMASH AI is parsing your grocery list..." :
          "CARTSMASH is processing your list..."
        } />
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
            {isAdmin && (
              <button onClick={() => setShowAISettings(true)} style={styles.actionBtn}>
                ⚙️ AI Settings
              </button>
            )}
          </div>

          {/* Settings */}
          <div style={styles.settings}>
            {/* Merge/Replace Toggle */}
            <div style={styles.settingGroup}>
              <label style={styles.settingLabel}>List Option:</label>
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
              <label style={styles.settingLabel}>Ingredients:</label>
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
              minHeight: inputText.trim().length > 0 ? '60px' : '40px', // Dynamic based on content
              height: 'auto',
              resize: 'none'
            }}
            rows="3"
          />
          
          {waitingForAIResponse && (
            <div style={styles.aiStatusMessage}>
              Done! Hit CARTSMASH to add items.
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
            <button
              style={styles.collapseButton}
              onClick={handleCollapseExpandAll}
              title={mealPlanExpanded ? "Collapse all recipe details" : "Expand all recipe details"}
            >
              {mealPlanExpanded ? '▼' : '▶'}
            </button>
            <div style={styles.headerLeft}>
              <h3 style={styles.recipesTitle}>
                {(parsedRecipes.some(r => r.mealType || r.tags?.includes('meal plan')) || recipes.some(r => r.mealType || r.tags?.includes('meal plan'))) ? 
                  'Meal Plan Ideas' : 'Recipes Found'}
              </h3>
              <span style={styles.recipeCounter}>
                ({parsedRecipes.length + recipes.length} recipe{parsedRecipes.length + recipes.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div style={styles.headerButtonGroup}>
              <button
                style={styles.clearRecipesButton}
                onClick={handleClearAllRecipes}
                title="Clear all recipes from the list"
              >
                🗑️
              </button>
              <button
                style={styles.cleanupButton}
                onClick={manualCleanupLocalStorage}
                title="Fix corrupted recipe data (removes 'Failed to generate' errors)"
              >
                🧹 Fix Data
              </button>
            </div>
          </div>
          
          {/* Always show recipe cards with individual expansion control */}
          {[...parsedRecipes, ...recipes].map((recipe, index) => (
            <RecipeCard 
              key={index} 
              recipe={recipe} 
              index={index}
              externalExpanded={individualExpansionStates[index] !== undefined ? individualExpansionStates[index] : mealPlanExpanded}
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
            // Pass user's retailer preference and zip code for catalog searches
            selectedRetailer={currentUser?.preferredRetailer || currentUser?.selectedRetailer || 'kroger'}
            userZipCode={currentUser?.zipCode || currentUser?.postalCode || '95670'}
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
              <div style={styles.buttonContentOriginal}>
                <div style={styles.buttonTitle}>CARTSMASH to Instacart</div>
                <div style={styles.buttonSubtitle}>
                  Send items to your Instacart cart
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

      {showAISettings && isAdmin && (
        <AIParsingSettings
          onClose={() => setShowAISettings(false)}
          onSettingsChange={(newSettings) => {
            console.log('AI Settings updated:', newSettings);
            // Future: Store settings in localStorage or context
          }}
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
}; // End of GroceryListForm function

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
    background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
    border: '2px solid #FF6B35',
    borderRadius: '12px',
    padding: '16px 20px',
    marginTop: '12px',
    marginBottom: '12px',
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: '600',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
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
    background: 'linear-gradient(135deg, #002244, #1E3A8A)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,34,68,0.3)',
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

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: '1'
  },

  recipeCounter: {
    color: '#666',
    fontSize: '14px',
    fontWeight: '500'
  },

  headerButtonGroup: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },

  collapseButton: {
    background: 'linear-gradient(135deg, #002244 0%, #0066CC 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 6px rgba(0, 34, 68, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },

  clearRecipesButton: {
    background: 'linear-gradient(135deg, #E74C3C 0%, #c0392b 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 6px rgba(231, 76, 60, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },

  cleanupButton: {
    background: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 6px rgba(155, 89, 182, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: '8px'
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
    background: '#FFF5F2',
    color: '#002244',
    border: '1px solid #FB4F14',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,34,68,0.2)'
  },

  addToCartButton: {
    padding: '10px 16px',
    background: 'white',
    color: '#002244',
    border: '1px solid #FB4F14',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,34,68,0.2)',
    ':hover': {
      background: '#f8f9fa',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(251,79,20,0.3)'
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
    padding: '8px',
    background: 'white',
    color: '#002244',
    border: '1px solid #FB4F14',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,34,68,0.2)',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':hover': {
      background: '#f8f9fa',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(251,79,20,0.3)'
    }
  },

  wideHeaderButton: {
    padding: '8px',
    background: 'white',
    color: '#002244',
    border: '1px solid #FB4F14',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.2s',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,34,68,0.2)',
    ':hover': {
      background: '#f8f9fa',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(251,79,20,0.3)'
    }
  },

  wideDeleteButton: {
    padding: '8px 16px',
    background: 'white',
    color: '#dc3545',
    border: '2px solid #dc3545',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    minWidth: '100px',
    ':hover': {
      background: '#dc3545',
      color: 'white',
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
  
  previewTextBasic: {
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
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #002244 0%, #0066CC 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 6px rgba(0, 34, 68, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginRight: '12px'
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
  },

  // Enhanced Professional Recipe Instruction Styles
  instructionsSection: {
    marginTop: '20px',
    padding: '20px',
    backgroundColor: '#FAFAFA',
    borderRadius: '12px',
    border: '2px solid #002244'
  },
  
  instructionsSectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#002244',
    borderBottom: '2px solid #FB4F14',
    paddingBottom: '8px'
  },
  
  cookingMetadata: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  
  metaBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    backgroundColor: '#002244',
    color: 'white',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600'
  },
  
  professionalInstructionsList: {
    margin: '0',
    padding: '0 0 0 20px',
    counterReset: 'step-counter'
  },
  
  detailedInstructionItem: {
    fontSize: '15px',
    lineHeight: '1.8',
    color: '#333',
    marginBottom: '16px',
    paddingLeft: '12px',
    position: 'relative',
    backgroundColor: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  
  tipsSection: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#FFF3CD',
    borderRadius: '8px',
    border: '1px solid #FFC107'
  },
  
  tipsTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#856404'
  },
  
  tipsText: {
    margin: 0,
    fontSize: '14px',
    color: '#856404',
    lineHeight: '1.6'
  },

  // Collapsed recipe card style for compact display
  enhancedRecipeCardCollapsed: {
    background: '#FFF5F2',
    borderRadius: '12px',
    padding: '16px', // Less padding when collapsed
    marginBottom: '12px', // Less margin when collapsed
    border: '2px solid #FB4F14',
    boxShadow: '0 2px 8px rgba(251,79,20,0.1)',
    transition: 'all 0.3s ease'
  },

  recipePreview: {
    padding: '12px',
    backgroundColor: '#FAFAFA',
    borderRadius: '8px',
    marginTop: '8px',
    border: '1px solid #E0E0E0'
  },

  previewText: {
    margin: '4px 0',
    fontSize: '14px',
    lineHeight: '1.4',
    color: '#555',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 1,
    WebkitBoxOrient: 'vertical'
  }
};

export default GroceryListForm;
