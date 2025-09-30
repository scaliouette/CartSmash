/**
 * Agent Task Queue Service
 * Manages task assignment and execution for autonomous agents
 * Implements priority queue and task persistence
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

class AgentTaskQueue extends EventEmitter {
  constructor() {
    super();

    // Task storage (in production, use Redis or database)
    this.tasks = new Map();
    this.taskHistory = [];
    this.agentQueues = new Map();
    this.activeTasks = new Map();

    // Task priorities
    this.priorities = {
      CRITICAL: 1,
      HIGH: 2,
      MEDIUM: 3,
      LOW: 4,
      BACKGROUND: 5
    };

    // Agent status tracking
    this.agentStatus = new Map();

    // Initialize system
    this.initialize();
  }

  /**
   * Initialize the task queue system
   */
  initialize() {
    logger.info('Agent Task Queue initialized');

    // Set up periodic task cleanup
    setInterval(() => this.cleanupCompletedTasks(), 3600000); // Every hour

    // Set up task timeout checker
    setInterval(() => this.checkTimeouts(), 60000); // Every minute
  }

  /**
   * Create a new task
   */
  createTask({
    title,
    description,
    type,
    priority = 'MEDIUM',
    assignedTo = null,
    requiredSkills = [],
    estimatedTime = null,
    deadline = null,
    dependencies = [],
    approvalRequired = false,
    metadata = {}
  }) {
    const task = {
      id: `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      type,
      priority: this.priorities[priority] || 3,
      assignedTo,
      requiredSkills,
      estimatedTime,
      deadline,
      dependencies,
      approvalRequired,
      metadata,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      attempts: 0
    };

    // Store task
    this.tasks.set(task.id, task);

    // Add to appropriate queue
    if (assignedTo) {
      this.addToAgentQueue(assignedTo, task);
    } else {
      this.addToUnassignedQueue(task);
    }

    // Emit event
    this.emit('task:created', task);

    logger.info(`Task created: ${task.id} - ${task.title}`);
    return task;
  }

  /**
   * Add task to agent-specific queue
   */
  addToAgentQueue(agentId, task) {
    if (!this.agentQueues.has(agentId)) {
      this.agentQueues.set(agentId, []);
    }

    const queue = this.agentQueues.get(agentId);

    // Insert based on priority
    const insertIndex = queue.findIndex(t =>
      this.tasks.get(t.id).priority > task.priority
    );

    if (insertIndex === -1) {
      queue.push(task);
    } else {
      queue.splice(insertIndex, 0, task);
    }

    this.emit('task:assigned', { agentId, task });
  }

  /**
   * Add task to unassigned queue for auto-assignment
   */
  addToUnassignedQueue(task) {
    if (!this.agentQueues.has('unassigned')) {
      this.agentQueues.set('unassigned', []);
    }

    const queue = this.agentQueues.get('unassigned');

    // Sort by priority
    const insertIndex = queue.findIndex(t =>
      this.tasks.get(t.id).priority > task.priority
    );

    if (insertIndex === -1) {
      queue.push(task);
    } else {
      queue.splice(insertIndex, 0, task);
    }
  }

  /**
   * Get next task for an agent
   */
  getNextTask(agentId, agentCapabilities = []) {
    // Check if agent is already working on something
    if (this.activeTasks.has(agentId)) {
      const activeTask = this.activeTasks.get(agentId);
      if (activeTask.status === 'IN_PROGRESS') {
        return null; // Agent is busy
      }
    }

    // Check agent's personal queue first
    if (this.agentQueues.has(agentId)) {
      const queue = this.agentQueues.get(agentId);
      if (queue.length > 0) {
        const task = queue.shift();
        return this.assignTaskToAgent(task.id, agentId);
      }
    }

    // Check unassigned queue for matching tasks
    const unassignedQueue = this.agentQueues.get('unassigned') || [];
    for (let i = 0; i < unassignedQueue.length; i++) {
      const task = unassignedQueue[i];

      // Check if agent has required skills
      if (this.agentCanHandleTask(agentCapabilities, task.requiredSkills)) {
        unassignedQueue.splice(i, 1);
        return this.assignTaskToAgent(task.id, agentId);
      }
    }

    return null; // No suitable tasks
  }

  /**
   * Check if agent has required skills for task
   */
  agentCanHandleTask(agentCapabilities, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) {
      return true;
    }

    return requiredSkills.every(skill =>
      agentCapabilities.includes(skill)
    );
  }

  /**
   * Assign task to agent
   */
  assignTaskToAgent(taskId, agentId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.error(`Task not found: ${taskId}`);
      return null;
    }

    // Update task
    task.assignedTo = agentId;
    task.status = 'ASSIGNED';
    task.updatedAt = new Date();

    // Track active task
    this.activeTasks.set(agentId, task);

    // Update agent status
    this.updateAgentStatus(agentId, 'WORKING', taskId);

    // Emit event
    this.emit('task:started', { agentId, task });

    logger.info(`Task ${taskId} assigned to agent ${agentId}`);
    return task;
  }

  /**
   * Start task execution
   */
  startTask(taskId, agentId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.assignedTo !== agentId) {
      throw new Error(`Task ${taskId} not assigned to agent ${agentId}`);
    }

    task.status = 'IN_PROGRESS';
    task.startedAt = new Date();
    task.updatedAt = new Date();
    task.attempts++;

    this.emit('task:progress', { agentId, task });

    logger.info(`Task ${taskId} started by agent ${agentId}`);
    return task;
  }

  /**
   * Complete a task
   */
  completeTask(taskId, agentId, result = {}) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.assignedTo !== agentId) {
      throw new Error(`Task ${taskId} not assigned to agent ${agentId}`);
    }

    task.status = 'COMPLETED';
    task.completedAt = new Date();
    task.updatedAt = new Date();
    task.result = result;

    // Move to history
    this.taskHistory.push(task);

    // Remove from active tasks
    this.activeTasks.delete(agentId);

    // Update agent status
    this.updateAgentStatus(agentId, 'IDLE');

    // Emit completion event
    this.emit('task:completed', { agentId, task, result });

    logger.info(`Task ${taskId} completed by agent ${agentId}`);
    return task;
  }

  /**
   * Fail a task
   */
  failTask(taskId, agentId, error) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'FAILED';
    task.error = error;
    task.updatedAt = new Date();

    // Check retry policy
    if (task.attempts < 3) {
      task.status = 'PENDING';
      this.addToUnassignedQueue(task);
      logger.info(`Task ${taskId} failed, queued for retry (attempt ${task.attempts}/3)`);
    } else {
      task.status = 'FAILED_PERMANENT';
      this.taskHistory.push(task);
      logger.error(`Task ${taskId} permanently failed after ${task.attempts} attempts`);
    }

    // Remove from active tasks
    this.activeTasks.delete(agentId);

    // Update agent status
    this.updateAgentStatus(agentId, 'IDLE');

    // Emit failure event
    this.emit('task:failed', { agentId, task, error });

    return task;
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId, status, currentTaskId = null) {
    this.agentStatus.set(agentId, {
      status,
      currentTaskId,
      lastUpdate: new Date()
    });

    this.emit('agent:status', { agentId, status, currentTaskId });
  }

  /**
   * Get agent workload
   */
  getAgentWorkload(agentId) {
    const queue = this.agentQueues.get(agentId) || [];
    const activeTask = this.activeTasks.get(agentId);

    return {
      activeTask,
      queuedTasks: queue.length,
      estimatedTime: this.calculateEstimatedTime(queue),
      status: this.agentStatus.get(agentId)
    };
  }

  /**
   * Calculate estimated time for task queue
   */
  calculateEstimatedTime(queue) {
    return queue.reduce((total, task) => {
      return total + (task.estimatedTime || 30); // Default 30 minutes
    }, 0);
  }

  /**
   * Get system overview
   */
  getSystemOverview() {
    const overview = {
      totalTasks: this.tasks.size,
      pendingTasks: 0,
      inProgressTasks: 0,
      completedTasks: this.taskHistory.length,
      failedTasks: 0,
      agentStatuses: {},
      tasksByPriority: {}
    };

    // Count task statuses
    for (const task of this.tasks.values()) {
      switch (task.status) {
        case 'PENDING':
        case 'ASSIGNED':
          overview.pendingTasks++;
          break;
        case 'IN_PROGRESS':
          overview.inProgressTasks++;
          break;
        case 'FAILED':
        case 'FAILED_PERMANENT':
          overview.failedTasks++;
          break;
      }

      // Count by priority
      const priorityName = Object.keys(this.priorities).find(
        key => this.priorities[key] === task.priority
      );
      overview.tasksByPriority[priorityName] =
        (overview.tasksByPriority[priorityName] || 0) + 1;
    }

    // Get agent statuses
    for (const [agentId, status] of this.agentStatus) {
      overview.agentStatuses[agentId] = status;
    }

    return overview;
  }

  /**
   * Check for task timeouts
   */
  checkTimeouts() {
    const now = new Date();

    for (const task of this.tasks.values()) {
      if (task.status === 'IN_PROGRESS' && task.deadline) {
        if (new Date(task.deadline) < now) {
          logger.warn(`Task ${task.id} has exceeded deadline`);
          this.emit('task:timeout', task);
        }
      }
    }
  }

  /**
   * Clean up completed tasks older than 24 hours
   */
  cleanupCompletedTasks() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    this.taskHistory = this.taskHistory.filter(task =>
      new Date(task.completedAt) > cutoff
    );

    logger.info(`Cleaned up ${this.taskHistory.length} old tasks`);
  }

  /**
   * Get task by ID
   */
  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * Update task
   */
  updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    Object.assign(task, updates);
    task.updatedAt = new Date();

    this.emit('task:updated', task);
    return task;
  }

  /**
   * Cancel task
   */
  cancelTask(taskId, reason) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'CANCELLED';
    task.cancelReason = reason;
    task.updatedAt = new Date();

    // Remove from queues
    if (task.assignedTo) {
      const queue = this.agentQueues.get(task.assignedTo);
      if (queue) {
        const index = queue.findIndex(t => t.id === taskId);
        if (index !== -1) {
          queue.splice(index, 1);
        }
      }

      // Remove from active tasks
      if (this.activeTasks.get(task.assignedTo)?.id === taskId) {
        this.activeTasks.delete(task.assignedTo);
        this.updateAgentStatus(task.assignedTo, 'IDLE');
      }
    }

    this.emit('task:cancelled', task);
    return task;
  }
}

// Create singleton instance
const agentTaskQueue = new AgentTaskQueue();

module.exports = agentTaskQueue;