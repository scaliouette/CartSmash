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

// inside AuthProvider in AuthContext.js
const makeAuthenticatedRequest = async (url, options = {}) => {
  // Grab a fresh Firebase ID token
  let idToken = null;
  if (auth.currentUser && typeof auth.currentUser.getIdToken === 'function') {
    try {
      idToken = await auth.currentUser.getIdToken();
    } catch (error) {
      console.error('Error getting Firebase ID token:', error);
    }
  }

  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
  });

  // Guard against HTML responses -> "Unexpected token '<'"
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Non-JSON from ${url}: ${text.slice(0, 120)}`);
  }

  // Return the native Response so callers can still do response.json()
  return res;
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
      
      // Update the current user object without breaking Firebase methods
      setCurrentUser(prev => {
        if (prev) {
          Object.assign(prev, updates);
          return prev;
        }
        return prev;
      });
      
      console.log('✅ Profile updated');
    } catch (error) {
      console.error('❌ Update profile error:', error);
      setError(error.message);
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
              // Preserve Firebase User methods by adding properties directly
              const userData = userDoc.data();
              Object.assign(user, userData, { isAdmin: adminStatus });
              setCurrentUser(user);
            } else {
              // Add isAdmin property to the Firebase User object
              user.isAdmin = adminStatus;
              setCurrentUser(user);
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            user.isAdmin = adminStatus;
            setCurrentUser(user);
          }
        } else {
          user.isAdmin = adminStatus;
          setCurrentUser(user);
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
  }, [checkAdminStatus]);

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
  makeAuthenticatedRequest
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