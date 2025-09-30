// client/src/components/AdminDashboard.js - Fixed with proper null checking and dynamic imports
import React, { useState, useEffect, useCallback } from 'react';
import ParsingAnalyticsDashboard from './ParsingAnalyticsDashboard';
import agentMonitoringService from '../services/agentMonitoringService';
// New agent components
import AgentChatInterface from './AgentChatInterface';
import EnhancedErrorLogViewer from './EnhancedErrorLogViewer';
import AgentWorkJournal from './AgentWorkJournal';
import WorkReviewDashboard from './WorkReviewDashboard';

function AdminDashboard({ onClose, currentUser }) {
  // All hooks must be called before any conditional returns
  const [activeTab, setActiveTab] = useState('overview');
  const [systemHealth, setSystemHealth] = useState(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState(null);
  const [userActivity, setUserActivity] = useState(null);
  const [userAccounts, setUserAccounts] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verificationFilter, setVerificationFilter] = useState('verified'); // 'all', 'verified', 'unverified'

  // Sub-component states
  const [showSettings, setShowSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Revenue and monitoring states
  const [revenueData, setRevenueData] = useState(null);
  const [externalServices, setExternalServices] = useState(null);
  const [dateRange, setDateRange] = useState('30d'); // 7d, 30d, 90d, 6m, 1y

  // Agent monitoring states
  const [agents, setAgents] = useState([]);
  const [agentActivities, setAgentActivities] = useState([]);
  const [agentOverview, setAgentOverview] = useState(null);
  const [agentSubTab, setAgentSubTab] = useState('overview'); // Sub-tab for agent section

  // Opus usage monitoring
  const [opusUsage, setOpusUsage] = useState(null);
  const [opusLoading, setOpusLoading] = useState(false);

  // Work reviews for overview widget
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Define all callbacks before conditional returns
  const loadSystemHealth = useCallback(async () => {
    try {
      // Loading system health
      const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const response = await fetch(`${apiUrl}/api/settings/health/check`);
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data);
        if (error && data.success) setError(null);
      } else if (response.status === 404) {
        // Health check endpoint doesn't exist - use mock data
        // Health check endpoint not found, using mock data
        setSystemHealth({
          status: 'operational',
          uptime: '99.9%',
          responseTime: '120ms',
          version: '1.0.0',
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(`HTTP ${response.status}: Health check failed`);
      }
    } catch (error) {
      // Failed to load system health
      setError(error.message);
      setSystemHealth(null);
    }
  }, [error]);

  const loadUserActivity = useCallback(async () => {
    try {
      // Loading user activity
      const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const response = await fetch(`${apiUrl}/api/analytics/users/activity?limit=10&hours=24`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // User activity loaded
        setUserActivity(data);
      } else {
        // Failed to load user activity
        throw new Error(`HTTP ${response.status}: Failed to load user activity`);
      }
    } catch (error) {
      // Error loading user activity
      // Set empty state instead of null to show "No data found" instead of "Loading..."
      setUserActivity({ activities: [], stats: { activeUsers: 0, totalActivities: 0 } });
    }
  }, []);

  const loadUserAccounts = useCallback(async () => {
    try {
      // Loading Firebase user accounts
      const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';

      // Get auth token from currentUser
      const token = currentUser ? await currentUser.getIdToken() : null;

      const response = await fetch(`${apiUrl}/api/analytics/users/accounts?limit=20`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // User accounts loaded
        setUserAccounts(data);
      } else {
        // Failed to load user accounts
        throw new Error(`HTTP ${response.status}: Failed to load user accounts`);
      }
    } catch (error) {
      console.error('❌ Error loading user accounts:', error);
      // Set empty state instead of null to show "No data found"
      setUserAccounts({ users: [], totalUsers: 0 });
    }
  }, [currentUser]);

  const loadRevenueData = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const endDate = new Date();
      let startDate = new Date();

      switch (dateRange) {
        case '7d': startDate.setDate(startDate.getDate() - 7); break;
        case '30d': startDate.setDate(startDate.getDate() - 30); break;
        case '90d': startDate.setDate(startDate.getDate() - 90); break;
        case '6m': startDate.setMonth(startDate.getMonth() - 6); break;
        case '1y': startDate.setFullYear(startDate.getFullYear() - 1); break;
        default: startDate.setDate(startDate.getDate() - 30); break;
      }

      const [summaryRes, mrrRes, growthRes, costsRes] = await Promise.all([
        fetch(`${apiUrl}/api/revenue/summary?start=${startDate.toISOString()}&end=${endDate.toISOString()}`),
        fetch(`${apiUrl}/api/revenue/mrr`),
        fetch(`${apiUrl}/api/revenue/growth`),
        fetch(`${apiUrl}/api/monitoring/costs/current`)
      ]);

      const summary = summaryRes.ok ? await summaryRes.json() : {};
      const mrr = mrrRes.ok ? await mrrRes.json() : {};
      const growth = growthRes.ok ? await growthRes.json() : {};
      const costs = costsRes.ok ? await costsRes.json() : {};

      // Calculate real financial metrics including potentially negative values
      const totalRevenue = summary.totalRevenue || 0;
      const totalCosts = costs.total || summary.totalCosts || 0;
      const netProfit = totalRevenue - totalCosts; // Can be negative
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      setRevenueData({
        summary: {
          ...summary,
          totalRevenue,
          totalCosts,
          netProfit,
          profitMargin
        },
        mrr,
        growth,
        costs
      });
    } catch (error) {
      console.error('Failed to load revenue data:', error);
      setError('Failed to load revenue data. Showing actual values.');

      // Show real zeros/empty data instead of mock data when API fails
      // This ensures transparency about actual financial status
      setRevenueData({
        summary: {
          totalRevenue: 0,
          totalCosts: 0,
          netProfit: 0,
          profitMargin: 0,
          revenueByType: [],
          dailyRevenue: []
        },
        mrr: {
          totalMRR: 0,
          subscriberCount: 0,
          byTier: []
        },
        growth: {
          revenueGrowth: { current: 0, previous: 0, growthRate: 0, trend: 'flat' },
          subscriberMetrics: { newSubscribers: 0, churnedSubscribers: 0, netGrowth: 0, churnRate: 0 }
        }
      });
    }
  }, [dateRange]);

  const loadAgentData = useCallback(() => {
    try {
      const agentsList = agentMonitoringService.getAllAgents();
      const activities = agentMonitoringService.getRecentActivities(50);
      const overview = agentMonitoringService.getSystemOverview();

      setAgents(agentsList);
      setAgentActivities(activities);
      setAgentOverview(overview);
    } catch (error) {
      console.error('Error loading agent data:', error);
    }
  }, []);

  const handleTriggerAllAgents = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const token = currentUser ? await currentUser.getIdToken() : null;
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      // Show loading state
      const agentsList = agents.map(agent => ({ ...agent, status: 'running' }));
      setAgents(agentsList);

      const response = await fetch(`${apiUrl}/api/agent/trigger-all`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          initiator: currentUser?.email || 'admin'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Triggered all agents:', result);

        // Refresh agent data after a delay
        setTimeout(() => {
          loadAgentData();
        }, 2000);
      } else {
        console.warn('Failed to trigger all agents');
        // Reset status
        loadAgentData();
      }
    } catch (error) {
      console.error('Failed to trigger all agents:', error);
      loadAgentData();
    }
  };

  const loadExternalServices = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const [health, usage, costs] = await Promise.all([
        fetch(`${apiUrl}/api/monitoring/health`).then(r => r.json()),
        fetch(`${apiUrl}/api/monitoring/usage/30d`).then(r => r.json()),
        fetch(`${apiUrl}/api/monitoring/costs/current`).then(r => r.json())
      ]);

      setExternalServices({ health, usage, costs });
    } catch (error) {
      console.error('Failed to load external services:', error);
      // Use mock data if API fails
      setExternalServices({
        health: {
          instacart: { status: 'operational', responseTime: 142, uptime: 99.9 },
          spoonacular: { status: 'operational', responseTime: 86, uptime: 99.8, quotaUsed: 42, quotaLeft: 458 },
          openai: { status: 'operational', responseTime: 210, uptime: 99.7 },
          anthropic: { status: 'operational', responseTime: 180, uptime: 99.9 },
          google: { status: 'operational', responseTime: 95, uptime: 99.9 },
          firebase: { status: 'operational', activeUsers: 847, requests: 12453 },
          mongodb: { status: 'operational', connections: 18, storage: '2.4GB' },
          vercel: { status: 'operational', responseTime: 142, uptime: 99.9 },
          render: { status: 'operational', responseTime: 286, uptime: 99.7 },
          kroger: { status: 'not_configured', message: 'Optional integration' }
        },
        usage: {
          openai: { requests: 3421, tokens: 2845632, cost: 142.28 },
          anthropic: { requests: 892, tokens: 723451, cost: 36.17 },
          spoonacular: { requests: 1245, cost: 24.90 },
          instacart: { requests: 8934, cost: 0 }
        },
        costs: {
          totalCosts: 324.85,
          projectedMonthly: 649.70,
          byService: [
            { service: 'OpenAI', cost: 142.28, percentage: 43.8 },
            { service: 'Render', cost: 84.00, percentage: 25.9 },
            { service: 'Anthropic', cost: 36.17, percentage: 11.1 },
            { service: 'MongoDB', cost: 25.00, percentage: 7.7 },
            { service: 'Spoonacular', cost: 24.90, percentage: 7.7 },
            { service: 'Vercel', cost: 12.50, percentage: 3.8 }
          ]
        }
      });
    }
  }, []);

  const loadPendingReviews = useCallback(async () => {
    try {
      setReviewsLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const token = currentUser ? await currentUser.getIdToken() : null;
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const response = await fetch(`${apiUrl}/api/agent/work/pending-reviews`, { headers });

      if (response.ok) {
        const data = await response.json();
        setPendingReviews(data.reviews || []);
      } else {
        // Use sample data for demo
        setPendingReviews([
          {
            id: 'REVIEW-001',
            workId: 'WORK-001',
            agentAlias: 'Dash',
            title: 'Enhanced Admin Dashboard Analytics',
            priority: 'HIGH',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
          },
          {
            id: 'REVIEW-002',
            workId: 'WORK-002',
            agentAlias: 'SecOps',
            title: 'Critical Security Patch - XSS Prevention',
            priority: 'CRITICAL',
            timestamp: new Date(Date.now() - 30 * 60 * 1000)
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load pending reviews:', error);
      setPendingReviews([]);
    }
    setReviewsLoading(false);
  }, [currentUser]);

  const handleQuickApprove = async (reviewId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const token = currentUser ? await currentUser.getIdToken() : null;
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const response = await fetch(`${apiUrl}/api/agent/work/review/${reviewId}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ approved: true })
      });

      if (response.ok) {
        // Remove from pending reviews
        setPendingReviews(prev => prev.filter(r => r.id !== reviewId));
      }
    } catch (error) {
      console.error('Failed to approve review:', error);
    }
  };

  const handleQuickReject = async (reviewId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const token = currentUser ? await currentUser.getIdToken() : null;
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const response = await fetch(`${apiUrl}/api/agent/work/review/${reviewId}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ approved: false })
      });

      if (response.ok) {
        // Remove from pending reviews
        setPendingReviews(prev => prev.filter(r => r.id !== reviewId));
      }
    } catch (error) {
      console.error('Failed to reject review:', error);
    }
  };

  const loadOpusUsage = useCallback(async () => {
    try {
      setOpusLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const response = await fetch(`${apiUrl}/api/monitoring/opus-usage`);

      if (response.ok) {
        const data = await response.json();
        setOpusUsage(data);
      } else {
        console.warn('Failed to load Opus usage data');
        // Set mock data for demonstration
        setOpusUsage({
          usage: {
            tokens: {
              used: 36000,
              limit: 50000,
              remaining: 14000
            },
            percentage: 72,
            cost: 45.20,
            requests: {
              total: 240,
              successful: 238,
              failed: 2
            }
          },
          status: 'warning',
          statusMessage: 'Warning: Opus usage at 72% of weekly limit',
          resetDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          daysUntilReset: 3,
          projections: {
            dailyAverage: 9000,
            weeklyProjected: 63000,
            willExceedLimit: true
          },
          recommendations: [
            {
              priority: 'HIGH',
              action: 'Enable aggressive caching',
              message: 'Approaching Opus limit. Enable response caching for common queries.'
            }
          ]
        });
      }
    } catch (error) {
      console.error('Failed to load Opus usage:', error);
    } finally {
      setOpusLoading(false);
    }
  }, []);

  const loadRealtimeMetrics = useCallback(async () => {
    try {
      // Get Firebase auth token
      const token = currentUser ? await currentUser.getIdToken() : null;
      if (!token) {
        console.warn('No auth token available for realtime metrics');
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const response = await fetch(`${apiUrl}/api/analytics/realtime`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRealtimeMetrics(data.metrics);
        setError(null); // Clear any previous errors
      } else {
        console.warn(`Realtime metrics returned ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to load realtime metrics:', error);
      // Don't set error state for realtime metrics to avoid interrupting other operations
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // useEffect must be declared before conditional returns
  useEffect(() => {
    // AdminDashboard mounting for user

    const initializeAdmin = async () => {
      try {
        setIsLoading(true);
        await Promise.allSettled([
          loadSystemHealth(),
          loadRealtimeMetrics(),
          loadUserActivity(),
          loadUserAccounts(),
          loadRevenueData(),
          loadExternalServices(),
          loadOpusUsage(),
          loadPendingReviews()
        ]);
        setIsLoading(false);
      } catch (error) {
        console.error('❌ AdminDashboard initialization failed:', error);
        setError('Failed to initialize admin dashboard');
        setIsLoading(false);
      }
    };

    initializeAdmin();

    // Set up auto-refresh for real-time data
    const interval = setInterval(() => {
      loadRealtimeMetrics().catch(console.error);
      loadUserActivity().catch(console.error);
    }, 30000); // Reduced frequency to 30 seconds

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentUser?.email]); // Only re-run when user changes

  // Load tab-specific data when active tab changes
  useEffect(() => {
    if (!currentUser?.isAdmin) return;

    if (activeTab === 'revenue') {
      loadRevenueData().catch(console.error);
    } else if (activeTab === 'services') {
      loadExternalServices().catch(console.error);
    } else if (activeTab === 'agents') {
      loadAgentData();
      const interval = setInterval(loadAgentData, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, currentUser?.isAdmin, loadAgentData]); // Only depends on tab change

  // Check access after all hooks are declared
  if (!currentUser || !currentUser.isAdmin) {
    console.warn('⚠️ AdminDashboard: Non-admin user attempted access');
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 9999
      }}>
        <div style={{
          background: 'white', padding: '20px', borderRadius: '8px',
          maxWidth: '400px', textAlign: 'center'
        }}>
          <h3>Access Denied</h3>
          <p>Admin access required.</p>
          <button onClick={onClose} style={{
            background: '#dc3545', color: 'white', border: 'none',
            padding: '10px 20px', borderRadius: '4px', cursor: 'pointer'
          }}>
            Close
          </button>
        </div>
      </div>
    );
  }

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

  // Filter Firebase users based on verification status
  const getFilteredUsers = (users) => {
    if (!users) return [];
    if (verificationFilter === 'all') return users;
    if (verificationFilter === 'verified') return users.filter(user => user.emailVerified);
    if (verificationFilter === 'unverified') return users.filter(user => !user.emailVerified);
    return users;
  };

  // Helper function to safely get uptime in minutes
  const getUptimeMinutes = (seconds) => {
    const num = Number(seconds);
    return isNaN(num) ? 0 : Math.round(num / 60);
  };

  const handleSystemAction = async (action) => {
    setIsLoading(true);
    const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
    try {
      switch (action) {
        case 'restart_ai':
          await fetch(`${apiUrl}/api/ai/restart`, { method: 'POST' });
          alert('🔄 AI services restarted');
          break;
        case 'clear_cache':
          await fetch(`${apiUrl}/api/cache/clear`, { method: 'POST' });
          alert('🗑️ Cache cleared');
          break;
        case 'export_data':
          const response = await fetch(`${apiUrl}/api/analytics/export`);
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
              <span>{realtimeMetrics ? getMemoryMB(realtimeMetrics.system?.memoryUsage?.heapUsed) + ' MB' : 'Loading...'}</span>
            </div>
            <div style={styles.healthMetric}>
              <span>Uptime:</span>
              <span>{realtimeMetrics ? getUptimeMinutes(realtimeMetrics.performance?.uptime) + ' min' : 'Loading...'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>💰 Financial Overview</h3>
        <div style={styles.financialGrid}>
          <div style={styles.financialCard}>
            <div style={styles.financialIcon}>💵</div>
            <div style={styles.financialContent}>
              <div style={styles.financialLabel}>Total Revenue</div>
              <div style={styles.financialValue}>
                ${Number(revenueData?.summary?.totalRevenue || 0).toFixed(2)}
              </div>
              <div style={styles.financialTrend}>
                {Number(revenueData?.growth?.revenueGrowth?.growthRate) > 0 ? (
                  <span style={{ color: '#28a745' }}>
                    ↑ {Math.abs(Number(revenueData?.growth?.revenueGrowth?.growthRate || 0)).toFixed(1)}%
                  </span>
                ) : Number(revenueData?.growth?.revenueGrowth?.growthRate) < 0 ? (
                  <span style={{ color: '#dc3545' }}>
                    ↓ {Math.abs(Number(revenueData?.growth?.revenueGrowth?.growthRate || 0)).toFixed(1)}%
                  </span>
                ) : (
                  <span style={{ color: '#6c757d' }}>— 0.0%</span>
                )}
              </div>
            </div>
          </div>

          <div style={styles.financialCard}>
            <div style={styles.financialIcon}>💸</div>
            <div style={styles.financialContent}>
              <div style={styles.financialLabel}>Total Costs</div>
              <div style={styles.financialValue}>
                ${Number(revenueData?.summary?.totalCosts || 0).toFixed(2)}
              </div>
              <div style={styles.financialSubtext}>
                {Number(revenueData?.summary?.totalRevenue) > 0
                  ? `${((Number(revenueData?.summary?.totalCosts || 0) / Number(revenueData?.summary?.totalRevenue)) * 100).toFixed(1)}% of revenue`
                  : 'No revenue yet'}
              </div>
            </div>
          </div>

          <div style={styles.financialCard}>
            <div style={styles.financialIcon}>
              {Number(revenueData?.summary?.netProfit) >= 0 ? '📈' : '📉'}
            </div>
            <div style={styles.financialContent}>
              <div style={styles.financialLabel}>Net Profit/Loss</div>
              <div style={{
                ...styles.financialValue,
                color: Number(revenueData?.summary?.netProfit) >= 0 ? '#28a745' : '#dc3545'
              }}>
                ${Number(revenueData?.summary?.netProfit || 0).toFixed(2)}
              </div>
              <div style={styles.financialSubtext}>
                {revenueData?.summary?.profitMargin
                  ? `${Number(revenueData.summary.profitMargin).toFixed(1)}% margin`
                  : '0.0% margin'}
              </div>
            </div>
          </div>

          <div style={styles.financialCard}>
            <div style={styles.financialIcon}>📊</div>
            <div style={styles.financialContent}>
              <div style={styles.financialLabel}>MRR</div>
              <div style={styles.financialValue}>
                ${Number(revenueData?.mrr?.totalMRR || 0).toFixed(2)}
              </div>
              <div style={styles.financialSubtext}>
                {Number(revenueData?.mrr?.subscriberCount || 0)} subscribers
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Work Review Dashboard */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📋 Work Review</h3>
        {reviewsLoading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading pending reviews...</div>
        ) : pendingReviews.length > 0 ? (
          <div style={styles.workReviewGrid}>
            {pendingReviews.slice(0, 4).map(review => (
              <div key={review.id} style={styles.workReviewCard}>
                <div style={styles.workReviewHeader}>
                  <span style={{
                    ...styles.priorityBadge,
                    backgroundColor: review.priority === 'CRITICAL' ? '#dc3545' :
                                   review.priority === 'HIGH' ? '#ff6b6b' :
                                   review.priority === 'MEDIUM' ? '#ffd93d' : '#6bcf7f'
                  }}>
                    {review.priority}
                  </span>
                  <span style={styles.agentBadge}>{review.agentAlias}</span>
                </div>
                <div style={styles.workReviewTitle}>{review.title}</div>
                <div style={styles.workReviewTime}>
                  {new Date(review.timestamp).toLocaleString()}
                </div>
                <div style={styles.workReviewActions}>
                  <button
                    onClick={() => handleQuickApprove(review.id)}
                    style={{
                      ...styles.actionButton,
                      backgroundColor: '#28a745'
                    }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleQuickReject(review.id)}
                    style={{
                      ...styles.actionButton,
                      backgroundColor: '#dc3545'
                    }}
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            color: '#6c757d'
          }}>
            No pending reviews at this time
          </div>
        )}
        {pendingReviews.length > 4 && (
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <button
              onClick={() => setActiveTab('work-review')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              View All {pendingReviews.length} Reviews
            </button>
          </div>
        )}
      </div>

      {/* Real-time Metrics */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>⚡ Real-time Activity</h3>
        <div style={styles.realtimeGrid}>
          <div style={styles.realtimeCard}>
            <div style={styles.realtimeValue}>
              {realtimeMetrics ? realtimeMetrics.currentHour?.lists || 0 : '--'}
            </div>
            <div style={styles.realtimeLabel}>Lists This Hour</div>
          </div>

          <div style={styles.realtimeCard}>
            <div style={styles.realtimeValue}>
              {realtimeMetrics ? realtimeMetrics.currentHour?.items || 0 : '--'}
            </div>
            <div style={styles.realtimeLabel}>Items Processed</div>
          </div>

          <div style={styles.realtimeCard}>
            <div style={styles.realtimeValue}>
              {realtimeMetrics ? safeToFixed(realtimeMetrics.currentHour?.avgProcessingTime) + 's' : '--'}
            </div>
            <div style={styles.realtimeLabel}>Avg Processing Time</div>
          </div>

          <div style={styles.realtimeCard}>
            <div style={styles.realtimeValue}>
              {realtimeMetrics ? realtimeMetrics.performance?.activeConnections || 0 : '--'}
            </div>
            <div style={styles.realtimeLabel}>Active Connections</div>
          </div>
        </div>
      </div>

      {/* Opus Usage Widget */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🤖 Claude Opus Weekly Usage</h3>
        {opusUsage ? (
          <div style={{
            padding: '20px',
            backgroundColor: opusUsage.status === 'critical' ? '#fee' :
                           opusUsage.status === 'warning' ? '#fff3cd' :
                           '#f8f9fa',
            borderRadius: '8px',
            border: `2px solid ${
              opusUsage.status === 'critical' ? '#dc3545' :
              opusUsage.status === 'warning' ? '#ffc107' :
              '#28a745'
            }`
          }}>
            {/* Progress Bar */}
            <div style={{
              backgroundColor: '#e9ecef',
              borderRadius: '10px',
              height: '30px',
              marginBottom: '15px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: opusUsage.usage.percentage >= 95 ? '#dc3545' :
                               opusUsage.usage.percentage >= 80 ? '#ffc107' :
                               '#28a745',
                height: '100%',
                width: `${Math.min(opusUsage.usage.percentage, 100)}%`,
                borderRadius: '10px',
                transition: 'width 0.5s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '10px'
              }}>
                <span style={{
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  {Number(opusUsage.usage.percentage || 0).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '15px',
              marginBottom: '15px'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>📊 Tokens Used</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {opusUsage.usage.tokens.used.toLocaleString()} / {opusUsage.usage.tokens.limit.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>📅 Resets In</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {opusUsage.daysUntilReset} day{opusUsage.daysUntilReset !== 1 ? 's' : ''}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>💰 Weekly Cost</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  ${Number(opusUsage.usage.cost || 0).toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>📈 Daily Average</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {opusUsage.projections?.dailyAverage?.toLocaleString() || '0'} tokens
                </div>
              </div>
            </div>

            {/* Status Message */}
            {opusUsage.statusMessage && (
              <div style={{
                padding: '10px',
                backgroundColor: opusUsage.status === 'critical' ? '#f8d7da' :
                               opusUsage.status === 'warning' ? '#fff3cd' :
                               '#d4edda',
                borderRadius: '5px',
                marginBottom: '10px',
                fontSize: '14px',
                color: opusUsage.status === 'critical' ? '#721c24' :
                       opusUsage.status === 'warning' ? '#856404' :
                       '#155724'
              }}>
                {opusUsage.status === 'critical' ? '⚠️' :
                 opusUsage.status === 'warning' ? '⚠️' : '✅'} {opusUsage.statusMessage}
              </div>
            )}

            {/* Recommendations */}
            {opusUsage.recommendations && opusUsage.recommendations.length > 0 && (
              <div style={{
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '5px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>
                  💡 Recommendations:
                </div>
                {opusUsage.recommendations.map((rec, index) => (
                  <div key={index} style={{
                    padding: '5px 0',
                    fontSize: '13px',
                    color: rec.priority === 'CRITICAL' ? '#dc3545' :
                           rec.priority === 'HIGH' ? '#ffc107' :
                           '#495057'
                  }}>
                    • {rec.message}
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            {opusUsage.usage.percentage >= 80 && (
              <div style={{
                display: 'flex',
                gap: '10px',
                marginTop: '15px'
              }}>
                <button
                  onClick={() => alert('Switching to GPT-4 fallback...')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Switch to GPT-4
                </button>
                <button
                  onClick={() => alert('Enabling cache mode...')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  💾 Enable Cache Mode
                </button>
              </div>
            )}
          </div>
        ) : opusLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading Opus usage data...
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
            Unable to load Opus usage data
          </div>
        )}
      </div>

      {/* Recent User Activity */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>👥 Recent User Activity</h3>
        {userActivity ? (
          <div style={styles.activityContainer}>
            <div style={styles.activityStats}>
              <div style={styles.activityStat}>
                <span style={styles.activityStatValue}>{userActivity.stats?.totalActivities || 0}</span>
                <span style={styles.activityStatLabel}>Activities (24h)</span>
              </div>
              <div style={styles.activityStat}>
                <span style={styles.activityStatValue}>{userActivity.stats?.activeUsers || 0}</span>
                <span style={styles.activityStatLabel}>Active Users</span>
              </div>
            </div>
            <div style={styles.activityList}>
              {userActivity.activities?.slice(0, 8).map((activity, index) => (
                <div key={activity.id} style={styles.activityItem}>
                  <div style={styles.activityIcon}>
                    {activity.type === 'registration' ? '👤' :
                     activity.type === 'signin' ? '🔑' :
                     activity.type === 'list_created' ? '📝' :
                     activity.type === 'list_parsed' ? '🤖' :
                     activity.type === 'cart_sent' ? '🛒' :
                     activity.type === 'recipe_saved' ? '👨‍🍳' :
                     activity.type === 'meal_planned' ? '📅' :
                     activity.type === 'profile_updated' ? '⚙️' : '📊'}
                  </div>
                  <div style={styles.activityContent}>
                    <div style={styles.activityAction}>{activity.action}</div>
                    <div style={styles.activityDetails}>
                      {activity.userName} • {new Date(activity.timestamp).toLocaleTimeString()}
                      {activity.metadata?.itemCount && ` • ${activity.metadata.itemCount} items`}
                      {activity.metadata?.estimatedValue && ` • ${activity.metadata.estimatedValue}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={styles.activityPlaceholder}>
            <span style={styles.loadingText}>Loading user activity...</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🚀 Quick Actions</h3>
        <div style={styles.actionsGrid}>

          <button
            onClick={() => setShowAnalytics(true)}
            style={{...styles.actionButton, backgroundColor: '#2196F3'}}
          >
            📊 Analytics Dashboard
          </button>

          <button
            onClick={() => setShowSettings(true)}
            style={{...styles.actionButton, backgroundColor: '#F7931E'}}
          >
            ⚙️ System Settings
          </button>

          <button
            onClick={() => handleSystemAction('export_data')}
            disabled={isLoading}
            style={{...styles.actionButton, backgroundColor: '#F7931E'}}
          >
            📤 Export System Data
          </button>

          <button
            onClick={() => handleSystemAction('clear_cache')}
            disabled={isLoading}
            style={{...styles.actionButton, backgroundColor: '#FF6B35'}}
          >
            🗑️ Clear Cache
          </button>

          <button
            onClick={() => handleSystemAction('restart_ai')}
            disabled={isLoading}
            style={{...styles.actionButton, backgroundColor: '#F7931E'}}
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
              <span>{realtimeMetrics ? getMemoryMB(realtimeMetrics.system?.memoryUsage?.heapUsed) + ' MB' : 'Loading...'}</span>
            </div>
            <div style={styles.infoItem}>
              <span>Heap Total:</span>
              <span>{realtimeMetrics ? getMemoryMB(realtimeMetrics.system?.memoryUsage?.heapTotal) + ' MB' : 'Loading...'}</span>
            </div>
            <div style={styles.infoItem}>
              <span>External:</span>
              <span>{realtimeMetrics ? getMemoryMB(realtimeMetrics.system?.memoryUsage?.external) + ' MB' : 'Loading...'}</span>
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
            <div style={styles.userStatValue}>{userActivity?.stats?.activeUsers || 0}</div>
            <div style={styles.userStatLabel}>Active Users</div>
          </div>
          <div style={styles.userStatCard}>
            <div style={styles.userStatValue}>{userActivity?.stats?.totalActivities || 0}</div>
            <div style={styles.userStatLabel}>Total Activities</div>
          </div>
          <div style={styles.userStatCard}>
            <div style={styles.userStatValue}>{userActivity?.stats?.activityTypes?.signin || 0}</div>
            <div style={styles.userStatLabel}>Sign-ins Today</div>
          </div>
          <div style={styles.userStatCard}>
            <div style={styles.userStatValue}>{userActivity?.stats?.timeRange || '24h'}</div>
            <div style={styles.userStatLabel}>Time Range</div>
          </div>
        </div>

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Recent User Activity</h4>
          <div style={styles.activityList}>
            {userActivity && userActivity.activities ? userActivity.activities.map((activity, index) => (
              <div key={index} style={styles.activityItem}>
                <div style={styles.activityUser}>
                  {activity.userName || activity.userEmail || 'Unknown User'}
                </div>
                <div style={styles.activityAction}>{activity.action}</div>
                <div style={styles.activityItems}>
                  {activity.metadata?.itemCount ? `${activity.metadata.itemCount} items` : 
                   activity.metadata?.estimatedValue ? activity.metadata.estimatedValue : 
                   activity.type || 'activity'}
                </div>
                <div style={styles.activityTime}>
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </div>
              </div>
            )) : (
              <div style={styles.noData}>
                {userActivity === null ? 'Loading user activity...' : 'No recent user activity found'}
              </div>
            )}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h4 style={styles.sectionTitle}>
              Firebase User Accounts
              {userAccounts?.statusMessage && (
                <span style={{
                  fontSize: '12px',
                  fontWeight: 'normal',
                  marginLeft: '12px',
                  color: userAccounts.isRealData ? '#22c55e' : '#f59e0b',
                  backgroundColor: userAccounts.isRealData ? '#dcfce7' : '#fef3c7',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {userAccounts.statusMessage}
                </span>
              )}
            </h4>
            <div style={styles.verificationToggle}>
              <button
                style={{
                  ...styles.toggleButton,
                  ...(verificationFilter === 'all' ? styles.toggleButtonActive : {})
                }}
                onClick={() => setVerificationFilter('all')}
              >
                All ({userAccounts?.users?.length || 0})
              </button>
              <button
                style={{
                  ...styles.toggleButton,
                  ...(verificationFilter === 'verified' ? styles.toggleButtonActive : {})
                }}
                onClick={() => setVerificationFilter('verified')}
              >
                ✅ Verified ({userAccounts?.users?.filter(u => u.emailVerified).length || 0})
              </button>
              <button
                style={{
                  ...styles.toggleButton,
                  ...(verificationFilter === 'unverified' ? styles.toggleButtonActive : {})
                }}
                onClick={() => setVerificationFilter('unverified')}
              >
                ⚠️ Unverified ({userAccounts?.users?.filter(u => !u.emailVerified).length || 0})
              </button>
            </div>
          </div>
          <div style={styles.userAccountsList}>
            {userAccounts && userAccounts.users ? getFilteredUsers(userAccounts.users).map((user, index) => (
              <div key={user.uid} style={styles.userAccountItem}>
                <div style={styles.userAccountDetails}>
                  <div style={styles.userAccountHeader}>
                    <span style={styles.userAccountName}>
                      {user.displayName !== 'No name' ? user.displayName : user.email}
                    </span>
                    <span style={styles.userAccountStatus}>
                      {user.emailVerified ? '✅ Verified' : '⚠️ Unverified'}
                    </span>
                  </div>
                  <div style={styles.userAccountEmail}>{user.email}</div>
                  <div style={styles.userAccountMeta}>
                    <span>Created: {new Date(user.creationTime).toLocaleDateString()}</span>
                    <span>Last Sign-in: {new Date(user.lastSignInTime).toLocaleDateString()}</span>
                    <span>Provider: {user.providerData[0]?.providerId || 'unknown'}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div style={styles.noData}>
                {userAccounts === null ? 'Loading Firebase accounts...' : 
                 getFilteredUsers(userAccounts?.users || []).length === 0 ? 
                 `No ${verificationFilter} users found` : 'No Firebase user accounts found'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );


  const renderRevenueTab = () => (
    <div style={styles.tabContent}>
      {/* Date Range Selector */}
      <div style={styles.dateRangeSelector}>
        {['7d', '30d', '90d', '6m', '1y'].map(range => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            style={{
              ...styles.dateRangeButton,
              ...(dateRange === range ? styles.dateRangeButtonActive : {})
            }}
          >
            {range === '7d' ? '7 Days' :
             range === '30d' ? '30 Days' :
             range === '90d' ? '90 Days' :
             range === '6m' ? '6 Months' : '1 Year'}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>💰 Revenue Overview</h3>
        <div style={styles.metricsGrid}>
          <div style={styles.metricCard}>
            <div style={styles.metricIcon}>💵</div>
            <div style={styles.metricContent}>
              <div style={styles.metricValue}>
                ${safeToFixed(revenueData?.summary?.totalRevenue, 2) || '0.00'}
              </div>
              <div style={styles.metricLabel}>Total Revenue</div>
              <div style={styles.metricChange}>
                +{safeToFixed(revenueData?.growth?.revenueGrowth?.growthRate, 1) || '0.0'}%
              </div>
            </div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricIcon}>📊</div>
            <div style={styles.metricContent}>
              <div style={styles.metricValue}>
                ${safeToFixed(revenueData?.summary?.netProfit, 2) || '0.00'}
              </div>
              <div style={styles.metricLabel}>Net Profit</div>
              <div style={styles.metricChange}>
                {safeToFixed(revenueData?.summary?.profitMargin, 1) || '0.0'}% margin
              </div>
            </div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricIcon}>🔄</div>
            <div style={styles.metricContent}>
              <div style={styles.metricValue}>
                ${safeToFixed(revenueData?.mrr?.totalMRR, 2) || '0.00'}
              </div>
              <div style={styles.metricLabel}>MRR</div>
              <div style={styles.metricChange}>
                {revenueData?.mrr?.subscriberCount || '0'} subscribers
              </div>
            </div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricIcon}>💳</div>
            <div style={styles.metricContent}>
              <div style={styles.metricValue}>
                ${safeToFixed(revenueData?.summary?.totalCosts, 2) || '0.00'}
              </div>
              <div style={styles.metricLabel}>Total Costs</div>
              <div style={styles.metricChange}>
                {safeToFixed((revenueData?.summary?.totalCosts / revenueData?.summary?.totalRevenue) * 100, 1) || '0.0'}% of revenue
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📈 Revenue Streams</h3>
        <div style={styles.revenueStreams}>
          {revenueData?.summary?.revenueByType?.map(stream => (
            <div key={stream._id} style={styles.revenueStream}>
              <div style={styles.streamHeader}>
                <span style={styles.streamName}>
                  {stream._id === 'instacart_commission' ? '🛒 Instacart Commissions' :
                   stream._id === 'subscription' ? '💳 Subscriptions' :
                   stream._id === 'api_usage' ? '🔌 API Usage' : stream._id}
                </span>
                <span style={styles.streamValue}>${safeToFixed(stream.total, 2)}</span>
              </div>
              <div style={styles.streamBar}>
                <div style={{
                  ...styles.streamBarFill,
                  width: `${(stream.total / revenueData.summary.totalRevenue) * 100}%`
                }} />
              </div>
              <div style={styles.streamStats}>
                <span>{stream.count} transactions</span>
                <span>{safeToFixed((stream.total / revenueData.summary.totalRevenue) * 100, 1)}% of total</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Revenue Chart (simplified) */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📊 Revenue Trend</h3>
        <div style={styles.chartContainer}>
          <div style={styles.simpleChart}>
            {revenueData?.summary?.dailyRevenue?.slice(-30).map((day, index) => (
              <div key={day._id} style={styles.chartBar}>
                <div
                  style={{
                    ...styles.chartBarFill,
                    height: `${(day.revenue / 600) * 100}%`,
                    backgroundColor: index === 29 ? '#FF6B35' : '#F7931E'
                  }}
                  title={`${day._id}: $${safeToFixed(day.revenue, 2)}`}
                />
              </div>
            ))}
          </div>
          <div style={styles.chartLabels}>
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Subscriber Metrics */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>👥 Subscriber Analytics</h3>
        <div style={styles.subscriberGrid}>
          <div style={styles.subscriberCard}>
            <h4>Subscription Tiers</h4>
            {revenueData?.mrr?.byTier?.map(tier => (
              <div key={tier._id} style={styles.tierItem}>
                <span style={styles.tierName}>{tier._id.toUpperCase()}</span>
                <span style={styles.tierCount}>{tier.count} users</span>
                <span style={styles.tierRevenue}>${safeToFixed(tier.revenue, 2)}/mo</span>
              </div>
            ))}
          </div>
          <div style={styles.subscriberCard}>
            <h4>Growth Metrics</h4>
            <div style={styles.growthItem}>
              <span>New Subscribers</span>
              <span style={{ color: '#28a745' }}>
                +{revenueData?.growth?.subscriberMetrics?.newSubscribers || 0}
              </span>
            </div>
            <div style={styles.growthItem}>
              <span>Churned</span>
              <span style={{ color: '#dc3545' }}>
                -{revenueData?.growth?.subscriberMetrics?.churnedSubscribers || 0}
              </span>
            </div>
            <div style={styles.growthItem}>
              <span>Net Growth</span>
              <span style={{ color: '#FF6B35', fontWeight: 'bold' }}>
                {revenueData?.growth?.subscriberMetrics?.netGrowth || 0}
              </span>
            </div>
            <div style={styles.growthItem}>
              <span>Churn Rate</span>
              <span>{safeToFixed(revenueData?.growth?.subscriberMetrics?.churnRate, 1) || 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🚀 Revenue Actions</h3>
        <div style={styles.actionsGrid}>
          <button
            onClick={async () => {
              const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
              await fetch(`${apiUrl}/api/revenue/generate-mock`, { method: 'POST' });
              loadRevenueData();
            }}
            style={{...styles.actionButton, backgroundColor: '#28a745'}}
          >
            📊 Generate Mock Data
          </button>
          <button
            onClick={() => alert('Export feature coming soon!')}
            style={{...styles.actionButton, backgroundColor: '#007bff'}}
          >
            📥 Export Revenue Report
          </button>
          <button
            onClick={() => alert('Invoice feature coming soon!')}
            style={{...styles.actionButton, backgroundColor: '#ffc107'}}
          >
            📄 Generate Invoices
          </button>
        </div>
      </div>
    </div>
  );

  const renderServicesTab = () => (
    <div style={styles.tabContent}>
      {/* Service Health Overview */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🏥 Service Health Status</h3>
        <div style={styles.servicesGrid}>
          {Object.entries(externalServices?.health || {}).map(([service, status]) => (
            <div key={service} style={{...styles.serviceCard, cursor: status.status === 'error' ? 'pointer' : 'default'}} onClick={() => status.status === 'error' && setActiveTab('services')}>
              <div style={styles.serviceHeader}>
                <div style={styles.serviceName}>
                  {service === 'instacart' ? '🛒 Instacart API' :
                   service === 'spoonacular' ? '🥄 Spoonacular' :
                   service === 'openai' ? '🤖 OpenAI' :
                   service === 'anthropic' ? '🔮 Anthropic' :
                   service === 'google' ? '🧠 Google AI' :
                   service === 'firebase' ? '🔥 Firebase' :
                   service === 'mongodb' ? '🍃 MongoDB' :
                   service === 'vercel' ? '▲ Vercel' :
                   service === 'render' ? '🚀 Render' :
                   service === 'kroger' ? '🛍️ Kroger' : service}
                </div>
                <div style={{
                  ...styles.serviceStatus,
                  backgroundColor: (status.status === 'operational' || status.status === 'healthy') ? '#28a745' :
                                   (status.status === 'degraded' || status.status === 'warning') ? '#ffc107' :
                                   (status.status === 'inactive' || status.status === 'not_configured') ? '#6c757d' : '#dc3545'
                }}>
                  {status.status === 'operational' || status.status === 'healthy' ? '✓ Operational' :
                   status.status === 'degraded' || status.status === 'warning' ? '⚠ Degraded' :
                   status.status === 'inactive' || status.status === 'not_configured' ? '○ Inactive' :
                   status.status === 'error' || status.status === 'unhealthy' ? '✗ Error' : '⚠ Issue'}
                </div>
              </div>
              <div style={styles.serviceMetrics}>
                {status.responseTime && (
                  <div style={styles.serviceMetric}>
                    <span>Response Time</span>
                    <span>{status.responseTime}ms</span>
                  </div>
                )}
                {status.uptime && (
                  <div style={styles.serviceMetric}>
                    <span>Uptime</span>
                    <span>{status.uptime}%</span>
                  </div>
                )}
                {status.connections && (
                  <div style={styles.serviceMetric}>
                    <span>Connections</span>
                    <span>{status.connections}</span>
                  </div>
                )}
                {status.storage && (
                  <div style={styles.serviceMetric}>
                    <span>Storage</span>
                    <span>{status.storage}</span>
                  </div>
                )}
                {status.activeUsers && (
                  <div style={styles.serviceMetric}>
                    <span>Active Users</span>
                    <span>{status.activeUsers}</span>
                  </div>
                )}
                {status.requests && (
                  <div style={styles.serviceMetric}>
                    <span>Requests</span>
                    <span>{status.requests}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Usage & Costs */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>💰 API Usage & Costs</h3>
        <div style={styles.costsSummary}>
          <div style={styles.costsHeader}>
            <div>
              <div style={styles.totalCost}>
                ${safeToFixed(externalServices?.costs?.totalCosts, 2) || '0.00'}
              </div>
              <div style={styles.totalLabel}>Current Month Costs</div>
            </div>
            <div>
              <div style={styles.projectedCost}>
                ${safeToFixed(externalServices?.costs?.projectedMonthly, 2) || '0.00'}
              </div>
              <div style={styles.projectedLabel}>Projected Monthly</div>
            </div>
          </div>
        </div>

        <div style={styles.apiUsageGrid}>
          {Object.entries(externalServices?.usage || {}).map(([api, data]) => (
            <div key={api} style={styles.apiUsageCard}>
              <div style={styles.apiHeader}>
                <span style={styles.apiName}>
                  {api === 'openai' ? '🤖 OpenAI' :
                   api === 'anthropic' ? '🧠 Anthropic' :
                   api === 'spoonacular' ? '🍳 Spoonacular' :
                   api === 'instacart' ? '🛒 Instacart' : api}
                </span>
                <span style={styles.apiCost}>${safeToFixed(data.cost, 2) || '0.00'}</span>
              </div>
              <div style={styles.apiMetrics}>
                <div style={styles.apiMetric}>
                  <span>Requests</span>
                  <span>{data.requests || 0}</span>
                </div>
                {data.tokens && (
                  <div style={styles.apiMetric}>
                    <span>Tokens</span>
                    <span>{safeToFixed(data.tokens / 1000, 1)}k</span>
                  </div>
                )}
              </div>
              {api === 'spoonacular' && (
                <div style={styles.apiWarning}>
                  ⚠️ {data.requests}/50 daily limit
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Opus Weekly Usage Monitoring */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🔮 Claude Opus Weekly Monitoring</h3>

        {/* Main Usage Card */}
        <div style={{
          ...styles.statCard,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          marginBottom: '20px'
        }}>
          {opusLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={styles.spinner}></div>
              <div style={{ marginTop: '10px' }}>Loading Opus data...</div>
            </div>
          ) : opusUsage ? (
            <>
              {/* Usage Progress */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Weekly Token Usage</span>
                  <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {opusUsage.percentageUsed}%
                  </span>
                </div>
                <div style={{
                  ...styles.progressBar,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  height: '20px'
                }}>
                  <div style={{
                    ...styles.progressFill,
                    width: `${opusUsage.percentageUsed}%`,
                    backgroundColor: opusUsage.percentageUsed > 95 ? '#ef4444' :
                                    opusUsage.percentageUsed > 80 ? '#f59e0b' : '#10b981',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {opusUsage.tokensUsed.toLocaleString()} / {opusUsage.weeklyLimit.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Detailed Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '15px',
                marginBottom: '20px'
              }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '15px',
                  borderRadius: '10px'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>Week Total</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {(Number(opusUsage.tokensUsed || 0) / 1000).toFixed(1)}k tokens
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '15px',
                  borderRadius: '10px'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>Weekly Cost</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    ${Number(opusUsage.weeklyUsage?.totalCost || 0).toFixed(2)}
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '15px',
                  borderRadius: '10px'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>Reset In</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {opusUsage.daysUntilReset} {opusUsage.daysUntilReset === 1 ? 'day' : 'days'}
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '15px',
                  borderRadius: '10px'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>Daily Average</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {(Number(opusUsage.averageDailyUsage || 0) / 1000).toFixed(1)}k/day
                  </div>
                </div>
              </div>

              {/* Projection if usage high */}
              {opusUsage.percentageUsed > 50 && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '15px'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                    📈 Usage Projection
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    At current rate ({(Number(opusUsage.averageDailyUsage || 0) / 1000).toFixed(1)}k/day),
                    limits will be reached in {opusUsage.projection?.daysUntilExhaustion || 'N/A'} days
                    {opusUsage.projection?.exhaustionDate && (
                      <span> ({new Date(opusUsage.projection.exhaustionDate).toLocaleDateString()})</span>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div>No Opus usage data available</div>
              <button
                onClick={loadOpusUsage}
                style={{
                  marginTop: '10px',
                  padding: '8px 16px',
                  background: 'white',
                  color: '#667eea',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Load Data
              </button>
            </div>
          )}
        </div>

        {/* Historical Usage (Last 4 Weeks) */}
        {opusUsage?.historicalUsage && (
          <div style={styles.statCard}>
            <h4 style={{ marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' }}>
              📊 Historical Usage (Last 4 Weeks)
            </h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              {opusUsage.historicalUsage.map((week, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  background: index === 0 ? '#f0f9ff' : '#f9fafb',
                  borderRadius: '8px',
                  border: index === 0 ? '2px solid #3b82f6' : '1px solid #e5e7eb'
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      {index === 0 ? 'Current Week' : `Week of ${new Date(week.weekStart).toLocaleDateString()}`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {week.requestCount} requests
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {(Number(week.totalTokens || 0) / 1000).toFixed(1)}k tokens
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      ${Number(week.totalCost || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-Request Analysis */}
        {opusUsage?.weeklyUsage?.requests && opusUsage.weeklyUsage.requests.length > 0 && (
          <div style={styles.statCard}>
            <h4 style={{ marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' }}>
              🔍 Recent Opus Requests
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Time</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Endpoint</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Tokens</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {opusUsage.weeklyUsage.requests.slice(0, 10).map((req, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px' }}>
                        {new Date(req.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px' }}>{req.endpoint || 'API Call'}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {req.tokens.toLocaleString()}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        ${Number(req.cost || 0).toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Cost Breakdown Chart */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📊 Cost Breakdown</h3>
        <div style={styles.costBreakdown}>
          {externalServices?.costs?.byService?.map(service => (
            <div key={service.service} style={styles.costItem}>
              <div style={styles.costItemHeader}>
                <span>{service.service}</span>
                <span>${safeToFixed(service.cost, 2)}</span>
              </div>
              <div style={styles.costBar}>
                <div style={{
                  ...styles.costBarFill,
                  width: `${service.percentage}%`
                }} />
              </div>
              <div style={styles.costPercentage}>{safeToFixed(service.percentage, 1)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Monitoring Actions */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🚀 Monitoring Actions</h3>
        <div style={styles.actionsGrid}>
          <button
            onClick={async () => {
              const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
              const health = await fetch(`${apiUrl}/api/monitoring/check-all`, { method: 'POST' }).then(r => r.json());
              alert(`Health check complete!\n${Object.entries(health).map(([s, d]) => `${s}: ${d.status}`).join('\n')}`);
            }}
            style={{...styles.actionButton, backgroundColor: '#28a745'}}
          >
            🔍 Check All Services
          </button>
          <button
            onClick={() => alert('Alert settings coming soon!')}
            style={{...styles.actionButton, backgroundColor: '#dc3545'}}
          >
            🔔 Configure Alerts
          </button>
          <button
            onClick={async () => {
              const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
              await fetch(`${apiUrl}/api/monitoring/generate-mock`, { method: 'POST' });
              loadExternalServices();
            }}
            style={{...styles.actionButton, backgroundColor: '#007bff'}}
          >
            📊 Generate Mock Data
          </button>
          <button
            onClick={() => alert('Cost report coming soon!')}
            style={{...styles.actionButton, backgroundColor: '#ffc107'}}
          >
            📄 Download Cost Report
          </button>
        </div>
      </div>
    </div>
  );

  const renderAgentsTab = () => {
    const triggerAgent = (agentId) => {
      try {
        const result = agentMonitoringService.triggerAgent(agentId, 'Manual diagnostic run');
        alert(`Agent ${result.agentId} triggered successfully`);
        loadAgentData();
      } catch (error) {
        alert(`Failed to trigger agent: ${error.message}`);
      }
    };

    // Sub-navigation for agent features
    const renderAgentSubNav = () => (
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '10px'
      }}>
        {[
          { id: 'overview', label: '📊 Overview', icon: '📊' },
          { id: 'chat', label: '💬 Agent Chat', icon: '💬' },
          { id: 'journal', label: '📝 Work Journal', icon: '📝' },
          { id: 'review', label: '✅ Work Review', icon: '✅' },
          { id: 'logs', label: '📋 Enhanced Logs', icon: '📋' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAgentSubTab(tab.id)}
            style={{
              padding: '8px 16px',
              backgroundColor: agentSubTab === tab.id ? '#FB4F14' : 'transparent',
              color: agentSubTab === tab.id ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: agentSubTab === tab.id ? '600' : '400',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );

    // Render different sub-tabs
    if (agentSubTab === 'chat') {
      return (
        <div style={styles.tabContent}>
          {renderAgentSubNav()}
          <AgentChatInterface />
        </div>
      );
    }

    if (agentSubTab === 'journal') {
      return (
        <div style={styles.tabContent}>
          {renderAgentSubNav()}
          <AgentWorkJournal />
        </div>
      );
    }

    if (agentSubTab === 'review') {
      return (
        <div style={styles.tabContent}>
          {renderAgentSubNav()}
          <WorkReviewDashboard currentUser={currentUser} />
        </div>
      );
    }

    if (agentSubTab === 'logs') {
      return (
        <div style={styles.tabContent}>
          {renderAgentSubNav()}
          <EnhancedErrorLogViewer />
        </div>
      );
    }

    // Default: Overview tab
    return (
      <div style={styles.tabContent}>
        {renderAgentSubNav()}
        {/* System Overview */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>🤖 AI Agent Management</h3>
          {agentOverview && (
            <div style={styles.agentOverview}>
              <div style={styles.overviewCard}>
                <span style={styles.overviewLabel}>Total Agents</span>
                <span style={styles.overviewValue}>{agentOverview.totalAgents}</span>
              </div>
              <div style={styles.overviewCard}>
                <span style={styles.overviewLabel}>Active Now</span>
                <span style={{ ...styles.overviewValue, color: '#10b981' }}>
                  {agentOverview.activeAgents}
                </span>
              </div>
              <div style={styles.overviewCard}>
                <span style={styles.overviewLabel}>Tasks Today</span>
                <span style={styles.overviewValue}>{agentOverview.totalTasksToday}</span>
              </div>
              <div style={styles.overviewCard}>
                <span style={styles.overviewLabel}>System Health</span>
                <span style={{
                  ...styles.overviewValue,
                  color: agentOverview.systemHealth === 'Healthy' ? '#10b981' : '#ef4444'
                }}>
                  {agentOverview.systemHealth}
                </span>
              </div>
              <div style={styles.overviewCard}>
                <span style={styles.overviewLabel}>Uptime</span>
                <span style={styles.overviewValue}>{agentOverview.uptime}</span>
              </div>
            </div>
          )}
        </div>

        {/* Agent Grid */}
        <div style={styles.section}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{ ...styles.sectionTitle, margin: 0 }}>👥 Agent Team</h3>
            <button
              onClick={handleTriggerAllAgents}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background-color 0.2s',
                '&:hover': {
                  backgroundColor: '#218838'
                }
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              <span>⚡</span>
              Trigger All Agents
            </button>
          </div>
          <div style={styles.agentGrid}>
            {agents.map(agent => (
              <div key={agent.id} style={styles.agentCard}>
                <div style={styles.agentHeader}>
                  <span style={styles.agentAvatar}>{agent.avatar}</span>
                  <div style={styles.agentTitle}>
                    <h4 style={styles.agentName}>{agent.name}</h4>
                    <span style={styles.agentRole}>{agent.role}</span>
                  </div>
                  <span style={{
                    ...styles.agentStatus,
                    backgroundColor:
                      agent.status === 'active' ? '#10b981' :
                      agent.status === 'idle' ? '#6b7280' :
                      agent.status === 'error' ? '#ef4444' : '#f59e0b'
                  }}>
                    {agent.status}
                  </span>
                </div>

                <p style={styles.agentDescription}>{agent.description}</p>

                <div style={styles.agentStats}>
                  <div style={styles.agentStat}>
                    <span style={styles.statLabel}>Tasks Today</span>
                    <span style={styles.statValue}>{agent.stats.tasksToday}</span>
                  </div>
                  {agent.stats.accuracy && (
                    <div style={styles.agentStat}>
                      <span style={styles.statLabel}>Accuracy</span>
                      <span style={styles.statValue}>{agent.stats.accuracy}</span>
                    </div>
                  )}
                  {agent.stats.errorsDetected !== undefined && (
                    <div style={styles.agentStat}>
                      <span style={styles.statLabel}>Errors Found</span>
                      <span style={styles.statValue}>{agent.stats.errorsDetected}</span>
                    </div>
                  )}
                </div>

                <div style={styles.agentTools}>
                  <span style={styles.toolsLabel}>Tools:</span>
                  {agent.tools.map(tool => (
                    <span key={tool} style={styles.toolBadge}>{tool}</span>
                  ))}
                </div>

                <div style={styles.agentActions}>
                  <button
                    style={styles.agentButton}
                    onClick={() => triggerAgent(agent.id)}
                    disabled={agent.status === 'active'}
                  >
                    {agent.status === 'active' ? 'Running...' : 'Trigger'}
                  </button>
                  <span style={styles.lastActivity}>
                    Last: {agent.stats.lastActivity ?
                      new Date(agent.stats.lastActivity).toLocaleTimeString() : 'Never'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📊 Recent Agent Activity</h3>
          <div style={styles.activityTable}>
            <div style={styles.activityHeader}>
              <span>Time</span>
              <span>Agent</span>
              <span>Action</span>
              <span>Status</span>
            </div>
            {agentActivities.slice(0, 20).map(activity => (
              <div key={activity.id} style={styles.activityRow}>
                <span style={styles.activityTime}>
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </span>
                <span style={styles.activityAgent}>{activity.agentName}</span>
                <span style={styles.activityAction}>{activity.action}</span>
                <span style={{
                  ...styles.activityStatus,
                  color: activity.success ? '#10b981' : '#ef4444'
                }}>
                  {activity.success ? '✓ Success' : '✗ Failed'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {agentMonitoringService.getRecommendations().length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>💡 Recommendations</h3>
            <div style={styles.recommendations}>
              {agentMonitoringService.getRecommendations().map((rec, idx) => (
                <div key={idx} style={styles.recommendation}>
                  <span style={styles.recIcon}>ℹ️</span>
                  <span>{rec.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLogsTab = () => (
    <div style={styles.tabContent}>
      <EnhancedErrorLogViewer currentUser={currentUser} />
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
              {systemHealth?.healthy ? ' 🟢 System Healthy' : systemHealth === null ? ' ⚪ Loading...' : ' 🔴 Issues Detected'}
              {error && ' • ⚠️ API Error'}
            </span>
            <button onClick={onClose} style={styles.closeButton}>×</button>
          </div>
        </div>

        <div style={styles.tabs}>
          {[
            { id: 'overview', label: '🏠 Overview' },
            { id: 'revenue', label: '💰 Revenue' },
            { id: 'services', label: '🔗 External Services' },
            { id: 'agents', label: '🤖 AI Agents' },
            { id: 'system', label: '🖥️ System' },
            { id: 'users', label: '👥 Users' },
            { id: 'logs', label: '📋 Logs' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                // Load Opus data when Services tab is selected
                if (tab.id === 'services' && !opusUsage) {
                  loadOpusUsage();
                }
              }}
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
          {activeTab === 'revenue' && renderRevenueTab()}
          {activeTab === 'services' && renderServicesTab()}
          {activeTab === 'agents' && renderAgentsTab()}
          {activeTab === 'system' && renderSystemTab()}
          {activeTab === 'users' && renderUsersTab()}
          {activeTab === 'logs' && renderLogsTab()}
        </div>

        <div style={styles.footer}>
          <div style={styles.footerLeft}>
            <div style={styles.systemStatus}>
              Status: <span style={{
                color: systemHealth?.healthy ? '#28a745' : systemHealth === null ? '#6c757d' : '#dc3545',
                fontWeight: 'bold'
              }}>
                {systemHealth === null ? 'Loading System Status...' : 
                 systemHealth?.healthy ? 'All Systems Operational' : 'Issues Detected'}
              </span>
              {error && <span style={{ color: '#dc3545', marginLeft: '10px' }}>
                • {error}
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

      {/* Sub-component modals - Using simple placeholders to avoid circular dependencies */}
      {showAnalytics && (
        <ParsingAnalyticsDashboard onClose={() => setShowAnalytics(false)} />
      )}

      {showSettings && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.header}>
              <h2 style={styles.title}>⚙️ AI Parsing Settings</h2>
              <button onClick={() => setShowSettings(false)} style={styles.closeButton}>×</button>
            </div>
            <div style={{padding: '20px', textAlign: 'center'}}>
              <p>AI parsing settings temporarily disabled to prevent circular dependencies.</p>
              <p>This will be restored in a future update.</p>
              <button 
                onClick={() => setShowSettings(false)}
                style={{...styles.actionButton, backgroundColor: '#FF6B35'}}
              >
                Close
              </button>
            </div>
          </div>
        </div>
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
    background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
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
    borderBottom: '4px solid #FF6B35',
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
    background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
    color: 'white',
    padding: '25px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 8px 25px rgba(255, 107, 53, 0.3)'
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
    background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
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
    backgroundColor: '#FF6B35',
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
    borderTop: '5px solid #FF6B35',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },

  // User Activity Styles
  activityContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },

  activityStats: {
    display: 'flex',
    gap: '30px',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },

  activityStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },

  activityStatValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#FF6B35'
  },

  activityStatLabel: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px'
  },

  activityPlaceholder: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
    color: '#666'
  },

  loadingText: {
    fontSize: '14px',
    color: '#999'
  },

  noData: {
    padding: '2rem',
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '2px dashed #d1d5db'
  },

  // Firebase User Accounts Styles
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },

  verificationToggle: {
    display: 'flex',
    gap: '8px',
    backgroundColor: '#f1f3f4',
    padding: '4px',
    borderRadius: '8px'
  },

  toggleButton: {
    padding: '8px 12px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  },

  toggleButtonActive: {
    backgroundColor: '#FF6B35',
    color: 'white',
    boxShadow: '0 2px 4px rgba(255, 107, 53, 0.2)'
  },

  userAccountsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '400px',
    overflowY: 'auto'
  },

  userAccountItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #e9ecef',
    borderLeft: '4px solid #FF6B35'
  },

  userAccountDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  userAccountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  userAccountName: {
    fontWeight: '600',
    fontSize: '16px',
    color: '#1f2937'
  },

  userAccountStatus: {
    fontSize: '12px',
    padding: '4px 8px',
    borderRadius: '12px',
    backgroundColor: 'white',
    border: '1px solid #d1d5db'
  },

  userAccountEmail: {
    fontSize: '14px',
    color: '#6b7280',
    fontFamily: 'monospace'
  },

  userAccountMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#9ca3af',
    flexWrap: 'wrap'
  },

  // Revenue Tab Styles
  dateRangeSelector: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '10px'
  },

  dateRangeButton: {
    padding: '8px 16px',
    border: '2px solid #dee2e6',
    borderRadius: '6px',
    backgroundColor: 'white',
    color: '#495057',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },

  dateRangeButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
    color: 'white'
  },

  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },

  metricCard: {
    display: 'flex',
    gap: '15px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '2px solid #f0f0f0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },

  metricIcon: {
    fontSize: '32px',
    lineHeight: '1'
  },

  metricContent: {
    flex: 1
  },

  metricValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: '4px'
  },

  metricLabel: {
    fontSize: '14px',
    color: '#6c757d',
    marginBottom: '4px'
  },

  metricChange: {
    fontSize: '12px',
    color: '#28a745',
    fontWeight: '500'
  },

  revenueStreams: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },

  revenueStream: {
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '10px'
  },

  streamHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },

  streamName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#495057'
  },

  streamValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#FF6B35'
  },

  streamBar: {
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    marginBottom: '8px',
    overflow: 'hidden'
  },

  streamBarFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },

  streamStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#6c757d'
  },

  chartContainer: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '10px'
  },

  simpleChart: {
    display: 'flex',
    gap: '2px',
    height: '200px',
    alignItems: 'flex-end'
  },

  chartBar: {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-end'
  },

  chartBarFill: {
    width: '100%',
    borderRadius: '2px 2px 0 0',
    transition: 'height 0.3s ease'
  },

  chartLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '10px',
    fontSize: '12px',
    color: '#6c757d'
  },

  subscriberGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },

  subscriberCard: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '10px'
  },

  tierItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #dee2e6'
  },

  tierName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057'
  },

  tierCount: {
    fontSize: '14px',
    color: '#6c757d'
  },

  tierRevenue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#FF6B35'
  },

  growthItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #dee2e6',
    fontSize: '14px'
  },

  // Services Tab Styles
  servicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px'
  },

  serviceCard: {
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '2px solid #f0f0f0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },

  serviceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },

  serviceName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a'
  },

  serviceStatus: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white'
  },

  serviceMetrics: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  serviceMetric: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    padding: '4px 0',
    borderBottom: '1px solid #f0f0f0'
  },

  costsSummary: {
    backgroundColor: 'linear-gradient(135deg, #FF6B35, #F7931E)',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px'
  },

  costsHeader: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    color: 'white'
  },

  totalCost: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#FF6B35'
  },

  totalLabel: {
    fontSize: '14px',
    color: '#6c757d',
    marginTop: '4px'
  },

  projectedCost: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#F7931E'
  },

  projectedLabel: {
    fontSize: '14px',
    color: '#6c757d',
    marginTop: '4px'
  },

  apiUsageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginTop: '20px'
  },

  apiUsageCard: {
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '10px',
    border: '1px solid #dee2e6'
  },

  apiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },

  apiName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057'
  },

  apiCost: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#FF6B35'
  },

  apiMetrics: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#6c757d'
  },

  apiMetric: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },

  apiWarning: {
    marginTop: '8px',
    padding: '4px 8px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#856404',
    textAlign: 'center'
  },

  costBreakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },

  costItem: {
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },

  costItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500'
  },

  costBar: {
    height: '6px',
    backgroundColor: '#e9ecef',
    borderRadius: '3px',
    overflow: 'hidden'
  },

  costBarFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: '3px'
  },

  costPercentage: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '4px',
    textAlign: 'right'
  },

  // Agent Management Styles
  agentOverview: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginTop: '20px'
  },

  overviewCard: {
    background: 'white',
    padding: '15px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },

  overviewLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500'
  },

  overviewValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#111827'
  },

  agentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },

  agentCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    transition: 'box-shadow 0.3s'
  },

  agentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  agentAvatar: {
    fontSize: '32px',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f3f4f6',
    borderRadius: '10px'
  },

  agentTitle: {
    flex: 1
  },

  agentName: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#111827'
  },

  agentRole: {
    fontSize: '12px',
    color: '#6b7280'
  },

  agentStatus: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase'
  },

  agentDescription: {
    fontSize: '13px',
    color: '#4b5563',
    lineHeight: '1.5',
    margin: 0
  },

  agentStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
    gap: '10px'
  },

  agentStat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },

  statLabel: {
    fontSize: '11px',
    color: '#9ca3af',
    textTransform: 'uppercase'
  },

  statValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#111827'
  },

  agentTools: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },

  toolsLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500'
  },

  toolBadge: {
    padding: '2px 8px',
    background: '#eff6ff',
    color: '#2563eb',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500'
  },

  agentActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '10px',
    borderTop: '1px solid #f3f4f6'
  },

  agentButton: {
    padding: '6px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },

  lastActivity: {
    fontSize: '11px',
    color: '#9ca3af'
  },

  activityTable: {
    marginTop: '20px',
    background: 'white',
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb'
  },

  activityHeader: {
    display: 'grid',
    gridTemplateColumns: '100px 1fr 2fr 120px',
    padding: '12px 20px',
    background: '#f9fafb',
    fontWeight: '600',
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase'
  },

  activityRow: {
    display: 'grid',
    gridTemplateColumns: '100px 1fr 2fr 120px',
    padding: '12px 20px',
    borderTop: '1px solid #f3f4f6',
    fontSize: '13px',
    alignItems: 'center'
  },

  activityTime: {
    color: '#6b7280'
  },

  activityAgent: {
    fontWeight: '500',
    color: '#111827'
  },

  activityAction: {
    color: '#4b5563'
  },

  activityStatus: {
    fontSize: '12px',
    fontWeight: '500'
  },

  recommendations: {
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },

  recommendation: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px',
    background: '#fef3c7',
    borderRadius: '8px',
    border: '1px solid #fde68a'
  },

  recIcon: {
    fontSize: '16px',
    flexShrink: 0
  },

  // Financial Overview styles
  financialGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },

  financialCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '15px',
    transition: 'all 0.2s',
    '&:hover': {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }
  },

  financialIcon: {
    fontSize: '32px',
    flexShrink: 0
  },

  financialContent: {
    flex: 1
  },

  financialLabel: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: '8px'
  },

  financialValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px'
  },

  financialTrend: {
    fontSize: '13px',
    fontWeight: '500'
  },

  financialSubtext: {
    fontSize: '12px',
    color: '#9ca3af'
  },

  // Work Review styles
  workReviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '15px',
    marginTop: '20px'
  },
  workReviewCard: {
    background: 'white',
    borderRadius: '8px',
    padding: '15px',
    border: '1px solid #e9ecef',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s',
    '&:hover': {
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)'
    }
  },
  workReviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  priorityBadge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase'
  },
  agentBadge: {
    padding: '3px 8px',
    backgroundColor: '#007bff',
    color: 'white',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold'
  },
  workReviewTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px'
  },
  workReviewTime: {
    fontSize: '12px',
    color: '#6c757d',
    marginBottom: '12px'
  },
  workReviewActions: {
    display: 'flex',
    gap: '8px'
  },
  actionButton: {
    flex: 1,
    padding: '8px 12px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    '&:hover': {
      opacity: 0.9
    }
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