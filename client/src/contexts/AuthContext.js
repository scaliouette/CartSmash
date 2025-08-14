// client/src/contexts/AuthContext.js
// COMPLETE WORKING VERSION WITH ALL AUTH FUNCTIONS

import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Create context
const AuthContext = createContext({});

// Export useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  return context;
};

// Auth Provider Component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  console.log('✅ Firebase Auth loaded successfully');

  // Email/Password Signup
  const signup = async (email, password, displayName = '') => {
    try {
      console.log('📝 Starting signup for:', email);
      setError('');
      
      if (!auth) {
        throw new Error('Firebase Auth not initialized');
      }
      
      // Create user with email/password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ User created:', userCredential.user.email);
      
      // Update display name if provided
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
      }
      
      // Create Firestore user document
      if (db && userCredential.user) {
        const userRef = doc(db, 'users', userCredential.user.uid);
        await setDoc(userRef, {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: displayName || '',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }, { merge: true });
        console.log('✅ Firestore user document created');
      }
      
      return userCredential;
    } catch (error) {
      console.error('❌ Signup error:', error);
      setError(error.message);
      throw error;
    }
  };

  // Email/Password Login
  const login = async (email, password) => {
    try {
      console.log('🔐 Starting login for:', email);
      setError('');
      
      if (!auth) {
        throw new Error('Firebase Auth not initialized');
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ User logged in:', userCredential.user.email);
      
      // Update last login in Firestore
      if (db && userCredential.user) {
        const userRef = doc(db, 'users', userCredential.user.uid);
        await setDoc(userRef, {
          lastLogin: new Date().toISOString()
        }, { merge: true });
      }
      
      return userCredential;
    } catch (error) {
      console.error('❌ Login error:', error);
      setError(error.message);
      throw error;
    }
  };

  // Google Sign-In
  const signInWithGoogle = async () => {
    try {
      console.log('🔐 Starting Google sign-in');
      setError('');
      
      if (!auth || !googleProvider) {
        throw new Error('Firebase Auth or Google Provider not initialized');
      }
      
      const userCredential = await signInWithPopup(auth, googleProvider);
      console.log('✅ Google sign-in successful:', userCredential.user.email);
      
      // Create/update Firestore user document
      if (db && userCredential.user) {
        const userRef = doc(db, 'users', userCredential.user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName || '',
            photoURL: userCredential.user.photoURL || '',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          });
        } else {
          await setDoc(userRef, {
            lastLogin: new Date().toISOString()
          }, { merge: true });
        }
      }
      
      return userCredential;
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      setError(error.message);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      console.log('👋 Logging out');
      setError('');
      
      if (!auth) {
        throw new Error('Firebase Auth not initialized');
      }
      
      await signOut(auth);
      setCurrentUser(null);
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
      setError(error.message);
      throw error;
    }
  };

  // Alias for compatibility
  const signOutUser = logout;

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      setError('');
      
      if (!currentUser) {
        throw new Error('No user logged in');
      }
      
      // Update Firebase Auth profile
      if (updates.displayName || updates.photoURL) {
        await updateProfile(currentUser, {
          displayName: updates.displayName || currentUser.displayName,
          photoURL: updates.photoURL || currentUser.photoURL
        });
      }
      
      // Update Firestore
      if (db) {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, updates, { merge: true });
      }
      
      // Update local state
      setCurrentUser(prev => ({ ...prev, ...updates }));
      
      console.log('✅ Profile updated');
    } catch (error) {
      console.error('❌ Update profile error:', error);
      setError(error.message);
      throw error;
    }
  };

  // Save cart to Firebase
  const saveCartToFirebase = async (cartItems) => {
    if (!currentUser || !db) {
      console.log('⚠️ Cannot save cart: No user or Firestore');
      return;
    }
    
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        cart: cartItems,
        cartUpdatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log('✅ Cart saved to Firebase');
    } catch (error) {
      console.error('❌ Error saving cart:', error);
      throw error;
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    if (!auth) {
      console.error('⚠️ Auth not available');
      setIsLoading(false);
      return;
    }

    console.log('🔥 Setting up auth state listener');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('👤 User detected:', user.email);
        
        // Try to get additional data from Firestore
        if (db) {
          try {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              setCurrentUser({
                ...user,
                ...userDoc.data()
              });
            } else {
              setCurrentUser(user);
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            setCurrentUser(user);
          }
        } else {
          setCurrentUser(user);
        }
      } else {
        console.log('👤 No user signed in');
        setCurrentUser(null);
      }
      
      setIsLoading(false);
    });

    return () => {
      console.log('🔥 Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  // Log current context state
  useEffect(() => {
    console.log('🔥 AuthContext state:', {
      hasAuth: !!auth,
      hasCurrentUser: !!currentUser,
      isLoading,
      functionsAvailable: {
        signup: !!signup,
        login: !!login,
        signInWithGoogle: !!signInWithGoogle,
        logout: !!logout
      }
    });
  }, [currentUser, isLoading]);

  // Context value with all functions
  const value = {
    currentUser,
    isLoading,
    error,
    signup,           // Email signup
    login,            // Email login
    logout,           // Logout
    signOut: logout,  // Alias for logout
    signInWithGoogle, // Google sign-in
    updateUserProfile,
    saveCartToFirebase
  };

  // Always log what we're providing
  console.log('🔥 Running with Firebase Authentication');
  console.log('📦 Providing auth functions:', Object.keys(value));

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;