// server/routes/unifiedRoutes.js
// Unified Recipe System API - maintains compatibility while standardizing data structure

const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const API_ROOT = process.env.API_ROOT || `http://localhost:${process.env.PORT || 3001}`;

// --- Unified Data Structure Helpers ---
const toMinutes = (v) => {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const m = String(v).match(/(\d+)\s*min/gi);
  return m ? parseInt(m[0]) : null;
};

const toUnified = (r) => ({
  id: r.id || `recipe_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
  title: r.title || r.name || 'Untitled Recipe',
  description: r.description || '',
  icon: r.icon || '🍳',
  mealType: r.mealType || r.type || 'meal',
  ingredients: (r.ingredients || []).map(x => {
    if (typeof x === 'string') {
      return {
        quantity: null, unit: null, item: x.replace(/^[-*•]\s*/, ''), original: x
      };
    }
    return x;
  }),
  instructions: r.instructions || r.steps || [],
  prepTime: toMinutes(r.prepTime) ?? r.prepTime ?? null,
  cookTime: toMinutes(r.cookTime) ?? r.cookTime ?? null,
  totalTime: toMinutes(r.totalTime) ?? r.totalTime ?? null,
  servings: r.servings ?? null,
  difficulty: r.difficulty || null,
  nutrition: r.nutrition || {},
  tags: r.tags || [],
  source: r.source || 'unified',
  sourceUrl: r.sourceUrl || r.url || null,
  imageUrl: r.imageUrl || null,
  dayAssigned: r.dayAssigned || r.day || null,
  mealTypePlanning: r.mealTypePlanning || r.mealType || null,
  createdAt: r.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// --- POST /api/unified/import-recipe ---
router.post('/import-recipe', async (req, res) => {
  try {
    const { source, data, userId } = req.body || {};
    
    if (source === 'url' && data?.url) {
      const r = await fetch(`${API_ROOT}/api/recipes/import-url`, {
        method: 'POST', 
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ url: data.url, userId })
      });
      const j = await r.json();
      const unified = Array.isArray(j?.recipes) ? j.recipes.map(toUnified)
                   : j?.recipe ? [toUnified(j.recipe)] : [];
      return res.json({ success:true, recipes: unified, raw: j });
    }
    
    if ((source === 'ai-text' || source === 'ai-meal-plan') && data?.text) {
      const r = await fetch(`${API_ROOT}/api/ai-meal-plan/parse-meal-plan`, {
        method: 'POST', 
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ aiResponse: data.text })
      });
      
      if (!r.ok) {
        throw new Error(`AI parsing failed: ${r.statusText}`);
      }
      
      const j = await r.json();
      
      if (!j.success || !j.mealPlan) {
        throw new Error('AI parsing returned no valid meal plan');
      }
      
      const recipes = (j?.mealPlan?.recipes || []).map(toUnified);
      return res.json({ success:true, recipes, mealPlan: j?.mealPlan || null });
    }
    
    return res.status(400).json({ success:false, error:'Invalid payload' });
  } catch (e) {
    console.error('Error in unified import:', e);
    res.status(500).json({ success:false, error: String(e) });
  }
});

// --- POST /api/unified/batch-import ---
router.post('/batch-import', async (req, res) => {
  try {
    const { items = [], userId } = req.body || {};
    const results = await Promise.all(items.map(async (it) => {
      try {
        if (it.type === 'url' && it.url) {
          const r = await fetch(`${API_ROOT}/api/recipes/import-url`, {
            method: 'POST', 
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ url: it.url, userId })
          });
          const j = await r.json();
          const list = Array.isArray(j?.recipes) ? j.recipes : (j?.recipe ? [j.recipe] : []);
          return { ok:true, recipes: list.map(toUnified) };
        }
        if (it.type === 'ai' && it.text) {
          const r = await fetch(`${API_ROOT}/api/ai-meal-plan/parse-meal-plan`, {
            method: 'POST', 
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ aiResponse: it.text })
          });
          
          if (!r.ok) {
            return { ok:false, error:`AI parsing failed: ${r.statusText}` };
          }
          
          const j = await r.json();
          
          if (!j.success || !j.mealPlan) {
            return { ok:false, error:'AI parsing returned no valid meal plan' };
          }
          
          const list = (j?.mealPlan?.recipes || []).map(toUnified);
          return { ok:true, recipes: list };
        }
        return { ok:false, error:'Skipped: invalid item' };
      } catch (e) {
        return { ok:false, error:String(e) };
      }
    }));
    const recipes = results.flatMap(r => r.ok ? r.recipes : []);
    res.json({ success:true, count: recipes.length, recipes, results });
  } catch (e) {
    console.error('Error in batch import:', e);
    res.status(500).json({ success:false, error: String(e) });
  }
});

// --- POST /api/unified/validate ---
router.post('/validate', async (req, res) => {
  try {
    const { source, data } = req.body || {};
    
    if (source === 'url' && data?.url) {
      const r = await fetch(`${API_ROOT}/api/recipes/validate-url`, {
        method: 'POST', 
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ url: data.url })
      });
      const j = await r.json();
      return res.json({ success: !!j?.valid, details: j });
    }
    
    if (source === 'ai-text' && data?.text) {
      // lightweight parse check
      const r = await fetch(`${API_ROOT}/api/ai-meal-plan/parse-meal-plan`, {
        method: 'POST', 
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ aiResponse: data.text, quick: true })
      });
      const j = await r.json();
      return res.json({ success: !!j?.success, details: j?.mealPlan || null });
    }
    
    return res.status(400).json({ success:false, error:'Invalid payload' });
  } catch (e) {
    console.error('Error in validation:', e);
    res.status(500).json({ success:false, error: String(e) });
  }
});

// Recipe format converter endpoint
router.post('/convert-format', async (req, res) => {
  try {
    const { recipe, targetFormat } = req.body;

    let converted;
    switch (targetFormat) {
      case 'cartsmash':
        // Already in CartSmash format
        converted = recipe;
        break;

      case 'schema.org':
        // Convert to Schema.org Recipe format
        converted = {
          '@context': 'https://schema.org/',
          '@type': 'Recipe',
          name: recipe.title,
          description: recipe.description,
          prepTime: `PT${recipe.prepTime}M`,
          cookTime: `PT${recipe.cookTime}M`,
          totalTime: `PT${recipe.totalTime}M`,
          recipeYield: recipe.servings,
          recipeIngredient: recipe.ingredients.map(i => i.original || `${i.quantity} ${i.unit} ${i.item}`),
          recipeInstructions: recipe.instructions.map(i => ({
            '@type': 'HowToStep',
            text: i.instruction
          })),
          nutrition: {
            '@type': 'NutritionInformation',
            calories: recipe.nutrition.calories,
            proteinContent: recipe.nutrition.protein,
            carbohydrateContent: recipe.nutrition.carbs,
            fatContent: recipe.nutrition.fat
          }
        };
        break;

      case 'markdown':
        // Convert to Markdown format
        converted = `# ${recipe.title}\n\n` +
          `${recipe.description}\n\n` +
          `**Prep Time:** ${recipe.prepTime} min | **Cook Time:** ${recipe.cookTime} min | **Servings:** ${recipe.servings}\n\n` +
          `## Ingredients\n\n` +
          recipe.ingredients.map(i => `- ${i.original || `${i.quantity} ${i.unit} ${i.item}`}`).join('\n') +
          `\n\n## Instructions\n\n` +
          recipe.instructions.map((i, idx) => `${idx + 1}. ${i.instruction}`).join('\n') +
          `\n\n## Nutrition\n\n` +
          `- Calories: ${recipe.nutrition.calories}\n` +
          `- Protein: ${recipe.nutrition.protein}g\n` +
          `- Carbs: ${recipe.nutrition.carbs}g\n` +
          `- Fat: ${recipe.nutrition.fat}g`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid target format'
        });
    }

    res.json({
      success: true,
      format: targetFormat,
      converted: converted
    });

  } catch (error) {
    console.error('Error in format conversion:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;