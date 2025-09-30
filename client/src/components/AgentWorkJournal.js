/**
 * Agent Work Journal Component
 * Comprehensive tracking of every agent action with before/after states,
 * decision reasoning, impact analysis, and full audit trail
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  GitBranch,
  Code,
  FileText,
  Database,
  Shield,
  Activity,
  ChevronRight,
  ChevronDown,
  Download,
  Filter,
  Search,
  Eye,
  Copy,
  CheckCircle,
  AlertTriangle,
  Info,
  Terminal,
  Zap,
  Package,
  GitCommit,
  GitPullRequest,
  GitMerge,
  File,
  Folder,
  Edit3,
  Trash2,
  Settings,
  Tool,
  Cpu,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Hash,
  Tag,
  Calendar,
  User,
  Users,
  MessageSquare,
  Archive,
  RefreshCw,
  Play,
  Pause,
  Square
} from 'lucide-react';
import agentMonitoringService from '../services/agentMonitoringService';

const AgentWorkJournal = () => {
  // State management
  const [workEntries, setWorkEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [filters, setFilters] = useState({
    agentId: 'all',
    actionType: 'all',
    dateRange: '24h',
    impactLevel: 'all',
    status: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEntries, setExpandedEntries] = useState(new Set());
  const [viewMode, setViewMode] = useState('timeline'); // timeline, grouped, detailed
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  // Sample work journal entries with comprehensive tracking
  const sampleWorkEntries = [
    {
      id: 'WORK-001',
      agentId: 'dashboard-improvement-agent',
      agentAlias: 'Dash',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      actionType: 'CODE_MODIFICATION',
      title: 'Enhanced Admin Dashboard Analytics',
      description: 'Added real-time metrics visualization to Admin Dashboard',
      files: [
        'client/src/components/AdminDashboard.js',
        'client/src/components/MetricsWidget.js'
      ],
      changes: {
        before: {
          state: 'Static metrics display',
          code: '// Previous implementation\nconst metrics = { users: 0, carts: 0 };',
          performance: { loadTime: '2.3s', renderCount: 15 }
        },
        after: {
          state: 'Real-time metrics with WebSocket updates',
          code: '// Enhanced implementation\nconst metrics = useRealtimeMetrics();\nuseWebSocket("/metrics", updateMetrics);',
          performance: { loadTime: '1.1s', renderCount: 8 }
        }
      },
      reasoning: 'Identified performance bottleneck in metrics rendering. Real-time updates reduce server calls by 60% and improve UX.',
      impact: {
        level: 'HIGH',
        metrics: {
          performanceImprovement: '+52%',
          userExperienceScore: '+8.5',
          codeQuality: '+15%'
        },
        affectedSystems: ['Dashboard', 'WebSocket', 'MetricsAPI'],
        risks: 'Minimal - backward compatible with fallback'
      },
      testing: {
        automated: { passed: 12, failed: 0, skipped: 2 },
        manual: 'Verified in Chrome, Firefox, Safari',
        coverage: '87%'
      },
      status: 'COMPLETED',
      duration: '45 minutes',
      commits: ['a1b2c3d', 'e4f5g6h'],
      reviewedBy: 'development-manager',
      tags: ['dashboard', 'performance', 'real-time']
    },
    {
      id: 'WORK-002',
      agentId: 'security-auditor',
      agentAlias: 'SecOps',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      actionType: 'SECURITY_AUDIT',
      title: 'API Endpoint Security Hardening',
      description: 'Identified and patched authentication bypass vulnerability',
      files: [
        'server/middleware/auth.js',
        'server/routes/api.js'
      ],
      changes: {
        before: {
          state: 'Basic token validation',
          vulnerabilities: ['JWT signature not verified', 'No rate limiting'],
          securityScore: 65
        },
        after: {
          state: 'Enhanced security with multi-layer validation',
          vulnerabilities: [],
          securityScore: 95
        }
      },
      reasoning: 'Critical security audit revealed potential authentication bypass. Immediate patching required.',
      impact: {
        level: 'CRITICAL',
        metrics: {
          vulnerabilitiesPatched: 3,
          securityScore: '+30',
          complianceLevel: 'SOC2 compliant'
        },
        affectedSystems: ['Authentication', 'API Gateway'],
        risks: 'None - security enhancement only'
      },
      testing: {
        automated: { passed: 25, failed: 0, skipped: 0 },
        penetrationTesting: 'Passed - verified by security team',
        coverage: '100%'
      },
      status: 'COMPLETED',
      duration: '2 hours',
      commits: ['sec123', 'sec456'],
      reviewedBy: 'chief-ai-officer',
      tags: ['security', 'critical', 'authentication']
    },
    {
      id: 'WORK-003',
      agentId: 'performance-optimizer',
      agentAlias: 'Speedy',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      actionType: 'OPTIMIZATION',
      title: 'Database Query Optimization',
      description: 'Optimized slow MongoDB queries affecting cart loading',
      files: [
        'server/models/Cart.js',
        'server/services/cartService.js'
      ],
      changes: {
        before: {
          queryTime: '3.2s average',
          indexing: 'No compound indexes',
          caching: 'None'
        },
        after: {
          queryTime: '0.3s average',
          indexing: 'Compound indexes on userId + status',
          caching: 'Redis cache with 5min TTL'
        }
      },
      reasoning: 'Performance monitoring detected slow cart queries. Analysis showed missing indexes and no caching strategy.',
      impact: {
        level: 'HIGH',
        metrics: {
          querySpeedImprovement: '10x faster',
          serverLoad: '-45%',
          userWaitTime: '-2.9s'
        },
        affectedSystems: ['Database', 'Cart Service', 'Redis'],
        risks: 'Low - indexes are non-breaking'
      },
      testing: {
        loadTesting: '1000 concurrent users - passed',
        benchmarks: 'p95: 0.5s, p99: 0.8s',
        coverage: '92%'
      },
      status: 'COMPLETED',
      duration: '1.5 hours',
      commits: ['perf789', 'perf012'],
      reviewedBy: 'development-manager',
      tags: ['performance', 'database', 'optimization']
    },
    {
      id: 'WORK-004',
      agentId: 'api-integration-specialist',
      agentAlias: 'API Master',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
      actionType: 'API_INTEGRATION',
      title: 'Spoonacular API Rate Limit Handler',
      description: 'Implemented intelligent rate limiting and caching for Spoonacular API',
      files: [
        'server/services/spoonacularService.js',
        'server/config/rateLimits.js'
      ],
      changes: {
        before: {
          rateLimiting: 'None',
          apiCalls: '200/day',
          errors: 'Frequent 429 errors'
        },
        after: {
          rateLimiting: 'Token bucket algorithm',
          apiCalls: '50/day with cache',
          errors: 'Zero rate limit errors'
        }
      },
      reasoning: 'Hitting API rate limits daily. Implemented caching and intelligent rate limiting to stay within free tier.',
      impact: {
        level: 'MEDIUM',
        metrics: {
          apiCostSavings: '$0/month',
          cacheHitRate: '75%',
          errorReduction: '100%'
        },
        affectedSystems: ['Spoonacular Integration', 'Product Search'],
        risks: 'None - improved reliability'
      },
      testing: {
        automated: { passed: 18, failed: 0, skipped: 1 },
        apiSimulation: 'Tested with 1000 requests',
        coverage: '88%'
      },
      status: 'COMPLETED',
      duration: '2 hours',
      commits: ['api345', 'api678'],
      reviewedBy: 'development-manager',
      tags: ['api', 'rate-limiting', 'caching']
    },
    {
      id: 'WORK-005',
      agentId: 'chief-ai-officer',
      agentAlias: 'CAO',
      timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000),
      actionType: 'STRATEGIC_DECISION',
      title: 'Implemented Agent Work Prioritization System',
      description: 'Designed and deployed intelligent task prioritization for agent team',
      files: [
        'server/services/agentTaskQueue.js',
        'server/config/agentPriorities.js'
      ],
      changes: {
        before: {
          taskAssignment: 'FIFO queue',
          efficiency: '60%',
          bottlenecks: 'Frequent task conflicts'
        },
        after: {
          taskAssignment: 'Priority-based with skill matching',
          efficiency: '92%',
          bottlenecks: 'Automated resolution'
        }
      },
      reasoning: 'Analysis showed inefficient task distribution. Implemented intelligent routing based on agent capabilities and priority.',
      impact: {
        level: 'HIGH',
        metrics: {
          taskCompletionRate: '+53%',
          agentUtilization: '+32%',
          conflictReduction: '95%'
        },
        affectedSystems: ['All Agents', 'Task Queue', 'Work Distribution'],
        risks: 'Low - gradual rollout with fallback'
      },
      decision: {
        alternatives: ['Round-robin', 'Random assignment', 'Manual routing'],
        chosenApproach: 'Skill-based priority queue',
        justification: 'Best balance of efficiency and flexibility'
      },
      status: 'COMPLETED',
      duration: '3 hours',
      commits: ['exec901', 'exec234'],
      reviewedBy: null,
      tags: ['strategic', 'system-design', 'efficiency']
    },
    {
      id: 'WORK-006',
      agentId: 'error-monitor',
      agentAlias: 'Watchdog',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      actionType: 'ERROR_DETECTION',
      title: 'Critical Memory Leak Detection',
      description: 'Detected and reported memory leak in WebSocket connections',
      files: [],
      changes: {
        before: {
          memoryUsage: 'Increasing 50MB/hour',
          activeConnections: 'Not properly closed',
          errorRate: 'Rising'
        },
        after: {
          memoryUsage: 'Stable',
          activeConnections: 'Auto-cleanup implemented',
          errorRate: 'Normal'
        }
      },
      reasoning: 'Automated monitoring detected abnormal memory growth pattern. Investigation revealed unclosed WebSocket connections.',
      impact: {
        level: 'CRITICAL',
        metrics: {
          memoryLeak: 'Prevented server crash',
          stability: '+100%',
          downtime: '0 minutes'
        },
        affectedSystems: ['WebSocket Server', 'Memory Management'],
        risks: 'Critical - would have caused outage'
      },
      alert: {
        severity: 'CRITICAL',
        notifiedAgents: ['performance-optimizer', 'development-manager'],
        responseTime: '5 minutes'
      },
      status: 'RESOLVED',
      duration: '15 minutes',
      commits: [],
      reviewedBy: 'performance-optimizer',
      tags: ['monitoring', 'critical', 'memory-leak']
    }
  ];

  // Load work entries
  useEffect(() => {
    loadWorkEntries();
    if (autoRefresh) {
      const interval = setInterval(loadWorkEntries, 30000);
      return () => clearInterval(interval);
    }
  }, [filters, autoRefresh]);

  const loadWorkEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      // In production, fetch from API
      // const response = await fetch('/api/agent-work-journal');
      // const data = await response.json();

      // For now, use sample data
      setWorkEntries(sampleWorkEntries);
    } catch (error) {
      console.error('Failed to load work entries:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Filter and search entries
  const filteredEntries = useMemo(() => {
    let entries = [...workEntries];

    // Apply filters
    if (filters.agentId !== 'all') {
      entries = entries.filter(e => e.agentId === filters.agentId);
    }
    if (filters.actionType !== 'all') {
      entries = entries.filter(e => e.actionType === filters.actionType);
    }
    if (filters.impactLevel !== 'all') {
      entries = entries.filter(e => e.impact.level === filters.impactLevel);
    }
    if (filters.status !== 'all') {
      entries = entries.filter(e => e.status === filters.status);
    }

    // Apply date range
    const now = new Date();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    if (filters.dateRange !== 'all' && ranges[filters.dateRange]) {
      const cutoff = new Date(now - ranges[filters.dateRange]);
      entries = entries.filter(e => new Date(e.timestamp) > cutoff);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      entries = entries.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query) ||
        e.agentAlias.toLowerCase().includes(query) ||
        e.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    return entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [workEntries, filters, searchQuery]);

  // Get unique agents for filter
  const agents = useMemo(() => {
    const agentMap = new Map();
    workEntries.forEach(entry => {
      if (!agentMap.has(entry.agentId)) {
        agentMap.set(entry.agentId, {
          id: entry.agentId,
          alias: entry.agentAlias
        });
      }
    });
    return Array.from(agentMap.values());
  }, [workEntries]);

  // Toggle entry expansion
  const toggleEntryExpansion = (entryId) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  // Copy entry details
  const copyEntryDetails = (entry, format = 'json') => {
    let content = '';

    switch (format) {
      case 'json':
        content = JSON.stringify(entry, null, 2);
        break;
      case 'markdown':
        content = `
## ${entry.title}
**Agent**: ${entry.agentAlias} (${entry.agentId})
**Time**: ${new Date(entry.timestamp).toLocaleString()}
**Type**: ${entry.actionType}
**Status**: ${entry.status}

### Description
${entry.description}

### Impact
- **Level**: ${entry.impact.level}
- **Systems**: ${entry.impact.affectedSystems.join(', ')}

### Changes
**Before**: ${JSON.stringify(entry.changes.before, null, 2)}
**After**: ${JSON.stringify(entry.changes.after, null, 2)}

### Reasoning
${entry.reasoning}
        `;
        break;
      case 'summary':
        content = `${entry.title} - ${entry.agentAlias} - ${entry.status}`;
        break;
    }

    navigator.clipboard.writeText(content);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export work journal
  const exportJournal = () => {
    const data = {
      exportDate: new Date().toISOString(),
      filters: filters,
      entries: filteredEntries,
      summary: {
        totalEntries: filteredEntries.length,
        byAgent: {},
        byType: {},
        byStatus: {}
      }
    };

    // Calculate summaries
    filteredEntries.forEach(entry => {
      data.summary.byAgent[entry.agentAlias] = (data.summary.byAgent[entry.agentAlias] || 0) + 1;
      data.summary.byType[entry.actionType] = (data.summary.byType[entry.actionType] || 0) + 1;
      data.summary.byStatus[entry.status] = (data.summary.byStatus[entry.status] || 0) + 1;
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-work-journal-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get action type icon
  const getActionIcon = (actionType) => {
    const icons = {
      'CODE_MODIFICATION': <Code className="w-4 h-4" />,
      'SECURITY_AUDIT': <Shield className="w-4 h-4" />,
      'OPTIMIZATION': <Zap className="w-4 h-4" />,
      'API_INTEGRATION': <Package className="w-4 h-4" />,
      'STRATEGIC_DECISION': <GitBranch className="w-4 h-4" />,
      'ERROR_DETECTION': <AlertTriangle className="w-4 h-4" />,
      'DATABASE_CHANGE': <Database className="w-4 h-4" />,
      'FILE_OPERATION': <File className="w-4 h-4" />,
      'DEPLOYMENT': <GitMerge className="w-4 h-4" />,
      'CONFIGURATION': <Settings className="w-4 h-4" />
    };
    return icons[actionType] || <Activity className="w-4 h-4" />;
  };

  // Get impact level color
  const getImpactColor = (level) => {
    const colors = {
      'CRITICAL': 'text-red-600 bg-red-50',
      'HIGH': 'text-orange-600 bg-orange-50',
      'MEDIUM': 'text-yellow-600 bg-yellow-50',
      'LOW': 'text-green-600 bg-green-50'
    };
    return colors[level] || 'text-gray-600 bg-gray-50';
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'COMPLETED': 'text-green-600',
      'IN_PROGRESS': 'text-blue-600',
      'RESOLVED': 'text-green-600',
      'FAILED': 'text-red-600',
      'PENDING': 'text-yellow-600'
    };
    return colors[status] || 'text-gray-600';
  };

  // Render entry details
  const renderEntryDetails = (entry) => {
    if (!expandedEntries.has(entry.id)) return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
        {/* Files affected */}
        {entry.files && entry.files.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Files Modified:</h5>
            <div className="flex flex-wrap gap-2">
              {entry.files.map((file, idx) => (
                <span key={idx} className="px-2 py-1 bg-white rounded text-xs text-gray-600 font-mono">
                  {file}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Changes comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Before:</h5>
            <pre className="p-2 bg-red-50 rounded text-xs overflow-x-auto">
              {JSON.stringify(entry.changes.before, null, 2)}
            </pre>
          </div>
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">After:</h5>
            <pre className="p-2 bg-green-50 rounded text-xs overflow-x-auto">
              {JSON.stringify(entry.changes.after, null, 2)}
            </pre>
          </div>
        </div>

        {/* Reasoning */}
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-2">Agent Reasoning:</h5>
          <p className="text-sm text-gray-600 italic">"{entry.reasoning}"</p>
        </div>

        {/* Impact analysis */}
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-2">Impact Analysis:</h5>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(entry.impact.metrics).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="text-xs text-gray-500">{key}</div>
                <div className="text-lg font-semibold text-gray-800">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Testing results */}
        {entry.testing && (
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Testing:</h5>
            <div className="flex flex-wrap gap-3">
              {entry.testing.automated && (
                <span className="text-xs">
                  Automated: {entry.testing.automated.passed} passed,
                  {entry.testing.automated.failed} failed
                </span>
              )}
              {entry.testing.coverage && (
                <span className="text-xs">Coverage: {entry.testing.coverage}</span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-2 border-t">
          <div className="flex gap-2">
            {entry.commits && entry.commits.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <GitCommit className="w-3 h-3" />
                {entry.commits.length} commits
              </span>
            )}
            {entry.reviewedBy && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <User className="w-3 h-3" />
                Reviewed by {entry.reviewedBy}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => copyEntryDetails(entry, 'json')}
              className="p-1 hover:bg-gray-200 rounded"
              title="Copy as JSON"
            >
              {copiedId === entry.id ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setSelectedEntry(entry)}
              className="p-1 hover:bg-gray-200 rounded"
              title="View details"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-blue-600" />
            Agent Work Journal
          </h2>
          <div className="flex items-center gap-3">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto-refresh
            </button>

            {/* View mode selector */}
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="px-3 py-1 border rounded-lg"
            >
              <option value="timeline">Timeline View</option>
              <option value="grouped">Grouped View</option>
              <option value="detailed">Detailed View</option>
            </select>

            {/* Export button */}
            <button
              onClick={exportJournal}
              className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Export Journal
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-6 gap-3">
          {/* Agent filter */}
          <select
            value={filters.agentId}
            onChange={(e) => setFilters({ ...filters, agentId: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Agents</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.alias}
              </option>
            ))}
          </select>

          {/* Action type filter */}
          <select
            value={filters.actionType}
            onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Actions</option>
            <option value="CODE_MODIFICATION">Code Changes</option>
            <option value="SECURITY_AUDIT">Security</option>
            <option value="OPTIMIZATION">Optimization</option>
            <option value="API_INTEGRATION">API Work</option>
            <option value="STRATEGIC_DECISION">Strategic</option>
            <option value="ERROR_DETECTION">Monitoring</option>
          </select>

          {/* Date range filter */}
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>

          {/* Impact level filter */}
          <select
            value={filters.impactLevel}
            onChange={(e) => setFilters({ ...filters, impactLevel: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Impact</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-10 pr-3 py-2 border rounded-lg w-full"
            />
          </div>
        </div>

        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Total Entries</div>
            <div className="text-xl font-semibold">{filteredEntries.length}</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-xs text-gray-500">Completed</div>
            <div className="text-xl font-semibold text-green-600">
              {filteredEntries.filter(e => e.status === 'COMPLETED').length}
            </div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="text-xs text-gray-500">Critical Actions</div>
            <div className="text-xl font-semibold text-orange-600">
              {filteredEntries.filter(e => e.impact.level === 'CRITICAL').length}
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-gray-500">Active Agents</div>
            <div className="text-xl font-semibold text-blue-600">{agents.length}</div>
          </div>
        </div>
      </div>

      {/* Work entries */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Loading work journal...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-8">
            <Archive className="w-12 h-12 mx-auto text-gray-300" />
            <p className="mt-2 text-gray-500">No work entries found</p>
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div
              key={entry.id}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Entry header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {/* Action icon */}
                  <div className={`p-2 rounded-lg ${getImpactColor(entry.impact.level)}`}>
                    {getActionIcon(entry.actionType)}
                  </div>

                  {/* Entry details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-800">{entry.title}</h4>
                      <span className={`text-xs font-medium ${getStatusColor(entry.status)}`}>
                        {entry.status}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">{entry.description}</p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {entry.agentAlias}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {entry.duration}
                      </span>
                      {entry.tags.map((tag, idx) => (
                        <span key={idx} className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expand/collapse button */}
                <button
                  onClick={() => toggleEntryExpansion(entry.id)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {expandedEntries.has(entry.id) ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Expanded details */}
              {renderEntryDetails(entry)}
            </div>
          ))
        )}
      </div>

      {/* Detail modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">{selectedEntry.title}</h3>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                ×
              </button>
            </div>

            {/* Full entry details */}
            <pre className="p-4 bg-gray-50 rounded overflow-x-auto text-xs">
              {JSON.stringify(selectedEntry, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentWorkJournal;