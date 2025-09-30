/**
 * Work Review Dashboard Component
 * Comprehensive interface for reviewing, approving, and managing agent work
 * Includes approval workflows, impact analysis, and rollback capabilities
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    dateRange: '24h'
  });
  const [bulkSelection, setBulkSelection] = useState(new Set());
  const [reviewComment, setReviewComment] = useState('');
  const [autoApproveRules, setAutoApproveRules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewStats, setReviewStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    avgReviewTime: 'N/A'
  });

  // Sample data for demonstration
  const samplePendingReviews = [
    {
      id: 'REVIEW-001',
      workId: 'WORK-001',
      agentId: 'dashboard-improvement-agent',
      agentAlias: 'Dash',
      title: 'Enhanced Admin Dashboard Analytics',
      description: 'Added real-time analytics and performance monitoring to admin dashboard',
      type: 'FEATURE',
      priority: 'HIGH',
      confidence: 92,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'PENDING_REVIEW',
      changes: {
        summary: 'Added 3 new components and updated 5 existing files',
        files: [
          { path: 'src/components/Analytics.js', additions: 145, deletions: 12 },
          { path: 'src/components/Dashboard.js', additions: 78, deletions: 23 },
          { path: 'src/services/metrics.js', additions: 234, deletions: 0 }
        ],
        commits: ['a1b2c3d', 'e4f5g6h'],
        pullRequest: '#PR-123'
      },
      testing: {
        automated: { passed: 45, failed: 0, coverage: '89%' },
        manual: { completed: true, notes: 'All features tested successfully' },
        performance: { before: '2.3s', after: '1.8s', improvement: '22%' },
        vulnerabilities: { before: 3, after: 0, fixed: 3 }
      },
      impact: {
        level: 'MEDIUM',
        users: 'All admin users',
        components: ['Dashboard', 'Analytics', 'Reporting'],
        risk: 'Low - backward compatible',
        benefits: ['Improved performance', 'Better insights', 'Real-time updates']
      },
      aiAnalysis: {
        codeQuality: 'Excellent - follows best practices',
        security: 'No vulnerabilities detected',
        performance: 'Optimized - 22% faster load time',
        recommendation: 'APPROVE - High quality implementation with good test coverage'
      }
    },
    {
      id: 'REVIEW-002',
      workId: 'WORK-002',
      agentId: 'security-auditor',
      agentAlias: 'SecOps',
      title: 'Critical Security Patch - XSS Prevention',
      description: 'Fixed potential XSS vulnerability in user input handling',
      type: 'SECURITY_FIX',
      priority: 'CRITICAL',
      confidence: 98,
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      status: 'AUTO_APPROVED',
      changes: {
        summary: 'Updated input sanitization in 8 components',
        files: [
          { path: 'src/utils/sanitize.js', additions: 67, deletions: 12 },
          { path: 'src/components/UserInput.js', additions: 23, deletions: 18 }
        ],
        commits: ['s3c4r5e'],
        pullRequest: '#PR-124'
      },
      testing: {
        automated: { passed: 112, failed: 0, coverage: '94%' },
        security: { scan: 'PASSED', vulnerabilities: 0 },
        manual: { completed: true }
      },
      impact: {
        level: 'CRITICAL',
        users: 'All users',
        components: ['Input handling', 'Forms'],
        risk: 'None - security improvement',
        benefits: ['Prevents XSS attacks', 'Improved input validation']
      },
      aiAnalysis: {
        codeQuality: 'Good',
        security: 'Critical security improvement',
        performance: 'Neutral',
        recommendation: 'AUTO-APPROVE - Critical security fix'
      }
    }
  ];

  const sampleReviewedWork = [
    {
      id: 'REVIEW-005',
      workId: 'WORK-005',
      agentId: 'performance-optimizer',
      agentAlias: 'Speedy',
      title: 'Database Query Optimization',
      description: 'Optimized slow database queries reducing load time by 40%',
      type: 'OPTIMIZATION',
      priority: 'HIGH',
      confidence: 87,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'APPROVED',
      approvalStatus: 'APPROVED',
      reviewedBy: 'admin@cartsmash.com',
      reviewedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
      reviewComment: 'Excellent optimization. Significant performance improvement.',
      deploymentStatus: 'DEPLOYED',
      impact: {
        level: 'HIGH',
        users: 'All users',
        components: ['Database', 'API'],
        benefits: ['40% faster queries', 'Reduced server load']
      }
    }
  ];

  const defaultAutoApprovalRules = [
    {
      id: 'RULE-001',
      name: 'Auto-approve critical security fixes',
      condition: 'type === "SECURITY_FIX" && priority === "CRITICAL"',
      enabled: true
    },
    {
      id: 'RULE-002',
      name: 'Auto-approve high confidence optimizations',
      condition: 'type === "OPTIMIZATION" && confidence >= 95',
      enabled: false
    }
  ];

  // Load reviews on component mount and filter change
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

      // Set auto-approval rules
      setAutoApproveRules(defaultAutoApprovalRules);

      // Calculate stats
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
      // Fall back to sample data
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
  }, [filters, currentUser, pendingReviews.length, reviewedWork]);

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
      await approveReview(reviewId, 'Bulk approval');
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

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    } else {
      return `${minutes}m ago`;
    }
  };

  // Format file change
  const formatFileChange = (file) => {
    const parts = file.path.split('/');
    const fileName = parts[parts.length - 1];
    const dir = parts.slice(0, -1).join('/');
    return {
      fileName,
      dir: dir || 'root',
      additions: file.additions,
      deletions: file.deletions,
      total: file.additions + file.deletions
    };
  };

  // Get priority style
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return { background: '#fee2e2', borderLeft: '4px solid #dc2626', color: '#991b1b' };
      case 'HIGH':
        return { background: '#fed7aa', borderLeft: '4px solid #ea580c', color: '#9a3412' };
      case 'MEDIUM':
        return { background: '#fef3c7', borderLeft: '4px solid #f59e0b', color: '#92400e' };
      case 'LOW':
        return { background: '#dbeafe', borderLeft: '4px solid #3b82f6', color: '#1e40af' };
      default:
        return { background: '#f3f4f6', borderLeft: '4px solid #9ca3af', color: '#4b5563' };
    }
  };

  // Get status style
  const getStatusStyle = (status) => {
    switch (status) {
      case 'APPROVED':
        return { background: '#dcfce7', color: '#166534', icon: '✅' };
      case 'REJECTED':
        return { background: '#fee2e2', color: '#991b1b', icon: '❌' };
      case 'AUTO_APPROVED':
        return { background: '#e0e7ff', color: '#3730a3', icon: '🤖' };
      case 'PENDING_REVIEW':
        return { background: '#fef3c7', color: '#92400e', icon: '⏳' };
      default:
        return { background: '#f3f4f6', color: '#4b5563', icon: '⚡' };
    }
  };

  // Get type icon
  const getTypeIcon = (type) => {
    switch (type) {
      case 'FEATURE':
        return '🚀';
      case 'SECURITY_FIX':
        return '🛡️';
      case 'OPTIMIZATION':
        return '⚡';
      case 'BUG_FIX':
        return '🐛';
      case 'DOCUMENTATION':
        return '📚';
      case 'INTEGRATION':
        return '🔗';
      case 'CODE_CHANGE':
        return '💻';
      default:
        return '⚙️';
    }
  };

  // Render review card
  const renderReviewCard = (review) => {
    const isSelected = bulkSelection.has(review.id);
    const isPending = review.status === 'PENDING_REVIEW' || review.status === 'AUTO_APPROVED';
    const priorityStyle = getPriorityStyle(review.priority);
    const statusStyle = getStatusStyle(review.status);

    return (
      <div
        key={review.id}
        style={{
          ...styles.reviewCard,
          ...priorityStyle,
          ...(isSelected ? styles.reviewCardSelected : {})
        }}
      >
        {/* Header */}
        <div style={styles.reviewHeader}>
          <div style={styles.reviewHeaderLeft}>
            {isPending && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleBulkSelection(review.id)}
                style={styles.checkbox}
              />
            )}
            <span style={styles.typeIcon}>{getTypeIcon(review.type)}</span>
            <div>
              <div style={styles.reviewTitle}>{review.title}</div>
              <div style={styles.reviewMeta}>
                <span>{review.agentAlias}</span>
                <span style={styles.dot}>•</span>
                <span>{formatTimestamp(review.timestamp)}</span>
                {review.pullRequest && (
                  <>
                    <span style={styles.dot}>•</span>
                    <span>{review.pullRequest}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {review.confidence && (
            <div style={styles.confidenceBadge}>
              {review.confidence}%
            </div>
          )}
        </div>

        {/* Description */}
        <div style={styles.reviewDescription}>{review.description}</div>

        {/* Changes Summary */}
        {review.changes && (
          <div style={styles.changesSection}>
            <div style={styles.changesSummary}>{review.changes.summary}</div>
            {review.changes.files && review.changes.files.length > 0 && (
              <div style={styles.filesList}>
                {review.changes.files.slice(0, 3).map((file, idx) => {
                  const formatted = formatFileChange(file);
                  return (
                    <div key={idx} style={styles.fileItem}>
                      <span style={styles.fileName}>{formatted.fileName}</span>
                      <div style={styles.fileStats}>
                        <span style={styles.additions}>+{formatted.additions}</span>
                        <span style={styles.deletions}>-{formatted.deletions}</span>
                      </div>
                    </div>
                  );
                })}
                {review.changes.files.length > 3 && (
                  <div style={styles.moreFiles}>
                    +{review.changes.files.length - 3} more files
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Metrics */}
        {review.testing && (
          <div style={styles.metricsGrid}>
            {review.testing.automated && (
              <div style={styles.metricCard}>
                <div style={styles.metricIcon}>✅</div>
                <div style={styles.metricValue}>
                  {review.testing.automated.passed}/{
                    review.testing.automated.passed + review.testing.automated.failed
                  }
                </div>
                <div style={styles.metricLabel}>Tests</div>
              </div>
            )}
            {review.testing.automated?.coverage && (
              <div style={styles.metricCard}>
                <div style={styles.metricIcon}>📊</div>
                <div style={styles.metricValue}>{review.testing.automated.coverage}</div>
                <div style={styles.metricLabel}>Coverage</div>
              </div>
            )}
            {review.testing.performance && (
              <div style={styles.metricCard}>
                <div style={styles.metricIcon}>⚡</div>
                <div style={styles.metricValue}>{review.testing.performance.improvement || 'N/A'}</div>
                <div style={styles.metricLabel}>Performance</div>
              </div>
            )}
            {review.testing.vulnerabilities !== undefined && (
              <div style={styles.metricCard}>
                <div style={styles.metricIcon}>🛡️</div>
                <div style={styles.metricValue}>{review.testing.vulnerabilities.fixed || 0}</div>
                <div style={styles.metricLabel}>Fixes</div>
              </div>
            )}
          </div>
        )}

        {/* AI Recommendation */}
        {review.aiAnalysis && (
          <div style={styles.aiRecommendation}>
            <div style={styles.aiIcon}>🤖</div>
            <div style={styles.aiText}>{review.aiAnalysis.recommendation}</div>
          </div>
        )}

        {/* Status Badge */}
        {review.status && review.status !== 'PENDING_REVIEW' && (
          <div style={{...styles.statusBadge, backgroundColor: statusStyle.background}}>
            <span>{statusStyle.icon}</span>
            <span style={{color: statusStyle.color}}>{review.status}</span>
            {review.reviewedBy && (
              <span style={styles.statusMeta}>
                by {review.reviewedBy}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div style={styles.actionButtons}>
            <button
              onClick={() => setSelectedReview(review)}
              style={styles.reviewButton}
            >
              Review Details
            </button>
            <button
              onClick={() => approveReview(review.id, 'Quick approval')}
              style={styles.approveButton}
              title="Quick Approve"
            >
              ✅ Approve
            </button>
            <button
              onClick={() => rejectReview(review.id, 'Needs review', 'Quick rejection')}
              style={styles.rejectButton}
              title="Quick Reject"
            >
              ❌ Reject
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render diff viewer
  const renderDiffViewer = (changes) => {
    if (!changes) return null;

    return (
      <div style={styles.diffViewer}>
        <h4 style={styles.diffTitle}>Code Changes</h4>
        {changes.files?.map((file, idx) => (
          <div key={idx} style={styles.diffFile}>
            <div style={styles.diffFileHeader}>
              <span style={styles.diffFileName}>{file.path}</span>
              <div style={styles.diffStats}>
                <span style={styles.diffAdditions}>+{file.additions}</span>
                <span style={styles.diffDeletions}>-{file.deletions}</span>
              </div>
            </div>
            <div style={styles.diffContent}>
              {/* In a real implementation, we would show actual diffs here */}
              <div style={styles.diffPlaceholder}>
                {file.additions} lines added, {file.deletions} lines removed
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render test results
  const renderTestResults = (testing) => {
    if (!testing) return null;

    return (
      <div style={styles.testResults}>
        <h4 style={styles.testTitle}>Test Results</h4>
        <div style={styles.testGrid}>
          {testing.automated && (
            <div style={styles.testCard}>
              <div style={styles.testHeader}>
                <span style={styles.testIcon}>🧪</span>
                <span>Automated Tests</span>
              </div>
              <div style={styles.testBody}>
                <div style={styles.testStat}>
                  <span>Passed:</span>
                  <span style={styles.testPassed}>{testing.automated.passed}</span>
                </div>
                <div style={styles.testStat}>
                  <span>Failed:</span>
                  <span style={styles.testFailed}>{testing.automated.failed || 0}</span>
                </div>
                <div style={styles.testStat}>
                  <span>Coverage:</span>
                  <span>{testing.automated.coverage || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}
          {testing.performance && (
            <div style={styles.testCard}>
              <div style={styles.testHeader}>
                <span style={styles.testIcon}>⚡</span>
                <span>Performance</span>
              </div>
              <div style={styles.testBody}>
                <div style={styles.testStat}>
                  <span>Before:</span>
                  <span>{testing.performance.before}</span>
                </div>
                <div style={styles.testStat}>
                  <span>After:</span>
                  <span style={styles.testImproved}>{testing.performance.after}</span>
                </div>
                <div style={styles.testStat}>
                  <span>Improvement:</span>
                  <span style={styles.testImproved}>{testing.performance.improvement}</span>
                </div>
              </div>
            </div>
          )}
          {testing.security && (
            <div style={styles.testCard}>
              <div style={styles.testHeader}>
                <span style={styles.testIcon}>🛡️</span>
                <span>Security Scan</span>
              </div>
              <div style={styles.testBody}>
                <div style={styles.testStat}>
                  <span>Status:</span>
                  <span style={testing.security.scan === 'PASSED' ? styles.testPassed : styles.testFailed}>
                    {testing.security.scan}
                  </span>
                </div>
                <div style={styles.testStat}>
                  <span>Issues:</span>
                  <span>{testing.security.vulnerabilities || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h2 style={styles.title}>
            ✅ Work Review Dashboard
          </h2>
          <div style={styles.statsRow}>
            <div style={styles.statBadge}>
              <span style={styles.statIcon}>⏳</span>
              <span style={styles.statValue}>{reviewStats.pending}</span>
              <span style={styles.statLabel}>Pending</span>
            </div>
            <div style={{...styles.statBadge, backgroundColor: '#dcfce7'}}>
              <span style={styles.statIcon}>✅</span>
              <span style={styles.statValue}>{reviewStats.approved}</span>
              <span style={styles.statLabel}>Approved</span>
            </div>
            <div style={{...styles.statBadge, backgroundColor: '#fee2e2'}}>
              <span style={styles.statIcon}>❌</span>
              <span style={styles.statValue}>{reviewStats.rejected}</span>
              <span style={styles.statLabel}>Rejected</span>
            </div>
            <div style={styles.statBadge}>
              <span style={styles.statIcon}>⏱️</span>
              <span style={styles.statValue}>{reviewStats.avgReviewTime}</span>
              <span style={styles.statLabel}>Avg Time</span>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div style={styles.tabsRow}>
          <button
            onClick={() => setReviewMode('pending')}
            style={{
              ...styles.tab,
              ...(reviewMode === 'pending' ? styles.tabActive : {})
            }}
          >
            Pending Reviews
          </button>
          <button
            onClick={() => setReviewMode('reviewed')}
            style={{
              ...styles.tab,
              ...(reviewMode === 'reviewed' ? styles.tabActive : {})
            }}
          >
            Reviewed Work
          </button>
          <button
            onClick={() => setReviewMode('all')}
            style={{
              ...styles.tab,
              ...(reviewMode === 'all' ? styles.tabActive : {})
            }}
          >
            All Work
          </button>
        </div>

        {/* Filters */}
        <div style={styles.filtersRow}>
          <select
            value={filters.agentId}
            onChange={(e) => setFilters({ ...filters, agentId: e.target.value })}
            style={styles.filterSelect}
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
            style={styles.filterSelect}
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
            style={styles.filterSelect}
          >
            <option value="all">All Types</option>
            <option value="FEATURE">Features</option>
            <option value="SECURITY_FIX">Security Fixes</option>
            <option value="OPTIMIZATION">Optimizations</option>
            <option value="BUG_FIX">Bug Fixes</option>
            <option value="DOCUMENTATION">Documentation</option>
          </select>

          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            style={styles.filterSelect}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {bulkSelection.size > 0 && (
          <div style={styles.bulkActions}>
            <span style={styles.bulkText}>
              {bulkSelection.size} items selected
            </span>
            <button onClick={bulkApprove} style={styles.bulkApproveBtn}>
              Approve All
            </button>
            <button onClick={() => setBulkSelection(new Set())} style={styles.bulkClearBtn}>
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {isLoading ? (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p>Loading reviews...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyText}>No reviews found</p>
            <p style={styles.emptySubtext}>Try adjusting your filters</p>
          </div>
        ) : (
          <div style={styles.reviewsGrid}>
            {filteredReviews.map(review => renderReviewCard(review))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReview && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{selectedReview.title}</h3>
              <button
                onClick={() => setSelectedReview(null)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* Review details */}
              <div style={styles.modalSection}>
                <h4 style={styles.sectionTitle}>Overview</h4>
                <div style={styles.detailsGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Agent:</span>
                    <span style={styles.detailValue}>{selectedReview.agentAlias}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Type:</span>
                    <span style={styles.detailValue}>
                      {getTypeIcon(selectedReview.type)} {selectedReview.type}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Priority:</span>
                    <span style={{...styles.detailValue, ...getPriorityStyle(selectedReview.priority)}}>
                      {selectedReview.priority}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Confidence:</span>
                    <span style={styles.detailValue}>{selectedReview.confidence}%</span>
                  </div>
                </div>
                <p style={styles.description}>{selectedReview.description}</p>
              </div>

              {/* Code changes */}
              {renderDiffViewer(selectedReview.changes)}

              {/* Test results */}
              {renderTestResults(selectedReview.testing)}

              {/* Impact analysis */}
              {selectedReview.impact && (
                <div style={styles.modalSection}>
                  <h4 style={styles.sectionTitle}>Impact Analysis</h4>
                  <div style={styles.impactGrid}>
                    <div style={styles.impactItem}>
                      <span style={styles.impactLabel}>Level:</span>
                      <span style={{
                        ...styles.impactValue,
                        color: selectedReview.impact.level === 'CRITICAL' ? '#dc2626' :
                               selectedReview.impact.level === 'HIGH' ? '#ea580c' :
                               selectedReview.impact.level === 'MEDIUM' ? '#f59e0b' :
                               '#10b981'
                      }}>
                        {selectedReview.impact.level}
                      </span>
                    </div>
                    <div style={styles.impactItem}>
                      <span style={styles.impactLabel}>Risk:</span>
                      <span style={styles.impactValue}>{selectedReview.impact.risk}</span>
                    </div>
                    <div style={styles.impactItem}>
                      <span style={styles.impactLabel}>Users Affected:</span>
                      <span style={styles.impactValue}>{selectedReview.impact.users}</span>
                    </div>
                  </div>
                  {selectedReview.impact.benefits && (
                    <div style={styles.benefitsList}>
                      <strong>Benefits:</strong>
                      <ul style={styles.benefitsUl}>
                        {selectedReview.impact.benefits.map((benefit, idx) => (
                          <li key={idx} style={styles.benefitItem}>✅ {benefit}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* AI Analysis */}
              {selectedReview.aiAnalysis && (
                <div style={styles.modalSection}>
                  <h4 style={styles.sectionTitle}>🤖 AI Analysis</h4>
                  <div style={styles.aiAnalysisGrid}>
                    <div style={styles.aiAnalysisItem}>
                      <strong>Code Quality:</strong> {selectedReview.aiAnalysis.codeQuality}
                    </div>
                    <div style={styles.aiAnalysisItem}>
                      <strong>Security:</strong> {selectedReview.aiAnalysis.security}
                    </div>
                    <div style={styles.aiAnalysisItem}>
                      <strong>Performance:</strong> {selectedReview.aiAnalysis.performance}
                    </div>
                    <div style={styles.aiRecommendationBox}>
                      <strong>Recommendation:</strong>
                      <p>{selectedReview.aiAnalysis.recommendation}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Review actions */}
              <div style={styles.modalActions}>
                <label style={styles.commentLabel}>Review Comment:</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  style={styles.commentTextarea}
                  rows="3"
                  placeholder="Add your review comments..."
                />
                <div style={styles.actionButtonsRow}>
                  <button
                    onClick={() => {
                      approveReview(selectedReview.id, reviewComment);
                      setSelectedReview(null);
                      setReviewComment('');
                    }}
                    style={styles.modalApproveBtn}
                  >
                    ✅ Approve & Deploy
                  </button>
                  <button
                    onClick={() => {
                      rejectReview(selectedReview.id, 'Manual review rejection', reviewComment);
                      setSelectedReview(null);
                      setReviewComment('');
                    }}
                    style={styles.modalRejectBtn}
                  >
                    ❌ Reject & Rollback
                  </button>
                  <button
                    onClick={() => {
                      setSelectedReview(null);
                      setReviewComment('');
                    }}
                    style={styles.modalCancelBtn}
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

// Comprehensive styles object
const styles = {
  container: {
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#f9fafb',
    minHeight: '100vh'
  },

  // Header styles
  header: {
    marginBottom: '24px'
  },

  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },

  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#111827',
    margin: 0
  },

  statsRow: {
    display: 'flex',
    gap: '12px'
  },

  statBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px'
  },

  statIcon: {
    fontSize: '18px'
  },

  statValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#111827'
  },

  statLabel: {
    fontSize: '14px',
    color: '#6b7280'
  },

  // Tabs
  tabsRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '8px'
  },

  tab: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  tabActive: {
    backgroundColor: '#3b82f6',
    color: 'white'
  },

  // Filters
  filtersRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px'
  },

  filterSelect: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },

  // Bulk actions
  bulkActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    marginBottom: '16px'
  },

  bulkText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e40af'
  },

  bulkApproveBtn: {
    padding: '6px 12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  bulkClearBtn: {
    padding: '6px 12px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  // Content
  content: {
    minHeight: '400px'
  },

  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    color: '#6b7280'
  },

  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },

  empty: {
    textAlign: 'center',
    padding: '60px'
  },

  emptyText: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: '8px'
  },

  emptySubtext: {
    fontSize: '14px',
    color: '#9ca3af'
  },

  // Reviews grid
  reviewsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '20px'
  },

  // Review card
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'box-shadow 0.2s',
    cursor: 'default'
  },

  reviewCardSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6'
  },

  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },

  reviewHeaderLeft: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    flex: 1
  },

  checkbox: {
    marginTop: '2px',
    cursor: 'pointer'
  },

  typeIcon: {
    fontSize: '24px'
  },

  reviewTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px'
  },

  reviewMeta: {
    fontSize: '13px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  dot: {
    fontSize: '8px'
  },

  confidenceBadge: {
    padding: '4px 8px',
    backgroundColor: '#10b981',
    color: 'white',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },

  reviewDescription: {
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '16px',
    lineHeight: '1.5'
  },

  // Changes section
  changesSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px'
  },

  changesSummary: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px'
  },

  filesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },

  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px'
  },

  fileName: {
    fontFamily: 'monospace',
    color: '#4b5563'
  },

  fileStats: {
    display: 'flex',
    gap: '8px'
  },

  additions: {
    color: '#10b981',
    fontWeight: '500'
  },

  deletions: {
    color: '#ef4444',
    fontWeight: '500'
  },

  moreFiles: {
    fontSize: '12px',
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: '4px'
  },

  // Metrics grid
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
    gap: '8px',
    marginBottom: '16px'
  },

  metricCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '8px',
    textAlign: 'center'
  },

  metricIcon: {
    fontSize: '16px',
    marginBottom: '4px'
  },

  metricValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827'
  },

  metricLabel: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '2px'
  },

  // AI recommendation
  aiRecommendation: {
    display: 'flex',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#e0e7ff',
    borderRadius: '8px',
    marginBottom: '16px'
  },

  aiIcon: {
    fontSize: '20px'
  },

  aiText: {
    fontSize: '13px',
    color: '#3730a3',
    fontWeight: '500',
    lineHeight: '1.4'
  },

  // Status badge
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '13px'
  },

  statusMeta: {
    marginLeft: 'auto',
    fontSize: '12px',
    color: '#6b7280'
  },

  // Action buttons
  actionButtons: {
    display: 'flex',
    gap: '8px'
  },

  reviewButton: {
    flex: 1,
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },

  approveButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },

  rejectButton: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },

  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },

  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '900px',
    maxHeight: '85vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb'
  },

  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    margin: 0
  },

  modalClose: {
    fontSize: '28px',
    color: '#6b7280',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    lineHeight: '1'
  },

  modalBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px'
  },

  modalSection: {
    marginBottom: '24px'
  },

  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '12px'
  },

  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '16px'
  },

  detailItem: {
    display: 'flex',
    gap: '8px'
  },

  detailLabel: {
    fontSize: '14px',
    color: '#6b7280'
  },

  detailValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827'
  },

  description: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.5'
  },

  // Diff viewer
  diffViewer: {
    marginBottom: '24px'
  },

  diffTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '12px'
  },

  diffFile: {
    marginBottom: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden'
  },

  diffFileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb'
  },

  diffFileName: {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#111827',
    fontWeight: '500'
  },

  diffStats: {
    display: 'flex',
    gap: '12px',
    fontSize: '13px'
  },

  diffAdditions: {
    color: '#10b981',
    fontWeight: '500'
  },

  diffDeletions: {
    color: '#ef4444',
    fontWeight: '500'
  },

  diffContent: {
    padding: '12px',
    backgroundColor: '#ffffff'
  },

  diffPlaceholder: {
    fontSize: '13px',
    color: '#6b7280',
    fontStyle: 'italic'
  },

  // Test results
  testResults: {
    marginBottom: '24px'
  },

  testTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '12px'
  },

  testGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  },

  testCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px'
  },

  testHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },

  testIcon: {
    fontSize: '18px'
  },

  testBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  testStat: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#6b7280'
  },

  testPassed: {
    color: '#10b981',
    fontWeight: '500'
  },

  testFailed: {
    color: '#ef4444',
    fontWeight: '500'
  },

  testImproved: {
    color: '#3b82f6',
    fontWeight: '500'
  },

  // Impact analysis
  impactGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '16px'
  },

  impactItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },

  impactLabel: {
    fontSize: '13px',
    color: '#6b7280'
  },

  impactValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827'
  },

  benefitsList: {
    marginTop: '12px'
  },

  benefitsUl: {
    marginTop: '8px',
    paddingLeft: '20px'
  },

  benefitItem: {
    fontSize: '13px',
    color: '#4b5563',
    marginBottom: '4px',
    listStyle: 'none'
  },

  // AI Analysis
  aiAnalysisGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  aiAnalysisItem: {
    fontSize: '14px',
    color: '#4b5563'
  },

  aiRecommendationBox: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#e0e7ff',
    borderRadius: '8px'
  },

  // Modal actions
  modalActions: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '20px'
  },

  commentLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px'
  },

  commentTextarea: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },

  actionButtonsRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px'
  },

  modalApproveBtn: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  modalRejectBtn: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  modalCancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  }
};

// Add keyframes for spinner animation
const styleSheet = document.styleSheets[0];
const keyframes = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
if (styleSheet && styleSheet.insertRule) {
  try {
    styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
  } catch (e) {
    // Fallback for browsers that don't support insertRule for keyframes
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
  }
}

export default WorkReviewDashboard;