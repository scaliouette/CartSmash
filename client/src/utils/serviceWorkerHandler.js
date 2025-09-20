// client/src/utils/serviceWorkerHandler.js - Service worker error prevention

/**
 * Utility to handle service worker registration safely
 * Prevents common Firebase Analytics service worker errors
 */

export const handleServiceWorkerRegistration = () => {
  if ('serviceWorker' in navigator) {
    // Listen for registration errors
    navigator.serviceWorker.addEventListener('error', (event) => {
      console.warn('Service worker error caught and handled:', event.error);
    });

    // Handle existing registrations that might be causing issues
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        // Check if this is a problematic Firebase registration
        if (registration.scope.includes('firebase') || registration.scope.includes('analytics')) {
          console.log('Found Firebase service worker registration, monitoring for errors...');

          registration.addEventListener('error', (event) => {
            console.warn('Firebase service worker error caught:', event.error);
          });
        }
      });
    }).catch(err => {
      console.warn('Failed to check service worker registrations:', err);
    });
  }
};

/**
 * Safely unregister problematic service workers if needed
 */
export const unregisterProblematicServiceWorkers = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();

      for (const registration of registrations) {
        // Only unregister if it's causing issues and not essential
        const scope = registration.scope || '';

        // Be careful - only unregister if we know it's problematic
        if (scope.includes('__/firebase/') && scope.includes('analytics')) {
          console.log('Unregistering problematic Firebase analytics service worker');
          await registration.unregister();
        }
      }
    } catch (err) {
      console.warn('Failed to check/unregister service workers:', err);
    }
  }
};

/**
 * Setup global service worker error handling
 */
export const setupServiceWorkerErrorHandling = () => {
  // Handle service worker promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message) {
      const message = event.reason.message.toLowerCase();

      // Common Firebase service worker error patterns
      const serviceWorkerErrorPatterns = [
        'service worker',
        'sw.js',
        'firebase-messaging-sw.js',
        'workbox',
        'cache api',
        'registration failed'
      ];

      const isServiceWorkerError = serviceWorkerErrorPatterns.some(pattern =>
        message.includes(pattern)
      );

      if (isServiceWorkerError) {
        console.warn('Service worker error caught by global handler:', event.reason.message);
        event.preventDefault(); // Prevent the error from being logged as unhandled
      }
    }
  });

  // Initialize service worker monitoring
  handleServiceWorkerRegistration();
};

export default {
  handleServiceWorkerRegistration,
  unregisterProblematicServiceWorkers,
  setupServiceWorkerErrorHandling
};