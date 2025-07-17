// client/src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  ref,
  set,
  get,
  serverTimestamp
} from 'firebase/database';
import { auth, database } from '../config/firebase';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Basic authentication functions
  const signUpWithEmail = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user profile in database
    await set(ref(database, `users/${userCredential.user.uid}`), {
      email: email,
      displayName: displayName || email.split('@')[0],
      createdAt: serverTimestamp()
    });
    
    return userCredential;
  };

  const signInWithEmail = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    const result = await signInWithPopup(auth, provider);
    
    // Create or update user profile
    await set(ref(database, `users/${result.user.uid}`), {
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
      lastLogin: serverTimestamp()
    });
    
    return result;
  };

  const signOut = () => {
    return firebaseSignOut(auth);
  };

  // Cart management functions
  const saveCartToFirebase = async (cartItems) => {
    if (!currentUser) return;
    
    const cartData = {
      items: cartItems,
      lastModified: serverTimestamp(),
      totalItems: cartItems.length
    };
    
    await set(ref(database, `carts/${currentUser.uid}`), cartData);
  };

  const loadCartFromFirebase = async () => {
    if (!currentUser) return null;
    
    const cartRef = ref(database, `carts/${currentUser.uid}`);
    const snapshot = await get(cartRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return null;
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isLoading,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    saveCartToFirebase,
    loadCartFromFirebase
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}