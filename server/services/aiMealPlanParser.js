// server/services/aiMealPlanParser.js
// Server-side parser for AI-generated meal plans to integrate with CARTSMASH

class MealPlanParser {
  constructor() {
    this.recipeIdCounter = 1000; // Start IDs at 1000 for AI-generated recipes
    this.mealTypes = ['breakfast', 'lunch', 'dinner', 'snack-am', 'snack-pm'];
    this.dayMapping = {
      'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
      'friday': 5, 'saturday': 6, 'sunday': 7
    };
  }

  /**
   * Main parsing function - converts AI text response to structured data
   * @param {string} aiResponse - The raw text from AI meal plan generation
   * @returns {Object} Parsed meal plan with recipes and shopping list
   */
  parseMealPlan(aiResponse) {
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
      if (line.match(/^###\s+[🍳🥙🍗🍎🥕🥤🥗🍲🧀🥒🥞🥪🥢🍌🍠🌯🍜🐟🥜🍊🍞🍕🍿🍓🥩🥛]?\s*\*\*(.+)\*\*/)) {
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

      // Parse shopping list categories
      if (parsingShoppingList) {
        if (line.match(/^###?\s*(Proteins|Dairy|Grains|Fresh Produce|Pantry|Herbs)/i)) {
          const category = line.toLowerCase();
          if (category.includes('protein')) currentShoppingCategory = 'proteins';
          else if (category.includes('dairy')) currentShoppingCategory = 'dairy';
          else if (category.includes('grain')) currentShoppingCategory = 'grains';
          else if (category.includes('produce')) currentShoppingCategory = 'produce';
          else if (category.includes('pantry')) currentShoppingCategory = 'pantry';
          else if (category.includes('herb')) currentShoppingCategory = 'herbs';
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
      
      // Detect recipe name
      if (trimmed.match(/^#\s*(.+)|^\*\*(.+)\*\*/)) {
        const nameMatch = trimmed.match(/^#\s*(.+)|^\*\*(.+)\*\*/);
        recipe.name = nameMatch[1] || nameMatch[2] || recipe.name;
        continue;
      }

      // Detect sections
      if (trimmed.toLowerCase().includes('ingredients')) {
        currentSection = 'ingredients';
        continue;
      } else if (trimmed.toLowerCase().includes('instructions') || trimmed.toLowerCase().includes('directions')) {
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
        prepTime: recipe.time.prep || 0,
        cookTime: recipe.time.cook || 0,
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
}

module.exports = MealPlanParser;