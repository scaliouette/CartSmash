import React, { useState } from 'react';

const GroceryParsingInterface = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const categories = [
    {
      id: 'meal-plan',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>,
      label: 'AI Meal Plan'
    },
    {
      id: 'budget',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>,
      label: 'Budget Shopping'
    },
    {
      id: 'quick',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
      label: 'Quick Dinners'
    },
    {
      id: 'healthy',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
      label: 'Healthy Options'
    },
    {
      id: 'party',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h20v2H2zm1.15-4.05L4 11l.85 1.95L6.8 13l-1.95.85L4 15.8l-.85-1.95L1.2 13l1.95-.05zm6.7-6.7L11 5l.85 1.95L13.8 7l-1.95.85L11 9.8 10.15 7.85 8.2 7l1.65-.75zm8.15 6.7L19 11l.85 1.95L21.8 13l-1.95.85L19 15.8l-.85-1.95L16.2 13l1.95-.05z"/></svg>,
      label: 'Party Planning'
    },
    {
      id: 'special',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
      label: 'Special Diet'
    }
  ];

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: '#f9fafb',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 4px 6px rgba(0,0,0,0.07)'
    }}>
      {/* Header - Simplified */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        padding: '24px',
        textAlign: 'center'
      }}>
        <h2 style={{
          color: 'white',
          fontSize: '18px',
          fontWeight: '500',
          margin: 0,
          lineHeight: '1.4'
        }}>
          AI-powered grocery parsing that understands what you actually want to buy
        </h2>
      </div>

      {/* Main Content Area */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px'
      }}>
        {/* Category Pills - Horizontal Scroll */}
        <div style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '24px',
          WebkitScrollbar: { display: 'none' },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                backgroundColor: selectedCategory === category.id ? '#3b82f6' : '#f3f4f6',
                color: selectedCategory === category.id ? 'white' : '#4b5563',
                border: 'none',
                borderRadius: '24px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {category.icon}
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        {/* Action Buttons - Organized Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            backgroundColor: '#1e3a8a',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
            </svg>
            Replace cart
          </button>

          <button style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}>
            <span>+</span>
            Add to cart
          </button>

          <button style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            backgroundColor: 'white',
            color: '#4b5563',
            border: '2px solid #e5e7eb',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
            </svg>
            Basic items
          </button>

          <button style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            backgroundColor: 'white',
            color: '#4b5563',
            border: '2px solid #e5e7eb',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Fresh items
          </button>
        </div>

        {/* Input Area */}
        <div style={{
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          padding: '16px',
          border: '2px solid #e5e7eb'
        }}>
          <textarea
            placeholder="Ask for meal plans, recipes, or grocery lists... Examples:
- Create a healthy 7-day meal plan for my family
- I need ingredients for chicken tacos"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#374151',
              resize: 'vertical',
              outline: 'none',
              lineHeight: '1.5'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
            }}
          />

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '12px',
            gap: '8px'
          }}>
            <button style={{
              padding: '8px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              Generate List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroceryParsingInterface;