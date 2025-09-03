// client/src/utils/foodCategories.ts

export const SYNONYMS: Record<string, string> = {
  'scallion': 'green onion',
  'scallions': 'green onion',
  'confectioners sugar': 'powdered sugar',
  'icing sugar': 'powdered sugar',
  'garbanzo beans': 'chickpea',
  'chickpeas': 'chickpea',
  'coriander leaves': 'cilantro',
  'bell peppers': 'bell pepper',
};

export function canonicalItemName(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (SYNONYMS[s]) return SYNONYMS[s];
  return singularizeBasic(s);
}

export function categorize(item: string): string {
  const s = item.toLowerCase();
  if (/^(apple|banana|tomato|tomatillo|onion|garlic|lemon|lime|pepper|peppercorn|carrot|celery|cilantro|cucumber|lettuce|spinach|kale|broccoli|cauliflower|ginger|scallion|green onion|herb|chili|avocado|mushroom)\b/.test(s)) return 'produce';
  if (/^(beef|pork|chicken|turkey|lamb|bacon|sausage)\b/.test(s)) return 'meat';
  if (/^(salmon|tuna|shrimp|prawn|cod|anchovy|sardine|tilapia)\b/.test(s)) return 'seafood';
  if (/^(milk|butter|cheese|cream|yogurt|half and half)\b/.test(s)) return 'dairy';
  if (/^(flour|sugar|salt|pepper|oil|vinegar|soy sauce|tamari|honey|yeast|baking|spice|cumin|paprika|oregano|thyme|cinnamon|nutmeg|vanilla)\b/.test(s)) return 'pantry';
  if (/^(bread|bun|baguette|tortilla|pita)\b/.test(s)) return 'bakery';
  if (/^(frozen|ice cream|frozen peas|frozen corn)\b/.test(s)) return 'frozen';
  if (/^(beer|wine|soda|juice|water)\b/.test(s)) return 'beverage';
  return 'pantry';
}

export function singularizeBasic(word: string): string {
  // very lightweight singularization
  return word
    .replace(/\b(tomatoes)\b/g, 'tomato')
    .replace(/\b(potatoes)\b/g, 'potato')
    .replace(/\b(leaves)\b/g, 'leaf')
    .replace(/\b(ies)\b/g, 'y')
    .replace(/s\b/g, '')
    .trim();
}