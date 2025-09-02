// client/src/components/KrogerAuth.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';

const KrogerAuth = ({ onAuthSuccess }) => {
  const { currentUser } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authStatus, setAuthStatus] = useState('checking'); // checking, needed, authenticating, success, error

  useEffect(() => {
    if (currentUser) {
      checkKrogerAuthStatus();
    }
  }, [currentUser]);

  // Check if user already has Kroger authentication
  const checkKrogerAuthStatus = async () => {
    if (!currentUser || typeof currentUser.getIdToken !== 'function') {
      console.error('Invalid currentUser object:', currentUser);
      setAuthStatus('needed');
      return;
    }

    try {
      setAuthStatus('checking');
      const response = await fetch(`${API_BASE_URL}/api/auth/kroger/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await currentUser?.getIdToken?.()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setAuthStatus('success');
          if (onAuthSuccess) onAuthSuccess(data);
        } else {
          setAuthStatus('needed');
        }
      } else {
        setAuthStatus('needed');
      }
    } catch (error) {
      console.error('Error checking Kroger auth status:', error);
      setAuthStatus('needed');
    }
  };

  // Start Kroger OAuth flow
  const initiateKrogerAuth = async () => {
    if (!currentUser || typeof currentUser.getIdToken !== 'function') {
      setAuthError('Please sign in to your account first');
      console.error('Invalid currentUser object:', currentUser);
      return;
    }

    try {
      console.log('🔗 Starting Kroger authentication for user:', currentUser.uid);
      setIsAuthenticating(true);
      setAuthError(null);
      setAuthStatus('authenticating');

      const response = await fetch(`${API_BASE_URL}/api/auth/kroger/login?userId=${currentUser.uid}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await currentUser?.getIdToken?.()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Kroger auth response:', data);
        
        if (data.success) {
          let authURL = null;
          
          // Try to find Legacy OAuth option first (should work with your client ID)
          if (data.alternatives) {
            const legacyOption = data.alternatives.find(alt => alt.url?.authType === 'legacy_oauth');
            if (legacyOption && legacyOption.url?.authURL) {
              authURL = legacyOption.url.authURL;
              console.log('🚀 Using Legacy OAuth:', authURL);
            }
          }
          
          // Fallback to primary if no legacy option
          if (!authURL && data.primary && data.primary.url && data.primary.url.authURL) {
            authURL = data.primary.url.authURL;
            console.log('🚀 Using Primary OAuth:', authURL);
          }
          
          if (authURL) {
            window.location.href = authURL;
          } else {
            throw new Error('No valid OAuth URL found in response');
          }
        } else {
          console.error('❌ Invalid auth response structure:', data);
          throw new Error('Invalid authentication response');
        }
      } else {
        throw new Error(`Authentication request failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error initiating Kroger auth:', error);
      setAuthError(error.message || 'Failed to start authentication');
      setAuthStatus('error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle URL parameters after OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      setAuthError(`Authentication failed: ${error}`);
      setAuthStatus('error');
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (code && state && currentUser) {
      // OAuth callback - check status again
      setTimeout(checkKrogerAuthStatus, 1000);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [currentUser]);

  if (authStatus === 'checking') {
    return (
      <div className="kroger-auth-container">
        <div className="auth-card">
          <div className="auth-loading">
            <div className="spinner"></div>
            <h3>Checking Kroger Connection...</h3>
            <p>Please wait while we verify your account</p>
          </div>
        </div>
      </div>
    );
  }

  if (authStatus === 'success') {
    return (
      <div className="kroger-auth-container">
        <div className="auth-card success">
          <div className="auth-success">
            <div className="success-icon">✅</div>
            <h3>Connected to Kroger!</h3>
            <p>You're all set to shop and manage your cart</p>
            <button 
              className="continue-btn"
              onClick={() => onAuthSuccess && onAuthSuccess()}
            >
              Continue to Stores
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kroger-auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>🛒 Connect to Kroger</h2>
          <p>Connect your Kroger account to start shopping and managing your cart</p>
        </div>

        {authError && (
          <div className="auth-error">
            <span className="error-icon">⚠️</span>
            <span>{authError}</span>
            <button 
              className="retry-btn"
              onClick={() => {
                setAuthError(null);
                setAuthStatus('needed');
              }}
            >
              Try Again
            </button>
          </div>
        )}

        <div className="auth-content">
          <div className="features-list">
            <h4>What you'll be able to do:</h4>
            <ul>
              <li>✅ Find nearby Kroger stores</li>
              <li>🛒 Add items to your cart</li>
              <li>💰 See real-time prices</li>
              <li>🚚 Check store pickup availability</li>
              <li>📱 Sync across all your devices</li>
            </ul>
          </div>

          <button
            className="auth-btn"
            onClick={initiateKrogerAuth}
            disabled={isAuthenticating || !currentUser}
          >
            {isAuthenticating ? (
              <>
                <div className="btn-spinner"></div>
                Connecting...
              </>
            ) : (
              <>
                <span className="kroger-logo">🏪</span>
                Connect to Kroger
              </>
            )}
          </button>

          <div className="auth-note">
            <p>
              <strong>Secure:</strong> We use Kroger's official OAuth system.
              We never see your password or personal information.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .kroger-auth-container {
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .auth-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          padding: 2rem;
          max-width: 500px;
          width: 100%;
          text-align: center;
        }

        .auth-card.success {
          border: 2px solid #10b981;
        }

        .auth-header h2 {
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .auth-header p {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }

        .auth-error {
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

        .features-list {
          text-align: left;
          margin-bottom: 2rem;
        }

        .features-list h4 {
          color: #1f2937;
          margin-bottom: 1rem;
        }

        .features-list ul {
          list-style: none;
          padding: 0;
        }

        .features-list li {
          padding: 0.5rem 0;
          color: #4b5563;
        }

        .auth-btn {
          background: linear-gradient(135deg, #0070f3, #0051cc);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          margin-bottom: 1rem;
          transition: all 0.2s ease;
        }

        .auth-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,112,243,0.3);
        }

        .auth-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .kroger-logo {
          font-size: 1.2rem;
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
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

        .success-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .continue-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .continue-btn:hover {
          background: #059669;
        }

        .auth-note {
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.4;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .kroger-auth-container {
            padding: 1rem;
          }
          
          .auth-card {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default KrogerAuth;