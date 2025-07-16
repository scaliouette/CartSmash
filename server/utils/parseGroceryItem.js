// Cart Smash - Advanced grocery item parser
function parseGroceryItem(line) {
  let cleaned = line.trim()
    .replace(/^[-*•·◦▪▫◆◇→➤➢>]\s*/, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/^[a-z]\)\s*/i, '')
    .trim();

  const quantityPatterns = [
    /(\d+(?:\.\d+)?)\s*(lb|lbs|pound|pounds|oz|ounce|ounces|kg|kilogram|kilograms|g|gram|grams)/i,
    /(\d+(?:\.\d+)?)\s*(l|liter|liters|ml|milliliter|milliliters|gal|gallon|gallons)/i,
    /(\d+(?:\.\d+)?)\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons)/i,
    /(\d+)\s*(pack|packs|package|packages|bag|bags|box|boxes|can|cans|jar|jars|bottle|bottles)/i,
    /(\d+)\s*(dozen|doz)/i,
    /(\d+)\s+(.+)/,
    /(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(.+)/i,
    /(\d+\/\d+)\s+(.+)/,
    /(\d+\s+\d+\/\d+)\s+(.+)/,
  ];

  let quantity = null;
  let unit = null;
  let itemName = cleaned;

  for (const pattern of quantityPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      quantity = match[1];
      if (match[2]) {
        const unitMatch = match[2].match(/^(lb|lbs|pound|pounds|oz|ounce|ounces|kg|kilogram|kilograms|g|gram|grams|l|liter|liters|ml|milliliter|milliliters|gal|gallon|gallons|cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|pack|packs|package|packages|bag|bags|box|boxes|can|cans|jar|jars|bottle|bottles|dozen|doz)s?\s*(.*)$/i);
        
        if (unitMatch) {
          unit = unitMatch[1];
          itemName = unitMatch[2] || match[2];
        } else {
          itemName = match[2];
        }
      }
      break;
    }
  }

  // Determine category
  let category = 'other';
  const itemLower = itemName.toLowerCase();
  
  if (itemLower.match(/milk|cheese|yogurt|butter|cream|eggs/)) category = 'dairy';
  else if (itemLower.match(/bread|bagel|muffin|cake|cookie/)) category = 'bakery';
  else if (itemLower.match(/apple|banana|orange|strawberry|grape|fruit/)) category = 'produce';
  else if (itemLower.match(/carrot|lettuce|tomato|potato|onion|vegetable|salad/)) category = 'produce';
  else if (itemLower.match(/chicken|beef|pork|turkey|fish|salmon|meat/)) category = 'meat';
  else if (itemLower.match(/cereal|pasta|rice|beans|soup|sauce/)) category = 'pantry';
  else if (itemLower.match(/frozen|ice cream/)) category = 'frozen';

  return {
    original: line.trim(),
    itemName: itemName.trim(),
    quantity: quantity,
    unit: unit,
    category: category
  };
}

module.exports = parseGroceryItem;