# Recipe and AI Parsing Documentation

## Overview

CartSmash implements a sophisticated recipe processing and AI parsing system that handles multiple input formats, generates realistic cooking times, and standardizes recipe data across the application. This system is designed to seamlessly convert meal plans and recipes from various sources into a unified format for the CartSmash platform.

## Architecture

### Core Components

1. **AI Meal Plan Parser** (`server/services/aiMealPlanParser.js`)
   - Primary service for parsing and standardizing recipe data
   - Handles AI-generated meal plans and individual recipes
   - Generates realistic cooking times based on recipe complexity
   - Converts data to CartSmash format

2. **Unified Recipe Routes** (`server/routes/unifiedRecipeRoutes.js`)
   - API endpoints for recipe operations
   - Standardizes recipe data from multiple sources
   - Handles recipe saving and retrieval

3. **Product Resolution Service** (`client/src/services/productResolutionService.js`)
   - Maps CartSmash items to Instacart products
   - Handles quantity and unit conversion
   - Provides caching for performance optimization

## AI Meal Plan Parser Service

### Key Features

#### 1. Recipe Time Generation

The system generates realistic prep and cook times based on recipe complexity analysis:

```javascript
// Located in server/services/aiMealPlanParser.js:851-892
generateRealisticCookingTimes(recipeName, mealType) {
  const name = recipeName.toLowerCase();
  
  // Quick/simple meals (5-15 minutes)
  const quickKeywords = ['toast', 'cereal', 'yogurt', 'smoothie', 'sandwich', 'salad', 'wrap'];
  const isQuick = quickKeywords.some(keyword => name.includes(keyword));
  
  // Complex meals (30-90 minutes)
  const complexKeywords = ['roast', 'braised', 'stew', 'casserole', 'lasagna', 'risotto', 'soup', 'curry'];
  const isComplex = complexKeywords.some(keyword => name.includes(keyword));
  
  // Time calculations based on complexity and meal type...
}
```

#### 2. Time Formatting

Converts numerical time values to human-readable strings:

```javascript
// Located in server/services/aiMealPlanParser.js:834-846
formatTimeToString(minutes) {
  if (minutes < 60) {
    return `${minutes} minutes`;
  } else if (minutes === 60) {
    return '1 hour';
  } else if (minutes % 60 === 0) {
    return `${Math.floor(minutes / 60)} hours`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
}
```

#### 3. Recipe Standardization

The `toCartsmashFormat()` method converts recipes to the unified CartSmash format:

```javascript
// Core standardization logic
toCartsmashFormat() {
  return this.recipes.map((recipe, index) => ({
    name: recipe.name,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    servings: recipe.servings || 4,
    time: this.generateRealisticCookingTimes(recipe.name, this.detectMealType(index)),
    category: this.detectCategory(recipe.name),
    tags: this.generateTags(recipe.name, recipe.ingredients)
  }));
}
```

### Meal Type Detection

The parser automatically detects meal types based on recipe position and content:

```javascript
detectMealType(index) {
  const totalRecipes = this.recipes.length;
  if (totalRecipes === 7) {
    // Weekly meal plan
    const dayTypes = ['breakfast', 'lunch', 'dinner', 'breakfast', 'lunch', 'dinner', 'snack'];
    return dayTypes[index] || 'dinner';
  }
  // Default meal type logic...
}
```

## Unified Recipe Routes

### API Endpoints

The unified recipe routes provide standardized endpoints for recipe operations:

1. **POST `/api/recipes/save`** - Save recipes with standardization
2. **GET `/api/recipes/:id`** - Retrieve standardized recipe data
3. **POST `/api/recipes/parse`** - Parse and standardize external recipe data

### Recipe Standardization Logic

```javascript
// Located in server/routes/unifiedRecipeRoutes.js
const standardizeRecipe = (recipe) => ({
  name: recipe.name || recipe.title || 'Untitled Recipe',
  ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
  instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
  servings: parseInt(recipe.servings) || 4,
  prepTime: recipe.prepTime || '15-30 minutes',
  cookTime: recipe.cookTime || '20-45 minutes',
  totalTime: recipe.totalTime || '35-75 minutes',
  category: recipe.category || 'Main Course',
  tags: Array.isArray(recipe.tags) ? recipe.tags : []
});
```

## Product Resolution Service

### Core Functionality

The Product Resolution Service handles the mapping of CartSmash recipe ingredients to Instacart products:

#### 1. Item Resolution Pipeline

```javascript
// Located in client/src/services/productResolutionService.js:48-85
async resolveCartSmashItems(cartItems, retailerId = null) {
  const resolvedItems = [];
  const unresolvedItems = [];

  for (const item of cartItems) {
    try {
      const resolved = await this.resolveItem(item, retailerId);
      if (resolved.success) {
        resolvedItems.push(resolved);
      } else {
        unresolvedItems.push({
          originalItem: item,
          reason: resolved.error || 'No matching product found'
        });
      }
    } catch (error) {
      unresolvedItems.push({
        originalItem: item,
        reason: error.message
      });
    }
  }

  return {
    success: true,
    resolved: resolvedItems,
    unresolved: unresolvedItems,
    stats: {
      total: cartItems.length,
      resolved: resolvedItems.length,
      unresolved: unresolvedItems.length,
      resolutionRate: ((resolvedItems.length / cartItems.length) * 100).toFixed(1) + '%'
    }
  };
}
```

#### 2. Item Detail Parsing

The service parses ingredient strings to extract quantity, unit, and product names:

```javascript
// Located in client/src/services/productResolutionService.js:154-192
parseItemDetails(item) {
  const rawName = item.productName || item.name || item.item || '';
  const rawQuantity = item.quantity || 1;
  const rawUnit = item.unit || '';
  
  // Extract quantity and unit from name patterns like "2 lbs apples"
  const quantityPattern = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/;
  const match = rawName.match(quantityPattern);
  
  if (match && !rawUnit) {
    const [, extractedQty, extractedUnit, extractedName] = match;
    quantity = parseFloat(extractedQty) || quantity;
    unit = extractedUnit ? extractedUnit.toLowerCase() : unit;
    cleanName = extractedName;
  }

  // Normalize units using predefined mappings
  const normalizedUnit = this.unitMappings[unit] || unit || 'each';
  
  return {
    originalName: rawName,
    cleanName: cleanName.trim(),
    quantity,
    unit: normalizedUnit,
    searchQuery: this.createSearchQuery(cleanName),
    category: item.category || '',
    brand: item.brand || ''
  };
}
```

#### 3. Product Matching Algorithm

The service uses a scoring system to find the best product matches:

```javascript
// Located in client/src/services/productResolutionService.js:237-279
calculateMatchScore(itemDetails, product) {
  let score = 0;
  const productName = (product.name || '').toLowerCase();
  const itemName = itemDetails.cleanName.toLowerCase();
  const searchQuery = itemDetails.searchQuery.toLowerCase();

  // Exact name match bonus (50 points)
  if (productName.includes(itemName)) {
    score += 50;
  }

  // Search query word matches (10 points per word)
  const queryWords = searchQuery.split(/\s+/);
  queryWords.forEach(word => {
    if (productName.includes(word)) {
      score += 10;
    }
  });

  // Brand match bonus (25 points)
  if (itemDetails.brand && product.brand) {
    const itemBrand = itemDetails.brand.toLowerCase();
    const productBrand = (product.brand || '').toLowerCase();
    if (productBrand.includes(itemBrand) || itemBrand.includes(productBrand)) {
      score += 25;
    }
  }

  // Availability and price bonuses
  if (product.availability === 'in_stock') {
    score += 15;
  } else if (product.availability === 'limited_stock') {
    score += 5;
  }

  return score;
}
```

### Unit Mappings

The service includes comprehensive unit mappings for ingredient conversion:

```javascript
// Located in client/src/services/productResolutionService.js:11-42
this.unitMappings = {
  'lb': 'pound',
  'lbs': 'pound', 
  'oz': 'ounce',
  'kg': 'kilogram',
  'cup': 'cup',
  'tsp': 'teaspoon',
  'tbsp': 'tablespoon',
  'piece': 'each',
  'item': 'each',
  'bunch': 'bunch',
  'bag': 'bag',
  'bottle': 'bottle',
  'can': 'can',
  'jar': 'jar',
  'package': 'package'
};
```

## Data Flow

### 1. Recipe Input Processing

1. **Input Sources**: AI-generated meal plans, manual recipe entry, external recipe imports
2. **Parser Selection**: Route to appropriate parser based on input format
3. **Standardization**: Convert to unified CartSmash format
4. **Time Generation**: Generate realistic prep/cook times
5. **Storage**: Save to database with standardized schema

### 2. Recipe Display Pipeline

1. **Data Retrieval**: Fetch standardized recipe data
2. **Format Validation**: Ensure all required fields are present
3. **UI Rendering**: Display with proper fallbacks for missing data
4. **Time Display**: Show formatted cooking times

### 3. Grocery List Generation

1. **Ingredient Extraction**: Parse recipe ingredients
2. **Quantity Calculation**: Handle serving size adjustments
3. **Product Resolution**: Map ingredients to Instacart products
4. **List Optimization**: Group similar items and optimize quantities

## Error Handling

### Recipe Name Display Fix

Fixed issue where recipe names displayed as "[object Object]":

```javascript
// Fixed in client/src/components/MyAccount.js:525
// Before: {recipe.name}
// After: {recipe.name || recipe.title || 'Untitled Recipe'}
```

### Graceful Degradation

The system includes multiple fallback mechanisms:

1. **Missing Recipe Names**: Use title or fallback to "Untitled Recipe"
2. **Invalid Time Data**: Use sensible defaults based on recipe type
3. **Product Resolution Failures**: Track unresolved items with reasons
4. **API Errors**: Return structured error responses with context

## Performance Optimizations

### Caching Strategy

The Product Resolution Service implements intelligent caching:

```javascript
// Cache configuration
constructor() {
  this.cache = new Map();
  this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
}

// Cache key generation
getCacheKey(item, retailerId) {
  const itemKey = item.productName || item.name || item.item || '';
  return `${itemKey}_${retailerId || 'default'}_${item.quantity || 1}_${item.unit || ''}`;
}
```

### Batch Processing

The resolution service processes multiple items efficiently:

- Parallel resolution for independent items
- Batch API calls to external services
- Optimized search query generation

## Configuration

### Time Generation Parameters

Time generation can be configured via the following parameters in `aiMealPlanParser.js`:

- **Quick meal range**: 5-15 minutes
- **Standard meal range**: 15-45 minutes  
- **Complex meal range**: 30-90 minutes
- **Breakfast bias**: Tends toward shorter times
- **Dinner bias**: Tends toward longer times

### Product Resolution Settings

Key configuration options in `productResolutionService.js`:

- **Cache expiry**: 30 minutes for successful resolutions, 5 minutes for failures
- **Search query optimization**: Stop words filtering and keyword extraction
- **Match confidence thresholds**: High (75+), Medium (50+), Low (25+), Very Low (<25)

## Future Enhancements

### Planned Improvements

1. **Machine Learning Integration**: Use ML models for better product matching
2. **Recipe Complexity Analysis**: Advanced parsing for cooking technique detection
3. **Dietary Restriction Handling**: Automatic ingredient substitution suggestions
4. **Nutritional Analysis**: Integration with nutrition databases
5. **Recipe Scaling**: Smart quantity adjustments for different serving sizes

### API Extensions

1. **Bulk Recipe Processing**: Endpoints for processing multiple recipes simultaneously
2. **Recipe Recommendation Engine**: ML-based recipe suggestions
3. **Inventory Integration**: Real-time product availability checking
4. **Cost Optimization**: Price-based product selection algorithms

## Troubleshooting

### Common Issues

1. **"[object Object]" Display**: Ensure recipe objects have proper name/title fields
2. **Missing Cooking Times**: Verify time generation is called in recipe processing
3. **Product Resolution Failures**: Check API keys and network connectivity
4. **Cache Issues**: Clear expired cache entries or reset cache if needed

### Debug Tools

Enable debug logging by setting environment variables:

```bash
# Enable detailed parsing logs
DEBUG_RECIPE_PARSING=true

# Enable product resolution debugging  
DEBUG_PRODUCT_RESOLUTION=true

# Enable AI parsing detailed logs
DEBUG_AI_PARSING=true
```

### Performance Monitoring

Key metrics to monitor:

- Recipe parsing success rate
- Product resolution accuracy
- API response times
- Cache hit ratios
- Error frequencies by type

## Code References

### Key Files and Functions

- **Recipe Time Generation**: `server/services/aiMealPlanParser.js:851-892` (`generateRealisticCookingTimes()`)
- **Time Formatting**: `server/services/aiMealPlanParser.js:834-846` (`formatTimeToString()`)
- **Recipe Standardization**: `server/routes/unifiedRecipeRoutes.js` (`standardizeRecipe()`)
- **Product Resolution**: `client/src/services/productResolutionService.js:48-85` (`resolveCartSmashItems()`)
- **UI Display Fix**: `client/src/components/MyAccount.js:525` (recipe name fallback)

This documentation provides a comprehensive overview of the recipe and AI parsing system in CartSmash, covering architecture, implementation details, data flow, error handling, and future enhancements.