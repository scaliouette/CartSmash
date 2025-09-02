console.log('🌟 Starting CartSmash application...');

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorBoundary } from './ErrorBoundary';

console.log('✅ All modules imported successfully');

// Global error handlers
window.addEventListener('error', (event) => {
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
});

console.log('🎯 Creating React root...');
const rootElement = document.getElementById('root');
console.log('Root element found:', rootElement ? 'Yes' : 'No');

if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = '<h1>Error: Root element not found</h1>';
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
  } catch (error) {
    console.error('❌ Failed to render app:', error);
    rootElement.innerHTML = `<h1>Error loading app: ${error.message}</h1>`;
  }
}