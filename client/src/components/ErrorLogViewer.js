// ErrorLogViewer.js - Real-time error tracking for Admin Dashboard
import React, { useState, useEffect } from 'react';
import debugService from '../services/debugService';

const ErrorLogViewer = () => {
  const [errors, setErrors] = useState([]);
  const [filter, setFilter] = useState('error'); // 'all', 'error', 'warn', 'info'
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Load errors from debugService with defensive checks
    const loadLogs = () => {
      // Check if debugService has the required methods
      const allErrors = (typeof debugService.getErrors === 'function' ? debugService.getErrors() : debugService.errors) || [];
      const allWarnings = (typeof debugService.getWarnings === 'function' ? debugService.getWarnings() : debugService.warnings) || [];
      const allLogs = (typeof debugService.getLogs === 'function' ? debugService.getLogs() : debugService.logs) || [];

      // Combine and format
      const combined = [
        ...allErrors.map(e => ({
          ...e,
          level: 'error',
          message: e.details?.message || e.type || 'Unknown error',
          details: JSON.stringify(e.details, null, 2)
        })),
        ...allWarnings.map(w => ({
          ...w,
          level: 'warn',
          message: w.details?.message || w.type || 'Warning',
          details: JSON.stringify(w.details, null, 2)
        })),
        ...allLogs.map(l => ({
          ...l,
          level: 'info',
          message: l.details?.message || l.type || 'Info',
          details: JSON.stringify(l.details, null, 2)
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setErrors(combined);
    };

    loadLogs();
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const filteredErrors = filter === 'all'
    ? errors
    : errors.filter(e => e.level === filter);

  const clearErrors = () => {
    debugService.clearErrors();
    debugService.clearWarnings();
    debugService.clearLogs();
    setRefreshKey(k => k + 1);
  };

  const getErrorCount = (level) => {
    return errors.filter(e => e.level === level).length;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const styles = {
    container: {
      padding: '20px'
    },
    header: {
      marginBottom: '20px'
    },
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '10px'
    },
    description: {
      color: '#666',
      marginBottom: '15px'
    },
    controls: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      alignItems: 'center'
    },
    filter: {
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px'
    },
    button: {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold'
    },
    refreshBtn: {
      backgroundColor: '#007bff',
      color: 'white'
    },
    clearBtn: {
      backgroundColor: '#dc3545',
      color: 'white'
    },
    stats: {
      display: 'flex',
      gap: '15px',
      marginBottom: '20px'
    },
    statCard: {
      padding: '10px 20px',
      border: '2px solid',
      borderRadius: '8px',
      flex: '0 0 auto'
    },
    statValue: {
      fontSize: '24px',
      fontWeight: 'bold'
    },
    statLabel: {
      fontSize: '12px',
      textTransform: 'uppercase',
      marginTop: '4px'
    },
    logsContainer: {
      maxHeight: '500px',
      overflowY: 'auto',
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '10px'
    },
    logEntry: {
      marginBottom: '12px',
      padding: '12px',
      borderLeft: '4px solid',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px'
    },
    logHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px'
    },
    logLevel: {
      fontWeight: 'bold',
      textTransform: 'uppercase',
      fontSize: '12px'
    },
    logTime: {
      color: '#666',
      fontSize: '12px'
    },
    logMessage: {
      fontWeight: 'bold',
      marginBottom: '4px'
    },
    logDetails: {
      fontSize: '12px',
      color: '#666',
      whiteSpace: 'pre-wrap',
      maxHeight: '100px',
      overflowY: 'auto'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px',
      color: '#666'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>🔍 Real-Time Error Tracking</h3>
        <p style={styles.description}>
          Production errors are captured here even when console.log is disabled.
          Errors and warnings are always logged for debugging.
        </p>
      </div>

      <div style={styles.controls}>
        <select
          style={styles.filter}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Logs</option>
          <option value="error">Errors Only</option>
          <option value="warn">Warnings Only</option>
          <option value="info">Info Only</option>
        </select>

        <button
          style={{...styles.button, ...styles.refreshBtn}}
          onClick={() => setRefreshKey(k => k + 1)}
        >
          🔄 Refresh
        </button>

        <button
          style={{...styles.button, ...styles.clearBtn}}
          onClick={clearErrors}
        >
          🗑️ Clear All
        </button>

        <span style={{marginLeft: 'auto', color: '#666', fontSize: '12px'}}>
          Auto-refreshes every 5 seconds
        </span>
      </div>

      <div style={styles.stats}>
        <div style={{...styles.statCard, borderColor: '#dc3545'}}>
          <div style={{...styles.statValue, color: '#dc3545'}}>
            {getErrorCount('error')}
          </div>
          <div style={styles.statLabel}>Errors</div>
        </div>

        <div style={{...styles.statCard, borderColor: '#ffc107'}}>
          <div style={{...styles.statValue, color: '#f57c00'}}>
            {getErrorCount('warn')}
          </div>
          <div style={styles.statLabel}>Warnings</div>
        </div>

        <div style={{...styles.statCard, borderColor: '#28a745'}}>
          <div style={{...styles.statValue, color: '#28a745'}}>
            {getErrorCount('info')}
          </div>
          <div style={styles.statLabel}>Info</div>
        </div>
      </div>

      <div style={styles.logsContainer}>
        {filteredErrors.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No {filter === 'all' ? 'logs' : filter + 's'} captured yet.</p>
            <p>Errors will appear here automatically when they occur.</p>
          </div>
        ) : (
          filteredErrors.slice(0, 100).map((log, index) => (
            <div
              key={log.id || index}
              style={{
                ...styles.logEntry,
                borderLeftColor: log.level === 'error' ? '#dc3545' :
                                log.level === 'warn' ? '#ffc107' : '#28a745',
                backgroundColor: log.level === 'error' ? '#fff5f5' :
                                log.level === 'warn' ? '#fffaf0' : '#f5fff5'
              }}
            >
              <div style={styles.logHeader}>
                <span style={{
                  ...styles.logLevel,
                  color: log.level === 'error' ? '#dc3545' :
                        log.level === 'warn' ? '#f57c00' : '#28a745'
                }}>
                  {log.level}
                </span>
                <span style={styles.logTime}>
                  {formatTimestamp(log.timestamp)}
                </span>
              </div>
              <div style={styles.logMessage}>{log.message}</div>
              {log.url && (
                <div style={styles.logDetails}>URL: {log.url}</div>
              )}
              {log.details && (
                <div style={styles.logDetails}>{log.details}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ErrorLogViewer;