// Utility to replace console.log with debugService while keeping errors
import debugService from '../services/debugService';

// Export a global replacement function
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  // Override console methods in production - keep errors and warnings
  const noop = () => {};

  // Store original error and warn for real logging
  const originalError = window.console.error;
  const originalWarn = window.console.warn;

  window.console = {
    ...window.console,
    log: noop, // Silent in production
    debug: noop, // Silent in production
    info: noop, // Silent in production
    warn: (...args) => {
      // Log warnings but also track them
      debugService.logWarning('CONSOLE_WARNING', { args });
      originalWarn.apply(console, args);
    },
    error: (...args) => {
      // Log errors and track them for admin dashboard
      debugService.logError('CONSOLE_ERROR', { args });
      originalError.apply(console, args);
    },
    trace: noop,
    group: noop,
    groupEnd: noop,
    groupCollapsed: noop,
    time: noop,
    timeEnd: noop,
    table: noop
  };
}

// Export debugService as the replacement
export default debugService;