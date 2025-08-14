// client/src/contexts/AuthContext.js
// HYBRID VERSION - Works with or without Firebase

import React, { createContext, useContext, useState, useEffect } from 'react';

// Try to import Firebase, but don't fail if it's not configured
let firebaseAuth = null;
let GoogleAuthProvider = null;
let signInWithPopup = null;
let createUserWithEmailAndPassword = null;
let signInWithEmailAndPassword = null;
let firebaseSignOut = null;
let onAuthStateChanged = null;
let updateProfile = null;

try {
  const firebaseAuthModule = require('firebase/auth');
  GoogleAuthProvider = firebaseAuthModule.GoogleAuthProvider;
  signInWithPopup = firebaseAuthModule.signInWithPopup;
  createUserWithEmailAndPassword = firebaseAuthModule.createUserWithEmailAndPassword;
  signInWithEmailAndPassword = firebaseAuthModule.signInWithEmailAndPassword;
  firebaseSignOut = firebaseAuthModule.signOut;
  onAuthStateChanged = firebaseAuthModule.onAuthStateChanged;
  updateProfile = firebaseAuthModule.updateProfile;
  
  // Try to get auth instance
  try {
    const { auth } = require('../firebase');
    firebaseAuth = auth;
    console.log('✅ Firebase Auth loaded successfully');
  } catch (e) {
    console.warn('⚠️ Firebase not configured, using mock auth');
  }
} catch (error) {
  console.warn('⚠️ Firebase Auth not available, using mock auth');
}

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUsingMockAuth, setIsUsingMockAuth] = useState(!firebaseAuth);

  // Sign up with email and password
  async function signUpWithEmail(email, password, displayName = '') {
    try {
      setError('');
      
      if (firebaseAuth && createUserWithEmailAndPassword) {
        // Use real Firebase
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        if (displayName && userCredential.user) {
          await updateProfile(userCredential.user, { displayName });
        }
        return userCredential.user;
      } else {
        // Use mock auth
        console.log('📧 Mock Sign Up:', email);
        const mockUser = {
          uid: 'mock-' + Date.now(),
          email: email,
          displayName: displayName || email.split('@')[0]
        };
        setCurrentUser(mockUser);
        localStorage.setItem('mockUser', JSON.stringify(mockUser));
        alert(`✅ Demo Mode: Signed up as ${email}\n(No real account created)`);
        return mockUser;
      }
    } catch (error) {
      console.error('Sign up error:', error);
      setError(error.message);
      throw error;
    }
  }

  // Sign in with email and password
  async function signInWithEmail(email, password) {
    try {
      setError('');
      
      if (firebaseAuth && signInWithEmailAndPassword) {
        // Use real Firebase
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        return userCredential.user;
      } else {
        // Use mock auth
        console.log('📧 Mock Sign In:', email);
        const mockUser = {
          uid: 'mock-' + Date.now(),
          email: email,
          displayName: email.split('@')[0]
        };
        setCurrentUser(mockUser);
        localStorage.setItem('mockUser', JSON.stringify(mockUser));
        alert(`✅ Demo Mode: Signed in as ${email}`);
        return mockUser;
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error.message);
      throw error;
    }
  }

  // Sign in with Google
  async function signInWithGoogle() {
    try {
    setError(''); // Clear any previous errors
    
    if (firebaseAuth && GoogleAuthProvider && signInWithPopup) {
      console.log('Attempting real Google sign in...');
      const googleProvider = new GoogleAuthProvider();
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      console.log('Google sign in successful:', result.user.email);
      return result.user;
      } else {
        // Use mock Google sign in
        console.log('🔵 Mock Google Sign In');
        const mockUser = {
          uid: 'google-mock-' + Date.now(),
          email: 'demo.user@gmail.com',
          displayName: 'Demo User',
          photoURL: 'https://via.placeholder.com/96'
        };
        setCurrentUser(mockUser);
        localStorage.setItem('mockUser', JSON.stringify(mockUser));
        alert('✅ Demo Mode: Signed in with Google\nEmail: demo.user@gmail.com');
        return mockUser;
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      
      // If real Google sign in fails, fall back to mock
 if (error.code !== 'auth/popup-closed-by-user') {
      setError(error.message);
    
        console.log('Falling back to mock Google sign in...');
        const mockUser = {
          uid: 'google-mock-' + Date.now(),
          email: 'demo.user@gmail.com',
          displayName: 'Demo User',
          photoURL: 'https://via.placeholder.com/96'
        };
        setCurrentUser(mockUser);
        localStorage.setItem('mockUser', JSON.stringify(mockUser));
        alert('✅ Demo Mode: Signed in with Google\n(Firebase not configured)');
        return mockUser;
      }
      
      setError(error.message);
      throw error;
    }
  }

  // Sign out
  async function signOut() {
    try {
      setError('');
      
      if (firebaseAuth && firebaseSignOut) {
        await firebaseSignOut(firebaseAuth);
      }
      
      setCurrentUser(null);
      localStorage.removeItem('mockUser');
      localStorage.removeItem('mockCart');
      console.log('✅ Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      setError(error.message);
      throw error;
    }
  }

  // Save cart
  async function saveCartToFirebase(cartItems) {
    if (!currentUser) {
      console.warn('No user logged in, cannot save cart');
      return;
    }

    const cartKey = `cart-${currentUser.uid}`;
    localStorage.setItem(cartKey, JSON.stringify({
      items: cartItems,
      updatedAt: new Date().toISOString(),
      userId: currentUser.uid
    }));
    
    console.log('💾 Cart saved:', cartItems.length, 'items');
  }

  // Load cart
  async function loadCartFromFirebase() {
    if (!currentUser) {
      console.warn('No user logged in, cannot load cart');
      return null;
    }

    const cartKey = `cart-${currentUser.uid}`;
    const savedCart = localStorage.getItem(cartKey);
    
    if (savedCart) {
      const cartData = JSON.parse(savedCart);
      console.log('📦 Cart loaded:', cartData.items.length, 'items');
      return cartData.items;
    }
    
    return null;
  }

  // Set up auth state observer
  useEffect(() => {
    let unsubscribe = () => {};
    
    if (firebaseAuth && onAuthStateChanged) {
      // Use real Firebase auth state
      unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        setCurrentUser(user);
        setIsLoading(false);
        setIsUsingMockAuth(false);
      });
    } else {
      // Use mock auth state from localStorage
      const savedUser = localStorage.getItem('mockUser');
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch (e) {
          console.error('Failed to parse saved user:', e);
        }
      }
      setIsLoading(false);
      setIsUsingMockAuth(true);
    }

    return unsubscribe;
  }, []);

  // Show mode in console
  useEffect(() => {
    if (isUsingMockAuth) {
      console.log('🎭 Running in DEMO MODE - No real authentication');
      console.log('To enable real auth, configure Firebase in .env.local');
    } else {
      console.log('🔥 Running with Firebase Authentication');
    }
  }, [isUsingMockAuth]);

  const value = {
    currentUser,
    isLoading,
    error,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    saveCartToFirebase,
    loadCartFromFirebase,
    isUsingMockAuth // Expose this so components can show appropriate UI
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}