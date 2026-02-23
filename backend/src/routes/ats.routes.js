/**
 * ATS (Applicant Tracking System) routes
 * Routes for CV analysis and scoring
 */

const express = require('express');
const router = express.Router();
const atsController = require('../controllers/ats.controller');
const { authenticate, requireSubscription } = require('../middleware/auth');
const Joi = require('joi');

/**
 * Validation schemas
 */
const analyzeCVSchema = Joi.object({
  cvId: Joi.string().hex().length(24),
  cvText: Joi.string().max(100000), // Max 100KB of text
  jobDescription: Joi.string().max(50000),
  jobKeywords: Joi.array().items(Joi.string().max(100))
}).or('cvId', 'cvText'); // Either cvId or cvText is required

const compareWithJobSchema = Joi.object({
  cvId: Joi.string().hex().length(24),
  cvText: Joi.string().max(100000),
  jobDescription: Joi.string().max(50000).required()
}).or('cvId', 'cvText'); // Either cvId or cvText is required

const reanalyzeCVSchema = Joi.object({
  jobDescription: Joi.string().max(50000),
  jobKeywords: Joi.array().items(Joi.string().max(100)),
  previousScore: Joi.number().min(0).max(100)
});

const querySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10)
});

/**
 * Public routes (no authentication required)
 */

// Get available industries
router.get(
  '/industries',
  atsController.getIndustries
);

// Get industry keywords (public, for marketing pages)
router.get(
  '/industries/:industry/keywords',
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
  atsController.getIndustryKeywords
);

/**
 * Protected routes (authentication required)
 */

// Analyze CV text
router.post(
  '/analyze',
  authenticate,
  requireSubscription('basic'),
  (req, res, next) => {
    const { error, value } = analyzeCVSchema.validate(req.body, {
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
  atsController.analyzeCV
);

// Get ATS score for specific CV
router.get(
  '/cv/:id/score',
  authenticate,
  atsController.getCVScore
);

// Compare CV with job description
router.post(
  '/compare',
  authenticate,
  requireSubscription('basic'),
  (req, res, next) => {
    const { error, value } = compareWithJobSchema.validate(req.body, {
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
  atsController.compareWithJob
);

// Get CV analysis history
router.get(
  '/cv/:id/history',
  authenticate,
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
  atsController.getAnalysisHistory
);

// Re-analyze CV
router.post(
  '/cv/:id/re-analyze',
  authenticate,
  requireSubscription('basic'),
  (req, res, next) => {
    const { error, value } = reanalyzeCVSchema.validate(req.body, {
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
  atsController.reanalyzeCV
);

// Get user ATS statistics
router.get(
  '/stats',
  authenticate,
  atsController.getUserStats
);

/**
 * Premium features (premium subscription required)
 */

// Batch analyze multiple CVs
router.post(
  '/batch-analyze',
  authenticate,
  requireSubscription('premium'),
  (req, res, next) => {
    // This would be a premium feature
    res.status(501).json({
      success: false,
      error: 'Batch analysis not implemented yet',
      message: 'This feature requires premium subscription and is under development'
    });
  }
);

// Advanced job matching
router.post(
  '/advanced-match',
  authenticate,
  requireSubscription('premium'),
  (req, res, next) => {
    // This would be a premium feature
    res.status(501).json({
      success: false,
      error: 'Advanced matching not implemented yet',
      message: 'This feature requires premium subscription and is under development'
    });
  }
);

/**
 * Health check for ATS service
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'ats-scoring',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      cvAnalysis: true,
      jobComparison: true,
      industryKeywords: true,
      scoring: true,
      suggestions: true
    },
    limits: {
      maxTextLength: '100KB',
      maxJobDescription: '50KB',
      maxKeywords: 100
    }
  });
});

/**
 * Error handling middleware for ATS routes
 */
router.use((error, req, res, next) => {
  // Handle specific ATS errors
  if (error.name === 'ValidationError' && error.message.includes('CV text not extracted')) {
    return res.status(400).json({
      success: false,
      error: 'CV text not extracted',
      message: 'Please extract text from the CV before analysis',
      suggestion: 'Use the /api/v1/extract/cv/:id endpoint first'
    });
  }
  
  if (error.name === 'ProcessingError' && error.message.includes('ATS scoring failed')) {
    return res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: 'Could not analyze the CV text',
      suggestion: 'Try again with simpler text or check the CV format'
    });
  }
  
  // Pass to general error handler
  next(error);
});

module.exports = router;