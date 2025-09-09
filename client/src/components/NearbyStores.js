// client/src/components/NearbyStores.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';

const NearbyStores = ({ onStoreSelect }) => {
  const { currentUser } = useAuth();
  const [stores, setStores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [, setUserLocation] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    setGettingLocation(true);
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setGettingLocation(false);
      // Default to a common location (can be customized)
      searchStores({ lat: 39.7392, lng: -104.9903 }); // Denver, CO
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(location);
        setGettingLocation(false);
        searchStores(location);
      },
      (error) => {
        console.error('Error getting location:', error);
        setGettingLocation(false);
        
        // Fallback to ZIP code search or default location
        if (error.code === error.PERMISSION_DENIED) {
          setError('Location access denied. Please enter your ZIP code to find nearby stores.');
        } else {
          setError('Could not get your location. Using default area.');
          // Default to a common location
          searchStores({ lat: 39.7392, lng: -104.9903 }); // Denver, CO
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, []);

  // Search for nearby Kroger stores
  const searchStores = async (location, zipCode = null) => {
    if (!currentUser || typeof currentUser.getIdToken !== 'function') {
      setError('Please sign in to search for stores');
      setIsLoading(false);
      console.error('Invalid currentUser object:', currentUser);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();
      
      if (location) {
        searchParams.append('lat', location.lat);
        searchParams.append('lng', location.lng);
      }
      
      if (zipCode) {
        searchParams.append('zipCode', zipCode);
      }

      searchParams.append('radius', '25'); // 25 mile radius
      searchParams.append('limit', '20'); // Max 20 stores

      const response = await fetch(
        `${API_BASE_URL}/api/kroger/stores?${searchParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${await currentUser?.getIdToken?.()}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stores) {
          setStores(data.stores);
          if (data.stores.length === 0) {
            setError('No Kroger stores found in your area. Try expanding your search radius.');
          }
        } else {
          throw new Error(data.message || 'Failed to load stores');
        }
      } else {
        if (response.status === 401) {
          throw new Error('Please reconnect your Kroger account');
        } else {
          throw new Error(`Failed to load stores: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Error searching stores:', error);
      setError(error.message || 'Failed to load nearby stores');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle ZIP code search
  const handleZipSearch = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const zipCode = formData.get('zipCode')?.trim();
    
    if (!zipCode || !/^\d{5}(-\d{4})?$/.test(zipCode)) {
      setError('Please enter a valid ZIP code');
      return;
    }

    await searchStores(null, zipCode);
  };

  // Select a store
  const handleStoreSelect = (store) => {
    setSelectedStore(store);
    if (onStoreSelect) {
      onStoreSelect(store);
    }
  };

  // Get distance string
  const getDistanceString = (distance) => {
    if (!distance) return '';
    return `${distance.toFixed(1)} mi`;
  };

  // Get store hours string
  const getStoreHours = (store) => {
    if (!store.hours) return 'Hours not available';
    
    const today = new Date().getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayHours = store.hours.find(h => h.day === dayNames[today]);
    
    if (todayHours) {
      return `Today: ${todayHours.open} - ${todayHours.close}`;
    }
    
    return 'Hours vary';
  };

  if (isLoading || gettingLocation) {
    return (
      <div className="stores-container">
        <div className="stores-loading">
          <div className="spinner"></div>
          <h3>{gettingLocation ? 'Getting your location...' : 'Finding nearby stores...'}</h3>
          <p>Please wait while we search for Kroger stores near you</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stores-container">
      <div className="stores-header">
        <h2>🏪 Nearby Kroger Stores</h2>
        <p>Select a store to start shopping</p>
      </div>

      {error && (
        <div className="stores-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => getCurrentLocation()} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* ZIP Code Search */}
      <div className="zip-search">
        <form onSubmit={handleZipSearch} className="zip-form">
          <input
            type="text"
            name="zipCode"
            placeholder="Enter ZIP code"
            pattern="[0-9]{5}(-[0-9]{4})?"
            title="Please enter a valid ZIP code"
            className="zip-input"
          />
          <button type="submit" className="search-btn">
            Search
          </button>
        </form>
      </div>

      {/* Stores List */}
      {stores.length > 0 && (
        <div className="stores-list">
          {stores.map((store) => (
            <div
              key={store.locationId}
              className={`store-card ${selectedStore?.locationId === store.locationId ? 'selected' : ''}`}
              onClick={() => handleStoreSelect(store)}
            >
              <div className="store-info">
                <div className="store-header">
                  <h3>{store.name || 'Kroger'}</h3>
                  {store.distance && (
                    <span className="store-distance">
                      {getDistanceString(store.distance)}
                    </span>
                  )}
                </div>
                
                <div className="store-address">
                  <p>{store.address?.addressLine1}</p>
                  <p>
                    {store.address?.city}, {store.address?.state} {store.address?.zipCode}
                  </p>
                </div>

                <div className="store-details">
                  <div className="store-hours">
                    <span className="clock-icon">🕒</span>
                    {getStoreHours(store)}
                  </div>
                  
                  {store.phone && (
                    <div className="store-phone">
                      <span className="phone-icon">📞</span>
                      {store.phone}
                    </div>
                  )}
                </div>

                {/* Services */}
                {store.services && store.services.length > 0 && (
                  <div className="store-services">
                    {store.services.slice(0, 3).map((service, index) => (
                      <span key={index} className="service-tag">
                        {service}
                      </span>
                    ))}
                    {store.services.length > 3 && (
                      <span className="service-more">
                        +{store.services.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="store-action">
                <button className="select-btn">
                  {selectedStore?.locationId === store.locationId ? '✅ Selected' : 'Select Store'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedStore && (
        <div className="selected-store-actions">
          <button 
            className="continue-shopping-btn"
            onClick={() => onStoreSelect && onStoreSelect(selectedStore)}
          >
            Continue Shopping at {selectedStore.name || 'This Store'}
          </button>
        </div>
      )}

      <style jsx>{`
        .stores-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 1rem;
        }

        .stores-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .stores-header h2 {
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .stores-header p {
          color: #6b7280;
        }

        .stores-loading {
          text-align: center;
          padding: 3rem;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #f3f4f6;
          border-top: 3px solid #0070f3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        .stores-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #dc2626;
        }

        .retry-btn {
          background: #dc2626;
          color: white;
          border: none;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          margin-left: auto;
        }

        .zip-search {
          margin-bottom: 2rem;
        }

        .zip-form {
          display: flex;
          gap: 0.5rem;
          max-width: 300px;
          margin: 0 auto;
        }

        .zip-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
        }

        .search-btn {
          background: #0070f3;
          color: white;
          border: none;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }

        .stores-list {
          display: grid;
          gap: 1rem;
        }

        .store-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .store-card:hover {
          border-color: #0070f3;
          box-shadow: 0 4px 12px rgba(0,112,243,0.1);
        }

        .store-card.selected {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .store-info {
          flex: 1;
        }

        .store-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .store-header h3 {
          margin: 0;
          color: #1f2937;
        }

        .store-distance {
          color: #0070f3;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .store-address {
          margin-bottom: 1rem;
        }

        .store-address p {
          margin: 0.25rem 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .store-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 1rem;
        }

        .store-hours, .store-phone {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #4b5563;
        }

        .store-services {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .service-tag {
          background: #e0e7ff;
          color: #3730a3;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .service-more {
          color: #6b7280;
          font-size: 0.75rem;
        }

        .store-action {
          margin-left: 1rem;
        }

        .select-btn {
          background: #0070f3;
          color: white;
          border: none;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          white-space: nowrap;
        }

        .store-card.selected .select-btn {
          background: #10b981;
        }

        .selected-store-actions {
          margin-top: 2rem;
          text-align: center;
        }

        .continue-shopping-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .continue-shopping-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16,185,129,0.3);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .store-card {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .store-header {
            flex-direction: column;
            gap: 0.5rem;
          }

          .store-action {
            margin-left: 0;
          }

          .store-details {
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};

export default NearbyStores;