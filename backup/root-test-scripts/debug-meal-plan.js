// Debug the actual extractMealPlanRecipes function
const aiResponseText = `Here's a complete 7-day healthy meal plan for a family of 4:

MEAL PLAN

Day 1 (Monday):
- Breakfast: Oatmeal with berries and honey
- Lunch: Turkey and avocado sandwiches
- Dinner: Baked chicken with roasted vegetables
- Snacks: Apple slices with peanut butter, carrot sticks

Day 2 (Tuesday):
- Breakfast: Greek yogurt parfaits with granola
- Lunch: Quinoa bowls with chickpeas
- Dinner: Salmon with brown rice and broccoli
- Snacks: Mixed nuts, orange slices

GROCERY LIST

Produce:
- Bananas (2 bunches)
- Apples (8)
- Chicken breasts (4 lbs)`;

// Copy the actual extractMealPlanRecipes function from the code
const extractMealPlanRecipes = (text) => {
  const recipes = [];
  const lines = text.split('\n');
  let currentDay = '';
  let currentRecipe = null;
  let inIngredientsSection = false;
  let inInstructionsSection = false;
  
  console.log('🔍 Parsing meal plan content for recipe information...');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Detect day headers
    const dayMatch = line.match(/^Day\s+(\d+)(?:\s*\(([^)]+)\))?:?/i) ||
                     line.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday):?/i);
    if (dayMatch) {
      currentDay = dayMatch[0].replace(':', '').trim();
      console.log('📅 Found day header:', currentDay);
      continue;
    }
    
    // Detect meal entries with better pattern matching
    const mealMatch = line.match(/^[-*•]?\s*(Breakfast|Lunch|Dinner|Snack[s]?):\s*(.+)$/i);
    if (mealMatch) {
      // Save previous recipe if exists
      if (currentRecipe && currentRecipe.title) {
        recipes.push(currentRecipe);
      }
      
      const mealType = mealMatch[1];
      const recipeName = mealMatch[2].trim();
      
      // Create a new recipe
      currentRecipe = {
        title: recipeName,
        ingredients: [],
        instructions: [],
        servings: '4 people',
        prepTime: '15-30 minutes',
        cookTime: 'Varies',
        mealType: mealType,
        day: currentDay,
        tags: [currentDay.toLowerCase().includes('day') ? currentDay : 'meal plan'],
        id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      console.log('🍽️ Found meal:', `${currentDay} ${mealType}: ${recipeName}`);
      inIngredientsSection = false;
      inInstructionsSection = false;
      continue;
    }
    
    // Detect ingredients section
    if (line.toLowerCase().includes('ingredients:')) {
      inIngredientsSection = true;
      inInstructionsSection = false;
      continue;
    }
    
    // Detect instructions section
    if (line.toLowerCase().match(/instructions?:|directions?:|method:|steps:/)) {
      inInstructionsSection = true;
      inIngredientsSection = false;
      continue;
    }
    
    // Add content to current recipe
    if (currentRecipe) {
      if (inIngredientsSection && line.match(/^[-•*]\s*.+$/)) {
        const ingredient = line.replace(/^[-•*]\s*/, '').trim();
        if (ingredient) {
          currentRecipe.ingredients.push(ingredient);
        }
      } else if (inInstructionsSection && line.match(/^\d+\.\s*.+$/)) {
        const instruction = line.replace(/^\d+\.\s*/, '').trim();
        if (instruction) {
          currentRecipe.instructions.push(instruction);
        }
      }
    }
  }
  
  // Don't forget the last recipe
  if (currentRecipe && currentRecipe.title) {
    recipes.push(currentRecipe);
  }
  
  // If we found too few recipes, try fallback parsing
  if (recipes.length < 3) {
    console.log('🔍 Found few structured recipes, trying fallback parsing...');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip grocery list items and headers
      if (!line || 
          line.toLowerCase().includes('grocery') || 
          line.toLowerCase().includes('shopping') ||
          line.startsWith('-') || 
          line.startsWith('•') ||
          line.match(/^\d+\s*(oz|lb|cups?|tbsp|tsp|bunch|bag|jar|can|container|loaf)/i)) {
        continue;
      }
      
      // Look for potential meal descriptions
      if (line.length > 15 && line.length < 80 &&
          !line.match(/^\d+\./) && // Not numbered steps
          (line.toLowerCase().includes('chicken') || 
           line.toLowerCase().includes('salmon') ||
           line.toLowerCase().includes('pasta') || 
           line.toLowerCase().includes('salad') ||
           line.toLowerCase().includes('soup') ||
           line.toLowerCase().includes('stir') ||
           line.toLowerCase().includes('grilled') ||
           line.toLowerCase().includes('baked') ||
           line.toLowerCase().includes('with') ||
           line.toLowerCase().includes('recipe'))) {
        
        recipes.push({
          title: line.replace(/[*#-]+/g, '').trim(),
          ingredients: [],
          instructions: [],
          prepTime: '',
          cookTime: '',
          calories: '',
          tags: ['meal idea'],
          mealType: 'suggested meal'
        });
        
        if (recipes.length >= 5) break; // Limit to reasonable number
      }
    }
  }
  
  console.log(`✅ Meal plan extraction complete: Found ${recipes.length} recipes`);
  
  return {
    isMealPlan: true,
    recipes: recipes.slice(0, 7), // Limit to 7 recipes max for display
    totalRecipes: recipes.length
  };
};

// Test it
console.log('=== Testing extractMealPlanRecipes ===');
const result = extractMealPlanRecipes(aiResponseText);
console.log('Result:', JSON.stringify(result, null, 2));