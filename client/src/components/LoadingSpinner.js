// client/src/components/LoadingSpinner.js
import React from 'react';

function LoadingSpinner({ 
  size = 'medium', 
  color = '#3b82f6', 
  text = 'Loading...', 
  fullScreen = false,
  overlay = false,
  inline = false 
}) {
  const sizes = {
    small: { spinner: 20, text: 12, gap: 8 },
    medium: { spinner: 32, text: 14, gap: 12 },
    large: { spinner: 48, text: 16, gap: 16 },
    xlarge: { spinner: 64, text: 18, gap: 20 }
  };

  const currentSize = sizes[size] || sizes.medium;

  const spinnerContent = (
    <div style={{
      ...styles.container,
      ...(inline ? styles.inlineContainer : {}),
      gap: `${currentSize.gap}px`
    }}>
      <div style={{
        ...styles.spinner,
        width: `${currentSize.spinner}px`,
        height: `${currentSize.spinner}px`,
        borderColor: color,
        borderTopColor: 'transparent'
      }} />
      {text && (
        <div style={{
          ...styles.text,
          fontSize: `${currentSize.text}px`,
          color: color
        }}>
          {text}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div style={styles.fullScreen}>
        {spinnerContent}
      </div>
    );
  }

  if (overlay) {
    return (
      <div style={styles.overlay}>
        <div style={styles.overlayContent}>
          {spinnerContent}
        </div>
      </div>
    );
  }

  return spinnerContent;
}

// Export different preset spinners for common use cases
export const InlineSpinner = ({ text = '', color = '#6b7280' }) => (
  <LoadingSpinner size="small" color={color} text={text} inline />
);

export const ButtonSpinner = ({ color = 'white' }) => (
  <LoadingSpinner size="small" color={color} text="" inline />
);

export const PageSpinner = ({ text = 'Loading...' }) => (
  <LoadingSpinner size="large" text={text} fullScreen />
);

export const OverlaySpinner = ({ text = 'Processing...' }) => (
  <LoadingSpinner size="medium" text={text} overlay />
);

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },

  inlineContainer: {
    flexDirection: 'row',
    padding: '0'
  },

  spinner: {
    border: '3px solid',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    flexShrink: 0
  },

  text: {
    fontWeight: '500',
    textAlign: 'center',
    marginTop: '0'
  },

  fullScreen: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    borderRadius: 'inherit'
  },

  overlayContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
  }
};

// Add keyframes for spin animation
if (typeof document !== 'undefined' && !document.querySelector('style[data-loading-spinner]')) {
  const style = document.createElement('style');
  style.setAttribute('data-loading-spinner', 'true');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default LoadingSpinner;