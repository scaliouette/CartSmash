// client/src/components/CheckoutDemo.js
// Demo page for the unified enhanced Instacart checkout

import React, { useState } from 'react';
import InstacartCheckoutUnified from './InstacartCheckoutUnified';

const CheckoutDemo = () => {
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState('recipe');
  const [customTitle, setCustomTitle] = useState('');

  // Sample items for different modes
  const sampleRecipeItems = [
    {
      id: '1',
      name: 'chicken breast',
      productName: 'Organic Chicken Breast',
      quantity: 1.5,
      unit: 'lb',
      price: 12.99,
      category: 'Meat & Seafood',
      brandFilters: ['Bell & Evans', 'Perdue'],
      healthFilters: ['ORGANIC', 'NO_ANTIBIOTICS']
    },
    {
      id: '2',
      name: 'olive oil',
      productName: 'Extra Virgin Olive Oil',
      quantity: 3,
      unit: 'tbsp',
      price: 8.99,
      category: 'Pantry',
      brandFilters: ['California Olive Ranch', 'Colavita'],
      healthFilters: ['ORGANIC']
    },
    {
      id: '3',
      name: 'garlic',
      productName: 'Fresh Garlic Cloves',
      quantity: 4,
      unit: 'cloves',
      price: 1.99,
      category: 'Produce',
      healthFilters: ['ORGANIC']
    },
    {
      id: '4',
      name: 'fresh thyme',
      productName: 'Organic Fresh Thyme',
      quantity: 2,
      unit: 'tsp',
      price: 2.99,
      category: 'Herbs & Spices',
      healthFilters: ['ORGANIC']
    },
    {
      id: '5',
      name: 'sea salt',
      productName: 'Himalayan Sea Salt',
      quantity: 1,
      unit: 'tsp',
      price: 4.99,
      category: 'Pantry',
      brandFilters: ['Morton', 'Diamond Crystal']
    },
    {
      id: '6',
      name: 'black pepper',
      productName: 'Fresh Ground Black Pepper',
      quantity: 0.5,
      unit: 'tsp',
      price: 3.99,
      category: 'Herbs & Spices',
      brandFilters: ['McCormick', 'Simply Organic'],
      healthFilters: ['ORGANIC']
    }
  ];

  const sampleCartItems = [
    {
      id: '1',
      name: 'bananas',
      productName: 'Organic Bananas',
      quantity: 6,
      unit: 'each',
      price: 2.99,
      category: 'Produce',
      brandFilters: ['Dole', 'Chiquita'],
      healthFilters: ['ORGANIC']
    },
    {
      id: '2',
      name: 'milk',
      productName: 'Organic Whole Milk',
      quantity: 1,
      unit: 'gallon',
      price: 4.99,
      category: 'Dairy & Eggs',
      brandFilters: ['Horizon', 'Organic Valley'],
      healthFilters: ['ORGANIC', 'GRASS_FED']
    },
    {
      id: '3',
      name: 'bread',
      productName: 'Artisan Sourdough Bread',
      quantity: 2,
      unit: 'loaf',
      price: 5.99,
      category: 'Bakery',
      brandFilters: ['Dave\'s Killer Bread', 'Pepperidge Farm'],
      healthFilters: ['WHOLE_GRAIN', 'NO_PRESERVATIVES']
    },
    {
      id: '4',
      name: 'greek yogurt',
      productName: 'Greek Yogurt Plain',
      quantity: 1,
      unit: 'container',
      price: 6.99,
      category: 'Dairy & Eggs',
      brandFilters: ['Chobani', 'Fage', 'Two Good'],
      healthFilters: ['LOW_FAT', 'NO_ADDED_SUGAR']
    }
  ];

  const sampleShoppingListItems = [
    {
      id: '1',
      name: 'apples',
      productName: 'Honeycrisp Apples',
      quantity: 3,
      unit: 'lb',
      price: 4.99,
      category: 'Produce',
      brandFilters: ['Stemilt', 'Washington State'],
      healthFilters: ['ORGANIC']
    },
    {
      id: '2',
      name: 'spinach',
      productName: 'Baby Spinach',
      quantity: 1,
      unit: 'bag',
      price: 3.99,
      category: 'Produce',
      brandFilters: ['Earthbound Farm', 'Fresh Express'],
      healthFilters: ['ORGANIC']
    },
    {
      id: '3',
      name: 'quinoa',
      productName: 'Organic Quinoa',
      quantity: 1,
      unit: 'bag',
      price: 7.99,
      category: 'Pantry',
      brandFilters: ['Ancient Harvest', 'Bob\'s Red Mill'],
      healthFilters: ['ORGANIC', 'GLUTEN_FREE']
    },
    {
      id: '4',
      name: 'salmon',
      productName: 'Atlantic Salmon Fillet',
      quantity: 1,
      unit: 'lb',
      price: 14.99,
      category: 'Meat & Seafood',
      brandFilters: ['Whole Foods', 'Fresh Market'],
      healthFilters: ['WILD_CAUGHT', 'SUSTAINABLE']
    },
    {
      id: '5',
      name: 'avocado',
      productName: 'Organic Avocados',
      quantity: 3,
      unit: 'each',
      price: 2.99,
      category: 'Produce',
      brandFilters: ['Mission', 'Calavo'],
      healthFilters: ['ORGANIC']
    }
  ];

  const getItemsForMode = () => {
    switch (checkoutMode) {
      case 'recipe':
        return sampleRecipeItems;
      case 'cart':
        return sampleCartItems;
      case 'shopping-list':
        return sampleShoppingListItems;
      default:
        return sampleRecipeItems;
    }
  };

  const handleOpenCheckout = () => {
    setShowCheckout(true);
  };

  const handleCloseCheckout = () => {
    setShowCheckout(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#111827' }}>
        🛒 Enhanced Instacart Checkout Demo
      </h1>

      <div style={{
        background: 'white',
        borderRadius: '1rem',
        padding: '2rem',
        border: '2px solid #e5e7eb',
        marginBottom: '2rem'
      }}>
        <h2 style={{ marginBottom: '1.5rem', color: '#374151' }}>Configuration</h2>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Checkout Mode:
          </label>
          <select
            value={checkoutMode}
            onChange={(e) => setCheckoutMode(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: '2px solid #e5e7eb',
              width: '200px'
            }}
          >
            <option value="recipe">Recipe Mode</option>
            <option value="cart">Shopping Cart Mode</option>
            <option value="shopping-list">Shopping List Mode</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Custom Title (optional):
          </label>
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder={`Default: ${checkoutMode === 'recipe' ? 'My CartSmash Recipe' : checkoutMode === 'cart' ? 'Shopping Cart' : 'Shopping List'}`}
            style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: '2px solid #e5e7eb',
              width: '100%',
              maxWidth: '400px'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: '#374151' }}>
            Preview Items ({getItemsForMode().length} items):
          </h3>
          <div style={{
            background: '#f9fafb',
            borderRadius: '0.5rem',
            padding: '1rem',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {getItemsForMode().map((item, index) => (
              <div key={item.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0',
                borderBottom: index < getItemsForMode().length - 1 ? '1px solid #e5e7eb' : 'none'
              }}>
                <div>
                  <span style={{ fontWeight: '500' }}>{item.productName}</span>
                  <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                    ({item.quantity} {item.unit})
                  </span>
                  <span style={{
                    background: '#e5e7eb',
                    color: '#6b7280',
                    fontSize: '0.75rem',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '0.25rem',
                    marginLeft: '0.5rem'
                  }}>
                    {item.category}
                  </span>
                  {item.brandFilters && item.brandFilters.length > 0 && (
                    <div style={{ marginTop: '0.25rem' }}>
                      {item.brandFilters.map((brand, idx) => (
                        <span key={idx} style={{
                          background: 'linear-gradient(135deg, #FB4F14 0%, #e8420c 100%)',
                          color: '#FFFFFF',
                          fontSize: '0.625rem',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem',
                          marginRight: '0.25rem',
                          fontWeight: '500'
                        }}>
                          🏷️ {brand}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.healthFilters && item.healthFilters.length > 0 && (
                    <div style={{ marginTop: '0.25rem' }}>
                      {item.healthFilters.map((health, idx) => (
                        <span key={idx} style={{
                          background: 'linear-gradient(135deg, #002244 0%, #1a365d 100%)',
                          color: '#FFFFFF',
                          fontSize: '0.625rem',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem',
                          marginRight: '0.25rem',
                          fontWeight: '500'
                        }}>
                          🌱 {health}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontWeight: '600' }}>${item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: '1rem',
            textAlign: 'right',
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#059669'
          }}>
            Total: ${getItemsForMode().reduce((sum, item) => sum + item.price, 0).toFixed(2)}
          </div>
        </div>

        <button
          onClick={handleOpenCheckout}
          style={{
            background: 'linear-gradient(135deg, #FB4F14 0%, #e8420c 100%)',
            color: '#FFFFFF',
            padding: '0.75rem 2rem',
            borderRadius: '0.5rem',
            border: 'none',
            fontWeight: '600',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            display: 'block',
            margin: '0 auto',
            boxShadow: '0 4px 6px -1px rgba(251, 79, 20, 0.2)'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          🚀 Open Enhanced Checkout
        </button>
      </div>

      <div style={{
        background: '#f9fafb',
        borderRadius: '1rem',
        padding: '1.5rem',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#374151' }}>✨ Enhanced Features:</h3>
        <ul style={{ color: '#6b7280', lineHeight: '1.6' }}>
          <li>🎯 <strong>Multi-step Progress Flow</strong> - Visual step indicators with navigation</li>
          <li>🏪 <strong>Enhanced Store Comparison</strong> - Real logos, distances, pricing, and delivery times</li>
          <li>🏷️ <strong>Brand Filters</strong> - Preferred brand highlighting (e.g., Bell & Evans, McCormick)</li>
          <li>🌱 <strong>Health Filters</strong> - Dietary preferences (ORGANIC, GLUTEN_FREE, NO_ANTIBIOTICS)</li>
          <li>📍 <strong>Location Management</strong> - Dynamic ZIP code updates with retailer refresh</li>
          <li>🛒 <strong>Flexible Item Management</strong> - Quantity editing and ingredient toggling</li>
          <li>💰 <strong>Real-time Price Calculation</strong> - Estimated totals with fees and taxes</li>
          <li>📱 <strong>Responsive Design</strong> - Mobile-optimized checkout experience</li>
          <li>🎨 <strong>Modern UI/UX</strong> - Clean design with smooth animations</li>
          <li>🔄 <strong>Multi-mode Support</strong> - Recipe, Cart, and Shopping List modes</li>
        </ul>
      </div>

      {showCheckout && (
        <InstacartCheckoutUnified
          items={getItemsForMode()}
          onClose={handleCloseCheckout}
          mode={checkoutMode}
          title={customTitle || null}
          initialLocation="95670"
        />
      )}
    </div>
  );
};

export default CheckoutDemo;