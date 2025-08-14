// client/src/components/AuthModal.js
// FIXED VERSION - Make sure this is your AuthModal component

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function AuthModal({ isOpen, onClose }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Destructure the auth functions from useAuth hook
  const auth = useAuth();
  
  // Debug: Log what we're getting from useAuth
  console.log('Auth context:', auth);
  
  // Safely access the functions with fallbacks
  const signInWithEmail = auth?.signInWithEmail;
  const signUpWithEmail = auth?.signUpWithEmail;
  const signInWithGoogle = auth?.signInWithGoogle;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!signInWithEmail || !signUpWithEmail) {
        throw new Error('Authentication functions not available. Please check AuthContext setup.');
      }

      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      
      // Clear form and close modal on success
      setEmail('');
      setPassword('');
      setDisplayName('');
      onClose();
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

// In AuthModal.js, update the handleGoogleSignIn function

const handleGoogleSignIn = async () => {
  setError('');
  setIsLoading(true);

  try {
    if (!signInWithGoogle) {
      throw new Error('Google sign-in not available. Please check AuthContext setup.');
    }

    await signInWithGoogle();
    onClose();
  } catch (error) {
    console.error('Google auth error:', error);
    
    // Handle specific Firebase auth errors
    if (error.code === 'auth/popup-closed-by-user') {
      // User closed the popup - don't show as an error
      setError('Sign-in canceled. Please try again.');
    } else if (error.code === 'auth/popup-blocked') {
      setError('Popup was blocked. Please allow popups for this site.');
    } else if (error.code === 'auth/operation-not-allowed') {
      setError('Google sign-in is not enabled. Please contact support.');
    } else if (error.code === 'auth/unauthorized-domain') {
      setError('This domain is not authorized for Google sign-in.');
    } else {
      // Generic error message
      setError(error.message || 'Google sign-in failed');
    }
  } finally {
    setIsLoading(false);
  }
};

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button onClick={onClose} style={styles.closeButton}>×</button>
        
        <h2 style={styles.title}>
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {isSignUp && (
            <input
              type="text"
              placeholder="Display Name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={styles.input}
            />
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="6"
            style={styles.input}
          />
          
          <button 
            type="submit" 
            disabled={isLoading}
            style={{
              ...styles.submitButton,
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>OR</span>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          style={{
            ...styles.googleButton,
            opacity: isLoading ? 0.7 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        <div style={styles.toggleText}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            style={styles.toggleButton}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },
  
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
    position: 'relative',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  
  closeButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    color: '#6b7280',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    lineHeight: 1,
  },
  
  title: {
    margin: '0 0 24px 0',
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f2937',
  },
  
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    border: '1px solid #fecaca',
    wordBreak: 'break-word',
  },
  
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  
  input: {
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
    boxSizing: 'border-box',
  },
  
  submitButton: {
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  divider: {
    margin: '24px 0',
    textAlign: 'center',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  dividerText: {
    color: '#6b7280',
    fontSize: '14px',
    backgroundColor: 'white',
    padding: '0 16px',
    position: 'relative',
  },
  
  googleButton: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '500',
    color: '#374151',
    backgroundColor: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  
  toggleText: {
    marginTop: '24px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#6b7280',
  },
  
  toggleButton: {
    marginLeft: '8px',
    background: 'none',
    border: 'none',
    color: '#10b981',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'underline',
  },
};

// Add hover effects with inline styles or CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .auth-modal-input:focus {
    border-color: #10b981 !important;
  }
  
  .auth-modal-submit:hover:not(:disabled) {
    background-color: #059669 !important;
  }
  
  .auth-modal-google:hover:not(:disabled) {
    background-color: #f9fafb !important;
    border-color: #9ca3af !important;
  }
`;
document.head.appendChild(styleSheet);

export default AuthModal;