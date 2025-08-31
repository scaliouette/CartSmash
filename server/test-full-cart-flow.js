// Complete end-to-end test: User authentication → Token management → Cart operations → Item retrieval

const KrogerOrderService = require('./services/KrogerOrderService');
const TokenStore = require('./services/TokenStore');
require('dotenv').config();

class FullCartFlowTest {
  constructor() {
    this.kroger = new KrogerOrderService();
    this.testUserId = 'e2e-test-user-' + Date.now();
    this.testResults = [];
  }

  log(step, status, message, data = null) {
    const result = {
      step,
      status, // 'PASS', 'FAIL', 'SKIP', 'INFO'
      message,
      data,
      timestamp: new Date().toISOString()
    };
    this.testResults.push(result);
    
    const statusIcon = {
      'PASS': '✅',
      'FAIL': '❌', 
      'SKIP': '⏭️',
      'INFO': 'ℹ️'
    }[status] || '🔍';
    
    console.log(`${statusIcon} [${step}] ${message}`);
    if (data && typeof data === 'object') {
      console.log(`   Data:`, JSON.stringify(data, null, 2).substring(0, 300));
    }
  }

  async runCompleteTest() {
    console.log('🚀 COMPLETE END-TO-END CART FLOW TEST');
    console.log('=' .repeat(60));
    console.log(`Test User ID: ${this.testUserId}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log();

    try {
      // Initialize service
      await this.kroger.initialize();
      this.log('INIT', 'PASS', 'KrogerOrderService initialized');

      // Test 1: Service Configuration Verification
      await this.testServiceConfiguration();
      
      // Test 2: OAuth URL Generation
      await this.testOAuthURLGeneration();
      
      // Test 3: Client Credentials Authentication
      await this.testClientCredentialsAuth();
      
      // Test 4: Simulate User OAuth Flow (manual step)
      await this.testUserOAuthFlowSimulation();
      
      // Test 5: Token Storage and Retrieval
      await this.testTokenOperations();
      
      // Test 6: Cart Creation and Operations
      await this.testCartOperations();
      
      // Test 7: Item Search and Preparation
      await this.testItemSearchAndPreparation();
      
      // Test 8: Full Cart Workflow
      await this.testFullCartWorkflow();
      
      // Test 9: Cart Retrieval and Verification
      await this.testCartRetrievalAndVerification();
      
      // Test 10: Cleanup
      await this.cleanup();

    } catch (error) {
      this.log('ERROR', 'FAIL', `Test suite failed: ${error.message}`, error);
    }

    // Generate final report
    this.generateFinalReport();
  }

  async testServiceConfiguration() {
    this.log('CONFIG', 'INFO', 'Testing service configuration...');
    
    // Check environment variables
    const requiredEnvVars = ['KROGER_CLIENT_ID', 'KROGER_CLIENT_SECRET', 'KROGER_REDIRECT_URI', 'MONGODB_URI'];
    const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);
    
    if (missingEnvVars.length > 0) {
      this.log('CONFIG', 'FAIL', `Missing environment variables: ${missingEnvVars.join(', ')}`);
      return;
    }
    
    this.log('CONFIG', 'PASS', 'All required environment variables present');
    
    // Check scope configuration
    if (this.kroger.scopes.cart === 'cart.basic:rw') {
      this.log('CONFIG', 'PASS', 'Cart scope correctly set to cart.basic:rw');
    } else {
      this.log('CONFIG', 'FAIL', `Cart scope incorrect: ${this.kroger.scopes.cart}, expected: cart.basic:rw`);
    }
    
    // Check base URL
    this.log('CONFIG', 'INFO', `Using Kroger API base URL: ${this.kroger.baseURL}`);
  }

  async testOAuthURLGeneration() {
    this.log('OAUTH_URL', 'INFO', 'Testing OAuth URL generation...');
    
    try {
      const authResponse = this.kroger.getAuthURL(this.testUserId);
      const url = new URL(authResponse.authURL);
      const scope = url.searchParams.get('scope');
      
      if (scope && scope.includes('cart.basic:rw')) {
        this.log('OAUTH_URL', 'PASS', 'OAuth URL contains correct cart.basic:rw scope', { scope });
      } else {
        this.log('OAUTH_URL', 'FAIL', `OAuth URL missing cart.basic:rw scope. Found: ${scope}`);
      }
      
      // Verify other required parameters
      const requiredParams = ['client_id', 'redirect_uri', 'response_type', 'state'];
      const missingParams = requiredParams.filter(param => !url.searchParams.has(param));
      
      if (missingParams.length === 0) {
        this.log('OAUTH_URL', 'PASS', 'OAuth URL contains all required parameters');
      } else {
        this.log('OAUTH_URL', 'FAIL', `OAuth URL missing parameters: ${missingParams.join(', ')}`);
      }
      
    } catch (error) {
      this.log('OAUTH_URL', 'FAIL', `OAuth URL generation failed: ${error.message}`);
    }
  }

  async testClientCredentialsAuth() {
    this.log('CLIENT_AUTH', 'INFO', 'Testing client credentials authentication...');
    
    try {
      const tokenResponse = await this.kroger.getClientCredentialsToken();
      
      if (tokenResponse.accessToken) {
        this.log('CLIENT_AUTH', 'PASS', 'Client credentials token obtained');
        
        // Check scope
        if (tokenResponse.scope && tokenResponse.scope.includes('cart.basic:rw')) {
          this.log('CLIENT_AUTH', 'PASS', 'Client token has correct cart.basic:rw scope', { 
            scope: tokenResponse.scope 
          });
        } else {
          this.log('CLIENT_AUTH', 'FAIL', `Client token scope incorrect: ${tokenResponse.scope}`);
        }
      } else {
        this.log('CLIENT_AUTH', 'FAIL', 'No access token in client credentials response');
      }
      
    } catch (error) {
      this.log('CLIENT_AUTH', 'FAIL', `Client credentials auth failed: ${error.message}`, {
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }

  async testUserOAuthFlowSimulation() {
    this.log('USER_OAUTH', 'INFO', 'Simulating user OAuth flow...');
    
    // Since we can't actually complete OAuth in a test, we'll create a mock token
    // that simulates what would happen after successful OAuth
    const mockTokenData = {
      accessToken: 'mock_access_token_' + Date.now(),
      tokenType: 'Bearer',
      expiresAt: Date.now() + (3600 * 1000), // 1 hour from now
      scope: 'cart.basic:rw profile.compact'
    };
    
    try {
      await TokenStore.setTokens(this.testUserId, mockTokenData, 'mock_refresh_token');
      this.log('USER_OAUTH', 'PASS', 'Mock user token stored successfully');
      
      // Verify token was stored
      const retrievedToken = await TokenStore.getTokens(this.testUserId);
      if (retrievedToken && retrievedToken.accessToken === mockTokenData.accessToken) {
        this.log('USER_OAUTH', 'PASS', 'Mock token retrieval verified');
      } else {
        this.log('USER_OAUTH', 'FAIL', 'Mock token retrieval failed');
      }
      
    } catch (error) {
      this.log('USER_OAUTH', 'FAIL', `Mock OAuth simulation failed: ${error.message}`);
    }
  }

  async testTokenOperations() {
    this.log('TOKEN_OPS', 'INFO', 'Testing token operations...');
    
    try {
      // Test token validation
      const hasValidToken = await TokenStore.hasValidToken(this.testUserId);
      if (hasValidToken) {
        this.log('TOKEN_OPS', 'PASS', 'Token validation working');
      } else {
        this.log('TOKEN_OPS', 'FAIL', 'Token validation failed');
      }
      
      // Test authentication check
      const authCheck = await this.kroger.ensureUserAuth(this.testUserId);
      if (authCheck.authenticated) {
        this.log('TOKEN_OPS', 'PASS', 'User authentication check successful', {
          scope: authCheck.tokenInfo?.scope
        });
      } else {
        this.log('TOKEN_OPS', 'FAIL', `User authentication failed: ${authCheck.reason}`);
      }
      
    } catch (error) {
      this.log('TOKEN_OPS', 'FAIL', `Token operations failed: ${error.message}`);
    }
  }

  async testCartOperations() {
    this.log('CART_OPS', 'INFO', 'Testing basic cart operations...');
    
    try {
      // Test getting existing carts (should work even if no carts exist)
      this.log('CART_OPS', 'INFO', 'Testing GET /carts endpoint...');
      
      // Since we have mock tokens, we need to intercept the actual API call
      // Let's test with client credentials instead for real API testing
      try {
        const cartsResponse = await this.kroger.makeClientRequest('GET', '/carts');
        this.log('CART_OPS', 'PASS', 'GET /carts succeeded with client credentials', {
          cartsCount: cartsResponse.data?.length || 0
        });
      } catch (error) {
        if (error.response?.status === 403) {
          this.log('CART_OPS', 'FAIL', 'GET /carts still returning 403 - scope issue persists', {
            status: error.response.status,
            message: error.response.data?.message,
            errorCode: error.response.data?.errors?.code
          });
        } else {
          this.log('CART_OPS', 'FAIL', `GET /carts failed: ${error.message}`, {
            status: error.response?.status
          });
        }
      }
      
    } catch (error) {
      this.log('CART_OPS', 'FAIL', `Cart operations test failed: ${error.message}`);
    }
  }

  async testItemSearchAndPreparation() {
    this.log('ITEM_SEARCH', 'INFO', 'Testing product search and item preparation...');
    
    const testItems = [
      {
        productName: 'Bananas',
        quantity: 3
      },
      {
        productName: 'Milk',
        quantity: 1
      }
    ];
    
    try {
      // Test with client credentials since we can't use mock user token for real API calls
      this.log('ITEM_SEARCH', 'INFO', 'Testing product search with client credentials...');
      
      // Search for products using client credentials
      try {
        const searchResults = await this.kroger.makeClientRequest('GET', '/products?filter.term=banana&filter.limit=5');
        if (searchResults.data && searchResults.data.length > 0) {
          this.log('ITEM_SEARCH', 'PASS', 'Product search successful', {
            productsFound: searchResults.data.length,
            firstProduct: searchResults.data[0]?.description
          });
        } else {
          this.log('ITEM_SEARCH', 'FAIL', 'Product search returned no results');
        }
      } catch (searchError) {
        this.log('ITEM_SEARCH', 'FAIL', `Product search failed: ${searchError.message}`, {
          status: searchError.response?.status
        });
      }
      
    } catch (error) {
      this.log('ITEM_SEARCH', 'FAIL', `Item search test failed: ${error.message}`);
    }
  }

  async testFullCartWorkflow() {
    this.log('FULL_WORKFLOW', 'INFO', 'Testing complete cart workflow...');
    
    const testCartItems = [
      {
        upc: '0001111097139', // Use a known UPC from your previous tests
        quantity: 2,
        productName: 'Test Product'
      }
    ];
    
    try {
      // Test cart creation with client credentials (since we can't use mock tokens for real API calls)
      this.log('FULL_WORKFLOW', 'INFO', 'Testing cart creation with items...');
      
      try {
        const cartResponse = await this.kroger.makeClientRequest('POST', '/carts', {
          items: testCartItems.map(item => ({
            upc: item.upc,
            quantity: item.quantity,
            modality: 'PICKUP'
          }))
        });
        
        if (cartResponse.data || cartResponse.id) {
          this.log('FULL_WORKFLOW', 'PASS', 'Cart creation successful', {
            cartId: cartResponse.data?.id || cartResponse.id
          });
        } else {
          this.log('FULL_WORKFLOW', 'FAIL', 'Cart creation returned no cart ID');
        }
        
      } catch (cartError) {
        if (cartError.response?.status === 403) {
          this.log('FULL_WORKFLOW', 'FAIL', 'Cart creation still failing with 403 - SCOPE ISSUE NOT RESOLVED', {
            status: cartError.response.status,
            message: cartError.response.data?.message,
            errorCode: cartError.response.data?.errors?.code,
            expectedScope: cartError.response.data?.errors?.reason
          });
        } else {
          this.log('FULL_WORKFLOW', 'FAIL', `Cart creation failed: ${cartError.message}`, {
            status: cartError.response?.status,
            data: cartError.response?.data
          });
        }
      }
      
    } catch (error) {
      this.log('FULL_WORKFLOW', 'FAIL', `Full workflow test failed: ${error.message}`);
    }
  }

  async testCartRetrievalAndVerification() {
    this.log('CART_RETRIEVAL', 'INFO', 'Testing cart retrieval and verification...');
    
    try {
      // Test getting all carts
      const cartsResponse = await this.kroger.makeClientRequest('GET', '/carts');
      
      if (cartsResponse.data) {
        this.log('CART_RETRIEVAL', 'PASS', 'Cart retrieval successful', {
          cartsCount: cartsResponse.data.length
        });
        
        // If we have carts, test getting cart details
        if (cartsResponse.data.length > 0) {
          const cartId = cartsResponse.data[0].id;
          try {
            const cartDetails = await this.kroger.makeClientRequest('GET', `/carts/${cartId}`);
            this.log('CART_RETRIEVAL', 'PASS', 'Cart details retrieval successful', {
              itemsInCart: cartDetails.data?.items?.length || 0
            });
          } catch (detailError) {
            this.log('CART_RETRIEVAL', 'FAIL', `Cart details failed: ${detailError.message}`);
          }
        }
      } else {
        this.log('CART_RETRIEVAL', 'PASS', 'Cart retrieval successful (no carts found)');
      }
      
    } catch (error) {
      if (error.response?.status === 403) {
        this.log('CART_RETRIEVAL', 'FAIL', 'Cart retrieval failing with 403 - scope issue confirmed', {
          status: error.response.status,
          message: error.response.data?.message
        });
      } else {
        this.log('CART_RETRIEVAL', 'FAIL', `Cart retrieval failed: ${error.message}`);
      }
    }
  }

  async cleanup() {
    this.log('CLEANUP', 'INFO', 'Cleaning up test data...');
    
    try {
      // Remove test user token
      await TokenStore.deleteTokens(this.testUserId);
      this.log('CLEANUP', 'PASS', 'Test user token deleted');
    } catch (error) {
      this.log('CLEANUP', 'FAIL', `Cleanup failed: ${error.message}`);
    }
  }

  generateFinalReport() {
    console.log('\n📊 FINAL TEST REPORT');
    console.log('=' .repeat(60));
    
    const summary = {
      total: this.testResults.length,
      passed: this.testResults.filter(r => r.status === 'PASS').length,
      failed: this.testResults.filter(r => r.status === 'FAIL').length,
      skipped: this.testResults.filter(r => r.status === 'SKIP').length,
      info: this.testResults.filter(r => r.status === 'INFO').length
    };
    
    console.log(`Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⏭️  Skipped: ${summary.skipped}`);
    console.log(`ℹ️  Info: ${summary.info}`);
    console.log();
    
    // Show failed tests
    const failedTests = this.testResults.filter(r => r.status === 'FAIL');
    if (failedTests.length > 0) {
      console.log('❌ FAILED TESTS:');
      failedTests.forEach(test => {
        console.log(`   [${test.step}] ${test.message}`);
        if (test.data) {
          console.log(`       ${JSON.stringify(test.data).substring(0, 100)}...`);
        }
      });
      console.log();
    }
    
    // Overall assessment
    const criticalFails = failedTests.filter(t => 
      t.step.includes('CART') || t.step.includes('AUTH') || t.step.includes('CLIENT')
    );
    
    if (criticalFails.length === 0) {
      console.log('🎉 OVERALL: SUCCESS - Cart endpoints should now work!');
    } else {
      console.log('⚠️  OVERALL: ISSUES REMAIN - 403 errors may persist');
      console.log();
      console.log('🔧 RECOMMENDED ACTIONS:');
      console.log('1. Verify Kroger API credentials have cart.basic:rw scope permission');
      console.log('2. Check if your Kroger developer account has cart API access');
      console.log('3. Contact Kroger developer support about scope requirements');
      console.log('4. Consider using Partner API if Public API lacks cart.basic:rw');
    }
    
    // Success rate
    const successRate = summary.total > 0 ? ((summary.passed / (summary.passed + summary.failed)) * 100).toFixed(1) : 0;
    console.log(`\n📈 Success Rate: ${successRate}%`);
  }
}

// Run the complete test
async function runCompleteTest() {
  const testSuite = new FullCartFlowTest();
  await testSuite.runCompleteTest();
}

// Execute if run directly
if (require.main === module) {
  runCompleteTest().catch(error => {
    console.error('❌ Complete test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { FullCartFlowTest, runCompleteTest };