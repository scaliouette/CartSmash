// client/src/components/StoresPage.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSmashCart } from '../contexts/SmashCartContext';
import { getActiveStores, getPlannedStores, STORE_STATUS } from '../config/storeConfig';
import KrogerAuth from './KrogerAuth';
import NearbyStores from './NearbyStores';
import instacartService from '../services/instacartService';

const StoresPage = ({ onStoreSelect, onBackToHome }) => {
  const { currentUser } = useAuth();
  const { initializeWithStore } = useSmashCart();
  const [krogerAuthComplete, setKrogerAuthComplete] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Instacart-specific state
  const [instacartRetailers, setInstacartRetailers] = useState([]);
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [isLoadingRetailers, setIsLoadingRetailers] = useState(false);
  const [instacartActive, setInstacartActive] = useState(false);

  // Handle successful Kroger authentication
  const handleKrogerAuthSuccess = (authData) => {
    console.log('✅ Kroger authentication successful:', authData);
    setKrogerAuthComplete(true);
  };

  // Handle store selection
  const handleStoreSelect = (store) => {
    console.log('🏪 Store selected:', store);
    setSelectedStore(store);
    
    // Save selected store to localStorage for persistence
    localStorage.setItem('selectedStore', JSON.stringify({
      locationId: store.locationId,
      name: store.name,
      address: store.address,
      phone: store.phone,
      selectedAt: new Date().toISOString()
    }));
    
    // Initialize SmashCart using context
    initializeWithStore(store);
    
    // Notify parent component
    if (onStoreSelect) {
      onStoreSelect(store);
    }
  };

  // Check if user is signed in
  if (!currentUser) {
    return (
      <div className="stores-page">
        <div className="auth-required">
          <div className="auth-required-content">
            <h2>🔐 Sign In Required</h2>
            <p>Please sign in to your account to find nearby stores and start shopping.</p>
            <button 
              className="back-btn"
              onClick={onBackToHome}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeStores = getActiveStores();
  const plannedStores = getPlannedStores();
  const allStores = [...activeStores, ...plannedStores];

  const handleStoreCardClick = (store) => {
    if (store.status === 'active' && store.id === 'kroger') {
      // For Kroger, proceed with auth flow
      setInstacartActive(false);
      // Do nothing here, let them start the Kroger auth process
    } else if (store.status === 'active' && store.id === 'instacart') {
      // For Instacart, load nearby retailers
      setInstacartActive(true);
      setKrogerAuthComplete(false); // Clear Kroger state
      loadInstacartRetailers();
    } else {
      // For planned stores, show coming soon message
      console.log(`${store.name} coming soon!`);
    }
  };

  // Load Instacart retailers when user selects Instacart
  const loadInstacartRetailers = async () => {
    setIsLoadingRetailers(true);
    
    try {
      const userZipCode = localStorage.getItem('userZipCode') || '95670';
      const response = await instacartService.getNearbyRetailers(userZipCode);
      
      if (response.success) {
        setInstacartRetailers(response.retailers);
        console.log('✅ Loaded', response.retailers.length, 'Instacart retailers');
      }
    } catch (error) {
      console.error('❌ Error loading Instacart retailers:', error);
    } finally {
      setIsLoadingRetailers(false);
    }
  };

  // Handle Instacart retailer selection
  const handleRetailerSelect = (retailer) => {
    console.log('🏪 Instacart retailer selected:', retailer);
    setSelectedRetailer(retailer);
    
    // Save selected retailer to localStorage for persistence
    localStorage.setItem('selectedRetailer', JSON.stringify({
      id: retailer.id,
      name: retailer.name,
      address: retailer.address,
      selectedAt: new Date().toISOString()
    }));
    
    // Initialize SmashCart with Instacart retailer
    const storeData = {
      locationId: retailer.id,
      name: `${retailer.name} (via Instacart)`,
      address: retailer.address,
      platform: 'instacart'
    };
    
    initializeWithStore(storeData);
    
    // Notify parent component
    if (onStoreSelect) {
      onStoreSelect(storeData);
    }
  };

  // Handle logout from current store
  const handleStoreLogout = async () => {
    try {
      console.log('🔓 Logging out from store...');
      
      // Clear Kroger authentication state
      setKrogerAuthComplete(false);
      setSelectedStore(null);
      
      // Clear Instacart state
      setInstacartActive(false);
      setSelectedRetailer(null);
      setInstacartRetailers([]);
      
      // Clear stored data
      localStorage.removeItem('selectedStore');
      localStorage.removeItem('selectedRetailer');
      localStorage.removeItem('kroger_auth_status');
      
      // Call API to clear server-side authentication
      if (currentUser) {
        const response = await fetch('/api/auth/kroger/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-ID': currentUser.uid
          }
        });
        
        if (response.ok) {
          console.log('✅ Server-side logout successful');
        } else {
          console.warn('⚠️ Server-side logout failed, but local state cleared');
        }
      }
      
      setShowLogoutConfirm(false);
      console.log('✅ Store logout complete');
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Clear local state even if API call fails
      setKrogerAuthComplete(false);
      setSelectedStore(null);
      setInstacartActive(false);
      setSelectedRetailer(null);
      setInstacartRetailers([]);
      localStorage.removeItem('selectedStore');
      localStorage.removeItem('selectedRetailer');
      localStorage.removeItem('kroger_auth_status');
      setShowLogoutConfirm(false);
    }
  };

  return (
    <div className="stores-page">
      {/* Header */}
      <div className="stores-page-header">
        <button className="back-btn" onClick={onBackToHome}>
          ← Back to Home
        </button>
        <div className="page-title">
          <h1>Choose Your Store</h1>
          <p>Select your preferred grocery store to get started</p>
        </div>
        {(krogerAuthComplete || selectedStore || selectedRetailer) && (
          <button 
            className="logout-btn"
            onClick={() => setShowLogoutConfirm(true)}
            title="Logout from store"
          >
            🔓 Logout
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="stores-page-content">
        {/* Store Selection Grid */}
        <div className="stores-grid">
          {allStores.map((store) => {
            const status = STORE_STATUS[store.status];
            return (
              <div 
                key={store.id} 
                className={`store-card ${store.status}`}
                onClick={() => handleStoreCardClick(store)}
              >
                <div className="store-header" style={{ backgroundColor: store.branding.primaryColor }}>
                  <div className="store-icon">{store.branding.icon}</div>
                  <div className="store-name">{store.displayName}</div>
                </div>
                
                <div className="store-info">
                  <div className="store-status" style={{ color: status.color }}>
                    <span className="status-badge" style={{ backgroundColor: status.color }}>
                      {status.label}
                    </span>
                  </div>
                  
                  <div className="store-features">
                    {store.features.delivery && <span className="feature">🚚 Delivery</span>}
                    {store.features.curbsidePickup && <span className="feature">🚗 Pickup</span>}
                    {store.features.loyaltyProgram && <span className="feature">⭐ Rewards</span>}
                    {store.features.organicFocus && <span className="feature">🌱 Organic</span>}
                  </div>
                  
                  <div className="store-regions">
                    <small>{store.regions.join(', ')}</small>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Kroger Integration Section - Only show if user clicked on Kroger */}
        {selectedStore?.id === 'kroger' || (!selectedStore && krogerAuthComplete) ? (
          <div className="kroger-integration">
            {!krogerAuthComplete ? (
              // Step 1: Kroger Authentication
              <div className="auth-step">
                <div className="step-indicator">
                  <div className="step active">1</div>
                  <div className="step-line"></div>
                  <div className="step">2</div>
                  <div className="step-line"></div>
                  <div className="step">3</div>
                </div>
                <div className="step-title">
                  <h3>Connect to Kroger</h3>
                  <p>Authenticate with your Kroger account</p>
                </div>
                <KrogerAuth onAuthSuccess={handleKrogerAuthSuccess} />
              </div>
            ) : !selectedStore ? (
              // Step 2: Store Selection
              <div className="stores-step">
                <div className="step-indicator">
                  <div className="step completed">✓</div>
                  <div className="step-line completed"></div>
                  <div className="step active">2</div>
                  <div className="step-line"></div>
                  <div className="step">3</div>
                </div>
                <div className="step-title">
                  <h3>Choose Your Kroger Store</h3>
                  <p>Select your preferred Kroger location</p>
                </div>
                <NearbyStores onStoreSelect={handleStoreSelect} />
              </div>
            ) : (
              // Step 3: Ready to Shop
              <div className="ready-step">
                <div className="step-indicator">
                  <div className="step completed">✓</div>
                  <div className="step-line completed"></div>
                  <div className="step completed">✓</div>
                  <div className="step-line completed"></div>
                  <div className="step active">3</div>
                </div>
                <div className="step-title">
                  <h3>🛒 SmashCart Ready!</h3>
                  <p>SmashCart is now connected to {selectedStore.name}</p>
                </div>
                
                <div className="ready-content">
                  <div className="selected-store-summary">
                    <div className="store-icon">🏪</div>
                    <div className="store-details">
                      <h4>{selectedStore.name}</h4>
                      <p>{selectedStore.address?.addressLine1}</p>
                      <p>{selectedStore.address?.city}, {selectedStore.address?.state} {selectedStore.address?.zipCode}</p>
                      {selectedStore.phone && <p>📞 {selectedStore.phone}</p>}
                    </div>
                  </div>

                  <div className="ready-actions">
                    <button 
                      className="start-shopping-btn"
                      onClick={() => onBackToHome && onBackToHome()}
                    >
                      🛒 Start Shopping
                    </button>
                    
                    <button 
                      className="change-store-btn"
                      onClick={() => {
                        setSelectedStore(null);
                        localStorage.removeItem('selectedStore');
                      }}
                    >
                      Change Store
                    </button>
                  </div>

                  <div className="next-steps">
                    <h5>SmashCart Features Active:</h5>
                    <ul>
                      <li>✅ Full cart management (GET/POST/PUT/DELETE)</li>
                      <li>🏪 Store location and service information</li>
                      <li>🛒 Enhanced product details and pricing</li>
                      <li>📊 Cart analytics and summaries</li>
                      <li>🔍 Smart product search integration</li>
                      <li>⚡ Quick-add functionality</li>
                      <li>🚚 Pickup and delivery coordination</li>
                      <li>📱 Real-time cart synchronization</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Instacart Integration Section */}
        {instacartActive && (
          <div className="instacart-integration-section">
            <div className="integration-header">
              <h3>🛒 Instacart Retailer Selection</h3>
              <p>Choose from available retailers in your area through Instacart</p>
            </div>
            
            {isLoadingRetailers ? (
              <div className="loading-retailers">
                <div className="loading-spinner"></div>
                <p>Finding retailers near you...</p>
              </div>
            ) : instacartRetailers.length > 0 ? (
              <div className="retailers-grid">
                {instacartRetailers.map((retailer) => (
                  <div 
                    key={retailer.id} 
                    className={`retailer-card ${selectedRetailer?.id === retailer.id ? 'selected' : ''}`}
                    onClick={() => handleRetailerSelect(retailer)}
                  >
                    <div className="retailer-info">
                      <div className="retailer-name">{retailer.name}</div>
                      <div className="retailer-address">{retailer.address}</div>
                      <div className="retailer-details">
                        <span className="delivery-time">🚚 {retailer.estimated_delivery}</span>
                        <span className="delivery-fee">💰 ${retailer.delivery_fee}</span>
                        <span className="distance">📍 {retailer.distance} mi</span>
                      </div>
                    </div>
                    {selectedRetailer?.id === retailer.id && (
                      <div className="selected-indicator">✓</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-retailers">
                <p>No Instacart retailers found in your area.</p>
                <button onClick={loadInstacartRetailers} className="retry-btn">
                  🔄 Try Again
                </button>
              </div>
            )}
            
            {selectedRetailer && (
              <div className="instacart-ready">
                <div className="ready-header">
                  <h4>🎉 Ready to Shop with Instacart!</h4>
                  <p>Selected: {selectedRetailer.name}</p>
                </div>
                <div className="ready-actions">
                  <button 
                    className="start-shopping-btn"
                    onClick={onBackToHome}
                  >
                    🛒 Start Shopping
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="logout-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="logout-modal-header">
              <h3>🔓 Logout from Store</h3>
            </div>
            <div className="logout-modal-body">
              <p>Are you sure you want to logout from your current store?</p>
              <p className="logout-warning">This will:</p>
              <ul>
                <li>Clear your Kroger authentication</li>
                <li>Remove store selection</li>
                <li>Reset your cart connection</li>
                <li>Require re-authentication to use store features</li>
              </ul>
            </div>
            <div className="logout-modal-actions">
              <button 
                className="logout-cancel-btn"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="logout-confirm-btn"
                onClick={handleStoreLogout}
              >
                🔓 Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .stores-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding-bottom: 2rem;
        }

        .stores-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }

        .store-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .store-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }

        .store-card.active {
          border-color: #10b981;
          box-shadow: 0 4px 12px rgba(16,185,129,0.3);
        }

        .store-card.active:hover {
          box-shadow: 0 8px 25px rgba(16,185,129,0.4);
        }

        .store-card.planned {
          opacity: 0.8;
        }

        .store-header {
          padding: 1.5rem;
          color: white;
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
        }

        .store-header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: rgba(255,255,255,0.3);
        }

        .store-icon {
          font-size: 2rem;
        }

        .store-name {
          font-size: 1.25rem;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .store-info {
          padding: 1.5rem;
        }

        .store-status {
          margin-bottom: 1rem;
        }

        .status-badge {
          display: inline-block;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .store-features {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .feature {
          background: #f3f4f6;
          color: #4b5563;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .store-regions {
          color: #6b7280;
          font-size: 0.75rem;
        }

        .kroger-integration {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e5e7eb;
        }

        .logout-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .logout-modal {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          max-width: 450px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .logout-modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          text-align: center;
        }

        .logout-modal-header h3 {
          margin: 0;
          color: #1f2937;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .logout-modal-body {
          padding: 1.5rem;
        }

        .logout-modal-body p {
          margin: 0 0 1rem 0;
          color: #4b5563;
          line-height: 1.5;
        }

        .logout-warning {
          font-weight: 600;
          color: #dc2626 !important;
          margin-bottom: 0.5rem !important;
        }

        .logout-modal-body ul {
          margin: 0 0 1rem 0;
          padding-left: 1.5rem;
          color: #6b7280;
        }

        .logout-modal-body li {
          margin: 0.5rem 0;
          font-size: 0.875rem;
        }

        .logout-modal-actions {
          padding: 1rem 1.5rem 1.5rem;
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .logout-cancel-btn {
          background: #f3f4f6;
          color: #4b5563;
          border: 1px solid #d1d5db;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .logout-cancel-btn:hover {
          background: #e5e7eb;
          color: #1f2937;
        }

        .logout-confirm-btn {
          background: #dc2626;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .logout-confirm-btn:hover {
          background: #b91c1c;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .stores-page-header {
          background: white;
          padding: 1rem 2rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 2rem;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .back-btn {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          color: #4b5563;
          transition: all 0.2s ease;
        }

        .back-btn:hover {
          background: #e5e7eb;
          color: #1f2937;
        }

        .logout-btn {
          background: #dc2626;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .logout-btn:hover {
          background: #b91c1c;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
        }

        .page-title h1 {
          margin: 0 0 0.25rem 0;
          color: #1f2937;
          font-size: 1.5rem;
        }

        .page-title p {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .stores-page-content {
          max-width: 900px;
          margin: 2rem auto;
          padding: 0 1rem;
        }

        .auth-step, .stores-step, .ready-step {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
          gap: 0;
        }

        .step {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e5e7eb;
          color: #6b7280;
          font-weight: 600;
          font-size: 1rem;
        }

        .step.active {
          background: #FF6B35;
          color: white;
        }

        .step.completed {
          background: #10b981;
          color: white;
        }

        .step-line {
          width: 60px;
          height: 2px;
          background: #e5e7eb;
        }

        .step-line.completed {
          background: #10b981;
        }

        .step-title {
          text-align: center;
          margin-bottom: 2rem;
        }

        .step-title h3 {
          margin: 0 0 0.5rem 0;
          color: #1f2937;
          font-size: 1.25rem;
        }

        .step-title p {
          margin: 0;
          color: #6b7280;
        }

        .auth-required {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          padding: 2rem;
        }

        .auth-required-content {
          background: white;
          padding: 3rem;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          max-width: 400px;
        }

        .auth-required-content h2 {
          color: #1f2937;
          margin-bottom: 1rem;
        }

        .auth-required-content p {
          color: #6b7280;
          margin-bottom: 2rem;
          line-height: 1.5;
        }

        .ready-content {
          text-align: center;
        }

        .selected-store-summary {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .store-icon {
          font-size: 2rem;
        }

        .store-details {
          text-align: left;
          flex: 1;
        }

        .store-details h4 {
          margin: 0 0 0.5rem 0;
          color: #065f46;
          font-size: 1.1rem;
        }

        .store-details p {
          margin: 0.25rem 0;
          color: #047857;
          font-size: 0.875rem;
        }

        .ready-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 2rem;
        }

        .start-shopping-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .start-shopping-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16,185,129,0.3);
        }

        .change-store-btn {
          background: #f3f4f6;
          color: #4b5563;
          border: 1px solid #d1d5db;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .change-store-btn:hover {
          background: #e5e7eb;
          color: #1f2937;
        }

        .next-steps {
          background: #fafbfc;
          border-radius: 8px;
          padding: 1.5rem;
          text-align: left;
          max-width: 400px;
          margin: 0 auto;
        }

        .next-steps h5 {
          margin: 0 0 1rem 0;
          color: #1f2937;
        }

        .next-steps ul {
          margin: 0;
          padding-left: 1.5rem;
          list-style: none;
        }

        .next-steps li {
          margin: 0.5rem 0;
          color: #4b5563;
          font-size: 0.875rem;
        }

        @media (max-width: 768px) {
          .stores-page-header {
            padding: 1rem;
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .stores-grid {
            grid-template-columns: 1fr;
            padding: 0 1rem;
          }

          .step-indicator {
            flex-direction: column;
            gap: 0.5rem;
          }

          .step-line {
            width: 2px;
            height: 30px;
          }

          .ready-actions {
            flex-direction: column;
          }

          .selected-store-summary {
            flex-direction: column;
            text-align: center;
          }

          .store-details {
            text-align: center;
          }
        }

        /* Instacart Integration Styles */
        .instacart-integration-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          margin: 2rem 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }

        .integration-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .integration-header h3 {
          color: #00B14F;
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
        }

        .integration-header p {
          color: #6b7280;
          margin: 0;
        }

        .loading-retailers {
          text-align: center;
          padding: 2rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f4f6;
          border-top: 3px solid #00B14F;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .retailers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .retailer-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .retailer-card:hover {
          border-color: #00B14F;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,177,79,0.1);
        }

        .retailer-card.selected {
          border-color: #00B14F;
          background: #f0fdf4;
        }

        .retailer-info {
          text-align: left;
        }

        .retailer-name {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
        }

        .retailer-address {
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }

        .retailer-details {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.875rem;
        }

        .retailer-details span {
          color: #4b5563;
        }

        .selected-indicator {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: #00B14F;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .no-retailers {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .retry-btn {
          background: #00B14F;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          margin-top: 1rem;
          transition: all 0.2s ease;
        }

        .retry-btn:hover {
          background: #059142;
        }

        .instacart-ready {
          background: #f0fdf4;
          border: 2px solid #00B14F;
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 2rem;
          text-align: center;
        }

        .ready-header h4 {
          color: #00B14F;
          margin: 0 0 0.5rem 0;
          font-size: 1.3rem;
        }

        .ready-header p {
          color: #4b5563;
          margin: 0 0 1.5rem 0;
        }

        @media (max-width: 768px) {
          .instacart-integration-section {
            padding: 1rem;
            margin: 1rem 0;
          }

          .retailers-grid {
            grid-template-columns: 1fr;
          }

          .retailer-details {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default StoresPage;