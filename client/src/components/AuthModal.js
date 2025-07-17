// client/src/components/AuthModal.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, displayName);
      }
      onClose();
      // Clear form
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);

    try {
      await signInWithGoogle();
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        width: '400px',
        maxWidth: '90vw',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        <h2 style={{ 
          color: '#FF6B35', 
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          🛒 {isLogin ? 'Sign In' : 'Join'} Cart Smash
        </h2>
        
        {error && (
          <div style={{ 
            color: '#dc3545',
            backgroundColor: '#f8d7da',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '15px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required={!isLogin}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '10px',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '10px',
              border: '2px solid #ddd',
              borderRadius: '6px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '15px',
              border: '2px solid #ddd',
              borderRadius: '6px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isLoading ? '#ccc' : '#FF6B35',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginBottom: '10px',
              transition: 'background-color 0.3s'
            }}
          >
            {isLoading ? 'Processing...' : (isLogin ? '🔐 Sign In' : '🚀 Sign Up')}
          </button>
        </form>

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isLoading ? '#ccc' : '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginBottom: '15px'
          }}
        >
          {isLoading ? 'Processing...' : '🚀 Sign In with Google'}
        </button>

        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <button
            onClick={() => setIsLogin(!isLogin)}
            disabled={isLoading}
            style={{
              background: 'none',
              border: 'none',
              color: '#FF6B35',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '14px'
            }}
          >
            {isLogin ? 'Need an account? Sign Up' : 'Have an account? Sign In'}
          </button>
        </div>

        <button
          onClick={onClose}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default AuthModal;