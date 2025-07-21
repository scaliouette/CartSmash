// server/routes/cart.js - ENHANCED with Better Container/Packaging Unit Detection
const express = require('express');
const router = express.Router();

console.log('🛒 Loading Enhanced Cart routes with improved container parsing...');

// Import services
let AIProductParser, KrogerAPIService;
try {
  AIProductParser = require('../utils/aiProductParser');
  console.log('✅ AI Product Parser loaded');
} catch (error) {
  console.warn('⚠️ AI Product Parser not found, using fallback parsing');
}

try {
  KrogerAPIService = require('../services/KrogerAPIService');
  console.log('✅ Kroger API Service loaded');
} catch (error) {
  console.warn('⚠️ Kroger API Service not found, continuing without Kroger integration');
}

// Initialize services
const productParser = AIProductParser ? new AIProductParser() : null;
const krogerService = KrogerAPIService ? new KrogerAPIService() : null;

// Simple in-memory storage (in production, use a database)
let cart = [];
let cartMetadata = {
  lastModified: new Date().toISOString(),
  totalItems: 0,
  estimatedValue: 0,
  validationStatus: 'pending'
};

// ✅ NEW: Recipe storage
let savedRecipes = [];

// ✅ ENHANCED: Container/packaging patterns for intelligent unit extraction
const containerPatterns = [
  // Cans
  { patterns: ['can of', 'cans of', 'oz can', 'ounce can', 'lb can'], unit: 'can' },
  { patterns: ['canned'], unit: 'can' },
  
  // Bottles
  { patterns: ['bottle of', 'bottles of', 'oz bottle', 'ml bottle'], unit: 'bottle' },
  { patterns: ['bottled'], unit: 'bottle' },
  
  // Bags
  { patterns: ['bag of', 'bags of', 'lb bag', 'oz bag'], unit: 'bag' },
  { patterns: ['bagged'], unit: 'bag' },
  
  // Boxes
  { patterns: ['box of', 'boxes of', 'oz box'], unit: 'box' },
  { patterns: ['boxed'], unit: 'box' },
  
  // Jars
  { patterns: ['jar of', 'jars of', 'oz jar'], unit: 'jar' },
  { patterns: ['jarred'], unit: 'jar' },
  
  // Packages/Packs
  { patterns: ['package of', 'packages of', 'pack of', 'packs of'], unit: 'pack' },
  { patterns: ['packaged'], unit: 'pack' },
  
  // Containers
  { patterns: ['container of', 'containers of', 'tub of', 'tubs of'], unit: 'container' },
  
  // Cartons
  { patterns: ['carton of', 'cartons of'], unit: 'carton' },
  
  // Bunches
  { patterns: ['bunch of', 'bunches of'], unit: 'bunch' },
  
  // Heads
  { patterns: ['head of', 'heads of'], unit: 'head' },
  
  // Loaves
  { patterns: ['loaf of', 'loaves of'], unit: 'loaf' },
  
  // Rolls
  { patterns: ['roll of', 'rolls of'], unit: 'roll' },
  
  // Tubes
  { patterns: ['tube of', 'tubes of'], unit: 'tube' },
  
  // Pouches
  { patterns: ['pouch of', 'pouches of'], unit: 'pouch' },
  
  // Six-packs, 12-packs, etc.
  { patterns: ['six-pack', '6-pack', 'six pack', '6 pack'], unit: '6-pack' },
  { patterns: ['twelve-pack', '12-pack', 'twelve pack', '12 pack'], unit: '12-pack' },
  { patterns: ['case of'], unit: 'case' }
];

// ✅ ENHANCED: Better quantity parsing function
function parseQuantityAndUnit(text) {
  console.log(`🔢 Parsing quantity from: "${text}"`);
  
  // Clean up the text first
  let cleanText = text.trim();
  let detectedUnit = '';
  
  // ✅ NEW: First check for container/packaging patterns
  const lowerText = cleanText.toLowerCase();
  for (const containerPattern of containerPatterns) {
    for (const pattern of containerPattern.patterns) {
      if (lowerText.includes(pattern)) {
        detectedUnit = containerPattern.unit;
        console.log(`📦 Detected container unit: ${detectedUnit} from pattern "${pattern}"`);
        break;
      }
    }
    if (detectedUnit) break;
  }
  
  // Handle various fraction formats
  const fractionPatterns = [
    // Mixed numbers: "2 1/4", "1 1/2", "3 3/4"
    {
      regex: /^(\d+)\s+(\d+)\s*\/\s*(\d+)\s*(.*)$/,
      handler: (match) => {
        const [, whole, num, den, rest] = match;
        const quantity = parseInt(whole) + (parseInt(num) / parseInt(den));
        return { quantity, remaining: rest.trim() };
      }
    },
    // Simple fractions: "1/4", "3/4", "1 /2" (with space)
    {
      regex: /^(\d+)\s*\/\s*(\d+)\s*(.*)$/,
      handler: (match) => {
        const [, num, den, rest] = match;
        const quantity = parseInt(num) / parseInt(den);
        return { quantity, remaining: rest.trim() };
      }
    },
    // Decimal numbers: "1.5", "2.25"
    {
      regex: /^(\d+\.?\d*)\s*(.*)$/,
      handler: (match) => {
        const [, num, rest] = match;
        const quantity = parseFloat(num);
        return { quantity, remaining: rest.trim() };
      }
    },
    // Whole numbers: "2", "10"
    {
      regex: /^(\d+)\s*(.*)$/,
      handler: (match) => {
        const [, num, rest] = match;
        const quantity = parseInt(num);
        return { quantity, remaining: rest.trim() };
      }
    }
  ];

  // Try each pattern
  for (const pattern of fractionPatterns) {
    const match = cleanText.match(pattern.regex);
    if (match) {
      const result = pattern.handler(match);
      
      // ✅ NEW: Return with detected container unit if found
      if (detectedUnit) {
        console.log(`✅ Parsed quantity: ${result.quantity}, unit: ${detectedUnit}, remaining: "${result.remaining}"`);
        return { quantity: result.quantity, unit: detectedUnit, remaining: result.remaining };
      }
      
      console.log(`✅ Parsed quantity: ${result.quantity}, remaining: "${result.remaining}"`);
      return result;
    }
  }

  // If no quantity found, default to 1
  console.log(`⚠️ No quantity found in "${text}", defaulting to 1`);
  return { quantity: 1, unit: detectedUnit, remaining: cleanText };
}

// ✅ ENHANCED: Better unit extraction with container priority
function extractUnit(text, preDetectedUnit = '') {
  // If we already detected a container unit, use it
  if (preDetectedUnit) {
    return { unit: preDetectedUnit, remaining: text };
  }
  
  const commonUnits = [
    // Volume
    { patterns: ['cup', 'cups', 'c'], unit: 'cups' },
    { patterns: ['tablespoon', 'tablespoons', 'tbsp', 'tbs'], unit: 'tbsp' },
    { patterns: ['teaspoon', 'teaspoons', 'tsp'], unit: 'tsp' },
    { patterns: ['gallon', 'gallons', 'gal'], unit: 'gal' },
    { patterns: ['quart', 'quarts', 'qt'], unit: 'qt' },
    { patterns: ['pint', 'pints', 'pt'], unit: 'pt' },
    { patterns: ['fluid ounce', 'fluid ounces', 'fl oz', 'floz'], unit: 'fl oz' },
    { patterns: ['liter', 'liters', 'l'], unit: 'l' },
    { patterns: ['milliliter', 'milliliters', 'ml'], unit: 'ml' },
    
    // Weight
    { patterns: ['pound', 'pounds', 'lb', 'lbs'], unit: 'lbs' },
    { patterns: ['ounce', 'ounces', 'oz'], unit: 'oz' },
    { patterns: ['kilogram', 'kilograms', 'kg'], unit: 'kg' },
    { patterns: ['gram', 'grams', 'g'], unit: 'g' },
    
    // Count
    { patterns: ['dozen', 'doz'], unit: 'dozen' },
    { patterns: ['piece', 'pieces', 'pc'], unit: 'piece' },
    { patterns: ['each', 'ea'], unit: 'each' },
    { patterns: ['clove', 'cloves'], unit: 'clove' },
    
    // ✅ NEW: Check for container patterns again if not already detected
    ...containerPatterns.map(cp => ({
      patterns: cp.patterns.map(p => p.replace(' of', '').replace(' ', '')),
      unit: cp.unit
    }))
  ];

  const lowerText = text.toLowerCase();
  
  for (const unitGroup of commonUnits) {
    for (const pattern of unitGroup.patterns) {
      if (lowerText.includes(pattern)) {
        const remaining = text.replace(new RegExp(pattern, 'gi'), '').trim();
        return { unit: unitGroup.unit, remaining };
      }
    }
  }
  
  return { unit: '', remaining: text };
}

// ✅ ENHANCED: Better product name cleaning
function cleanProductName(text) {
  let cleaned = text;
  
  // Remove common prefixes and suffixes that aren't part of the product name
  const removePatterns = [
    /^(get|buy|pick up|purchase|need|grab)\s+/gi,
    /^(a|an|the|one|two|three|four|five|six|seven|eight|nine|ten)\s+/gi,
    /\s+(for|to|at|in|with|from|during|while|when|if).*$/gi,
    /\(.*?\)/g, // Remove parenthetical info like "(8 oz)"
    /\s+$/, // Trailing whitespace
    /^\s+/, // Leading whitespace
    // ✅ NEW: Remove container words if they appear at the beginning
    /^(bottle|can|jar|box|bag|container|package|pack)\s+of\s+/gi
  ];
  
  for (const pattern of removePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

// ✅ ENHANCED: Improved parsing function with container detection
function parseGroceryItemEnhanced(line, index, userId) {
  console.log(`🔍 Enhanced parsing for line ${index}: "${line}"`);
  
  let cleaned = line.trim()
    .replace(/^[-*•·◦▪▫◆◇→➤➢>]\s*/, '') // Remove bullet points
    .replace(/^\d+\.\s*/, '') // Remove numbered list markers
    .replace(/^[a-z]\)\s*/i, ''); // Remove lettered list markers

  // ✅ FIX: Parse quantity and detect container unit first
  const quantityResult = parseQuantityAndUnit(cleaned);
  let quantity = quantityResult.quantity;
  let containerUnit = quantityResult.unit || ''; // Container unit from quantity parsing
  let remaining = quantityResult.remaining;
  
  // ✅ FIX: Extract unit (if not already detected as container)
  const unitResult = extractUnit(remaining, containerUnit);
  let unit = unitResult.unit || containerUnit; // Prefer container unit if detected
  remaining = unitResult.remaining;
  
  // ✅ FIX: Clean up the product name
  let productName = cleanProductName(remaining);
  
  // Skip if the product name is too short or invalid
  if (!productName || productName.length < 2) {
    console.log(`❌ Skipping invalid item: "${line}"`);
    return null;
  }
  
  // ✅ NEW: Smart unit detection based on product name if no unit found
  if (!unit) {
    const productLower = productName.toLowerCase();
    
    // Check for implicit container/packaging in product name
    if (productLower.includes('canned')) unit = 'can';
    else if (productLower.includes('bottled')) unit = 'bottle';
    else if (productLower.includes('bagged')) unit = 'bag';
    else if (productLower.includes('boxed')) unit = 'box';
    else if (productLower.includes('jarred')) unit = 'jar';
    else if (productLower.includes('frozen')) unit = 'bag'; // Often frozen items come in bags
    else if (productLower.includes('fresh') && productLower.match(/lettuce|spinach|greens/)) unit = 'bag';
  }
  
  // Determine category (simple categorization)
  let category = 'other';
  const itemLower = productName.toLowerCase();
  
  if (itemLower.match(/milk|cheese|yogurt|butter|cream|eggs/)) category = 'dairy';
  else if (itemLower.match(/bread|bagel|muffin|cake|cookie|loaf/)) category = 'bakery';
  else if (itemLower.match(/apple|banana|orange|fruit|vegetable|carrot|lettuce|tomato|potato|onion|spinach|broccoli|pepper|cucumber|celery|avocado/)) category = 'produce';
  else if (itemLower.match(/chicken|beef|pork|turkey|fish|salmon|meat|ground/)) category = 'meat';
  else if (itemLower.match(/cereal|pasta|rice|beans|soup|sauce|flour|sugar|salt|spice|oil|vinegar/)) category = 'pantry';
  else if (itemLower.match(/juice|soda|water|coffee|tea|beer|wine|beverage/)) category = 'beverages';
  else if (itemLower.match(/frozen|ice cream/)) category = 'frozen';
  else if (itemLower.match(/chips|crackers|nuts|candy|snack/)) category = 'snacks';

  const parsedItem = {
    id: `item_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
    original: line.trim(),
    itemName: productName,
    productName: productName,
    quantity: quantity,
    unit: unit,
    category: category,
    confidence: unit ? 0.85 : 0.75, // Higher confidence if we detected a container unit
    timestamp: new Date().toISOString(),
    userId: userId,
    addedBy: 'enhanced_parser',
    parsingMethod: 'enhanced_container_parsing',
    containerDetected: !!containerUnit, // ✅ NEW: Track if container was detected
    needsReview: quantity < 0.1 || productName.length < 3 || !unit, // Flag items without units
    validationSources: ['enhanced_parser']
  };
  
  console.log(`✅ Enhanced parsed item:`, parsedItem);
  return parsedItem;
}

// Enhanced parse grocery list with improved parsing
router.post('/parse', async (req, res) => {
  console.log('📝 Enhanced cart parse request received');
  const { 
    listText, 
    action = 'replace', 
    userId = null, 
    options = {},
    recipeInfo = null // ✅ NEW: Accept recipe information
  } = req.body;
  
  if (!listText) {
    return res.status(400).json({ 
      success: false,
      error: 'listText is required' 
    });
  }
  
  const startTime = Date.now();
  
  try {
    // ✅ NEW: Save recipe information if provided
    if (recipeInfo) {
      const recipe = {
        id: Date.now().toString(),
        title: recipeInfo.title || `Recipe ${new Date().toLocaleDateString()}`,
        ingredients: recipeInfo.ingredients || [],
        instructions: recipeInfo.instructions || [],
        servings: recipeInfo.servings || '',
        prepTime: recipeInfo.prepTime || '',
        cookTime: recipeInfo.cookTime || '',
        fullText: recipeInfo.fullText || '',
        savedAt: new Date().toISOString(),
        userId: userId,
        ingredientChoice: recipeInfo.ingredientChoice || 'basic'
      };
      
      savedRecipes.push(recipe);
      console.log(`✅ Recipe saved: "${recipe.title}"`);
    }
    
    // Step 1: 🎯 Enhanced Parsing with Better Container Detection
    console.log('🎯 Starting enhanced product parsing with container detection...');
    let parsingResults;
    
    if (productParser) {
      // ✅ NEW: Pass container detection flag to AI parser
      parsingResults = await productParser.parseGroceryProducts(listText, {
        context: 'cart_parsing',
        strictMode: options.strictMode !== false,
        userId: userId,
        enhancedQuantityParsing: true,
        detectContainers: true // ✅ NEW: Enable container detection
      });
    } else {
      // ✅ ENHANCED: Use improved fallback parsing
      parsingResults = parseGroceryItemsEnhanced(listText, userId);
    }
    
    console.log(`✅ Enhanced parsing complete: ${parsingResults.products?.length || parsingResults.length} items extracted`);
    
    // Step 2: 🏪 Kroger Validation Enhancement (same as before)
    let enhancedItems = parsingResults.products || parsingResults;
    let krogerStats = {
      enabled: false,
      validatedItems: 0,
      totalPrice: 0,
      averageConfidence: 0,
      processingTime: 0
    };
    
    if (krogerService && options.enableKrogerValidation !== false) {
      console.log('🏪 Enhancing with Kroger validation...');
      const krogerStartTime = Date.now();
      
      try {
        const itemNames = enhancedItems.map(item => 
          item.productName || item.itemName || item.name
        );
        
        // Batch validate with Kroger
        const krogerValidation = await krogerService.batchValidateItems(itemNames, {
          locationId: options.storeLocationId || process.env.KROGER_DEFAULT_STORE,
          includePricing: true,
          fuzzyMatch: true
        });
        
        // Merge Kroger results with enhanced parsing
        enhancedItems = enhancedItems.map((item, index) => {
          const krogerResult = krogerValidation.items[index];
          const validation = krogerResult?.validation || { isValid: false, confidence: 0 };
          
          // Calculate combined confidence (AI 60%, Kroger 40%)
          const aiConfidence = item.confidence || 0.5;
          const krogerConfidence = validation.confidence || 0;
          const combinedConfidence = (aiConfidence * 0.6) + (krogerConfidence * 0.4);
          
          return {
            ...item,
            
            // Original AI data
            aiConfidence: aiConfidence,
            aiFactors: item.factors,
            
            // Kroger validation data
            krogerValidation: validation,
            isKrogerValidated: validation.isValid,
            krogerConfidence: krogerConfidence,
            krogerProduct: validation.product,
            
            // Enhanced product data
            realPrice: validation.product?.price || null,
            salePrice: validation.product?.salePrice || null,
            brand: validation.product?.brand || item.brand,
            size: validation.product?.size || item.size,
            upc: validation.product?.upc || null,
            imageUrl: validation.product?.imageUrl || null,
            availability: validation.product?.availability || 'unknown',
            storeId: validation.product?.storeId || options.storeLocationId,
            
            // Combined metrics
            confidence: combinedConfidence,
            validationSources: ['enhanced_parser', validation.isValid ? 'kroger' : null].filter(Boolean),
            
            // Suggestions for improvement
            suggestions: validation.alternatives || [],
            needsReview: combinedConfidence < 0.6 || (!validation.isValid && aiConfidence < 0.8) || !item.unit
          };
        });
        
        // Calculate Kroger statistics
        const validatedItems = enhancedItems.filter(item => item.isKrogerValidated);
        krogerStats = {
          enabled: true,
          validatedItems: validatedItems.length,
          validationRate: enhancedItems.length > 0 ? 
            (validatedItems.length / enhancedItems.length * 100).toFixed(1) + '%' : '0%',
          totalPrice: enhancedItems.reduce((sum, item) => {
            if (item.realPrice) {
              return sum + (item.realPrice * (parseFloat(item.quantity) || 1));
            }
            return sum;
          }, 0),
          averageConfidence: krogerValidation.summary?.averageConfidence || 0,
          processingTime: Date.now() - krogerStartTime,
          storeId: options.storeLocationId || process.env.KROGER_DEFAULT_STORE
        };
        
        console.log(`✅ Kroger validation complete: ${krogerStats.validatedItems}/${enhancedItems.length} items validated`);
        
      } catch (krogerError) {
        console.warn('⚠️ Kroger validation failed, using enhanced-only results:', krogerError.message);
        krogerStats.enabled = false;
        krogerStats.error = krogerError.message;
      }
    }
    
    // Step 3: 🔧 Convert to Cart Format
    const cartItems = enhancedItems.map((item, index) => ({
      id: item.id || `item_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      original: item.original || listText.split('\n')[index] || '',
      itemName: item.productName || item.itemName || 'Unknown Item',
      productName: item.productName || item.itemName || 'Unknown Item',
      quantity: parseFloat(item.quantity) || 1,
      unit: item.unit || null,
      category: item.category || 'other',
      
      // Confidence and validation
      confidence: item.confidence || 0.5,
      aiConfidence: item.aiConfidence || item.confidence || 0.5,
      isKrogerValidated: item.isKrogerValidated || false,
      krogerConfidence: item.krogerConfidence || 0,
      validationSources: item.validationSources || ['enhanced_parser'],
      
      // Product details
      brand: item.brand || null,
      size: item.size || null,
      upc: item.upc || null,
      imageUrl: item.imageUrl || null,
      
      // Pricing
      realPrice: item.realPrice || null,
      salePrice: item.salePrice || null,
      estimatedPrice: item.estimatedPrice || null,
      
      // Availability
      availability: item.availability || 'unknown',
      storeId: item.storeId || null,
      
      // ✅ NEW: Container detection info
      containerDetected: item.containerDetected || false,
      
      // Metadata
      factors: item.factors || [],
      suggestions: item.suggestions || [],
      needsReview: item.needsReview || false,
      timestamp: item.timestamp || new Date().toISOString(),
      userId: userId,
      addedBy: krogerStats.enabled ? 'enhanced_ai_kroger_parser' : 'enhanced_ai_parser',
      parsingMethod: krogerStats.enabled ? 'enhanced_with_kroger' : 'enhanced_container'
    }));
    
    // Step 4: 🛒 Update Cart Based on Action
    let previousCartSize = cart.length;
    
    if (action === 'replace') {
      cart = cartItems;
    } else if (action === 'merge') {
      // Smart merge - avoid duplicates by product name
      const existingNames = cart.map(item => 
        (item.productName || item.itemName || '').toLowerCase().trim()
      );
      
      const newItems = cartItems.filter(item => {
        const productName = (item.productName || '').toLowerCase().trim();
        return !existingNames.includes(productName);
      });
      
      cart = [...cart, ...newItems];
    }
    
    // Step 5: 📊 Update Cart Metadata
    cartMetadata = {
      lastModified: new Date().toISOString(),
      totalItems: cart.length,
      estimatedValue: cart.reduce((sum, item) => {
        const price = item.realPrice || item.estimatedPrice || 0;
        return sum + (price * item.quantity);
      }, 0),
      validationStatus: krogerStats.enabled ? 'kroger_validated' : 'enhanced_validated',
      lastParsingMethod: krogerStats.enabled ? 'enhanced_with_kroger' : 'enhanced_container'
    };
    
    // Step 6: 📈 Generate Statistics
    const parsingStats = productParser ? 
      productParser.getParsingStats(parsingResults) : 
      generateEnhancedStats(cartItems);
    
    const qualityMetrics = {
      highConfidenceItems: cartItems.filter(item => item.confidence >= 0.8).length,
      mediumConfidenceItems: cartItems.filter(item => item.confidence >= 0.6 && item.confidence < 0.8).length,
      needsReviewItems: cartItems.filter(item => item.needsReview).length,
      pricingAvailable: cartItems.filter(item => item.realPrice).length,
      categoriesFound: [...new Set(cartItems.map(item => item.category))].length,
      averageConfidence: cartItems.length > 0 ? 
        cartItems.reduce((sum, item) => sum + item.confidence, 0) / cartItems.length : 0,
      quantityParsingAccuracy: cartItems.filter(item => item.quantity > 0).length / cartItems.length,
      // ✅ NEW: Container detection metrics
      containersDetected: cartItems.filter(item => item.containerDetected).length,
      itemsWithUnits: cartItems.filter(item => item.unit).length,
      unitDetectionRate: cartItems.length > 0 ? 
        (cartItems.filter(item => item.unit).length / cartItems.length * 100).toFixed(1) + '%' : '0%'
    };
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Enhanced parsing complete in ${processingTime}ms: ${cartItems.length} items processed`);
    console.log(`📦 Container detection: ${qualityMetrics.containersDetected} containers detected`);
    console.log(`📏 Unit detection rate: ${qualityMetrics.unitDetectionRate}`);
    
    // Step 7: 📤 Send Enhanced Response
    res.json({
      success: true,
      cart: cart,
      action: action,
      
      // Parsing information
      parsing: {
        method: krogerStats.enabled ? 'enhanced_with_kroger' : 'enhanced_container',
        itemsExtracted: cartItems.length,
        itemsAdded: action === 'replace' ? cartItems.length : cart.length - previousCartSize,
        totalProcessingTime: processingTime,
        stats: parsingStats,
        quantityParsingEnabled: true,
        containerDetectionEnabled: true // ✅ NEW: Indicate container detection
      },
      
      // Kroger integration results
      kroger: krogerStats,
      
      // Quality assessment
      quality: qualityMetrics,
      
      // ✅ NEW: Recipe information
      recipe: recipeInfo ? {
        saved: true,
        title: recipeInfo.title,
        id: savedRecipes[savedRecipes.length - 1]?.id
      } : null,
      
      // Cart summary
      summary: {
        totalItems: cart.length,
        estimatedTotal: cartMetadata.estimatedValue > 0 ? 
          `$${cartMetadata.estimatedValue.toFixed(2)}` : null,
        validationRate: qualityMetrics.highConfidenceItems > 0 ? 
          (qualityMetrics.highConfidenceItems / cart.length * 100).toFixed(1) + '%' : '0%',
        needsReview: qualityMetrics.needsReviewItems,
        // ✅ NEW: Container and unit stats
        containersDetected: qualityMetrics.containersDetected,
        unitDetectionRate: qualityMetrics.unitDetectionRate
      },
      
      // Metadata
      metadata: cartMetadata,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Enhanced parsing failed:', error);
    
    // Fallback to simple parsing
    try {
      console.log('🔄 Falling back to simple parsing...');
      const fallbackItems = parseGroceryItemsSimpleEnhanced(listText, userId);
      
      if (action === 'replace') {
        cart = fallbackItems;
      } else if (action === 'merge') {
        const existingNames = cart.map(item => 
          (item.itemName || '').toLowerCase().trim()
        );
        const newItems = fallbackItems.filter(item => 
          !existingNames.includes((item.itemName || '').toLowerCase().trim())
        );
        cart = [...cart, ...newItems];
      }
      
      cartMetadata.lastModified = new Date().toISOString();
      cartMetadata.totalItems = cart.length;
      cartMetadata.validationStatus = 'enhanced_fallback_parsed';
      
      res.json({
        success: true,
        cart: cart,
        action: action,
        parsing: {
          method: 'enhanced_fallback',
          itemsExtracted: fallbackItems.length,
          warning: 'Enhanced parsing failed, used enhanced fallback parsing'
        },
        itemsAdded: fallbackItems.length,
        totalItems: cart.length,
        fallback: true,
        error: error.message,
        metadata: cartMetadata
      });
      
    } catch (fallbackError) {
      console.error('❌ Enhanced fallback parsing also failed:', fallbackError);
      res.status(500).json({
        success: false,
        error: 'Both enhanced and fallback parsing failed',
        details: {
          primaryError: error.message,
          fallbackError: fallbackError.message
        }
      });
    }
  }
});

// ✅ NEW: Recipe management endpoints
router.get('/recipes', (req, res) => {
  console.log('📝 Get saved recipes request');
  
  res.json({
    success: true,
    recipes: savedRecipes,
    count: savedRecipes.length,
    timestamp: new Date().toISOString()
  });
});

router.post('/recipes', (req, res) => {
  console.log('📝 Save recipe request');
  const { recipeInfo, userId } = req.body;
  
  if (!recipeInfo) {
    return res.status(400).json({
      success: false,
      error: 'recipeInfo is required'
    });
  }
  
  const recipe = {
    id: Date.now().toString(),
    title: recipeInfo.title || `Recipe ${new Date().toLocaleDateString()}`,
    ingredients: recipeInfo.ingredients || [],
    instructions: recipeInfo.instructions || [],
    servings: recipeInfo.servings || '',
    prepTime: recipeInfo.prepTime || '',
    cookTime: recipeInfo.cookTime || '',
    fullText: recipeInfo.fullText || '',
    savedAt: new Date().toISOString(),
    userId: userId,
    ingredientChoice: recipeInfo.ingredientChoice || 'basic'
  };
  
  savedRecipes.push(recipe);
  
  res.json({
    success: true,
    recipe: recipe,
    message: 'Recipe saved successfully'
  });
});

router.delete('/recipes/:id', (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ Delete recipe request: ${id}`);
  
  const initialLength = savedRecipes.length;
  savedRecipes = savedRecipes.filter(recipe => recipe.id !== id);
  
  if (savedRecipes.length < initialLength) {
    res.json({
      success: true,
      message: 'Recipe deleted successfully',
      deletedId: id
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Recipe not found',
      recipeId: id
    });
  }
});

// ✅ ENHANCED: Fallback parsing with better quantity and container handling
function parseGroceryItemsEnhanced(listText, userId) {
  const lines = listText.split('\n');
  const items = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const item = parseGroceryItemEnhanced(line, i, userId);
    if (item) {
      items.push(item);
    }
  }
  
  return items;
}

// ✅ ENHANCED: Fallback parsing with better container handling
function parseGroceryItemsSimpleEnhanced(listText, userId) {
  const items = listText.split('\n')
    .filter(line => line.trim())
    .map((line, index) => parseGroceryItemEnhanced(line, index, userId))
    .filter(item => item !== null); // Remove invalid items
  
  return items;
}

function generateEnhancedStats(items) {
  return {
    totalProducts: items.length,
    highConfidence: items.filter(item => item.confidence >= 0.8).length,
    mediumConfidence: items.filter(item => item.confidence >= 0.6 && item.confidence < 0.8).length,
    lowConfidence: items.filter(item => item.confidence < 0.6).length,
    categoriesFound: [...new Set(items.map(item => item.category))],
    averageConfidence: items.length > 0 ? 
      items.reduce((sum, item) => sum + item.confidence, 0) / items.length : 0,
    processingMetrics: {
      candidateItems: items.length,
      validProducts: items.filter(item => !item.needsReview).length,
      filteringEfficiency: items.length > 0 ? 
        ((items.filter(item => !item.needsReview).length / items.length) * 100).toFixed(1) + '%' : '100%',
      quantityParsingAccuracy: items.filter(item => item.quantity > 0).length / items.length,
      // ✅ NEW: Container detection metrics
      containerDetectionRate: items.length > 0 ?
        (items.filter(item => item.containerDetected).length / items.length * 100).toFixed(1) + '%' : '0%',
      unitCoverage: items.length > 0 ?
        (items.filter(item => item.unit).length / items.length * 100).toFixed(1) + '%' : '0%'
    }
  };
}

// Rest of the existing endpoints remain the same...
// (keeping all the existing cart management endpoints)

// Get current cart with enhanced metadata
router.get('/current', (req, res) => {
  console.log('🛒 Enhanced cart current request');
  
  try {
    // Calculate enhanced statistics
    const stats = {
      totalItems: cart.length,
      categories: {},
      confidenceDistribution: {
        high: cart.filter(item => (item.confidence || 0) >= 0.8).length,
        medium: cart.filter(item => (item.confidence || 0) >= 0.6 && (item.confidence || 0) < 0.8).length,
        low: cart.filter(item => (item.confidence || 0) < 0.6).length
      },
      validationSources: {
        enhanced_parser: cart.filter(item => item.validationSources?.includes('enhanced_parser')).length,
        kroger: cart.filter(item => item.validationSources?.includes('kroger')).length,
        both: cart.filter(item => 
          item.validationSources?.includes('enhanced_parser') && 
          item.validationSources?.includes('kroger')
        ).length
      },
      pricing: {
        itemsWithPricing: cart.filter(item => item.realPrice).length,
        totalValue: cart.reduce((sum, item) => {
          if (item.realPrice) {
            return sum + (item.realPrice * item.quantity);
          }
          return sum;
        }, 0),
        averageItemPrice: 0
      },
      availability: {},
      parsingMethods: {},
      needsReview: cart.filter(item => item.needsReview).length,
      averageConfidence: cart.length > 0 ? 
        cart.reduce((sum, item) => sum + (item.confidence || 0), 0) / cart.length : 0,
      // ✅ NEW: Enhanced parsing stats
      quantityAccuracy: cart.filter(item => item.quantity > 0).length / Math.max(cart.length, 1),
      unitRecognition: cart.filter(item => item.unit).length / Math.max(cart.length, 1),
      // ✅ NEW: Container detection stats
      containersDetected: cart.filter(item => item.containerDetected).length,
      containerTypes: {}
    };
    
    // Count items by category
    cart.forEach(item => {
      const category = item.category || 'other';
      stats.categories[category] = (stats.categories[category] || 0) + 1;
    });
    
    // Count by availability
    cart.forEach(item => {
      const availability = item.availability || 'unknown';
      stats.availability[availability] = (stats.availability[availability] || 0) + 1;
    });
    
    // Count by parsing method
    cart.forEach(item => {
      const method = item.parsingMethod || 'unknown';
      stats.parsingMethods[method] = (stats.parsingMethods[method] || 0) + 1;
    });
    
    // ✅ NEW: Count by container type
    cart.forEach(item => {
      if (item.unit && containerPatterns.some(cp => cp.unit === item.unit)) {
        stats.containerTypes[item.unit] = (stats.containerTypes[item.unit] || 0) + 1;
      }
    });
    
    // Calculate average item price
    const itemsWithPricing = cart.filter(item => item.realPrice);
    if (itemsWithPricing.length > 0) {
      stats.pricing.averageItemPrice = itemsWithPricing.reduce((sum, item) => 
        sum + item.realPrice, 0) / itemsWithPricing.length;
    }
    
    res.json({
      success: true,
      cart: cart,
      itemCount: cart.length,
      stats: stats,
      metadata: cartMetadata,
      timestamp: new Date().toISOString(),
      
      // Enhanced insights
      insights: {
        totalValidated: stats.confidenceDistribution.high + stats.confidenceDistribution.medium,
        validationRate: cart.length > 0 ? 
          ((stats.confidenceDistribution.high + stats.confidenceDistribution.medium) / cart.length * 100).toFixed(1) + '%' : '0%',
        averageConfidence: (stats.averageConfidence * 100).toFixed(1) + '%',
        krogerCoverage: cart.length > 0 ? 
          (stats.validationSources.kroger / cart.length * 100).toFixed(1) + '%' : '0%',
        estimatedTotal: stats.pricing.totalValue > 0 ? 
          `$${stats.pricing.totalValue.toFixed(2)}` : null,
        needsReview: stats.needsReview,
        mostCommonCategory: Object.keys(stats.categories).reduce((a, b) => 
          stats.categories[a] > stats.categories[b] ? a : b, 'other'),
        // ✅ NEW: Enhanced parsing insights
        quantityParsingAccuracy: (stats.quantityAccuracy * 100).toFixed(1) + '%',
        unitRecognitionRate: (stats.unitRecognition * 100).toFixed(1) + '%',
        // ✅ NEW: Container insights
        containersDetected: stats.containersDetected,
        mostCommonContainer: Object.keys(stats.containerTypes).length > 0 ?
          Object.keys(stats.containerTypes).reduce((a, b) => 
            stats.containerTypes[a] > stats.containerTypes[b] ? a : b) : 'none'
      }
    });
    
  } catch (error) {
    console.error('❌ Get current cart failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current cart',
      message: error.message
    });
  }
});

// Clear entire cart
router.post('/clear', (req, res) => {
  console.log('🗑️ Enhanced cart clear request');
  const previousCount = cart.length;
  const previousValue = cartMetadata.estimatedValue;
  
  cart = [];
  cartMetadata = {
    lastModified: new Date().toISOString(),
    totalItems: 0,
    estimatedValue: 0,
    validationStatus: 'empty'
  };
  
  res.json({ 
    success: true, 
    cart: [],
    message: 'Cart cleared successfully',
    cleared: {
      itemCount: previousCount,
      estimatedValue: previousValue,
      timestamp: new Date().toISOString()
    },
    metadata: cartMetadata
  });
});

// Enhanced search endpoint would go here...
// (keeping all other existing endpoints)

console.log('✅ Enhanced Cart routes loaded with container detection and better unit parsing');
module.exports = router;