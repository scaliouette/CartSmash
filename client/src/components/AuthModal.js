// client/src/components/AuthModal.js
// COMPLETE WORKING VERSION - Google Sign-In Button Working

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function AuthModal({ isOpen, onClose }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signup, login, signInWithGoogle } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signup(email, password, displayName);
      } else {
        await login(email, password);
      }
      onClose();
      // Clear form
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    
    try {
      await signInWithGoogle();
      onClose();
    } catch (error) {
      console.error('Google sign-in error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Please allow popups for this site');
      } else {
        setError(error.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button 
          onClick={onClose} 
          style={styles.closeButton}
          disabled={loading}
        >
          ×
        </button>
        
        <h2 style={styles.title}>
          {isSignUp ? '🚀 Create Account' : '🔐 Sign In'}
        </h2>
        
        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          {isSignUp && (
            <input
              type="text"
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
            disabled={loading}
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
            disabled={loading}
          />
          
          <button 
            type="submit" 
            style={styles.submitButton}
            disabled={loading}
          >
            {loading ? '⏳ Loading...' : (isSignUp ? '🚀 Sign Up' : '🔐 Sign In')}
          </button>
        </form>
        
        <div style={styles.divider}>
          <span style={styles.dividerText}>OR</span>
        </div>
        
        <button 
          onClick={handleGoogleSignIn} 
          style={styles.googleButton}
          disabled={loading}
        >
          <svg style={styles.googleIcon} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
        
        <p style={styles.switchText}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            style={styles.switchButton}
            disabled={loading}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
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
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    width: '90%',
    maxWidth: '400px',
    position: 'relative',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
  },
  closeButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'none',
    border: 'none',
    fontSize: '30px',
    cursor: 'pointer',
    color: '#999'
  },
  title: {
    textAlign: 'center',
    marginBottom: '20px',
    color: '#333'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '16px'
  },
  submitButton: {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#4CAF50',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  divider: {
    textAlign: 'center',
    margin: '20px 0',
    position: 'relative'
  },
  dividerText: {
    backgroundColor: 'white',
    padding: '0 10px',
    color: '#999',
    position: 'relative',
    zIndex: 1
  },
  googleButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    backgroundColor: 'white',
    color: '#333',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'background-color 0.2s'
  },
  googleIcon: {
    width: '20px',
    height: '20px'
  },
  switchText: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#666',
    fontSize: '14px'
  },
  switchButton: {
    background: 'none',
    border: 'none',
    color: '#4CAF50',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginLeft: '5px',
    fontSize: '14px'
  },
  error: {
    backgroundColor: '#ffebee',
    border: '1px solid #ffcdd2',
    color: '#c62828',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '15px',
    fontSize: '14px'
  }
};

export default AuthModal;