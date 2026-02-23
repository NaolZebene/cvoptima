/**
 * Score History routes
 * Routes for tracking and analyzing ATS score history
 */

const express = require('express');
const router = express.Router();
const scoreHistoryController = require('../controllers/score-history.controller');
const { authenticate, requireSubscription } = require('../middleware/auth');
const Joi = require('joi');

/**
 * Validation schemas
 */
const updateScoreHistorySchema = Joi.object({
  notes: Joi.string().max(500),
  tags: Joi.array().items(Joi.string().max(50)),
  includeInStats: Joi.boolean(),
  suggestions: Joi.array().items(
    Joi.object({
      type: Joi.string(),
      description: Joi.string(),
      priority: Joi.string().valid('low', 'medium', 'high'),
      action: Joi.string(),
      implemented: Joi.boolean(),
      implementedAt: Joi.date()
    })
  )
});

const querySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  page: Joi.number().integer().min(1).default(1),
  analysisType: Joi.string().valid('initial', 'reanalysis', 'job_comparison', 'automatic', 'manual'),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  minScore: Joi.number().integer().min(0).max(100),
  maxScore: Joi.number().integer().min(0).max(100),
  sort: Joi.string().default('-createdAt'),
  format: Joi.string().valid('csv').default('csv')
});

/**
 * Protected routes (authentication required)
 */

// Get score history for CV
router.get(
  '/cv/:id/history',
  authenticate,
  requireSubscription('basic'),
  (req, res, next) => {
    const { error, value } = querySchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.statusCode = 400;
      validationError.details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      return next(validationError);
    }
    
    req.query = value;
    next();
  },
  scoreHistoryController.getCVScoreHistory
);

// Get score statistics for CV
router.get(
  '/cv/:id/stats',
  authenticate,
  requireSubscription('basic'),
  scoreHistoryController.getCVScoreStats
);

// Get improvement trends for CV
router.get(
  '/cv/:id/trends',
  authenticate,
  requireSubscription('basic'),
  (req, res, next) => {
    const { error, value } = Joi.object({
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso()
    }).validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.statusCode = 400;
      validationError.details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      return next(validationError);
    }
    
    req.query = value;
    next();
  },
  scoreHistoryController.getImprovementTrends
);

// Get implemented suggestions for CV
router.get(
  '/cv/:id/suggestions/implemented',
  authenticate,
  requireSubscription('basic'),
  scoreHistoryController.getImplementedSuggestions
);

// Get pending suggestions for CV
router.get(
  '/cv/:id/suggestions/pending',
  authenticate,
  requireSubscription('basic'),
  scoreHistoryController.getPendingSuggestions
);

// Export score history as CSV
router.get(
  '/cv/:id/export',
  authenticate,
  requireSubscription('premium'),
  (req, res, next) => {
    const { error, value } = Joi.object({
      format: Joi.string().valid('csv').default('csv')
    }).validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.statusCode = 400;
      validationError.details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      return next(validationError);
    }
    
    req.query = value;
    next();
  },
  scoreHistoryController.exportScoreHistory
);

// Get specific score history entry
router.get(
  '/:id',
  authenticate,
  requireSubscription('basic'),
  scoreHistoryController.getScoreHistoryEntry
);

// Update score history entry
router.put(
  '/:id',
  authenticate,
  requireSubscription('basic'),
  (req, res, next) => {
    const { error, value } = updateScoreHistorySchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.statusCode = 400;
      validationError.details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      return next(validationError);
    }
    
    req.body = value;
    next();
  },
  scoreHistoryController.updateScoreHistory
);

// Delete score history entry
router.delete(
  '/:id',
  authenticate,
  requireSubscription('basic'),
  scoreHistoryController.deleteScoreHistory
);

// Mark suggestion as implemented
router.post(
  '/:id/suggestions/:index/implement',
  authenticate,
  requireSubscription('basic'),
  scoreHistoryController.markSuggestionImplemented
);

// Get user score statistics
router.get(
  '/user/stats',
  authenticate,
  requireSubscription('basic'),
  scoreHistoryController.getUserScoreStats
);

// Get user score history
router.get(
  '/user/history',
  authenticate,
  requireSubscription('basic'),
  (req, res, next) => {
    const { error, value } = querySchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.statusCode = 400;
      validationError.details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      return next(validationError);
    }
    
    req.query = value;
    next();
  },
  scoreHistoryController.getUserScoreHistory
);

// Compare two score entries
router.get(
  '/compare/:entry1Id/:entry2Id',
  authenticate,
  requireSubscription('basic'),
  scoreHistoryController.compareScoreEntries
);

/**
 * Admin routes (admin role required)
 */

// Cleanup old score history (admin only)
router.post(
  '/admin/cleanup',
  authenticate,
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    next();
  },
  async (req, res, next) => {
    try {
      const { daysOld = 365 } = req.body;
      
      const ScoreHistory = require('../models/ScoreHistory');
      const deletedCount = await ScoreHistory.cleanupOldEntries(daysOld);
      
      res.status(200).json({
        success: true,
        message: `Cleaned up ${deletedCount} old score history entries`,
        deletedCount,
        daysOld
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Health check for score history service
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'score-history',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      historyTracking: true,
      statistics: true,
      improvementTrends: true,
      suggestionTracking: true,
      export: true,
      comparison: true
    }
  });
});

/**
 * Error handling middleware for score history routes
 */
router.use((error, req, res, next) => {
  // Handle specific score history errors
  if (error.name === 'ValidationError' && error.message.includes('Invalid suggestion index')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid suggestion',
      message: error.message,
      suggestion: 'Provide a valid suggestion index'
    });
  }
  
  if (error.name === 'ValidationError' && error.message.includes('Cannot delete initial analysis')) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete initial analysis',
      message: 'Initial analysis entries cannot be deleted',
      suggestion: 'You can only delete re-analysis or comparison entries'
    });
  }
  
  if (error.name === 'NotFoundError' && error.message.includes('No score history to export')) {
    return res.status(404).json({
      success: false,
      error: 'No history to export',
      message: 'No score history found for this CV',
      suggestion: 'Analyze the CV first to generate score history'
    });
  }
  
  // Pass to general error handler
  next(error);
});

module.exports = router;