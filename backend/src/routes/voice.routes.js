/**
 * Voice routes
 * Routes for voice-based CV creation and audio processing
 */

const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voice.controller');
const { authenticate, requireSubscription } = require('../middleware/auth');
const { uploadSingleAudio } = require('../middleware/file-upload');
const Joi = require('joi');

/**
 * Validation schemas
 */
const uploadVoiceCVSchema = Joi.object({
  language: Joi.string().max(10).default('en'),
  prompt: Joi.string().max(500),
  jobDescription: Joi.string().max(5000)
});

const transcribeSchema = Joi.object({
  language: Joi.string().max(10).default('en'),
  prompt: Joi.string().max(500),
  responseFormat: Joi.string().valid('json', 'text').default('json')
});

const translateSchema = Joi.object({
  targetLanguage: Joi.string().max(10).default('en'),
  prompt: Joi.string().max(500),
  responseFormat: Joi.string().valid('json', 'text').default('json')
});

const estimateCostSchema = Joi.object({
  audioDuration: Joi.number().positive().required()
});

const batchTranscribeSchema = Joi.object({
  language: Joi.string().max(10).default('en'),
  prompt: Joi.string().max(500)
});

const convertCVSchema = Joi.object({
  // No body parameters needed for this endpoint
});

const checkAccessSchema = Joi.object({
  feature: Joi.string().required()
});

/**
 * Body validation middleware
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
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
  };
};

/**
 * Query validation middleware
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
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
  };
};

/**
 * Protected routes (authentication required)
 */

// Upload and transcribe audio for CV creation
router.post(
  '/upload',
  authenticate,
  requireSubscription('premium'), // Voice features require premium
  uploadSingleAudio,
  validateBody(uploadVoiceCVSchema),
  voiceController.uploadVoiceCV
);

// Transcribe audio without creating CV
router.post(
  '/transcribe',
  authenticate,
  requireSubscription('premium'),
  uploadSingleAudio,
  validateBody(transcribeSchema),
  voiceController.transcribeAudio
);

// Translate audio
router.post(
  '/translate',
  authenticate,
  requireSubscription('premium'),
  uploadSingleAudio,
  validateBody(translateSchema),
  voiceController.translateAudio
);

// Batch transcribe multiple audio files
router.post(
  '/batch-transcribe',
  authenticate,
  requireSubscription('premium'),
  uploadSingleAudio, // Note: For batch processing, you'd need uploadAudio.array('audio', 10)
  validateBody(batchTranscribeSchema),
  voiceController.batchTranscribe
);

// Convert existing CV to voice notes
router.post(
  '/cv/:id/convert',
  authenticate,
  requireSubscription('premium'),
  validateBody(convertCVSchema),
  voiceController.convertCVToVoiceNotes
);

// Get voice-based CVs for user
router.get(
  '/cvs',
  authenticate,
  requireSubscription('premium'),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    page: Joi.number().integer().min(1).default(1)
  })),
  voiceController.getVoiceCVs
);

// Get voice processing statistics
router.get(
  '/stats',
  authenticate,
  requireSubscription('premium'),
  voiceController.getVoiceStats
);

// Check feature access
// Note: checkFeatureAccess controller function needs to be implemented
// router.post(
//   '/check-access',
//   authenticate,
//   validateBody(checkAccessSchema),
//   voiceController.checkFeatureAccess
// );

/**
 * Public routes (no authentication required)
 */

// Get supported languages
router.get(
  '/languages',
  voiceController.getSupportedLanguages
);

// Get voice service configuration
router.get(
  '/config',
  voiceController.getVoiceConfig
);

// Estimate transcription cost
router.post(
  '/estimate-cost',
  validateBody(estimateCostSchema),
  voiceController.estimateTranscriptionCost
);

/**
 * Health check for voice service
 */
router.get('/health', (req, res) => {
  const whisperConfigured = !!(process.env.OPENAI_API_KEY || process.env.WHISPER_API_KEY);
  const serviceStatus = whisperConfigured ? 'operational' : 'degraded';
  
  res.status(200).json({
    success: true,
    service: 'voice',
    status: serviceStatus,
    timestamp: new Date().toISOString(),
    configuration: {
      whisper: whisperConfigured ? 'configured' : 'missing',
      maxFileSize: '25MB',
      supportedFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm']
    },
    features: {
      transcription: true,
      translation: true,
      batch: true,
      cvCreation: true
    }
  });
});

/**
 * Error handling for voice routes
 */
router.use((error, req, res, next) => {
  // Handle voice-specific errors
  if (error.name === 'FeatureAccessError' && error.message.includes('Voice features')) {
    return res.status(403).json({
      success: false,
      error: 'VoiceAccessRequired',
      message: 'Voice features require premium subscription',
      suggestion: 'Upgrade to Premium plan to access voice features'
    });
  }
  
  if (error.name === 'ValidationError' && error.message.includes('audio file')) {
    return res.status(400).json({
      success: false,
      error: 'InvalidAudioFile',
      message: error.message,
      supportedFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'],
      maxSize: '25MB'
    });
  }
  
  if (error.name === 'WhisperError') {
    return res.status(500).json({
      success: false,
      error: 'TranscriptionError',
      message: 'Failed to process audio file',
      suggestion: 'Check audio format and try again'
    });
  }
  
  // Pass to general error handler
  next(error);
});

module.exports = router;
