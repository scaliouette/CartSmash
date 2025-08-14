// client/src/components/AuthTest.js
// Comprehensive Auth Testing Component - FIXED

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function AuthTest() {
  // Always call hooks at the top level, unconditionally
  const authContext = useAuth();
  
  // Safely destructure with defaults
  const { 
    currentUser, 
    signup, 
    login, 
    signInWithGoogle, 
    logout,
    signOut 
  } = authContext || {};
  
  // Use signOut as fallback for logout
  const logoutFunction = logout || signOut;
  
  const [testResults, setTestResults] = useState([]);
  const [isTestingGoogle, setIsTestingGoogle] = useState(false);
  
  // Test credentials
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  // Debug log to see what we have
  useEffect(() => {
    console.log('Auth Context Debug:', {
      hasContext: !!authContext,
      hasCurrentUser: !!currentUser,
      hasSignup: !!signup,
      hasLogin: !!login,
      hasSignInWithGoogle: !!signInWithGoogle,
      hasLogout: !!logoutFunction,
      currentUserEmail: currentUser?.email
    });
  }, [authContext, currentUser, signup, login, signInWithGoogle, logoutFunction]);
  
  const addResult = (test, success, details) => {
    setTestResults(prev => [...prev, {
      test,
      success,
      details,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };
  
  // Test 1: Check Firebase Configuration
  const testFirebaseConfig = () => {
    const config = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    };
    
    const allPresent = config.apiKey && config.authDomain && config.projectId;
    
    addResult(
      'Firebase Config',
      allPresent,
      allPresent ? 'All required config values present' : 'Missing configuration'
    );
  };
  
  // Test 2: Email/Password Signup
  const testEmailSignup = async () => {
    if (!signup) {
      addResult('Email Signup', false, 'Signup function not available');
      return false;
    }
    
    try {
      const result = await signup(testEmail, testPassword, 'Test User');
      addResult(
        'Email Signup',
        true,
        `Created account: ${result.user.email}`
      );
      return true;
    } catch (error) {
      addResult(
        'Email Signup',
        false,
        error.message
      );
      return false;
    }
  };
  
  // Test 3: Sign Out
  const testSignOut = async () => {
    if (!logoutFunction) {
      addResult('Sign Out', false, 'Logout function not available');
      return false;
    }
    
    try {
      await logoutFunction();
      addResult(
        'Sign Out',
        true,
        'Successfully signed out'
      );
      return true;
    } catch (error) {
      addResult(
        'Sign Out',
        false,
        error.message
      );
      return false;
    }
  };
  
  // Test 4: Email/Password Login
  const testEmailLogin = async () => {
    if (!login) {
      addResult('Email Login', false, 'Login function not available');
      return false;
    }
    
    try {
      const result = await login(testEmail, testPassword);
      addResult(
        'Email Login',
        true,
        `Logged in as: ${result.user.email}`
      );
      return true;
    } catch (error) {
      addResult(
        'Email Login',
        false,
        error.message
      );
      return false;
    }
  };
  
  // Test 5: Google Sign-In (Manual)
  const testGoogleSignIn = async () => {
    if (!signInWithGoogle) {
      addResult('Google Sign-In', false, 'Google sign-in function not available');
      return false;
    }
    
    setIsTestingGoogle(true);
    
    addResult(
      'Google Sign-In',
      'pending',
      'Opening Google sign-in popup... Please complete sign-in!'
    );
    
    try {
      const result = await signInWithGoogle();
      addResult(
        'Google Sign-In',
        true,
        `Successfully signed in as: ${result.user.email}`
      );
      setIsTestingGoogle(false);
      return true;
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user') {
        addResult(
          'Google Sign-In',
          false,
          '⚠️ Popup was closed. Please complete the sign-in process!'
        );
      } else if (error.code === 'auth/popup-blocked') {
        addResult(
          'Google Sign-In',
          false,
          '🚫 Popup blocked! Check your browser settings.'
        );
      } else {
        addResult(
          'Google Sign-In',
          false,
          error.message
        );
      }
      setIsTestingGoogle(false);
      return false;
    }
  };
  
  // Run all tests
  const runAllTests = async () => {
    setTestResults([]);
    
    // Test 1: Config
    testFirebaseConfig();
    
    // Test 2: Signup
    const signupSuccess = await testEmailSignup();
    if (!signupSuccess) return;
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Sign out
    const signoutSuccess = await testSignOut();
    if (!signoutSuccess) return;
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 4: Login
    await testEmailLogin();
  };
  
  // Check if auth context is available
  if (!authContext) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          ⚠️ Auth Context not available! Check these:
          <ul style={{ marginTop: '10px', textAlign: 'left' }}>
            <li>AuthProvider wraps your App component</li>
            <li>AuthContext.js file exists and exports properly</li>
            <li>Firebase is initialized correctly</li>
          </ul>
        </div>
      </div>
    );
  }
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🧪 Firebase Auth Testing</h2>
        {currentUser && (
          <div style={styles.currentUser}>
            Current User: {currentUser.email || 'Anonymous'}
          </div>
        )}
      </div>
      
      <div style={styles.buttons}>
        <button 
          onClick={runAllTests}
          style={styles.testButton}
          disabled={!signup || !login}
        >
          🚀 Run Email Auth Tests
        </button>
        
        <button 
          onClick={testGoogleSignIn}
          style={{...styles.testButton, ...styles.googleButton}}
          disabled={isTestingGoogle || !signInWithGoogle}
        >
          {isTestingGoogle ? '⏳ Waiting for Google...' : '🔐 Test Google Sign-In'}
        </button>
        
        {currentUser && logoutFunction && (
          <button 
            onClick={logoutFunction}
            style={{...styles.testButton, ...styles.logoutButton}}
          >
            🚪 Sign Out
          </button>
        )}
      </div>
      
      {!signup && !login && !signInWithGoogle && (
        <div style={styles.warningBox}>
          ⚠️ Auth functions not available. Check console for errors.
        </div>
      )}
      
      {isTestingGoogle && (
        <div style={styles.googleInstructions}>
          <h3>📝 Google Sign-In Instructions:</h3>
          <ol>
            <li>A popup window should have opened</li>
            <li>Select your Google account</li>
            <li>Click "Continue" to authorize</li>
            <li>DO NOT close the popup manually</li>
          </ol>
          <p style={styles.warning}>
            ⚠️ If no popup appeared, check for a blocked popup icon in your address bar!
          </p>
        </div>
      )}
      
      <div style={styles.results}>
        <h3 style={styles.resultsTitle}>Test Results:</h3>
        {testResults.length === 0 ? (
          <p style={styles.noResults}>No tests run yet. Click a button above to start!</p>
        ) : (
          testResults.map((result, index) => (
            <div 
              key={index} 
              style={{
                ...styles.result,
                ...(result.success === true ? styles.success : 
                    result.success === false ? styles.failure : 
                    styles.pending)
              }}
            >
              <div style={styles.resultHeader}>
                <span style={styles.resultIcon}>
                  {result.success === true ? '✅' : 
                   result.success === false ? '❌' : 
                   '⏳'}
                </span>
                <span style={styles.resultTest}>{result.test}</span>
                <span style={styles.resultTime}>{result.timestamp}</span>
              </div>
              <div style={styles.resultDetails}>{result.details}</div>
            </div>
          ))
        )}
      </div>
      
      <div style={styles.tips}>
        <h3>💡 Troubleshooting Tips:</h3>
        <ul>
          <li>Make sure popups are allowed for localhost:3000</li>
          <li>Try using Chrome or Firefox (not Safari)</li>
          <li>Clear cookies for accounts.google.com if sign-in fails</li>
          <li>Check browser console (F12) for detailed errors</li>
          <li>Ensure Google auth is enabled in Firebase Console</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '20px auto',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  
  errorBox: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    border: '2px solid #ef4444',
    borderRadius: '8px',
    color: '#dc2626',
    marginBottom: '20px',
    fontWeight: '600',
    textAlign: 'center',
  },
  
  warningBox: {
    padding: '12px',
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    color: '#d97706',
    marginBottom: '20px',
    textAlign: 'center',
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e5e7eb',
  },
  
  title: {
    margin: 0,
    fontSize: '24px',
    color: '#1f2937',
  },
  
  currentUser: {
    padding: '8px 16px',
    backgroundColor: '#e0f2fe',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#0369a1',
    fontWeight: '600',
  },
  
  buttons: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  
  testButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: '#3b82f6',
    color: 'white',
    transition: 'all 0.2s',
  },
  
  googleButton: {
    backgroundColor: '#4285f4',
  },
  
  logoutButton: {
    backgroundColor: '#ef4444',
  },
  
  googleInstructions: {
    padding: '16px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '2px solid #f59e0b',
  },
  
  warning: {
    color: '#d97706',
    fontWeight: '600',
    marginTop: '12px',
  },
  
  results: {
    marginBottom: '24px',
  },
  
  resultsTitle: {
    fontSize: '18px',
    marginBottom: '12px',
    color: '#374151',
  },
  
  noResults: {
    padding: '20px',
    textAlign: 'center',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  
  result: {
    padding: '12px',
    marginBottom: '8px',
    borderRadius: '8px',
    border: '1px solid',
  },
  
  success: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  
  failure: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  
  pending: {
    backgroundColor: '#fefce8',
    borderColor: '#fde047',
  },
  
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '4px',
  },
  
  resultIcon: {
    fontSize: '18px',
  },
  
  resultTest: {
    fontWeight: '600',
    flex: 1,
  },
  
  resultTime: {
    fontSize: '12px',
    color: '#6b7280',
  },
  
  resultDetails: {
    fontSize: '14px',
    marginLeft: '30px',
    color: '#4b5563',
  },
  
  tips: {
    padding: '16px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: '1.6',
  },
};

export default AuthTest;