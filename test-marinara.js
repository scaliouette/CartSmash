// Test script for Marinara Sauce parsing
const axios = require('axios');

async function testMarinaraSauce() {
  const apiUrl = process.env.API_URL || 'http://localhost:3059';

  const marinaraInput = `Marinara Sauce:
- 2 cans (28 oz each) crushed tomatoes
- 1/4 cup olive oil
- 6 cloves garlic, minced
- 1 onion, diced
- 1 tsp dried oregano
- 1 tsp dried basil
- 1/2 tsp red pepper flakes
- Salt and pepper to taste
- 2 tbsp fresh parsley, chopped`;

  try {
    console.log('🍝 Testing Marinara Sauce parsing...\n');
    console.log('Input text:\n', marinaraInput, '\n');

    const response = await axios.post(`${apiUrl}/api/cart/parse`, {
      listText: marinaraInput,
      action: 'merge',
      useAI: true,
      options: {
        mergeDuplicates: true,
        strictMode: true
      }
    });

    if (response.data.success) {
      console.log('✅ Parsing successful!\n');
      console.log('Parsed items:');
      response.data.parsedItems.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.productName}`);
        console.log(`   Quantity: ${item.quantity} ${item.unit}`);
        console.log(`   Category: ${item.category}`);
        console.log(`   Has Spoonacular Match: ${item.hasSpoonacularMatch}`);
        if (item.image_url) {
          console.log(`   Image: ${item.image_url}`);
        }
        if (item.price !== null && item.price !== undefined) {
          console.log(`   Price: $${item.price}`);
        }
        console.log(`   Confidence: ${(item.confidence * 100).toFixed(1)}%`);
      });

      console.log('\n📊 Parsing Statistics:');
      console.log(`   Total items: ${response.data.parsedItems.length}`);
      console.log(`   Items with Spoonacular data: ${response.data.parsedItems.filter(i => i.hasSpoonacularMatch).length}`);
      console.log(`   Items with prices: ${response.data.parsedItems.filter(i => i.price).length}`);
      console.log(`   Items with images: ${response.data.parsedItems.filter(i => i.image_url).length}`);

    } else {
      console.error('❌ Parsing failed:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Error testing Marinara Sauce:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testMarinaraSauce();