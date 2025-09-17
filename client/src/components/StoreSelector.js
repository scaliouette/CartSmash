import React, { useState, useRef, useEffect } from 'react';

const StoreSelector = ({ isOpen, onClose, onSelect, stores = [], selectedStore }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop to close selector when clicking outside */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'transparent',
          zIndex: 998, // Below the selector
        }}
        onClick={onClose}
      />

      {/* Store selector dropdown */}
      <div style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        border: '1px solid #e5e5e5',
        marginTop: '8px',
        zIndex: 999, // Keep it below modals (1000+)
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        {/* Store options */}
        {stores.map(store => (
          <div
            key={store.id || store.retailer_key}
            onClick={() => {
              onSelect(store);
              onClose();
            }}
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              borderBottom: '1px solid #f0f0f0',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            {/* Store logo */}
            <div style={{
              fontSize: '1.2rem',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {store.logo || store.retailer_logo_url ? (
                store.retailer_logo_url ? (
                  <img
                    src={store.retailer_logo_url}
                    alt={store.name}
                    style={{
                      width: '24px',
                      height: '24px',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <span>{store.logo}</span>
                )
              ) : (
                '🏪'
              )}
            </div>

            {/* Store info */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: '600',
                color: '#2c3e50',
                fontSize: '0.95rem'
              }}>
                {store.name}
              </div>
              <div style={{
                color: '#6b7280',
                fontSize: '0.8rem'
              }}>
                {store.estimatedDelivery || 'Delivery available'}
                {store.distance && ` • ${store.distance} miles`}
              </div>
            </div>

            {/* Selected indicator */}
            {(selectedStore?.id === store.id || selectedStore?.retailer_key === store.retailer_key) && (
              <div style={{
                color: '#28a745',
                fontWeight: 'bold',
                fontSize: '1.1rem'
              }}>
                ✓
              </div>
            )}

            {/* Unavailable overlay */}
            {!store.available && (
              <div style={{
                color: '#dc3545',
                fontSize: '0.8rem',
                fontWeight: '500'
              }}>
                Unavailable
              </div>
            )}
          </div>
        ))}

        {stores.length === 0 && (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#6c757d'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏪</div>
            <div>No stores available</div>
          </div>
        )}
      </div>
    </>
  );
};

// Enhanced StoreButton component with proper z-index management
const StoreButton = ({
  selectedStore,
  stores = [],
  onStoreSelect,
  loading = false,
  disabled = false
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        zIndex: isDropdownOpen ? 999 : 2 // Only elevate when open
      }}
    >
      {/* Store selector button */}
      <button
        onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
        disabled={disabled || loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e5e5',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          minWidth: '200px',
          opacity: disabled || loading ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          if (!disabled && !loading) {
            e.currentTarget.style.borderColor = '#007bff';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,123,255,0.15)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !loading) {
            e.currentTarget.style.borderColor = '#e5e5e5';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        {loading ? (
          <>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid #e3e3e3',
              borderTop: '2px solid #007bff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginRight: '8px'
            }} />
            <span>Loading...</span>
          </>
        ) : selectedStore ? (
          <>
            <div style={{
              fontSize: '1.2rem',
              marginRight: '8px'
            }}>
              {selectedStore.logo || '🏪'}
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{
                fontWeight: '600',
                color: '#2c3e50'
              }}>
                {selectedStore.name}
              </div>
              <div style={{
                color: '#6b7280',
                fontSize: '0.8rem'
              }}>
                {selectedStore.estimatedDelivery}
              </div>
            </div>
          </>
        ) : (
          <>
            <span style={{ marginRight: '8px' }}>🏪</span>
            <span>Select a store</span>
          </>
        )}

        <span style={{
          marginLeft: '8px',
          transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          ▼
        </span>
      </button>

      {/* Store selector dropdown - only renders when open */}
      <StoreSelector
        isOpen={isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
        onSelect={(store) => {
          onStoreSelect(store);
          setIsDropdownOpen(false);
        }}
        stores={stores}
        selectedStore={selectedStore}
      />

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export { StoreSelector, StoreButton };
export default StoreButton;