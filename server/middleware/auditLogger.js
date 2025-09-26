// Audit logging middleware for security and compliance
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure audit logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure audit logger
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.json()
  ),
  transports: [
    // Write all audit logs to file
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 30, // Keep 30 days of logs
      tailable: true
    }),
    // Write security events to separate file
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'warn',
      maxsize: 10485760,
      maxFiles: 30,
      tailable: true
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  auditLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Event types for standardized logging
const EventTypes = {
  // Authentication events
  LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  LOGIN_FAILURE: 'AUTH_LOGIN_FAILURE',
  LOGOUT: 'AUTH_LOGOUT',
  TOKEN_REFRESH: 'AUTH_TOKEN_REFRESH',
  UNAUTHORIZED_ACCESS: 'AUTH_UNAUTHORIZED',

  // Data access events
  DATA_ACCESS: 'DATA_ACCESS',
  DATA_CREATE: 'DATA_CREATE',
  DATA_UPDATE: 'DATA_UPDATE',
  DATA_DELETE: 'DATA_DELETE',

  // API events
  API_ACCESS: 'API_ACCESS',
  API_ERROR: 'API_ERROR',
  RATE_LIMIT_EXCEEDED: 'API_RATE_LIMIT',

  // Security events
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  INVALID_INPUT: 'SECURITY_INVALID_INPUT',
  SQL_INJECTION_ATTEMPT: 'SECURITY_SQL_INJECTION',
  XSS_ATTEMPT: 'SECURITY_XSS',

  // Shopping/Commerce events
  CART_CREATED: 'COMMERCE_CART_CREATED',
  CART_UPDATED: 'COMMERCE_CART_UPDATED',
  CHECKOUT_INITIATED: 'COMMERCE_CHECKOUT_INITIATED',
  PRICE_CHECKED: 'COMMERCE_PRICE_CHECKED',

  // Admin events
  ADMIN_ACCESS: 'ADMIN_ACCESS',
  CONFIG_CHANGED: 'ADMIN_CONFIG_CHANGED',
  CACHE_CLEARED: 'ADMIN_CACHE_CLEARED'
};

// Audit logging middleware
const auditMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Capture original send function
  const originalSend = res.send;
  const originalJson = res.json;

  // Override response methods to capture response data
  res.json = function(data) {
    res.auditData = data;
    return originalJson.apply(res, arguments);
  };

  res.send = function(data) {
    res.auditData = data;
    return originalSend.apply(res, arguments);
  };

  // Log request
  const requestLog = {
    eventType: EventTypes.API_ACCESS,
    timestamp: new Date().toISOString(),
    request: {
      method: req.method,
      path: req.path,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.uid || req.headers['user-id'] || 'anonymous',
      sessionId: req.sessionID || req.headers['x-session-id']
    }
  };

  // Don't log sensitive paths in detail
  const sensitivePaths = ['/api/auth/login', '/api/auth/register', '/api/payment'];
  const isSensitive = sensitivePaths.some(path => req.path.includes(path));

  if (!isSensitive && req.method !== 'GET') {
    requestLog.request.body = req.body;
  }

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    const responseLog = {
      ...requestLog,
      response: {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        success: res.statusCode < 400
      }
    };

    // Determine log level based on response
    let logLevel = 'info';
    let eventType = EventTypes.API_ACCESS;

    if (res.statusCode >= 500) {
      logLevel = 'error';
      eventType = EventTypes.API_ERROR;
    } else if (res.statusCode === 401) {
      logLevel = 'warn';
      eventType = EventTypes.UNAUTHORIZED_ACCESS;
    } else if (res.statusCode === 429) {
      logLevel = 'warn';
      eventType = EventTypes.RATE_LIMIT_EXCEEDED;
    } else if (res.statusCode >= 400) {
      logLevel = 'warn';
    }

    responseLog.eventType = eventType;

    // Add response data for errors
    if (res.statusCode >= 400 && res.auditData) {
      responseLog.response.error = res.auditData.error || res.auditData.message;
    }

    auditLogger.log(logLevel, responseLog);
  });

  next();
};

// Helper functions for specific audit events
const auditLog = {
  // Log successful login
  loginSuccess: (userId, method, ip) => {
    auditLogger.info({
      eventType: EventTypes.LOGIN_SUCCESS,
      timestamp: new Date().toISOString(),
      userId,
      method,
      ip,
      message: `User ${userId} logged in successfully via ${method}`
    });
  },

  // Log failed login
  loginFailure: (identifier, reason, ip) => {
    auditLogger.warn({
      eventType: EventTypes.LOGIN_FAILURE,
      timestamp: new Date().toISOString(),
      identifier,
      reason,
      ip,
      message: `Failed login attempt for ${identifier}: ${reason}`
    });
  },

  // Log data access
  dataAccess: (userId, resource, action, details = {}) => {
    auditLogger.info({
      eventType: `DATA_${action.toUpperCase()}`,
      timestamp: new Date().toISOString(),
      userId,
      resource,
      action,
      details,
      message: `User ${userId} performed ${action} on ${resource}`
    });
  },

  // Log security violations
  securityViolation: (type, userId, details, ip) => {
    auditLogger.error({
      eventType: EventTypes.SECURITY_VIOLATION,
      timestamp: new Date().toISOString(),
      violationType: type,
      userId,
      ip,
      details,
      message: `Security violation detected: ${type}`
    });
  },

  // Log cart operations
  cartOperation: (userId, operation, cartId, items, total) => {
    auditLogger.info({
      eventType: `COMMERCE_CART_${operation.toUpperCase()}`,
      timestamp: new Date().toISOString(),
      userId,
      cartId,
      itemCount: items,
      total,
      message: `Cart ${operation} by user ${userId}`
    });
  },

  // Log price checks
  priceCheck: (userId, items, retailer) => {
    auditLogger.info({
      eventType: EventTypes.PRICE_CHECKED,
      timestamp: new Date().toISOString(),
      userId,
      itemCount: items.length,
      retailer,
      message: `Price check performed for ${items.length} items`
    });
  },

  // Log admin actions
  adminAction: (adminId, action, target, details) => {
    auditLogger.warn({
      eventType: EventTypes.ADMIN_ACCESS,
      timestamp: new Date().toISOString(),
      adminId,
      action,
      target,
      details,
      message: `Admin ${adminId} performed ${action} on ${target}`
    });
  }
};

// Audit report generator
const generateAuditReport = async (startDate, endDate) => {
  const report = {
    period: {
      start: startDate,
      end: endDate
    },
    summary: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      securityViolations: 0,
      uniqueUsers: new Set(),
      topEndpoints: {},
      errorTypes: {}
    },
    details: []
  };

  // Read audit log file
  const logPath = path.join(logsDir, 'audit.log');
  if (fs.existsSync(logPath)) {
    const logs = fs.readFileSync(logPath, 'utf-8')
      .split('\n')
      .filter(line => line)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(log => log);

    // Filter logs by date range
    const filteredLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });

    // Generate summary
    filteredLogs.forEach(log => {
      report.summary.totalRequests++;

      if (log.response?.success) {
        report.summary.successfulRequests++;
      } else {
        report.summary.failedRequests++;
      }

      if (log.eventType?.includes('SECURITY')) {
        report.summary.securityViolations++;
      }

      if (log.request?.userId) {
        report.summary.uniqueUsers.add(log.request.userId);
      }

      // Track endpoint usage
      const endpoint = log.request?.path;
      if (endpoint) {
        report.summary.topEndpoints[endpoint] =
          (report.summary.topEndpoints[endpoint] || 0) + 1;
      }

      // Track error types
      if (log.response?.error) {
        report.summary.errorTypes[log.response.error] =
          (report.summary.errorTypes[log.response.error] || 0) + 1;
      }
    });

    // Convert Set to count
    report.summary.uniqueUsers = report.summary.uniqueUsers.size;

    // Sort top endpoints
    report.summary.topEndpoints = Object.entries(report.summary.topEndpoints)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});
  }

  return report;
};

module.exports = {
  auditLogger,
  auditMiddleware,
  auditLog,
  EventTypes,
  generateAuditReport
};