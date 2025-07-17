// server/utils/parseGroceryItem.js
function parseGroceryItem(itemText) {
  if (!itemText || typeof itemText !== 'string') {
    return null;
  }

  // Clean the item text
  const cleanedText = itemText.trim()
    .replace(/^[-•*\d+\.\)]\s*/, '') // Remove bullets, numbers
    .replace(/^\s*[-•*]\s*/, ''); // Remove bullet points

  if (!cleanedText) {
    return null;
  }

  // Try to extract quantity and unit
  const quantityRegex = /^(\d+(?:\.\d+)?(?:\/\d+)?)\s*([a-zA-Z]*)\s+(.+)$/;
  const match = cleanedText.match(quantityRegex);
  
  if (match) {
    const [, quantity, unit, name] = match;
    return {
      original: itemText,
      itemName: name.trim(),
      quantity: quantity,
      unit: unit || null,
      category: categorizeItem(name.trim())
    };
  }
  
  // If no quantity found, return the whole thing as item name
  return {
    original: itemText,
    itemName: cleanedText,
    quantity: null,
    unit: null,
    category: categorizeItem(cleanedText)
  };
}

function categorizeItem(itemName) {
  const categories = {
    produce: ['banana', 'apple', 'spinach', 'broccoli', 'carrot', 'tomato', 'lettuce', 'onion', 'pepper', 'cucumber', 'avocado', 'strawberry', 'blueberry', 'orange', 'grape', 'potato', 'garlic', 'celery', 'mushroom'],
    dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage cheese', 'mozzarella', 'cheddar', 'parmesan'],
    meat: ['chicken', 'beef', 'pork', 'turkey', 'salmon', 'fish', 'ground beef', 'steak', 'bacon', 'ham', 'sausage', 'tuna'],
    pantry: ['rice', 'pasta', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'sauce', 'beans', 'lentils', 'quinoa', 'oats', 'cereal'],
    bakery: ['bread', 'bagel', 'muffin', 'croissant', 'bun', 'roll', 'cake', 'cookie', 'pie', 'pastry'],
    frozen: ['ice cream', 'frozen', 'popsicle', 'frozen vegetables', 'frozen fruit', 'frozen pizza', 'frozen dinner'],
    beverages: ['water', 'juice', 'soda', 'coffee', 'tea', 'beer', 'wine', 'kombucha', 'smoothie']
  };

  const lowerItemName = itemName.toLowerCase();
  
  for (const [category, items] of Object.entries(categories)) {
    if (items.some(item => lowerItemName.includes(item))) {
      return category;
    }
  }
  
  return 'other';
}

function parseGroceryList(listText) {
  if (!listText || typeof listText !== 'string') {
    return [];
  }

  // Split by lines and clean up
  const lines = listText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.match(/^(here's|shopping|grocery|ingredients).*:$/i)); // Remove AI headers

  return lines
    .map(line => parseGroceryItem(line))
    .filter(item => item !== null);
}

module.exports = {
  parseGroceryItem,
  parseGroceryList,
  categorizeItem
};