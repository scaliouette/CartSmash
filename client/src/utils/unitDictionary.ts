// client/src/utils/unitDictionary.ts

export type CanonicalUnit =
  | 'tsp' | 'tbsp' | 'cup' | 'ml' | 'l' | 'g' | 'kg' | 'oz' | 'floz' | 'lb'
  | 'can' | 'jar' | 'package' | 'bottle' | 'stick' | 'clove' | 'bunch' | 'slice' | 'head'
  | 'count';

export const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12
};

// Canonical unit aliases
export const UNIT_ALIASES: Record<string, CanonicalUnit> = {
  tsp: 'tsp', tsps: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tbs: 'tbsp', tbsps: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  c: 'cup', cup: 'cup', cups: 'cup',
  ml: 'ml', mls: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'l', liter: 'l', liters: 'l',
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  oz: 'oz', ounce: 'oz', ounces: 'oz', 'fl oz': 'floz', floz: 'floz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  can: 'can', cans: 'can', jar: 'jar', jars: 'jar', package: 'package', packages: 'package', bottle: 'bottle', bottles: 'bottle',
  stick: 'stick', sticks: 'stick', clove: 'clove', cloves: 'clove', bunch: 'bunch', bunches: 'bunch', slice: 'slice', slices: 'slice', head: 'head', heads: 'head',
  // common countables (treated as count unit when used after quantity):
  egg: 'count', eggs: 'count',
};

export function normalizeUnit(raw?: string): CanonicalUnit | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase();
  if (UNIT_ALIASES[key]) return UNIT_ALIASES[key];
  // handle e.g., 'fl. oz', 'fl-oz'
  const normalized = key.replace(/\./g, '').replace(/\s+/g, ' ').replace(/-/g, ' ');
  if (UNIT_ALIASES[normalized]) return UNIT_ALIASES[normalized];
  return undefined;
}

export function isCountableUnit(u?: CanonicalUnit): boolean {
  return !!u && (
    u === 'clove' || u === 'bunch' || u === 'slice' || u === 'head' || u === 'stick' || u === 'can' || u === 'jar' || u === 'package' || u === 'bottle' || u === 'count'
  );
}