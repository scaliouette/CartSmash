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
    console.error('🚨 Error caught by boundary:', error, errorInfo);
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Send error to console with more details
    console.group('🔍 Error Boundary Details');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
    console.error('Browser info:', navigator.userAgent);
    console.error('URL:', window.location.href);
    console.groupEnd();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
          <h2>🚨 Something went wrong</h2>
          <p>The application encountered an error. Please refresh the page.</p>
          <div style={{ 
            background: '#f8f8f8', 
            padding: '15px', 
            margin: '20px 0', 
            textAlign: 'left', 
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <strong>Error Details:</strong><br/>
            {this.state.error?.message}<br/><br/>
            <strong>Location:</strong> {window.location.href}<br/>
            <strong>Time:</strong> {new Date().toISOString()}<br/>
            <strong>User Agent:</strong> {navigator.userAgent}
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };