// client/src/hooks/useDeviceDetection.js
import { useState, useEffect } from 'react';

export const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    screenSize: 'unknown',
    orientation: 'unknown',
    touchSupport: false
  });

  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // Enhanced mobile detection
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i;
      const tabletRegex = /ipad|android(?!.*mobile)|tablet/i;

      // Screen size detection
      const isMobileSize = screenWidth <= 768;
      const isTabletSize = screenWidth > 768 && screenWidth <= 1024;

      // User agent detection
      const isMobileUA = mobileRegex.test(userAgent);
      const isTabletUA = tabletRegex.test(userAgent);

      // Combined detection
      const isMobile = isMobileUA || (isMobileSize && !isTabletUA);
      const isTablet = isTabletUA || (isTabletSize && !isMobileUA);
      const isDesktop = !isMobile && !isTablet;

      // Touch support
      const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // Orientation
      const orientation = screenWidth > screenHeight ? 'landscape' : 'portrait';

      // Screen size categories
      let screenSize = 'desktop';
      if (screenWidth <= 320) screenSize = 'mobile-xs';
      else if (screenWidth <= 375) screenSize = 'mobile-sm';
      else if (screenWidth <= 414) screenSize = 'mobile-md';
      else if (screenWidth <= 768) screenSize = 'mobile-lg';
      else if (screenWidth <= 1024) screenSize = 'tablet';
      else screenSize = 'desktop';

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        screenSize,
        orientation,
        touchSupport,
        userAgent,
        screenWidth,
        screenHeight
      });
    };

    // Initial detection
    detectDevice();

    // Listen for resize events
    window.addEventListener('resize', detectDevice);
    window.addEventListener('orientationchange', detectDevice);

    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, []);

  return deviceInfo;
};

// Utility functions
export const isMobileDevice = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
};

export const isSmallScreen = () => {
  return window.innerWidth <= 768;
};

export const getDeviceType = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const screenWidth = window.innerWidth;

  if (/iphone|ipod|android.*mobile|blackberry|iemobile/i.test(userAgent) || screenWidth <= 768) {
    return 'mobile';
  } else if (/ipad|android(?!.*mobile)|tablet/i.test(userAgent) || (screenWidth > 768 && screenWidth <= 1024)) {
    return 'tablet';
  } else {
    return 'desktop';
  }
};