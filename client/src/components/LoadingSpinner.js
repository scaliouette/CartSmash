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

// Button spinner
export function ButtonSpinner({ color = '#fff' }) {
  return (
    <span style={{
      display: 'inline-block',
      width: '16px',
      height: '16px',
      border: `2px solid ${color}`,
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'spin 0.6s linear infinite'
    }}></span>
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

// Default loading spinner
export default function LoadingSpinner({ text = 'Loading...', size = 'medium' }) {
  const sizes = {
    small: { spinner: '24px', border: '2px', font: '14px' },
    medium: { spinner: '36px', border: '3px', font: '16px' },
    large: { spinner: '48px', border: '4px', font: '18px' }
  };

  const currentSize = sizes[size] || sizes.medium;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      padding: '20px'
    }}>
      <div style={{
        width: currentSize.spinner,
        height: currentSize.spinner,
        border: `${currentSize.border} solid #e5e7eb`,
        borderTopColor: '#3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      {text && (
        <div style={{
          fontSize: currentSize.font,
          color: '#374151'
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
    
    @keyframes cartsmash-colors {
      0% { stroke: #FB4F14; }
      16.66% { stroke: #FF6B35; }
      33.33% { stroke: #002244; }
      50% { stroke: #0066CC; }
      66.66% { stroke: #FB4F14; }
      83.33% { stroke: #FF6B35; }
      100% { stroke: #002244; }
    }
  `;
  document.head.appendChild(style);
}