// server/utils/recipeScraper.js
// Recipe scraper for extracting structured recipe data from URLs
const cheerio = require('cheerio');

const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36";

// --- Small helpers -----------------------------------------------------------

// Parse ISO8601 durations like PT45M, PT1H30M, P0DT40M -> "1 hr 30 min"
function humanizeISODuration(iso = "") {
  const m = iso.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/i);
  if (!m) return iso || "";
  const [, d, h, min, s] = m.map((x) => (x ? parseInt(x, 10) : 0));
  const parts = [];
  if (d) parts.push(`${d} day${d !== 1 ? "s" : ""}`);
  if (h) parts.push(`${h} hr${h !== 1 ? "s" : ""}`);
  if (min) parts.push(`${min} min`);
  if (s && !min && !h && !d) parts.push(`${s} sec`);
  return parts.join(" ") || iso;
}

const clean = (s) =>
  (s || "")
    .toString()
    .replace(/\s+/g, " ")
    .replace(/\u00A0/g, " ")
    .trim();

const uniq = (arr) => [...new Set(arr.map(clean))].filter(Boolean);

// JSON.parse but tolerant of leading/trailing junk
function tryParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    // Some sites include multiple JSON objects concatenated or HTML-escaped entities.
    const fixed = text
      .replace(/&quot;/g, '"')
      .replace(/\uFEFF/g, "")
      .trim();
    try {
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

// Flatten recipeInstructions which may be nested objects
function flattenInstructions(instr) {
  if (!instr) return [];
  const out = [];
  const pushText = (t) => {
    const x = clean(t);
    if (x) out.push(x);
  };

  const handle = (node) => {
    if (!node) return;
    if (typeof node === "string") return pushText(node);
    if (Array.isArray(node)) return node.forEach(handle);
    if (typeof node === "object") {
      if (node.text) pushText(node.text);
      if (node.itemListElement) handle(node.itemListElement);
      if (!node.text && node.name && !node.itemListElement) pushText(node.name);
    }
  };

  handle(instr);
  return out;
}

// Prefer the most complete of multiple candidates
function pickBestRecipe(candidates, url = '') {
  if (!candidates.length) return null;
  
  // Extract key terms from URL for context matching
  const urlTerms = url.toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(term => term.length > 2 && !['com', 'www', 'recipe', 'http', 'https'].includes(term));
  
  const scored = candidates
    .map((r) => {
      const recipeName = (r.name || '').toLowerCase();
      
      // URL context score - boost significantly if recipe name contains URL terms
      const urlContextScore = urlTerms.reduce((score, term) => 
        recipeName.includes(term) ? score + 50 : score, 0);
      
      const baseScore = 
        (r.recipeIngredient?.length || 0) * 2 +
        (flattenInstructions(r.recipeInstructions).length || 0) * 2 +
        (r.name ? 1 : 0) +
        (r.totalTime ? 1 : 0);
      
      return {
        score: baseScore + urlContextScore,
        r,
        debug: { recipeName, urlTerms, urlContextScore, baseScore }
      };
    })
    .sort((a, b) => b.score - a.score);
    
  // Debug logging to understand scoring
  console.log(`📊 Recipe scoring for ${candidates.length} candidates:`);
  scored.slice(0, 3).forEach((item, i) => {
    console.log(`  ${i + 1}. "${item.debug.recipeName}" - Score: ${item.score} (base: ${item.debug.baseScore}, url: ${item.debug.urlContextScore})`);
  });
  
  return scored[0].r;
}

// --- Extractors --------------------------------------------------------------

// 1) JSON-LD (schema.org Recipe)  
function extractFromJSONLD($, url = '') {
  const candidates = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const json = tryParseJSON($(el).contents().text());
    if (!json) return;

    const nodes = [];
    if (Array.isArray(json)) nodes.push(...json);
    else if (json["@graph"]) nodes.push(...json["@graph"]);
    else nodes.push(json);

    nodes.forEach((node) => {
      const types = []
        .concat(node["@type"] || [])
        .map((t) => (typeof t === "string" ? t.toLowerCase() : ""))
        .filter(Boolean);

      if (types.includes("recipe")) {
        candidates.push(node);
      }
      if (node.mainEntity) {
        const me = node.mainEntity;
        const meTypes = []
          .concat(me["@type"] || [])
          .map((t) => (typeof t === "string" ? t.toLowerCase() : ""));
        if (meTypes.includes("recipe")) candidates.push(me);
      }
    });
  });

  const chosen = pickBestRecipe(candidates, url);
  if (!chosen) return null;

  const ingredients = uniq(
    [].concat(chosen.recipeIngredient || chosen.ingredients || [])
  );

  const instructions = uniq(flattenInstructions(chosen.recipeInstructions));

  return {
    title: clean(chosen.name),
    ingredients,
    steps: instructions,
    yields: clean(
      chosen.recipeYield?.toString
        ? chosen.recipeYield.toString()
        : chosen.recipeYield || ""
    ),
    totalTime: humanizeISODuration(chosen.totalTime || ""),
    prepTime: humanizeISODuration(chosen.prepTime || ""),
    cookTime: humanizeISODuration(chosen.cookTime || ""),
  };
}

// 2) Microdata fallback
function extractFromMicrodata($) {
  const $recipe = $('[itemtype*="schema.org/Recipe"]').first();
  if (!$recipe.length) return null;

  const title =
    clean($recipe.find('[itemprop="name"]').first().text()) ||
    clean($('meta[property="og:title"]').attr("content")) ||
    clean($("title").text());

  const ingredients = uniq(
    $recipe
      .find('[itemprop="recipeIngredient"], [itemprop="ingredients"]')
      .map((_, el) => $(el).text())
      .get()
  );

  let steps = $recipe
    .find('[itemprop="recipeInstructions"]')
    .map((_, el) => {
      const $el = $(el);
      const li = $el.find("li").map((__, liEl) => $(liEl).text()).get();
      if (li.length) return li.join("\n");
      return $el.text();
    })
    .get();

  if (!steps.length) {
    steps = $('[class*="instruction"], [class*="direction"]')
      .find("li, p")
      .map((_, el) => $(el).text())
      .get();
  }

  return {
    title,
    ingredients: uniq(ingredients),
    steps: uniq(steps.map(clean)),
    yields: clean($recipe.find('[itemprop="recipeYield"]').text()),
    totalTime: humanizeISODuration(
      $recipe.find('[itemprop="totalTime"]').attr("content") || ""
    ),
    prepTime: humanizeISODuration(
      $recipe.find('[itemprop="prepTime"]').attr("content") || ""
    ),
    cookTime: humanizeISODuration(
      $recipe.find('[itemprop="cookTime"]').attr("content") || ""
    ),
  };
}

// 3) Heuristic fallback
function extractHeuristic($) {
  const title =
    clean($('h1[class*="title"], h1').first().text()) ||
    clean($('meta[property="og:title"]').attr("content")) ||
    clean($("title").text());

  const ingContainers = $(
    [
      '[class*="ingredient"]',
      "#ingredients",
      ".ingredients",
      'ul[itemprop="recipeIngredient"]',
    ].join(",")
  ).first();

  let ingredients = [];
  if (ingContainers.length) {
    ingredients = ingContainers.find("li").map((_, li) => $(li).text()).get();
    if (!ingredients.length) {
      ingredients = ingContainers
        .find("p")
        .map((_, p) => $(p).text())
        .get();
    }
  }

  const instrContainers = $(
    [
      '[class*="instruction"]',
      '[class*="direction"]',
      "#instructions",
      ".instructions",
      ".directions",
    ].join(",")
  ).first();

  let steps = [];
  if (instrContainers.length) {
    steps = instrContainers
      .find("li, p")
      .map((_, el) => $(el).text())
      .get();
  } else {
    let maxLen = 0;
    $("ol").each((_, el) => {
      const n = $(el).find("li").length;
      if (n > maxLen) {
        maxLen = n;
        steps = $(el).find("li").map((__, li) => $(li).text()).get();
      }
    });
  }

  if (!ingredients.length && !steps.length) return null;
  return {
    title,
    ingredients: uniq(ingredients),
    steps: uniq(steps.map(clean)),
    yields: "",
    totalTime: "",
    prepTime: "",
    cookTime: "",
  };
}

// --- Main extractor ----------------------------------------------------------

async function extractRecipe(url) {
  console.log(`🌐 Scraping recipe from: ${url}`);
  
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": ua,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    });
    
    if (!res.ok) {
      throw new Error(`Fetch failed (${res.status}) for ${url}`);
    }
    
    const html = await res.text();
    const $ = cheerio.load(html);

    const byJSON = extractFromJSONLD($, url);
    if (byJSON?.ingredients?.length && byJSON?.steps?.length) {
      console.log(`✅ Recipe extracted via JSON-LD: ${byJSON.title}`);
      return byJSON;
    }

    const byMicro = extractFromMicrodata($);
    if (byMicro?.ingredients?.length && byMicro?.steps?.length) {
      console.log(`✅ Recipe extracted via Microdata: ${byMicro.title}`);
      return byMicro;
    }

    const byHeur = extractHeuristic($);
    if (byHeur) {
      console.log(`✅ Recipe extracted via Heuristics: ${byHeur.title}`);
      return byHeur;
    }

    // If all methods fail, return a minimal fallback recipe
    console.warn(`⚠️ Could not parse recipe from ${url}, returning minimal fallback`);
    return {
      title: "Recipe from " + (url.includes('://') ? new URL(url).hostname : 'unknown source'),
      ingredients: ["Unable to extract ingredients - please add manually"],
      steps: ["Unable to extract instructions - please add manually"],
      description: "Recipe extraction failed. Please manually add ingredients and instructions.",
      url: url,
      prepTime: "",
      cookTime: "",
      servings: ""
    };

  } catch (error) {
    console.error(`❌ Recipe scraping failed for ${url}:`, error.message);

    // Return a fallback recipe instead of throwing
    return {
      title: "Recipe from " + (url.includes('://') ? new URL(url).hostname : 'unknown source'),
      ingredients: ["Recipe extraction failed - please add ingredients manually"],
      steps: ["Recipe extraction failed - please add instructions manually"],
      description: `Failed to extract recipe from ${url}. Error: ${error.message}`,
      url: url,
      prepTime: "",
      cookTime: "",
      servings: "",
      error: error.message
    };
  }
}

// --- Formatters --------------------------------------------------------------

function toMarkdown(r) {
  const lines = [];
  lines.push(`# ${r.title || "Recipe"}`);
  const meta = [];
  if (r.yields) meta.push(`**Yields:** ${r.yields}`);
  if (r.totalTime) meta.push(`**Total time:** ${r.totalTime}`);
  if (r.prepTime) meta.push(`**Prep:** ${r.prepTime}`);
  if (r.cookTime) meta.push(`**Cook:** ${r.cookTime}`);
  if (meta.length) lines.push(meta.join("  \n"));
  lines.push("\n## Ingredients");
  lines.push(...(r.ingredients || []).map((i) => `- ${i}`));
  lines.push("\n## Instructions");
  lines.push(...(r.steps || []).map((s, i) => `${i + 1}. ${s}`));
  return lines.join("\n");
}

function toCartSmashFormat(r) {
  const lines = [];
  lines.push(`Recipe Name: ${r.title || "Recipe"}`);
  if (r.yields) lines.push(`Serves: ${r.yields}`);
  if (r.totalTime) lines.push(`Total Time: ${r.totalTime}`);
  if (r.prepTime) lines.push(`Prep Time: ${r.prepTime}`);
  if (r.cookTime) lines.push(`Cook Time: ${r.cookTime}`);
  lines.push("");
  lines.push("Ingredients:");
  lines.push(...(r.ingredients || []).map((i) => `- ${i}`));
  lines.push("");
  lines.push("Instructions:");
  lines.push(...(r.steps || []).map((s, i) => `${i + 1}. ${s}`));
  return lines.join("\n");
}

module.exports = {
  extractRecipe,
  toMarkdown,
  toCartSmashFormat
};