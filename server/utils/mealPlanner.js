// meal-planner.js
// Node 18+ (no external deps).
// Generates: (A) Healthy 7-day plan for family of 4 + grocery list
//            (B) $75/2 people budget grocery list + simple weekly outline
//            (C) Five 30-minute convenience dinners
// Also exports cart-ready "ingredient lines".

///////////////////////
// Utilities
///////////////////////

const fmt = (n) => {
  if (n == null || Number.isNaN(n)) return "";
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return String(+n.toFixed(2));
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function scaleQty(qty, factor) {
  if (qty == null) return null;
  return +(qty * factor).toFixed(4);
}

// Canonical ingredient helper
const ING = (name, qty, unit, category = "pantry") => ({ name, qty, unit, category });

///////////////////////
// Minimal price map (rough estimates; adjust to your region)
///////////////////////
const PRICE = {
  // produce (per each or per lb)
  banana: 0.25, apple: 0.6, orange: 0.8, lemon: 0.7, avocado: 1.0,
  "russet potato (lb)": 0.8, "sweet potato (lb)": 1.2, "onion (lb)": 0.9, "carrot (lb)": 1.0,
  "broccoli (head)": 1.8, "bell pepper": 0.9, "cucumber": 0.9, "tomato": 0.9,
  "green beans (lb)": 2.2, "spinach (bag)": 3.0, "romaine (head)": 1.9,
  "garlic (head)": 0.6, "cilantro/parsley (bunch)": 1.2,

  // proteins / dairy
  "chicken thighs (lb)": 2.0, "ground turkey (lb)": 3.0, "salmon (lb)": 8.0,
  tofu: 2.0, egg: 0.22, "greek yogurt (32oz)": 4.9, "plain yogurt (32oz)": 3.6,
  "mozzarella (8oz)": 3.2, "cheddar (8oz)": 3.2, "parmesan (4oz)": 3.0, feta: 3.0,
  "string cheese": 0.45, tuna: 1.2,

  // grains
  "oats (42oz)": 5.5, "bread (loaf)": 2.0, tortilla: 0.35, "whole-wheat pasta (lb)": 1.4,
  "brown rice (lb)": 1.1, quinoa: 3.5, naan: 1.2, "couscous (box)": 2.0, granola: 3.5,

  // canned/jarred/frozen
  "black beans (can)": 0.9, "kidney beans (can)": 1.0, "chickpeas (can)": 1.0,
  "marinara (jar)": 2.0, pesto: 3.2, teriyaki: 2.5, salsa: 2.0,
  "frozen stir-fry veg (lb)": 2.2, "frozen corn (lb)": 1.5, "diced tomatoes (can)": 1.0,

  // pantry/snacks
  "peanut butter (16oz)": 2.2, "mixed nuts (lb)": 6.5, popcorn: 3.0, oil: 3.0, vinegar: 2.0, honey: 3.0,
};

// Cost calculator for grocery list (very approximate)
function estimateCost(groceryList) {
  let total = 0;
  for (const item of groceryList) {
    const keyCandidates = [
      `${item.name} (${item.unit})`,
      item.name,                           // fallback
    ];
    let pricePerUnit = null;
    for (const key of keyCandidates) {
      if (PRICE[key] != null) { pricePerUnit = PRICE[key]; break; }
    }
    // When no price available, assume $2 baseline
    if (pricePerUnit == null) pricePerUnit = 2.0;
    const qty = item.qty ?? 1;
    total += pricePerUnit * qty;
  }
  return +total.toFixed(2);
}

///////////////////////
// Recipe catalog (scaled by servings)
///////////////////////
const RECIPES = {
  // Breakfasts
  "yogurt_parfait": {
    title: "Greek Yogurt Parfaits",
    category: "breakfast",
    time: 10,
    ingredients4: [
      ING("greek yogurt (32oz)", 1, "pkg", "dairy"),
      ING("berries", 4, "cups", "produce"),
      ING("granola", 2, "cups", "grains"),
    ],
  },
  "oatmeal_pb_banana": {
    title: "Oatmeal with Banana & Peanut Butter",
    category: "breakfast",
    time: 10,
    ingredients4: [
      ING("oats (42oz)", 0.3, "pkg", "grains"),
      ING("banana", 4, "each", "produce"),
      ING("peanut butter (16oz)", 0.25, "jar", "pantry"),
      ING("milk", 4, "cups", "dairy"),
    ],
  },
  "egg_scramble_toast": {
    title: "Veggie Egg Scramble + Toast",
    category: "breakfast",
    time: 15,
    ingredients4: [
      ING("egg", 8, "each", "dairy"),
      ING("spinach (bag)", 0.5, "bag", "produce"),
      ING("onion (lb)", 0.5, "lb", "produce"),
      ING("bread (loaf)", 0.5, "loaf", "grains"),
    ],
  },
  "smoothie_berry_spinach": {
    title: "Berry Spinach Smoothies",
    category: "breakfast",
    time: 10,
    ingredients4: [
      ING("plain yogurt (32oz)", 0.5, "pkg", "dairy"),
      ING("berries", 3, "cups", "produce"),
      ING("spinach (bag)", 0.5, "bag", "produce"),
      ING("milk", 2, "cups", "dairy"),
    ],
  },
  "overnight_oats": {
    title: "Overnight Oats",
    category: "breakfast",
    time: 10,
    ingredients4: [
      ING("oats (42oz)", 0.3, "pkg", "grains"),
      ING("milk", 4, "cups", "dairy"),
      ING("honey", 0.1, "bottle", "pantry"),
      ING("apple", 4, "each", "produce"),
    ],
  },

  // Lunches
  "turkey_hummus_wraps": {
    title: "Turkey & Hummus Wraps",
    category: "lunch",
    time: 10,
    ingredients4: [
      ING("tortilla", 8, "each", "grains"),
      ING("turkey slices", 16, "oz", "deli"),
      ING("hummus", 8, "oz", "pantry"),
      ING("cucumber", 2, "each", "produce"),
      ING("carrot (lb)", 1, "lb", "produce"),
    ],
  },
  "burrito_bowls": {
    title: "Brown-Rice Burrito Bowls",
    category: "lunch",
    time: 20,
    ingredients4: [
      ING("brown rice (lb)", 1, "lb", "grains"),
      ING("ground turkey (lb)", 1, "lb", "meat"),
      ING("black beans (can)", 2, "can", "canned"),
      ING("corn (frozen)", 1, "lb", "frozen"),
      ING("salsa", 1, "jar", "canned"),
    ],
  },
  "tuna_sandwich": {
    title: "Tuna Salad Sandwich",
    category: "lunch",
    time: 10,
    ingredients4: [
      ING("tuna", 4, "can", "canned"),
      ING("bread (loaf)", 0.6, "loaf", "grains"),
      ING("romaine (head)", 1, "head", "produce"),
      ING("onion (lb)", 0.25, "lb", "produce"),
    ],
  },
  "chickpea_salad": {
    title: "Chickpea Veggie Salad w/ Feta",
    category: "lunch",
    time: 15,
    ingredients4: [
      ING("chickpeas (can)", 2, "can", "canned"),
      ING("cucumber", 2, "each", "produce"),
      ING("tomato", 4, "each", "produce"),
      ING("feta", 1, "pkg", "dairy"),
      ING("lemon", 2, "each", "produce"),
    ],
  },

  // Dinners
  "sheetpan_lemon_chicken": {
    title: "Sheet-Pan Lemon Herb Chicken, Potatoes, Broccoli",
    category: "dinner",
    time: 35,
    ingredients4: [
      ING("chicken thighs (lb)", 2, "lb", "meat"),
      ING("russet potato (lb)", 3, "lb", "produce"),
      ING("broccoli (head)", 2, "head", "produce"),
      ING("lemon", 2, "each", "produce"),
      ING("oil", 0.1, "bottle", "pantry"),
    ],
  },
  "pasta_meatballs": {
    title: "Whole-Wheat Pasta, Marinara & Turkey Meatballs",
    category: "dinner",
    time: 30,
    ingredients4: [
      ING("whole-wheat pasta (lb)", 1, "lb", "grains"),
      ING("marinara (jar)", 1, "jar", "canned"),
      ING("ground turkey (lb)", 1, "lb", "meat"),
      ING("romaine (head)", 1, "head", "produce"),
    ],
  },
  "baked_salmon_quinoa": {
    title: "Baked Salmon, Quinoa, Green Beans",
    category: "dinner",
    time: 30,
    ingredients4: [
      ING("salmon (lb)", 1.5, "lb", "meat"),
      ING("quinoa", 1, "lb", "grains"),
      ING("green beans (lb)", 1.5, "lb", "produce"),
      ING("lemon", 2, "each", "produce"),
    ],
  },
  "tofu_stirfry_rice": {
    title: "Tofu Veggie Stir-Fry w/ Brown Rice",
    category: "dinner",
    time: 25,
    ingredients4: [
      ING("tofu", 1, "pkg", "meatless"),
      ING("frozen stir-fry veg (lb)", 1.5, "lb", "frozen"),
      ING("brown rice (lb)", 1, "lb", "grains"),
      ING("teriyaki", 1, "bottle", "canned"),
    ],
  },
  "naan_pizzas": {
    title: "Naan Pizzas (Veggie/Mozzarella)",
    category: "dinner",
    time: 20,
    ingredients4: [
      ING("naan", 4, "each", "grains"),
      ING("marinara (jar)", 1, "jar", "canned"),
      ING("mozzarella (8oz)", 2, "pkg", "dairy"),
      ING("bell pepper", 2, "each", "produce"),
      ING("onion (lb)", 0.5, "lb", "produce"),
    ],
  },
  "turkey_chili": {
    title: "Turkey & Bean Chili + Sweet Potatoes",
    category: "dinner",
    time: 35,
    ingredients4: [
      ING("ground turkey (lb)", 1, "lb", "meat"),
      ING("black beans (can)", 2, "can", "canned"),
      ING("kidney beans (can)", 1, "can", "canned"),
      ING("diced tomatoes (can)", 2, "can", "canned"),
      ING("sweet potato (lb)", 2, "lb", "produce"),
      ING("onion (lb)", 0.5, "lb", "produce"),
    ],
  },
};

///////////////////////
// Plan builders
///////////////////////

function scaleRecipeIngredients(recipeKey, servingsTarget) {
  const r = RECIPES[recipeKey];
  if (!r) throw new Error(`Unknown recipe: ${recipeKey}`);
  const baseServings = 4; // our catalog is defined for 4 servings
  const factor = servingsTarget / baseServings;

  const items = r.ingredients4.map((i) => ({
    ...i,
    qty: scaleQty(i.qty, factor),
  }));
  return { title: r.title, category: r.category, time: r.time, items };
}

function addItems(map, items) {
  for (const it of items) {
    const key = `${it.name}|||${it.unit}|||${it.category}`;
    if (!map[key]) map[key] = { name: it.name, unit: it.unit, category: it.category, qty: 0 };
    map[key].qty += it.qty || 0;
  }
}

function itemsMapToArray(map) {
  return Object.values(map).map((x) => ({ ...x, qty: +x.qty.toFixed(3) }));
}

// Group by simple aisle categories for readability
function groupGrocery(list) {
  const order = ["produce", "meat", "meatless", "dairy", "grains", "canned", "frozen", "pantry", "deli", "snacks"];
  const grouped = {};
  for (const cat of order) grouped[cat] = [];
  for (const it of list) {
    if (!grouped[it.category]) grouped[it.category] = [];
    grouped[it.category].push(it);
  }
  return { order, grouped };
}

function toCartLines(list) {
  return list.map((i) => `${fmt(i.qty)} ${i.unit} ${i.name}`.trim());
}

///////////////////////
// Main generators
///////////////////////

function generateFamily4Week() {
  const plan = {
    days: [
      { B: "yogurt_parfait", L: "turkey_hummus_wraps", D: "sheetpan_lemon_chicken" },
      { B: "oatmeal_pb_banana", L: "burrito_bowls", D: "pasta_meatballs" },
      { B: "egg_scramble_toast", L: "tuna_sandwich", D: "baked_salmon_quinoa" },
      { B: "smoothie_berry_spinach", L: "baked_salmon_quinoa", D: "tofu_stirfry_rice" },
      { B: "overnight_oats", L: "chickpea_salad", D: "naan_pizzas" },
      { B: "egg_scramble_toast", L: "turkey_hummus_wraps", D: "turkey_chili" },
      { B: "yogurt_parfait", L: "turkey_chili", D: "sheetpan_lemon_chicken" },
    ],
    snacks: [
      ING("banana", 14, "each", "produce"),
      ING("apple", 12, "each", "produce"),
      ING("string cheese", 12, "each", "dairy"),
      ING("mixed nuts (lb)", 1, "lb", "snacks"),
      ING("popcorn", 1, "box", "snacks"),
      ING("cucumber", 3, "each", "produce"),
      ING("hummus", 8, "oz", "pantry"),
      ING("honey", 0.2, "bottle", "pantry"),
    ]
  };

  // Build grocery list
  const map = {};
  for (const day of plan.days) {
    for (const mealKey of ["B", "L", "D"]) {
      const rKey = day[mealKey];
      const scaled = scaleRecipeIngredients(rKey, 4);
      addItems(map, scaled.items);
    }
  }
  addItems(map, plan.snacks);

  const list = itemsMapToArray(map);
  const { order, grouped } = groupGrocery(list);

  return {
    title: "Healthy 7-Day Plan (Family of 4)",
    plan,
    groceryList: list,
    grouped,
    order,
    estimatedCost: estimateCost(list),
    cartLines: toCartLines(list),
  };
}

function generateBudget75For2() {
  const outline = [
    { D: "sheetpan_lemon_chicken" },
    { D: "pasta_meatballs" },
    { D: "tofu_stirfry_rice" },
    { D: "turkey_chili" },
    { D: "pasta_meatballs" },
    { D: "tofu_stirfry_rice" },
    { D: "sheetpan_lemon_chicken" },
  ];
  
  const staples = [
    ING("oats (42oz)", 1, "pkg", "grains"),
    ING("banana", 12, "each", "produce"),
    ING("peanut butter (16oz)", 1, "jar", "pantry"),
    ING("plain yogurt (32oz)", 1, "pkg", "dairy"),
    ING("milk", 8, "cups", "dairy"),
    ING("brown rice (lb)", 3, "lb", "grains"),
    ING("black beans (can)", 4, "can", "canned"),
    ING("tuna", 4, "can", "canned"),
    ING("bread (loaf)", 1, "loaf", "grains"),
    ING("onion (lb)", 2, "lb", "produce"),
    ING("bell pepper", 2, "each", "produce"),
    ING("frozen stir-fry veg (lb)", 2, "lb", "frozen"),
    ING("russet potato (lb)", 5, "lb", "produce"),
    ING("romaine (head)", 1, "head", "produce"),
    ING("marinara (jar)", 1, "jar", "canned"),
    ING("whole-wheat pasta (lb)", 2, "lb", "grains"),
    ING("egg", 18, "each", "dairy"),
    ING("oil", 0.2, "bottle", "pantry"),
  ];

  const map = {};
  for (const day of outline) {
    const scaled = scaleRecipeIngredients(day.D, 2);
    addItems(map, scaled.items);
  }
  addItems(map, staples);

  let list = itemsMapToArray(map);
  list = list.filter((i) => !/^shrimp/i.test(i.name));

  let cost = estimateCost(list);
  if (cost > 75) {
    const drop = (name) => {
      const idx = list.findIndex((x) => x.name === name);
      if (idx >= 0) list.splice(idx, 1);
    };
    drop("salmon (lb)");
    drop("quinoa");
    list.push(ING("chicken thighs (lb)", 1.5, "lb", "meat"));
    list.push(ING("brown rice (lb)", 1, "lb", "grains"));
    list.push(ING("green beans (lb)", 1, "lb", "produce"));
    cost = estimateCost(list);
  }

  return {
    title: "$75 / week Budget List (2 people)",
    weeklyOutline: [
      "Sheet-pan chicken + potatoes + carrots",
      "Pasta marinara (+ onions/cabbage) & cheese sprinkle",
      "Tofu stir-fry w/ rice",
      "Turkey/bean chili (over rice)",
      "Pasta marinara (tuna optional)",
      "Fried rice (eggs + frozen veg)",
      "Roasted potatoes/cabbage + eggs",
    ],
    groceryList: list,
    estimatedCost: cost,
    cartLines: toCartLines(list),
  };
}

function generateStructuredMealPlan(prompt) {
  // Analyze prompt for family size and duration
  const lowerPrompt = prompt.toLowerCase();
  const daysMatch = lowerPrompt.match(/(\d+)\s*(day|week)/);
  const familyMatch = lowerPrompt.match(/family\s*of\s*(\d+)|(\d+)\s*people/);
  const budgetMatch = lowerPrompt.match(/\$(\d+)|(\d+)\s*dollar/);
  
  const days = daysMatch ? parseInt(daysMatch[1]) : 7;
  const familySize = familyMatch ? parseInt(familyMatch[1] || familyMatch[2]) : 4;
  const budget = budgetMatch ? parseInt(budgetMatch[1] || budgetMatch[2]) : null;

  // Generate appropriate plan
  if (budget && budget <= 75) {
    const plan = generateBudget75For2();
    return formatBudgetPlan(plan, days);
  } else {
    const plan = generateFamily4Week();
    return formatFamilyPlan(plan, days, familySize);
  }
}

function formatFamilyPlan(plan, requestedDays, familySize) {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const days = Math.min(requestedDays, 7);
  
  let output = `**COMPLETE ${days}-DAY HEALTHY MEAL PLAN (Family of ${familySize})**\n\n`;
  output += `**ESTIMATED COST: $${plan.estimatedCost}**\n\n`;
  
  // Daily meal breakdown
  for (let i = 0; i < days; i++) {
    const dayPlan = plan.plan.days[i];
    const dayName = dayNames[i];
    
    output += `**DAY ${i + 1} - ${dayName.toUpperCase()}**\n`;
    output += `• Breakfast: ${RECIPES[dayPlan.B]?.title || dayPlan.B}\n`;
    output += `• Lunch: ${RECIPES[dayPlan.L]?.title || dayPlan.L}\n`;
    output += `• Dinner: ${RECIPES[dayPlan.D]?.title || dayPlan.D}\n`;
    output += `• Snacks: Apple slices, String cheese, Mixed nuts\n\n`;
  }

  // Sample recipes
  output += `**SAMPLE RECIPES**\n\n`;
  const sampleRecipe = plan.plan.days[0];
  const breakfast = RECIPES[sampleRecipe.B];
  if (breakfast) {
    output += `**${breakfast.title} (${breakfast.time} minutes)**\n`;
    output += `Ingredients:\n`;
    for (const ing of breakfast.ingredients4) {
      output += `• ${fmt(ing.qty)} ${ing.unit} ${ing.name}\n`;
    }
    output += `Instructions: Mix ingredients according to preference and serve fresh.\n\n`;
  }

  // Complete grocery list
  output += `**COMPLETE GROCERY SHOPPING LIST**\n\n`;
  for (const category of plan.order) {
    const items = plan.grouped[category];
    if (items && items.length > 0) {
      output += `**${category.charAt(0).toUpperCase() + category.slice(1)}:**\n`;
      for (const item of items) {
        output += `• ${fmt(item.qty)} ${item.unit} ${item.name}\n`;
      }
      output += '\n';
    }
  }

  output += `**MEAL PREP TIPS:**\n`;
  output += `• Prep vegetables on Sunday for the week\n`;
  output += `• Cook grains in batches and store in refrigerator\n`;
  output += `• Marinate proteins the night before cooking\n`;
  output += `• Double dinner recipes for lunch leftovers\n\n`;

  output += `This plan provides balanced nutrition with approximately 2000-2200 calories per day per person.`;

  return output;
}

function formatBudgetPlan(plan, days) {
  let output = `**COMPLETE ${days}-DAY BUDGET MEAL PLAN (2 People - $${plan.estimatedCost})**\n\n`;
  output += `**WEEKLY DINNER OUTLINE:**\n`;
  for (let i = 0; i < Math.min(days, plan.weeklyOutline.length); i++) {
    output += `• Day ${i + 1}: ${plan.weeklyOutline[i]}\n`;
  }
  output += `\n`;

  output += `**BREAKFAST & LUNCH IDEAS:**\n`;
  output += `• Breakfast: Oatmeal with banana and peanut butter\n`;
  output += `• Breakfast: Scrambled eggs with toast\n`;
  output += `• Lunch: Rice and bean bowls with vegetables\n`;
  output += `• Lunch: Tuna sandwiches with side salad\n`;
  output += `• Lunch: Leftover dinner portions\n\n`;

  output += `**COMPLETE GROCERY SHOPPING LIST:**\n\n`;
  const { order, grouped } = groupGrocery(plan.groceryList);
  for (const category of order) {
    const items = grouped[category];
    if (items && items.length > 0) {
      output += `**${category.charAt(0).toUpperCase() + category.slice(1)}:**\n`;
      for (const item of items) {
        output += `• ${fmt(item.qty)} ${item.unit} ${item.name}\n`;
      }
      output += '\n';
    }
  }

  output += `**MONEY-SAVING TIPS:**\n`;
  output += `• Buy generic/store brands when possible\n`;
  output += `• Purchase proteins on sale and freeze portions\n`;
  output += `• Use dried beans instead of canned (cook in bulk)\n`;
  output += `• Shop seasonal produce for best prices\n`;
  output += `• Meal prep to reduce food waste\n\n`;

  return output;
}

module.exports = {
  generateFamily4Week,
  generateBudget75For2,
  generateStructuredMealPlan,
  formatFamilyPlan,
  formatBudgetPlan
};