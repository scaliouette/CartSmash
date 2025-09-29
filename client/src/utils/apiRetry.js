// API Retry utility for handling 503 Service Unavailable errors
import debugService from '../services/debugService';

/**
 * Retry configuration
 */
const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatuses: [502, 503, 504, 408, 429], // Gateway errors, timeout, rate limit
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED']
};

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate delay with exponential backoff
 */
const calculateDelay = (attempt, options) => {
  const delay = Math.min(
    options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1),
    options.maxDelay
  );
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
};

/**
 * Check if error is retryable
 */
const isRetryableError = (error, options) => {
  // Check for network errors
  if (error.code && options.retryableErrors.includes(error.code)) {
    return true;
  }

  // Check for HTTP status codes
  if (error.response?.status && options.retryableStatuses.includes(error.response.status)) {
    return true;
  }

  // Check for fetch errors
  if (error.message && (
    error.message.includes('NetworkError') ||
    error.message.includes('Failed to fetch') ||
    error.message.includes('CORS')
  )) {
    return true;
  }

  return false;
};

/**
 * Retry wrapper for fetch API
 */
export const fetchWithRetry = async (url, options = {}, retryOptions = {}) => {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let lastError;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Check if response status is retryable
      if (config.retryableStatuses.includes(response.status)) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error;

      // Log the error
      debugService.logWarning('API_RETRY', {
        url,
        attempt,
        error: error.message,
        status: error.response?.status
      });

      // Check if we should retry
      if (attempt < config.maxRetries && isRetryableError(error, config)) {
        const delay = calculateDelay(attempt, config);
        await sleep(delay);
        continue;
      }

      // Max retries reached or non-retryable error
      break;
    }
  }

  // All retries failed
  debugService.logError('API_RETRY_FAILED', {
    url,
    attempts: config.maxRetries,
    error: lastError.message
  });

  throw lastError;
};

/**
 * Retry wrapper for axios
 */
export const axiosRetryInterceptor = (axios, retryOptions = {}) => {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };

  axios.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config;

      // Initialize retry count
      if (!originalRequest._retryCount) {
        originalRequest._retryCount = 0;
      }

      // Check if we should retry
      if (
        originalRequest._retryCount < config.maxRetries &&
        isRetryableError(error, config)
      ) {
        originalRequest._retryCount++;

        const delay = calculateDelay(originalRequest._retryCount, config);

        debugService.logWarning('AXIOS_RETRY', {
          url: originalRequest.url,
          attempt: originalRequest._retryCount,
          error: error.message,
          status: error.response?.status
        });

        await sleep(delay);

        return axios(originalRequest);
      }

      // Max retries reached
      debugService.logError('AXIOS_RETRY_FAILED', {
        url: originalRequest.url,
        attempts: originalRequest._retryCount,
        error: error.message
      });

      return Promise.reject(error);
    }
  );
};

/**
 * Wrapper to add retry logic to any async function
 */
export const withRetry = async (fn, retryOptions = {}) => {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let lastError;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      debugService.logWarning('FUNCTION_RETRY', {
        attempt,
        error: error.message
      });

      if (attempt < config.maxRetries && isRetryableError(error, config)) {
        const delay = calculateDelay(attempt, config);
        await sleep(delay);
        continue;
      }

      break;
    }
  }

  debugService.logError('FUNCTION_RETRY_FAILED', {
    attempts: config.maxRetries,
    error: lastError.message
  });

  throw lastError;
};

// Export default retry function
export default fetchWithRetry;