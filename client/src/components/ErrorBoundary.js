// client/src/components/ErrorBoundary.js
// React Error Boundary with comprehensive error reporting

import React from 'react';
import debugService from '../services/debugService';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = Math.random().toString(36).substr(2, 9);

    // Log error to debug service
    debugService.trackComponentError(this.props.componentName || 'Unknown', error, {
      errorInfo,
      props: this.props,
      state: this.state
    });

    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Also log to console for immediate visibility
    console.group('🔴 REACT ERROR BOUNDARY CAUGHT ERROR');
    console.error('Component:', this.props.componentName || 'Unknown');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Props:', this.props);
    console.error('Error ID:', errorId);
    console.groupEnd();
  }

  handleRetry = () => {
    this.setState({
      isRecovering: true
    });

    // Add a small delay to give user feedback
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: this.state.retryCount + 1,
        isRecovering: false
      });
    }, 500);
  };

  handleClearData = () => {
    if (window.confirm('This will clear all app data including your shopping lists, recipes, and preferences. Are you sure?')) {
      try {
        // Clear potentially corrupted data from localStorage
        const keysToRemove = [
          'cartsmash_cart',
          'cartsmash_recipes',
          'cartsmash_meal_plans',
          'cartsmash_user_preferences',
          'cartsmash_cache',
          'cartsmash_errors',
          'cartsmash_debug_logs'
        ];

        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });

        // Clear sessionStorage as well
        sessionStorage.clear();

        // Clear any service worker cache if available
        if ('serviceWorker' in navigator && 'caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              if (name.includes('cartsmash')) {
                caches.delete(name).catch(err => {
                  console.warn('Failed to delete cache:', name, err);
                });
              }
            });
          }).catch(err => {
            console.warn('Failed to access cache storage:', err);
          });
        }

        alert('App data has been cleared. The page will now reload.');
        window.location.reload();
      } catch (e) {
        console.error('Failed to clear app data:', e);
        alert('Failed to clear app data. Please manually clear your browser data for this site.');
      }
    }
  };

  handleResetComponent = () => {
    // Force a complete re-render by clearing component state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false
    });

    // If there's an onReset callback from parent, call it
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReportError = () => {
    const errorReport = {
      errorId: this.state.errorId,
      component: this.props.componentName || 'Unknown',
      error: {
        message: this.state.error?.message,
        stack: this.state.error?.stack,
        name: this.state.error?.name
      },
      errorInfo: this.state.errorInfo,
      props: this.props,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Copy to clipboard for easy reporting
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('Error report copied to clipboard! Please share this with the development team.');
      })
      .catch(() => {
        // Fallback: show the error in a modal or download
        const blob = new Blob([JSON.stringify(errorReport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-report-${this.state.errorId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  render() {
    if (this.state.hasError) {
      // Show loading state while recovering
      if (this.state.isRecovering) {
        return (
          <div style={styles.errorContainer}>
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Recovering...</p>
            </div>
          </div>
        );
      }

      // Determine if this is a critical error based on retry count and error type
      const isCriticalError = this.state.retryCount >= 3 ||
                             this.state.error?.message?.includes('Maximum update depth') ||
                             this.state.error?.message?.includes('Cannot read property') ||
                             this.state.error?.message?.includes('circular structure');

      // Fallback UI
      return (
        <div style={styles.errorContainer}>
          <div style={styles.errorCard}>
            <div style={styles.errorHeader}>
              <h2 style={styles.errorTitle}>
                {isCriticalError ? '🚨 Critical Error' : '⚠️ Something went wrong'}
              </h2>
              <p style={styles.errorSubtitle}>
                Component: {this.props.componentName || 'Unknown'}
                {this.state.retryCount > 0 && ` • Retry ${this.state.retryCount}`}
              </p>
            </div>

            <div style={styles.errorBody}>
              <p style={styles.errorMessage}>
                {isCriticalError
                  ? "A critical error has occurred. Please try clearing app data or reloading the page."
                  : this.state.error?.message || 'An unexpected error occurred'
                }
              </p>

              {/* Show fallback component if provided */}
              {this.props.fallbackComponent && (
                <div style={styles.fallbackContainer}>
                  <p style={styles.fallbackTitle}>Alternative view:</p>
                  {this.props.fallbackComponent}
                </div>
              )}

              <details style={styles.errorDetails}>
                <summary style={styles.errorSummary}>Technical Details</summary>
                <div style={styles.errorStack}>
                  <p><strong>Error ID:</strong> {this.state.errorId}</p>
                  <p><strong>Error Type:</strong> {this.state.error?.name}</p>
                  <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
                  <p><strong>Retry Count:</strong> {this.state.retryCount}</p>
                  <p><strong>Critical:</strong> {isCriticalError ? 'Yes' : 'No'}</p>

                  {this.state.error?.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre style={styles.stackTrace}>{this.state.error.stack}</pre>
                    </div>
                  )}

                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre style={styles.stackTrace}>{this.state.errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            </div>

            <div style={styles.errorActions}>
              {!isCriticalError && (
                <button
                  onClick={this.handleRetry}
                  style={styles.retryButton}
                  disabled={this.state.isRecovering}
                >
                  🔄 Try Again {this.state.retryCount > 0 && `(${this.state.retryCount})`}
                </button>
              )}

              <button
                onClick={this.handleResetComponent}
                style={styles.resetButton}
              >
                🔄 Reset Component
              </button>

              <button
                onClick={this.handleReportError}
                style={styles.reportButton}
              >
                📋 Copy Error Report
              </button>

              <button
                onClick={() => window.location.reload()}
                style={styles.reloadButton}
              >
                🔄 Reload Page
              </button>

              {isCriticalError && (
                <button
                  onClick={this.handleClearData}
                  style={styles.clearDataButton}
                >
                  🗑️ Clear App Data
                </button>
              )}
            </div>

            <div style={styles.errorFooter}>
              <p style={styles.errorFooterText}>
                {isCriticalError
                  ? "Critical errors may require clearing app data. Your data will be lost but the app should work again."
                  : "If this problem persists, please copy the error report and contact support."
                }
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  errorContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    padding: '20px',
    backgroundColor: '#f8f9fa'
  },
  errorCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    border: '2px solid #dc3545'
  },
  errorHeader: {
    textAlign: 'center',
    marginBottom: '25px',
    borderBottom: '1px solid #e9ecef',
    paddingBottom: '20px'
  },
  errorTitle: {
    color: '#dc3545',
    margin: '0 0 10px 0',
    fontSize: '24px',
    fontWeight: '600'
  },
  errorSubtitle: {
    color: '#6c757d',
    margin: '0',
    fontSize: '14px'
  },
  errorBody: {
    marginBottom: '25px'
  },
  errorMessage: {
    fontSize: '16px',
    color: '#495057',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #dee2e6'
  },
  errorDetails: {
    marginBottom: '15px'
  },
  errorSummary: {
    cursor: 'pointer',
    padding: '10px',
    backgroundColor: '#e9ecef',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '500',
    color: '#495057'
  },
  errorStack: {
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    marginTop: '10px'
  },
  stackTrace: {
    backgroundColor: '#2d3748',
    color: '#e2e8f0',
    padding: '15px',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '200px',
    margin: '10px 0'
  },
  errorActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: '20px'
  },
  retryButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  reportButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  reloadButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  errorFooter: {
    textAlign: 'center',
    borderTop: '1px solid #e9ecef',
    paddingTop: '20px'
  },
  errorFooterText: {
    color: '#6c757d',
    fontSize: '12px',
    margin: '0'
  },

  // New styles for enhanced functionality
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '40px'
  },

  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #FB4F14',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },

  loadingText: {
    color: '#6c757d',
    fontSize: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },

  fallbackContainer: {
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #dee2e6'
  },

  fallbackTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057',
    marginBottom: '12px'
  },

  resetButton: {
    backgroundColor: '#6f42c1',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },

  clearDataButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  }
};

// Add CSS animation for spinner
if (typeof document !== 'undefined') {
  const existingStyle = document.querySelector('#error-boundary-styles');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'error-boundary-styles';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

export default ErrorBoundary;