// Lightweight ingredient parser + normalizer
// Handles: quantities (incl. "1 1/2"), units, size hints ("24 oz jar"), and name.

const FRACTION_MAP = { "¼": "1/4", "½": "1/2", "¾": "3/4", "⅓": "1/3", "⅔": "2/3", "⅛": "1/8" };

const UNIT_ALIASES = {
  teaspoon: ["tsp", "teaspoon", "teaspoons"],
  tablespoon: ["tbsp", "tablespoon", "tablespoons"],
  cup: ["cup", "cups"],
  ounce: ["oz", "ounce", "ounces"],
  pound: ["lb", "lbs", "pound", "pounds"],
  gram: ["g", "gram", "grams"],
  kilogram: ["kg", "kilogram", "kilograms"],
  milliliter: ["ml", "millilitre", "milliliter", "milliliters"],
  liter: ["l", "liter", "liters", "litre", "litres"],
  clove: ["clove", "cloves"],
  can: ["can", "cans"],
  jar: ["jar", "jars"],
  package: ["package", "packages", "pkg", "pkgs", "pack", "packs"],
  slice: ["slice", "slices"],
  piece: ["piece", "pieces"],
  breast: ["breast", "breasts"],
  unit: []  // fallback for unitless
};

const NORMALIZE_UNIT = Object.entries(UNIT_ALIASES)
  .flatMap(([norm, arr]) => arr.map(a => [a, norm]))
  .reduce((acc, [a, norm]) => (acc[a] = norm, acc), {});

function clean(s = "") {
  return s.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

function fractionToNumber(text) {
  if (!text) return null;
  const t = text.replace(/[¼½¾⅓⅔⅛]/g, m => FRACTION_MAP[m] || m);
  // "1 1/2" | "3/4" | "1.5"
  const mMix = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mMix) return Number(mMix[1]) + Number(mMix[2]) / Number(mMix[3]);
  const mFrac = t.match(/^(\d+)\/(\d+)$/);
  if (mFrac) return Number(mFrac[1]) / Number(mFrac[2]);
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse an ingredient line like:
 *  - "1 1/2 cups shredded mozzarella"
 *  - "24 oz jar marinara sauce"
 *  - "3 boneless, skinless chicken breasts"
 * Returns: { qty, unit, name, sizeQty, sizeUnit, notes, original }
 */
function parseIngredientLine(line) {
  const original = clean(line);
  let s = original.toLowerCase();

  // Remove common trailing notes that don't affect shopping
  s = s.replace(/\b(divided|for serving|to taste|optional)\b/g, "").trim();

  // Pull leading quantity (mixed, fraction, decimal, integer)
  const qtyMatch = s.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+)/);
  const qty = qtyMatch ? fractionToNumber(qtyMatch[1]) : null;
  if (qtyMatch) s = s.slice(qtyMatch[0].length).trim();

  // Pull unit (first word after qty if it looks like a unit)
  let unit = null;
  if (qty !== null) {
    const unitMatch = s.match(/^([a-zA-Z]+)\b/);
    if (unitMatch) {
      const cand = unitMatch[1];
      const normalized = NORMALIZE_UNIT[cand] || (UNIT_ALIASES[cand] ? cand : null);
      if (normalized) {
        unit = normalized;
        s = s.slice(unitMatch[0].length).trim();
      }
    }
  }

  // Try to capture embedded size like "24 oz", "8 ounce", "2 lb", "500 g"
  let sizeQty = null, sizeUnit = null;
  const sizeRegex = /\b(\d+(?:\.\d+)?)\s*(oz|ounce|ounces|lb|lbs|pound|pounds|g|gram|grams|kg|kilogram|kilograms|ml|milliliter|milliliters|l|liter|liters)\b/;
  const sizeMatch = s.match(sizeRegex);
  if (sizeMatch) {
    sizeQty = Number(sizeMatch[1]);
    sizeUnit = NORMALIZE_UNIT[sizeMatch[2]] || sizeMatch[2].toLowerCase();
    s = (s.slice(0, sizeMatch.index) + s.slice(sizeMatch.index + sizeMatch[0].length)).trim();
  }

  // Remove commas and extra descriptors that hurt search
  let name = clean(s.replace(/[,;]+/g, " ")
    .replace(/\b(boneless|skinless|fresh|shredded|grated|minced|chopped|large|small|medium)\b/g, "")
    .replace(/\s{2,}/g, " ")).trim();

  if (!name) name = clean(s);

  // Heuristic: if we had no explicit unit but the noun is discrete (can/jar/package), treat it as unit
  if (!unit) {
    const discrete = ["can", "jar", "package", "pkg", "pack", "breast", "clove", "slice", "piece"];
    for (const d of discrete) {
      if (name.startsWith(d + " ") || name.endsWith(" " + d) || name === d) {
        unit = NORMALIZE_UNIT[d] || d;
        break;
      }
    }
  }

  return { qty, unit: unit || "unit", name, sizeQty, sizeUnit, notes: "", original };
}

function buildSearchQuery(item) {
  const size = item.sizeQty ? ` ${item.sizeQty} ${item.sizeUnit || ""}` : "";
  return `${item.name}${size}`.trim();
}

module.exports = { parseIngredientLine, buildSearchQuery, clean, fractionToNumber };