// client/src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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
let analytics = null;

if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
  }
} else {
  console.warn('⚠️ Firebase not initialized due to missing configuration');
  console.warn('The app will run in mock/demo mode');
}

export { auth, analytics };
export default app;