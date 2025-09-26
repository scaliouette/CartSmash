// client/src/services/debugService.js
// Comprehensive error tracking and debugging system

class DebugService {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.logs = [];
    this.isEnabled = process.env.NODE_ENV === 'development';
    this.maxLogs = 1000; // Prevent memory leaks

    // Setup global error handlers
    this.setupErrorHandlers();
  }

  setupErrorHandlers() {
    if (!this.isEnabled) return;

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('UNHANDLED_PROMISE_REJECTION', {
        reason: event.reason,
        promise: event.promise,
        stack: event.reason?.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Capture JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError('JAVASCRIPT_ERROR', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Override console.error to capture all errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.logError('CONSOLE_ERROR', {
        args: args,
        stack: new Error().stack,
        timestamp: new Date().toISOString()
      });
      originalConsoleError.apply(console, args);
    };
  }

  logError(type, details) {
    if (!this.isEnabled) return;

    const errorEntry = {
      id: this.generateId(),
      type,
      details,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.errors.push(errorEntry);
    this.trimLogs('errors');

    // Send to server for persistence
    this.sendToServer('error', errorEntry);

    // Log to console for immediate visibility
    console.group(`🔴 DEBUG ERROR [${type}]`);
    console.error('Error Details:', details);
    console.error('Timestamp:', errorEntry.timestamp);
    console.error('Full Entry:', errorEntry);
    console.groupEnd();
  }

  logWarning(type, details) {
    if (!this.isEnabled) return;

    const warningEntry = {
      id: this.generateId(),
      type,
      details,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    this.warnings.push(warningEntry);
    this.trimLogs('warnings');

    console.group(`🟡 DEBUG WARNING [${type}]`);
    console.warn('Warning Details:', details);
    console.warn('Timestamp:', warningEntry.timestamp);
    console.groupEnd();
  }

  logInfo(type, details) {
    if (!this.isEnabled) return;

    const logEntry = {
      id: this.generateId(),
      type,
      details,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    this.logs.push(logEntry);
    this.trimLogs('logs');

    console.group(`ℹ️ DEBUG INFO [${type}]`);
    console.log('Info Details:', details);
    console.log('Timestamp:', logEntry.timestamp);
    console.groupEnd();
  }

  // Simple log method for compatibility with console.log replacement
  log(...args) {
    if (!this.isEnabled) return;

    // Convert arguments to a proper message
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    // Log as info
    this.logInfo('LOG', { message, args });
  }

  // Specific error tracking methods
  trackApiError(endpoint, error, requestData = null) {
    this.logError('API_ERROR', {
      endpoint,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      requestData,
      response: error.response || null
    });
  }

  trackComponentError(componentName, error, props = null) {
    this.logError('COMPONENT_ERROR', {
      componentName,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      props
    });
  }

  trackUserAction(action, details) {
    this.logInfo('USER_ACTION', {
      action,
      details,
      sessionId: this.getSessionId()
    });
  }

  trackPerformance(operation, duration, details = {}) {
    this.logInfo('PERFORMANCE', {
      operation,
      duration,
      details
    });
  }

  // System diagnostic methods
  getSystemInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      language: navigator.language,
      onLine: navigator.onLine,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth
      },
      window: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      memory: performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      } : null,
      timestamp: new Date().toISOString()
    };
  }

  getErrorSummary() {
    const summary = {
      totalErrors: this.errors.length,
      totalWarnings: this.warnings.length,
      totalLogs: this.logs.length,
      recentErrors: this.errors.slice(-5),
      systemInfo: this.getSystemInfo(),
      timestamp: new Date().toISOString()
    };

    return summary;
  }

  // Export debug data
  exportDebugData() {
    const debugData = {
      errors: this.errors,
      warnings: this.warnings,
      logs: this.logs,
      summary: this.getErrorSummary(),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cartsmash-debug-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Clear all debug data
  clearDebugData() {
    this.errors = [];
    this.warnings = [];
    this.logs = [];
    console.log('🧹 Debug data cleared');
  }

  // Helper methods
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('debug_session_id');
    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem('debug_session_id', sessionId);
    }
    return sessionId;
  }

  trimLogs(type) {
    if (this[type].length > this.maxLogs) {
      this[type] = this[type].slice(-this.maxLogs);
    }
  }

  async sendToServer(type, entry) {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      await fetch(`${API_URL}/api/debug/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      // Don't log this to prevent infinite loops
      console.warn('Failed to send debug data to server:', error.message);
    }
  }

  // Public API for manual error reporting
  reportError(message, details = {}) {
    this.logError('MANUAL_REPORT', { message, details });
  }

  reportWarning(message, details = {}) {
    this.logWarning('MANUAL_REPORT', { message, details });
  }

  reportInfo(message, details = {}) {
    this.logInfo('MANUAL_REPORT', { message, details });
  }
}

// Create global instance
const debugService = new DebugService();

// Add to window for manual debugging
if (typeof window !== 'undefined') {
  window.debugService = debugService;
}

export default debugService;