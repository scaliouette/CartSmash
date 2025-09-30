/**
 * Work Review Dashboard Component
 * Comprehensive interface for reviewing, approving, and managing agent work
 * Includes approval workflows, impact analysis, and rollback capabilities
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  GitBranch,
  GitCommit,
  GitPullRequest,
  FileText,
  Code,
  Shield,
  Zap,
  AlertTriangle,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  RotateCcw,
  Play,
  Pause,
  Flag,
  Star,
  Award,
  TrendingUp,
  BarChart3,
  Users,
  Eye,
  Download,
  Filter,
  Calendar,
  Package,
  Database,
  Settings,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  CheckSquare,
  Square,
  MinusSquare,
  Info,
  Send,
  Edit3,
  Trash2,
  Archive,
  Bookmark,
  ChevronDown
} from 'lucide-react';
import agentMonitoringService from '../services/agentMonitoringService';

const WorkReviewDashboard = ({ currentUser }) => {
  // State management
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reviewedWork, setReviewedWork] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [reviewMode, setReviewMode] = useState('pending'); // pending, reviewed, all
  const [filters, setFilters] = useState({
    agentId: 'all',
    priority: 'all',
    type: 'all',
    dateRange: '7d'
  });
  const [bulkSelection, setBulkSelection] = useState(new Set());
  const [reviewComment, setReviewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoApproveRules, setAutoApproveRules] = useState([]);
  const [reviewStats, setReviewStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    avgReviewTime: '0h'
  });

  // Sample pending reviews with comprehensive details
  const samplePendingReviews = [
    {
      id: 'REVIEW-001',
      workId: 'WORK-001',
      agentId: 'dashboard-improvement-agent',
      agentAlias: 'Dash',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      type: 'CODE_CHANGE',
      priority: 'HIGH',
      title: 'Real-time Dashboard Metrics Implementation',
      description: 'Added WebSocket-based real-time updates to Admin Dashboard for live metrics',
      changes: {
        files: [
          { path: 'client/src/components/AdminDashboard.js', additions: 145, deletions: 32 },
          { path: 'client/src/components/MetricsWidget.js', additions: 89, deletions: 12 }
        ],
        summary: '+234 lines, -44 lines across 2 files'
      },
      testing: {
        automated: { passed: 15, failed: 0, coverage: '87%' },
        manual: 'Tested on Chrome, Firefox, Safari',
        performance: { before: '2.3s load', after: '1.1s load' }
      },
      impact: {
        level: 'HIGH',
        users: 'All admin users',
        systems: ['Dashboard', 'WebSocket', 'Metrics'],
        risk: 'LOW',
        benefits: ['52% performance improvement', 'Real-time data', 'Better UX']
      },
      commits: ['abc123', 'def456'],
      pullRequest: 'PR #234',
      requiresApproval: true,
      autoApprovalEligible: false,
      approvalReason: 'Significant UI changes require manual review',
      status: 'PENDING_REVIEW',
      confidence: 92,
      aiAnalysis: {
        codeQuality: 'Excellent - follows best practices',
        security: 'No vulnerabilities detected',
        performance: 'Significant improvement measured',
        recommendation: 'APPROVE - Low risk, high benefit'
      }
    },
    {
      id: 'REVIEW-002',
      workId: 'WORK-002',
      agentId: 'security-auditor',
      agentAlias: 'SecOps',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      type: 'SECURITY_FIX',
      priority: 'CRITICAL',
      title: 'Critical Authentication Vulnerability Patch',
      description: 'Fixed JWT signature verification bypass vulnerability',
      changes: {
        files: [
          { path: 'server/middleware/auth.js', additions: 67, deletions: 23 },
          { path: 'server/config/security.js', additions: 45, deletions: 8 }
        ],
        summary: '+112 lines, -31 lines across 2 files'
      },
      testing: {
        automated: { passed: 25, failed: 0, coverage: '100%' },
        penetration: 'Passed external audit',
        vulnerabilities: { before: 3, after: 0 }
      },
      impact: {
        level: 'CRITICAL',
        users: 'All users',
        systems: ['Authentication', 'API Gateway'],
        risk: 'NONE',
        benefits: ['Prevents auth bypass', 'SOC2 compliance', 'Security hardening']
      },
      commits: ['sec789'],
      pullRequest: 'PR #235',
      requiresApproval: true,
      autoApprovalEligible: false,
      approvalReason: 'Security changes always require manual review',
      status: 'PENDING_REVIEW',
      confidence: 98,
      aiAnalysis: {
        codeQuality: 'Good - security-focused implementation',
        security: 'Vulnerability successfully patched',
        performance: 'Negligible impact',
        recommendation: 'APPROVE IMMEDIATELY - Critical security fix'
      }
    },
    {
      id: 'REVIEW-003',
      workId: 'WORK-003',
      agentId: 'performance-optimizer',
      agentAlias: 'Speedy',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      type: 'OPTIMIZATION',
      priority: 'MEDIUM',
      title: 'Database Query Optimization',
      description: 'Added compound indexes and caching for cart queries',
      changes: {
        files: [
          { path: 'server/models/Cart.js', additions: 34, deletions: 12 },
          { path: 'server/services/cartService.js', additions: 56, deletions: 28 }
        ],
        summary: '+90 lines, -40 lines across 2 files'
      },
      testing: {
        automated: { passed: 18, failed: 0, coverage: '92%' },
        loadTest: '1000 concurrent users handled',
        benchmarks: { p95: '0.5s', p99: '0.8s' }
      },
      impact: {
        level: 'MEDIUM',
        users: 'All users using cart features',
        systems: ['Database', 'Cart Service'],
        risk: 'LOW',
        benefits: ['10x query speed', '-45% server load', 'Better scalability']
      },
      commits: ['perf012'],
      pullRequest: 'PR #236',
      requiresApproval: true,
      autoApprovalEligible: true,
      approvalReason: 'Meets auto-approval criteria',
      status: 'PENDING_REVIEW',
      confidence: 88,
      aiAnalysis: {
        codeQuality: 'Good - efficient implementation',
        security: 'No issues',
        performance: 'Major improvement verified',
        recommendation: 'APPROVE - Significant performance gains'
      }
    },
    {
      id: 'REVIEW-004',
      workId: 'WORK-004',
      agentId: 'api-integration-specialist',
      agentAlias: 'API Master',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      type: 'INTEGRATION',
      priority: 'LOW',
      title: 'Spoonacular Rate Limiting Implementation',
      description: 'Added intelligent rate limiting to stay within API limits',
      changes: {
        files: [
          { path: 'server/services/spoonacularService.js', additions: 78, deletions: 15 }
        ],
        summary: '+78 lines, -15 lines in 1 file'
      },
      testing: {
        automated: { passed: 12, failed: 0, coverage: '85%' },
        apiCalls: 'Simulated 1000 requests',
        rateLimiting: 'Successfully stayed under 50/day limit'
      },
      impact: {
        level: 'LOW',
        users: 'Product search users',
        systems: ['Spoonacular API'],
        risk: 'MINIMAL',
        benefits: ['No more 429 errors', '$0 API costs', 'Better reliability']
      },
      commits: ['api567'],
      pullRequest: 'PR #237',
      requiresApproval: false,
      autoApprovalEligible: true,
      approvalReason: 'Low risk change, can be auto-approved',
      status: 'AUTO_APPROVED',
      confidence: 95,
      aiAnalysis: {
        codeQuality: 'Excellent - well-structured',
        security: 'API keys properly handled',
        performance: 'Improved with caching',
        recommendation: 'AUTO-APPROVE - Low risk, clear benefit'
      }
    }
  ];

  // Sample reviewed work
  const sampleReviewedWork = [
    {
      id: 'REVIEW-005',
      workId: 'WORK-005',
      agentId: 'chief-ai-officer',
      agentAlias: 'CAO',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      type: 'STRATEGIC',
      priority: 'HIGH',
      title: 'Agent Task Prioritization System',
      status: 'APPROVED',
      reviewedBy: 'admin',
      reviewedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
      reviewTime: '4 hours',
      reviewComment: 'Excellent strategic decision. Significant efficiency gains observed.',
      deploymentStatus: 'DEPLOYED',
      metrics: {
        beforeReview: { efficiency: '60%', conflicts: 15 },
        afterDeployment: { efficiency: '92%', conflicts: 1 }
      }
    },
    {
      id: 'REVIEW-006',
      workId: 'WORK-006',
      agentId: 'grocery-parser',
      agentAlias: 'Parser',
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
      type: 'FEATURE',
      priority: 'MEDIUM',
      title: 'Enhanced Recipe Parsing Algorithm',
      status: 'REJECTED',
      reviewedBy: 'admin',
      reviewedAt: new Date(Date.now() - 44 * 60 * 60 * 1000),
      reviewTime: '4 hours',
      reviewComment: 'Accuracy regression detected in edge cases. Needs refinement.',
      rejectionReason: 'Failed validation on complex recipes',
      rollbackStatus: 'ROLLED_BACK'
    }
  ];

  // Auto-approval rules
  const defaultAutoApprovalRules = [
    {
      id: 'RULE-001',
      name: 'Low Risk Optimizations',
      enabled: true,
      conditions: {
        type: 'OPTIMIZATION',
        impact: 'LOW',
        testsPassed: true,
        coverageMin: 80
      },
      action: 'AUTO_APPROVE'
    },
    {
      id: 'RULE-002',
      name: 'Documentation Updates',
      enabled: true,
      conditions: {
        type: 'DOCUMENTATION',
        filesPattern: '*.md',
        noCodeChanges: true
      },
      action: 'AUTO_APPROVE'
    },
    {
      id: 'RULE-003',
      name: 'Critical Security Fixes',
      enabled: false,
      conditions: {
        type: 'SECURITY_FIX',
        priority: 'CRITICAL',
        securityScan: 'PASSED'
      },
      action: 'FLAG_FOR_IMMEDIATE_REVIEW'
    }
  ];

  // Load reviews
  useEffect(() => {
    loadReviews();
    const interval = setInterval(loadReviews, 30000);
    return () => clearInterval(interval);
  }, [filters]);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const token = currentUser ? await currentUser.getIdToken() : null;

      // Fetch pending reviews from real API
      const pendingResponse = await fetch(`${apiUrl}/api/agent/work/pending-reviews`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        setPendingReviews(pendingData.reviews || []);
      } else {
        // Fall back to sample data if API fails
        setPendingReviews(samplePendingReviews);
      }

      // Fetch reviewed work
      const reviewedResponse = await fetch(`${apiUrl}/api/agent/work/journal?reviewRequired=true&limit=50`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (reviewedResponse.ok) {
        const reviewedData = await reviewedResponse.json();
        const reviewed = reviewedData.entries?.filter(e =>
          e.approvalStatus === 'APPROVED' || e.approvalStatus === 'REJECTED'
        ) || [];
        setReviewedWork(reviewed);
      } else {
        // Fall back to sample data if API fails
        setReviewedWork(sampleReviewedWork);
      }

      // Set auto-approval rules (these could come from API in the future)
      setAutoApproveRules(defaultAutoApprovalRules);

      // Calculate stats based on real data
      const pending = pendingReviews.length;
      const approved = reviewedWork.filter(r => r.approvalStatus === 'APPROVED').length;
      const rejected = reviewedWork.filter(r => r.approvalStatus === 'REJECTED').length;

      setReviewStats({
        pending,
        approved,
        rejected,
        avgReviewTime: calculateAvgReviewTime(reviewedWork)
      });
    } catch (error) {
      console.error('Failed to load reviews:', error);
      // Fall back to sample data on error
      setPendingReviews(samplePendingReviews);
      setReviewedWork(sampleReviewedWork);
      setAutoApproveRules(defaultAutoApprovalRules);

      setReviewStats({
        pending: samplePendingReviews.length,
        approved: sampleReviewedWork.filter(r => r.status === 'APPROVED').length,
        rejected: sampleReviewedWork.filter(r => r.status === 'REJECTED').length,
        avgReviewTime: '4h'
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentUser]);

  // Helper function to calculate average review time
  const calculateAvgReviewTime = (reviews) => {
    if (!reviews || reviews.length === 0) return 'N/A';

    const times = reviews
      .filter(r => r.reviewedAt && r.timestamp)
      .map(r => new Date(r.reviewedAt) - new Date(r.timestamp));

    if (times.length === 0) return 'N/A';

    const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
    const hours = Math.floor(avgMs / (1000 * 60 * 60));
    const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // Filter reviews
  const filteredReviews = useMemo(() => {
    let reviews = reviewMode === 'pending' ? pendingReviews :
                 reviewMode === 'reviewed' ? reviewedWork :
                 [...pendingReviews, ...reviewedWork];

    if (filters.agentId !== 'all') {
      reviews = reviews.filter(r => r.agentId === filters.agentId);
    }
    if (filters.priority !== 'all') {
      reviews = reviews.filter(r => r.priority === filters.priority);
    }
    if (filters.type !== 'all') {
      reviews = reviews.filter(r => r.type === filters.type);
    }

    return reviews;
  }, [pendingReviews, reviewedWork, reviewMode, filters]);

  // Handle review approval
  const approveReview = async (reviewId, comment = '') => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const token = currentUser ? await currentUser.getIdToken() : null;
      const review = pendingReviews.find(r => r.id === reviewId);

      if (!review) return;

      // Send approval to backend API
      const response = await fetch(`${apiUrl}/api/agent/work/review`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workId: review.workId || review.id,
          approvalStatus: 'APPROVED',
          reviewComment: comment || 'Approved via Admin Dashboard'
        })
      });

      if (response.ok) {
        // Update local state
        const approvedReview = {
          ...review,
          status: 'APPROVED',
          approvalStatus: 'APPROVED',
          reviewedBy: currentUser?.email || 'admin',
          reviewedAt: new Date(),
          reviewComment: comment,
          deploymentStatus: 'PENDING_DEPLOYMENT'
        };

        setPendingReviews(prev => prev.filter(r => r.id !== reviewId));
        setReviewedWork(prev => [approvedReview, ...prev]);

        // Log to monitoring service
        agentMonitoringService.logActivity(review.agentId, 'Work Approved', {
          workId: review.workId || review.id,
          reviewer: currentUser?.email || 'admin',
          comment
        });

        // Reload to get fresh data
        setTimeout(loadReviews, 1000);
      } else {
        const errorData = await response.text();
        throw new Error(`Failed to approve: ${errorData}`);
      }
    } catch (error) {
      console.error('Failed to approve review:', error);
      alert(`Failed to approve review: ${error.message}`);
    }
  };

  // Handle review rejection
  const rejectReview = async (reviewId, reason, comment = '') => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
      const token = currentUser ? await currentUser.getIdToken() : null;
      const review = pendingReviews.find(r => r.id === reviewId);

      if (!review) return;

      // Send rejection to backend API
      const response = await fetch(`${apiUrl}/api/agent/work/review`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workId: review.workId || review.id,
          approvalStatus: 'REJECTED',
          reviewComment: `${reason}: ${comment}`
        })
      });

      if (response.ok) {
        // Update local state
        const rejectedReview = {
          ...review,
          status: 'REJECTED',
          approvalStatus: 'REJECTED',
          reviewedBy: currentUser?.email || 'admin',
          reviewedAt: new Date(),
          reviewComment: comment,
          rejectionReason: reason,
          rollbackStatus: 'PENDING_ROLLBACK'
        };

        setPendingReviews(prev => prev.filter(r => r.id !== reviewId));
        setReviewedWork(prev => [rejectedReview, ...prev]);

        // Log to monitoring service
        agentMonitoringService.logActivity(review.agentId, 'Work Rejected', {
          workId: review.workId || review.id,
          reviewer: currentUser?.email || 'admin',
          reason,
          comment
        });

        // Reload to get fresh data
        setTimeout(loadReviews, 1000);
      } else {
        const errorData = await response.text();
        throw new Error(`Failed to reject: ${errorData}`);
      }
    } catch (error) {
      console.error('Failed to reject review:', error);
      alert(`Failed to reject review: ${error.message}`);
    }
  };

  // Handle bulk approval
  const bulkApprove = async () => {
    for (const reviewId of bulkSelection) {
      await approveReview(reviewId, 'Bulk approved');
    }
    setBulkSelection(new Set());
  };

  // Toggle bulk selection
  const toggleBulkSelection = (reviewId) => {
    const newSelection = new Set(bulkSelection);
    if (newSelection.has(reviewId)) {
      newSelection.delete(reviewId);
    } else {
      newSelection.add(reviewId);
    }
    setBulkSelection(newSelection);
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      'CRITICAL': 'text-red-600 bg-red-50',
      'HIGH': 'text-orange-600 bg-orange-50',
      'MEDIUM': 'text-yellow-600 bg-yellow-50',
      'LOW': 'text-green-600 bg-green-50'
    };
    return colors[priority] || 'text-gray-600 bg-gray-50';
  };

  // Get type icon
  const getTypeIcon = (type) => {
    const icons = {
      'CODE_CHANGE': <Code className="w-4 h-4" />,
      'SECURITY_FIX': <Shield className="w-4 h-4" />,
      'OPTIMIZATION': <Zap className="w-4 h-4" />,
      'INTEGRATION': <Package className="w-4 h-4" />,
      'STRATEGIC': <GitBranch className="w-4 h-4" />,
      'FEATURE': <Star className="w-4 h-4" />,
      'DOCUMENTATION': <FileText className="w-4 h-4" />
    };
    return icons[type] || <Settings className="w-4 h-4" />;
  };

  // Get confidence badge
  const getConfidenceBadge = (confidence) => {
    let color = 'bg-gray-100 text-gray-700';
    if (confidence >= 90) color = 'bg-green-100 text-green-700';
    else if (confidence >= 70) color = 'bg-yellow-100 text-yellow-700';
    else if (confidence >= 50) color = 'bg-orange-100 text-orange-700';
    else color = 'bg-red-100 text-red-700';

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {confidence}% confidence
      </span>
    );
  };

  // Render review card
  const renderReviewCard = (review) => {
    const isSelected = bulkSelection.has(review.id);
    const isPending = review.status === 'PENDING_REVIEW' || review.status === 'AUTO_APPROVED';

    return (
      <div
        key={review.id}
        className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
          isSelected ? 'border-blue-500 bg-blue-50' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            {isPending && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleBulkSelection(review.id)}
                className="mt-1"
              />
            )}
            <div className={`p-2 rounded-lg ${getPriorityColor(review.priority)}`}>
              {getTypeIcon(review.type)}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800">{review.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{review.description}</p>

              {/* Agent and timing */}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {review.agentAlias}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(review.timestamp).toLocaleString()}
                </span>
                {review.pullRequest && (
                  <span className="flex items-center gap-1">
                    <GitPullRequest className="w-3 h-3" />
                    {review.pullRequest}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Confidence badge */}
          {review.confidence && getConfidenceBadge(review.confidence)}
        </div>

        {/* Changes summary */}
        {review.changes && (
          <div className="mb-3 p-3 bg-gray-50 rounded">
            <div className="text-sm font-medium text-gray-700 mb-2">Changes:</div>
            <div className="text-xs text-gray-600">{review.changes.summary}</div>
            {review.changes.files && (
              <div className="mt-2 space-y-1">
                {review.changes.files.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <FileText className="w-3 h-3" />
                    <span className="font-mono">{file.path}</span>
                    <span className="text-green-600">+{file.additions}</span>
                    <span className="text-red-600">-{file.deletions}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Testing results */}
        {review.testing && (
          <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
            {review.testing.automated && (
              <div className="p-2 bg-green-50 rounded">
                <CheckCircle className="w-3 h-3 text-green-600 mb-1" />
                <div className="font-medium">Tests: {review.testing.automated.passed}/{
                  review.testing.automated.passed + review.testing.automated.failed
                }</div>
                <div className="text-gray-600">Coverage: {review.testing.automated.coverage}</div>
              </div>
            )}
            {review.testing.performance && (
              <div className="p-2 bg-blue-50 rounded">
                <TrendingUp className="w-3 h-3 text-blue-600 mb-1" />
                <div className="font-medium">Performance</div>
                <div className="text-gray-600">{review.testing.performance.after}</div>
              </div>
            )}
            {review.testing.vulnerabilities !== undefined && (
              <div className="p-2 bg-orange-50 rounded">
                <Shield className="w-3 h-3 text-orange-600 mb-1" />
                <div className="font-medium">Security</div>
                <div className="text-gray-600">
                  {review.testing.vulnerabilities.after} issues
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Analysis */}
        {review.aiAnalysis && (
          <div className="mb-3 p-3 bg-blue-50 rounded">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">AI Analysis</span>
            </div>
            <div className="text-xs space-y-1">
              <div><strong>Quality:</strong> {review.aiAnalysis.codeQuality}</div>
              <div><strong>Security:</strong> {review.aiAnalysis.security}</div>
              <div><strong>Performance:</strong> {review.aiAnalysis.performance}</div>
              <div className="pt-1 font-medium text-blue-900">
                {review.aiAnalysis.recommendation}
              </div>
            </div>
          </div>
        )}

        {/* Impact assessment */}
        {review.impact && (
          <div className="mb-3 flex items-center gap-4 text-xs">
            <span className={`px-2 py-1 rounded ${
              review.impact.level === 'CRITICAL' ? 'bg-red-100 text-red-700' :
              review.impact.level === 'HIGH' ? 'bg-orange-100 text-orange-700' :
              review.impact.level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {review.impact.level} Impact
            </span>
            <span className="text-gray-600">Risk: {review.impact.risk}</span>
            <span className="text-gray-600">Users: {review.impact.users}</span>
          </div>
        )}

        {/* Review status */}
        {review.status && review.status !== 'PENDING_REVIEW' && (
          <div className="mb-3 p-2 bg-gray-50 rounded">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {review.status === 'APPROVED' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : review.status === 'REJECTED' ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <Clock className="w-4 h-4 text-yellow-600" />
                )}
                <span className="font-medium">{review.status}</span>
              </div>
              {review.reviewedBy && (
                <span className="text-gray-600">
                  by {review.reviewedBy} at {new Date(review.reviewedAt).toLocaleString()}
                </span>
              )}
            </div>
            {review.reviewComment && (
              <div className="mt-2 text-xs text-gray-600 italic">
                "{review.reviewComment}"
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedReview(review)}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Review Details
            </button>
            <button
              onClick={() => approveReview(review.id, 'Quick approval')}
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              title="Quick Approve"
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => rejectReview(review.id, 'Needs review', 'Quick rejection')}
              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              title="Quick Reject"
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Deployment status for approved items */}
        {review.deploymentStatus && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <Package className="w-3 h-3" />
            <span className="font-medium">Deployment:</span>
            <span className={
              review.deploymentStatus === 'DEPLOYED' ? 'text-green-600' :
              review.deploymentStatus === 'PENDING_DEPLOYMENT' ? 'text-yellow-600' :
              'text-gray-600'
            }>
              {review.deploymentStatus}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-blue-600" />
            Work Review Dashboard
          </h2>
          <div className="flex items-center gap-3">
            {/* Stats badges */}
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 rounded-lg">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium">{reviewStats.pending} Pending</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">{reviewStats.approved} Approved</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 rounded-lg">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium">{reviewStats.rejected} Rejected</span>
            </div>
          </div>
        </div>

        {/* View mode tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setReviewMode('pending')}
            className={`px-4 py-2 rounded-lg ${
              reviewMode === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Pending Reviews
          </button>
          <button
            onClick={() => setReviewMode('reviewed')}
            className={`px-4 py-2 rounded-lg ${
              reviewMode === 'reviewed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Reviewed Work
          </button>
          <button
            onClick={() => setReviewMode('all')}
            className={`px-4 py-2 rounded-lg ${
              reviewMode === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            All Work
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-4 gap-3">
          <select
            value={filters.agentId}
            onChange={(e) => setFilters({ ...filters, agentId: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Agents</option>
            <option value="dashboard-improvement-agent">Dash</option>
            <option value="security-auditor">SecOps</option>
            <option value="performance-optimizer">Speedy</option>
            <option value="api-integration-specialist">API Master</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Types</option>
            <option value="CODE_CHANGE">Code Changes</option>
            <option value="SECURITY_FIX">Security Fixes</option>
            <option value="OPTIMIZATION">Optimizations</option>
            <option value="INTEGRATION">Integrations</option>
            <option value="STRATEGIC">Strategic</option>
          </select>

          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* Bulk actions */}
        {bulkSelection.size > 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">
              {bulkSelection.size} items selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={bulkApprove}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                Approve All
              </button>
              <button
                onClick={() => setBulkSelection(new Set())}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reviews list */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Loading reviews...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-8">
            <Archive className="w-12 h-12 mx-auto text-gray-300" />
            <p className="mt-2 text-gray-500">No reviews found</p>
          </div>
        ) : (
          filteredReviews.map(review => renderReviewCard(review))
        )}
      </div>

      {/* Detailed review modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">{selectedReview.title}</h3>
              <button
                onClick={() => setSelectedReview(null)}
                className="p-1 hover:bg-gray-100 rounded text-2xl"
              >
                ×
              </button>
            </div>

            {/* Full details */}
            <div className="space-y-4">
              {/* Complete changes diff */}
              <div>
                <h4 className="font-medium mb-2">Complete Changes:</h4>
                <pre className="p-4 bg-gray-50 rounded overflow-x-auto text-xs">
                  {JSON.stringify(selectedReview.changes, null, 2)}
                </pre>
              </div>

              {/* Testing details */}
              <div>
                <h4 className="font-medium mb-2">Testing Results:</h4>
                <pre className="p-4 bg-gray-50 rounded overflow-x-auto text-xs">
                  {JSON.stringify(selectedReview.testing, null, 2)}
                </pre>
              </div>

              {/* Impact analysis */}
              <div>
                <h4 className="font-medium mb-2">Impact Analysis:</h4>
                <pre className="p-4 bg-gray-50 rounded overflow-x-auto text-xs">
                  {JSON.stringify(selectedReview.impact, null, 2)}
                </pre>
              </div>

              {/* Review actions */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium mb-2">Review Comment:</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  rows="3"
                  placeholder="Add your review comments..."
                />
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => {
                      approveReview(selectedReview.id, reviewComment);
                      setSelectedReview(null);
                      setReviewComment('');
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve & Deploy
                  </button>
                  <button
                    onClick={() => {
                      rejectReview(selectedReview.id, 'Manual review rejection', reviewComment);
                      setSelectedReview(null);
                      setReviewComment('');
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject & Rollback
                  </button>
                  <button
                    onClick={() => setSelectedReview(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkReviewDashboard;