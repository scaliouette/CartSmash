// client/src/utils/debugLogger.js - Configurable debug logging system

/**
 * Debug logging levels
 */
export const LOG_LEVELS = {
  OFF: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5
};

/**
 * Global debug configuration
 * Can be controlled via localStorage or environment variables
 */
const getDebugConfig = () => {
  try {
    // Check localStorage first for user preference
    const stored = localStorage.getItem('cartsmash_debug_level');
    if (stored !== null) {
      return parseInt(stored, 10);
    }
  } catch (e) {
    // LocalStorage access failed, continue with defaults
  }

  // Default based on environment
  if (process.env.NODE_ENV === 'development') {
    return LOG_LEVELS.WARN; // Only warnings and errors in development
  } else {
    return LOG_LEVELS.ERROR; // Only errors in production
  }
};

let currentLogLevel = getDebugConfig();

/**
 * Update logging level dynamically
 */
export const setLogLevel = (level) => {
  currentLogLevel = level;
  try {
    localStorage.setItem('cartsmash_debug_level', level.toString());
  } catch (e) {
    console.warn('Failed to persist debug level:', e);
  }
};

/**
 * Get current logging level
 */
export const getLogLevel = () => currentLogLevel;

/**
 * Check if a log level should be output
 */
const shouldLog = (level) => currentLogLevel >= level;

/**
 * Performance-optimized logger that does nothing if logging is disabled
 */
export const logger = {
  error: (componentId, functionId, message, data = null) => {
    if (shouldLog(LOG_LEVELS.ERROR)) {
      console.error(`🔴 [${componentId}] [${functionId}] ${message}`, data || '');
    }
  },

  warn: (componentId, functionId, message, data = null) => {
    if (shouldLog(LOG_LEVELS.WARN)) {
      console.warn(`⚠️ [${componentId}] [${functionId}] ${message}`, data || '');
    }
  },

  info: (componentId, functionId, message, data = null) => {
    if (shouldLog(LOG_LEVELS.INFO)) {
      console.log(`ℹ️ [${componentId}] [${functionId}] ${message}`, data || '');
    }
  },

  debug: (componentId, functionId, message, data = null) => {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(`🔍 [${componentId}] [${functionId}] ${message}`, data || '');
    }
  },

  trace: (componentId, functionId, message, data = null) => {
    if (shouldLog(LOG_LEVELS.TRACE)) {
      console.log(`🔬 [${componentId}] [${functionId}] ${message}`, data || '');
    }
  }
};

/**
 * Performance timer utility that only works when logging is enabled
 */
export const createTimer = (componentId, functionId) => {
  if (!shouldLog(LOG_LEVELS.DEBUG)) {
    // Return no-op timer when logging is disabled
    return {
      start: () => {},
      end: () => {},
      mark: () => {}
    };
  }

  const startTime = performance.now();
  const marks = [];

  return {
    start: () => {
      logger.trace(componentId, functionId, 'Timer started');
    },

    mark: (label) => {
      const elapsed = Math.round(performance.now() - startTime);
      marks.push({ label, elapsed });
      logger.trace(componentId, functionId, `Mark: ${label}`, { elapsed });
    },

    end: (message = 'Operation completed') => {
      const totalTime = Math.round(performance.now() - startTime);
      logger.debug(componentId, functionId, message, {
        duration: totalTime,
        marks: marks.length > 0 ? marks : undefined
      });
      return totalTime;
    }
  };
};

/**
 * Conditional logging for common patterns
 */
export const conditionalLog = {
  /**
   * Log component mount/unmount only in development
   */
  componentLifecycle: (componentId, event, data = null) => {
    logger.debug(componentId, 'lifecycle', `Component ${event}`, data);
  },

  /**
   * Log state changes only when debugging
   */
  stateChange: (componentId, stateName, oldValue, newValue) => {
    logger.trace(componentId, 'state', `${stateName} changed`, {
      from: oldValue,
      to: newValue
    });
  },

  /**
   * Log API calls and responses
   */
  apiCall: (componentId, endpoint, method = 'GET', data = null) => {
    logger.info(componentId, 'api', `${method} ${endpoint}`, data);
  },

  /**
   * Log performance issues
   */
  performance: (componentId, operation, duration, threshold = 100) => {
    if (duration > threshold) {
      logger.warn(componentId, 'performance', `Slow operation: ${operation} took ${duration}ms`);
    } else {
      logger.trace(componentId, 'performance', `${operation} completed in ${duration}ms`);
    }
  }
};

/**
 * Debug utilities for development
 */
export const debugUtils = {
  /**
   * Enable detailed logging for debugging
   */
  enableVerboseLogging: () => {
    setLogLevel(LOG_LEVELS.TRACE);
    logger.info('system', 'debug', 'Verbose logging enabled');
  },

  /**
   * Disable all logging for performance testing
   */
  disableLogging: () => {
    setLogLevel(LOG_LEVELS.OFF);
    console.log('🔇 Debug logging disabled');
  },

  /**
   * Reset to default logging level
   */
  resetLogging: () => {
    setLogLevel(getDebugConfig());
    logger.info('system', 'debug', 'Logging reset to default level');
  },

  /**
   * Get logging statistics
   */
  getStats: () => {
    return {
      currentLevel: currentLogLevel,
      levelName: Object.keys(LOG_LEVELS)[currentLogLevel] || 'UNKNOWN',
      isProduction: process.env.NODE_ENV === 'production'
    };
  }
};

export default logger;