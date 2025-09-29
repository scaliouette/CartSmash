import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';
import { setupServiceWorkerErrorHandling } from './utils/serviceWorkerHandler';

console.log('🌟 Starting CartSmash application...');
console.log('✅ All modules imported successfully');

// Setup service worker error handling early
setupServiceWorkerErrorHandling();

// Global error handlers
window.addEventListener('error', (event) => {
  // Handle image loading errors gracefully
  if (event.target && event.target.tagName === 'IMG') {
    console.log('🖼️ Image load error handled:', event.target.src);
    event.preventDefault(); // Prevent the error from being logged as unhandled
    return;
  }

  console.error('🚨 Global error:', event.error);
  console.error('Error details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection:', event.reason);

  // Handle common service worker errors gracefully
  if (event.reason && event.reason.message) {
    const message = event.reason.message.toLowerCase();
    if (message.includes('service worker') || message.includes('cache') || message.includes('registration')) {
      console.warn('Service worker error caught and handled:', event.reason.message);
      // Prevent the error from being logged as unhandled
      event.preventDefault();
      return;
    }
  }

  // For other errors, you might want to report them to an error tracking service
  // For now, we'll just log them
});

console.log('🎯 Creating React root...');
const rootElement = document.getElementById('root');
console.log('Root element found:', rootElement ? 'Yes' : 'No');

if (!rootElement) {
  console.error('❌ Root element not found!');
  // Safe error display without innerHTML
  const errorHeading = document.createElement('h1');
  errorHeading.textContent = 'Error: Root element not found';
  document.body.appendChild(errorHeading);
} else {
  const root = ReactDOM.createRoot(rootElement);
  console.log('🎨 Rendering app...');

  try {
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    console.log('✅ App rendered successfully');

    // Mark React as loaded for the loading screen
    if (window.markReactLoaded) {
      window.markReactLoaded();
    }
  } catch (error) {
    console.error('❌ Failed to render app:', error);
    // Safe error display without innerHTML
    const errorHeading = document.createElement('h1');
    // Sanitize error message to prevent XSS
    errorHeading.textContent = `Error loading app: ${error.message || 'Unknown error'}`;
    rootElement.appendChild(errorHeading);
  }
}