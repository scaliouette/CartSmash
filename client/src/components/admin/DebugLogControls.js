// client/src/components/admin/DebugLogControls.js - Admin controls for debug logging

import React, { useState, useEffect } from 'react';
import {
  logger,
  LOG_LEVELS,
  setLogLevel,
  getLogLevel,
  debugUtils
} from '../../utils/debugLogger';

const DebugLogControls = () => {
  const [currentLevel, setCurrentLevel] = useState(getLogLevel());
  const [stats, setStats] = useState(debugUtils.getStats());
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Update stats when level changes
    setStats(debugUtils.getStats());
  }, [currentLevel]);

  const handleLevelChange = (newLevel) => {
    setLogLevel(newLevel);
    setCurrentLevel(newLevel);
    logger.info('admin', 'debugControls', `Log level changed to ${Object.keys(LOG_LEVELS)[newLevel]}`);
  };

  const clearLogs = () => {
    console.clear();
    setLogs([]);
    logger.info('admin', 'debugControls', 'Console cleared');
  };

  const exportLogs = () => {
    try {
      // Get debug logs from localStorage if available
      const storedLogs = localStorage.getItem('cartsmash_debug_logs');
      const logData = {
        timestamp: new Date().toISOString(),
        level: stats.levelName,
        environment: stats.isProduction ? 'production' : 'development',
        url: window.location.href,
        userAgent: navigator.userAgent,
        logs: storedLogs ? JSON.parse(storedLogs) : []
      };

      const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cartsmash-debug-logs-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logger.info('admin', 'debugControls', 'Debug logs exported');
    } catch (error) {
      logger.error('admin', 'debugControls', 'Failed to export logs', { error: error.message });
    }
  };

  const testLogging = () => {
    logger.error('admin', 'test', 'Test error message');
    logger.warn('admin', 'test', 'Test warning message');
    logger.info('admin', 'test', 'Test info message');
    logger.debug('admin', 'test', 'Test debug message');
    logger.trace('admin', 'test', 'Test trace message');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>🔧 Debug Logging Controls</h3>
        <div style={styles.stats}>
          <span style={styles.statItem}>
            Level: <strong>{stats.levelName}</strong>
          </span>
          <span style={styles.statItem}>
            Environment: <strong>{stats.isProduction ? 'Production' : 'Development'}</strong>
          </span>
        </div>
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Log Level Control</h4>
        <p style={styles.description}>
          Control the verbosity of debug logging. Lower levels include higher levels.
        </p>

        <div style={styles.levelControls}>
          {Object.entries(LOG_LEVELS).map(([name, level]) => (
            <button
              key={level}
              onClick={() => handleLevelChange(level)}
              style={{
                ...styles.levelButton,
                ...(currentLevel === level ? styles.levelButtonActive : {})
              }}
            >
              {name} ({level})
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Quick Actions</h4>
        <div style={styles.buttonGroup}>
          <button
            onClick={() => handleLevelChange(LOG_LEVELS.TRACE)}
            style={styles.actionButton}
          >
            🔬 Enable Verbose Logging
          </button>

          <button
            onClick={() => handleLevelChange(LOG_LEVELS.ERROR)}
            style={styles.actionButton}
          >
            🔇 Minimal Logging (Errors Only)
          </button>

          <button
            onClick={() => handleLevelChange(LOG_LEVELS.OFF)}
            style={styles.actionButton}
          >
            ⚡ Disable All Logging (Performance Mode)
          </button>

          <button
            onClick={debugUtils.resetLogging}
            style={styles.actionButton}
          >
            🔄 Reset to Default
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Log Management</h4>
        <div style={styles.buttonGroup}>
          <button onClick={clearLogs} style={styles.actionButton}>
            🗑️ Clear Console
          </button>

          <button onClick={exportLogs} style={styles.actionButton}>
            💾 Export Debug Logs
          </button>

          <button onClick={testLogging} style={styles.actionButton}>
            🧪 Test All Log Levels
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Performance Impact</h4>
        <div style={styles.performanceInfo}>
          <div style={styles.infoRow}>
            <span>OFF (0):</span>
            <span>Zero performance impact, no logging</span>
          </div>
          <div style={styles.infoRow}>
            <span>ERROR (1):</span>
            <span>Minimal impact, critical errors only</span>
          </div>
          <div style={styles.infoRow}>
            <span>WARN (2):</span>
            <span>Low impact, warnings and errors</span>
          </div>
          <div style={styles.infoRow}>
            <span>INFO (3):</span>
            <span>Moderate impact, general information</span>
          </div>
          <div style={styles.infoRow}>
            <span>DEBUG (4):</span>
            <span>High impact, detailed debugging</span>
          </div>
          <div style={styles.infoRow}>
            <span>TRACE (5):</span>
            <span>Maximum impact, all logging enabled</span>
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>
          💡 <strong>Tip:</strong> Use ERROR level in production for best performance.
          Use DEBUG or TRACE levels only when troubleshooting specific issues.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid #dee2e6'
  },

  title: {
    margin: 0,
    color: '#495057',
    fontSize: '18px',
    fontWeight: '600'
  },

  stats: {
    display: 'flex',
    gap: '20px'
  },

  statItem: {
    fontSize: '14px',
    color: '#6c757d'
  },

  section: {
    marginBottom: '20px'
  },

  sectionTitle: {
    margin: '0 0 10px 0',
    color: '#495057',
    fontSize: '16px',
    fontWeight: '500'
  },

  description: {
    fontSize: '14px',
    color: '#6c757d',
    marginBottom: '15px'
  },

  levelControls: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },

  levelButton: {
    padding: '8px 16px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    color: '#495057',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },

  levelButtonActive: {
    backgroundColor: '#007bff',
    color: '#ffffff',
    borderColor: '#007bff'
  },

  buttonGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },

  actionButton: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#6c757d',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s ease'
  },

  performanceInfo: {
    backgroundColor: '#ffffff',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    padding: '15px'
  },

  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '14px'
  },

  footer: {
    marginTop: '20px',
    paddingTop: '15px',
    borderTop: '1px solid #dee2e6'
  },

  footerText: {
    fontSize: '14px',
    color: '#6c757d',
    margin: 0,
    fontStyle: 'italic'
  }
};

export default DebugLogControls;