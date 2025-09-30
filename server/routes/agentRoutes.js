/**
 * Agent Routes
 * API endpoints for agent operations, work journal, chat, and audit
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const AgentWorkEntry = require('../models/AgentWorkEntry');
const AgentMessage = require('../models/AgentMessage');
const agentAuditService = require('../services/agentAuditService');
const agentCommunicationHub = require('../services/agentCommunicationHub');
const agentTaskQueue = require('../services/agentTaskQueue');
const { authenticateUser } = require('../middleware/auth');
const { checkAdmin: isAdmin } = require('../middleware/adminAuth');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// ===== CORS HANDLING =====

/**
 * Handle OPTIONS requests for CORS preflight
 */
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// ===== HEALTH CHECK ENDPOINT =====

/**
 * GET /api/agent/health
 * Health check endpoint to verify agent routes are loaded
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    routes: 'loaded',
    timestamp: new Date().toISOString(),
    services: {
      chat: 'available',
      workReview: 'available',
      audit: 'available',
      monitoring: 'available',
      taskQueue: 'available'
    }
  });
});

// ===== CHAT ENDPOINTS =====

/**
 * POST /api/agent/chat/message
 * Send a chat message
 */
router.post('/chat/message',
  authenticateUser,
  [
    body('from').notEmpty().withMessage('Sender is required'),
    body('to').notEmpty().withMessage('Recipient is required'),
    body('content.text').notEmpty().withMessage('Message content is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const messageData = {
        messageId: `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...req.body,
        source: 'api'
      };

      const message = new AgentMessage(messageData);
      await message.save();

      // Send via communication hub if agents are online
      if (req.body.to.type === 'direct') {
        agentCommunicationHub.sendMessage(
          req.body.from.agentId,
          req.body.to.agentId,
          req.body.content.text
        );
      } else if (req.body.to.type === 'channel') {
        agentCommunicationHub.sendToChannel(
          req.body.from.agentId,
          req.body.to.channel,
          req.body.content.text
        );
      }

      // Log audit event
      agentAuditService.createAuditEntry({
        agentId: req.body.from.agentId,
        agentAlias: req.body.from.agentAlias,
        action: 'CHAT_MESSAGE_SENT',
        actionType: 'COMMUNICATION',
        target: req.body.to.agentId || req.body.to.channel,
        metadata: { messageId: message.messageId },
        riskLevel: 'LOW',
        userId: req.user?.uid
      });

      res.json({
        success: true,
        messageId: message.messageId,
        message
      });
    } catch (error) {
      logger.error('Chat message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send message'
      });
    }
  }
);

/**
 * GET /api/agent/chat/history
 * Get chat history
 */
router.get('/chat/history',
  authenticateUser,
  async (req, res) => {
    try {
      const { agentId, channel, type, limit = 50, since } = req.query;

      let messages;

      if (channel) {
        messages = await AgentMessage.findChannelMessages(channel, {
          limit: parseInt(limit),
          since: since ? new Date(since) : null
        });
      } else if (agentId && req.query.withAgent) {
        messages = await AgentMessage.findConversation(
          agentId,
          req.query.withAgent,
          parseInt(limit)
        );
      } else if (agentId) {
        messages = await AgentMessage.find({
          $or: [
            { 'from.agentId': agentId },
            { 'to.agentId': agentId }
          ],
          deleted: false
        })
          .sort('-createdAt')
          .limit(parseInt(limit));
      } else {
        messages = await AgentMessage.find({ deleted: false })
          .sort('-createdAt')
          .limit(parseInt(limit));
      }

      res.json({
        success: true,
        messages,
        count: messages.length
      });
    } catch (error) {
      logger.error('Chat history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch chat history'
      });
    }
  }
);

/**
 * GET /api/agent/chat/unread
 * Get unread messages for an agent
 */
router.get('/chat/unread/:agentId',
  authenticateUser,
  async (req, res) => {
    try {
      const messages = await AgentMessage.findUnreadMessages(req.params.agentId);

      res.json({
        success: true,
        messages,
        count: messages.length
      });
    } catch (error) {
      logger.error('Unread messages error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch unread messages'
      });
    }
  }
);

// ===== WORK JOURNAL ENDPOINTS =====

/**
 * GET /api/agent/work/journal
 * Get work journal entries
 */
router.get('/work/journal',
  authenticateUser,
  async (req, res) => {
    try {
      const {
        agentId,
        actionType,
        status,
        priority,
        startDate,
        endDate,
        limit = 50,
        offset = 0
      } = req.query;

      const query = {};

      if (agentId) query.agentId = agentId;
      if (actionType) query.actionType = actionType;
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const entries = await AgentWorkEntry
        .find(query)
        .sort('-createdAt')
        .skip(parseInt(offset))
        .limit(parseInt(limit));

      const total = await AgentWorkEntry.countDocuments(query);

      res.json({
        success: true,
        entries,
        total,
        offset: parseInt(offset),
        limit: parseInt(limit)
      });
    } catch (error) {
      logger.error('Work journal error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch work journal'
      });
    }
  }
);

/**
 * POST /api/agent/work/entry
 * Create a new work journal entry
 */
router.post('/work/entry',
  authenticateUser,
  [
    body('agentId').notEmpty().withMessage('Agent ID is required'),
    body('actionType').notEmpty().withMessage('Action type is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('reasoning').notEmpty().withMessage('Reasoning is required'),
    body('impact.level').notEmpty().withMessage('Impact level is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const workData = {
        workId: `WORK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...req.body,
        createdBy: req.user?.uid
      };

      const workEntry = new AgentWorkEntry(workData);
      await workEntry.save();

      // Log audit event
      agentAuditService.createAuditEntry({
        agentId: req.body.agentId,
        agentAlias: req.body.agentAlias,
        action: 'WORK_ENTRY_CREATED',
        actionType: req.body.actionType,
        target: workEntry.workId,
        changes: req.body.changes,
        metadata: {
          title: req.body.title,
          impact: req.body.impact.level
        },
        riskLevel: req.body.impact.level,
        userId: req.user?.uid
      });

      res.json({
        success: true,
        workId: workEntry.workId,
        entry: workEntry
      });
    } catch (error) {
      logger.error('Work entry creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create work entry'
      });
    }
  }
);

/**
 * POST /api/agent/work/review
 * Submit a work review
 */
router.post('/work/review',
  authenticateUser,
  isAdmin,
  [
    body('workId').notEmpty().withMessage('Work ID is required'),
    body('approvalStatus').isIn(['APPROVED', 'REJECTED']).withMessage('Invalid approval status'),
    body('reviewComment').notEmpty().withMessage('Review comment is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const workEntry = await AgentWorkEntry.findOne({ workId: req.body.workId });
      if (!workEntry) {
        return res.status(404).json({
          success: false,
          error: 'Work entry not found'
        });
      }

      workEntry.approvalStatus = req.body.approvalStatus;
      workEntry.reviewedBy = req.user?.email || req.user?.uid;
      workEntry.reviewedAt = new Date();
      workEntry.reviewComment = req.body.reviewComment;

      await workEntry.save();

      // Log audit event
      agentAuditService.createAuditEntry({
        agentId: workEntry.agentId,
        agentAlias: workEntry.agentAlias,
        action: 'WORK_REVIEWED',
        actionType: 'REVIEW',
        target: workEntry.workId,
        metadata: {
          approvalStatus: req.body.approvalStatus,
          reviewer: req.user?.email
        },
        riskLevel: 'MEDIUM',
        userId: req.user?.uid
      });

      res.json({
        success: true,
        workId: workEntry.workId,
        approvalStatus: workEntry.approvalStatus
      });
    } catch (error) {
      logger.error('Work review error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit review'
      });
    }
  }
);

/**
 * GET /api/agent/work/pending-reviews
 * Get pending work reviews
 */
router.get('/work/pending-reviews',
  authenticateUser,
  isAdmin,
  async (req, res) => {
    try {
      const pendingReviews = await AgentWorkEntry.findPendingReviews();

      res.json({
        success: true,
        reviews: pendingReviews,
        count: pendingReviews.length
      });
    } catch (error) {
      logger.error('Pending reviews error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending reviews'
      });
    }
  }
);

// ===== AUDIT ENDPOINTS =====

/**
 * GET /api/agent/audit/trail
 * Get audit trail
 */
router.get('/audit/trail',
  authenticateUser,
  isAdmin,
  async (req, res) => {
    try {
      const {
        agentId,
        actionType,
        riskLevel,
        startDate,
        endDate,
        compliant,
        limit = 100,
        offset = 0
      } = req.query;

      const result = agentAuditService.queryAuditTrail({
        agentId,
        actionType,
        riskLevel,
        startDate,
        endDate,
        compliant: compliant === 'true' ? true : compliant === 'false' ? false : undefined,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Audit trail error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audit trail'
      });
    }
  }
);

/**
 * POST /api/agent/audit/export
 * Export audit report
 */
router.post('/audit/export',
  authenticateUser,
  isAdmin,
  [
    body('format').isIn(['json', 'csv', 'report']).withMessage('Invalid format')
  ],
  async (req, res) => {
    try {
      const { format = 'json', ...filters } = req.body;

      const exportData = agentAuditService.exportAuditTrail(format, filters);

      const contentType = format === 'csv' ? 'text/csv' :
                         format === 'report' ? 'application/pdf' :
                         'application/json';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=audit-trail-${Date.now()}.${format}`);

      res.send(exportData);
    } catch (error) {
      logger.error('Audit export error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export audit trail'
      });
    }
  }
);

/**
 * GET /api/agent/audit/statistics
 * Get audit statistics
 */
router.get('/audit/statistics',
  authenticateUser,
  isAdmin,
  async (req, res) => {
    try {
      const { timeRange = '24h' } = req.query;
      const statistics = agentAuditService.getAuditStatistics(timeRange);

      res.json({
        success: true,
        statistics
      });
    } catch (error) {
      logger.error('Audit statistics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audit statistics'
      });
    }
  }
);

/**
 * POST /api/agent/audit/verify
 * Verify audit trail integrity
 */
router.post('/audit/verify',
  authenticateUser,
  isAdmin,
  async (req, res) => {
    try {
      const { startIndex = 0, endIndex } = req.body;

      const result = agentAuditService.verifyIntegrity(
        parseInt(startIndex),
        endIndex ? parseInt(endIndex) : null
      );

      res.json({
        success: true,
        integrity: result
      });
    } catch (error) {
      logger.error('Audit verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify audit trail'
      });
    }
  }
);

// ===== TASK QUEUE ENDPOINTS =====

/**
 * POST /api/agent/task/create
 * Create a new task
 */
router.post('/task/create',
  authenticateUser,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('type').notEmpty().withMessage('Type is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const task = agentTaskQueue.createTask({
        ...req.body,
        createdBy: req.user?.uid
      });

      res.json({
        success: true,
        task
      });
    } catch (error) {
      logger.error('Task creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create task'
      });
    }
  }
);

/**
 * GET /api/agent/task/queue
 * Get task queue status
 */
router.get('/task/queue',
  authenticateUser,
  async (req, res) => {
    try {
      const overview = agentTaskQueue.getSystemOverview();

      res.json({
        success: true,
        overview
      });
    } catch (error) {
      logger.error('Task queue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch task queue'
      });
    }
  }
);

// ===== AGENT MANAGEMENT ENDPOINTS =====

/**
 * GET /api/agent/status/:agentId
 * Get agent status
 */
router.get('/status/:agentId',
  authenticateUser,
  async (req, res) => {
    try {
      const workload = agentTaskQueue.getAgentWorkload(req.params.agentId);
      const auditSummary = agentAuditService.getAgentAuditSummary(req.params.agentId);
      const messages = agentCommunicationHub.getMessages(req.params.agentId, 10);

      res.json({
        success: true,
        agentId: req.params.agentId,
        workload,
        auditSummary,
        recentMessages: messages
      });
    } catch (error) {
      logger.error('Agent status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch agent status'
      });
    }
  }
);

/**
 * POST /api/agent/trigger
 * Trigger an agent manually
 */
router.post('/trigger',
  authenticateUser,
  isAdmin,
  [
    body('agentId').notEmpty().withMessage('Agent ID is required'),
    body('task').notEmpty().withMessage('Task is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const task = agentTaskQueue.createTask({
        title: `Manual trigger: ${req.body.task}`,
        description: req.body.description || 'Manually triggered task',
        type: 'MANUAL',
        assignedTo: req.body.agentId,
        priority: req.body.priority || 'MEDIUM',
        metadata: {
          triggeredBy: req.user?.email,
          params: req.body.params
        }
      });

      // Log audit event
      agentAuditService.createAuditEntry({
        agentId: req.body.agentId,
        action: 'AGENT_TRIGGERED',
        actionType: 'MANAGEMENT',
        target: task.id,
        metadata: {
          task: req.body.task,
          triggeredBy: req.user?.email
        },
        riskLevel: 'MEDIUM',
        userId: req.user?.uid
      });

      res.json({
        success: true,
        taskId: task.id,
        message: `Agent ${req.body.agentId} triggered successfully`
      });
    } catch (error) {
      logger.error('Agent trigger error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger agent'
      });
    }
  }
);

/**
 * POST /api/agent/pause/:agentId
 * Pause a specific agent
 */
router.post('/pause/:agentId',
  authenticateUser,
  isAdmin,
  async (req, res) => {
    try {
      const { agentId } = req.params;

      // Check if agentTaskQueue is available
      if (!agentTaskQueue || typeof agentTaskQueue.pauseAgent !== 'function') {
        return res.status(503).json({
          error: 'Agent task queue service is not available',
          message: 'The agent management service is currently unavailable. Please try again later.'
        });
      }

      const result = agentTaskQueue.pauseAgent(agentId);

      // Log audit event
      agentAuditService.createAuditEntry({
        agentId: 'system',
        agentAlias: 'Admin',
        action: 'AGENT_PAUSED',
        actionType: 'CONTROL',
        target: agentId,
        userId: req.user?.uid,
        metadata: { agentId, initiatedBy: req.user?.email },
        severity: 'INFO',
        impact: 'MEDIUM'
      });

      res.json(result);
    } catch (error) {
      logger.error('Error pausing agent:', error);
      res.status(500).json({ error: 'Failed to pause agent' });
    }
  }
);

/**
 * POST /api/agent/pause-all
 * Pause all agents
 */
router.post('/pause-all',
  authenticateUser,
  isAdmin,
  async (req, res) => {
    try {
      // Check if agentTaskQueue is available
      if (!agentTaskQueue || typeof agentTaskQueue.pauseAllAgents !== 'function') {
        return res.status(503).json({
          error: 'Agent task queue service is not available',
          message: 'The agent management service is currently unavailable. Please try again later.'
        });
      }

      const results = agentTaskQueue.pauseAllAgents();

      // Log audit event
      agentAuditService.createAuditEntry({
        agentId: 'system',
        agentAlias: 'Admin',
        action: 'ALL_AGENTS_PAUSED',
        actionType: 'CONTROL',
        target: 'all-agents',
        userId: req.user?.uid,
        metadata: {
          pausedCount: results.filter(r => r.success).length,
          initiatedBy: req.user?.email
        },
        severity: 'WARNING',
        impact: 'HIGH'
      });

      res.json({
        success: true,
        results,
        message: `${results.filter(r => r.success).length} agents paused`
      });
    } catch (error) {
      logger.error('Error pausing all agents:', error);
      res.status(500).json({ error: 'Failed to pause agents' });
    }
  }
);

/**
 * POST /api/agent/resume/:agentId
 * Resume a specific agent
 */
router.post('/resume/:agentId',
  authenticateUser,
  isAdmin,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const result = agentTaskQueue.resumeAgent(agentId);

      // Log audit event
      agentAuditService.createAuditEntry({
        agentId: 'system',
        agentAlias: 'Admin',
        action: 'AGENT_RESUMED',
        actionType: 'CONTROL',
        target: agentId,
        userId: req.user?.uid,
        metadata: {
          agentId,
          pauseDuration: result.pauseDuration,
          initiatedBy: req.user?.email
        },
        severity: 'INFO',
        impact: 'MEDIUM'
      });

      res.json(result);
    } catch (error) {
      logger.error('Error resuming agent:', error);
      res.status(500).json({ error: 'Failed to resume agent' });
    }
  }
);

/**
 * POST /api/agent/resume-all
 * Resume all paused agents
 */
router.post('/resume-all',
  authenticateUser,
  isAdmin,
  async (req, res) => {
    try {
      const results = agentTaskQueue.resumeAllAgents();

      // Log audit event
      agentAuditService.createAuditEntry({
        agentId: 'system',
        agentAlias: 'Admin',
        action: 'ALL_AGENTS_RESUMED',
        actionType: 'CONTROL',
        target: 'all-agents',
        userId: req.user?.uid,
        metadata: {
          resumedCount: results.filter(r => r.success).length,
          initiatedBy: req.user?.email
        },
        severity: 'INFO',
        impact: 'HIGH'
      });

      res.json({
        success: true,
        results,
        message: `${results.filter(r => r.success).length} agents resumed`
      });
    } catch (error) {
      logger.error('Error resuming all agents:', error);
      res.status(500).json({ error: 'Failed to resume agents' });
    }
  }
);

/**
 * GET /api/agent/pause-status
 * Get pause status of all agents
 */
router.get('/pause-status',
  authenticateUser,
  isAdmin,
  async (req, res) => {
    try {
      // Check if agentTaskQueue is available
      if (!agentTaskQueue || typeof agentTaskQueue.getPauseStatus !== 'function') {
        return res.json({
          totalPaused: 0,
          agents: {},
          costSummary: {
            totalSystemCost: 0,
            totalSystemTokens: 0,
            topSpender: null
          },
          error: 'Agent service temporarily unavailable'
        });
      }

      const status = agentTaskQueue.getPauseStatus();
      res.json(status);
    } catch (error) {
      logger.error('Error getting pause status:', error);
      res.status(500).json({ error: 'Failed to get pause status' });
    }
  }
);

/**
 * GET /api/agent/cost-summary
 * Get cost summary for all agents
 */
router.get('/cost-summary',
  authenticateUser,
  isAdmin,
  async (req, res) => {
    try {
      const costSummary = agentTaskQueue.getAgentCostSummary();
      res.json(costSummary);
    } catch (error) {
      logger.error('Error getting cost summary:', error);
      res.status(500).json({ error: 'Failed to get cost summary' });
    }
  }
);

/**
 * POST /api/agent/trigger-all
 * Trigger all agents simultaneously
 */
router.post('/trigger-all',
  authenticateUser,
  isAdmin,
  async (req, res) => {
    try {
      const { initiator, reason } = req.body;

      // Define all available agents
      const agents = [
        { id: 'dashboard-improvement-agent', alias: 'Dash', speciality: 'UI/UX' },
        { id: 'security-auditor', alias: 'SecOps', speciality: 'Security' },
        { id: 'performance-optimizer', alias: 'Speedy', speciality: 'Performance' },
        { id: 'api-integration-specialist', alias: 'API Master', speciality: 'Integration' },
        { id: 'chief-ai-officer', alias: 'CAO', speciality: 'Strategy' },
        { id: 'error-monitor', alias: 'Watchdog', speciality: 'Monitoring' },
        { id: 'development-manager', alias: 'DevLead', speciality: 'Coordination' }
      ];

      const results = [];
      const timestamp = new Date().toISOString();

      // Trigger each agent
      for (const agent of agents) {
        try {
          const task = agentTaskQueue.createTask({
            title: 'System-wide trigger',
            description: reason || 'All agents triggered for system-wide operation',
            type: 'SYSTEM',
            assignedTo: agent.id,
            priority: 'HIGH',
            metadata: {
              triggeredBy: initiator || req.user?.email,
              triggerType: 'ALL_AGENTS',
              timestamp
            }
          });

          results.push({
            agentId: agent.id,
            agentAlias: agent.alias,
            speciality: agent.speciality,
            status: 'triggered',
            taskId: task.id,
            timestamp
          });

          // Log audit event for each agent
          agentAuditService.createAuditEntry({
            agentId: agent.id,
            agentAlias: agent.alias,
            action: 'AGENT_TRIGGERED_BULK',
            actionType: 'MANAGEMENT',
            target: task.id,
            metadata: {
              triggerType: 'ALL_AGENTS',
              initiator: initiator || req.user?.email,
              reason
            },
            riskLevel: 'HIGH',
            userId: req.user?.uid
          });
        } catch (error) {
          logger.error(`Failed to trigger agent ${agent.id}:`, error);
          results.push({
            agentId: agent.id,
            agentAlias: agent.alias,
            status: 'failed',
            error: error.message,
            timestamp
          });
        }
      }

      const successCount = results.filter(r => r.status === 'triggered').length;
      const failedCount = results.filter(r => r.status === 'failed').length;

      logger.info(`All agents trigger initiated by ${initiator}: ${successCount} succeeded, ${failedCount} failed`);

      res.json({
        success: true,
        message: `Triggered ${successCount} of ${agents.length} agents`,
        triggeredCount: successCount,
        failedCount,
        results,
        initiator: initiator || req.user?.email,
        timestamp
      });
    } catch (error) {
      logger.error('Trigger all agents error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger all agents',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/agent/chat
 * Simple chat endpoint for AgentChatInterface
 */
router.post('/chat',
  async (req, res) => {
    try {
      const { channel, message, mentions } = req.body;
      const userId = req.user?.uid || 'admin';

      // Initialize chat storage if needed
      if (!global.chatMessages) {
        global.chatMessages = {};
      }
      if (!global.chatMessages[channel]) {
        global.chatMessages[channel] = [];
      }

      // Create and store the user message
      const userMessage = {
        id: `msg-${Date.now()}`,
        channel,
        sender: 'admin',
        senderAlias: req.user?.displayName || 'Admin',
        avatar: '👤',
        content: message,
        timestamp: new Date().toISOString(),
        type: 'message',
        mentions
      };

      global.chatMessages[channel].push(userMessage);

      // Generate agent responses for mentions
      const agentResponses = [];
      if (mentions && mentions.length > 0) {
        for (const agentName of mentions) {
          const agentId = getAgentIdFromName(agentName);
          if (agentId) {
            const agentResponse = {
              id: `msg-${Date.now() + Math.random() * 1000}`,
              channel,
              sender: agentId,
              senderAlias: agentName,
              avatar: getAgentAvatar(agentId),
              content: generateAgentResponse(agentId, message),
              timestamp: new Date(Date.now() + 1500).toISOString(),
              type: 'message'
            };

            // Schedule agent response
            setTimeout(() => {
              global.chatMessages[channel].push(agentResponse);
              // Emit via WebSocket if available
              if (global.io) {
                global.io.to(channel).emit('new-message', agentResponse);
              }
            }, 1500 + Math.random() * 1000);

            agentResponses.push(agentResponse);
          }
        }
      }

      res.json({
        success: true,
        message: userMessage,
        pendingResponses: agentResponses.length
      });
    } catch (error) {
      logger.error('Chat message error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/agent/chat/history/:channel
 * Get chat history for a specific channel
 */
router.get('/chat/history/:channel',
  async (req, res) => {
    try {
      const { channel } = req.params;
      const { limit = 50 } = req.query;

      // Initialize if needed
      if (!global.chatMessages) {
        global.chatMessages = {};
      }

      const messages = global.chatMessages[channel] || [];
      const limitedMessages = messages.slice(-parseInt(limit));

      res.json({
        success: true,
        channel,
        messages: limitedMessages,
        total: messages.length
      });
    } catch (error) {
      logger.error('Chat history error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/agent/work-journal
 * Simple work journal endpoint for AgentWorkJournal component
 */
router.get('/work-journal',
  async (req, res) => {
    try {
      const { agentId, limit = 50, timeRange = '24h' } = req.query;

      // Initialize work journal if needed
      if (!global.workJournal) {
        global.workJournal = [];
      }

      let entries = [...global.workJournal];

      // Filter by agent if specified
      if (agentId && agentId !== 'all') {
        entries = entries.filter(e => e.agentId === agentId);
      }

      // Apply time range filter
      const now = Date.now();
      const ranges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };

      if (ranges[timeRange]) {
        const cutoff = now - ranges[timeRange];
        entries = entries.filter(e =>
          new Date(e.timestamp).getTime() > cutoff
        );
      }

      // Sort by timestamp descending
      entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Limit results
      const limitedEntries = entries.slice(0, parseInt(limit));

      res.json({
        success: true,
        entries: limitedEntries,
        total: entries.length,
        timeRange
      });
    } catch (error) {
      logger.error('Work journal error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Helper functions
function getAgentIdFromName(name) {
  const agents = {
    'Dash': 'dashboard-improvement-agent',
    'SecOps': 'security-auditor',
    'Speedy': 'performance-optimizer',
    'API Master': 'api-integration-specialist',
    'CAO': 'chief-ai-officer',
    'Watchdog': 'error-monitor',
    'DevLead': 'development-manager'
  };
  return agents[name] || null;
}

function getAgentAvatar(agentId) {
  const avatars = {
    'dashboard-improvement-agent': '📈',
    'security-auditor': '🔐',
    'performance-optimizer': '⚡',
    'api-integration-specialist': '🔌',
    'chief-ai-officer': '👔',
    'error-monitor': '👀',
    'development-manager': '👨‍💼'
  };
  return avatars[agentId] || '🤖';
}

function generateAgentResponse(agentId, userMessage) {
  const responses = {
    'dashboard-improvement-agent': [
      'I\'ll analyze that dashboard component and provide optimization suggestions.',
      'Working on improving the UI performance now.',
      'I\'ve identified several areas for enhancement. Implementing changes...',
      'Dashboard metrics look good. I\'ll continue monitoring for improvements.'
    ],
    'security-auditor': [
      'Running security scan on the specified components...',
      'I\'ll perform a comprehensive security audit right away.',
      'Checking for vulnerabilities and compliance issues...',
      'Security protocols activated. Analyzing potential threats...'
    ],
    'performance-optimizer': [
      'Analyzing performance metrics and identifying bottlenecks...',
      'I\'ll optimize that query and improve response times.',
      'Running performance profiling now...',
      'Performance optimization in progress. Expected improvement: 40-60%'
    ],
    'api-integration-specialist': [
      'Checking API endpoints and integration points...',
      'I\'ll ensure all APIs are properly connected and functioning.',
      'Running integration tests across all services...',
      'API health check initiated. Monitoring response times...'
    ],
    'chief-ai-officer': [
      'Coordinating with the team to address this priority.',
      'I\'ll ensure this gets the appropriate resources and attention.',
      'Strategic analysis in progress. Aligning with business objectives...',
      'Team coordination initiated. All agents notified of priority change.'
    ],
    'error-monitor': [
      'Scanning error logs for recent issues...',
      'I\'ll investigate any anomalies in the system.',
      'Error detection systems active. Monitoring all services...',
      'No critical errors detected. System health is optimal.'
    ],
    'development-manager': [
      'I\'ll coordinate the development team on this task.',
      'Prioritizing this in our sprint planning.',
      'Assigning resources to address this requirement...',
      'Development pipeline updated. Task added to backlog.'
    ]
  };

  const agentResponses = responses[agentId] || ['Processing your request...'];
  return agentResponses[Math.floor(Math.random() * agentResponses.length)];
}

module.exports = router;