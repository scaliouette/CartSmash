// Test parseAIRecipes detailed behavior
const text = `Day 1 (Monday):
- Breakfast: Oatmeal with berries and honey
- Lunch: Turkey and avocado sandwiches
- Dinner: Baked chicken with roasted vegetables
- Snacks: Apple slices with peanut butter, carrot sticks

GROCERY LIST
- Bananas (2 bunches)
- Apples (8)
`;

console.log('Testing parseAIRecipes detailed behavior...');

const lines = text.split('\n');
console.log('All lines:');
lines.forEach((line, i) => {
  console.log(`${i}: "${line}"`);
});

console.log('\nChecking which lines get skipped:');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  let skipReason = '';
  
  // Check skip conditions
  if (!line) {
    skipReason = 'empty';
  } else if (line.toLowerCase().includes('grocery list')) {
    skipReason = 'contains grocery list';
  } else if (line.toLowerCase().includes('shopping list')) {
    skipReason = 'contains shopping list';
  } else if (line.startsWith('-')) {
    skipReason = 'starts with dash';
  } else if (line.startsWith('•')) {
    skipReason = 'starts with bullet';
  } else if (line.match(/^\d+\s*(oz|lb|cups?|tbsp|tsp|cloves?|bunch|bag|jar|can|container|loaf|bottle)/i)) {
    skipReason = 'matches grocery pattern';
  }
  
  if (skipReason) {
    console.log(`SKIP ${i}: "${line}" - ${skipReason}`);
  } else {
    console.log(`CHECK ${i}: "${line}"`);
    
    // Check if it would match recipe pattern
    if (line.length > 8 && line.length < 60 &&
        !line.match(/^\d+\./) && // Not numbered steps
        (line.toLowerCase().includes('chicken') || 
         line.toLowerCase().includes('pasta') || 
         line.toLowerCase().includes('salad') ||
         line.toLowerCase().includes('soup') ||
         line.toLowerCase().includes('sandwich') ||
         line.toLowerCase().includes('recipe') ||
         line.toLowerCase().match(/(with|and|or|in)\s+/))) {
      console.log(`  -> RECIPE MATCH: "${line}"`);
    } else {
      console.log(`  -> no recipe match`);
    }
  }
}