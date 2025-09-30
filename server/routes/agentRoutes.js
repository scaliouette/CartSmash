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
const { isAdmin } = require('../middleware/adminAuth');
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

module.exports = router;