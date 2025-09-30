/**
 * Agent Audit Service
 * Comprehensive audit trail and compliance tracking for all agent activities
 * Provides immutable record of all agent actions for review and compliance
 */

const EventEmitter = require('events');
const winston = require('winston');
const crypto = require('crypto');

// Initialize audit logger with separate file for audit trail
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/agent-audit.log',
      maxsize: 10485760, // 10MB
      maxFiles: 100
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class AgentAuditService extends EventEmitter {
  constructor() {
    super();

    // Audit storage (in production, use immutable database)
    this.auditTrail = [];
    this.auditIndex = new Map(); // Fast lookup by various keys
    this.complianceRules = new Map();
    this.auditStats = {
      totalEntries: 0,
      byAgent: {},
      byAction: {},
      byRisk: {},
      violations: []
    };

    // Initialize compliance rules
    this.initializeComplianceRules();

    // Start periodic audit analysis
    this.startAuditAnalysis();
  }

  /**
   * Initialize compliance and audit rules
   */
  initializeComplianceRules() {
    // Security compliance rules
    this.complianceRules.set('NO_UNAUTHORIZED_ACCESS', {
      description: 'Agents must not access unauthorized resources',
      severity: 'CRITICAL',
      check: (entry) => {
        return !entry.action.includes('UNAUTHORIZED') &&
               !entry.metadata?.unauthorized;
      }
    });

    this.complianceRules.set('DATA_PRIVACY', {
      description: 'No PII in logs or public outputs',
      severity: 'HIGH',
      check: (entry) => {
        const piiPatterns = [
          /\b\d{3}-\d{2}-\d{4}\b/, // SSN
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
          /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/ // Credit card
        ];

        const content = JSON.stringify(entry);
        return !piiPatterns.some(pattern => pattern.test(content));
      }
    });

    this.complianceRules.set('CHANGE_APPROVAL', {
      description: 'Critical changes require approval',
      severity: 'HIGH',
      check: (entry) => {
        if (entry.riskLevel === 'CRITICAL' || entry.action === 'PRODUCTION_CHANGE') {
          return entry.metadata?.approved === true;
        }
        return true;
      }
    });

    this.complianceRules.set('RATE_LIMITING', {
      description: 'Agents must respect rate limits',
      severity: 'MEDIUM',
      check: (entry) => {
        if (entry.action === 'API_CALL') {
          return entry.metadata?.rateLimitRespected !== false;
        }
        return true;
      }
    });

    this.complianceRules.set('AUDIT_TRAIL_INTEGRITY', {
      description: 'All actions must be properly logged',
      severity: 'CRITICAL',
      check: (entry) => {
        return entry.hash && entry.previousHash && entry.timestamp;
      }
    });

    auditLogger.info('Compliance rules initialized', {
      ruleCount: this.complianceRules.size
    });
  }

  /**
   * Create an audit entry for an agent action
   */
  createAuditEntry({
    agentId,
    agentAlias,
    action,
    actionType,
    target,
    changes,
    metadata = {},
    riskLevel = 'LOW',
    userId = null,
    sessionId = null,
    requestId = null
  }) {
    try {
      // Get previous hash for chain integrity
      const previousHash = this.auditTrail.length > 0
        ? this.auditTrail[this.auditTrail.length - 1].hash
        : '0';

      // Create audit entry
      const entry = {
        id: `AUDIT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        timestamp: new Date().toISOString(),
        agentId,
        agentAlias,
        action,
        actionType,
        target,
        changes,
        metadata,
        riskLevel,
        userId,
        sessionId,
        requestId,
        previousHash,
        sequenceNumber: this.auditTrail.length + 1,
        environment: process.env.NODE_ENV || 'development',
        serverVersion: process.env.APP_VERSION || '1.0.0'
      };

      // Generate hash for integrity
      entry.hash = this.generateHash(entry);

      // Check compliance
      const complianceResult = this.checkCompliance(entry);
      entry.compliant = complianceResult.compliant;
      entry.violations = complianceResult.violations;

      // Store entry
      this.auditTrail.push(entry);

      // Update indexes for fast lookup
      this.updateIndexes(entry);

      // Update statistics
      this.updateStatistics(entry);

      // Log to file
      auditLogger.info('Audit entry created', entry);

      // Emit event for real-time monitoring
      this.emit('audit:created', entry);

      // Check for violations
      if (!complianceResult.compliant) {
        this.handleComplianceViolation(entry, complianceResult.violations);
      }

      return entry;

    } catch (error) {
      auditLogger.error('Failed to create audit entry', error);
      throw error;
    }
  }

  /**
   * Generate hash for audit entry integrity
   */
  generateHash(entry) {
    const content = JSON.stringify({
      timestamp: entry.timestamp,
      agentId: entry.agentId,
      action: entry.action,
      target: entry.target,
      changes: entry.changes,
      previousHash: entry.previousHash
    });

    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }

  /**
   * Check compliance rules against an entry
   */
  checkCompliance(entry) {
    const violations = [];
    let compliant = true;

    for (const [ruleName, rule] of this.complianceRules) {
      try {
        if (!rule.check(entry)) {
          compliant = false;
          violations.push({
            rule: ruleName,
            description: rule.description,
            severity: rule.severity
          });
        }
      } catch (error) {
        auditLogger.error(`Compliance check failed for rule ${ruleName}`, error);
      }
    }

    return { compliant, violations };
  }

  /**
   * Handle compliance violations
   */
  handleComplianceViolation(entry, violations) {
    // Log violation
    auditLogger.warn('Compliance violation detected', {
      entryId: entry.id,
      agentId: entry.agentId,
      violations
    });

    // Store violation
    this.auditStats.violations.push({
      entryId: entry.id,
      timestamp: entry.timestamp,
      agentId: entry.agentId,
      violations
    });

    // Emit violation event
    this.emit('compliance:violation', {
      entry,
      violations
    });

    // Take action based on severity
    const criticalViolation = violations.some(v => v.severity === 'CRITICAL');
    if (criticalViolation) {
      this.emit('compliance:critical', {
        entry,
        violations,
        action: 'IMMEDIATE_REVIEW_REQUIRED'
      });
    }
  }

  /**
   * Update indexes for fast lookup
   */
  updateIndexes(entry) {
    // Index by agent
    if (!this.auditIndex.has(`agent:${entry.agentId}`)) {
      this.auditIndex.set(`agent:${entry.agentId}`, []);
    }
    this.auditIndex.get(`agent:${entry.agentId}`).push(entry.id);

    // Index by action type
    if (!this.auditIndex.has(`action:${entry.actionType}`)) {
      this.auditIndex.set(`action:${entry.actionType}`, []);
    }
    this.auditIndex.get(`action:${entry.actionType}`).push(entry.id);

    // Index by risk level
    if (!this.auditIndex.has(`risk:${entry.riskLevel}`)) {
      this.auditIndex.set(`risk:${entry.riskLevel}`, []);
    }
    this.auditIndex.get(`risk:${entry.riskLevel}`).push(entry.id);

    // Index by date (daily buckets)
    const dateKey = entry.timestamp.split('T')[0];
    if (!this.auditIndex.has(`date:${dateKey}`)) {
      this.auditIndex.set(`date:${dateKey}`, []);
    }
    this.auditIndex.get(`date:${dateKey}`).push(entry.id);
  }

  /**
   * Update audit statistics
   */
  updateStatistics(entry) {
    this.auditStats.totalEntries++;

    // By agent
    if (!this.auditStats.byAgent[entry.agentId]) {
      this.auditStats.byAgent[entry.agentId] = 0;
    }
    this.auditStats.byAgent[entry.agentId]++;

    // By action
    if (!this.auditStats.byAction[entry.actionType]) {
      this.auditStats.byAction[entry.actionType] = 0;
    }
    this.auditStats.byAction[entry.actionType]++;

    // By risk
    if (!this.auditStats.byRisk[entry.riskLevel]) {
      this.auditStats.byRisk[entry.riskLevel] = 0;
    }
    this.auditStats.byRisk[entry.riskLevel]++;
  }

  /**
   * Query audit trail with filters
   */
  queryAuditTrail({
    agentId,
    actionType,
    riskLevel,
    startDate,
    endDate,
    target,
    compliant,
    limit = 100,
    offset = 0
  } = {}) {
    let results = [...this.auditTrail];

    // Apply filters
    if (agentId) {
      results = results.filter(e => e.agentId === agentId);
    }
    if (actionType) {
      results = results.filter(e => e.actionType === actionType);
    }
    if (riskLevel) {
      results = results.filter(e => e.riskLevel === riskLevel);
    }
    if (startDate) {
      results = results.filter(e => new Date(e.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      results = results.filter(e => new Date(e.timestamp) <= new Date(endDate));
    }
    if (target) {
      results = results.filter(e => e.target && e.target.includes(target));
    }
    if (compliant !== undefined) {
      results = results.filter(e => e.compliant === compliant);
    }

    // Sort by timestamp descending
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const total = results.length;
    results = results.slice(offset, offset + limit);

    return {
      entries: results,
      total,
      offset,
      limit
    };
  }

  /**
   * Get audit statistics
   */
  getAuditStatistics(timeRange = '24h') {
    const now = new Date();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const cutoff = new Date(now - (ranges[timeRange] || ranges['24h']));

    const recentEntries = this.auditTrail.filter(e =>
      new Date(e.timestamp) > cutoff
    );

    // Calculate statistics
    const stats = {
      timeRange,
      totalEntries: recentEntries.length,
      byAgent: {},
      byAction: {},
      byRisk: {},
      complianceRate: 0,
      violations: [],
      topAgents: [],
      riskDistribution: {},
      hourlyActivity: {}
    };

    // Aggregate data
    recentEntries.forEach(entry => {
      // By agent
      stats.byAgent[entry.agentId] = (stats.byAgent[entry.agentId] || 0) + 1;

      // By action
      stats.byAction[entry.actionType] = (stats.byAction[entry.actionType] || 0) + 1;

      // By risk
      stats.byRisk[entry.riskLevel] = (stats.byRisk[entry.riskLevel] || 0) + 1;

      // Hourly activity
      const hour = new Date(entry.timestamp).getHours();
      stats.hourlyActivity[hour] = (stats.hourlyActivity[hour] || 0) + 1;
    });

    // Calculate compliance rate
    const compliantEntries = recentEntries.filter(e => e.compliant).length;
    stats.complianceRate = recentEntries.length > 0
      ? (compliantEntries / recentEntries.length) * 100
      : 100;

    // Get recent violations
    stats.violations = this.auditStats.violations
      .filter(v => new Date(v.timestamp) > cutoff)
      .slice(0, 10);

    // Top agents by activity
    stats.topAgents = Object.entries(stats.byAgent)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([agentId, count]) => ({ agentId, count }));

    return stats;
  }

  /**
   * Verify audit trail integrity
   */
  verifyIntegrity(startIndex = 0, endIndex = null) {
    const end = endIndex || this.auditTrail.length;
    const results = {
      valid: true,
      errors: [],
      checked: 0
    };

    for (let i = startIndex; i < end; i++) {
      const entry = this.auditTrail[i];
      results.checked++;

      // Check hash
      const expectedHash = this.generateHash(entry);
      if (entry.hash !== expectedHash) {
        results.valid = false;
        results.errors.push({
          index: i,
          entryId: entry.id,
          error: 'Hash mismatch'
        });
      }

      // Check chain integrity
      if (i > 0) {
        const previousEntry = this.auditTrail[i - 1];
        if (entry.previousHash !== previousEntry.hash) {
          results.valid = false;
          results.errors.push({
            index: i,
            entryId: entry.id,
            error: 'Chain broken'
          });
        }
      }

      // Check sequence
      if (entry.sequenceNumber !== i + 1) {
        results.valid = false;
        results.errors.push({
          index: i,
          entryId: entry.id,
          error: 'Sequence mismatch'
        });
      }
    }

    if (!results.valid) {
      auditLogger.error('Audit trail integrity check failed', results);
      this.emit('integrity:failed', results);
    }

    return results;
  }

  /**
   * Export audit trail for compliance reporting
   */
  exportAuditTrail(format = 'json', filters = {}) {
    const { entries } = this.queryAuditTrail(filters);

    switch (format) {
      case 'json':
        return JSON.stringify(entries, null, 2);

      case 'csv':
        const headers = ['ID', 'Timestamp', 'Agent', 'Action', 'Target', 'Risk', 'Compliant'];
        const rows = entries.map(e => [
          e.id,
          e.timestamp,
          e.agentAlias || e.agentId,
          e.action,
          e.target || '',
          e.riskLevel,
          e.compliant ? 'Yes' : 'No'
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');

      case 'report':
        return this.generateComplianceReport(entries);

      default:
        return entries;
    }
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(entries) {
    const report = {
      generated: new Date().toISOString(),
      period: {
        start: entries[entries.length - 1]?.timestamp || null,
        end: entries[0]?.timestamp || null
      },
      summary: {
        totalActions: entries.length,
        compliantActions: entries.filter(e => e.compliant).length,
        violations: entries.filter(e => !e.compliant).length,
        complianceRate: 0
      },
      riskAnalysis: {},
      agentActivity: {},
      violations: [],
      recommendations: []
    };

    // Calculate compliance rate
    if (entries.length > 0) {
      report.summary.complianceRate =
        (report.summary.compliantActions / entries.length) * 100;
    }

    // Analyze by risk level
    entries.forEach(entry => {
      if (!report.riskAnalysis[entry.riskLevel]) {
        report.riskAnalysis[entry.riskLevel] = {
          count: 0,
          compliant: 0,
          violations: 0
        };
      }
      report.riskAnalysis[entry.riskLevel].count++;
      if (entry.compliant) {
        report.riskAnalysis[entry.riskLevel].compliant++;
      } else {
        report.riskAnalysis[entry.riskLevel].violations++;
      }
    });

    // Analyze by agent
    entries.forEach(entry => {
      if (!report.agentActivity[entry.agentId]) {
        report.agentActivity[entry.agentId] = {
          alias: entry.agentAlias,
          actions: 0,
          violations: 0,
          riskProfile: {}
        };
      }
      report.agentActivity[entry.agentId].actions++;
      if (!entry.compliant) {
        report.agentActivity[entry.agentId].violations++;
      }
      report.agentActivity[entry.agentId].riskProfile[entry.riskLevel] =
        (report.agentActivity[entry.agentId].riskProfile[entry.riskLevel] || 0) + 1;
    });

    // Collect violations
    report.violations = entries
      .filter(e => !e.compliant)
      .map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        agent: e.agentAlias || e.agentId,
        action: e.action,
        violations: e.violations
      }));

    // Generate recommendations
    if (report.summary.complianceRate < 90) {
      report.recommendations.push('Review and update compliance rules training for agents');
    }
    if (report.riskAnalysis.CRITICAL?.violations > 0) {
      report.recommendations.push('Implement additional approval requirements for critical actions');
    }
    if (report.violations.length > 10) {
      report.recommendations.push('Increase monitoring frequency for compliance violations');
    }

    return report;
  }

  /**
   * Archive old audit entries
   */
  async archiveOldEntries(daysToKeep = 90) {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const toArchive = this.auditTrail.filter(e => new Date(e.timestamp) < cutoff);

    if (toArchive.length === 0) {
      return { archived: 0 };
    }

    try {
      // In production, save to cold storage
      // await saveToArchive(toArchive);

      // Remove from active trail
      this.auditTrail = this.auditTrail.filter(e => new Date(e.timestamp) >= cutoff);

      // Rebuild indexes
      this.rebuildIndexes();

      auditLogger.info(`Archived ${toArchive.length} audit entries`);

      return {
        archived: toArchive.length,
        remaining: this.auditTrail.length
      };

    } catch (error) {
      auditLogger.error('Failed to archive audit entries', error);
      throw error;
    }
  }

  /**
   * Rebuild indexes after archive
   */
  rebuildIndexes() {
    this.auditIndex.clear();
    this.auditTrail.forEach(entry => this.updateIndexes(entry));
  }

  /**
   * Start periodic audit analysis
   */
  startAuditAnalysis() {
    // Integrity check every hour
    setInterval(() => {
      const result = this.verifyIntegrity();
      if (!result.valid) {
        this.emit('integrity:alert', result);
      }
    }, 60 * 60 * 1000);

    // Archive old entries daily
    setInterval(() => {
      this.archiveOldEntries();
    }, 24 * 60 * 60 * 1000);

    auditLogger.info('Audit analysis started');
  }

  /**
   * Get agent audit summary
   */
  getAgentAuditSummary(agentId, timeRange = '24h') {
    const stats = this.getAuditStatistics(timeRange);

    return {
      agentId,
      timeRange,
      totalActions: stats.byAgent[agentId] || 0,
      actionBreakdown: this.getAgentActionBreakdown(agentId, timeRange),
      complianceScore: this.calculateAgentComplianceScore(agentId, timeRange),
      riskProfile: this.getAgentRiskProfile(agentId, timeRange),
      recentViolations: stats.violations.filter(v => v.agentId === agentId)
    };
  }

  /**
   * Get agent action breakdown
   */
  getAgentActionBreakdown(agentId, timeRange) {
    const { entries } = this.queryAuditTrail({ agentId });
    const breakdown = {};

    entries.forEach(entry => {
      breakdown[entry.actionType] = (breakdown[entry.actionType] || 0) + 1;
    });

    return breakdown;
  }

  /**
   * Calculate agent compliance score
   */
  calculateAgentComplianceScore(agentId, timeRange) {
    const { entries } = this.queryAuditTrail({ agentId });

    if (entries.length === 0) return 100;

    const compliant = entries.filter(e => e.compliant).length;
    return (compliant / entries.length) * 100;
  }

  /**
   * Get agent risk profile
   */
  getAgentRiskProfile(agentId, timeRange) {
    const { entries } = this.queryAuditTrail({ agentId });
    const profile = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    entries.forEach(entry => {
      profile[entry.riskLevel] = (profile[entry.riskLevel] || 0) + 1;
    });

    return profile;
  }
}

// Create singleton instance
const agentAuditService = new AgentAuditService();

module.exports = agentAuditService;