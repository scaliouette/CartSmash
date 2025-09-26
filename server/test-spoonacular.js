// Quick test script for Spoonacular API
require('dotenv').config();
const axios = require('axios');

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || '8d19259c6b764d38b6cc0b72396131ae';

async function testSpoonacular() {
  console.log('🧪 Testing Spoonacular API...');
  console.log('API Key:', SPOONACULAR_API_KEY.substring(0, 8) + '...');

  try {
    // Test 1: Search for a common product
    console.log('\n📦 Test 1: Searching for "milk"...');
    const searchResponse = await axios.get('https://api.spoonacular.com/food/products/search', {
      params: {
        apiKey: SPOONACULAR_API_KEY,
        query: 'milk',
        number: 3
      }
    });

    console.log(`✅ Found ${searchResponse.data.totalProducts} total products`);
    console.log('First 3 products:');
    searchResponse.data.products.forEach(product => {
      console.log(`  - ${product.title} (${product.id})`);
      console.log(`    Image: ${product.image ? '✅' : '❌'}`);
      console.log(`    Brand: ${product.brand || 'Generic'}`);
    });

    // Test 2: Get API quota
    console.log('\n📊 Test 2: Checking API Quota...');
    const quotaResponse = await axios.get('https://api.spoonacular.com/food/products/search', {
      params: {
        apiKey: SPOONACULAR_API_KEY,
        query: 'test',
        number: 1
      }
    });

    const quotaUsed = quotaResponse.headers['x-api-quota-used'];
    const quotaLeft = quotaResponse.headers['x-api-quota-left'];
    console.log(`✅ Quota Used Today: ${quotaUsed || 'Unknown'}`);
    console.log(`✅ Quota Remaining: ${quotaLeft || 'Unknown'}`);

    // Test 3: Search for ingredients
    console.log('\n🥕 Test 3: Searching for ingredient "tomato"...');
    const ingredientResponse = await axios.get('https://api.spoonacular.com/food/ingredients/search', {
      params: {
        apiKey: SPOONACULAR_API_KEY,
        query: 'tomato',
        number: 2
      }
    });

    console.log(`✅ Found ${ingredientResponse.data.totalResults} ingredients`);
    ingredientResponse.data.results.forEach(ing => {
      console.log(`  - ${ing.name}`);
      console.log(`    Image: https://spoonacular.com/cdn/ingredients_500x500/${ing.image}`);
    });

    console.log('\n🎉 All tests passed! Spoonacular API is working correctly.');
    console.log('✅ Your API key is valid and functional.');

  } catch (error) {
    console.error('\n❌ Error testing Spoonacular API:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data?.message || error.message);

      if (error.response.status === 401) {
        console.error('🔑 API Key is invalid. Please check your key.');
      } else if (error.response.status === 402) {
        console.error('💳 API quota exceeded. You may need to upgrade your plan.');
      }
    } else {
      console.error('Error:', error.message);
    }
  }
}

testSpoonacular();