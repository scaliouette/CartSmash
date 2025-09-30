/**
 * Agent Communication Hub
 * Facilitates inter-agent communication and collaboration
 * Manages messages, directives, and collaborative workflows
 */

const EventEmitter = require('events');
const winston = require('winston');

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

class AgentCommunicationHub extends EventEmitter {
  constructor() {
    super();

    // Communication channels
    this.directMessages = new Map(); // Agent-to-agent messages
    this.broadcasts = [];            // System-wide broadcasts
    this.channels = new Map();       // Topic-based channels
    this.collaborations = new Map(); // Active collaborations

    // Agent registry with aliases
    this.agents = new Map();
    this.agentAliases = new Map();

    // Message history
    this.messageHistory = [];
    this.maxHistorySize = 1000;

    // Initialize default channels
    this.initializeChannels();
  }

  /**
   * Initialize default communication channels
   */
  initializeChannels() {
    const defaultChannels = [
      'general',
      'development',
      'security',
      'performance',
      'dashboard',
      'emergency',
      'executive'
    ];

    defaultChannels.forEach(channel => {
      this.channels.set(channel, {
        subscribers: new Set(),
        messages: [],
        created: new Date()
      });
    });

    logger.info('Communication Hub initialized with default channels');
  }

  /**
   * Register an agent in the communication system
   */
  registerAgent(agentId, profile) {
    const agentInfo = {
      id: agentId,
      alias: profile.alias || agentId,
      name: profile.name,
      role: profile.role,
      level: profile.level || 'SPECIALIST',
      capabilities: profile.capabilities || [],
      status: 'online',
      lastSeen: new Date(),
      messageQueue: [],
      channels: new Set(['general'])
    };

    this.agents.set(agentId, agentInfo);

    // Set up alias mapping
    if (profile.alias) {
      this.agentAliases.set(profile.alias.toLowerCase(), agentId);
    }

    // Subscribe to relevant channels based on role
    this.autoSubscribeToChannels(agentId, profile.role);

    // Emit registration event
    this.emit('agent:registered', agentInfo);

    logger.info(`Agent registered: ${agentId} (${profile.alias})`);
    return agentInfo;
  }

  /**
   * Auto-subscribe agent to relevant channels based on role
   */
  autoSubscribeToChannels(agentId, role) {
    const roleChannels = {
      'executive': ['executive', 'general'],
      'manager': ['development', 'general', 'executive'],
      'security': ['security', 'emergency', 'general'],
      'performance': ['performance', 'development', 'general'],
      'dashboard': ['dashboard', 'development', 'general']
    };

    const channels = roleChannels[role.toLowerCase()] || ['general'];

    channels.forEach(channel => {
      this.subscribeToChannel(agentId, channel);
    });
  }

  /**
   * Send a direct message from one agent to another
   */
  sendMessage(fromAgentId, toAgentId, message) {
    // Resolve aliases to agent IDs
    const fromId = this.resolveAgentId(fromAgentId);
    const toId = this.resolveAgentId(toAgentId);

    if (!this.agents.has(fromId)) {
      throw new Error(`Sender agent not found: ${fromAgentId}`);
    }

    if (!this.agents.has(toId)) {
      throw new Error(`Recipient agent not found: ${toAgentId}`);
    }

    const messageObj = {
      id: `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: fromId,
      fromAlias: this.agents.get(fromId).alias,
      to: toId,
      toAlias: this.agents.get(toId).alias,
      content: message,
      timestamp: new Date(),
      type: 'direct',
      status: 'sent',
      readAt: null
    };

    // Store in direct messages
    if (!this.directMessages.has(toId)) {
      this.directMessages.set(toId, []);
    }
    this.directMessages.get(toId).push(messageObj);

    // Add to recipient's queue
    const recipient = this.agents.get(toId);
    if (recipient) {
      recipient.messageQueue.push(messageObj);
    }

    // Add to history
    this.addToHistory(messageObj);

    // Emit message event
    this.emit('message:sent', messageObj);
    this.emit(`message:${toId}`, messageObj);

    logger.info(`Message sent from ${fromId} to ${toId}`);
    return messageObj;
  }

  /**
   * Broadcast a message to all agents
   */
  broadcast(fromAgentId, message, priority = 'normal') {
    const fromId = this.resolveAgentId(fromAgentId);

    const broadcastObj = {
      id: `BCAST-${Date.now()}`,
      from: fromId,
      fromAlias: this.agents.get(fromId)?.alias || 'System',
      content: message,
      priority,
      timestamp: new Date(),
      type: 'broadcast',
      recipients: Array.from(this.agents.keys())
    };

    // Store broadcast
    this.broadcasts.push(broadcastObj);

    // Send to all agents
    this.agents.forEach((agent, agentId) => {
      if (agentId !== fromId) {
        agent.messageQueue.push(broadcastObj);
        this.emit(`message:${agentId}`, broadcastObj);
      }
    });

    // Add to history
    this.addToHistory(broadcastObj);

    // Emit broadcast event
    this.emit('broadcast:sent', broadcastObj);

    logger.info(`Broadcast sent from ${fromId}: ${message.substring(0, 50)}...`);
    return broadcastObj;
  }

  /**
   * Send a message to a channel
   */
  sendToChannel(agentId, channelName, message) {
    const fromId = this.resolveAgentId(agentId);
    const channel = this.channels.get(channelName);

    if (!channel) {
      throw new Error(`Channel not found: ${channelName}`);
    }

    if (!channel.subscribers.has(fromId)) {
      throw new Error(`Agent ${agentId} not subscribed to channel ${channelName}`);
    }

    const messageObj = {
      id: `CHAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: fromId,
      fromAlias: this.agents.get(fromId).alias,
      channel: channelName,
      content: message,
      timestamp: new Date(),
      type: 'channel'
    };

    // Store in channel
    channel.messages.push(messageObj);

    // Send to all subscribers except sender
    channel.subscribers.forEach(subscriberId => {
      if (subscriberId !== fromId) {
        const subscriber = this.agents.get(subscriberId);
        if (subscriber) {
          subscriber.messageQueue.push(messageObj);
          this.emit(`message:${subscriberId}`, messageObj);
        }
      }
    });

    // Add to history
    this.addToHistory(messageObj);

    // Emit channel event
    this.emit(`channel:${channelName}`, messageObj);

    logger.info(`Message sent to channel ${channelName} from ${fromId}`);
    return messageObj;
  }

  /**
   * Issue a directive from a manager to team members
   */
  issueDirective(managerId, teamIds, directive) {
    const fromId = this.resolveAgentId(managerId);
    const manager = this.agents.get(fromId);

    if (!manager || !['manager', 'executive'].includes(manager.level.toLowerCase())) {
      throw new Error(`Agent ${managerId} is not authorized to issue directives`);
    }

    const directiveObj = {
      id: `DIR-${Date.now()}`,
      from: fromId,
      fromAlias: manager.alias,
      to: teamIds.map(id => this.resolveAgentId(id)),
      directive: directive.action,
      priority: directive.priority || 'normal',
      deadline: directive.deadline,
      context: directive.context,
      timestamp: new Date(),
      type: 'directive',
      status: 'issued',
      acknowledgements: new Map()
    };

    // Send to each team member
    directiveObj.to.forEach(agentId => {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.messageQueue.push(directiveObj);
        this.emit(`directive:${agentId}`, directiveObj);
      }
    });

    // Store directive
    if (!this.collaborations.has('directives')) {
      this.collaborations.set('directives', []);
    }
    this.collaborations.get('directives').push(directiveObj);

    // Add to history
    this.addToHistory(directiveObj);

    // Emit directive event
    this.emit('directive:issued', directiveObj);

    logger.info(`Directive issued by ${fromId} to ${teamIds.length} agents`);
    return directiveObj;
  }

  /**
   * Request collaboration between agents
   */
  requestCollaboration(initiatorId, participantIds, task) {
    const fromId = this.resolveAgentId(initiatorId);
    const participants = participantIds.map(id => this.resolveAgentId(id));

    const collaboration = {
      id: `COLLAB-${Date.now()}`,
      initiator: fromId,
      initiatorAlias: this.agents.get(fromId).alias,
      participants: [fromId, ...participants],
      task,
      status: 'proposed',
      created: new Date(),
      messages: [],
      decisions: [],
      artifacts: []
    };

    // Store collaboration
    this.collaborations.set(collaboration.id, collaboration);

    // Notify all participants
    participants.forEach(agentId => {
      this.sendMessage(fromId, agentId, {
        type: 'collaboration_request',
        collaborationId: collaboration.id,
        task: task
      });
    });

    // Emit collaboration event
    this.emit('collaboration:requested', collaboration);

    logger.info(`Collaboration requested: ${collaboration.id}`);
    return collaboration;
  }

  /**
   * Add a message to collaboration thread
   */
  addCollaborationMessage(collaborationId, agentId, message) {
    const collaboration = this.collaborations.get(collaborationId);
    if (!collaboration) {
      throw new Error(`Collaboration not found: ${collaborationId}`);
    }

    const fromId = this.resolveAgentId(agentId);
    if (!collaboration.participants.includes(fromId)) {
      throw new Error(`Agent ${agentId} not part of collaboration ${collaborationId}`);
    }

    const messageObj = {
      from: fromId,
      fromAlias: this.agents.get(fromId).alias,
      content: message,
      timestamp: new Date()
    };

    collaboration.messages.push(messageObj);

    // Notify other participants
    collaboration.participants.forEach(participantId => {
      if (participantId !== fromId) {
        this.emit(`collaboration:${participantId}`, {
          collaborationId,
          message: messageObj
        });
      }
    });

    return messageObj;
  }

  /**
   * Subscribe agent to a channel
   */
  subscribeToChannel(agentId, channelName) {
    const channel = this.channels.get(channelName);
    if (!channel) {
      this.channels.set(channelName, {
        subscribers: new Set(),
        messages: [],
        created: new Date()
      });
    }

    const resolvedId = this.resolveAgentId(agentId);
    this.channels.get(channelName).subscribers.add(resolvedId);

    const agent = this.agents.get(resolvedId);
    if (agent) {
      agent.channels.add(channelName);
    }

    logger.info(`Agent ${agentId} subscribed to channel ${channelName}`);
  }

  /**
   * Unsubscribe agent from a channel
   */
  unsubscribeFromChannel(agentId, channelName) {
    const channel = this.channels.get(channelName);
    if (channel) {
      const resolvedId = this.resolveAgentId(agentId);
      channel.subscribers.delete(resolvedId);

      const agent = this.agents.get(resolvedId);
      if (agent) {
        agent.channels.delete(channelName);
      }
    }
  }

  /**
   * Get messages for an agent
   */
  getMessages(agentId, limit = 50) {
    const resolvedId = this.resolveAgentId(agentId);
    const agent = this.agents.get(resolvedId);

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const messages = agent.messageQueue.slice(-limit);

    // Mark as read
    messages.forEach(msg => {
      if (msg.status === 'sent') {
        msg.status = 'read';
        msg.readAt = new Date();
      }
    });

    // Clear read messages from queue
    agent.messageQueue = agent.messageQueue.filter(msg =>
      msg.status !== 'read'
    );

    return messages;
  }

  /**
   * Resolve agent ID from alias
   */
  resolveAgentId(agentIdOrAlias) {
    // Check if it's already an ID
    if (this.agents.has(agentIdOrAlias)) {
      return agentIdOrAlias;
    }

    // Try to resolve from alias
    const id = this.agentAliases.get(agentIdOrAlias.toLowerCase());
    if (id) {
      return id;
    }

    // Return original if no resolution found
    return agentIdOrAlias;
  }

  /**
   * Add message to history
   */
  addToHistory(message) {
    this.messageHistory.push(message);

    // Trim history if too large
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get communication statistics
   */
  getStatistics() {
    const stats = {
      totalAgents: this.agents.size,
      onlineAgents: 0,
      totalMessages: this.messageHistory.length,
      directMessages: 0,
      broadcasts: this.broadcasts.length,
      channelMessages: 0,
      activeCollaborations: 0,
      channels: {}
    };

    // Count online agents
    this.agents.forEach(agent => {
      if (agent.status === 'online') {
        stats.onlineAgents++;
      }
    });

    // Count message types
    this.messageHistory.forEach(msg => {
      switch (msg.type) {
        case 'direct':
          stats.directMessages++;
          break;
        case 'channel':
          stats.channelMessages++;
          break;
      }
    });

    // Channel statistics
    this.channels.forEach((channel, name) => {
      stats.channels[name] = {
        subscribers: channel.subscribers.size,
        messages: channel.messages.length
      };
    });

    // Active collaborations
    this.collaborations.forEach(collab => {
      if (collab.status === 'active') {
        stats.activeCollaborations++;
      }
    });

    return stats;
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId, status) {
    const resolvedId = this.resolveAgentId(agentId);
    const agent = this.agents.get(resolvedId);

    if (agent) {
      agent.status = status;
      agent.lastSeen = new Date();

      this.emit('agent:status', { agentId: resolvedId, status });
    }
  }

  /**
   * Get agent profile by ID or alias
   */
  getAgent(agentIdOrAlias) {
    const id = this.resolveAgentId(agentIdOrAlias);
    return this.agents.get(id);
  }

  /**
   * Get all registered agents
   */
  getAllAgents() {
    return Array.from(this.agents.values());
  }
}

// Create singleton instance
const agentCommunicationHub = new AgentCommunicationHub();

module.exports = agentCommunicationHub;