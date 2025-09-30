/**
 * Agent Work Entry Model
 * Stores detailed records of agent work for the journal
 */

const mongoose = require('mongoose');

const AgentWorkEntrySchema = new mongoose.Schema({
  // Basic identification
  agentId: {
    type: String,
    required: true,
    index: true
  },
  agentAlias: {
    type: String,
    required: true
  },
  workId: {
    type: String,
    required: true,
    unique: true
  },

  // Work details
  actionType: {
    type: String,
    required: true,
    enum: [
      'CODE_MODIFICATION',
      'SECURITY_AUDIT',
      'OPTIMIZATION',
      'API_INTEGRATION',
      'STRATEGIC_DECISION',
      'ERROR_DETECTION',
      'DATABASE_CHANGE',
      'FILE_OPERATION',
      'DEPLOYMENT',
      'CONFIGURATION',
      'DOCUMENTATION',
      'TESTING',
      'MONITORING',
      'COLLABORATION'
    ]
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },

  // Files and changes
  files: [{
    path: String,
    additions: Number,
    deletions: Number,
    type: String
  }],
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed
    },
    after: {
      type: mongoose.Schema.Types.Mixed
    },
    summary: String
  },

  // Agent reasoning
  reasoning: {
    type: String,
    required: true
  },

  // Impact analysis
  impact: {
    level: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      required: true
    },
    users: String,
    systems: [String],
    risk: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL', 'NONE']
    },
    benefits: [String],
    metrics: mongoose.Schema.Types.Mixed
  },

  // Testing and validation
  testing: {
    automated: {
      passed: Number,
      failed: Number,
      skipped: Number,
      coverage: String
    },
    manual: String,
    performance: mongoose.Schema.Types.Mixed,
    security: mongoose.Schema.Types.Mixed,
    validation: mongoose.Schema.Types.Mixed
  },

  // Work metadata
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'RESOLVED'],
    default: 'PENDING'
  },
  priority: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'BACKGROUND'],
    default: 'MEDIUM'
  },
  duration: String,
  startedAt: Date,
  completedAt: Date,

  // Version control
  commits: [String],
  pullRequest: String,
  branch: String,
  mergedAt: Date,

  // Review and approval
  reviewRequired: {
    type: Boolean,
    default: false
  },
  reviewedBy: String,
  reviewedAt: Date,
  reviewComment: String,
  approvalStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'AUTO_APPROVED']
  },

  // Collaboration
  collaborators: [{
    agentId: String,
    agentAlias: String,
    role: String,
    contribution: String
  }],

  // Tags and categorization
  tags: [String],
  category: String,
  project: String,
  milestone: String,

  // Metrics and performance
  performanceMetrics: {
    executionTime: Number,
    resourceUsage: mongoose.Schema.Types.Mixed,
    efficiency: Number,
    qualityScore: Number
  },

  // Error handling
  errors: [{
    message: String,
    stack: String,
    timestamp: Date,
    resolved: Boolean
  }],

  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // Audit fields
  createdBy: String,
  updatedBy: String
}, {
  timestamps: true,
  collection: 'agent_work_entries'
});

// Indexes for efficient querying
AgentWorkEntrySchema.index({ agentId: 1, createdAt: -1 });
AgentWorkEntrySchema.index({ actionType: 1, status: 1 });
AgentWorkEntrySchema.index({ 'impact.level': 1, createdAt: -1 });
AgentWorkEntrySchema.index({ tags: 1 });
AgentWorkEntrySchema.index({ status: 1, reviewRequired: 1 });

// Virtual for work age
AgentWorkEntrySchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Methods
AgentWorkEntrySchema.methods.markCompleted = function(result) {
  this.status = 'COMPLETED';
  this.completedAt = new Date();
  if (result) {
    this.changes.after = result;
  }
  return this.save();
};

AgentWorkEntrySchema.methods.markFailed = function(error) {
  this.status = 'FAILED';
  this.errors = this.errors || [];
  this.errors.push({
    message: error.message,
    stack: error.stack,
    timestamp: new Date(),
    resolved: false
  });
  return this.save();
};

AgentWorkEntrySchema.methods.addCollaborator = function(collaborator) {
  this.collaborators = this.collaborators || [];
  this.collaborators.push(collaborator);
  return this.save();
};

// Statics
AgentWorkEntrySchema.statics.findByAgent = function(agentId, options = {}) {
  const query = this.find({ agentId });

  if (options.status) {
    query.where('status', options.status);
  }
  if (options.startDate) {
    query.where('createdAt').gte(options.startDate);
  }
  if (options.endDate) {
    query.where('createdAt').lte(options.endDate);
  }
  if (options.limit) {
    query.limit(options.limit);
  }

  return query.sort('-createdAt').exec();
};

AgentWorkEntrySchema.statics.findPendingReviews = function() {
  return this.find({
    reviewRequired: true,
    approvalStatus: { $in: ['PENDING', null] }
  }).sort('-createdAt').exec();
};

AgentWorkEntrySchema.statics.getAgentStatistics = async function(agentId, dateRange) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (dateRange || 30));

  const stats = await this.aggregate([
    {
      $match: {
        agentId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$agentId',
        totalWork: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
        },
        criticalWork: {
          $sum: { $cond: [{ $eq: ['$impact.level', 'CRITICAL'] }, 1, 0] }
        },
        avgDuration: { $avg: '$performanceMetrics.executionTime' }
      }
    }
  ]);

  return stats[0] || null;
};

const AgentWorkEntry = mongoose.model('AgentWorkEntry', AgentWorkEntrySchema);

module.exports = AgentWorkEntry;