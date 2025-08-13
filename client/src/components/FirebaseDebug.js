// client/src/components/FirebaseDebug.js
import React, { useEffect, useState } from 'react';

function FirebaseDebug() {
  const [firebaseStatus, setFirebaseStatus] = useState({
    loading: true,
    initialized: false,
    hasAuth: false,
    error: null
  });

  useEffect(() => {
    // Check environment variables
    console.log('🔍 Environment check:', {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing',
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing',
    });
    
    // Check Firebase module
    import('../firebase').then(module => {
      console.log('📦 Firebase module loaded:', {
        hasAuth: !!module.auth,
        hasApp: !!module.default
      });
      
      setFirebaseStatus({
        loading: false,
        initialized: !!module.default,
        hasAuth: !!module.auth,
        error: null
      });
      
      if (module.auth) {
        module.auth.onAuthStateChanged(user => {
          console.log('👤 Auth state changed:', user ? user.email : 'No user');
        });
      }
    }).catch(err => {
      console.error('❌ Failed to load Firebase:', err);
      setFirebaseStatus({
        loading: false,
        initialized: false,
        hasAuth: false,
        error: err.message
      });
    });
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      left: 10,
      background: 'white',
      border: '2px solid #333',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '250px',
      zIndex: 10000,
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>🔥 Firebase Status</h4>
      <div>Loading: {firebaseStatus.loading ? '⏳' : '✅'}</div>
      <div>Initialized: {firebaseStatus.initialized ? '✅' : '❌'}</div>
      <div>Auth Available: {firebaseStatus.hasAuth ? '✅' : '❌'}</div>
      <div>Project: cartsmash-pooda</div>
      {firebaseStatus.error && (
        <div style={{ color: 'red', marginTop: '5px' }}>
          Error: {firebaseStatus.error}
        </div>
      )}
    </div>
  );
}

export default FirebaseDebug;