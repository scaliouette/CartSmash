/**
 * Agent WebSocket Server
 * Handles real-time communication for agent chat, status updates, and work notifications
 */

const { Server } = require('socket.io');
const winston = require('winston');
const jwt = require('jsonwebtoken');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class AgentWebSocketServer {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/socket.io'
    });

    // Store connected clients
    this.clients = new Map();
    this.agentSockets = new Map();
    this.channels = new Map();

    // Initialize default channels
    this.initializeChannels();

    // Set up connection handling
    this.setupConnectionHandling();
  }

  /**
   * Initialize default channels
   */
  initializeChannels() {
    const defaultChannels = [
      'general',
      'development',
      'security',
      'performance',
      'emergency'
    ];

    defaultChannels.forEach(channel => {
      this.channels.set(channel, new Set());
    });
  }

  /**
   * Set up WebSocket connection handling
   */
  setupConnectionHandling() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.isAdmin = decoded.isAdmin || false;
        socket.agentId = socket.handshake.auth.agentId || null;

        next();
      } catch (err) {
        logger.error('WebSocket authentication error:', err);
        next(new Error('Authentication failed'));
      }
    });

    // Handle connections
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id} (User: ${socket.userId})`);

      // Store client connection
      this.clients.set(socket.id, {
        userId: socket.userId,
        agentId: socket.agentId,
        isAdmin: socket.isAdmin,
        connectedAt: new Date()
      });

      // If agent connection, store separately
      if (socket.agentId) {
        this.agentSockets.set(socket.agentId, socket.id);
        this.broadcastAgentStatus(socket.agentId, 'online');
      }

      // Join default channel
      socket.join('general');
      this.channels.get('general').add(socket.id);

      // Set up event handlers
      this.setupSocketEventHandlers(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);

        // Clean up agent status
        if (socket.agentId) {
          this.agentSockets.delete(socket.agentId);
          this.broadcastAgentStatus(socket.agentId, 'offline');
        }

        // Remove from channels
        this.channels.forEach(channel => {
          channel.delete(socket.id);
        });

        // Remove client
        this.clients.delete(socket.id);
      });
    });
  }

  /**
   * Set up socket event handlers
   */
  setupSocketEventHandlers(socket) {
    // Agent chat message
    socket.on('agent:chat:message', async (data) => {
      try {
        const { channel, message, targetAgentId } = data;

        // Validate permissions
        if (!socket.isAdmin && !socket.agentId) {
          return socket.emit('error', { message: 'Unauthorized' });
        }

        // Create message object
        const messageObj = {
          id: `MSG-${Date.now()}`,
          from: socket.agentId || socket.userId,
          channel: channel || 'general',
          message,
          timestamp: new Date(),
          type: targetAgentId ? 'direct' : 'channel'
        };

        // Send to target
        if (targetAgentId) {
          // Direct message
          const targetSocketId = this.agentSockets.get(targetAgentId);
          if (targetSocketId) {
            this.io.to(targetSocketId).emit('agent:chat:receive', messageObj);
          }
        } else {
          // Channel message
          this.io.to(channel || 'general').emit('agent:chat:receive', messageObj);
        }

        // Acknowledge
        socket.emit('agent:chat:sent', { success: true, messageId: messageObj.id });

        logger.info(`Chat message sent: ${messageObj.id}`);
      } catch (error) {
        logger.error('Chat message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Join channel
    socket.on('agent:channel:join', (channel) => {
      if (this.channels.has(channel)) {
        socket.join(channel);
        this.channels.get(channel).add(socket.id);
        socket.emit('agent:channel:joined', { channel });
        logger.info(`Socket ${socket.id} joined channel: ${channel}`);
      }
    });

    // Leave channel
    socket.on('agent:channel:leave', (channel) => {
      socket.leave(channel);
      if (this.channels.has(channel)) {
        this.channels.get(channel).delete(socket.id);
      }
      socket.emit('agent:channel:left', { channel });
    });

    // Agent status update
    socket.on('agent:status:update', (data) => {
      if (!socket.agentId) return;

      const { status, currentTask, metrics } = data;

      // Broadcast to all admin clients
      this.io.emit('agent:status:changed', {
        agentId: socket.agentId,
        status,
        currentTask,
        metrics,
        timestamp: new Date()
      });

      logger.info(`Agent status updated: ${socket.agentId} - ${status}`);
    });

    // Work journal entry
    socket.on('agent:work:entry', (data) => {
      if (!socket.agentId) return;

      const workEntry = {
        ...data,
        agentId: socket.agentId,
        timestamp: new Date()
      };

      // Broadcast to admin clients
      this.io.emit('agent:work:new', workEntry);

      logger.info(`Work entry created by ${socket.agentId}`);
    });

    // Work review request
    socket.on('agent:work:review:request', (data) => {
      if (!socket.agentId) return;

      const reviewRequest = {
        ...data,
        agentId: socket.agentId,
        timestamp: new Date(),
        status: 'PENDING_REVIEW'
      };

      // Notify admins
      this.io.emit('agent:work:review:pending', reviewRequest);

      logger.info(`Review requested by ${socket.agentId}`);
    });

    // Audit event
    socket.on('agent:audit:event', (data) => {
      if (!socket.agentId) return;

      const auditEvent = {
        ...data,
        agentId: socket.agentId,
        timestamp: new Date()
      };

      // Broadcast to audit monitors
      this.io.emit('agent:audit:new', auditEvent);

      logger.info(`Audit event from ${socket.agentId}: ${data.action}`);
    });

    // Error report
    socket.on('agent:error:report', (data) => {
      const errorReport = {
        ...data,
        reportedBy: socket.agentId || socket.userId,
        timestamp: new Date()
      };

      // Broadcast to error monitors
      this.io.emit('agent:error:new', errorReport);

      logger.error(`Error reported: ${data.error}`);
    });

    // Agent trigger request (admin only)
    socket.on('agent:trigger', (data) => {
      if (!socket.isAdmin) {
        return socket.emit('error', { message: 'Admin access required' });
      }

      const { agentId, task, params } = data;
      const targetSocketId = this.agentSockets.get(agentId);

      if (targetSocketId) {
        this.io.to(targetSocketId).emit('agent:task:execute', {
          task,
          params,
          requestedBy: socket.userId,
          timestamp: new Date()
        });

        socket.emit('agent:trigger:sent', { agentId, task });
        logger.info(`Task triggered for ${agentId}: ${task}`);
      } else {
        socket.emit('error', { message: 'Agent not online' });
      }
    });

    // Collaboration request
    socket.on('agent:collaborate:request', (data) => {
      const { targetAgents, task, priority } = data;

      const collaboration = {
        id: `COLLAB-${Date.now()}`,
        initiator: socket.agentId || socket.userId,
        participants: targetAgents,
        task,
        priority,
        status: 'PROPOSED',
        timestamp: new Date()
      };

      // Notify target agents
      targetAgents.forEach(agentId => {
        const targetSocketId = this.agentSockets.get(agentId);
        if (targetSocketId) {
          this.io.to(targetSocketId).emit('agent:collaborate:invite', collaboration);
        }
      });

      socket.emit('agent:collaborate:created', collaboration);
      logger.info(`Collaboration requested: ${collaboration.id}`);
    });

    // Subscribe to notifications
    socket.on('subscribe:notifications', (types) => {
      types.forEach(type => {
        socket.join(`notify:${type}`);
      });
      socket.emit('subscribed', { types });
    });
  }

  /**
   * Broadcast agent status to all clients
   */
  broadcastAgentStatus(agentId, status) {
    this.io.emit('agent:status', {
      agentId,
      status,
      timestamp: new Date()
    });
  }

  /**
   * Send notification to specific users
   */
  sendNotification(userIds, notification) {
    userIds.forEach(userId => {
      const client = Array.from(this.clients.entries())
        .find(([_, data]) => data.userId === userId);

      if (client) {
        this.io.to(client[0]).emit('notification', notification);
      }
    });
  }

  /**
   * Broadcast to all agents
   */
  broadcastToAgents(event, data) {
    this.agentSockets.forEach((socketId) => {
      this.io.to(socketId).emit(event, data);
    });
  }

  /**
   * Get connected agents
   */
  getConnectedAgents() {
    return Array.from(this.agentSockets.keys());
  }

  /**
   * Get channel members
   */
  getChannelMembers(channel) {
    return Array.from(this.channels.get(channel) || []);
  }
}

module.exports = AgentWebSocketServer;