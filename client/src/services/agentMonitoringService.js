/**
 * Agent Monitoring Service
 * Tracks and manages AI agent activity for CartSmash
 * Reports to Admin Dashboard for centralized monitoring
 */

import debugService from './debugService';

class AgentMonitoringService {
  constructor() {
    this.agents = this.initializeAgents();
    this.activities = [];
    this.metrics = {};
    this.startTime = new Date();
  }

  /**
   * Initialize agent profiles with hierarchy and aliases
   */
  initializeAgents() {
    return {
      // Executive Level
      'chief-ai-officer': {
        id: 'chief-ai-officer',
        alias: 'CAO',
        name: 'Chief AI Officer',
        role: 'Executive Strategy',
        avatar: '👔',
        status: 'idle',
        description: 'Executive oversight and strategic decision making',
        tools: ['Read', 'Grep', 'Task', 'TodoWrite'],
        priority: 'EXECUTIVE',
        level: 'C-Suite',
        reportsTo: null,
        manages: ['development-manager', 'security-manager', 'performance-manager'],
        stats: {
          tasksToday: 0,
          decisionsMade: 0,
          lastActivity: null,
          uptime: '100%'
        }
      },

      // Management Level
      'development-manager': {
        id: 'development-manager',
        alias: 'DevLead',
        name: 'Development Manager',
        role: 'Team Management',
        avatar: '📊',
        status: 'idle',
        description: 'Manages development team and dashboard improvements',
        tools: ['Read', 'Edit', 'Grep', 'Task', 'TodoWrite'],
        priority: 'MANAGER',
        level: 'Manager',
        reportsTo: 'chief-ai-officer',
        manages: ['dashboard-improvement-agent', 'performance-optimizer', 'grocery-parser'],
        stats: {
          tasksToday: 0,
          sprintVelocity: 0,
          lastActivity: null,
          uptime: '100%'
        }
      },

      // Specialist Level
      'dashboard-improvement-agent': {
        id: 'dashboard-improvement-agent',
        alias: 'Dash',
        name: 'Dashboard Specialist',
        role: 'Dashboard Development',
        avatar: '📈',
        status: 'idle',
        description: 'Continuously improves Admin Dashboard with reporting and visualizations',
        tools: ['Read', 'Edit', 'Grep', 'Write'],
        priority: 'HIGH',
        level: 'Senior Specialist',
        reportsTo: 'development-manager',
        manages: [],
        stats: {
          tasksToday: 0,
          widgetsCreated: 0,
          lastActivity: null,
          uptime: '100%'
        }
      },

      'security-auditor': {
        id: 'security-auditor',
        alias: 'SecOps',
        name: 'Security Auditor',
        role: 'Security & Compliance',
        avatar: '🔐',
        status: 'idle',
        description: 'Reviews code for vulnerabilities and security issues',
        tools: ['Read', 'Grep'],
        priority: 'HIGH',
        level: 'Specialist',
        reportsTo: 'security-manager',
        manages: [],
        stats: {
          tasksToday: 0,
          issuesFound: 0,
          lastActivity: null,
          uptime: '100%'
        }
      },
      'api-integration-specialist': {
        id: 'api-integration-specialist',
        alias: 'API Master',
        name: 'API Integration Specialist',
        role: 'External Services',
        avatar: '🔌',
        status: 'idle',
        description: 'Manages Spoonacular, Instacart, and AI service integrations',
        tools: ['Read', 'Grep', 'Edit', 'Bash'],
        priority: 'HIGH',
        level: 'Specialist',
        reportsTo: 'development-manager',
        manages: [],
        stats: {
          tasksToday: 0,
          apiCalls: 0,
          cacheHits: 0,
          lastActivity: null
        }
      },
      'performance-optimizer': {
        id: 'performance-optimizer',
        alias: 'Speedy',
        name: 'Performance Optimizer',
        role: 'System Performance',
        avatar: '⚡',
        status: 'idle',
        description: 'Optimizes React components and API response times',
        tools: ['Read', 'Grep', 'Edit', 'Bash'],
        priority: 'MEDIUM',
        level: 'Specialist',
        reportsTo: 'performance-manager',
        manages: [],
        stats: {
          tasksToday: 0,
          optimizations: 0,
          improvement: '0%',
          lastActivity: null
        }
      },
      'grocery-parser': {
        id: 'grocery-parser',
        alias: 'Parser',
        name: 'Grocery Parser',
        role: 'Data Processing',
        avatar: '🛒',
        status: 'idle',
        description: 'Specializes in parsing grocery lists and product matching',
        tools: ['Read', 'Edit', 'Grep'],
        priority: 'HIGH',
        level: 'Specialist',
        reportsTo: 'development-manager',
        manages: [],
        stats: {
          tasksToday: 0,
          itemsParsed: 0,
          accuracy: '95%',
          lastActivity: null
        }
      },
      'instacart-checkout': {
        id: 'instacart-checkout',
        alias: 'Checkout Pro',
        name: 'Instacart Checkout',
        role: 'Checkout Flow',
        avatar: '💳',
        status: 'idle',
        description: 'Manages cart creation and checkout processes',
        tools: ['Read', 'Edit', 'Grep', 'Bash'],
        priority: 'CRITICAL',
        level: 'Senior Specialist',
        reportsTo: 'development-manager',
        manages: [],
        stats: {
          tasksToday: 0,
          cartsCreated: 0,
          conversionRate: '0%',
          lastActivity: null
        }
      },
      'error-monitor': {
        id: 'error-monitor',
        alias: 'Watchdog',
        name: 'Error Monitor',
        role: 'System Health',
        avatar: '🔍',
        status: 'active',
        description: 'Monitors logs and system health 24/7',
        tools: ['Read', 'Grep', 'Bash'],
        priority: 'CRITICAL',
        level: 'Specialist',
        reportsTo: 'quality-manager',
        manages: [],
        autoRun: true,
        stats: {
          tasksToday: 0,
          errorsDetected: 0,
          alertsSent: 0,
          lastActivity: new Date()
        }
      },
      'cors-validator': {
        id: 'cors-validator',
        alias: 'CORS Guard',
        name: 'CORS Validator',
        role: 'Security Compliance',
        avatar: '🛡️',
        status: 'idle',
        description: 'Auto-validates CORS on new endpoints',
        tools: ['Read', 'Grep', 'Edit'],
        priority: 'CRITICAL',
        level: 'Specialist',
        reportsTo: 'security-manager',
        manages: [],
        autoTrigger: true,
        stats: {
          tasksToday: 0,
          endpointsChecked: 0,
          issuesFixed: 0,
          lastActivity: null
        }
      },
      'recipe-manager': {
        id: 'recipe-manager',
        alias: 'Chef',
        name: 'Recipe Manager',
        role: 'Recipe Processing',
        avatar: '👨‍🍳',
        status: 'idle',
        description: 'Handles recipe import, parsing, and management',
        tools: ['Read', 'Edit', 'Grep', 'WebFetch'],
        priority: 'MEDIUM',
        level: 'Specialist',
        reportsTo: 'data-manager',
        manages: [],
        stats: {
          tasksToday: 0,
          recipesProcessed: 0,
          successRate: '0%',
          lastActivity: null
        }
      },
      'ai-meal-planner': {
        id: 'ai-meal-planner',
        alias: 'Menu AI',
        name: 'AI Meal Planner',
        role: 'Meal Planning',
        avatar: '🍽️',
        status: 'idle',
        description: 'Creates personalized meal plans using AI',
        tools: ['Read', 'Edit', 'WebFetch'],
        priority: 'MEDIUM',
        level: 'Specialist',
        reportsTo: 'data-manager',
        manages: [],
        stats: {
          tasksToday: 0,
          plansCreated: 0,
          satisfaction: '0%',
          lastActivity: null
        }
      },
      'cache-manager': {
        id: 'cache-manager',
        alias: 'Cache Master',
        name: 'Cache Manager',
        role: 'Data Optimization',
        avatar: '💾',
        status: 'idle',
        description: 'Manages product and recipe caching strategies',
        tools: ['Read', 'Edit', 'Bash'],
        priority: 'LOW',
        level: 'Specialist',
        reportsTo: 'performance-manager',
        manages: [],
        stats: {
          tasksToday: 0,
          cacheHitRate: '0%',
          spaceSaved: '0MB',
          lastActivity: null
        }
      }
    };
  }

  /**
   * Log agent activity
   */
  logActivity(agentId, action, details = {}) {
    const agent = this.agents[agentId];
    if (!agent) {
      console.warn(`Unknown agent: ${agentId}`);
      return;
    }

    // Update agent status
    agent.status = 'active';
    agent.stats.tasksToday++;
    agent.stats.lastActivity = new Date();

    // Create activity record
    const activity = {
      id: `${agentId}-${Date.now()}`,
      agentId,
      agentName: agent.name,
      action,
      details,
      timestamp: new Date(),
      duration: details.duration || 0,
      success: details.success !== false
    };

    // Add to activities
    this.activities.unshift(activity);
    if (this.activities.length > 100) {
      this.activities = this.activities.slice(0, 100);
    }

    // Update specific stats based on agent type
    this.updateAgentStats(agentId, action, details);

    // Log to debug service
    debugService.log('agent-activity', `${agent.name}: ${action}`, {
      agentId,
      ...details
    });

    // Schedule status reset
    setTimeout(() => {
      if (agent.status === 'active' &&
          new Date() - agent.stats.lastActivity > 60000) {
        agent.status = 'idle';
      }
    }, 61000);

    return activity;
  }

  /**
   * Update agent-specific statistics
   */
  updateAgentStats(agentId, action, details) {
    const agent = this.agents[agentId];

    switch (agentId) {
      case 'security-auditor':
        if (details.issuesFound) {
          agent.stats.issuesFound += details.issuesFound;
        }
        break;

      case 'api-integration-specialist':
        if (details.apiCall) agent.stats.apiCalls++;
        if (details.cacheHit) agent.stats.cacheHits++;
        break;

      case 'grocery-parser':
        if (details.itemsParsed) {
          agent.stats.itemsParsed += details.itemsParsed;
        }
        if (details.accuracy) {
          agent.stats.accuracy = details.accuracy;
        }
        break;

      case 'instacart-checkout':
        if (details.cartCreated) agent.stats.cartsCreated++;
        if (details.conversionRate) {
          agent.stats.conversionRate = details.conversionRate;
        }
        break;

      case 'error-monitor':
        if (details.errorDetected) agent.stats.errorsDetected++;
        if (details.alertSent) agent.stats.alertsSent++;
        break;

      case 'cors-validator':
        if (details.endpointChecked) agent.stats.endpointsChecked++;
        if (details.issueFixed) agent.stats.issuesFixed++;
        break;

      default:
        // Generic stat updates
        if (details.processed) {
          agent.stats.processed = (agent.stats.processed || 0) + details.processed;
        }
    }
  }

  /**
   * Get all agents with current status
   */
  getAllAgents() {
    return Object.values(this.agents).map(agent => ({
      ...agent,
      performance: this.calculatePerformance(agent.id)
    }));
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId) {
    return this.agents[agentId];
  }

  /**
   * Get recent activities
   */
  getRecentActivities(limit = 20) {
    return this.activities.slice(0, limit);
  }

  /**
   * Calculate agent performance
   */
  calculatePerformance(agentId) {
    const agent = this.agents[agentId];
    const recentActivities = this.activities
      .filter(a => a.agentId === agentId)
      .slice(0, 10);

    if (recentActivities.length === 0) {
      return { score: 'N/A', efficiency: 'N/A', reliability: 'N/A' };
    }

    const successRate = recentActivities.filter(a => a.success).length / recentActivities.length;
    const avgDuration = recentActivities.reduce((sum, a) => sum + (a.duration || 0), 0) / recentActivities.length;

    return {
      score: `${Math.round(successRate * 100)}%`,
      efficiency: avgDuration < 1000 ? 'Excellent' : avgDuration < 5000 ? 'Good' : 'Needs Improvement',
      reliability: successRate > 0.95 ? 'Excellent' : successRate > 0.8 ? 'Good' : 'Poor'
    };
  }

  /**
   * Get system overview
   */
  getSystemOverview() {
    const activeAgents = Object.values(this.agents).filter(a => a.status === 'active').length;
    const totalTasks = Object.values(this.agents).reduce((sum, a) => sum + a.stats.tasksToday, 0);
    const criticalAgents = Object.values(this.agents).filter(a => a.priority === 'CRITICAL');
    const healthyAgents = criticalAgents.filter(a => a.status !== 'error').length;

    return {
      totalAgents: Object.keys(this.agents).length,
      activeAgents,
      idleAgents: Object.keys(this.agents).length - activeAgents,
      totalTasksToday: totalTasks,
      systemHealth: healthyAgents === criticalAgents.length ? 'Healthy' : 'Degraded',
      uptime: this.calculateUptime(),
      criticalAgentsStatus: `${healthyAgents}/${criticalAgents.length} operational`
    };
  }

  /**
   * Calculate system uptime
   */
  calculateUptime() {
    const now = new Date();
    const uptimeMs = now - this.startTime;
    const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  /**
   * Trigger agent manually
   */
  triggerAgent(agentId, task, params = {}) {
    const agent = this.agents[agentId];
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    this.logActivity(agentId, `Manual trigger: ${task}`, {
      triggeredBy: 'admin',
      task,
      params,
      timestamp: new Date()
    });

    return {
      success: true,
      message: `Agent ${agent.name} triggered for: ${task}`,
      agentId,
      task
    };
  }

  /**
   * Get agent recommendations
   */
  getRecommendations() {
    const recommendations = [];

    // Check for idle high-priority agents
    Object.values(this.agents).forEach(agent => {
      if (agent.priority === 'HIGH' && agent.status === 'idle' && agent.stats.tasksToday === 0) {
        recommendations.push({
          type: 'underutilized',
          agent: agent.name,
          message: `${agent.name} hasn't been active today. Consider running diagnostics.`
        });
      }
    });

    // Check error rates
    if (this.agents['error-monitor'].stats.errorsDetected > 10) {
      recommendations.push({
        type: 'high-errors',
        agent: 'Error Monitor',
        message: 'High error rate detected. Review system logs for issues.'
      });
    }

    // Check API usage
    const apiAgent = this.agents['api-integration-specialist'];
    if (apiAgent.stats.apiCalls > 40) {
      recommendations.push({
        type: 'api-limit',
        agent: 'API Specialist',
        message: 'Approaching Spoonacular daily limit (50 calls). Switch to cache mode.'
      });
    }

    return recommendations;
  }
}

// Create singleton instance
const agentMonitoringService = new AgentMonitoringService();

export default agentMonitoringService;