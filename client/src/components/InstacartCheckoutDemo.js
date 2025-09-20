// client/src/components/InstacartCheckoutDemo.js
// Demo component to test the new Instacart checkout system

import React, { useState } from 'react';
import InstacartCheckout from './InstacartCheckout';
import InstacartCheckoutEnhanced from './InstacartCheckoutEnhanced';
import RecipeInstacartIntegration from './RecipeInstacartIntegration';
import { InstacartCheckoutProvider } from '../contexts/InstacartCheckoutContext';
import { safeRender } from '../utils/safeRender';
import './InstacartCheckoutDemo.css';

const InstacartCheckoutDemo = ({ onClose }) => {
  const [showCheckout, setShowCheckout] = useState(false);
  const [showEnhancedCheckout, setShowEnhancedCheckout] = useState(false);
  const [showRecipeIntegration, setShowRecipeIntegration] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState('cart');
  const [demoItems, setDemoItems] = useState([]);
  const [demoRecipe, setDemoRecipe] = useState(null);

  // ============ DEMO DATA ============

  const sampleCartItems = [
    {
      id: 'item_1',
      productName: 'Organic Bananas',
      quantity: 6,
      unit: 'each',
      category: 'produce',
      price: 0.68,
      confidence: 0.9
    },
    {
      id: 'item_2',
      productName: 'Whole Milk',
      quantity: 1,
      unit: 'gallon',
      category: 'dairy',
      price: 3.99,
      confidence: 0.85
    },
    {
      id: 'item_3',
      productName: 'Bread',
      quantity: 2,
      unit: 'loaf',
      category: 'bakery',
      price: 2.49,
      confidence: 0.8
    },
    {
      id: 'item_4',
      productName: 'Chicken Breast',
      quantity: 2,
      unit: 'lb',
      category: 'meat',
      price: 6.99,
      confidence: 0.75
    },
    {
      id: 'item_5',
      productName: 'Roma Tomatoes',
      quantity: 3,
      unit: 'lb',
      category: 'produce',
      price: 2.99,
      confidence: 0.9
    },
    {
      id: 'item_6',
      productName: 'Organic Avocados',
      quantity: 4,
      unit: 'each',
      category: 'produce',
      price: 1.49,
      confidence: 0.95
    },
    {
      id: 'item_7',
      productName: 'Greek Yogurt',
      quantity: 1,
      unit: 'container',
      category: 'dairy',
      price: 4.99,
      confidence: 0.8
    },
    {
      id: 'item_8',
      productName: 'Quinoa',
      quantity: 1,
      unit: 'bag',
      category: 'grains',
      price: 5.99,
      confidence: 0.7
    }
  ];

  const sampleRecipe = {
    id: 'recipe_demo_1',
    title: 'Chicken Caprese Salad',
    author: 'CartSmash Chef',
    servings: 4,
    cookingTime: 25,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&h=500&fit=crop',
    instructions: [
      'Season chicken breasts with salt, pepper, and Italian herbs',
      'Heat olive oil in a large skillet over medium-high heat',
      'Cook chicken for 6-7 minutes per side until golden brown and cooked through',
      'Let chicken rest for 5 minutes, then slice into strips',
      'Arrange mixed greens on serving plates',
      'Top with sliced chicken, fresh mozzarella, and cherry tomatoes',
      'Drizzle with balsamic glaze and olive oil',
      'Garnish with fresh basil leaves and serve immediately'
    ],
    ingredients: [
      '2 lb boneless chicken breasts',
      '8 oz fresh mozzarella, sliced',
      '2 cups cherry tomatoes, halved',
      '6 cups mixed salad greens',
      '1/4 cup fresh basil leaves',
      '3 tbsp extra virgin olive oil',
      '2 tbsp balsamic glaze',
      '1 tsp Italian seasoning',
      'Salt and pepper to taste'
    ],
    dietaryRestrictions: ['GLUTEN_FREE']
  };


  // ============ EVENT HANDLERS ============

  const handleStartCheckout = (items, mode = 'cart') => {
    setDemoItems(items);
    setCheckoutMode(mode);
    setShowCheckout(true);
  };

  const handleStartRecipeIntegration = (recipe, mode = 'recipe') => {
    setDemoRecipe(recipe);
    setCheckoutMode(mode);
    setShowRecipeIntegration(true);
  };

  const handleStartEnhancedCheckout = (items, mode = 'recipe') => {
    setDemoItems(items);
    setCheckoutMode(mode);
    setShowEnhancedCheckout(true);
  };

  const handleCheckoutSuccess = (result) => {
    console.log('✅ Checkout completed successfully:', result);
    alert(`Checkout successful! Cart ID: ${result.cartId || 'N/A'}`);
    setShowCheckout(false);
  };

  const handleCheckoutError = (error) => {
    console.error('❌ Checkout failed:', error);
    alert(`Checkout failed: ${error.message}`);
  };

  const handleRecipeSuccess = (result) => {
    console.log('✅ Recipe integration successful:', result);
    alert(`${result.type === 'recipe' ? 'Recipe' : 'Shopping list'} created successfully!`);
    setShowRecipeIntegration(false);
  };

  const handleRecipeError = (error) => {
    console.error('❌ Recipe integration failed:', error);
    alert(`Recipe integration failed: ${error.message}`);
  };

  // ============ RENDER HELPERS ============

  const renderDemoSection = (title, description, items, onAction, actionText = 'Start Checkout') => (
    <div className="demo-section">
      <h3>{title}</h3>
      <p>{description}</p>

      <div className="demo-items">
        {items.map(item => (
          <div key={item.id} className="demo-item">
            <span className="item-name">{item.productName || item.name}</span>
            <span className="item-details">
              {item.quantity} {item.unit} - ${item.price}
            </span>
            <span className={`confidence ${item.confidence >= 0.8 ? 'high' : item.confidence >= 0.6 ? 'medium' : 'low'}`}>
              {Math.round(item.confidence * 100)}%
            </span>
          </div>
        ))}
      </div>

      <div className="demo-actions">
        <button className="btn-primary" onClick={() => onAction(items, 'cart')}>
          {actionText}
        </button>
        <button className="btn-secondary" onClick={() => onAction(items, 'shopping-list')}>
          As Shopping List
        </button>
      </div>
    </div>
  );

  const renderRecipeSection = (recipe, onAction) => (
    <div className="demo-section recipe-section">
      <h3>Recipe: {recipe.title}</h3>
      <div className="recipe-preview">
        <div className="recipe-meta">
          <span>👨‍🍳 {recipe.author}</span>
          <span>🍽️ {recipe.servings} servings</span>
          <span>⏱️ {recipe.cookingTime} minutes</span>
        </div>

        <div className="recipe-ingredients">
          <h4>Ingredients ({recipe.ingredients.length})</h4>
          <div className="ingredients-grid">
            {recipe.ingredients.slice(0, 6).map((ingredient, index) => (
              <div key={index} className="ingredient-item">
                {safeRender(ingredient, 'Unknown ingredient')}
              </div>
            ))}
            {recipe.ingredients.length > 6 && (
              <div className="ingredient-item more">+{recipe.ingredients.length - 6} more</div>
            )}
          </div>
        </div>
      </div>

      <div className="demo-actions">
        <button className="btn-primary" onClick={() => onAction(recipe, 'recipe')}>
          Create Recipe Page
        </button>
        <button className="btn-secondary" onClick={() => onAction(recipe, 'shopping-list')}>
          Create Shopping List
        </button>
      </div>
    </div>
  );

  // ============ MAIN RENDER ============

  return (
    <InstacartCheckoutProvider>
      <div className="instacart-checkout-demo">
        <div className="demo-header">
          <div className="demo-header-content">
            <h1>🛒 Instacart Checkout System Demo</h1>
            <p>Test the new Instacart-based checkout system with sample data</p>
          </div>
          {onClose && (
            <button className="demo-close-btn" onClick={onClose} title="Close Demo">
              ✕
            </button>
          )}
        </div>

        <div className="demo-grid">
          {renderDemoSection(
            "Cart Checkout Demo",
            "Mixed grocery items with varying confidence levels - ready for Instacart checkout",
            sampleCartItems,
            handleStartCheckout,
            "Checkout with Instacart"
          )}

          <div className="demo-section enhanced-section">
            <h3>🌟 Enhanced Recipe Checkout</h3>
            <p>New multi-step checkout flow with progress indicators and store comparison</p>

            <div className="demo-items">
              {sampleCartItems.slice(0, 4).map(item => (
                <div key={item.id} className="demo-item">
                  <span className="item-name">{item.productName}</span>
                  <span className="item-details">
                    {item.quantity} {item.unit} - ${item.price}
                  </span>
                  <span className="confidence high">
                    ✨ Enhanced
                  </span>
                </div>
              ))}
            </div>

            <div className="demo-actions">
              <button
                className="btn-enhanced"
                onClick={() => handleStartEnhancedCheckout(sampleCartItems, 'recipe')}
              >
                🚀 Try Enhanced Checkout
              </button>
            </div>

          </div>

          {renderRecipeSection(sampleRecipe, handleStartRecipeIntegration)}

          <div className="demo-section info-section">
            <h3>System Features</h3>
            <div className="features-grid">
              <div className="feature">
                <h4>🏪 Multi-Retailer Support</h4>
                <p>Choose from Safeway, Kroger, Whole Foods, and more</p>
              </div>
              <div className="feature">
                <h4>🔍 Smart Product Matching</h4>
                <p>AI-powered ingredient to product matching</p>
              </div>
              <div className="feature">
                <h4>📱 Mobile Optimized</h4>
                <p>Responsive design for all device sizes</p>
              </div>
              <div className="feature">
                <h4>🍳 Recipe Integration</h4>
                <p>Create recipe pages and shopping lists</p>
              </div>
              <div className="feature">
                <h4>💰 Price Estimation</h4>
                <p>Real-time cart total calculations</p>
              </div>
              <div className="feature">
                <h4>🔒 Secure Checkout</h4>
                <p>Official Instacart API integration</p>
              </div>
            </div>
          </div>

          <div className="demo-section api-section">
            <h3>API Integration Status</h3>
            <div className="api-status">
              <div className="status-item">
                <span className="status-dot success"></span>
                <span>Instacart Developer Platform API</span>
              </div>
              <div className="status-item">
                <span className="status-dot success"></span>
                <span>Retailer Discovery</span>
              </div>
              <div className="status-item">
                <span className="status-dot success"></span>
                <span>Product Search & Matching</span>
              </div>
              <div className="status-item">
                <span className="status-dot success"></span>
                <span>Cart Creation & Management</span>
              </div>
              <div className="status-item">
                <span className="status-dot success"></span>
                <span>Recipe Page Generation</span>
              </div>
              <div className="status-item">
                <span className="status-dot success"></span>
                <span>Shopping List Creation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Checkout Modal */}
        {showCheckout && (
          <InstacartCheckout
            items={demoItems}
            mode={checkoutMode}
            onClose={() => setShowCheckout(false)}
            onSuccess={handleCheckoutSuccess}
            onError={handleCheckoutError}
            initialLocation="95670"
          />
        )}

        {/* Recipe Integration Modal */}
        {showRecipeIntegration && (
          <RecipeInstacartIntegration
            recipe={demoRecipe}
            mode={checkoutMode}
            onSuccess={handleRecipeSuccess}
            onError={handleRecipeError}
            onClose={() => setShowRecipeIntegration(false)}
          />
        )}

        {/* Enhanced Checkout Modal */}
        {showEnhancedCheckout && (
          <InstacartCheckoutEnhanced
            items={demoItems}
            mode={checkoutMode}
            onClose={() => setShowEnhancedCheckout(false)}
            initialLocation="95670"
          />
        )}
      </div>
    </InstacartCheckoutProvider>
  );
};

export default InstacartCheckoutDemo;