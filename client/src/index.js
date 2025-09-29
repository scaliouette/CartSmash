import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';
import { setupServiceWorkerErrorHandling } from './utils/serviceWorkerHandler';
import './utils/replaceConsoleLogs'; // Apply console overrides

// Application startup - logging disabled in production

// Setup service worker error handling early
setupServiceWorkerErrorHandling();

// Global error handlers
window.addEventListener('error', (event) => {
  // Handle image loading errors gracefully
  if (event.target && event.target.tagName === 'IMG') {
    // Image load error handled silently
    event.preventDefault(); // Prevent the error from being logged as unhandled
    return;
  }

  // Global error captured - details logged to error tracking service
});

window.addEventListener('unhandledrejection', (event) => {
  // Unhandled promise rejection captured

  // Handle common service worker errors gracefully
  if (event.reason && event.reason.message) {
    const message = event.reason.message.toLowerCase();
    if (message.includes('service worker') || message.includes('cache') || message.includes('registration')) {
      // Service worker error caught and handled
      // Prevent the error from being logged as unhandled
      event.preventDefault();
      return;
    }
  }

  // For other errors, you might want to report them to an error tracking service
  // For now, we'll just log them
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  // Root element not found - display error
  // Safe error display without innerHTML
  const errorHeading = document.createElement('h1');
  errorHeading.textContent = 'Error: Root element not found';
  document.body.appendChild(errorHeading);
} else {
  const root = ReactDOM.createRoot(rootElement);
  // Rendering app

  try {
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    // App rendered successfully

    // Mark React as loaded for the loading screen
    if (window.markReactLoaded) {
      window.markReactLoaded();
    }
  } catch (error) {
    // Failed to render app - display error message
    // Safe error display without innerHTML
    const errorHeading = document.createElement('h1');
    // Sanitize error message to prevent XSS
    errorHeading.textContent = `Error loading app: ${error.message || 'Unknown error'}`;
    rootElement.appendChild(errorHeading);
  }
}