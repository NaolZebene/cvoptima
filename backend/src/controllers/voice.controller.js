/**
 * Voice Controller
 * Handles voice-based CV creation and audio processing
 * Updated to use DeepSeek Speech API instead of Whisper
 */

const fs = require('fs').promises;
const path = require('path');
const CV = require('../models/CV');
const User = require('../models/User');
const deepseekSpeechService = require('../services/deepseek-speech-service');
const textExtractionService = require('../services/text-extraction');
const atsService = require('../services/ats-scoring');
const scoreHistoryService = require('../services/score-history');
const { createError } = require('../middleware/error-handlers');

/**
 * Upload and transcribe audio for CV creation
 * POST /api/v1/voice/upload
 */
const uploadVoiceCV = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      throw createError('No audio file uploaded', 400, 'ValidationError');
    }
    
    const user = req.userObj;
    const fileInfo = req.fileInfo;
    
    // Check if user can use voice features
    const stripeService = require('../services/stripe-service');
    if (!stripeService.canPerformAction(user, 'use_voice_features')) {
      throw createError(
        'Voice features require premium subscription',
        403,
        'AuthorizationError'
      );
    }
    
    // Validate audio file
    await deepseekSpeechService.validateAudioFile(fileInfo.path, req.file.size);
    
    // Estimate cost
    const audioDuration = req.body.duration || 60; // Default 60 seconds
    const costEstimation = deepseekSpeechService.estimateCost(audioDuration);
    
    if (!costEstimation.withinLimits) {
      throw createError(
        `Audio exceeds free tier limits: ${costEstimation.message}`,
        400,
        'ValidationError'
      );
    }
    
    // Read audio file
    const audioBuffer = await fs.readFile(fileInfo.path);
    
    // Transcribe audio using DeepSeek
    const transcription = await deepseekSpeechService.transcribeAudio(audioBuffer, {
      language: req.body.language || 'en',
      prompt: req.body.prompt || 'Transcribe this CV information',
    });
    
    // Cleanup uploaded file
    try {
      await fs.unlink(fileInfo.path);
    } catch (cleanupError) {
      console.error('Error cleaning up audio file:', cleanupError);
    }
    
    // Extract text from transcription
    const extractedText = await textExtractionService.extractFromText(transcription.text);
    
    // Create CV from transcribed text
    const cvData = {
      userId: user._id,
      originalText: transcription.text,
      extractedData: extractedText,
      source: 'voice',
      audioInfo: {
        duration: audioDuration,
        language: transcription.language || req.body.language || 'en',
        transcriptionId: transcription.id,
      },
      metadata: {
        fileName: fileInfo.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      }
    };
    
    const cv = await CV.create(cvData);
    
    // Update user's voice usage
    await User.findByIdAndUpdate(user._id, {
      $inc: {
        'usage.voiceTranscriptions.currentMonth.count': 1,
        'usage.voiceTranscriptions.total': 1,
        'usage.voiceTranscriptions.totalDuration': audioDuration,
      },
      $set: {
        'funnel.firstVoiceUse': new Date(),
      }
    });
    
    // Perform ATS analysis
    const analysis = await atsService.analyzeCV(cv);
    
    // Save score history
    await scoreHistoryService.createScoreHistory({
      userId: user._id,
      cvId: cv._id,
      scores: analysis.scores,
      overallScore: analysis.overallScore,
      analysisType: 'voice',
    });
    
    res.status(201).json({
      success: true,
      message: 'Voice CV created successfully',
      cv: {
        id: cv._id,
        originalText: cv.originalText,
        extractedData: cv.extractedData,
        source: cv.source,
        createdAt: cv.createdAt,
      },
      transcription: {
        text: transcription.text,
        language: transcription.language,
        duration: audioDuration,
      },
      analysis: {
        overallScore: analysis.overallScore,
        scores: analysis.scores,
        suggestions: analysis.suggestions,
      },
      cost: costEstimation,
    });
    
  } catch (error) {
    // Cleanup file if error occurred
    if (req.file && req.fileInfo && req.fileInfo.path) {
      try {
        await fs.unlink(req.fileInfo.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file after error:', cleanupError);
      }
    }
    
    next(error);
  }
};

/**
 * Transcribe audio only (without creating CV)
 * POST /api/v1/voice/transcribe
 */
const transcribeAudio = async (req, res, next) => {
  try {
    if (!req.file) {
      throw createError('No audio file uploaded', 400, 'ValidationError');
    }
    
    const user = req.userObj;
    const fileInfo = req.fileInfo;
    
    // Check voice feature access
    const stripeService = require('../services/stripe-service');
    if (!stripeService.canPerformAction(user, 'use_voice_features')) {
      throw createError(
        'Voice features require premium subscription',
        403,
        'AuthorizationError'
      );
    }
    
    // Validate audio file
    await deepseekSpeechService.validateAudioFile(fileInfo.path, req.file.size);
    
    // Read audio file
    const audioBuffer = await fs.readFile(fileInfo.path);
    
    // Transcribe using DeepSeek
    const transcription = await deepseekSpeechService.transcribeAudio(audioBuffer, {
      language: req.body.language || 'en',
      prompt: req.body.prompt,
      response_format: req.body.response_format || 'json',
    });
    
    // Cleanup uploaded file
    try {
      await fs.unlink(fileInfo.path);
    } catch (cleanupError) {
      console.error('Error cleaning up audio file:', cleanupError);
    }
    
    // Update usage
    const audioDuration = req.body.duration || 60;
    await User.findByIdAndUpdate(user._id, {
      $inc: {
        'usage.voiceTranscriptions.currentMonth.count': 1,
        'usage.voiceTranscriptions.total': 1,
        'usage.voiceTranscriptions.totalDuration': audioDuration,
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Audio transcribed successfully',
      transcription: {
        text: transcription.text,
        language: transcription.language,
        duration: audioDuration,
        wordCount: transcription.text.split(/\s+/).length,
      },
      metadata: {
        model: transcription.model || 'deepseek-speech',
        processingTime: transcription.processing_time,
      }
    });
    
  } catch (error) {
    if (req.file && req.fileInfo && req.fileInfo.path) {
      try {
        await fs.unlink(req.fileInfo.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file after error:', cleanupError);
      }
    }
    
    next(error);
  }
};

/**
 * Translate audio to another language
 * POST /api/v1/voice/translate
 */
const translateAudio = async (req, res, next) => {
  try {
    if (!req.file) {
      throw createError('No audio file uploaded', 400, 'ValidationError');
    }
    
    const user = req.userObj;
    const fileInfo = req.fileInfo;
    const { targetLanguage, sourceLanguage } = req.body;
    
    if (!targetLanguage) {
      throw createError('Target language is required', 400, 'ValidationError');
    }
    
    // Check voice feature access
    const stripeService = require('../services/stripe-service');
    if (!stripeService.canPerformAction(user, 'use_voice_features')) {
      throw createError(
        'Voice features require premium subscription',
        403,
        'AuthorizationError'
      );
    }
    
    // Validate audio file
    await deepseekSpeechService.validateAudioFile(fileInfo.path, req.file.size);
    
    // Read audio file
    const audioBuffer = await fs.readFile(fileInfo.path);
    
    // Translate using DeepSeek
    const translation = await deepseekSpeechService.translateAudio(audioBuffer, {
      targetLanguage,
      sourceLanguage,
      prompt: req.body.prompt,
    });
    
    // Cleanup uploaded file
    try {
      await fs.unlink(fileInfo.path);
    } catch (cleanupError) {
      console.error('Error cleaning up audio file:', cleanupError);
    }
    
    // Update usage
    const audioDuration = req.body.duration || 60;
    await User.findByIdAndUpdate(user._id, {
      $inc: {
        'usage.voiceTranscriptions.currentMonth.count': 1,
        'usage.voiceTranscriptions.total': 1,
        'usage.voiceTranscriptions.totalDuration': audioDuration,
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Audio translated successfully',
      translation: {
        text: translation.text,
        sourceLanguage: translation.source_language || sourceLanguage,
        targetLanguage: translation.target_language || targetLanguage,
        duration: audioDuration,
      },
      metadata: {
        model: translation.model || 'deepseek-speech',
        processingTime: translation.processing_time,
      }
    });
    
  } catch (error) {
    if (req.file && req.fileInfo && req.fileInfo.path) {
      try {
        await fs.unlink(req.fileInfo.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file after error:', cleanupError);
      }
    }
    
    next(error);
  }
};

/**
 * Get supported languages for speech recognition
 * GET /api/v1/voice/languages
 */
const getSupportedLanguages = async (req, res, next) => {
  try {
    const languages = deepseekSpeechService.getSupportedLanguages();
    
    res.status(200).json({
      success: true,
      message: 'Supported languages retrieved',
      languages: languages.languages,
      defaultLanguage: languages.defaultLanguage,
      service: 'deepseek-speech',
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get speech service configuration and limits
 * GET /api/v1/voice/config
 */
const getServiceConfig = async (req, res, next) => {
  try {
    const config = deepseekSpeechService.config;
    
    res.status(200).json({
      success: true,
      message: 'Service configuration retrieved',
      config: {
        maxFileSize: config.maxFileSize,
        maxFileSizeMB: config.maxFileSize / (1024 * 1024),
        supportedFormats: config.supportedFormats,
        maxAudioDuration: config.maxAudioDuration,
        maxAudioDurationMinutes: config.maxAudioDuration / 60,
        defaultLanguage: config.defaultLanguage,
        freeTierLimits: config.freeTierLimits,
        service: 'deepseek-speech',
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Estimate cost for audio processing
 * POST /api/v1/voice/estimate-cost
 */
const estimateCost = async (req, res, next) => {
  try {
    const { duration, service = 'transcription' } = req.body;
    
    if (!duration || typeof duration !== 'number' || duration <= 0) {
      throw createError('Valid duration is required', 400, 'ValidationError');
    }
    
    const costEstimation = deepseekSpeechService.estimateCost(duration, service);
    
    res.status(200).json({
      success: true,
      message: 'Cost estimation completed',
      estimation: costEstimation,
      service: 'deepseek-speech',
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Batch transcribe multiple audio files
 * POST /api/v1/voice/batch
 */
const batchTranscribe = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw createError('No audio files uploaded', 400, 'ValidationError');
    }
    
    const user = req.userObj;
    const { language, prompt } = req.body;
    
    // Check voice feature access
    const stripeService = require('../services/stripe-service');
    if (!stripeService.canPerformAction(user, 'use_voice_features')) {
      throw createError(
        'Voice features require premium subscription',
        403,
        'AuthorizationError'
      );
    }
    
    // Prepare files for batch processing
    const files = await Promise.all(
      req.files.map(async (file, index) => {
        const fileInfo = req.filesInfo[index];
        
        // Validate each file
        await deepseekSpeechService.validateAudioFile(fileInfo.path, file.size);
        
        const buffer = await fs.readFile(fileInfo.path);
        
        return {
          id: `file_${index}_${Date.now()}`,
          buffer,
          language: language || 'en',
          path: fileInfo.path,
        };
      })
    );
    
    // Process batch
    const results = await deepseekSpeechService.processBatch(files, { language, prompt });
    
    // Cleanup all uploaded files
    await Promise.all(
      files.map(file => fs.unlink(file.path).catch(() => {}))
    );
    
    // Update usage
    const totalDuration = files.length * 60; // Estimate 60 seconds per file
    await User.findByIdAndUpdate(user._id, {
      $inc: {
        'usage.voiceTranscriptions.currentMonth.count': files.length,
        'usage.voiceTranscriptions.total': files.length,
        'usage.voiceTranscriptions.totalDuration': totalDuration,
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Batch transcription completed',
      results,
      summary: {
        totalFiles: files.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        estimatedCost: deepseekSpeechService.estimateCost(totalDuration),
      }
    });
    
  } catch (error) {
    // Cleanup all files if error occurred
    if (req.files && req.filesInfo) {
      await Promise.all(
        req.filesInfo.map(info => 
          fs.unlink(info.path).catch(() => {})
        )
      );
    }
    
    next(error);
  }
};

module.exports = {
  uploadVoiceCV,
  transcribeAudio,
  translateAudio,
  getSupportedLanguages,
  getServiceConfig,
  estimateCost,
  batchTranscribe,
};