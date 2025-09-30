/**
 * Enhanced Error Log Viewer
 * Advanced error tracking with multiple copy formats and analytics
 */

import React, { useState, useEffect, useCallback } from 'react';
import debugService from '../services/debugService';

const EnhancedErrorLogViewer = ({ currentUser }) => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLogs, setSelectedLogs] = useState(new Set());
  const [copyFormat, setCopyFormat] = useState('github');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [groupBy, setGroupBy] = useState('time'); // time, severity, agent, component
  const [timeRange, setTimeRange] = useState('24h');
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Load logs
  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [logs, filter, searchTerm, timeRange]);

  const loadLogs = () => {
    // Combine all log sources
    const errors = (debugService.getErrors?.() || debugService.errors || []).map(e => ({
      ...e,
      level: 'error',
      severity: 'high',
      source: e.source || 'unknown',
      agent: e.agent || 'system',
      component: e.component || 'general'
    }));

    const warnings = (debugService.getWarnings?.() || debugService.warnings || []).map(w => ({
      ...w,
      level: 'warn',
      severity: 'medium',
      source: w.source || 'unknown',
      agent: w.agent || 'system',
      component: w.component || 'general'
    }));

    const info = (debugService.getLogs?.() || debugService.logs || []).map(l => ({
      ...l,
      level: 'info',
      severity: 'low',
      source: l.source || 'unknown',
      agent: l.agent || 'system',
      component: l.component || 'general'
    }));

    const allLogs = [...errors, ...warnings, ...info]
      .map((log, index) => ({
        ...log,
        id: log.id || `log-${index}-${Date.now()}`,
        timestamp: log.timestamp || new Date(),
        message: log.details?.message || log.message || log.type || 'Unknown',
        stackTrace: log.details?.stack || log.stackTrace || '',
        context: log.details?.context || log.context || {},
        reproducible: log.reproducible !== undefined ? log.reproducible : 'unknown'
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setLogs(allLogs);
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Apply level filter
    if (filter !== 'all') {
      filtered = filtered.filter(log => log.level === filter);
    }

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.component.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.agent.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply time range
    const now = new Date();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    if (timeRange !== 'all' && ranges[timeRange]) {
      const cutoff = new Date(now - ranges[timeRange]);
      filtered = filtered.filter(log =>
        new Date(log.timestamp) > cutoff
      );
    }

    setFilteredLogs(filtered);
  };

  const copyLog = (log, format = copyFormat) => {
    const text = formatLogForCopy(log, format);
    navigator.clipboard.writeText(text).then(() => {
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    });
  };

  const copySelected = () => {
    const selectedLogsList = filteredLogs.filter(log =>
      selectedLogs.has(log.id)
    );

    if (selectedLogsList.length === 0) return;

    const text = selectedLogsList
      .map(log => formatLogForCopy(log, copyFormat))
      .join('\n\n---\n\n');

    navigator.clipboard.writeText(text).then(() => {
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    });
  };

  const formatLogForCopy = (log, format) => {
    const formats = {
      github: () => `
## Error Report

**Timestamp**: ${new Date(log.timestamp).toISOString()}
**Severity**: ${log.severity.toUpperCase()}
**Level**: ${log.level}
**Agent**: ${log.agent}
**Component**: ${log.component}

### Description
${log.message}

${log.stackTrace ? `### Stack Trace
\`\`\`javascript
${log.stackTrace}
\`\`\`` : ''}

### Context
\`\`\`json
${JSON.stringify(log.context, null, 2)}
\`\`\`

### Reproduction
${log.reproducible === 'yes' ? '✅ Reproducible' : log.reproducible === 'no' ? '❌ Not Reproducible' : '❓ Unknown'}

### Environment
- **User**: ${currentUser?.email || 'Unknown'}
- **URL**: ${window.location.href}
- **Browser**: ${navigator.userAgent}
- **Time**: ${new Date(log.timestamp).toLocaleString()}
`,

      json: () => JSON.stringify({
        timestamp: log.timestamp,
        level: log.level,
        severity: log.severity,
        agent: log.agent,
        component: log.component,
        message: log.message,
        stackTrace: log.stackTrace,
        context: log.context,
        reproducible: log.reproducible,
        environment: {
          user: currentUser?.email,
          url: window.location.href,
          userAgent: navigator.userAgent
        }
      }, null, 2),

      csv: () => {
        const escaped = (str) => `"${String(str).replace(/"/g, '""')}"`;
        return [
          'Timestamp,Level,Severity,Agent,Component,Message,Stack Trace,Context',
          [
            escaped(new Date(log.timestamp).toISOString()),
            escaped(log.level),
            escaped(log.severity),
            escaped(log.agent),
            escaped(log.component),
            escaped(log.message),
            escaped(log.stackTrace || ''),
            escaped(JSON.stringify(log.context))
          ].join(',')
        ].join('\n');
      },

      markdown: () => `
### ${log.level.toUpperCase()}: ${log.message}

- **Time**: ${new Date(log.timestamp).toLocaleString()}
- **Agent**: ${log.agent}
- **Component**: ${log.component}
- **Severity**: ${log.severity}

${log.stackTrace ? `#### Stack Trace
${log.stackTrace}` : ''}

#### Context
${JSON.stringify(log.context, null, 2)}
`,

      developer: () => {
        const fullDetails = {
          ...log,
          systemInfo: {
            memoryUsage: performance.memory ? {
              usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
              totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
              limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB'
            } : 'N/A',
            platform: navigator.platform,
            language: navigator.language,
            onLine: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            windowSize: `${window.innerWidth}x${window.innerHeight}`,
            timestamp: new Date().toISOString()
          },
          localStorage: Object.keys(localStorage).length + ' items',
          sessionStorage: Object.keys(sessionStorage).length + ' items'
        };
        return JSON.stringify(fullDetails, null, 2);
      },

      simple: () => `${new Date(log.timestamp).toLocaleTimeString()} [${log.level.toUpperCase()}] ${log.message}`
    };

    return formats[format] ? formats[format]() : formats.simple();
  };

  const toggleLogSelection = (logId) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(logId)) {
      newSelected.delete(logId);
    } else {
      newSelected.add(logId);
    }
    setSelectedLogs(newSelected);
  };

  const selectAll = () => {
    const allIds = new Set(filteredLogs.map(log => log.id));
    setSelectedLogs(allIds);
  };

  const clearSelection = () => {
    setSelectedLogs(new Set());
  };

  const clearLogs = () => {
    debugService.clearDebugData();
    setLogs([]);
    setFilteredLogs([]);
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cartsmash-logs-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getAnalytics = () => {
    const analytics = {
      total: filteredLogs.length,
      byLevel: {},
      bySeverity: {},
      byAgent: {},
      byComponent: {},
      errorRate: 0,
      topErrors: []
    };

    filteredLogs.forEach(log => {
      // By level
      analytics.byLevel[log.level] = (analytics.byLevel[log.level] || 0) + 1;

      // By severity
      analytics.bySeverity[log.severity] = (analytics.bySeverity[log.severity] || 0) + 1;

      // By agent
      analytics.byAgent[log.agent] = (analytics.byAgent[log.agent] || 0) + 1;

      // By component
      analytics.byComponent[log.component] = (analytics.byComponent[log.component] || 0) + 1;
    });

    // Calculate error rate
    analytics.errorRate = analytics.byLevel.error
      ? ((analytics.byLevel.error / analytics.total) * 100).toFixed(1)
      : 0;

    // Get top errors
    const errorCounts = {};
    filteredLogs
      .filter(log => log.level === 'error')
      .forEach(log => {
        const key = log.message.substring(0, 50);
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      });

    analytics.topErrors = Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));

    return analytics;
  };

  const analytics = showAnalytics ? getAnalytics() : null;

  const groupedLogs = () => {
    if (groupBy === 'time') return filteredLogs;

    const groups = {};
    filteredLogs.forEach(log => {
      const key = log[groupBy] || 'unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    });

    return groups;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      high: '#ff4444',
      medium: '#ffaa00',
      low: '#4CAF50'
    };
    return colors[severity] || '#888888';
  };

  const getLevelIcon = (level) => {
    const icons = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️'
    };
    return icons[level] || '📝';
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>
          <h3 style={styles.titleText}>📋 Enhanced Error Log Viewer</h3>
          <span style={styles.subtitle}>
            Real-time error tracking with advanced copy features
          </span>
        </div>
        <div style={styles.stats}>
          <span style={styles.statItem}>
            Total: <strong>{filteredLogs.length}</strong>
          </span>
          <span style={{ ...styles.statItem, color: '#ff4444' }}>
            Errors: <strong>{filteredLogs.filter(l => l.level === 'error').length}</strong>
          </span>
          <span style={{ ...styles.statItem, color: '#ffaa00' }}>
            Warnings: <strong>{filteredLogs.filter(l => l.level === 'warn').length}</strong>
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Levels</option>
            <option value="error">Errors Only</option>
            <option value="warn">Warnings Only</option>
            <option value="info">Info Only</option>
          </select>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={styles.select}
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>

          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            style={styles.select}
          >
            <option value="time">Group by Time</option>
            <option value="severity">Group by Severity</option>
            <option value="agent">Group by Agent</option>
            <option value="component">Group by Component</option>
          </select>

          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.controlGroup}>
          <select
            value={copyFormat}
            onChange={(e) => setCopyFormat(e.target.value)}
            style={styles.select}
          >
            <option value="github">GitHub Issue</option>
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="markdown">Markdown</option>
            <option value="developer">Developer (Full)</option>
            <option value="simple">Simple Text</option>
          </select>

          <button
            onClick={selectAll}
            style={styles.button}
            disabled={filteredLogs.length === 0}
          >
            Select All
          </button>

          <button
            onClick={clearSelection}
            style={styles.button}
            disabled={selectedLogs.size === 0}
          >
            Clear Selection
          </button>

          <button
            onClick={copySelected}
            style={{ ...styles.button, ...styles.primaryButton }}
            disabled={selectedLogs.size === 0}
          >
            📋 Copy Selected ({selectedLogs.size})
          </button>

          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            style={styles.button}
          >
            📊 {showAnalytics ? 'Hide' : 'Show'} Analytics
          </button>

          <button
            onClick={exportLogs}
            style={styles.button}
            disabled={filteredLogs.length === 0}
          >
            💾 Export
          </button>

          <button
            onClick={clearLogs}
            style={{ ...styles.button, ...styles.dangerButton }}
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      {/* Copy Success Notification */}
      {showCopySuccess && (
        <div style={styles.notification}>
          ✅ Copied to clipboard!
        </div>
      )}

      {/* Analytics Panel */}
      {showAnalytics && analytics && (
        <div style={styles.analyticsPanel}>
          <h4 style={styles.analyticsTitle}>📊 Log Analytics</h4>
          <div style={styles.analyticsGrid}>
            <div style={styles.analyticsCard}>
              <div style={styles.analyticsLabel}>Error Rate</div>
              <div style={styles.analyticsValue}>{analytics.errorRate}%</div>
            </div>

            <div style={styles.analyticsCard}>
              <div style={styles.analyticsLabel}>By Level</div>
              <div style={styles.analyticsBreakdown}>
                {Object.entries(analytics.byLevel).map(([level, count]) => (
                  <div key={level} style={styles.breakdownItem}>
                    <span>{getLevelIcon(level)} {level}:</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.analyticsCard}>
              <div style={styles.analyticsLabel}>Top Agents</div>
              <div style={styles.analyticsBreakdown}>
                {Object.entries(analytics.byAgent)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([agent, count]) => (
                    <div key={agent} style={styles.breakdownItem}>
                      <span>{agent}:</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
              </div>
            </div>

            <div style={styles.analyticsCard}>
              <div style={styles.analyticsLabel}>Top Errors</div>
              <div style={styles.analyticsBreakdown}>
                {analytics.topErrors.map((error, idx) => (
                  <div key={idx} style={styles.breakdownItem}>
                    <span style={styles.errorMessage}>
                      {error.message}...
                    </span>
                    <strong>{error.count}x</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs List */}
      <div style={styles.logsContainer}>
        {groupBy === 'time' ? (
          // Normal time-based view
          filteredLogs.map(log => (
            <div
              key={log.id}
              style={{
                ...styles.logEntry,
                ...(selectedLogs.has(log.id) ? styles.selectedLog : {})
              }}
            >
              <div style={styles.logHeader}>
                <input
                  type="checkbox"
                  checked={selectedLogs.has(log.id)}
                  onChange={() => toggleLogSelection(log.id)}
                  style={styles.checkbox}
                />

                <span style={styles.logIcon}>{getLevelIcon(log.level)}</span>

                <span style={{
                  ...styles.severityBadge,
                  backgroundColor: getSeverityColor(log.severity)
                }}>
                  {log.severity}
                </span>

                <span style={styles.logAgent}>{log.agent}</span>
                <span style={styles.logComponent}>{log.component}</span>
                <span style={styles.logTime}>
                  {new Date(log.timestamp).toLocaleString()}
                </span>

                <button
                  onClick={() => copyLog(log)}
                  style={styles.copyButton}
                  title={`Copy as ${copyFormat}`}
                >
                  📋
                </button>
              </div>

              <div style={styles.logMessage}>{log.message}</div>

              {log.stackTrace && (
                <details style={styles.stackTrace}>
                  <summary style={styles.stackTraceSummary}>
                    Stack Trace (click to expand)
                  </summary>
                  <pre style={styles.stackTraceContent}>{log.stackTrace}</pre>
                </details>
              )}

              {Object.keys(log.context).length > 0 && (
                <details style={styles.context}>
                  <summary style={styles.contextSummary}>
                    Context ({Object.keys(log.context).length} properties)
                  </summary>
                  <pre style={styles.contextContent}>
                    {JSON.stringify(log.context, null, 2)}
                  </pre>
                </details>
              )}

              <div style={styles.logActions}>
                <button
                  onClick={() => copyLog(log, 'github')}
                  style={styles.actionButton}
                >
                  🐙 GitHub
                </button>
                <button
                  onClick={() => copyLog(log, 'json')}
                  style={styles.actionButton}
                >
                  {} JSON
                </button>
                <button
                  onClick={() => copyLog(log, 'developer')}
                  style={styles.actionButton}
                >
                  🔧 Full Details
                </button>
              </div>
            </div>
          ))
        ) : (
          // Grouped view
          Object.entries(groupedLogs()).map(([group, groupLogs]) => (
            <div key={group} style={styles.logGroup}>
              <div style={styles.groupHeader}>
                <span style={styles.groupTitle}>{group}</span>
                <span style={styles.groupCount}>{groupLogs.length} logs</span>
              </div>
              {groupLogs.map(log => (
                <div
                  key={log.id}
                  style={{
                    ...styles.logEntry,
                    marginLeft: '20px',
                    ...(selectedLogs.has(log.id) ? styles.selectedLog : {})
                  }}
                >
                  {/* Same log entry content as above */}
                  <div style={styles.logHeader}>
                    <input
                      type="checkbox"
                      checked={selectedLogs.has(log.id)}
                      onChange={() => toggleLogSelection(log.id)}
                      style={styles.checkbox}
                    />
                    <span style={styles.logIcon}>{getLevelIcon(log.level)}</span>
                    <span style={styles.logTime}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => copyLog(log)}
                      style={styles.copyButton}
                    >
                      📋
                    </button>
                  </div>
                  <div style={styles.logMessage}>{log.message}</div>
                </div>
              ))}
            </div>
          ))
        )}

        {filteredLogs.length === 0 && (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📭</span>
            <p style={styles.emptyText}>No logs found</p>
            <p style={styles.emptySubtext}>
              {searchTerm ? 'Try adjusting your search criteria' : 'All clear!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e0e0e0'
  },

  title: {
    display: 'flex',
    flexDirection: 'column'
  },

  titleText: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333'
  },

  subtitle: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px'
  },

  stats: {
    display: 'flex',
    gap: '20px'
  },

  statItem: {
    fontSize: '14px',
    color: '#666'
  },

  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px'
  },

  controlGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },

  select: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
    cursor: 'pointer'
  },

  searchInput: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    flex: '1',
    minWidth: '200px'
  },

  button: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#f5f5f5'
    }
  },

  primaryButton: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: '1px solid #4CAF50'
  },

  dangerButton: {
    backgroundColor: '#ff4444',
    color: '#fff',
    border: '1px solid #ff4444'
  },

  notification: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    fontSize: '14px',
    zIndex: 1000,
    animation: 'slideIn 0.3s ease'
  },

  analyticsPanel: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '20px'
  },

  analyticsTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333'
  },

  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },

  analyticsCard: {
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    border: '1px solid #e0e0e0'
  },

  analyticsLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },

  analyticsValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333'
  },

  analyticsBreakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },

  breakdownItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#666'
  },

  errorMessage: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginRight: '8px'
  },

  logsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  logGroup: {
    marginBottom: '16px'
  },

  groupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#f0f0f0',
    borderRadius: '6px',
    marginBottom: '8px',
    fontWeight: 'bold'
  },

  groupTitle: {
    fontSize: '14px',
    color: '#333'
  },

  groupCount: {
    fontSize: '12px',
    color: '#666'
  },

  logEntry: {
    padding: '12px',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    transition: 'all 0.2s'
  },

  selectedLog: {
    backgroundColor: '#e8f4ff',
    borderColor: '#4a9eff'
  },

  logHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },

  checkbox: {
    cursor: 'pointer'
  },

  logIcon: {
    fontSize: '16px'
  },

  severityBadge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase'
  },

  logAgent: {
    fontSize: '12px',
    color: '#666',
    backgroundColor: '#f0f0f0',
    padding: '2px 6px',
    borderRadius: '4px'
  },

  logComponent: {
    fontSize: '12px',
    color: '#666',
    backgroundColor: '#f0f0f0',
    padding: '2px 6px',
    borderRadius: '4px'
  },

  logTime: {
    fontSize: '12px',
    color: '#888',
    marginLeft: 'auto'
  },

  copyButton: {
    padding: '4px 8px',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },

  logMessage: {
    fontSize: '14px',
    color: '#333',
    marginBottom: '8px',
    lineHeight: '1.5'
  },

  stackTrace: {
    marginBottom: '8px'
  },

  stackTraceSummary: {
    fontSize: '12px',
    color: '#666',
    cursor: 'pointer',
    userSelect: 'none'
  },

  stackTraceContent: {
    fontSize: '12px',
    backgroundColor: '#f5f5f5',
    padding: '8px',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '200px',
    marginTop: '8px'
  },

  context: {
    marginBottom: '8px'
  },

  contextSummary: {
    fontSize: '12px',
    color: '#666',
    cursor: 'pointer',
    userSelect: 'none'
  },

  contextContent: {
    fontSize: '12px',
    backgroundColor: '#f5f5f5',
    padding: '8px',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '200px',
    marginTop: '8px'
  },

  logActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px'
  },

  actionButton: {
    padding: '4px 8px',
    fontSize: '11px',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },

  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999'
  },

  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px'
  },

  emptyText: {
    fontSize: '18px',
    margin: '0 0 8px 0'
  },

  emptySubtext: {
    fontSize: '14px',
    margin: 0
  }
};

export default EnhancedErrorLogViewer;