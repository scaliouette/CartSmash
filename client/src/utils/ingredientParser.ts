// client/src/utils/ingredientParser.ts

import type { CanonicalUnit, ParsedIngredient, Quantity } from './recipeParser';
import { NUMBER_WORDS, normalizeUnit, isCountableUnit } from './unitDictionary';
import { canonicalItemName, categorize, singularizeBasic } from './foodCategories';

const UNICODE_FRACTIONS: Record<string, number> = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1/3, '⅔': 2/3, '⅛': 1/8, '⅜': 3/8, '⅝': 5/8, '⅞': 7/8 };

export function normalizeFractions(s: string): string {
  return s.replace(/[¼½¾⅓⅔⅛⅜⅝⅞]/g, (m) => String(UNICODE_FRACTIONS[m] ?? m));
}

function parseNumberToken(token: string): number | undefined {
  const t = token.trim().toLowerCase();
  // Check if NUMBER_WORDS exists and has the property to avoid initialization errors
  if (NUMBER_WORDS && typeof NUMBER_WORDS === 'object' && NUMBER_WORDS[t] != null) {
    return NUMBER_WORDS[t];
  }
  if (/^\d+\.\d+$/.test(t)) return parseFloat(t);
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  if (/^\d+\s+\d+\/\d+$/.test(t)) {
    const [a, frac] = t.split(/\s+/);
    const [n, d] = frac.split('/').map(Number);
    return parseInt(a, 10) + (n / d);
  }
  if (/^\d+\/\d+$/.test(t)) {
    const [n, d] = t.split('/').map(Number);
    return n / d;
  }
  return undefined;
}

const QTY_RE = /^(?<qty>(?:\d+(?:\s+\d+\/\d+)?|\d*\/\d+|\d+(?:\.\d+)?)(?:\s*(?:–|-|to)\s*(?:\d+(?:\s+\d+\/\d+)?|\d*\/\d+|\d+(?:\.\d+)?))?)/i;
const CONTAINER_RE = /\((?<size>\d+(?:\.\d+)?)\s*(?<unit>oz|fl oz|g|kg|ml|l)\)\s*(?<kind>can|jar|package|bottle)s?/i;
const NOTES_RE = /(to taste|optional|divided|for\s+serving|plus\s+more\b[^,]*)/i;

const QUALIFIERS = ['large','small','medium','ripe','fresh','boneless','skinless','freshly ground','packed','softened','room temperature'];
const PREP_FORMS = ['chopped','minced','diced','sliced','thinly sliced','zested','peeled','grated','shredded','softened','melted','beaten','separated'];

export function splitIntoSections(lines: string[]): { section?: string; lines: string[] }[] {
  const blocks: { section?: string; lines: string[] }[] = [];
  let current: { section?: string; lines: string[] } = { lines: [] };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const isSection = /^(for\s+.+?):?$/i.test(line);
    if (isSection) {
      if (current.lines.length) blocks.push(current);
      current = { section: line.replace(/:$/, ''), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length) blocks.push(current);
  return blocks;
}

function extractBrandAndItem(remainder: string): { brand?: string; itemText: string } {
  // Very lightweight brand heuristic: Capitalized token(s) before known item nouns or before lowercase streak
  const tokens = remainder.split(/\s+/);
  const brandTokens: string[] = [];
  while (tokens.length && /^[A-Z][a-zA-Z]+$/.test(tokens[0])) {
    brandTokens.push(tokens.shift()!);
    if (tokens.length && /^[a-z]/.test(tokens[0])) break;
  }
  return {
    brand: brandTokens.length ? brandTokens.join(' ') : undefined,
    itemText: tokens.join(' ')
  };
}

function singularizePhrase(phrase: string): string {
  return phrase.split(/\s+/).map(singularizeBasic).join(' ');
}

function parseQuantityAndUnit(head: string): { qty?: Quantity; unit?: CanonicalUnit; consumed: number } {
  const m = head.match(QTY_RE);
  let consumed = 0;
  let qty: Quantity | undefined;
  let unit: CanonicalUnit | undefined;
  if (m && m.groups) {
    const q = m.groups['qty'];
    consumed = q.length;
    const norm = normalizeFractions(q);
    let min: number | undefined;
    let max: number | undefined;
    if (/(–|-|to)/.test(norm)) {
      const [a, b] = norm.split(/\s*(?:–|-|to)\s*/);
      min = parseNumberToken(a);
      max = parseNumberToken(b);
    } else {
      min = parseNumberToken(norm);
    }
    qty = { min, max };

    const after = head.slice(consumed).trim();
    const unitTok = after.split(/\s+/)[0];
    const unitNorm = normalizeUnit(unitTok);
    if (unitNorm) {
      unit = unitNorm;
      consumed += (head.slice(consumed).match(/^\s*\S+/)![0]).length;
    }
  } else {
    // Try number word (e.g., "two")
    const word = head.split(/\s+/)[0].toLowerCase();
    if (NUMBER_WORDS[word]) {
      qty = { min: NUMBER_WORDS[word] };
      consumed = word.length;
      const after = head.slice(consumed).trim();
      const unitTok = after.split(/\s+/)[0];
      const unitNorm = normalizeUnit(unitTok);
      if (unitNorm) {
        unit = unitNorm;
        consumed += (head.slice(consumed).match(/^\s*\S+/)![0]).length;
      }
    }
  }
  return { qty, unit, consumed };
}

function splitSaltPepper(line: string, base: ParsedIngredient): ParsedIngredient[] {
  // 'salt and pepper' or 'salt & pepper'
  const re = /(salt)\s*(?:and|&)\s*(pepper)/i;
  if (re.test(line)) {
    const a: ParsedIngredient = { ...base, item: 'salt', toTaste: true, category: 'pantry' };
    const b: ParsedIngredient = { ...base, item: 'black pepper', toTaste: true, category: 'pantry' };
    return [a, b];
  }
  return [base];
}

export function parseIngredientLine(rawInput: string, section?: string): ParsedIngredient[] {
  // Pre-clean
  let raw = rawInput.replace(/^[-•\s]+/, '').replace(/[–—]/g, '-').trim();
  raw = normalizeFractions(raw);

  const notes: string[] = [];
  const forms: string[] = [];
  const qualifiers: string[] = [];
  let alternatives: string[] | undefined;
  let toTaste = false;
  let estimated = false;

  // Pull container info early (parenthetical size)
  let container: ParsedIngredient['container'] | undefined;
  const cont = raw.match(CONTAINER_RE);
  if (cont && cont.groups) {
    container = {
      size: { value: parseFloat(cont.groups['size']), unit: cont.groups['unit'].toLowerCase() as any },
      kind: cont.groups['kind'].toLowerCase() as any,
    };
    // We'll fill container.count later from quantity, if unit indicates can/jar/etc.
  }

  // Extract head (qty + unit) from beginning
  const headEnd = raw.indexOf(' ');
  const head = headEnd === -1 ? raw : raw;
  const { qty, unit, consumed } = parseQuantityAndUnit(head);

  let rest = consumed ? raw.slice(consumed).trim() : raw;
  if (unit && (unit === 'can' || unit === 'jar' || unit === 'package' || unit === 'bottle')) {
    if (!container) container = { kind: unit };
    if (qty?.min != null) container.count = qty.min;
  }

  // Notes like 'to taste', 'optional', 'divided', 'for serving', 'plus more for ...'
  const noteMatch = rest.match(NOTES_RE);
  if (noteMatch) {
    const n = noteMatch[1].toLowerCase();
    if (n.includes('to taste')) toTaste = true;
    else notes.push(n);
    rest = rest.replace(NOTES_RE, '').replace(/\s+,\s*$/, '').trim();
  }

  // Split on commas into main vs descriptors
  const [mainPart, ...tailParts] = rest.split(/,(?![^()]*\))/).map(s => s.trim()).filter(Boolean);
  const desc = tailParts.join(', ').toLowerCase();
  for (const f of PREP_FORMS) if (new RegExp(`\\b${f}\\b`).test(desc)) forms.push(f);
  for (const q of QUALIFIERS) if (new RegExp(`\\b${q}\\b`).test(desc)) qualifiers.push(q);
  if (/\bplus\s+more\b/.test(desc)) notes.push(desc.match(/plus\s+more\b.*$/)![0]);

  // Alternatives with ' or '
  if (/\bor\b/.test(mainPart)) {
    const [left, right] = mainPart.split(/\bor\b/i).map(s => s.trim());
    alternatives = [canonicalItemName(singularizePhrase(right))];
    rest = left;
  } else {
    rest = mainPart;
  }

  // Extract potential brand
  const { brand, itemText } = extractBrandAndItem(rest);

  // If no unit but countable noun exists like 'eggs', treat as count unit
  let finalUnit = unit;
  if (!finalUnit) {
    const firstTok = itemText.split(/\s+/)[0].toLowerCase();
    if (['egg','eggs','clove','cloves','bunch','bunches','stick','sticks','head','heads','slice','slices'].includes(firstTok)) {
      finalUnit = normalizeUnit(firstTok) || 'count';
    }
  }

  // Base item is the first noun-ish span; keep simple: take up to first 'of'
  const ofSplit = itemText.split(/\bof\b/i);
  const base = ofSplit.length > 1 ? ofSplit[ofSplit.length - 1] : itemText;
  const item = canonicalItemName(singularizePhrase(base.replace(/\(.*?\)/g, '').trim()));

  // Category
  const category = categorize(item);

  // Estimated quantities for phrases like 'a pinch', 'a dash', 'a handful'
  if (!qty && /\b(a\s+pinch|a\s+dash|a\s+handful)\b/i.test(raw)) {
    estimated = true;
  }

  const baseObj: ParsedIngredient = {
    raw: rawInput,
    section,
    quantity: qty,
    unit: finalUnit,
    item,
    container,
    forms: forms.length ? Array.from(new Set(forms)) : undefined,
    notes: notes.length ? Array.from(new Set(notes)) : undefined,
    alternatives,
    toTaste,
    estimated,
    brand,
    qualifiers: qualifiers.length ? Array.from(new Set(qualifiers)) : undefined,
    category,
  };

  return splitSaltPepper(itemText, baseObj);
}