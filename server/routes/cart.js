// Add this to your cart.js file after line 502 (the existing /recipes POST endpoint)

// ✅ ENHANCED: Recipe saving with better error handling
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
  
  // Save to persistent storage if available
  try {
    if (global.localStorage) {
      global.localStorage.setItem('cart-smash-recipes', JSON.stringify(savedRecipes));
    }
  } catch (error) {
    console.warn('Failed to persist recipes:', error);
  }
  
  console.log(`✅ Recipe saved: "${recipe.title}" (Total: ${savedRecipes.length})`);
  
  res.json({
    success: true,
    recipe: recipe,
    message: 'Recipe saved successfully',
    totalRecipes: savedRecipes.length
  });
});