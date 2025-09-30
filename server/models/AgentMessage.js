/**
 * Agent Message Model
 * Stores chat messages between agents and collaboration communications
 */

const mongoose = require('mongoose');

const AgentMessageSchema = new mongoose.Schema({
  // Message identification
  messageId: {
    type: String,
    required: true,
    unique: true
  },

  // Sender information
  from: {
    agentId: {
      type: String,
      required: true,
      index: true
    },
    agentAlias: String,
    userId: String,
    type: {
      type: String,
      enum: ['agent', 'user', 'system'],
      default: 'agent'
    }
  },

  // Recipient information
  to: {
    agentId: String,
    agentAlias: String,
    channel: String,
    type: {
      type: String,
      enum: ['direct', 'channel', 'broadcast'],
      required: true
    }
  },

  // Message content
  content: {
    text: {
      type: String,
      required: true
    },
    format: {
      type: String,
      enum: ['plain', 'markdown', 'code', 'json'],
      default: 'plain'
    },
    language: String, // For code blocks
    attachments: [{
      type: String,
      enum: ['file', 'image', 'log', 'report', 'code'],
      name: String,
      url: String,
      size: Number,
      mimeType: String
    }]
  },

  // Message metadata
  type: {
    type: String,
    enum: [
      'chat',
      'command',
      'directive',
      'notification',
      'alert',
      'collaboration',
      'review_request',
      'status_update',
      'error_report',
      'work_update'
    ],
    default: 'chat'
  },

  priority: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'],
    default: 'NORMAL'
  },

  // Threading and replies
  threadId: String,
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgentMessage'
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgentMessage'
  }],

  // Reactions and interactions
  reactions: [{
    emoji: String,
    agentId: String,
    timestamp: Date
  }],
  mentions: [String],
  tags: [String],

  // Read receipts
  readBy: [{
    agentId: String,
    readAt: Date
  }],
  deliveredTo: [{
    agentId: String,
    deliveredAt: Date
  }],

  // Status and tracking
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed', 'deleted'],
    default: 'sent'
  },
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  editHistory: [{
    content: String,
    editedAt: Date,
    editedBy: String
  }],
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: String,

  // Collaboration context
  collaborationId: String,
  workEntryId: String,
  taskId: String,

  // Command and execution
  command: {
    name: String,
    parameters: mongoose.Schema.Types.Mixed,
    executed: Boolean,
    result: mongoose.Schema.Types.Mixed,
    executedAt: Date
  },

  // Compliance and audit
  sensitive: {
    type: Boolean,
    default: false
  },
  encrypted: {
    type: Boolean,
    default: false
  },
  retention: {
    days: {
      type: Number,
      default: 30
    },
    permanent: {
      type: Boolean,
      default: false
    }
  },

  // Additional metadata
  metadata: mongoose.Schema.Types.Mixed,

  // System fields
  source: {
    type: String,
    enum: ['web', 'api', 'websocket', 'internal'],
    default: 'websocket'
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true,
  collection: 'agent_messages'
});

// Indexes for efficient querying
AgentMessageSchema.index({ 'from.agentId': 1, createdAt: -1 });
AgentMessageSchema.index({ 'to.agentId': 1, createdAt: -1 });
AgentMessageSchema.index({ 'to.channel': 1, createdAt: -1 });
AgentMessageSchema.index({ threadId: 1 });
AgentMessageSchema.index({ type: 1, priority: 1 });
AgentMessageSchema.index({ collaborationId: 1 });
AgentMessageSchema.index({ status: 1, createdAt: -1 });

// Text search index for message content
AgentMessageSchema.index({ 'content.text': 'text', tags: 'text' });

// TTL index for message retention
AgentMessageSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days default
    partialFilterExpression: { 'retention.permanent': false }
  }
);

// Virtuals
AgentMessageSchema.virtual('isRead').get(function() {
  return this.status === 'read' || this.readBy.length > 0;
});

AgentMessageSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Methods
AgentMessageSchema.methods.markAsRead = function(agentId) {
  if (!this.readBy.find(r => r.agentId === agentId)) {
    this.readBy.push({
      agentId,
      readAt: new Date()
    });
    this.status = 'read';
    return this.save();
  }
  return Promise.resolve(this);
};

AgentMessageSchema.methods.addReaction = function(agentId, emoji) {
  const existing = this.reactions.find(r => r.agentId === agentId && r.emoji === emoji);
  if (!existing) {
    this.reactions.push({
      emoji,
      agentId,
      timestamp: new Date()
    });
    return this.save();
  }
  return Promise.resolve(this);
};

AgentMessageSchema.methods.removeReaction = function(agentId, emoji) {
  this.reactions = this.reactions.filter(
    r => !(r.agentId === agentId && r.emoji === emoji)
  );
  return this.save();
};

AgentMessageSchema.methods.editMessage = function(newContent, editedBy) {
  this.editHistory = this.editHistory || [];
  this.editHistory.push({
    content: this.content.text,
    editedAt: this.editedAt || this.createdAt,
    editedBy: editedBy
  });

  this.content.text = newContent;
  this.edited = true;
  this.editedAt = new Date();

  return this.save();
};

AgentMessageSchema.methods.softDelete = function(deletedBy) {
  this.deleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

// Statics
AgentMessageSchema.statics.findConversation = function(agent1, agent2, limit = 50) {
  return this.find({
    $or: [
      { 'from.agentId': agent1, 'to.agentId': agent2 },
      { 'from.agentId': agent2, 'to.agentId': agent1 }
    ],
    deleted: false
  })
    .sort('-createdAt')
    .limit(limit)
    .exec();
};

AgentMessageSchema.statics.findChannelMessages = function(channel, options = {}) {
  const query = this.find({
    'to.channel': channel,
    'to.type': 'channel',
    deleted: false
  });

  if (options.since) {
    query.where('createdAt').gte(options.since);
  }
  if (options.limit) {
    query.limit(options.limit);
  }

  return query.sort('-createdAt').exec();
};

AgentMessageSchema.statics.findUnreadMessages = function(agentId) {
  return this.find({
    'to.agentId': agentId,
    deleted: false,
    'readBy.agentId': { $ne: agentId }
  }).sort('-createdAt').exec();
};

AgentMessageSchema.statics.searchMessages = function(searchText, options = {}) {
  const query = this.find({
    $text: { $search: searchText },
    deleted: false
  });

  if (options.agentId) {
    query.where({
      $or: [
        { 'from.agentId': options.agentId },
        { 'to.agentId': options.agentId }
      ]
    });
  }
  if (options.channel) {
    query.where('to.channel', options.channel);
  }
  if (options.type) {
    query.where('type', options.type);
  }
  if (options.limit) {
    query.limit(options.limit);
  }

  return query
    .select({ score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .exec();
};

AgentMessageSchema.statics.getMessageStatistics = async function(agentId, dateRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  const stats = await this.aggregate([
    {
      $match: {
        $or: [
          { 'from.agentId': agentId },
          { 'to.agentId': agentId }
        ],
        createdAt: { $gte: startDate },
        deleted: false
      }
    },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        sentMessages: {
          $sum: { $cond: [{ $eq: ['$from.agentId', agentId] }, 1, 0] }
        },
        receivedMessages: {
          $sum: { $cond: [{ $eq: ['$to.agentId', agentId] }, 1, 0] }
        },
        directMessages: {
          $sum: { $cond: [{ $eq: ['$to.type', 'direct'] }, 1, 0] }
        },
        channelMessages: {
          $sum: { $cond: [{ $eq: ['$to.type', 'channel'] }, 1, 0] }
        },
        avgMessageLength: { $avg: { $strLenCP: '$content.text' } }
      }
    }
  ]);

  return stats[0] || null;
};

const AgentMessage = mongoose.model('AgentMessage', AgentMessageSchema);

module.exports = AgentMessage;