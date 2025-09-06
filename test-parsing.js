// Test meal plan parsing
const text = `Here's a complete 7-day healthy meal plan for a family of 4:

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
- Chicken breasts (4 lbs)
`;

console.log('=== Testing Meal Plan Parsing ===');
console.log('Text sample:', text.substring(0, 200) + '...');
console.log('');

// Test day header pattern
const dayPattern = /^Day\s+(\d+)(?:\s*\(([^)]+)\))?:?/gmi;
let dayMatches = [];
let match;
while ((match = dayPattern.exec(text)) !== null) {
    dayMatches.push(match[0]);
}
console.log('Day headers found:', dayMatches);

// Test meal pattern  
const mealPattern = /^[-*•]?\s*(Breakfast|Lunch|Dinner|Snack[s]?):\s*(.+)$/gmi;
let mealMatches = [];
mealPattern.lastIndex = 0; // Reset regex
while ((match = mealPattern.exec(text)) !== null) {
    mealMatches.push({ type: match[1], name: match[2] });
}
console.log('Meal entries found:', mealMatches.length);
console.log('Sample meals:', mealMatches.slice(0, 3));

// Test grocery list detection
console.log('Has grocery list section:', text.toLowerCase().includes('grocery list'));

// Test grocery item pattern
const groceryPattern = /^[-•*]\s*(.+)$/gm;
let groceryMatches = [];
const grocerySection = text.split('GROCERY LIST')[1];
if (grocerySection) {
    groceryPattern.lastIndex = 0;
    while ((match = groceryPattern.exec(grocerySection)) !== null) {
        groceryMatches.push(match[1]);
    }
}
console.log('Grocery items found:', groceryMatches.length);
console.log('Sample grocery items:', groceryMatches.slice(0, 5));