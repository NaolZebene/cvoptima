/**
 * Voice Controller
 * Handles voice-based CV creation and audio processing
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
    const validation = await whisperService.validateAudioFile(fileInfo.path);
    
    if (!validation.isValid) {
      // Cleanup uploaded file
      try {
        await fs.unlink(fileInfo.path);
      } catch (cleanupError) {
        console.error('Error cleaning up invalid file:', cleanupError);
      }
      
      throw createError(validation.error, 400, 'ValidationError');
    }
    
    // Get transcription options from request
    const { language, prompt, jobDescription } = req.body;
    
    // Transcribe audio
    const transcription = await whisperService.transcribeAudio(fileInfo.path, {
      language,
      prompt
    });
    
    // Create CV from transcription
    const cv = await CV.create({
      user: user._id,
      originalFilename: fileInfo.originalName,
      storedFilename: fileInfo.filename,
      filePath: fileInfo.path,
      fileSize: fileInfo.size,
      mimeType: fileInfo.mimetype,
      extension: fileInfo.extension,
      status: 'processed',
      uploadSource: 'voice',
      extractedText: transcription.text,
      textLength: transcription.text.length,
      processedAt: new Date(),
      processingTime: transcription.processingTime,
      metadata: {
        voice: {
          transcription: {
            language: transcription.language || language || 'en',
            duration: transcription.duration,
            processingTime: transcription.processingTime,
            timestamp: transcription.timestamp
          },
          fileInfo: transcription.fileInfo
        }
      }
    });
    
    // Increment user's CV count
    await user.incrementCvCount();
    
    // Analyze CV text
    const analysis = await atsService.calculateATSScore(
      transcription.text,
      null,
      jobDescription
    );
    
    // Update CV with analysis
    cv.atsScore = analysis.score;
    cv.atsAnalysis = {
      keywords: analysis.keywordAnalysis.matchedKeywords,
      sections: analysis.sectionAnalysis.sections,
      suggestions: analysis.suggestions
    };
    
    await cv.save({ validateBeforeSave: false });
    
    // Create score history entry
    const scoreHistoryEntry = await scoreHistoryService.createScoreHistory({
      cvId: cv._id,
      userId: user._id,
      score: analysis.score,
      breakdown: analysis.breakdown,
      analysis: {
        keywordAnalysis: analysis.keywordAnalysis,
        sectionAnalysis: analysis.sectionAnalysis,
        lengthAnalysis: analysis.lengthAnalysis,
        formattingAnalysis: analysis.formattingAnalysis,
        actionVerbAnalysis: analysis.actionVerbAnalysis,
        readabilityAnalysis: analysis.readabilityAnalysis
      },
      industry: analysis.industry,
      metrics: analysis.metrics,
      jobComparison: jobDescription ? {
        jobTitle: analysis.jobTitle,
        jobDescriptionLength: jobDescription.length,
        cvJobFit: analysis.cvJobFit,
        matchPercentage: analysis.keywordAnalysis.matchPercentage
      } : null,
      suggestions: analysis.suggestions,
      analysisType: jobDescription ? 'job_comparison' : 'initial',
      trigger: 'voice_upload',
      notes: 'CV created from voice recording',
      tags: ['voice', 'audio']
    });
    
    // Prepare response
    const cvResponse = cv.toJSON();
    
    res.status(201).json({
      success: true,
      message: 'CV created from voice recording',
      cv: cvResponse,
      transcription: {
        text: transcription.text,
        language: transcription.language || language || 'en',
        duration: transcription.duration,
        processingTime: transcription.processingTime,
        confidence: 'high' // Placeholder for confidence score
      },
      analysis: {
        score: analysis.score,
        breakdown: analysis.breakdown,
        industry: analysis.industry,
        suggestions: analysis.suggestions
      },
      scoreHistoryId: scoreHistoryEntry?.id,
      fileInfo: {
        originalName: fileInfo.originalName,
        size: fileInfo.size,
        mimeType: fileInfo.mimetype,
        duration: transcription.duration
      }
    });
    
  } catch (error) {
    // Cleanup uploaded file if error occurred
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    next(error);
  }
};

/**
 * Transcribe audio without creating CV
 * POST /api/v1/voice/transcribe
 */
const transcribeAudio = async (req, res, next) => {
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
    const validation = await whisperService.validateAudioFile(fileInfo.path);
    
    if (!validation.isValid) {
      // Cleanup uploaded file
      try {
        await fs.unlink(fileInfo.path);
      } catch (cleanupError) {
        console.error('Error cleaning up invalid file:', cleanupError);
      }
      
      throw createError(validation.error, 400, 'ValidationError');
    }
    
    // Get transcription options from request
    const { language, prompt, responseFormat = 'json' } = req.body;
    
    // Transcribe audio
    const transcription = await whisperService.transcribeAudio(fileInfo.path, {
      language,
      prompt,
      responseFormat
    });
    
    // Cleanup uploaded file after transcription
    try {
      await fs.unlink(fileInfo.path);
    } catch (cleanupError) {
      console.error('Error cleaning up file:', cleanupError);
    }
    
    // Prepare response based on format
    let response;
    
    if (responseFormat === 'text') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(transcription.text);
    } else {
      response = {
        success: true,
        transcription: {
          text: transcription.text,
          language: transcription.language || language || 'en',
          duration: transcription.duration,
          processingTime: transcription.processingTime,
          wordCount: transcription.text.split(/\s+/).length,
          characterCount: transcription.text.length
        },
        fileInfo: {
          originalName: fileInfo.originalName,
          size: fileInfo.size,
          mimeType: fileInfo.mimetype,
          duration: transcription.duration
        },
        timestamp: new Date().toISOString()
      };
    }
    
    res.status(200).json(response);
    
  } catch (error) {
    // Cleanup uploaded file if error occurred
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    next(error);
  }
};

/**
 * Translate audio
 * POST /api/v1/voice/translate
 */
const translateAudio = async (req, res, next) => {
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
    const validation = await whisperService.validateAudioFile(fileInfo.path);
    
    if (!validation.isValid) {
      // Cleanup uploaded file
      try {
        await fs.unlink(fileInfo.path);
      } catch (cleanupError) {
        console.error('Error cleaning up invalid file:', cleanupError);
      }
      
      throw createError(validation.error, 400, 'ValidationError');
    }
    
    // Get translation options from request
    const { targetLanguage = 'en', prompt, responseFormat = 'json' } = req.body;
    
    // Translate audio
    const translation = await whisperService.translateAudio(
      fileInfo.path,
      targetLanguage,
      { prompt, responseFormat }
    );
    
    // Cleanup uploaded file after translation
    try {
      await fs.unlink(fileInfo.path);
    } catch (cleanupError) {
      console.error('Error cleaning up file:', cleanupError);
    }
    
    // Prepare response based on format
    let response;
    
    if (responseFormat === 'text') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(translation.text);
    } else {
      response = {
        success: true,
        translation: {
          text: translation.text,
          originalLanguage: translation.translation?.originalLanguage || 'unknown',
          targetLanguage: translation.translation?.targetLanguage || 'en',
          duration: translation.duration,
          processingTime: translation.processingTime,
          wordCount: translation.text.split(/\s+/).length,
          characterCount: translation.text.length
        },
        fileInfo: {
          originalName: fileInfo.originalName,
          size: fileInfo.size,
          mimeType: fileInfo.mimetype,
          duration: translation.duration
        },
        timestamp: new Date().toISOString()
      };
    }
    
    res.status(200).json(response);
    
  } catch (error) {
    // Cleanup uploaded file if error occurred
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    next(error);
  }
};

/**
 * Get supported languages
 * GET /api/v1/voice/languages
 */
const getSupportedLanguages = async (req, res, next) => {
  try {
    const languages = whisperService.getSupportedLanguages();
    
    res.status(200).json({
      success: true,
      ...languages,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get voice service configuration
 * GET /api/v1/voice/config
 */
const getVoiceConfig = async (req, res, next) => {
  try {
    const config = whisperService.getServiceConfig();
    
    // Remove sensitive information
    const safeConfig = {
      ...config,
      apiKeyConfigured: undefined // Don't expose API key status
    };
    
    res.status(200).json({
      success: true,
      config: safeConfig,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Estimate transcription cost
 * POST /api/v1/voice/estimate-cost
 */
const estimateTranscriptionCost = async (req, res, next) => {
  try {
    const { audioDuration } = req.body;
    
    if (!audioDuration || audioDuration <= 0) {
      throw createError('Valid audio duration is required', 400, 'ValidationError');
    }
    
    const costEstimation = whisperService.estimateCost(audioDuration);
    
    res.status(200).json({
      success: true,
      estimation: costEstimation,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Batch transcribe multiple audio files
 * POST /api/v1/voice/batch-transcribe
 */
const batchTranscribe = async (req, res, next) => {
  try {
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      throw createError('No audio files uploaded', 400, 'ValidationError');
    }
    
    const user = req.userObj;
    
    // Check if user can use voice features
    const stripeService = require('../services/stripe-service');
    if (!stripeService.canPerformAction(user, 'use_voice_features')) {
      throw createError(
        'Batch voice features require premium subscription',
        403,
        'AuthorizationError'
      );
    }
    
    // Limit batch size
    const maxBatchSize = 10;
    if (req.files.length > maxBatchSize) {
      throw createError(`Maximum ${maxBatchSize} files allowed per batch`, 400, 'ValidationError');
    }
    
    // Get transcription options
    const { language, prompt } = req.body;
    
    // Prepare files for batch processing
    const files = req.files.map(file => ({
      path: file.path,
      language
    }));
    
    // Batch transcribe
    const results = await whisperService.batchTranscribe(files, { language, prompt });
    
    // Cleanup uploaded files
    await Promise.all(
      req.files.map(file => 
        fs.unlink(file.path).catch(error => 
          console.error('Error cleaning up file:', error)
        )
      )
    );
    
    // Prepare response
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    res.status(200).json({
      success: true,
      batchId: `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length
      },
      results: results.map(result => ({
        file: path.basename(result.file),
        success: result.success,
        ...(result.success ? {
          transcription: {
            text: result.result.text.substring(0, 500) + (result.result.text.length > 500 ? '...' : ''),
            fullLength: result.result.text.length,
            language: result.result.language,
            duration: result.result.duration,
            processingTime: result.result.processingTime
          }
        } : {
          error: result.error
        })
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    // Cleanup uploaded files if error occurred
    if (req.files) {
      await Promise.all(
        req.files.map(file => 
          fs.unlink(file.path).catch(error => 
            console.error('Error cleaning up file:', error)
          )
        )
      );
    }
    
    next(error);
  }
};

/**
 * Get voice-based CVs for user
 * GET /api/v1/voice/cvs
 */
const getVoiceCVs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 20, page = 1 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find voice-based CVs
    const cvs = await CV.find({
      user: userId,
      uploadSource: 'voice'
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
    
    const total = await CV.countDocuments({
      user: userId,
      uploadSource: 'voice'
    });
    
    res.status(200).json({
      success: true,
      cvs: cvs.map(cv => cv.toJSON()),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      },
      summary: {
        totalVoiceCVs: total,
        averageScore: cvs.length > 0 
          ? Math.round(cvs.reduce((sum, cv) => sum + (cv.atsScore || 0), 0) / cvs.length)
          : 0
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Convert existing CV to voice notes
 * POST /api/v1/voice/cv/:id/convert
 */
const convertCVToVoiceNotes = async (req, res, next) => {
  try {
    const cvId = req.params.id;
    const userId = req.user.id;
    
    // Find CV
    const cv = await CV.findOne({
      _id: cvId,
      user: userId
    });
    
    if (!cv) {
      throw createError('CV not found', 404, 'NotFoundError');
    }
    
    if (!cv.extractedText) {
      throw createError('CV text not extracted', 400, 'ValidationError');
    }
    
    // Check if user can use voice features
    const user = await User.findById(userId);
    const stripeService = require('../services/stripe-service');
    if (!stripeService.canPerformAction(user, 'use_voice_features')) {
      throw createError(
        'Voice features require premium subscription',
        403,
        'AuthorizationError'
      );
    }
    
    // Analyze text for voice conversion
    const text = cv.extractedText;
    
    // Split into sections for voice notes
    const sections = text.split(/\n\s*\n/).filter(section => section.trim().length > 0);
    
    // Create voice notes structure
    const voiceNotes = sections.map((section, index) => {
      const lines = section.split('\n');
      const firstLine = lines[0].trim();
      
      // Try to identify section type
      let sectionType = 'content';
      const lowerFirstLine = firstLine.toLowerCase();
      
      if (lowerFirstLine.includes('experience') || lowerFirstLine.includes('work')) {
        sectionType = 'experience';
      } else if (lowerFirstLine.includes('education')) {
        sectionType = 'education';
      } else if (lowerFirstLine.includes('skill')) {
        sectionType = 'skills';
      } else if (lowerFirstLine.includes('summary') || lowerFirstLine.includes('objective')) {
        sectionType = 'summary';
      } else if (lowerFirstLine.includes('contact')) {
        sectionType = 'contact';
      }
      
      return {
        id: `note_${index + 1}`,
        sectionType,
        title: firstLine,
        content: section,
        wordCount: section.split(/\s+/).length,
        estimatedDuration: Math.ceil(section.split(/\s+/).length / 150), // ~150 words per minute
        order: index + 1
      };
    });
    
    // Calculate total estimated duration
    const totalDuration = voiceNotes.reduce((sum, note) => sum + note.estimatedDuration, 0);
    
    // Update CV with voice notes metadata
    cv.metadata = {
      ...cv.metadata,
      voiceNotes: {
        convertedAt: new Date(),
        totalNotes: voiceNotes.length,
        totalDuration,
        sections: voiceNotes.map(note => ({
          type: note.sectionType,
          title: note.title,
          duration: note.estimatedDuration
        }))
      }
    };
    
    await cv.save({ validateBeforeSave: false });
    
    res.status(200).json({
      success: true,
      message: 'CV converted to voice notes',
      cvId: cv._id,
      voiceNotes: {
        total: voiceNotes.length,
        totalDuration,
        estimatedReadingTime: `${totalDuration} minute${totalDuration !== 1 ? 's' : ''}`,
        sections: voiceNotes
      },
      suggestions: [
        'Use these notes for interview preparation',
        'Practice reading each section aloud',
        'Focus on key achievements in experience section',
        'Highlight transferable skills'
      ]
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get voice processing statistics
 * GET /api/v1/voice/stats
 */
const getVoiceStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get voice-based CVs
    const voiceCVs = await CV.find({
      user: userId,
      uploadSource: 'voice'
    });
    
    // Calculate statistics
    const totalVoiceCVs = voiceCVs.length;
    const totalTranscriptionTime = voiceCVs.reduce((sum, cv) => 
      sum + (cv.metadata?.voice?.transcription?.processingTime || 0), 0
    );
    
    const averageScore = totalVoiceCVs > 0 
      ? Math.round(voiceCVs.reduce((sum, cv) => sum + (cv.atsScore || 0), 0) / totalVoiceCVs)
      : 0;
    
    // Get language distribution
    const languageDistribution = {};
    voiceCVs.forEach(cv => {
      const language = cv.metadata?.voice?.transcription?.language || 'unknown';
      languageDistribution[language] = (languageDistribution[language] || 0) + 1;
    });
    
    // Get file type distribution
    const fileTypeDistribution = {};
    voiceCVs.forEach(cv => {
      const extension = cv.extension.toLowerCase();
      fileTypeDistribution[extension] = (fileTypeDistribution[extension] || 0) + 1;
    });
    
    res.status(200).json({
      success: true,
      stats: {
        totalVoiceCVs,
        averageScore,
        totalTranscriptionTime: Math.round(totalTranscriptionTime / 1000), // Convert to seconds
        averageTranscriptionTime: totalVoiceCVs > 0 
          ? Math.round(totalTranscriptionTime / totalVoiceCVs / 1000)
          : 0,
        languageDistribution,
        fileTypeDistribution,
        firstVoiceCV: totalVoiceCVs > 0 
          ? voiceCVs[voiceCVs.length - 1].createdAt // Oldest
          : null,
        lastVoiceCV: totalVoiceCVs > 0 
          ? voiceCVs[0].createdAt // Newest
          : null
      },
      insights: totalVoiceCVs > 0 ? [
        `You've created ${totalVoiceCVs} CVs using voice`,
        `Average ATS score: ${averageScore}/100`,
        `Total transcription time: ${Math.round(totalTranscriptionTime / 1000)} seconds`,
        `Most used language: ${Object.entries(languageDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}`
      ] : [
        'No voice CVs created yet',
        'Try uploading an audio file to create your first voice CV'
      ]
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadVoiceCV,
  transcribeAudio,
  translateAudio,
  getSupportedLanguages,
  getVoiceConfig,
  estimateTranscriptionCost,
  batchTranscribe,
  getVoiceCVs,
  convertCVToVoiceNotes,
  getVoiceStats
};