// client/src/utils/instructionParser.ts

import type { ParsedStep, ParsedIngredient } from './recipeParser';
import { SYNONYMS } from './foodCategories';

const ACTION_LEXICON = [
  'preheat','heat','whisk','mix','combine','fold','chop','mince','slice','dice','saute','sauté','brown','sear','simmer','boil','bake','roast','grill','broil','drain','strain','knead','proof','marinate','season','garnish','serve','toss','stir','blend','puree','purée','mash','press','rest','cool','reduce','deglaze','poach','steam'
];

const TOOL_LEXICON = [
  'oven','skillet','pan','saucepan','pot','dutch oven','sheet pan','baking sheet','baking dish','tray','stand mixer','mixer','bowl','blender','food processor','whisk','spatula','colander','knife','grater'
];

const HEAT_WORDS = ['low','medium','high','medium-low','medium-high'];

function lemmatizeVerb(v: string): string {
  const base = v.toLowerCase();
  if (base.endsWith('ing') && ACTION_LEXICON.includes(base.slice(0, -3))) return base.slice(0, -3);
  if (base.endsWith('ed') && ACTION_LEXICON.includes(base.slice(0, -2))) return base.slice(0, -2);
  if (base === 'sauté') return 'saute';
  if (base === 'purée') return 'puree';
  return base;
}

function segmentSteps(lines: string[] | string): string[] {
  const arr = Array.isArray(lines) ? lines : lines.split(/\r?\n/);
  if (arr.length === 1) {
    // Attempt sentence segmentation; keep semicolon splits
    return arr[0]
      .split(/(?<=\.)\s+(?=[A-Z])|;\s+/)
      .map(s => s.trim())
      .filter(Boolean);
  }
  // If numbers present, keep as-is (trim prefixes like '1.' '2)')
  return arr.map(l => l.replace(/^\s*\d+[\.)]\s*/, '').trim()).filter(Boolean);
}

function extractTemperatures(s: string): { value: number; unit: 'F' | 'C' }[] {
  const temps: { value: number; unit: 'F' | 'C' }[] = [];
  const re = /(\d{2,3})\s*°?\s*(F|C)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) temps.push({ value: parseInt(m[1], 10), unit: m[2].toUpperCase() as 'F'|'C' });
  return temps;
}

function extractTimes(s: string): { min?: number; max?: number; unit: 's'|'min'|'h' }[] {
  const times: { min?: number; max?: number; unit: 's'|'min'|'h' }[] = [];
  const re = /(about\s+)?(\d+)(?:\s*(?:–|-|to)\s*(\d+))?\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const a = parseInt(m[2], 10);
    const b = m[3] ? parseInt(m[3], 10) : undefined;
    const unitWord = m[4].toLowerCase();
    const unit: 's'|'min'|'h' = /sec/.test(unitWord) ? 's' : /hour|hr/.test(unitWord) ? 'h' : 'min';
    times.push({ min: a, max: b, unit });
  }
  return times;
}

function extractActions(s: string): string[] {
  const actions = new Set<string>();
  const words = s.toLowerCase().replace(/[.,;:]/g, ' ').split(/\s+/);
  for (const w of words) {
    const lemma = lemmatizeVerb(w);
    if (ACTION_LEXICON.includes(lemma)) actions.add(lemma);
  }
  return Array.from(actions);
}

function extractTools(s: string): string[] {
  const tools = new Set<string>();
  for (const t of TOOL_LEXICON) {
    const re = new RegExp(`\\b${t.replace(' ', '\\s+')}\\b`, 'i');
    if (re.test(s)) tools.add(t);
  }
  return Array.from(tools);
}

function extractSpeeds(s: string): string[] {
  const lows = new Set<string>();
  for (const h of HEAT_WORDS) {
    const re = new RegExp(`\\b${h}\\b(?:\\s+heat|\\s+speed)?`, 'i');
    const m = s.match(re);
    if (m) lows.add(m[0].toLowerCase());
  }
  return Array.from(lows);
}

function extractDoneness(s: string): string[] {
  const arr: string[] = [];
  const untilRe = /\buntil\b\s+([^.,;]+)/gi;
  const toRe = /\bto\b\s+([^.,;]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = untilRe.exec(s))) arr.push(`until ${m[1].trim()}`);
  while ((m = toRe.exec(s))) arr.push(`to ${m[1].trim()}`);
  return arr;
}

function linkIngredients(stepText: string, ingredients: ParsedIngredient[]): string[] {
  const refs = new Set<string>();
  const s = stepText.toLowerCase();
  const names = ingredients.map(i => i.item.toLowerCase());
  for (const name of names) {
    const syn = SYNONYMS[name] || name;
    const re = new RegExp(`\\b${syn.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}s?\\b`, 'i');
    if (re.test(s)) refs.add(name);
  }
  // simple plurals
  return Array.from(refs);
}

export function parseInstructions(lines: string[] | string, ingredients: ParsedIngredient[]): ParsedStep[] {
  const rawSteps = segmentSteps(lines);
  const out: ParsedStep[] = [];
  let n = 1;
  for (const raw of rawSteps) {
    const actions = extractActions(raw);
    const tools = extractTools(raw);
    const temperatures = extractTemperatures(raw);
    const times = extractTimes(raw);
    const speeds = extractSpeeds(raw);
    const doneness = extractDoneness(raw);
    const concurrency = /\bmeanwhile\b|\bwhile\b|\bat the same time\b|\bin a separate\b/i.test(raw);
    const yields = (/\bmake the\b/i.test(raw) || /\bforms a\b/i.test(raw)) ?
      (raw.match(/\b(make the\s+[^.,;]+|forms a\s+[^.,;]+)/gi) || []).map(s => s.toLowerCase()) : undefined;
    const ingredientsRef = linkIngredients(raw, ingredients);

    out.push({
      raw: raw.trim(),
      number: n++,
      actions,
      ingredientsRef: ingredientsRef.length ? ingredientsRef : undefined,
      tools: tools.length ? tools : undefined,
      temperatures: temperatures.length ? temperatures : undefined,
      times: times.length ? times : undefined,
      speeds: speeds.length ? speeds : undefined,
      doneness: doneness.length ? doneness : undefined,
      concurrency: concurrency || undefined,
      yields,
    });
  }
  return out;
}