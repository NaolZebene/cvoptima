/**
 * CV routes
 * Routes for CV upload, processing, and management
 */

const express = require('express');
const router = express.Router();
const cvController = require('../controllers/cv.controller');
const { authenticate, optionalAuth, requireSubscription } = require('../middleware/auth');
const { upload } = require('../middleware/file-upload');
const Joi = require('joi');

/**
 * Validation schemas
 */
const uploadCVSchema = Joi.object({
  source: Joi.string().valid('web', 'mobile', 'api', 'voice').default('web'),
  tags: Joi.array().items(Joi.string().trim().max(50)),
  customFields: Joi.object({
    jobTitle: Joi.string().trim().max(100),
    targetIndustry: Joi.string().trim().max(100),
    targetCompany: Joi.string().trim().max(100),
    notes: Joi.string().trim().max(500)
  })
});

const updateCVSchema = Joi.object({
  tags: Joi.array().items(Joi.string().trim().max(50)),
  customFields: Joi.object({
    jobTitle: Joi.string().trim().max(100),
    targetIndustry: Joi.string().trim().max(100),
    targetCompany: Joi.string().trim().max(100),
    notes: Joi.string().trim().max(500)
  }),
  isPublic: Joi.boolean()
});

const shareCVSchema = Joi.object({
  expiresInHours: Joi.number().integer().min(1).max(720).default(24) // Max 30 days
});

const querySchema = Joi.object({
  status: Joi.string().valid('uploaded', 'processing', 'processed', 'error', 'archived'),
  limit: Joi.number().integer().min(1).max(100).default(20),
  page: Joi.number().integer().min(1).default(1),
  sort: Joi.string().default('-createdAt')
});

/**
 * Public routes (no authentication required)
 */

// Get shared CV by token
router.get(
  '/share/:token',
  cvController.getSharedCV
);

/**
 * Protected routes (authentication required)
 */

// Upload CV (requires basic subscription)
router.post(
  '/upload',
  authenticate,
  requireSubscription('basic'),
  upload,
  (req, res, next) => {
    // Validate request body
    const { error, value } = uploadCVSchema.validate(req.body, {
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
  cvController.uploadCV
);

// Get user's CVs
router.get(
  '/',
  authenticate,
  (req, res, next) => {
    // Validate query parameters
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
  cvController.getCVs
);

// Get single CV
router.get(
  '/:id',
  authenticate,
  cvController.getCV
);

// Update CV
router.put(
  '/:id',
  authenticate,
  (req, res, next) => {
    const { error, value } = updateCVSchema.validate(req.body, {
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
  cvController.updateCV
);

// Delete CV
router.delete(
  '/:id',
  authenticate,
  cvController.deleteCV
);

// Share CV
router.post(
  '/:id/share',
  authenticate,
  (req, res, next) => {
    const { error, value } = shareCVSchema.validate(req.body, {
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
  cvController.shareCV
);

// Revoke share
router.delete(
  '/:id/share',
  authenticate,
  cvController.revokeShare
);

// Download CV file
router.get(
  '/:id/download',
  authenticate,
  cvController.downloadCV
);

// Get CV file (view)
router.get(
  '/:id/file',
  authenticate,
  cvController.getCVFile
);

// Process CV
router.post(
  '/:id/process',
  authenticate,
  cvController.processCV
);

// Get CV processing status
router.get(
  '/:id/status',
  authenticate,
  cvController.getCVStatus
);

/**
 * Admin routes (admin role required)
 */

// Get all CVs (admin only)
router.get(
  '/admin/all',
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
      const CV = require('../models/CV');
      const { limit = 50, page = 1 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const cvs = await CV.find()
        .populate('user', 'email firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const total = await CV.countDocuments();
      
      res.status(200).json({
        success: true,
        count: cvs.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        cvs: cvs.map(cv => cv.toJSON())
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get CV by ID (admin only)
router.get(
  '/admin/:id',
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
      const CV = require('../models/CV');
      const cv = await CV.findById(req.params.id)
        .populate('user', 'email firstName lastName');
      
      if (!cv) {
        return res.status(404).json({
          success: false,
          error: 'CV not found'
        });
      }
      
      res.status(200).json({
        success: true,
        cv: cv.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }
);

// Cleanup old CVs (admin only)
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
      const CV = require('../models/CV');
      const { daysOld = 30 } = req.body;
      
      const deletedCount = await CV.cleanupOldCVs(daysOld);
      
      res.status(200).json({
        success: true,
        message: `Cleaned up ${deletedCount} old CVs`,
        deletedCount
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Health check endpoint for CV service
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'cv',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uploadDir: process.env.NODE_ENV === 'production' ? 'configured' : 'local'
  });
});

module.exports = router;