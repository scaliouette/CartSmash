// Quick test to debug quantity parsing issue
const testCases = [
  "• 1 2 lbs chicken breast",
  "• 1 1 lb salmon fillets", 
  "• 1 1 lb lean ground beef",
  "• 1 1 lb ground turkey"
];

testCases.forEach((originalInput, index) => {
  console.log(`\n--- Test Case ${index + 1} ---`);
  console.log('Original input:', originalInput);

  // Simulate the cleaning process from parseLine (updated version)
  const trimmed = originalInput.trim();
  const cleaned = trimmed
    .replace(/^[\-\*\u2022\u2023\u25AA\u25CF\u25E6]\s*/, '')  // Remove bullet markers
    .replace(/^\d+[\.)]\s*/, '')  // Remove ordered list prefixes
    .replace(/^\d+\s+/, '');  // Remove standalone numbers at start

  console.log('After cleaning:', cleaned);

  const testInput = cleaned;

  // This is the regex pattern from parseLine method
  const simplePattern = /^([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\d+(?:\s+\d+\/\d+)?|\d+\/\d+|\d+(?:\.\d+)?)\s+([a-zA-Z]+)\s+(.+)$/;

  const match = testInput.match(simplePattern);
  console.log('Testing input:', testInput);
  
  if (match) {
    console.log('✅ PARSED - Quantity:', match[1], '| Unit:', match[2], '| Product:', match[3]);
    
    // Test if unit is valid
    const validUnits = [
      'lb', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'ounces',
      'cup', 'cups', 'tbsp', 'tsp', 'tablespoon', 'teaspoon',
      'gallon', 'quart', 'pint', 'liter', 'ml', 'fl oz',
      'bag', 'bags', 'box', 'boxes', 'container', 'containers',
      'jar', 'jars', 'can', 'cans', 'bottle', 'bottles',
      'dozen', 'pack', 'package', 'pkg', 'pk', 'bunch', 'head', 'heads', 
      'loaf', 'piece', 'clove', 'cloves',
      'each', 'ct', 'count', 'packet', 'packets', 'sleeve', 'carton'
    ];
    
    const possibleUnit = match[2];
    const normalized = possibleUnit.toLowerCase();
    const isValid = validUnits.some(unit => unit === normalized || unit + 's' === normalized || unit === normalized + 's');
    
    console.log('Unit valid:', isValid);
  } else {
    console.log('❌ NO MATCH FOUND!');
  }
});