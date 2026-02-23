/**
 * Admin Controller
 * Handles admin dashboard and management endpoints
 */

const adminDashboardService = require('../services/admin-dashboard-service');
const User = require('../models/User');
const CV = require('../models/CV');
const ScoreHistory = require('../models/ScoreHistory');
const { createError } = require('../middleware/error-handlers');

/**
 * Get dashboard overview
 * GET /api/v1/admin/dashboard
 */
const getDashboardOverview = async (req, res, next) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      throw createError('Admin access required', 403, 'AuthorizationError');
    }
    
    const overview = await adminDashboardService.getDashboardOverview();
    
    res.status(200).json({
      success: true,
      ...overview
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed report
 * POST /api/v1/admin/reports/:type
 */
const getDetailedReport = async (req, res, next) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      throw createError('Admin access required', 403, 'AuthorizationError');
    }
    
    const { type } = req.params;
    const { startDate, endDate, segmentBy, ...options } = req.body;
    
    const report = await adminDashboardService.getDetailedReport(type, {
      startDate,
      endDate,
      segmentBy,
      ...options
    });
    
    res.status(200).json({
      success: true,
      ...report
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get user management list
 * GET /api/v1/admin/users
 */
const getUsers = async (req, res, next) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      throw createError('Admin access required', 403, 'AuthorizationError');
    }
    
    const {
      page = 1,
      limit = 20,
      search,
      subscription,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (subscription) {
      query['subscription.type'] = subscription;
    }
    
    // Get users
    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    // Format response
    const formattedUsers = users.map(user => ({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      subscription: user.subscription,
      stats: user.stats,
      usage: user.getUsageStats ? user.getUsageStats() : {},
      funnel: user.funnel,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
    
    res.status(200).json({
      success: true,
      users: formattedUsers,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      },
      filters: {
        search,
        subscription,
        sortBy,
        sortOrder
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get user details
 * GET /api/v1/admin/users/:userId
 */
const getUserDetails = async (req, res, next) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      throw createError('Admin access required', 403, 'AuthorizationError');
    }
    
    const { userId } = req.params;
    
    // Get user
    const user = await User.findById(userId)
      .select('-password -refreshToken');
    
    if (!user) {
      throw createError('User not found', 404, 'NotFoundError');
    }
    
    // Get user's CVs
    const cvs = await CV.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Get user's score history
    const scores = await ScoreHistory.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('cv', 'originalFilename');
    
    // Get funnel progress
    const funnelProgress = user.getUserFunnelProgress ? 
      user.getUserFunnelProgress() : {};
    
    // Get usage stats
    const usageStats = user.getUsageStats ? 
      user.getUsageStats() : {};
    
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscription: user.subscription,
        stats: user.stats,
        usage: usageStats,
        funnel: user.funnel,
        funnelProgress,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      cvs: cvs.map(cv => ({
        id: cv._id,
        filename: cv.originalFilename,
        score: cv.atsScore,
        status: cv.status,
        createdAt: cv.createdAt
      })),
      scores: scores.map(score => ({
        id: score._id,
        cv: score.cv?.originalFilename,
        score: score.score,
        improvement: score.improvement,
        industry: score.industry,
        createdAt: score.createdAt
      })),
      summary: {
        totalCVs: cvs.length,
        totalScores: scores.length,
        avgScore: scores.length > 0 ? 
          Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length) : 0,
        lastActivity: user.lastLogin
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 * PUT /api/v1/admin/users/:userId
 */
const updateUser = async (req, res, next) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      throw createError('Admin access required', 403, 'AuthorizationError');
    }
    
    const { userId } = req.params;
    const updates = req.body;
    
    // Validate updates
    const allowedUpdates = [
      'name',
      'role',
      'isActive',
      'subscription.type',
      'subscription.status'
    ];
    
    const invalidUpdates = Object.keys(updates).filter(
      key => !allowedUpdates.includes(key) && !key.startsWith('subscription.')
    );
    
    if (invalidUpdates.length > 0) {
      throw createError(
        `Invalid updates: ${invalidUpdates.join(', ')}`,
        400,
        'ValidationError'
      );
    }
    
    // Get user
    const user = await User.findById(userId);
    
    if (!user) {
      throw createError('User not found', 404, 'NotFoundError');
    }
    
    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key === 'subscription.type' || key === 'subscription.status') {
        const [, field] = key.split('.');
        user.subscription[field] = updates[key];
      } else {
        user[key] = updates[key];
      }
    });
    
    await user.save({ validateBeforeSave: false });
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscription: user.subscription,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get system health
 * GET /api/v1/admin/health
 */
const getSystemHealth = async (req, res, next) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      throw createError('Admin access required', 403, 'AuthorizationError');
    }
    
    const adminDashboardService = require('../services/admin-dashboard-service');
    const systemHealth = await adminDashboardService.getSystemHealth();
    
    res.status(200).json({
      success: true,
      ...systemHealth
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent activity
 * GET /api/v1/admin/activity
 */
const getRecentActivity = async (req, res, next) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      throw createError('Admin access required', 403, 'AuthorizationError');
    }
    
    const adminDashboardService = require('../services/admin-dashboard-service');
    const recentActivity = await adminDashboardService.getRecentActivity();
    
    res.status(200).json({
      success: true,
      ...recentActivity
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get performance metrics
 * GET /api/v1/admin/performance
 */
const getPerformanceMetrics = async (req, res, next) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      throw createError('Admin access required', 403, 'AuthorizationError');
    }
    
    const adminDashboardService = require('../services/admin-dashboard-service');
    const performanceMetrics = await adminDashboardService.getPerformanceMetrics();
    
    res.status(200).json({
      success: true,
      ...performanceMetrics
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Export data
 * POST /api/v1/admin/export
 */
const exportData = async (req, res, next) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      throw createError('Admin access required', 403, 'AuthorizationError');
    }
    
    const { type, format = 'csv', startDate, endDate } = req.body;
    
    const exportTypes = {
      users: exportUsers,
      cvs: exportCVs,
      scores: exportScores,
      subscriptions: exportSubscriptions
    };
    
    if (!exportTypes[type]) {
      throw createError(`Invalid export type: ${type}`, 400, 'ValidationError');
    }
    
    const data = await exportTypes[type](startDate, endDate);
    const formattedData = format === 'csv' ? formatAsCSV(data) : data;
    
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_export_${Date.now()}.${format}`);
    
    res.send(formattedData);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Export users
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Array>} User data
 */
const exportUsers = async (startDate, endDate) => {
  const query = {};
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  const users = await User.find(query)
    .select('email name role subscription stats funnel lastLogin createdAt')
    .sort({ createdAt: -1 });
  
  return users.map(user => ({
    Email: user.email,
    Name: user.name,
    Role: user.role,
    'Subscription Type': user.subscription.type,
    'Subscription Status': user.subscription.status,
    'CV Count': user.stats.cvCount || 0,
    'Total Optimizations': user.stats.totalOptimizations || 0,
    'Last Login': user.lastLogin,
    'Created At': user.createdAt,
    'First CV Upload': user.funnel.firstCvUpload,
    'First Analysis': user.funnel.firstAnalysis,
    'Upgrade Prompt Shown': user.funnel.upgradePromptShown,
    'Checkout Completed': user.funnel.checkoutCompleted
  }));
};

/**
 * Export CVs
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Array>} CV data
 */
const exportCVs = async (startDate, endDate) => {
  const query = {};
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  const cvs = await CV.find(query)
    .populate('user', 'email')
    .sort({ createdAt: -1 });
  
  return cvs.map(cv => ({
    'User Email': cv.user?.email || 'Unknown',
    'Filename': cv.originalFilename,
    'File Type': cv.extension,
    'File Size': cv.fileSize,
    'ATS Score': cv.atsScore || 'N/A',
    'Status': cv.status,
    'Created At': cv.createdAt,
    'Processed At': cv.processedAt,
    'Text Length': cv.textLength || 0,
    'Upload Source': cv.uploadSource || 'web'
  }));
};

/**
 * Export scores
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Array>} Score data
 */
const exportScores = async (startDate, endDate) => {
  const query = {};
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  const scores = await ScoreHistory.find(query)
    .populate('user', 'email')
    .populate('cv', 'originalFilename')
    .sort({ createdAt: -1 });
  
  return scores.map(score => ({
    'User Email': score.user?.email || 'Unknown',
    'CV Filename': score.cv?.originalFilename || 'Unknown',
    'Score': score.score,
    'Improvement': score.improvement || 0,
    'Industry': score.industry || 'Unknown',
    'Analysis Type': score.analysisType,
    'Trigger': score.trigger,
    'Created At': score.createdAt,
    'Keywords Matched': score.analysis?.keywordAnalysis?.matchedKeywords?.length || 0,
    'Sections Found': score.analysis?.sectionAnalysis?.sections?.length || 0
  }));
};

/**
 * Export subscriptions
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Array>} Subscription data
 */
const exportSubscriptions = async (startDate, endDate) => {
  const users = await exportUsers(startDate, endDate);
  
  return users
    .filter(user => user['Subscription Type'] !== 'free')
    .map(user => ({
      'Email': user.Email,
      'Name': user.Name,
      'Subscription Type': user['Subscription Type'],
      'Subscription Status': user['Subscription Status'],
      'CV Count': user['CV Count'],
      'Total Optimizations': user['Total Optimizations'],
      'Last Login': user['Last Login'],
      'Created At': user['Created At'],
      'Checkout Completed': user['Checkout Completed']
    }));
};

/**
 * Format data as CSV
 * @param {Array} data - Data to format
 * @returns {string} CSV string
 */
const formatAsCSV = (data) => {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value).replace(/"/g, '""');
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
};

/**
 * Send system notification
 * POST /api/v1/admin/notifications
 */
const sendNotification = async (req, res, next) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      throw createError('Admin access required', 403, 'AuthorizationError');
    }
    
    const { type, title, message, targetUsers, targetCriteria } = req.body;
    
    // Validate notification type
    const validTypes = ['email', 'in_app', 'both'];
    if (!validTypes.includes(type)) {
      throw createError(`Invalid notification type: ${type}`, 400, 'ValidationError');
    }
    
    // Build user query
    const userQuery = {};
    
    if (targetUsers && targetUsers.length > 0) {
      userQuery._id = { $in: targetUsers };
    } else if (targetCriteria) {
      if (targetCriteria.subscription) {
        userQuery['subscription.type'] = targetCriteria.subscription;
      }
      if (targetCriteria.minCvCount) {
        userQuery['stats.cvCount'] = { $gte: targetCriteria.minCvCount };
      }
      if (targetCriteria.activeWithinDays) {
        const date = new Date();
        date.setDate(date.getDate() - targetCriteria.activeWithinDays);
        userQuery.lastLogin = { $gte: date };
      }
    }
    
    // Get target users
    const users = await User.find(userQuery).select('email name');
    
    // Create notification record (in production, save to database)
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type,
      title,
      message,
      targetCount: users.length,
      sentBy: req.user.id,
      sentAt: new Date(),
      status: 'sent'
    };
    
    // Simulate sending notifications
    console.log(`Sending ${type} notification to ${users.length} users:`, {
      title,
      message,
      users: users.map(u => u.email)
    });
    
    res.status(200).json({
      success: true,
      message: `Notification sent to ${users.length} users`,
      notification: {
        ...notification,
        users: users.map(u => ({ id: u._id, email: u.email, name: u.name }))
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get system logs
 * GET /api/v1/admin/logs
 */
const getSystemLogs = async (req, res, next) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      throw createError('Admin access required', 403, 'AuthorizationError');
    }
    
    const { type, level, startDate, endDate, limit = 100 } = req.query;
    
    // In production, query from log database
    // For now, return simulated logs
    
    const logs = generateSimulatedLogs({
      type,
      level,
      startDate,
      endDate,
      limit: parseInt(limit)
    });
    
    res.status(200).json({
      success: true,
      logs,
      total: logs.length,
      filters: {
        type,
        level,
        startDate,
        endDate
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Generate simulated logs
 * @param {Object} filters - Log filters
 * @returns {Array} Simulated logs
 */
const generateSimulatedLogs = (filters) => {
  const logTypes = ['auth', 'cv', 'analysis', 'payment', 'system'];
  const logLevels = ['info', 'warn', 'error', 'debug'];
  
  const logs = [];
  const now = new Date();
  
  for (let i = 0; i < (filters.limit || 100); i++) {
    const type = logTypes[Math.floor(Math.random() * logTypes.length)];
    const level = logLevels[Math.floor(Math.random() * logLevels.length)];
    
    // Apply filters
    if (filters.type && filters.type !== type) continue;
    if (filters.level && filters.level !== level) continue;
    
    const timestamp = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    
    if (filters.startDate && timestamp < new Date(filters.startDate)) continue;
    if (filters.endDate && timestamp > new Date(filters.endDate)) continue;
    
    const messages = {
      auth: ['User logged in', 'User registered', 'Password reset requested', 'Session expired'],
      cv: ['CV uploaded', 'CV processed', 'CV analysis completed', 'CV extraction failed'],
      analysis: ['ATS score calculated', 'Industry detected', 'Suggestions generated', 'Comparison completed'],
      payment: ['Payment processed', 'Subscription created', 'Invoice generated', 'Payment failed'],
      system: ['Server started', 'Database connected', 'Cache cleared', 'Backup completed']
    };
    
    const log = {
      id: `log_${timestamp.getTime()}_${i}`,
      timestamp: timestamp.toISOString(),
      type,
      level,
      message: messages[type][Math.floor(Math.random() * messages[type].length)],
      userId: `user_${Math.floor(Math.random() * 1000)}`,
      ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    
    if (level === 'error') {
      log.error = {
        code: `ERR_${type.toUpperCase()}_${Math.floor(Math.random() * 100)}`,
        stack: 'Error stack trace would appear here'
      };
    }
    
    logs.push(log);
  }
  
  // Sort by timestamp (newest first)
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  return logs.slice(0, filters.limit || 100);
};

/**
 * Clear cache
 * POST /api/v1/admin/cache/clear
 */
const clearCache = async (req, res, next) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      throw createError('Admin access required', 403, 'AuthorizationError');
    }
    
    const { cacheType = 'all' } = req.body;
    
    // In production, clear actual cache (Redis, etc.)
    // For now, simulate cache clearing
    
    console.log(`Clearing ${cacheType} cache`);
    
    res.status(200).json({
      success: true,
      message: `Cache cleared: ${cacheType}`,
      timestamp: new Date().toISOString(),
      details: {
        cacheType,
        clearedAt: new Date().toISOString(),
        estimatedSize: '2.5MB',
        itemsCleared: 1250
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Run maintenance task
 * POST /api/v1/admin/maintenance
 */
const runMaintenance = async (req, res, next) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      throw createError('Admin access required', 403, 'AuthorizationError');
    }
    
    const { task } = req.body;
    
    const maintenanceTasks = {
      'cleanup_old_cvs': {
        name: 'Cleanup Old CVs',
        description: 'Remove CVs older than 90 days',
        estimatedTime: '5 minutes'
      },
      'update_keyword_database': {
        name: 'Update Keyword Database',
        description: 'Refresh industry keyword database',
        estimatedTime: '2 minutes'
      },
      'recalculate_scores': {
        name: 'Recalculate Scores',
        description: 'Recalculate ATS scores with updated algorithm',
        estimatedTime: '15 minutes'
      },
      'backup_database': {
        name: 'Backup Database',
        description: 'Create database backup',
        estimatedTime: '10 minutes'
      }
    };
    
    if (!maintenanceTasks[task]) {
      throw createError(`Invalid maintenance task: ${task}`, 400, 'ValidationError');
    }
    
    // Simulate running maintenance task
    console.log(`Running maintenance task: ${task}`);
    
    // Simulate task completion
    setTimeout(() => {
      console.log(`Maintenance task completed: ${task}`);
    }, 1000);
    
    res.status(200).json({
      success: true,
      message: `Maintenance task started: ${maintenanceTasks[task].name}`,
      task: maintenanceTasks[task],
      startedAt: new Date().toISOString(),
      estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardOverview,
  getDetailedReport,
  getUsers,
  getUserDetails,
  updateUser,
  getSystemHealth,
  getRecentActivity,
  getPerformanceMetrics,
  exportData,
  sendNotification,
  getSystemLogs,
  clearCache,
  runMaintenance
};