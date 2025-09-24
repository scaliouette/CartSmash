#!/usr/bin/env node
// Debug Apollo GraphQL state parsing for production cart fix
// Tests real Apollo state extraction from recipe pages

const https = require('https');
const cheerio = require('cheerio');

const RECIPE_URL = 'https://customers.dev.instacart.tools/store/recipes/8090034';

console.log('🔍 APOLLO STATE PARSING DEBUG');
console.log(`Testing: ${RECIPE_URL}`);
console.log('');

// Helper function to make HTTPS requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const options = {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.end();
  });
}

// Confidence calculation function (copied from production)
function calculateMatchConfidence(searchTerm, productName) {
  if (!searchTerm || !productName || typeof searchTerm !== 'string' || typeof productName !== 'string') {
    return 0;
  }

  const search = searchTerm.toLowerCase().trim();
  const product = productName.toLowerCase().trim();

  // Exact match
  if (search === product) return 0.95;

  // One contains the other
  if (search.includes(product) || product.includes(search)) return 0.85;

  // Word-based matching
  const searchWords = search.split(/\s+/).filter(word => word.length > 2);
  const productWords = product.split(/\s+/).filter(word => word.length > 2);

  let matchingWords = 0;
  searchWords.forEach(searchWord => {
    productWords.forEach(productWord => {
      if (searchWord === productWord || searchWord.includes(productWord) || productWord.includes(searchWord)) {
        matchingWords++;
      }
    });
  });

  const maxWords = Math.max(searchWords.length, productWords.length);
  return maxWords > 0 ? (matchingWords / maxWords) * 0.8 : 0;
}

async function debugApolloStateExtraction() {
  try {
    console.log('1️⃣ Fetching recipe page HTML...');
    const response = await makeRequest(RECIPE_URL);

    if (response.status !== 200) {
      console.log(`❌ HTTP Error: ${response.status}`);
      return;
    }

    if (!response.body || response.body.length < 1000) {
      console.log(`❌ HTML too short: ${response.body.length} characters`);
      return;
    }

    console.log(`✅ HTML loaded: ${response.body.length} characters`);

    console.log('2️⃣ Loading HTML with Cheerio...');
    const $ = cheerio.load(response.body);

    console.log('3️⃣ Searching for Apollo state scripts...');
    let foundApolloScript = false;
    let apolloData = null;
    let extractedProducts = [];

    $('script').each((i, elem) => {
      const scriptContent = $(elem).html();
      if (scriptContent && scriptContent.includes('window.__APOLLO_STATE__')) {
        foundApolloScript = true;
        console.log('✅ Found Apollo GraphQL state script');
        console.log(`   Script length: ${scriptContent.length} characters`);

        try {
          // Extract the Apollo state
          const apolloMatch = scriptContent.match(/window\.__APOLLO_STATE__\s*=\s*({.*?});/s);
          if (apolloMatch) {
            console.log('✅ Regex matched Apollo state');
            apolloData = JSON.parse(apolloMatch[1]);
            console.log(`   Apollo object keys: ${Object.keys(apolloData).length}`);

            // Show first few keys for debugging
            const keys = Object.keys(apolloData).slice(0, 10);
            console.log(`   Sample keys: ${keys.join(', ')}`);

            // Extract products from Apollo state
            let productCount = 0;
            Object.keys(apolloData).forEach(key => {
              const obj = apolloData[key];
              if (obj && typeof obj === 'object' && (obj.name || obj.displayName)) {
                const productName = obj.name || obj.displayName || obj.title;
                const price = obj.price || obj.currentPrice || obj.regularPrice || 0;
                const imageUrl = obj.imageUrl || obj.image || obj.thumbnail;
                const size = obj.size || obj.packageSize || obj.volume;

                if (productName && typeof productName === 'string' && productName.length > 2) {
                  const confidence = calculateMatchConfidence('cheese tortellini', productName);
                  productCount++;
                  if (confidence > 0.4) {
                    extractedProducts.push({
                      id: `apollo_${extractedProducts.length}`,
                      name: productName,
                      price: typeof price === 'number' ? price : parseFloat(String(price).replace(/[^0-9.]/g, '')) || 0,
                      image_url: imageUrl,
                      package_size: size,
                      brand: obj.brand || 'Instacart',
                      availability: obj.availability === false ? 'out_of_stock' : 'in_stock',
                      confidence: confidence
                    });
                  }
                }
              }
            });

            console.log(`   Products found in Apollo: ${productCount}`);
            console.log(`   Products with good confidence: ${extractedProducts.length}`);

          } else {
            console.log('❌ Apollo state regex failed to match');
          }
        } catch (parseError) {
          console.log('❌ Apollo state JSON parsing failed:', parseError.message);
        }
      }
    });

    if (!foundApolloScript) {
      console.log('❌ No Apollo GraphQL state script found');
    }

    console.log('4️⃣ EXTRACTION RESULTS:');
    console.log(`   Apollo state found: ${foundApolloScript}`);
    console.log(`   Products extracted: ${extractedProducts.length}`);

    if (extractedProducts.length > 0) {
      console.log('   Sample products:');
      extractedProducts.slice(0, 3).forEach((product, i) => {
        console.log(`     ${i + 1}. ${product.name}`);
        console.log(`        Price: $${product.price}`);
        console.log(`        Image: ${product.image_url ? 'Yes' : 'No'}`);
        console.log(`        Confidence: ${product.confidence.toFixed(2)}`);
      });
    } else {
      console.log('   ❌ No products extracted from Apollo state');
    }

    // Also try some basic CSS selectors as fallback test
    console.log('5️⃣ Testing CSS selector fallback...');
    let cssProducts = 0;
    const selectors = [
      '[data-testid*="product"]',
      '.product-item',
      '[class*="product"]',
      '[data-testid*="ingredient"]',
      'article',
      '.item'
    ];

    selectors.forEach(selector => {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`   Found ${elements.length} elements matching '${selector}'`);
        cssProducts += elements.length;
      }
    });

    console.log(`   Total CSS elements found: ${cssProducts}`);

    return { apolloFound: foundApolloScript, productsExtracted: extractedProducts.length, cssElements: cssProducts };

  } catch (error) {
    console.log('❌ Debug failed:', error.message);
    return null;
  }
}

// Run the debug
debugApolloStateExtraction().then(result => {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 APOLLO PARSING DEBUG COMPLETE');
  if (result) {
    console.log(`Apollo State: ${result.apolloFound ? '✅ Found' : '❌ Missing'}`);
    console.log(`Products: ${result.productsExtracted} extracted`);
    console.log(`CSS Elements: ${result.cssElements} found`);
  }
  console.log('='.repeat(60));
}).catch(console.error);