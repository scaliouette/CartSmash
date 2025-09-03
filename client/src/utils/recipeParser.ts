// client/src/utils/recipeParser.ts

import { parseIngredientLine, splitIntoSections as splitIngredientSections } from './ingredientParser';
import { parseInstructions } from './instructionParser';
import { CanonicalUnit } from './unitDictionary';

export type { CanonicalUnit };

export interface Quantity {
  min?: number;
  max?: number;
  text?: string; // for 'a pinch', 'to taste' etc.
}

export interface ContainerInfo {
  count?: number; // e.g., 2 (cans)
  size?: { value: number; unit: CanonicalUnit | 'oz' | 'floz' | 'g' | 'kg' | 'ml' | 'l' };
  kind?: 'can' | 'jar' | 'package' | 'bottle';
}

export interface ParsedIngredient {
  raw: string;
  section?: string;
  quantity?: Quantity;
  unit?: CanonicalUnit;
  item: string; // canonical base item (singular, lowercase)
  container?: ContainerInfo;
  forms?: string[];       // chopped, minced, room temperature, etc.
  notes?: string[];       // divided, for serving, plus more for ...
  alternatives?: string[];// 'tamari' if 'soy sauce or tamari'
  toTaste?: boolean;
  estimated?: boolean;    // if converted from 'pinch', 'handful', etc.
  brand?: string;
  qualifiers?: string[];  // large, ripe, fresh, boneless skinless, etc.
  category?: string;      // produce, dairy, pantry, meat, spice, etc.
}

export interface ParsedStep {
  raw: string;
  number: number; // 1-based
  section?: string;
  actions: string[];
  ingredientsRef?: string[]; // canonical ingredient names
  tools?: string[];
  temperatures?: { value: number; unit: 'F' | 'C' }[];
  times?: { min?: number; max?: number; unit: 's' | 'min' | 'h' }[];
  speeds?: string[]; // e.g., 'medium heat', 'high', 'low'
  doneness?: string[]; // 'until browned', 'to al dente'
  concurrency?: boolean; // contains 'meanwhile', 'while', etc.
  yields?: string[]; // 'make the sauce', 'forms a ball'
  notes?: string[]; // misc safety, resting, storage
}

export interface RecipeInput {
  title?: string;
  ingredientLines: string[] | string; // array or multiline string
  instructionLines: string[] | string; // array or multiline string
}

export interface ParsedRecipe {
  title?: string;
  sections?: string[];
  ingredients: ParsedIngredient[];
  steps: ParsedStep[];
}

export function parseRecipe(input: RecipeInput): ParsedRecipe {
  const ingredientLines = Array.isArray(input.ingredientLines)
    ? input.ingredientLines
    : input.ingredientLines.split(/\r?\n/).filter(Boolean);

  const instructionLines = Array.isArray(input.instructionLines)
    ? input.instructionLines
    : input.instructionLines.split(/\r?\n/).filter(Boolean);

  // Detect ingredient sections (e.g., "For the sauce:")
  const sectioned = splitIngredientSections(ingredientLines);

  const ingredients: ParsedIngredient[] = [];
  const sections: string[] = [];
  for (const block of sectioned) {
    if (block.section && !sections.includes(block.section)) sections.push(block.section);
    for (const line of block.lines) {
      const parsed = parseIngredientLine(line, block.section || undefined);
      for (const p of parsed) ingredients.push(p);
    }
  }

  const steps = parseInstructions(instructionLines, ingredients);

  return { title: input.title, sections, ingredients, steps };
}