// client/src/components/LoadingSpinner.js
import React from 'react';

// Main LoadingSpinner component with multiple variants
function LoadingSpinner({ 
  size = 'medium', 
  color = '#3b82f6', 
  text = 'Loading...', 
  fullscreen = false,
  inline = false 
}) {
  const sizes = {
    small: { width: 20, height: 20, border: 2 },
    medium: { width: 40, height: 40, border: 3 },
    large: { width: 60, height: 60, border: 4 }
  };

  const spinnerSize = sizes[size] || sizes.medium;

  const spinnerStyle = {
    width: `${spinnerSize.width}px`,
    height: `${spinnerSize.height}px`,
    border: `${spinnerSize.border}px solid ${color}20`,
    borderTop: `${spinnerSize.border}px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };

  const containerStyle = fullscreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 9999,
    flexDirection: 'column',
    gap: '16px'
  } : inline ? {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px'
  } : {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    flexDirection: 'column',
    gap: '12px'
  };

  return (
    <div style={containerStyle}>
      <div style={spinnerStyle} />
      {text && (
        <div style={{
          color: size === 'small' ? '#6b7280' : '#374151',
          fontSize: size === 'small' ? '12px' : '14px',
          fontWeight: '500'
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

// Button spinner for inline button loading states
export function ButtonSpinner({ color = 'currentColor' }) {
  return (
    <svg 
      style={{
        width: '16px',
        height: '16px',
        animation: 'spin 1s linear infinite'
      }}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle 
        cx="12" 
        cy="12" 
        r="10" 
        stroke={color} 
        strokeWidth="3" 
        strokeLinecap="round"
        strokeDasharray="31.4"
        strokeDashoffset="31.4"
        style={{
          animation: 'dash 1.5s ease-in-out infinite'
        }}
      />
    </svg>
  );
}

// Inline spinner for small loading indicators
export function InlineSpinner({ text = '', color = '#3b82f6' }) {
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
        border: `2px solid ${color}20`,
        borderTop: `2px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      {text && <span style={{ fontSize: '12px', color: '#6b7280' }}>{text}</span>}
    </span>
  );
}

// Overlay spinner for modal/fullscreen loading
export function OverlaySpinner({ text = 'Loading...', blur = true }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: blur ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.8)',
      backdropFilter: blur ? 'blur(4px)' : 'none',
      zIndex: 9999
    }}>
      <div style={{
        textAlign: 'center',
        padding: '32px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        minWidth: '200px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          margin: '0 auto 16px',
          border: '3px solid #e5e7eb',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{
          fontSize: '16px',
          fontWeight: '500',
          color: '#1f2937'
        }}>
          {text}
        </div>
      </div>
    </div>
  );
}

// Progress spinner with percentage
export function ProgressSpinner({ progress = 0, text = 'Processing...' }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      padding: '20px'
    }}>
      <div style={{ position: 'relative' }}>
        <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="6"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.3s ease'
            }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#1f2937'
        }}>
          {Math.round(progress)}%
        </div>
      </div>
      <div style={{
        fontSize: '14px',
        color: '#6b7280',
        fontWeight: '500'
      }}>
        {text}
      </div>
    </div>
  );
}

// Skeleton loader for content placeholders
export function SkeletonLoader({ lines = 3, width = '100%', height = '20px' }) {
  return (
    <div style={{ width }}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          style={{
            height,
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            marginBottom: index < lines - 1 ? '8px' : 0,
            animation: 'pulse 1.5s ease-in-out infinite',
            width: index === lines - 1 ? '80%' : '100%'
          }}
        />
      ))}
    </div>
  );
}

// Add CSS animations
if (typeof document !== 'undefined' && !document.getElementById('loading-spinner-styles')) {
  const style = document.createElement('style');
  style.id = 'loading-spinner-styles';
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes dash {
      0% {
        stroke-dashoffset: 31.4;
        transform: rotate(0deg);
      }
      50% {
        stroke-dashoffset: 8;
        transform: rotate(180deg);
      }
      100% {
        stroke-dashoffset: 31.4;
        transform: rotate(360deg);
      }
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);
}

export default LoadingSpinner;