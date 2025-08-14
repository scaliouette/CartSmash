// client/src/firebase.js
// FIXED VERSION WITH GOOGLE AUTH PROVIDER

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';

// Your Firebase configuration - from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Check if configuration is valid
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId;

if (!isConfigValid) {
  console.warn('⚠️ Firebase configuration is incomplete!');
  console.warn('Missing environment variables. Check your .env.local file');
  console.warn('Current config:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasAuthDomain: !!firebaseConfig.authDomain,
    hasProjectId: !!firebaseConfig.projectId
  });
}

// Initialize Firebase only if config is valid
let app = null;
let auth = null;
let googleProvider = null;
let db = null;
let database = null;
let analytics = null;

if (isConfigValid) {
  try {
    // Initialize Firebase app
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized');
    
    // Initialize Authentication
    auth = getAuth(app);
    console.log('✅ Firebase Auth initialized');
    
    // Initialize Google Auth Provider
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    console.log('✅ Google Auth Provider configured');
    
    // Initialize Firestore
    db = getFirestore(app);
    console.log('✅ Firestore initialized');
    
    // Initialize Realtime Database
    database = getDatabase(app);
    console.log('✅ Realtime Database initialized');
    
    // Initialize Analytics (only in browser environment)
    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
      analytics = getAnalytics(app);
      console.log('✅ Analytics initialized');
    }
    
    console.log('🎉 All Firebase services initialized successfully!');
    
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
  }
} else {
  console.warn('⚠️ Firebase not initialized due to missing configuration');
  console.warn('The app will run in mock/demo mode');
}

// Export all Firebase services
export { 
  auth, 
  googleProvider,  // This was missing!
  db,             // This was missing!
  database,       // This was missing!
  analytics 
};

export default app;