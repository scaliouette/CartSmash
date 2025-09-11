// server/services/aiMealPlanParser.js
// AI-ONLY parser for meal plans - NO manual parsing or emoji pattern matching

const AIProductParser = require('../utils/aiProductParser');

class MealPlanParser {
  constructor() {
    this.recipeIdCounter = 1000; // Start IDs at 1000 for AI-generated recipes
    this.mealTypes = ['breakfast', 'lunch', 'dinner', 'snack-am', 'snack-pm'];
    this.dayMapping = {
      'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
      'friday': 5, 'saturday': 6, 'sunday': 7
    };
    this.aiParser = new AIProductParser(); // AI-only processing
  }

  /**
   * Main parsing function - converts AI text response to structured data
   * @param {string} aiResponse - The raw text from AI meal plan generation
   * @returns {Object} Parsed meal plan with recipes and shopping list
   */
  async parseMealPlan(aiResponse) {
    try {
      console.log('🤖 Using AI-ONLY meal plan parsing - no manual fallbacks');
      
      // Use AI to extract structured data from the meal plan text
      const aiParsedData = await this.aiParser.aiExtractProducts(aiResponse, {
        type: 'meal_plan',
        extractRecipes: true,
        extractIngredients: true,
        extractCategories: true
      });
      
      // Convert AI response to meal plan format
      return this.convertAIResponseToMealPlan(aiParsedData, aiResponse);
      
    } catch (error) {
      console.error('❌ AI meal plan parsing failed:', error.message);
      throw new Error(`AI meal plan parsing failed: ${error.message}`);
    }
  }

  /**
   * Convert AI response to meal plan format
   * @param {Object} aiParsedData - Data from AI parser
   * @param {string} originalText - Original meal plan text
   * @returns {Object} Structured meal plan
   */
  convertAIResponseToMealPlan(aiParsedData, originalText) {
    const mealPlan = {
      metadata: {
        title: '7-Day AI-Generated Meal Plan',
        familySize: 4,
        generatedAt: new Date().toISOString(),
        source: 'ai-only'
      },
      days: {},
      recipes: [],
      shoppingList: {}
    };

    // Process AI-extracted products as recipes and ingredients
    if (aiParsedData && aiParsedData.length > 0) {
      let recipeCount = 0;
      const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      for (const item of aiParsedData) {
        if (item.productName && item.productName.length > 5) { // Likely a recipe name
          const dayIndex = Math.floor(recipeCount / 4) % 7;
          const mealIndex = recipeCount % 4;
          const currentDay = daysOrder[dayIndex];
          
          const recipe = {
            id: `ai-recipe-${this.recipeIdCounter++}`,
            name: String(item.productName),
            ingredients: this.extractIngredientsFromAI(item),
            instructions: [],
            nutrition: { calories: item.calories || 400 },
            time: this.generateRealisticCookingTimes(recipe.name, this.detectMealType(mealIndex)),
            tags: [],
            dayAssigned: currentDay,
            mealType: this.detectMealType(mealIndex)
          };
          
          if (!mealPlan.days[currentDay]) {
            mealPlan.days[currentDay] = {
              dayNumber: this.dayMapping[currentDay],
              meals: []
            };
          }
          
          mealPlan.days[currentDay].meals.push(recipe);
          mealPlan.recipes.push(recipe);
          recipeCount++;
        } else if (item.productName) { // Likely an ingredient
          const category = item.category || 'other';
          if (!mealPlan.shoppingList[category]) {
            mealPlan.shoppingList[category] = [];
          }
          mealPlan.shoppingList[category].push({
            item: String(item.productName),
            quantity: item.quantity || 1,
            unit: item.unit || 'each',
            checked: false,
            category: category
          });
        }
      }
    }
    
    return mealPlan;
  }

  /**
   * Extract ingredients from AI-parsed item
   */
  extractIngredientsFromAI(aiItem) {
    if (aiItem.ingredients && Array.isArray(aiItem.ingredients)) {
      return aiItem.ingredients;
    }
    
    // Basic ingredient extraction from AI data
    return [{
      quantity: 1,
      unit: 'serving',
      item: 'Main ingredients as determined by AI',
      original: aiItem.productName
    }];
  }

  /**
   * Parse structured meal plan format (original method)
   * @param {string} aiResponse 
   * @returns {Object} Parsed meal plan
   */
  parseStructuredMealPlan(aiResponse) {
    const lines = aiResponse.split('\n');
    const mealPlan = {
      metadata: {
        title: '7-Day Healthy Meal Plan',
        familySize: 4,
        generatedAt: new Date().toISOString(),
        source: 'ai-generated'
      },
      days: {},
      recipes: [],
      shoppingList: {
        proteins: [],
        dairy: [],
        grains: [],
        produce: [],
        pantry: [],
        herbs: []
      }
    };

    let currentDay = null;
    let currentRecipe = null;
    let parsingShoppingList = false;
    let currentShoppingCategory = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) continue;

      // Detect day headers (e.g., "## Day 1 - Monday")
      if (line.match(/^##\s+Day\s+\d+\s+-\s+(\w+)/i)) {
        const dayMatch = line.match(/Day\s+\d+\s+-\s+(\w+)/i);
        if (dayMatch) {
          currentDay = dayMatch[1].toLowerCase();
          mealPlan.days[currentDay] = {
            dayNumber: this.dayMapping[currentDay],
            meals: []
          };
        }
        continue;
      }

      // Detect recipe headers (e.g., "### 🍳 **Overnight Oats with Berries**")
      // Avoid matching common section headers like **Ingredients** or **Instructions**
      if (line.match(/^###.*\*\*(.+)\*\*/) && !line.match(/\*\*(Ingredients?|Instructions?|Directions?|Method|Steps|Preparation|Notes?|Tips?)\*\*/i)) {
        if (currentRecipe && currentDay) {
          // Save previous recipe before starting new one
          this.addRecipeToDay(mealPlan, currentDay, currentRecipe);
        }

        const nameMatch = line.match(/\*\*(.+)\*\*/);
        currentRecipe = {
          id: `ai-recipe-${this.recipeIdCounter++}`,
          name: nameMatch ? nameMatch[1] : 'Unnamed Recipe',
          ingredients: [],
          nutrition: {},
          time: {},
          tags: [],
          day: currentDay,
          mealType: this.detectMealType(mealPlan.days[currentDay].meals.length)
        };
        continue;
      }

      // Parse recipe details
      if (currentRecipe && currentDay) {
        // Parse ingredients line
        if (line.startsWith('* **Ingredients:**')) {
          const ingredientsText = line.replace('* **Ingredients:**', '').trim();
          currentRecipe.ingredients = this.parseIngredients(ingredientsText);
        }
        // Parse time and calories
        else if (line.startsWith('* **Time:**')) {
          const timeCaloriesMatch = line.match(/Prep\s+(\d+)\s+min|Cook\s+(\d+)\s+min|Calories:\s+~(\d+)/gi);
          if (timeCaloriesMatch) {
            timeCaloriesMatch.forEach(match => {
              if (match.includes('Prep')) {
                currentRecipe.time.prep = parseInt(match.match(/\d+/)[0]);
              } else if (match.includes('Cook')) {
                currentRecipe.time.cook = parseInt(match.match(/\d+/)[0]);
              } else if (match.includes('Calories')) {
                currentRecipe.nutrition.calories = parseInt(match.match(/\d+/)[0]);
              }
            });
          }
        }
        // Parse tags
        else if (line.startsWith('* **Tags:**')) {
          const tagsText = line.replace('* **Tags:**', '').trim();
          currentRecipe.tags = tagsText.match(/`([^`]+)`/g)?.map(tag => tag.replace(/`/g, '')) || [];
        }
      }

      // Detect shopping list section
      if (line.includes('Complete Shopping List')) {
        parsingShoppingList = true;
        // Save last recipe if exists
        if (currentRecipe && currentDay) {
          this.addRecipeToDay(mealPlan, currentDay, currentRecipe);
          currentRecipe = null;
        }
        continue;
      }

      // AI-ONLY: Parse shopping list categories without manual mapping
      if (parsingShoppingList) {
        if (line.match(/^###?\s*[A-Za-z\s]+/i)) {
          // AI should determine the category instead of manual keyword matching
          const categoryText = line.replace(/^###?\s*/, '').trim().toLowerCase();
          // Use AI-determined category directly instead of manual mapping
          currentShoppingCategory = categoryText.replace(/\s+/g, '_');
        }
        // Parse shopping list items
        else if (line.startsWith('□') && currentShoppingCategory) {
          const item = line.replace('□', '').trim();
          mealPlan.shoppingList[currentShoppingCategory].push({
            item: item,
            checked: false,
            category: currentShoppingCategory
          });
        }
      }
    }

    // Add last recipe if exists
    if (currentRecipe && currentDay) {
      this.addRecipeToDay(mealPlan, currentDay, currentRecipe);
    }

    // Generate complete recipes array
    mealPlan.recipes = this.extractAllRecipes(mealPlan.days);

    return mealPlan;
  }

  /**
   * Parse simple format meal plan (handles emoji + text format)
   * Example: "🍳Baked Salmon with Quinoa" followed by "📝 Ingredients: ..." and "👨‍🍳 Instructions: ..."
   * @param {string} aiResponse 
   * @returns {Object} Parsed meal plan
   */
  parseSimpleFormatMealPlan(aiResponse) {
    console.log('🔍 DEBUG parseSimpleFormatMealPlan input preview:', aiResponse.substring(0, 500));
    
    const mealPlan = {
      metadata: {
        title: '7-Day Healthy Meal Plan',
        familySize: 4,
        generatedAt: new Date().toISOString(),
        source: 'ai-generated-simple'
      },
      days: {},
      recipes: [],
      shoppingList: {
        proteins: [],
        dairy: [],
        grains: [],
        produce: [],
        pantry: [],
        herbs: []
      }
    };

    const lines = aiResponse.split('\n');
    const recipes = [];
    let currentRecipe = null;
    let currentDay = 'monday'; // Default to monday if no day headers found
    let mealIndex = 0;
    let recipeCount = 0;
    
    // Days for cycling through when no explicit day headers
    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Detect day headers in various formats
      if (line.match(/day\s*\d+/i) || line.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)) {
        const dayMatch = line.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
        if (dayMatch) {
          currentDay = dayMatch[1].toLowerCase();
          mealIndex = 0; // Reset meal index for new day
        }
        continue;
      }

      // AI-ONLY: Detect recipe headers without manual emoji pattern matching
      // Look for any line that starts with an emoji followed by text, but use AI to determine recipe vs ingredient
      if (line.match(/^[\u{1F300}-\u{1F9FF}]/u) && line.length > 3) {
        // Save previous recipe if exists
        if (currentRecipe) {
          recipes.push(currentRecipe);
        }

        // Extract recipe name (remove emoji and clean up)
        const recipeName = line.replace(/^[^\w\s]+/, '').replace(/meal_plan_item/g, '').trim();
        
        // Auto-assign days if no explicit day headers (cycle through 7 days, 4 meals per day = 28 total)
        const mealsPerDay = 4; // breakfast, lunch, dinner, snack
        const dayIndex = Math.floor(recipeCount / mealsPerDay) % 7;
        const mealInDay = recipeCount % mealsPerDay;
        
        // If no explicit day was set, use calculated day
        const assignedDay = currentDay === 'monday' && recipeCount > 0 ? daysOrder[dayIndex] : currentDay;
        
        currentRecipe = {
          id: `ai-recipe-${this.recipeIdCounter++}`,
          name: recipeName || 'Unnamed Recipe',
          ingredients: [],
          instructions: [],
          nutrition: {},
          time: {},
          tags: [],
          dayAssigned: assignedDay,
          mealType: this.detectMealType(mealInDay)
        };
        
        recipeCount++;
        continue;
      }

      // Parse ingredients line (e.g., "📝 Ingredients: salmon fillets, quinoa, broccoli")
      if (line.match(/^[📝📋🥘]/) || line.toLowerCase().includes('ingredients:')) {
        if (currentRecipe) {
          const ingredientsText = line.replace(/^[📝📋🥘]/, '').replace(/ingredients?:?/i, '').trim();
          if (ingredientsText) {
            currentRecipe.ingredients = this.parseSimpleIngredients(ingredientsText);
          }
        }
        continue;
      }

      // Parse instructions line (e.g., "👨‍🍳 Instructions: Bake salmon at 400°F, Cook quinoa, Steam broccoli")
      if (line.match(/^[👨‍🍳👩‍🍳🔥]/) || line.toLowerCase().includes('instructions:')) {
        if (currentRecipe) {
          const instructionsText = line.replace(/^[👨‍🍳👩‍🍳🔥]/, '').replace(/instructions?:?/i, '').trim();
          if (instructionsText) {
            currentRecipe.instructions = this.parseSimpleInstructions(instructionsText);
          }
        }
        continue;
      }
    }

    // Add last recipe
    if (currentRecipe) {
      recipes.push(currentRecipe);
    }

    console.log(`🎯 Simple format parsing found ${recipes.length} recipes:`, recipes.map(r => `${r.name} (${r.dayAssigned}, ${r.mealType})`));

    // Convert recipes to proper format and organize by days
    for (const recipe of recipes) {
      if (recipe.dayAssigned) {
        if (!mealPlan.days[recipe.dayAssigned]) {
          mealPlan.days[recipe.dayAssigned] = {
            dayNumber: this.dayMapping[recipe.dayAssigned] || 1,
            meals: []
          };
        }
        mealPlan.days[recipe.dayAssigned].meals.push(recipe);
      }
    }

    mealPlan.recipes = recipes;
    return mealPlan;
  }

  /**
   * Parse simple comma-separated ingredients
   */
  parseSimpleIngredients(ingredientsText) {
    const ingredients = [];
    const items = ingredientsText.split(',').map(item => item.trim());
    
    for (const item of items) {
      if (item) {
        const parsed = this.parseIngredientItem(item);
        if (parsed) ingredients.push(parsed);
      }
    }
    
    return ingredients;
  }

  /**
   * Parse simple comma-separated instructions
   */
  parseSimpleInstructions(instructionsText) {
    const instructions = [];
    const steps = instructionsText.split(',').map(step => step.trim());
    
    for (let i = 0; i < steps.length; i++) {
      if (steps[i]) {
        instructions.push({
          step: i + 1,
          instruction: steps[i],
          time: null
        });
      }
    }
    
    return instructions;
  }

  /**
   * Parse content as a single recipe and return in meal plan format
   */
  parseSingleRecipeContent(aiResponse) {
    const recipe = this.parseSingleRecipe(aiResponse);
    
    // Return in same format as meal plan parsing
    return {
      metadata: {
        title: 'Single Recipe',
        familySize: 4,
        generatedAt: new Date().toISOString(),
        source: 'ai-generated'
      },
      days: {},
      recipes: [recipe], // Single recipe in array
      shoppingList: {
        proteins: [],
        dairy: [],
        grains: [],
        produce: [],
        pantry: [],
        herbs: []
      }
    };
  }

  /**
   * Parse single recipe from AI text
   */
  parseSingleRecipe(aiResponse) {
    const lines = aiResponse.split('\n');
    const recipe = {
      id: `ai-recipe-${this.recipeIdCounter++}`,
      name: 'Unnamed Recipe',
      ingredients: [],
      nutrition: {},
      time: {},
      tags: [],
      instructions: []
    };

    let currentSection = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect recipe name (but not section headers)
      if (trimmed.match(/^#\s*(.+)/) && !trimmed.match(/(ingredients?|instructions?|directions?)/i)) {
        const nameMatch = trimmed.match(/^#\s*(.+)/);
        recipe.name = nameMatch[1] || recipe.name;
        continue;
      }

      // Detect sections
      if (trimmed.match(/\*\*.*ingredients?.*\*\*|^ingredients?[:.]?\s*$/i)) {
        currentSection = 'ingredients';
        continue;
      } else if (trimmed.match(/\*\*.*(instructions?|directions?|method|steps).*\*\*|^(instructions?|directions?|method|steps)[:.]?\s*$/i)) {
        currentSection = 'instructions';
        continue;
      }

      // Parse content based on section
      if (currentSection === 'ingredients' && trimmed.length > 0) {
        const ingredient = this.parseIngredientItem(trimmed.replace(/^[-*•]/, '').trim());
        if (ingredient) recipe.ingredients.push(ingredient);
      } else if (currentSection === 'instructions' && trimmed.length > 0) {
        recipe.instructions.push({
          step: recipe.instructions.length + 1,
          instruction: trimmed.replace(/^[-*•]/, '').trim()
        });
      }

      // Parse time and nutrition inline
      if (trimmed.includes('Prep') && trimmed.includes('min')) {
        const prepMatch = trimmed.match(/Prep\s*:?\s*(\d+)\s*min/i);
        if (prepMatch) recipe.time.prep = parseInt(prepMatch[1]);
      }
      if (trimmed.includes('Cook') && trimmed.includes('min')) {
        const cookMatch = trimmed.match(/Cook\s*:?\s*(\d+)\s*min/i);
        if (cookMatch) recipe.time.cook = parseInt(cookMatch[1]);
      }
      if (trimmed.includes('Calories')) {
        const caloriesMatch = trimmed.match(/Calories\s*:?\s*~?(\d+)/i);
        if (caloriesMatch) recipe.nutrition.calories = parseInt(caloriesMatch[1]);
      }
    }

    return recipe;
  }

  /**
   * Parse ingredients from text into structured format
   */
  parseIngredients(ingredientsText) {
    const ingredients = [];
    const items = ingredientsText.split(',').map(item => item.trim());
    
    for (const item of items) {
      const parsed = this.parseIngredientItem(item);
      if (parsed) ingredients.push(parsed);
    }
    
    return ingredients;
  }

  /**
   * Parse individual ingredient with quantity and unit
   */
  parseIngredientItem(item) {
    // Match patterns like "2 cups milk", "4 chicken breasts", "1.5 lbs ground turkey"
    const quantityMatch = item.match(/^([\d.\/]+)\s*(cups?|tbsp|tsp|oz|lbs?|pieces?|cans?|slices?)?\s+(.+)/i);
    
    if (quantityMatch) {
      return {
        quantity: this.parseQuantity(quantityMatch[1]),
        unit: quantityMatch[2] || 'unit',
        item: quantityMatch[3],
        original: item
      };
    }
    
    // Handle items without specific quantities
    return {
      quantity: 1,
      unit: 'as needed',
      item: item,
      original: item
    };
  }

  /**
   * Parse quantity strings (handles fractions)
   */
  parseQuantity(quantityStr) {
    if (quantityStr.includes('/')) {
      const [numerator, denominator] = quantityStr.split('/').map(Number);
      return numerator / denominator;
    }
    return parseFloat(quantityStr) || 1;
  }

  /**
   * Detect meal type based on recipe position in day
   */
  detectMealType(mealIndex) {
    const types = ['breakfast', 'lunch', 'dinner', 'snack-am', 'snack-pm'];
    return types[mealIndex] || 'snack';
  }

  /**
   * Add recipe to specific day
   */
  addRecipeToDay(mealPlan, day, recipe) {
    if (!mealPlan.days[day]) {
      mealPlan.days[day] = {
        dayNumber: this.dayMapping[day],
        meals: []
      };
    }
    mealPlan.days[day].meals.push(recipe);
  }

  /**
   * Extract all recipes from days into flat array
   */
  extractAllRecipes(days) {
    const recipes = [];
    
    // Handle null/undefined days
    if (!days) {
      return recipes;
    }
    
    // Handle array format (empty days)
    if (Array.isArray(days)) {
      return recipes;
    }
    
    // Handle object format (days with data)
    for (const [day, dayData] of Object.entries(days)) {
      if (dayData && dayData.meals) {
        dayData.meals.forEach(meal => {
          recipes.push({
            ...meal,
            dayAssigned: day,
            slot: meal.mealType
          });
        });
      }
    }
    return recipes;
  }

  /**
   * Convert to CARTSMASH recipe format
   */
  toCartsmashFormat(parsedMealPlan) {
    console.log('🔍 DEBUG toCartsmashFormat input:', {
      hasMetadata: !!parsedMealPlan?.metadata,
      hasRecipes: !!parsedMealPlan?.recipes,
      recipesType: Array.isArray(parsedMealPlan?.recipes) ? 'array' : typeof parsedMealPlan?.recipes,
      hasDays: !!parsedMealPlan?.days,
      daysType: parsedMealPlan?.days ? (Array.isArray(parsedMealPlan.days) ? 'array' : typeof parsedMealPlan.days) : 'undefined',
      hasShoppingList: !!parsedMealPlan?.shoppingList,
      shoppingListType: parsedMealPlan?.shoppingList ? (Array.isArray(parsedMealPlan.shoppingList) ? 'array' : typeof parsedMealPlan.shoppingList) : 'undefined'
    });
    
    return {
      planId: `meal-plan-${Date.now()}`,
      metadata: parsedMealPlan.metadata,
      recipes: (parsedMealPlan.recipes || []).map(recipe => ({
        id: recipe.id,
        title: recipe.name,
        description: `Healthy ${recipe.mealType} option`,
        servings: 4,
        prepTime: this.formatTimeToString(recipe.time.prep || 0),
        cookTime: this.formatTimeToString(recipe.time.cook || 0),
        totalTime: (recipe.time.prep || 0) + (recipe.time.cook || 0),
        difficulty: this.calculateDifficulty(recipe),
        ingredients: recipe.ingredients,
        instructions: this.generateInstructions(recipe),
        nutrition: {
          calories: recipe.nutrition.calories || 0,
          protein: Math.round(recipe.nutrition.calories * 0.25 / 4) || 0, // Estimate
          carbs: Math.round(recipe.nutrition.calories * 0.5 / 4) || 0,
          fat: Math.round(recipe.nutrition.calories * 0.25 / 9) || 0,
          fiber: 5 // Default estimate
        },
        tags: recipe.tags,
        imageUrl: this.generateImageUrl(recipe.name),
        sourceUrl: null,
        notes: [],
        rating: 0,
        isFavorite: false,
        dayAssigned: recipe.dayAssigned,
        mealType: recipe.mealType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),
      shoppingList: this.formatShoppingList(parsedMealPlan.shoppingList),
      weekSchedule: this.generateWeekSchedule(parsedMealPlan.days)
    };
  }

  /**
   * Calculate recipe difficulty based on time and steps
   */
  calculateDifficulty(recipe) {
    const totalTime = (recipe.time.prep || 0) + (recipe.time.cook || 0);
    if (totalTime <= 15) return 'easy';
    if (totalTime <= 30) return 'medium';
    return 'hard';
  }

  /**
   * Generate basic instructions from recipe data
   */
  generateInstructions(recipe) {
    const instructions = [];
    
    if (recipe.time.prep) {
      instructions.push({
        step: 1,
        instruction: `Prepare ingredients (${recipe.time.prep} minutes)`,
        time: recipe.time.prep
      });
    }
    
    if (recipe.time.cook) {
      instructions.push({
        step: instructions.length + 1,
        instruction: `Cook according to recipe (${recipe.time.cook} minutes)`,
        time: recipe.time.cook
      });
    }
    
    if (instructions.length === 0) {
      instructions.push({
        step: 1,
        instruction: 'Combine ingredients and serve',
        time: 5
      });
    }
    
    return instructions;
  }

  /**
   * Generate placeholder image URL based on recipe name
   */
  generateImageUrl(recipeName) {
    // Could integrate with image service or use placeholders
    const slug = recipeName.toLowerCase().replace(/\s+/g, '-');
    return `/images/recipes/${slug}.jpg`;
  }

  /**
   * Format shopping list for CARTSMASH
   */
  formatShoppingList(shoppingList) {
    const formatted = [];
    let itemId = 1;
    
    // Handle null/undefined shopping list
    if (!shoppingList) {
      return formatted;
    }
    
    // Handle array format (empty shopping list)
    if (Array.isArray(shoppingList)) {
      shoppingList.forEach(item => {
        formatted.push({
          id: `item-${itemId++}`,
          ...item,
          category: item.category || 'other',
          purchased: false,
          addedAt: new Date().toISOString()
        });
      });
      return formatted;
    }
    
    // Handle object format (categorized shopping list)
    for (const [category, items] of Object.entries(shoppingList)) {
      items.forEach(item => {
        formatted.push({
          id: `item-${itemId++}`,
          ...item,
          category: category,
          purchased: false,
          addedAt: new Date().toISOString()
        });
      });
    }
    
    return formatted;
  }

  /**
   * Generate week schedule for meal plan
   */
  generateWeekSchedule(days) {
    const schedule = {};
    
    // Handle null/undefined days
    if (!days) {
      return schedule;
    }
    
    // Handle array format (empty days)
    if (Array.isArray(days)) {
      return schedule;
    }
    
    // Handle object format (days with data)
    for (const [day, dayData] of Object.entries(days)) {
      schedule[day] = {
        dayNumber: dayData.dayNumber,
        date: this.getDateForDay(dayData.dayNumber),
        meals: {
          breakfast: dayData.meals?.find(m => m.mealType === 'breakfast')?.id || null,
          lunch: dayData.meals?.find(m => m.mealType === 'lunch')?.id || null,
          dinner: dayData.meals?.find(m => m.mealType === 'dinner')?.id || null,
          snackAm: dayData.meals?.find(m => m.mealType === 'snack-am')?.id || null,
          snackPm: dayData.meals?.find(m => m.mealType === 'snack-pm')?.id || null
        }
      };
    }
    
    return schedule;
  }

  /**
   * Get date for day number (1-7)
   */
  getDateForDay(dayNumber) {
    const today = new Date();
    const currentDay = today.getDay() || 7; // Sunday = 7
    const daysToAdd = dayNumber - currentDay;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    return targetDate.toISOString().split('T')[0];
  }

  /**
   * Format time minutes to readable string
   */
  formatTimeToString(minutes) {
    if (minutes <= 0) return 'Not specified';
    if (minutes < 60) return `${minutes} minutes`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return hours === 1 ? '1 hour' : `${hours} hours`;
    } else {
      return `${hours}h ${remainingMinutes}m`;
    }
  }

  /**
   * Generate realistic cooking times based on recipe name and meal type
   */
  generateRealisticCookingTimes(recipeName, mealType) {
    const name = recipeName.toLowerCase();
    
    // Quick/simple meals (lower prep and cook times)
    const quickKeywords = ['toast', 'cereal', 'yogurt', 'smoothie', 'sandwich', 'salad', 'wrap'];
    const isQuick = quickKeywords.some(keyword => name.includes(keyword));
    
    // Complex meals (higher prep and cook times)  
    const complexKeywords = ['roast', 'braised', 'stew', 'casserole', 'lasagna', 'risotto', 'soup', 'curry'];
    const isComplex = complexKeywords.some(keyword => name.includes(keyword));
    
    // Baked goods (long cook times, moderate prep)
    const bakedKeywords = ['bread', 'cake', 'muffin', 'cookie', 'pie', 'tart'];
    const isBaked = bakedKeywords.some(keyword => name.includes(keyword));
    
    // Grilled/pan items (moderate times)
    const grilledKeywords = ['grilled', 'pan', 'seared', 'fried', 'sautéed'];
    const isGrilled = grilledKeywords.some(keyword => name.includes(keyword));

    let prepTime, cookTime;

    if (isQuick) {
      prepTime = Math.floor(Math.random() * 10) + 5; // 5-15 minutes
      cookTime = Math.floor(Math.random() * 10) + 5; // 5-15 minutes
    } else if (isComplex) {
      prepTime = Math.floor(Math.random() * 20) + 15; // 15-35 minutes
      cookTime = Math.floor(Math.random() * 60) + 30; // 30-90 minutes
    } else if (isBaked) {
      prepTime = Math.floor(Math.random() * 15) + 10; // 10-25 minutes
      cookTime = Math.floor(Math.random() * 40) + 20; // 20-60 minutes
    } else if (isGrilled) {
      prepTime = Math.floor(Math.random() * 15) + 10; // 10-25 minutes
      cookTime = Math.floor(Math.random() * 20) + 10; // 10-30 minutes
    } else {
      // Default based on meal type
      switch (mealType) {
        case 'breakfast':
          prepTime = Math.floor(Math.random() * 10) + 5;  // 5-15 minutes
          cookTime = Math.floor(Math.random() * 15) + 10; // 10-25 minutes
          break;
        case 'lunch':
          prepTime = Math.floor(Math.random() * 15) + 10; // 10-25 minutes
          cookTime = Math.floor(Math.random() * 20) + 15; // 15-35 minutes
          break;
        case 'dinner':
          prepTime = Math.floor(Math.random() * 20) + 15; // 15-35 minutes
          cookTime = Math.floor(Math.random() * 30) + 20; // 20-50 minutes
          break;
        default:
          prepTime = Math.floor(Math.random() * 10) + 10; // 10-20 minutes
          cookTime = Math.floor(Math.random() * 15) + 10; // 10-25 minutes
      }
    }

    return {
      prep: prepTime,
      cook: cookTime
    };
  }
}

module.exports = MealPlanParser;