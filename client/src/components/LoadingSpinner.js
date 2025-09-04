// client/src/components/LoadingSpinner.js
import React from 'react';

// Inline spinner for use within buttons or text
export function InlineSpinner({ text = '', color = '#6b7280' }) {
  return (
    <span style={{ 
      display: 'inline-flex', 
      alignItems: 'center',
      gap: '6px'
    }}>
      <span style={{
        display: 'inline-block',
        width: '14px',
        height: '14px',
        border: `2px solid ${color}`,
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite'
      }}></span>
      {text && <span>{text}</span>}
    </span>
  );
}

// Button spinner - CartSmash themed
export function ButtonSpinner({ color = '#fff' }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      width: '16px',
      height: '16px'
    }}>
      <span style={{ 
        fontSize: '12px',
        animation: 'cartsmash-thinking 1.5s ease-in-out infinite'
      }}>🛒</span>
      
      {/* Mini floating grocery */}
      <span style={{
        position: 'absolute',
        top: '-6px',
        right: '-2px',
        fontSize: '4px',
        animation: 'cartsmash-grocery-float 2s ease-in-out infinite'
      }}>🥕</span>
    </span>
  );
}

// Full overlay spinner
export function OverlaySpinner({ text = 'Loading...' }) {
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(255,255,255,0.95)', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 9999,
      gap: '16px'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '4px solid #e5e7eb',
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <div style={{
        fontSize: '18px',
        color: '#374151',
        fontWeight: '500'
      }}>{text}</div>
    </div>
  );
}

// Progress spinner with color cycling
export function ProgressSpinner({ text = 'Processing...' }) {
  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px'
    }}>
      <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="#e5e7eb"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          strokeWidth="8"
          fill="none"
          strokeDasharray="283"
          strokeDashoffset="70"
          style={{ 
            animation: 'cartsmash-spin 2s linear infinite, cartsmash-colors 6s linear infinite',
            strokeLinecap: 'round'
          }}
        />
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#374151', fontWeight: '500' }}>
          {text}
        </div>
      </div>
    </div>
  );
}

// Default loading spinner - CartSmash themed
export default function LoadingSpinner({ text = 'Loading...', size = 'medium', color = '#FF6B35', inline = false }) {
  const sizes = {
    small: { cart: '16px', groceries: '6px', font: '12px', gap: '8px', groceryOffset: '12px' },
    medium: { cart: '24px', groceries: '8px', font: '14px', gap: '12px', groceryOffset: '18px' },
    large: { cart: '32px', groceries: '10px', font: '16px', gap: '16px', groceryOffset: '24px' }
  };

  const currentSize = sizes[size] || sizes.medium;

  const containerStyle = inline ? {
    display: 'inline-flex',
    alignItems: 'center',
    gap: currentSize.gap
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: currentSize.gap,
    padding: '12px'
  };

  return (
    <div style={containerStyle}>
      {/* CartSmash grocery cart with floating items */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: currentSize.cart,
        height: currentSize.cart,
        animation: 'cartsmash-thinking 1.5s ease-in-out infinite'
      }}>
        <div style={{ fontSize: currentSize.cart }}>🛒</div>
        
        {/* Floating grocery items */}
        <div style={{
          position: 'absolute',
          top: `-${currentSize.groceryOffset}`,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: currentSize.groceries,
          animation: 'cartsmash-grocery-float 2s ease-in-out infinite',
          animationDelay: '0s'
        }}>🥕</div>
        
        <div style={{
          position: 'absolute',
          right: `-${currentSize.groceryOffset}`,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: currentSize.groceries,
          animation: 'cartsmash-grocery-float 2s ease-in-out infinite',
          animationDelay: '0.5s'
        }}>🍎</div>
        
        <div style={{
          position: 'absolute',
          bottom: `-${currentSize.groceryOffset}`,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: currentSize.groceries,
          animation: 'cartsmash-grocery-float 2s ease-in-out infinite',
          animationDelay: '1s'
        }}>🥛</div>
        
        <div style={{
          position: 'absolute',
          left: `-${currentSize.groceryOffset}`,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: currentSize.groceries,
          animation: 'cartsmash-grocery-float 2s ease-in-out infinite',
          animationDelay: '1.5s'
        }}>🍞</div>
      </div>
      
      {text && (
        <div style={{
          fontSize: currentSize.font,
          color: color,
          fontWeight: '500',
          textAlign: 'center'
        }}>{text}</div>
      )}
    </div>
  );
}

// Add CSS animation if not already present
if (typeof document !== 'undefined' && !document.querySelector('#spinner-keyframes')) {
  const style = document.createElement('style');
  style.id = 'spinner-keyframes';
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes cartsmash-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes cartsmash-thinking {
      0%, 100% { transform: rotate(0deg) scale(1); }
      25% { transform: rotate(-3deg) scale(1.05); }
      50% { transform: rotate(3deg) scale(1.1); }
      75% { transform: rotate(-2deg) scale(1.05); }
    }
    
    @keyframes cartsmash-grocery-float {
      0%, 100% { 
        transform: translateX(-50%) translateY(0px) rotate(0deg); 
        opacity: 0.7; 
      }
      33% { 
        transform: translateX(-50%) translateY(-6px) rotate(120deg); 
        opacity: 1; 
      }
      66% { 
        transform: translateX(-50%) translateY(-3px) rotate(240deg); 
        opacity: 0.8; 
      }
    }
    
    @keyframes cartsmash-colors {
      0% { stroke: #FF6B35; }
      25% { stroke: #F7931E; }
      50% { stroke: #FF6B35; }
      75% { stroke: #F7931E; }
      100% { stroke: #FF6B35; }
    }
  `;
  document.head.appendChild(style);
}