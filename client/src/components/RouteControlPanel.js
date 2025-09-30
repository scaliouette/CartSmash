import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function RouteControlPanel() {
  const [routes, setRoutes] = useState(null);
  const [grouped, setGrouped] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const categoryLabels = {
    core: '🔧 Core Features',
    user: '👤 User Management',
    admin: '⚙️ Admin Features',
    additional: '➕ Additional Features',
    api: '🔌 API Routes',
    'ai-services': '🤖 AI Services',
    'external-apis': '🌐 External APIs'
  };

  const categoryDescriptions = {
    core: 'Essential cart and grocery processing functionality',
    user: 'User account management and store services',
    admin: 'Administrative dashboard and monitoring tools',
    additional: 'Extended features like recipes, caching, and debugging',
    api: 'AI and API integration routes',
    'ai-services': 'AI service providers (OpenAI, Anthropic, Google AI) - Requires server restart',
    'external-apis': 'External product and cart APIs (Instacart, Spoonacular) - Requires server restart'
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_URL}/api/route-control`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setRoutes(response.data.settings);
        setGrouped(response.data.grouped);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error loading routes:', err);
      setError('Failed to load route configurations');
    } finally {
      setLoading(false);
    }
  };

  const toggleRoute = async (routeKey, currentlyEnabled) => {
    try {
      setSaving(true);

      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${API_URL}/api/route-control/toggle`,
        {
          routeKey,
          enabled: !currentlyEnabled
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Update local state
        setRoutes(prev => ({
          ...prev,
          [routeKey]: {
            ...prev[routeKey],
            enabled: !currentlyEnabled
          }
        }));

        // Update grouped state
        setGrouped(prev => {
          const category = routes[routeKey].category;
          return {
            ...prev,
            [category]: prev[category].map(route =>
              route.key === routeKey
                ? { ...route, enabled: !currentlyEnabled }
                : route
            )
          };
        });

        setLastUpdated(new Date());

        // Show restart warning for services
        if (response.data.requiresRestart) {
          alert('⚠️ AI Service changes require a server restart to take effect.');
        }
      }
    } catch (err) {
      console.error('Error toggling route:', err);
      alert('Failed to toggle route. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = async (category, enable) => {
    try {
      setSaving(true);

      const updates = grouped[category].map(route => ({
        routeKey: route.key,
        enabled: enable
      }));

      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${API_URL}/api/route-control/bulk-update`,
        { updates },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Reload routes
        await loadRoutes();

        // Show restart warning if needed
        if (response.data.requiresRestart) {
          alert('⚠️ Some changes require a server restart to take effect (AI Services/External APIs).');
        }
      }
    } catch (err) {
      console.error('Error toggling category:', err);
      alert('Failed to toggle category. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading route configurations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <p>❌ {error}</p>
        <button onClick={loadRoutes} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>🎛️ Route Control Panel</h2>
          <p style={styles.subtitle}>
            Enable or disable API routes to control server functionality
          </p>
        </div>
        {lastUpdated && (
          <div style={styles.lastUpdated}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {grouped && Object.entries(grouped).map(([category, categoryRoutes]) => {
        // Skip empty categories
        if (categoryRoutes.length === 0) return null;

        return (
          <div key={category} style={styles.category}>
            <div style={styles.categoryHeader}>
              <div>
                <h3 style={styles.categoryTitle}>{categoryLabels[category]}</h3>
                <p style={styles.categoryDescription}>
                  {categoryDescriptions[category]}
                </p>
              </div>
              <div style={styles.categoryActions}>
                <button
                  onClick={() => toggleCategory(category, true)}
                  style={styles.categoryButton}
                  disabled={saving}
                >
                  Enable All
                </button>
                <button
                  onClick={() => toggleCategory(category, false)}
                  style={{...styles.categoryButton, ...styles.categoryButtonDisable}}
                  disabled={saving}
                >
                  Disable All
                </button>
              </div>
            </div>

            <div style={styles.routeGrid}>
              {categoryRoutes.map(route => (
                <div key={route.key} style={styles.routeCard}>
                  <div style={styles.routeInfo}>
                    <div style={styles.routeHeader}>
                      <span style={styles.routeName}>{route.name}</span>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...(route.enabled ? styles.statusEnabled : styles.statusDisabled)
                        }}
                      >
                        {route.enabled ? '✓ Enabled' : '✗ Disabled'}
                      </span>
                    </div>
                    {route.path && <code style={styles.routePath}>{route.path}</code>}
                    {route.description && <p style={styles.routeDescription}>{route.description}</p>}
                  </div>

                  <label style={styles.switch}>
                    <input
                      type="checkbox"
                      checked={route.enabled}
                      onChange={() => toggleRoute(route.key, route.enabled)}
                      disabled={saving}
                    />
                    <span style={styles.slider}></span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div style={styles.footer}>
        <p style={styles.footerNote}>
          ⚠️ <strong>Important Notes:</strong>
        </p>
        <ul style={styles.footerList}>
          <li>Disabled routes will return a 503 "Service temporarily disabled" error</li>
          <li>Route changes take effect within 30 seconds due to caching</li>
          <li><strong>AI Services and External APIs require a server restart</strong> to apply changes</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f8f9fa'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#6c757d',
    margin: 0
  },
  lastUpdated: {
    fontSize: '12px',
    color: '#6c757d',
    padding: '8px 12px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    border: '1px solid #e0e0e0'
  },
  category: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e0e0e0'
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '2px solid #f0f0f0',
    flexWrap: 'wrap',
    gap: '16px'
  },
  categoryTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: '0 0 4px 0'
  },
  categoryDescription: {
    fontSize: '13px',
    color: '#6c757d',
    margin: 0
  },
  categoryActions: {
    display: 'flex',
    gap: '8px'
  },
  categoryButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '500',
    border: '1px solid #28a745',
    backgroundColor: '#28a745',
    color: '#fff',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  categoryButtonDisable: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545'
  },
  routeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '16px'
  },
  routeCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    transition: 'all 0.2s'
  },
  routeInfo: {
    flex: 1
  },
  routeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '6px',
    flexWrap: 'wrap'
  },
  routeName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#2c3e50'
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statusEnabled: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },
  statusDisabled: {
    backgroundColor: '#f8d7da',
    color: '#721c24'
  },
  routePath: {
    fontSize: '12px',
    color: '#6c757d',
    fontFamily: 'monospace',
    backgroundColor: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    display: 'inline-block',
    marginTop: '4px'
  },
  routeDescription: {
    fontSize: '12px',
    color: '#6c757d',
    margin: '4px 0 0 0',
    fontStyle: 'italic'
  },
  switch: {
    position: 'relative',
    display: 'inline-block',
    width: '50px',
    height: '26px',
    marginLeft: '16px'
  },
  slider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ccc',
    transition: '0.3s',
    borderRadius: '26px',
    ':before': {
      position: 'absolute',
      content: '""',
      height: '20px',
      width: '20px',
      left: '3px',
      bottom: '3px',
      backgroundColor: 'white',
      transition: '0.3s',
      borderRadius: '50%'
    }
  },
  footer: {
    marginTop: '32px',
    padding: '16px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '8px'
  },
  footerNote: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    color: '#856404',
    fontWeight: '600'
  },
  footerList: {
    margin: '0',
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#856404'
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6c757d'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  error: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#dc3545'
  },
  retryButton: {
    padding: '10px 24px',
    fontSize: '14px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '16px'
  }
};

// Add CSS animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .switch input:checked + span {
    background-color: #28a745;
  }

  .switch input:checked + span:before {
    transform: translateX(24px);
  }

  .switch span:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }
`;
document.head.appendChild(styleSheet);

export default RouteControlPanel;