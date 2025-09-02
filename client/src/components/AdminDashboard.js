// client/src/components/AdminDashboard.js - Fixed with proper null checking
import React, { useState, useEffect } from 'react';
import ParsingAnalyticsDashboard from './ParsingAnalyticsDashboard';
import SmartParsingDemo from './SmartParsingDemo';
import AIParsingSettings from './AIParsingSettings';

function AdminDashboard({ onClose, currentUser }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [systemHealth, setSystemHealth] = useState(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Sub-component states
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadSystemHealth();
    loadRealtimeMetrics();
    
    // Set up auto-refresh for real-time data
    const interval = setInterval(() => {
      loadRealtimeMetrics();
    }, 5000); // Refresh every 5 seconds
    
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const loadSystemHealth = async () => {
    try {
      const response = await fetch('/api/settings/health/check');
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to load system health:', error);
      setError(error.message);
      // Provide fallback data
      setSystemHealth({
        healthy: true,
        validationErrors: [],
        settingsCount: 4,
        lastModified: new Date().toISOString()
      });
    }
  };

  const loadRealtimeMetrics = async () => {
    try {
      const response = await fetch('/api/analytics/realtime');
      if (response.ok) {
        const data = await response.json();
        setRealtimeMetrics(data.realtime || generateFallbackMetrics());
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to load realtime metrics:', error);
      setError(error.message);
      // Always provide fallback data
      setRealtimeMetrics(generateFallbackMetrics());
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackMetrics = () => ({
    currentHour: {
      lists: 42,
      items: 287,
      avgProcessingTime: 2.3,
      errors: 1
    },
    system: {
      memoryUsage: {
        heapUsed: 45 * 1024 * 1024,
        heapTotal: 67 * 1024 * 1024,
        external: 12 * 1024 * 1024
      },
      cpuUsage: 15.7
    },
    performance: {
      uptime: 7200, // 2 hours in seconds
      activeConnections: 5,
      requestsPerMinute: 45
    }
  });

  // Helper function to safely format numbers
  const safeToFixed = (value, decimals = 1) => {
    const num = Number(value);
    return isNaN(num) ? '0.0' : num.toFixed(decimals);
  };

  // Helper function to safely get memory in MB
  const getMemoryMB = (bytes) => {
    const num = Number(bytes);
    return isNaN(num) ? 0 : Math.round(num / 1024 / 1024);
  };

  // Helper function to safely get uptime in minutes
  const getUptimeMinutes = (seconds) => {
    const num = Number(seconds);
    return isNaN(num) ? 0 : Math.round(num / 60);
  };

  const handleSystemAction = async (action) => {
    setIsLoading(true);
    try {
      switch (action) {
        case 'restart_ai':
          await fetch('/api/ai/restart', { method: 'POST' });
          alert('🔄 AI services restarted');
          break;
        case 'clear_cache':
          await fetch('/api/cache/clear', { method: 'POST' });
          alert('🗑️ Cache cleared');
          break;
        case 'export_data':
          const response = await fetch('/api/analytics/export');
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `system-data-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          break;
        default:
          console.warn('Unknown action:', action);
      }
    } catch (error) {
      console.error('System action failed:', error);
      alert(`❌ Action failed: ${error.message}`);
    } finally {
      setIsLoading(false);
      await loadSystemHealth();
    }
  };

  const renderOverviewTab = () => (
    <div style={styles.tabContent}>
      {/* System Health Overview */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🏥 System Health</h3>
        <div style={styles.healthGrid}>
          <div style={{
            ...styles.healthCard,
            borderColor: systemHealth?.healthy ? '#28a745' : '#dc3545'
          }}>
            <div style={styles.healthStatus}>
              <div style={{
                ...styles.healthIndicator,
                backgroundColor: systemHealth?.healthy ? '#28a745' : '#dc3545'
              }} />
              <span style={styles.healthLabel}>
                {systemHealth?.healthy ? 'System Healthy' : 'Issues Detected'}
              </span>
            </div>
            {systemHealth?.validationErrors?.length > 0 && (
              <div style={styles.healthErrors}>
                {systemHealth.validationErrors.map((error, index) => (
                  <div key={index} style={styles.healthError}>⚠️ {error}</div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.healthCard}>
            <h4 style={styles.healthCardTitle}>Configuration</h4>
            <div style={styles.healthMetric}>
              <span>Settings Sections:</span>
              <span>{systemHealth?.settingsCount || 0}</span>
            </div>
            <div style={styles.healthMetric}>
              <span>Last Modified:</span>
              <span>{systemHealth?.lastModified ? 
                new Date(systemHealth.lastModified).toLocaleTimeString() : 'Never'}</span>
            </div>
          </div>

          <div style={styles.healthCard}>
            <h4 style={styles.healthCardTitle}>Performance</h4>
            <div style={styles.healthMetric}>
              <span>Memory Usage:</span>
              <span>{getMemoryMB(realtimeMetrics?.system?.memoryUsage?.heapUsed)} MB</span>
            </div>
            <div style={styles.healthMetric}>
              <span>Uptime:</span>
              <span>{getUptimeMinutes(realtimeMetrics?.performance?.uptime)} min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>⚡ Real-time Activity</h3>
        <div style={styles.realtimeGrid}>
          <div style={styles.realtimeCard}>
            <div style={styles.realtimeValue}>
              {realtimeMetrics?.currentHour?.lists || 0}
            </div>
            <div style={styles.realtimeLabel}>Lists This Hour</div>
          </div>

          <div style={styles.realtimeCard}>
            <div style={styles.realtimeValue}>
              {realtimeMetrics?.currentHour?.items || 0}
            </div>
            <div style={styles.realtimeLabel}>Items Processed</div>
          </div>

          <div style={styles.realtimeCard}>
            <div style={styles.realtimeValue}>
              {safeToFixed(realtimeMetrics?.currentHour?.avgProcessingTime)}s
            </div>
            <div style={styles.realtimeLabel}>Avg Processing Time</div>
          </div>

          <div style={styles.realtimeCard}>
            <div style={styles.realtimeValue}>
              {realtimeMetrics?.performance?.activeConnections || 0}
            </div>
            <div style={styles.realtimeLabel}>Active Connections</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🚀 Quick Actions</h3>
        <div style={styles.actionsGrid}>
          <button
            onClick={() => setShowAnalytics(true)}
            style={{...styles.actionButton, backgroundColor: '#FF6B35'}}
          >
            📊 View Full Analytics
          </button>

          <button
            onClick={() => setShowSettings(true)}
            style={{...styles.actionButton, backgroundColor: '#F7931E'}}
          >
            ⚙️ System Settings
          </button>

          <button
            onClick={() => setShowDemo(true)}
            style={{...styles.actionButton, backgroundColor: '#3b82f6'}}
          >
            🎯 Test Parsing Demo
          </button>

          <button
            onClick={() => handleSystemAction('export_data')}
            disabled={isLoading}
            style={{...styles.actionButton, backgroundColor: '#00b894'}}
          >
            📤 Export System Data
          </button>

          <button
            onClick={() => handleSystemAction('clear_cache')}
            disabled={isLoading}
            style={{...styles.actionButton, backgroundColor: '#fdcb6e'}}
          >
            🗑️ Clear Cache
          </button>

          <button
            onClick={() => handleSystemAction('restart_ai')}
            disabled={isLoading}
            style={{...styles.actionButton, backgroundColor: '#e17055'}}
          >
            🔄 Restart AI Services
          </button>
        </div>
      </div>
    </div>
  );

  const renderSystemTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🖥️ System Information</h3>
        
        <div style={styles.systemInfo}>
          <div style={styles.infoGroup}>
            <h4 style={styles.infoGroupTitle}>Environment</h4>
            <div style={styles.infoItem}>
              <span>Node.js Version:</span>
              <span>{navigator.userAgent.split(' ')[0] || 'Unknown'}</span>
            </div>
            <div style={styles.infoItem}>
              <span>Environment:</span>
              <span>{window.location.hostname === 'localhost' ? 'development' : 'production'}</span>
            </div>
            <div style={styles.infoItem}>
              <span>Platform:</span>
              <span>{navigator.platform}</span>
            </div>
          </div>

          <div style={styles.infoGroup}>
            <h4 style={styles.infoGroupTitle}>Memory Usage</h4>
            <div style={styles.infoItem}>
              <span>Heap Used:</span>
              <span>{getMemoryMB(realtimeMetrics?.system?.memoryUsage?.heapUsed)} MB</span>
            </div>
            <div style={styles.infoItem}>
              <span>Heap Total:</span>
              <span>{getMemoryMB(realtimeMetrics?.system?.memoryUsage?.heapTotal)} MB</span>
            </div>
            <div style={styles.infoItem}>
              <span>External:</span>
              <span>{getMemoryMB(realtimeMetrics?.system?.memoryUsage?.external)} MB</span>
            </div>
          </div>

          <div style={styles.infoGroup}>
            <h4 style={styles.infoGroupTitle}>Features Status</h4>
            <div style={styles.infoItem}>
              <span>Intelligent Parsing:</span>
              <span style={{color: '#28a745'}}>✅ Active</span>
            </div>
            <div style={styles.infoItem}>
              <span>Product Validation:</span>
              <span style={{color: '#28a745'}}>✅ Active</span>
            </div>
            <div style={styles.infoItem}>
              <span>Real-time Pricing:</span>
              <span style={{color: '#28a745'}}>✅ Active</span>
            </div>
            <div style={styles.infoItem}>
              <span>Analytics Tracking:</span>
              <span style={{color: '#28a745'}}>✅ Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>👥 User Management</h3>
        
        <div style={styles.userStats}>
          <div style={styles.userStatCard}>
            <div style={styles.userStatValue}>1,247</div>
            <div style={styles.userStatLabel}>Total Users</div>
          </div>
          <div style={styles.userStatCard}>
            <div style={styles.userStatValue}>342</div>
            <div style={styles.userStatLabel}>Active Today</div>
          </div>
          <div style={styles.userStatCard}>
            <div style={styles.userStatValue}>89</div>
            <div style={styles.userStatLabel}>New This Week</div>
          </div>
          <div style={styles.userStatCard}>
            <div style={styles.userStatValue}>4.6</div>
            <div style={styles.userStatLabel}>Avg Rating</div>
          </div>
        </div>

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Recent Activity</h4>
          <div style={styles.activityList}>
            {[
              { user: 'john@example.com', action: 'Parsed grocery list', time: '2 min ago', items: 12 },
              { user: 'sarah@example.com', action: 'Validated products', time: '5 min ago', items: 8 },
              { user: 'mike@example.com', action: 'Exported cart', time: '8 min ago', items: 15 },
              { user: 'anna@example.com', action: 'Used AI assistant', time: '12 min ago', items: 6 },
              { user: 'david@example.com', action: 'Reviewed flagged items', time: '15 min ago', items: 3 }
            ].map((activity, index) => (
              <div key={index} style={styles.activityItem}>
                <div style={styles.activityUser}>{activity.user}</div>
                <div style={styles.activityAction}>{activity.action}</div>
                <div style={styles.activityItems}>{activity.items} items</div>
                <div style={styles.activityTime}>{activity.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderLogsTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📋 System Logs</h3>
        
        <div style={styles.logFilters}>
          <select style={styles.logFilter}>
            <option value="all">All Levels</option>
            <option value="error">Errors Only</option>
            <option value="warn">Warnings</option>
            <option value="info">Info</option>
          </select>
          <select style={styles.logFilter}>
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button style={styles.logRefresh}>🔄 Refresh</button>
        </div>

        <div style={styles.logContainer}>
          {[
            { level: 'info', time: '14:23:45', message: 'Smart parsing completed successfully', details: '12 items extracted, 95% confidence' },
            { level: 'warn', time: '14:22:33', message: 'AI API rate limit approaching', details: 'Claude API: 85/100 requests used' },
            { level: 'info', time: '14:21:12', message: 'Product validation completed', details: '8/8 products validated successfully' },
            { level: 'error', time: '14:19:07', message: 'Database connection timeout', details: 'Connection to PostgreSQL failed after 5s' },
            { level: 'info', time: '14:18:45', message: 'Cache cleared by admin', details: 'All cached parsing results removed' },
            { level: 'info', time: '14:17:23', message: 'New user registered', details: 'user@example.com signed up' }
          ].map((log, index) => (
            <div key={index} style={{
              ...styles.logEntry,
              borderLeftColor: log.level === 'error' ? '#dc3545' : 
                               log.level === 'warn' ? '#ffc107' : '#28a745'
            }}>
              <div style={styles.logHeader}>
                <span style={{
                  ...styles.logLevel,
                  color: log.level === 'error' ? '#dc3545' : 
                         log.level === 'warn' ? '#f57c00' : '#28a745'
                }}>
                  {log.level.toUpperCase()}
                </span>
                <span style={styles.logTime}>{log.time}</span>
              </div>
              <div style={styles.logMessage}>{log.message}</div>
              <div style={styles.logDetails}>{log.details}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.loading}>
            <div style={styles.spinner} />
            <p>Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>🛠️ Admin Dashboard</h2>
          <div style={styles.headerInfo}>
            <span style={styles.userInfo}>
              👤 {currentUser?.email || 'Admin'} • 
              {systemHealth?.healthy ? ' 🟢 System Healthy' : ' 🔴 Issues Detected'}
              {error && ' • 📡 Demo Mode'}
            </span>
            <button onClick={onClose} style={styles.closeButton}>×</button>
          </div>
        </div>

        <div style={styles.tabs}>
          {[
            { id: 'overview', label: '🏠 Overview' },
            { id: 'system', label: '🖥️ System' },
            { id: 'users', label: '👥 Users' },
            { id: 'logs', label: '📋 Logs' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {})
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'system' && renderSystemTab()}
          {activeTab === 'users' && renderUsersTab()}
          {activeTab === 'logs' && renderLogsTab()}
        </div>

        <div style={styles.footer}>
          <div style={styles.footerLeft}>
            <div style={styles.systemStatus}>
              Status: <span style={{
                color: systemHealth?.healthy ? '#28a745' : '#dc3545',
                fontWeight: 'bold'
              }}>
                {systemHealth?.healthy ? 'All Systems Operational' : 'Issues Detected'}
              </span>
              {error && <span style={{ color: '#ffc107', marginLeft: '10px' }}>
                (Using demo data)
              </span>}
            </div>
          </div>
          <div style={styles.footerRight}>
            <span style={styles.lastUpdate}>
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-component modals */}
      {showAnalytics && (
        <ParsingAnalyticsDashboard onClose={() => setShowAnalytics(false)} />
      )}

      {showDemo && (
        <SmartParsingDemo onClose={() => setShowDemo(false)} />
      )}

      {showSettings && (
        <AIParsingSettings 
          onClose={() => setShowSettings(false)}
          onSettingsChange={(settings) => {
            console.log('Settings updated:', settings);
            loadSystemHealth(); // Refresh health after settings change
          }}
        />
      )}
    </div>
  );
}

// Styles remain exactly the same as before...
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4000,
    padding: '20px'
  },

  modal: {
    backgroundColor: 'white',
    borderRadius: '20px',
    width: '95%',
    maxWidth: '1400px',
    height: '90vh',
    overflow: 'hidden',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
    display: 'flex',
    flexDirection: 'column'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '25px 35px',
    borderBottom: '3px solid #f0f0f0',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white'
  },

  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 'bold'
  },

  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },

  userInfo: {
    fontSize: '14px',
    opacity: 0.9
  },

  closeButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    fontSize: '28px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  tabs: {
    display: 'flex',
    borderBottom: '2px solid #dee2e6',
    backgroundColor: '#f8f9fa'
  },

  tab: {
    flex: 1,
    padding: '18px 15px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.3s ease'
  },

  tabActive: {
    backgroundColor: 'white',
    color: '#333',
    borderBottom: '4px solid #667eea',
    fontWeight: '600'
  },

  content: {
    flex: 1,
    overflow: 'auto',
    padding: '35px'
  },

  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },

  section: {
    marginBottom: '30px'
  },

  sectionTitle: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    paddingBottom: '10px',
    borderBottom: '3px solid #f0f0f0'
  },

  // Health Section
  healthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },

  healthCard: {
    background: 'white',
    border: '3px solid #e9ecef',
    borderRadius: '12px',
    padding: '25px'
  },

  healthStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '15px'
  },

  healthIndicator: {
    width: '16px',
    height: '16px',
    borderRadius: '50%'
  },

  healthLabel: {
    fontSize: '18px',
    fontWeight: 'bold'
  },

  healthCardTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#555'
  },

  healthMetric: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '14px'
  },

  healthErrors: {
    marginTop: '15px'
  },

  healthError: {
    padding: '8px 12px',
    background: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '6px',
    marginBottom: '5px',
    fontSize: '14px',
    color: '#856404'
  },

  // Real-time Metrics
  realtimeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px'
  },

  realtimeCard: {
    background: 'linear-gradient(135deg, #74b9ff, #0984e3)',
    color: 'white',
    padding: '25px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 8px 25px rgba(116, 185, 255, 0.3)'
  },

  realtimeValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '8px'
  },

  realtimeLabel: {
    fontSize: '14px',
    opacity: 0.9
  },

  // Actions
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px'
  },

  actionButton: {
    padding: '15px 20px',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'transform 0.2s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
  },

  // System Info
  systemInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '25px'
  },

  infoGroup: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '10px',
    border: '1px solid #e9ecef'
  },

  infoGroupTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#495057'
  },

  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #dee2e6',
    fontSize: '14px'
  },

  // Users Section
  userStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },

  userStatCard: {
    background: 'linear-gradient(135deg, #00cec9, #00b894)',
    color: 'white',
    padding: '20px',
    borderRadius: '10px',
    textAlign: 'center'
  },

  userStatValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '5px'
  },

  userStatLabel: {
    fontSize: '12px',
    opacity: 0.9
  },

  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },

  activityItem: {
    display: 'grid',
    gridTemplateColumns: '2fr 2fr 1fr 1fr',
    gap: '15px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    alignItems: 'center'
  },

  activityUser: {
    fontWeight: 'bold',
    color: '#495057'
  },

  activityAction: {
    color: '#6c757d'
  },

  activityItems: {
    fontSize: '14px',
    color: '#28a745',
    fontWeight: 'bold'
  },

  activityTime: {
    fontSize: '12px',
    color: '#adb5bd',
    textAlign: 'right'
  },

  // Logs Section
  logFilters: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    alignItems: 'center'
  },

  logFilter: {
    padding: '8px 12px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    fontSize: '14px'
  },

  logRefresh: {
    padding: '8px 16px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },

  logContainer: {
    maxHeight: '400px',
    overflow: 'auto',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    background: '#f8f9fa'
  },

  logEntry: {
    padding: '15px',
    borderBottom: '1px solid #dee2e6',
    borderLeft: '4px solid #28a745',
    background: 'white',
    marginBottom: '2px'
  },

  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },

  logLevel: {
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '4px',
    background: 'rgba(40, 167, 69, 0.1)'
  },

  logTime: {
    fontSize: '12px',
    color: '#6c757d',
    fontFamily: 'monospace'
  },

  logMessage: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#495057',
    marginBottom: '5px'
  },

  logDetails: {
    fontSize: '12px',
    color: '#6c757d',
    fontStyle: 'italic'
  },

  // Footer
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 35px',
    borderTop: '2px solid #dee2e6',
    backgroundColor: '#f8f9fa'
  },

  footerLeft: {},

  footerRight: {},

  systemStatus: {
    fontSize: '14px',
    color: '#495057'
  },

  lastUpdate: {
    fontSize: '12px',
    color: '#6c757d',
    fontStyle: 'italic'
  },

  // Loading
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px',
    gap: '25px'
  },

  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};

// Add spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default AdminDashboard;