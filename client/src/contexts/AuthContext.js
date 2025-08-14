// client/src/contexts/AuthContext.js
// COMPLETE WORKING VERSION - NO CIRCULAR IMPORTS

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

// Export useAuth hook - MUST BE EXPORTED!
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.error('useAuth must be used within AuthProvider');
    return {};
  }
  return context;
};

// Auth Provider Component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  console.log('✅ Firebase Auth loaded successfully');

  // Define admin emails - REPLACE WITH YOUR ACTUAL EMAIL
  const ADMIN_EMAILS = [
    'scaliouette@gmail.com',  // ← CHANGE THIS TO YOUR ACTUAL EMAIL!
    // Add more admin emails as needed
  ];

  // Check admin status function
  const checkAdminStatus = async (user) => {
    if (!user) return false;
    
    try {
      // First check Firestore for admin flag
      if (db) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.isAdmin === true) {
            console.log('✅ Admin status confirmed via Firestore');
            return true;
          }
        }
      }
      
      // Fallback to email check
      const isEmailAdmin = ADMIN_EMAILS.includes(user.email);
      if (isEmailAdmin) {
        console.log('✅ Admin status confirmed via email list');
      }
      return isEmailAdmin;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return ADMIN_EMAILS.includes(user.email);
    }
  };
  
  // Email/Password Signup
  const signup = async (email, password, displayName = '') => {
    try {
      console.log('📝 Starting signup for:', email);
      setError('');
      
      if (!auth) {
        throw new Error('Firebase Auth not initialized');
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ User created:', userCredential.user.email);
      
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
      }
      
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

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      setError('');
      
      if (!currentUser) {
        throw new Error('No user logged in');
      }
      
      if (updates.displayName || updates.photoURL) {
        await updateProfile(currentUser, {
          displayName: updates.displayName || currentUser.displayName,
          photoURL: updates.photoURL || currentUser.photoURL
        });
      }
      
      if (db) {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, updates, { merge: true });
      }
      
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
        
        const adminStatus = await checkAdminStatus(user);
        
        if (db) {
          try {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              setCurrentUser({
                ...user,
                ...userDoc.data(),
                isAdmin: adminStatus
              });
            } else {
              setCurrentUser({
                ...user,
                isAdmin: adminStatus
              });
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            setCurrentUser({
              ...user,
              isAdmin: adminStatus
            });
          }
        } else {
          setCurrentUser({
            ...user,
            isAdmin: adminStatus
          });
        }
        
        if (adminStatus) {
          console.log('🛠️ Admin user logged in');
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
      isAdmin: currentUser?.isAdmin || false,
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
    isAdmin: currentUser?.isAdmin || false,
    signup,
    login,
    logout,
    signOut: logout,
    signInWithGoogle,
    updateUserProfile,
    saveCartToFirebase
  };

  console.log('🔥 Running with Firebase Authentication');
  console.log('📦 Providing auth functions:', Object.keys(value));

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

// IMPORTANT: Export both named and default exports

export default AuthProvider;