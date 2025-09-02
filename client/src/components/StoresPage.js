// client/src/components/StoresPage.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSmashCart } from '../contexts/SmashCartContext';
import { STORE_CHAINS, STORE_GROUPS, getActiveStores, getPlannedStores, STORE_STATUS } from '../config/storeConfig';
import KrogerAuth from './KrogerAuth';
import NearbyStores from './NearbyStores';

const StoresPage = ({ onStoreSelect, onBackToHome }) => {
  const { currentUser } = useAuth();
  const { initializeWithStore, isInitialized } = useSmashCart();
  const [krogerAuthComplete, setKrogerAuthComplete] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);

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
      // Do nothing here, let them start the Kroger auth process
    } else {
      // For planned stores, show coming soon message
      console.log(`${store.name} coming soon!`);
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
          <p>Select from our supported grocery stores</p>
        </div>
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
      </div>

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
      `}</style>
    </div>
  );
};

export default StoresPage;