// Test parseAIRecipes fallback behavior
const text = `Day 1 (Monday):
- Breakfast: Oatmeal with berries and honey
- Lunch: Turkey and avocado sandwiches
- Dinner: Baked chicken with roasted vegetables
- Snacks: Apple slices with peanut butter, carrot sticks

GROCERY LIST
- Bananas (2 bunches)
- Apples (8)
`;

console.log('Testing parseAIRecipes fallback behavior...');

const lines = text.split('\n');
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

console.log('Potential recipes found by parseAIRecipes fallback:');
potentialRecipes.forEach((recipe, i) => {
  console.log(`${i+1}. "${recipe.title}"`);
});

console.log(`Total: ${potentialRecipes.length} recipes found`);
console.log('This means parseAIRecipes will return results and meal plan parser won\'t run!');