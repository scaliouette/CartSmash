// client/src/components/Header.js
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import AuthModal from './AuthModal';
import AdminDashboard from './AdminDashboard';
import { ButtonSpinner } from './LoadingSpinner';

function Header({ currentView, onViewChange }) {
  const { currentUser, signOut, isLoading, isAdmin } = useAuth();
  const deviceInfo = useDeviceDetection();
  const isMobile = deviceInfo.isMobile || window.innerWidth <= 768;

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleViewChange = (view) => {
    onViewChange(view);
    setShowDropdown(false);
  };

  const userName = currentUser?.displayName?.split(' ')[0] ||
                   currentUser?.email?.split('@')[0] ||
                   'User';

  return (
    <>
      <header style={styles.header}>
        {/* Logo Section */}
        <div style={styles.logoSection} onClick={() => handleViewChange('home')}>
          {isMobile ? (
            // Mobile header logo - compact version
            <svg width="120" height="32" viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(3, 8)">
                {/* Enhanced smash burst effect */}
                <path d="M12 8 L6 4 M12 8 L6 12 M12 8 L2 8" stroke="#FB4F14" strokeWidth="1.5" opacity="0.8"/>
                <path d="M12 8 L7 1 M12 8 L1 5 M12 8 L1 11" stroke="#FB4F14" strokeWidth="1" opacity="0.6"/>

                {/* Shopping cart */}
                <path d="M10 6 L14 6 L16 14 L26 14 L28 8 L16 8" stroke="#002244" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="18" cy="18" r="1.5" fill="#FB4F14"/>
                <circle cx="24" cy="18" r="1.5" fill="#FB4F14"/>

                {/* Impact lines */}
                <path d="M29 8 L32 6 M29 10 L32 12 M28 14 L31 16" stroke="#FB4F14" strokeWidth="1.5" strokeLinecap="round"/>
              </g>

              <text x="40" y="20" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold">
                <tspan fill="#002244">CART</tspan><tspan fill="#FB4F14">SMASH</tspan>
              </text>
            </svg>
          ) : (
            // Desktop header logo - full version
            <svg width="160" height="36" viewBox="0 0 160 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(5, 10)">
                {/* Enhanced smash burst effect */}
                <path d="M15 8 L8 4 M15 8 L8 12 M15 8 L3 8" stroke="#FB4F14" strokeWidth="1.5" opacity="0.8"/>
                <path d="M15 8 L10 1 M15 8 L3 5 M15 8 L3 11" stroke="#FB4F14" strokeWidth="1" opacity="0.6"/>

                {/* Shopping cart */}
                <path d="M13 6 L17 6 L19 16 L31 16 L33 9 L19 9" stroke="#002244" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="21" cy="20" r="2" fill="#FB4F14"/>
                <circle cx="29" cy="20" r="2" fill="#FB4F14"/>

                {/* Impact lines */}
                <path d="M34 9 L37 7 M34 12 L37 14 M33 16 L36 18" stroke="#FB4F14" strokeWidth="1.5" strokeLinecap="round"/>
              </g>

              <text x="50" y="22" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="bold">
                <tspan fill="#002244">CART</tspan><tspan fill="#FB4F14">SMASH</tspan>
              </text>
            </svg>
          )}
        </div>

        {/* Navigation + User Section */}
        <div style={styles.navSection}>
          {/* Quick Home Nav (Always Visible) */}
          {currentUser && (
            <nav style={styles.mainNav}>
              <button
                onClick={() => handleViewChange('home')}
                style={{
                  ...styles.navLink,
                  ...(currentView === 'home' ? styles.navLinkActive : {})
                }}
              >
                <span style={styles.navIcon}>🏠</span>
                <span style={{...styles.navText, display: isMobile ? 'none' : 'inline'}}>
                  Home
                </span>
              </button>
            </nav>
          )}

          {/* User Menu or Sign In */}
          {isLoading ? (
            <div style={styles.loadingContainer}>
              <ButtonSpinner color="#6b7280" />
              <span style={styles.loadingText}>Loading...</span>
            </div>
          ) : currentUser ? (
            <div style={styles.userMenu} ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={styles.userButton}
              >
                <span style={styles.userName}>{userName}</span>
                {isAdmin && <span style={styles.adminBadge}>Admin</span>}
                <span style={{...styles.dropdownArrow, transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)'}}>
                  ▼
                </span>
              </button>

              {showDropdown && (
                <div style={styles.dropdown}>
                  <button
                    onClick={() => handleViewChange('account')}
                    style={{
                      ...styles.dropdownItem,
                      ...(currentView === 'account' ? styles.dropdownItemActive : {})
                    }}
                  >
                    <span>👤</span> My Account
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setShowAdminDashboard(true);
                        setShowDropdown(false);
                      }}
                      style={styles.dropdownItemAdmin}
                    >
                      <span>⚙️</span> Admin Dashboard
                    </button>
                  )}

                  <button
                    onClick={() => {
                      signOut();
                      setShowDropdown(false);
                    }}
                    style={styles.signOutButton}
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              style={styles.signInButton}
            >
              🔐 <span style={{display: isMobile ? 'none' : 'inline'}}>Sign In</span>
            </button>
          )}
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

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: 'white',
    borderBottom: '2px solid #002244',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    height: '60px',
    boxSizing: 'border-box',
    gap: '12px'
  },

  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: '0 0 auto',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    minWidth: '36px'
  },

  logoIcon: {
    fontSize: '28px',
    lineHeight: 1
  },

  logoText: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#002244',
    letterSpacing: '0.5px'
  },

  navSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: '1 1 auto',
    justifyContent: 'flex-end'
  },

  mainNav: {
    display: 'flex',
    gap: '8px'
  },

  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    color: '#002244',
    border: '2px solid transparent',
    borderRadius: '8px',
    transition: 'all 0.2s',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    minHeight: '44px'
  },

  navLinkActive: {
    backgroundColor: '#F0F4F8',
    borderColor: '#002244'
  },

  navIcon: {
    fontSize: '18px'
  },

  navText: {
    fontSize: '14px'
  },

  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    color: '#6b7280',
    fontSize: '14px'
  },

  loadingText: {
    display: 'none'
  },

  userMenu: {
    position: 'relative'
  },

  userButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#FB4F14',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    minHeight: '44px',
    minWidth: '44px'
  },

  userName: {
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },

  adminBadge: {
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  dropdownArrow: {
    fontSize: '10px',
    transition: 'transform 0.2s',
    marginLeft: 'auto'
  },

  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    border: '1px solid #E0E0E0',
    minWidth: '180px',
    overflow: 'hidden',
    zIndex: 1001
  },

  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 16px',
    color: '#002244',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
    textAlign: 'left'
  },

  dropdownItemActive: {
    backgroundColor: '#F0F4F8',
    color: '#FB4F14',
    fontWeight: '600'
  },

  dropdownItemAdmin: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 16px',
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: 'none',
    borderTop: '1px solid #E0E0E0',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
    textAlign: 'left'
  },

  signOutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#F8F9FA',
    color: '#DC3545',
    border: 'none',
    borderTop: '1px solid #E0E0E0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background 0.2s',
    textAlign: 'left'
  },

  signInButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#002244',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    minHeight: '44px',
    minWidth: '44px'
  }
};

export default Header;