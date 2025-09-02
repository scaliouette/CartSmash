// client/src/components/Header.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import AdminDashboard from './AdminDashboard';
import { ButtonSpinner } from './LoadingSpinner';

function Header({ currentView, onViewChange }) {
  const { currentUser, signOut, isLoading, isAdmin } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="logo-container" onClick={() => onViewChange('home')}>
            <div className="logo-icon">💥</div>
            <span className="logo-text">CARTSMASH</span>
          </div>
          
          {currentUser && (
            <nav className="nav">
              <button
                onClick={() => onViewChange('home')}
                className={`nav-button ${currentView === 'home' ? 'nav-button-active' : ''}`}
              >
                🏠 Home
              </button>
              <button
                onClick={() => onViewChange('stores')}
                className={`nav-button ${currentView === 'stores' ? 'nav-button-active' : ''}`}
              >
                🏪 Stores
              </button>
              <button
                onClick={() => onViewChange('account')}
                className={`nav-button ${currentView === 'account' ? 'nav-button-active' : ''}`}
              >
                👤 My Account
              </button>
              
              {isAdmin && (
                <button
                  onClick={() => setShowAdminDashboard(true)}
                  className="nav-button"
                  style={{ backgroundColor: '#ef4444', color: 'white', border: '2px solid #ef4444' }}
                >
                  🛠️ Admin
                </button>
              )}
            </nav>
          )}
          
          <div className="header-actions">
            {isLoading ? (
              <span className="loading-text">
                <ButtonSpinner color="#6b7280" /> Loading...
              </span>
            ) : currentUser ? (
              <div className="user-section">
                <span className="user-name">
                  {currentUser.displayName || currentUser.email.split('@')[0]}
                  {isAdmin && ' (Admin)'}
                </span>
                <button onClick={signOut} className="sign-out-btn">
                  Sign Out
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="cta-button">
                🔐 Sign In
              </button>
            )}
          </div>
        </div>
      </header>
      
      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
      
      {showAdminDashboard && isAdmin && (
        <AdminDashboard onClose={() => setShowAdminDashboard(false)} currentUser={currentUser} />
      )}
    </>
  );
}

export default Header;