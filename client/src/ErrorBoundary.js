import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>🚨 Something went wrong</h2>
          <p>The application encountered an error. Please refresh the page.</p>
          <button onClick={() => window.location.reload()}>
            🔄 Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };