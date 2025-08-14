// server/middleware/auth.js - Shared Authentication Middleware
const admin = require('firebase-admin');

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No valid auth token provided' 
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        displayName: decodedToken.name
      };
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication failed' 
    });
  }
};

const validateCartOperation = (req, res, next) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ 
      success: false, 
      error: 'User not authenticated' 
    });
  }
  
  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !req.user.emailVerified) {
    return res.status(403).json({ 
      success: false, 
      error: 'Email verification required' 
    });
  }
  
  next();
};

module.exports = { authenticateUser, validateCartOperation };

// ============================================
// client/src/hooks/useCart.js - Cart Management Hook
// ============================================

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useCart = () => {
  const { makeAuthenticatedRequest } = useAuth();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

  // Load cart
  const loadCart = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/cart`);
      const data = await response.json();
      
      if (data.success) {
        setCart(data.items);
        return data.items;
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Add items to cart
  const addItems = async (items, validateItems = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/cart/items`, {
        method: 'POST',
        body: JSON.stringify({ items, validateItems })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add items');
      }
      
      if (data.success) {
        await loadCart(); // Reload cart
        return data;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Parse grocery list
  const parseList = async (listText, action = 'merge', useAI = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/cart/parse`, {
        method: 'POST',
        body: JSON.stringify({ listText, action, useAI })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse list');
      }
      
      if (data.success) {
        setCart(data.cart);
        return data;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update item
  const updateItem = async (itemId, updates) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/cart/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCart(prevCart => 
          prevCart.map(item => 
            item.id === itemId ? data.item : item
          )
        );
        return data.item;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Delete item
  const deleteItem = async (itemId) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/cart/item/${itemId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCart(prevCart => prevCart.filter(item => item.id !== itemId));
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Validate all items
  const validateAll = async (useAI = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/cart/validate-all`, {
        method: 'POST',
        body: JSON.stringify({ useAI })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCart(data.items);
        return data;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Clear cart
  const clearCart = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/cart/clear`, {
        method: 'POST',
        body: JSON.stringify({ confirm: true })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCart([]);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Save cart as list
  const saveAsList = async (name) => {
    try {
      setLoading(true);
      setError(null);
      
      const estimatedTotal = cart.reduce((sum, item) => {
        return sum + ((item.price || 3.99) * (item.quantity || 1));
      }, 0);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/lists`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          items: cart,
          estimatedTotal: estimatedTotal.toFixed(2)
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.list;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create meal plan from cart
  const createMealPlan = async (mealData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/meals`, {
        method: 'POST',
        body: JSON.stringify({
          ...mealData,
          items: cart
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.meal;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Record shopping trip
  const recordShopping = async (tripData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await makeAuthenticatedRequest(`${API_URL}/account/history`, {
        method: 'POST',
        body: JSON.stringify({
          ...tripData,
          items: cart
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await clearCart();
        return data.entry;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    cart,
    loading,
    error,
    loadCart,
    addItems,
    parseList,
    updateItem,
    deleteItem,
    validateAll,
    clearCart,
    saveAsList,
    createMealPlan,
    recordShopping,
    setCart
  };
};

// ============================================
// server/server.js - Main Server Setup
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initializeFirebase } = require('./config/firebase');
const cartRoutes = require('./routes/cart');
const accountRoutes = require('./routes/account');

// Initialize Firebase Admin
initializeFirebase();

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/cart', cartRoutes);
app.use('/api/account', accountRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  
  // Firebase auth errors
  if (err.code && err.code.startsWith('auth/')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication error',
      message: err.message
    });
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: err.message
    });
  }
  
  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
    🚀 Server is running!
    🔊 Listening on port ${PORT}
    📝 Environment: ${process.env.NODE_ENV || 'development'}
    🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// ============================================
// client/src/App.js - Main App with Routing
// ============================================

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider} from './contexts/AuthContext';
import SmartGroceryCart from './components/SmartGroceryCart';
import MyAccount from './components/MyAccount';
import { Login, Signup } from './components/Auth';
import './App.css';

function Navigation() {
  const { currentUser, logout } = useAuth();
  
  return (
    <nav style={styles.nav}>
      <div style={styles.navContainer}>
        <Link to="/" style={styles.logo}>
          🛒 Smart Grocery Cart
        </Link>
        
        {currentUser && (
          <div style={styles.navLinks}>
            <Link to="/" style={styles.navLink}>
              Cart
            </Link>
            <Link to="/account" style={styles.navLink}>
              My Account
            </Link>
            <button onClick={logout} style={styles.logoutButton}>
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}>Loading...</div>
      </div>
    );
  }
  
  return currentUser ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Navigation />
          
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            <Route path="/" element={
              <PrivateRoute>
                <SmartGroceryCart />
              </PrivateRoute>
            } />
            
            <Route path="/account" element={
              <PrivateRoute>
                <MyAccount />
              </PrivateRoute>
            } />
            
            <Route path="/shared/:shareId" element={
              <SharedList />
            } />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

// Shared List Component
function SharedList() {
  const { shareId } = useParams();
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadSharedList();
  }, [shareId]);
  
  const loadSharedList = async () => {
    try {
      const response = await fetch(`${API_URL}/shared/${shareId}`);
      const data = await response.json();
      
      if (data.success) {
        setList(data.list);
      }
    } catch (error) {
      console.error('Error loading shared list:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div>Loading...</div>;
  if (!list) return <div>List not found</div>;
  
  return (
    <div style={styles.sharedContainer}>
      <h1>{list.name}</h1>
      <p>Shared by: {list.userEmail}</p>
      <div style={styles.itemsList}>
        {list.items.map((item, idx) => (
          <div key={idx} style={styles.sharedItem}>
            {item.quantity} {item.unit} {item.productName}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  nav: {
    background: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '16px 0',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  
  navContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  
  logo: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    textDecoration: 'none'
  },
  
  navLinks: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center'
  },
  
  navLink: {
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500'
  },
  
  logoutButton: {
    padding: '8px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh'
  },
  
  spinner: {
    fontSize: '18px',
    color: '#6b7280'
  },
  
  sharedContainer: {
    maxWidth: '600px',
    margin: '40px auto',
    padding: '20px'
  },
  
  itemsList: {
    marginTop: '20px'
  },
  
  sharedItem: {
    padding: '10px',
    background: '#f9fafb',
    marginBottom: '8px',
    borderRadius: '6px'
  }
};

export default App;

// ============================================
// package.json updates needed
// ============================================

/*
Server dependencies to add:
{
  "dependencies": {
    "express": "^4.18.2",
    "firebase-admin": "^11.11.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "@google/generative-ai": "^0.1.3"
  }
}

Client dependencies to add:
{
  "dependencies": {
    "firebase": "^10.7.0",
    "react-router-dom": "^6.20.0"
  }
}
*/