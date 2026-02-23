/**
 * Extraction routes
 * Routes for CV text extraction and processing
 */

const express = require('express');
const router = express.Router();
const extractionController = require('../controllers/extraction.controller');
const { authenticate, requireSubscription } = require('../middleware/auth');
const { upload } = require('../middleware/file-upload');
const Joi = require('joi');

/**
 * Validation schemas
 */
const extractFromUploadSchema = Joi.object({
  source: Joi.string().valid('web', 'mobile', 'api', 'voice').default('web'),
  immediateProcessing: Joi.boolean().default(true),
  options: Joi.object({
    includeHtml: Joi.boolean().default(false),
    detectSections: Joi.boolean().default(true),
    detectLanguage: Joi.boolean().default(true)
  })
});

const getTextSchema = Joi.object({
  format: Joi.string().valid('plain', 'json', 'html').default('plain'),
  limit: Joi.number().integer().min(1).max(10000),
  offset: Joi.number().integer().min(0)
});

/**
 * Public routes
 */

// Get supported file types
router.get(
  '/supported-types',
  extractionController.getSupportedFileTypes
);

/**
 * Protected routes (authentication required)
 */

// Extract text from uploaded CV (immediate processing)
router.post(
  '/upload',
  authenticate,
  requireSubscription('basic'),
  upload,
  (req, res, next) => {
    // Validate request body
    const { error, value } = extractFromUploadSchema.validate(req.body, {
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
  extractionController.extractFromUpload
);

// Validate file before upload
router.post(
  '/validate',
  authenticate,
  upload,
  extractionController.validateFile
);

// Extract text from existing CV
router.post(
  '/cv/:id',
  authenticate,
  extractionController.extractCVText
);

// Get extracted text for CV
router.get(
  '/cv/:id/text',
  authenticate,
  (req, res, next) => {
    // Validate query parameters
    const { error, value } = getTextSchema.validate(req.query, {
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
  extractionController.getCVText
);

// Get CV text statistics
router.get(
  '/cv/:id/text/stats',
  authenticate,
  extractionController.getCVTextStats
);

// Get CV sections
router.get(
  '/cv/:id/sections',
  authenticate,
  extractionController.getCVSections
);

// Re-extract text for CV
router.post(
  '/cv/:id/re-extract',
  authenticate,
  extractionController.reExtractCVText
);

/**
 * Batch processing routes (premium feature)
 */

// Batch extract from multiple files
router.post(
  '/batch',
  authenticate,
  requireSubscription('premium'),
  (req, res, next) => {
    // This would require a different upload middleware for multiple files
    // For now, return not implemented
    res.status(501).json({
      success: false,
      error: 'Batch processing not implemented yet',
      message: 'This feature requires premium subscription and is under development'
    });
  }
);

/**
 * Health check for extraction service
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'text-extraction',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    supportedTypes: ['pdf', 'docx'],
    maxFileSize: '10MB'
  });
});

/**
 * Error handling middleware for extraction routes
 */
router.use((error, req, res, next) => {
  // Handle specific extraction errors
  if (error.name === 'ValidationError' && error.message.includes('Unsupported file type')) {
    return res.status(400).json({
      success: false,
      error: 'Unsupported file type',
      message: error.message,
      supportedTypes: ['pdf', 'docx']
    });
  }
  
  if (error.name === 'ValidationError' && error.message.includes('File too large')) {
    return res.status(413).json({
      success: false,
      error: 'File too large',
      message: error.message,
      maxSize: '10MB'
    });
  }
  
  if (error.name === 'ProcessingError' && error.message.includes('Invalid or corrupted')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file',
      message: error.message,
      suggestion: 'Please upload a valid PDF or DOCX file'
    });
  }
  
  if (error.name === 'ProcessingError' && error.message.includes('password protected')) {
    return res.status(400).json({
      success: false,
      error: 'Password protected file',
      message: 'Cannot extract text from password protected files',
      suggestion: 'Remove password protection and try again'
    });
  }
  
  // Pass to general error handler
  next(error);
});

module.exports = router;