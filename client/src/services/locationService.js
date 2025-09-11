// client/src/services/locationService.js
// Location-based services for CartSmash

class LocationService {
  constructor() {
    this.currentLocation = null;
    this.lastKnownZip = localStorage.getItem('cartsmash_last_zip') || '';
    
    // Check if geolocation is supported
    this.geolocationSupported = 'geolocation' in navigator;
    
    console.log('🗺️ LocationService initialized:', {
      geolocationSupported: this.geolocationSupported,
      lastKnownZip: this.lastKnownZip
    });
  }

  // Get user's current location using browser geolocation
  async getCurrentLocation(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    if (!this.geolocationSupported) {
      throw new Error('Geolocation is not supported by this browser');
    }

    return new Promise((resolve, reject) => {
      console.log('📍 Requesting current location...');
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          
          console.log('✅ Location acquired:', this.currentLocation);
          resolve(this.currentLocation);
        },
        (error) => {
          console.error('❌ Geolocation error:', error);
          let message = 'Unable to retrieve location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out';
              break;
          }
          
          reject(new Error(message));
        },
        finalOptions
      );
    });
  }

  // Convert coordinates to ZIP code using reverse geocoding
  async coordinatesToZipCode(lat, lng) {
    try {
      console.log('🔍 Converting coordinates to ZIP:', { lat, lng });
      
      // Use a reverse geocoding service (OpenStreetMap Nominatim - free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'CartSmash/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }
      
      const data = await response.json();
      const zipCode = data.address?.postcode;
      
      if (zipCode) {
        console.log('✅ ZIP code found:', zipCode);
        this.saveZipCode(zipCode);
        return zipCode;
      } else {
        throw new Error('ZIP code not found in response');
      }
      
    } catch (error) {
      console.error('❌ Error in reverse geocoding:', error);
      throw error;
    }
  }

  // Get ZIP code from current location
  async getZipFromCurrentLocation() {
    try {
      const location = await this.getCurrentLocation();
      return await this.coordinatesToZipCode(location.latitude, location.longitude);
    } catch (error) {
      console.error('❌ Error getting ZIP from location:', error);
      throw error;
    }
  }

  // Validate ZIP code format
  isValidZipCode(zip) {
    // US ZIP code validation (5 digits or 5+4 format)
    const zipRegex = /^\d{5}(-\d{4})?$/;
    return zipRegex.test(zip);
  }

  // Save ZIP code to localStorage
  saveZipCode(zipCode) {
    if (this.isValidZipCode(zipCode)) {
      this.lastKnownZip = zipCode;
      localStorage.setItem('cartsmash_last_zip', zipCode);
      console.log('💾 ZIP code saved:', zipCode);
    }
  }

  // Get saved ZIP code
  getSavedZipCode() {
    return this.lastKnownZip;
  }

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 3958.756; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  // Convert degrees to radians
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Get location permissions status
  async getPermissionStatus() {
    if ('permissions' in navigator) {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state; // 'granted', 'denied', or 'prompt'
    }
    return 'unknown';
  }

  // Check if location is stale (older than specified minutes)
  isLocationStale(maxAgeMinutes = 30) {
    if (!this.currentLocation) return true;
    
    const ageMinutes = (Date.now() - this.currentLocation.timestamp) / (1000 * 60);
    return ageMinutes > maxAgeMinutes;
  }

  // Format location for display
  formatLocation(location) {
    if (!location) return 'Unknown';
    
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  }

  // Get connection information
  getConnectionInfo() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    
    return null;
  }

  // Check if user is online
  isOnline() {
    return navigator.onLine;
  }
}

// Export singleton instance
const locationService = new LocationService();
export default locationService;