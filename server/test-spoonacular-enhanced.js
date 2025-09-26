// Test script for enhanced Spoonacular features
require('dotenv').config();
const axios = require('axios');

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || '8d19259c6b764d38b6cc0b72396131ae';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

async function testEnhancedFeatures() {
  console.log('🧪 Testing Enhanced Spoonacular Features...');
  console.log('API Key:', SPOONACULAR_API_KEY.substring(0, 8) + '...');
  console.log('Server URL:', SERVER_URL);
  console.log('');

  const results = {
    passed: [],
    failed: []
  };

  try {
    // Test 1: Recipe Search
    console.log('📖 Test 1: Recipe Search...');
    try {
      const recipeSearch = await axios.post(`${SERVER_URL}/api/spoonacular/recipes/search`, {
        query: 'pasta',
        diet: 'vegetarian',
        number: 3,
        addRecipeInformation: true,
        addRecipeNutrition: true
      });

      if (recipeSearch.data.success && recipeSearch.data.recipes) {
        console.log(`✅ Found ${recipeSearch.data.totalResults} recipes`);
        recipeSearch.data.recipes.forEach(recipe => {
          console.log(`  - ${recipe.title} (${recipe.id})`);
          console.log(`    Ready in: ${recipe.readyInMinutes} minutes`);
          console.log(`    Servings: ${recipe.servings}`);
        });
        results.passed.push('Recipe Search');
      } else {
        throw new Error('No recipes found');
      }
    } catch (error) {
      console.error('❌ Recipe search failed:', error.message);
      results.failed.push('Recipe Search');
    }

    // Test 2: Recipe by Ingredients
    console.log('\n🥘 Test 2: Find Recipes by Ingredients...');
    try {
      const byIngredients = await axios.post(`${SERVER_URL}/api/spoonacular/recipes/by-ingredients`, {
        ingredients: ['tomatoes', 'basil', 'mozzarella'],
        number: 2
      });

      if (byIngredients.data.success && byIngredients.data.recipes) {
        console.log(`✅ Found ${byIngredients.data.count} recipes using your ingredients`);
        byIngredients.data.recipes.forEach(recipe => {
          console.log(`  - ${recipe.title}`);
          console.log(`    Used: ${recipe.usedIngredientCount} | Missing: ${recipe.missedIngredientCount}`);
        });
        results.passed.push('Recipe by Ingredients');
      } else {
        throw new Error('No recipes found');
      }
    } catch (error) {
      console.error('❌ Recipe by ingredients failed:', error.message);
      results.failed.push('Recipe by Ingredients');
    }

    // Test 3: Recipe to Shopping List
    console.log('\n🛒 Test 3: Convert Recipe to Shopping List...');
    try {
      // First get a recipe ID
      const searchResult = await axios.post(`${SERVER_URL}/api/spoonacular/recipes/search`, {
        query: 'spaghetti',
        number: 1
      });

      if (searchResult.data.recipes && searchResult.data.recipes.length > 0) {
        const recipeId = searchResult.data.recipes[0].id;
        console.log(`  Using recipe ID: ${recipeId}`);

        const shoppingList = await axios.post(`${SERVER_URL}/api/spoonacular/recipes/${recipeId}/shopping-list`, {
          servings: 6
        });

        if (shoppingList.data.success && shoppingList.data.shoppingList) {
          console.log(`✅ Created shopping list for "${shoppingList.data.recipeTitle}"`);
          console.log(`  Adjusted from ${shoppingList.data.originalServings} to ${shoppingList.data.adjustedServings} servings`);
          console.log(`  Total items: ${shoppingList.data.shoppingList.length}`);

          // Show first 3 items
          shoppingList.data.shoppingList.slice(0, 3).forEach(item => {
            console.log(`  - ${item.amount} ${item.unit} ${item.name}`);
          });
          results.passed.push('Recipe to Shopping List');
        } else {
          throw new Error('Could not create shopping list');
        }
      } else {
        throw new Error('No recipe found to convert');
      }
    } catch (error) {
      console.error('❌ Recipe to shopping list failed:', error.message);
      results.failed.push('Recipe to Shopping List');
    }

    // Test 4: Shopping List Enrichment
    console.log('\n💎 Test 4: Enrich Shopping List...');
    try {
      const enrichResult = await axios.post(`${SERVER_URL}/api/spoonacular/shopping-list/enrich`, {
        items: [
          { name: 'organic milk', quantity: 1, unit: 'gallon' },
          { name: 'whole wheat bread' },
          { name: 'fresh tomatoes', quantity: 2, unit: 'lbs' }
        ]
      });

      if (enrichResult.data.success && enrichResult.data.items) {
        console.log(`✅ Enriched ${enrichResult.data.stats.enrichedCount} of ${enrichResult.data.stats.totalItems} items`);
        enrichResult.data.items.forEach(item => {
          if (item.enriched && item.enriched.id) {
            console.log(`  - ${item.enriched.name}`);
            console.log(`    Category: ${item.enriched.category || 'Unknown'}`);
            console.log(`    Aisle: ${item.enriched.aisle || 'Unknown'}`);
            if (item.enriched.nutrition) {
              const calories = item.enriched.nutrition.nutrients?.find(n => n.name === 'Calories');
              if (calories) {
                console.log(`    Calories: ${calories.amount} ${calories.unit}`);
              }
            }
          }
        });
        results.passed.push('Shopping List Enrichment');
      } else {
        throw new Error('Enrichment failed');
      }
    } catch (error) {
      console.error('❌ Shopping list enrichment failed:', error.message);
      results.failed.push('Shopping List Enrichment');
    }

    // Test 5: Product Classification
    console.log('\n🏷️ Test 5: Classify Products...');
    try {
      const classification = await axios.post(`${SERVER_URL}/api/spoonacular/products/classify`, {
        title: 'Organic Whole Milk'
      });

      if (classification.data.success && classification.data.classification) {
        console.log(`✅ Classified product: ${classification.data.classification.cleanTitle}`);
        console.log(`  Category: ${classification.data.classification.category}`);
        if (classification.data.classification.breadcrumbs) {
          console.log(`  Breadcrumbs: ${classification.data.classification.breadcrumbs.join(' > ')}`);
        }
        results.passed.push('Product Classification');
      } else {
        throw new Error('Classification failed');
      }
    } catch (error) {
      console.error('❌ Product classification failed:', error.message);
      results.failed.push('Product Classification');
    }

    // Test 6: Ingredient Substitutes
    console.log('\n🔄 Test 6: Get Ingredient Substitutes...');
    try {
      const substitutes = await axios.get(`${SERVER_URL}/api/spoonacular/ingredients/butter/substitutes`);

      if (substitutes.data.success && substitutes.data.substitutes) {
        console.log(`✅ Found substitutes for butter:`);
        substitutes.data.substitutes.forEach(sub => {
          console.log(`  - ${sub}`);
        });
        results.passed.push('Ingredient Substitutes');
      } else {
        throw new Error('No substitutes found');
      }
    } catch (error) {
      console.error('❌ Ingredient substitutes failed:', error.message);
      results.failed.push('Ingredient Substitutes');
    }

    // Test 7: Unit Conversion
    console.log('\n📏 Test 7: Convert Units...');
    try {
      const conversion = await axios.post(`${SERVER_URL}/api/spoonacular/convert`, {
        ingredientName: 'flour',
        sourceAmount: 2,
        sourceUnit: 'cups',
        targetUnit: 'grams'
      });

      if (conversion.data.success && conversion.data.targetAmount) {
        console.log(`✅ Conversion successful:`);
        console.log(`  ${conversion.data.sourceAmount} ${conversion.data.sourceUnit} = ${conversion.data.targetAmount} ${conversion.data.targetUnit}`);
        console.log(`  Answer: ${conversion.data.answer}`);
        results.passed.push('Unit Conversion');
      } else {
        throw new Error('Conversion failed');
      }
    } catch (error) {
      console.error('❌ Unit conversion failed:', error.message);
      results.failed.push('Unit Conversion');
    }

    // Test 8: Meal Plan Generation
    console.log('\n📅 Test 8: Generate Meal Plan...');
    try {
      const mealPlan = await axios.post(`${SERVER_URL}/api/spoonacular/meal-plan/generate`, {
        timeFrame: 'day',
        targetCalories: 2000,
        diet: 'balanced'
      });

      if (mealPlan.data.success && mealPlan.data.mealPlan) {
        console.log(`✅ Generated meal plan:`);
        console.log(`  Total nutrients:`);
        if (mealPlan.data.mealPlan.nutrients) {
          console.log(`    Calories: ${mealPlan.data.mealPlan.nutrients.calories}`);
          console.log(`    Protein: ${mealPlan.data.mealPlan.nutrients.protein}g`);
          console.log(`    Carbs: ${mealPlan.data.mealPlan.nutrients.carbohydrates}g`);
          console.log(`    Fat: ${mealPlan.data.mealPlan.nutrients.fat}g`);
        }
        results.passed.push('Meal Plan Generation');
      } else {
        throw new Error('Meal plan generation failed');
      }
    } catch (error) {
      console.error('❌ Meal plan generation failed:', error.message);
      results.failed.push('Meal Plan Generation');
    }

    // Test 9: Random Recipes
    console.log('\n🎲 Test 9: Get Random Recipes...');
    try {
      const randomRecipes = await axios.get(`${SERVER_URL}/api/spoonacular/recipes/random`, {
        params: {
          tags: 'vegetarian,dessert',
          number: 2
        }
      });

      if (randomRecipes.data.success && randomRecipes.data.recipes) {
        console.log(`✅ Found ${randomRecipes.data.count} random recipes:`);
        randomRecipes.data.recipes.forEach(recipe => {
          console.log(`  - ${recipe.title}`);
          console.log(`    Ready in: ${recipe.readyInMinutes} minutes`);
          console.log(`    Health Score: ${recipe.healthScore}/100`);
        });
        results.passed.push('Random Recipes');
      } else {
        throw new Error('No random recipes found');
      }
    } catch (error) {
      console.error('❌ Random recipes failed:', error.message);
      results.failed.push('Random Recipes');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed.length} tests`);
  if (results.passed.length > 0) {
    results.passed.forEach(test => console.log(`   - ${test}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length} tests`);
    results.failed.forEach(test => console.log(`   - ${test}`));
  }

  console.log('\n' + '='.repeat(60));

  if (results.failed.length === 0) {
    console.log('🎉 All enhanced Spoonacular features are working correctly!');
    console.log('✅ The API integration is ready for production use.');
  } else {
    console.log('⚠️ Some tests failed. Please review the errors above.');
    console.log('💡 Make sure the server is running and all endpoints are registered.');
  }
}

// Run tests
console.log('Starting enhanced Spoonacular feature tests...\n');
testEnhancedFeatures().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});