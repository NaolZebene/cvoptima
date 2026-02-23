/**
 * Text extraction controller
 * Handles CV text extraction and storage
 */

const fs = require('fs').promises;
const path = require('path');
const CV = require('../models/CV');
const textExtractionService = require('../services/text-extraction');
const { createError } = require('../middleware/error-handlers');

/**
 * Extract text from uploaded CV
 * POST /api/v1/cv/:id/extract
 */
const extractCVText = async (req, res, next) => {
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
    
    // Check if already processed
    if (cv.status === 'processed') {
      throw createError('CV is already processed', 400, 'ValidationError');
    }
    
    if (cv.status === 'processing') {
      throw createError('CV is currently being processed', 400, 'ValidationError');
    }
    
    // Check if file exists
    try {
      await fs.access(cv.filePath);
    } catch (error) {
      throw createError('CV file not found on server', 404, 'NotFoundError');
    }
    
    // Update status to processing
    cv.status = 'processing';
    await cv.save({ validateBeforeSave: false });
    
    // Extract text
    const extractionResult = await textExtractionService.extractText(
      cv.filePath,
      cv.mimeType
    );
    
    // Process and store text
    const storageResult = await textExtractionService.processAndStoreText(
      cv,
      extractionResult
    );
    
    res.status(200).json({
      success: true,
      message: 'CV text extracted and stored successfully',
      cv: storageResult.cv,
      extraction: storageResult.extraction,
      fileInfo: {
        originalName: cv.originalFilename,
        fileType: extractionResult.fileType,
        fileSize: cv.fileSize
      }
    });
    
  } catch (error) {
    // Update CV status to error if extraction failed
    if (req.params.id) {
      try {
        const cv = await CV.findById(req.params.id);
        if (cv && cv.status === 'processing') {
          cv.status = 'error';
          cv.processingError = error.message;
          await cv.save({ validateBeforeSave: false });
        }
      } catch (dbError) {
        console.error('Failed to update CV status:', dbError);
      }
    }
    
    next(error);
  }
};

/**
 * Extract text from CV file (immediate processing)
 * POST /api/v1/cv/extract/upload
 */
const extractFromUpload = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      throw createError('No file uploaded', 400, 'ValidationError');
    }
    
    const user = req.userObj;
    const fileInfo = req.fileInfo;
    
    // Check if user can create more CVs
    if (!user.canCreateCV()) {
      throw createError(
        'CV limit reached. Upgrade your subscription to upload more CVs.',
        403,
        'AuthorizationError'
      );
    }
    
    // Extract text immediately
    const extractionResult = await textExtractionService.extractText(
      fileInfo.path,
      fileInfo.mimetype
    );
    
    // Create CV document with extracted text
    const cv = await CV.create({
      user: user._id,
      originalFilename: fileInfo.originalName,
      storedFilename: fileInfo.filename,
      filePath: fileInfo.path,
      fileSize: fileInfo.size,
      mimeType: fileInfo.mimetype,
      extension: fileInfo.extension,
      status: 'processed',
      uploadSource: req.body.source || 'web',
      extractedText: extractionResult.text,
      textLength: extractionResult.stats.characters,
      processedAt: new Date(),
      processingTime: extractionResult.stats.extractionTime,
      metadata: {
        extraction: {
          fileType: extractionResult.fileType,
          fileName: extractionResult.fileName,
          language: extractionResult.language,
          sections: extractionResult.sections,
          stats: extractionResult.stats,
          extractionDate: extractionResult.extractionDate
        }
      }
    });
    
    // Increment user's CV count
    await user.incrementCvCount();
    
    // Prepare response
    const cvResponse = cv.toJSON();
    
    res.status(201).json({
      success: true,
      message: 'CV uploaded and text extracted successfully',
      cv: cvResponse,
      extraction: {
        textLength: extractionResult.stats.characters,
        wordCount: extractionResult.stats.words,
        language: extractionResult.language,
        sectionsDetected: Object.values(extractionResult.sections).filter(s => s.present).length,
        extractionTime: extractionResult.stats.extractionTime
      },
      file: {
        originalName: fileInfo.originalName,
        size: fileInfo.size,
        mimeType: fileInfo.mimetype,
        type: extractionResult.fileType
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
 * Get extracted text for CV
 * GET /api/v1/cv/:id/text
 */
const getCVText = async (req, res, next) => {
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
    
    // Check if text is extracted
    if (!cv.extractedText) {
      throw createError('Text not extracted for this CV', 404, 'NotFoundError');
    }
    
    // Get text with options
    const { format = 'plain', limit, offset } = req.query;
    let text = cv.extractedText;
    
    // Apply limit and offset if provided
    if (offset || limit) {
      const lines = text.split('\n');
      const start = offset ? parseInt(offset) : 0;
      const end = limit ? start + parseInt(limit) : lines.length;
      text = lines.slice(start, end).join('\n');
    }
    
    // Format response based on requested format
    let response;
    switch (format) {
      case 'json':
        response = {
          success: true,
          text: text,
          metadata: {
            cvId: cv._id,
            textLength: cv.textLength,
            language: cv.metadata?.extraction?.language || 'unknown',
            extractionDate: cv.metadata?.extraction?.extractionDate,
            sections: cv.metadata?.extraction?.sections || {}
          },
          stats: cv.metadata?.extraction?.stats || {}
        };
        break;
        
      case 'html':
        // Simple HTML formatting
        const htmlText = text
          .split('\n')
          .map(line => {
            if (line.trim().length === 0) return '<br>';
            return `<p>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
          })
          .join('');
        
        response = {
          success: true,
          html: `<div class="cv-text">${htmlText}</div>`,
          textLength: cv.textLength
        };
        break;
        
      case 'plain':
      default:
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Length', Buffer.byteLength(text, 'utf8'));
        return res.send(text);
    }
    
    res.status(200).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get CV text statistics
 * GET /api/v1/cv/:id/text/stats
 */
const getCVTextStats = async (req, res, next) => {
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
    
    // Check if text is extracted
    if (!cv.extractedText) {
      throw createError('Text not extracted for this CV', 404, 'NotFoundError');
    }
    
    const stats = cv.metadata?.extraction?.stats || {
      characters: cv.textLength || 0,
      words: 0,
      lines: 0,
      paragraphs: 0,
      sentences: 0
    };
    
    // Calculate additional stats if needed
    if (!stats.words && cv.extractedText) {
      stats.words = cv.extractedText.split(/\s+/).filter(word => word.length > 0).length;
    }
    
    res.status(200).json({
      success: true,
      stats: {
        ...stats,
        extractionDate: cv.metadata?.extraction?.extractionDate,
        processingTime: cv.processingTime,
        language: cv.metadata?.extraction?.language || 'unknown'
      },
      sections: cv.metadata?.extraction?.sections || {},
      fileInfo: {
        originalName: cv.originalFilename,
        fileSize: cv.fileSize,
        fileType: cv.metadata?.extraction?.fileType || cv.extension,
        uploadedAt: cv.createdAt
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get CV sections
 * GET /api/v1/cv/:id/sections
 */
const getCVSections = async (req, res, next) => {
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
    
    // Check if text is extracted
    if (!cv.extractedText) {
      throw createError('Text not extracted for this CV', 404, 'NotFoundError');
    }
    
    const sections = cv.metadata?.extraction?.sections || {};
    
    // Extract section content if not already done
    const enrichedSections = {};
    for (const [sectionName, sectionData] of Object.entries(sections)) {
      enrichedSections[sectionName] = {
        present: sectionData.present || false,
        content: sectionData.lines || [],
        lineCount: sectionData.lines ? sectionData.lines.length : 0
      };
    }
    
    res.status(200).json({
      success: true,
      sections: enrichedSections,
      totalSections: Object.values(enrichedSections).filter(s => s.present).length,
      cvId: cv._id,
      fileName: cv.originalFilename
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Re-extract text for CV
 * POST /api/v1/cv/:id/re-extract
 */
const reExtractCVText = async (req, res, next) => {
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
    
    // Check if file exists
    try {
      await fs.access(cv.filePath);
    } catch (error) {
      throw createError('CV file not found on server', 404, 'NotFoundError');
    }
    
    // Update status to processing
    cv.status = 'processing';
    await cv.save({ validateBeforeSave: false });
    
    // Extract text
    const extractionResult = await textExtractionService.extractText(
      cv.filePath,
      cv.mimeType
    );
    
    // Update CV with new extraction
    cv.extractedText = extractionResult.text;
    cv.textLength = extractionResult.stats.characters;
    cv.status = 'processed';
    cv.processedAt = new Date();
    cv.processingTime = extractionResult.stats.extractionTime;
    cv.processingError = null;
    
    // Update metadata
    cv.metadata = {
      ...cv.metadata,
      extraction: {
        fileType: extractionResult.fileType,
        fileName: extractionResult.fileName,
        language: extractionResult.language,
        sections: extractionResult.sections,
        stats: extractionResult.stats,
        extractionDate: extractionResult.extractionDate,
        reExtracted: true,
        previousExtractionDate: cv.metadata?.extraction?.extractionDate
      }
    };
    
    await cv.save();
    
    res.status(200).json({
      success: true,
      message: 'CV text re-extracted successfully',
      cv: cv.toJSON(),
      extraction: {
        textLength: extractionResult.stats.characters,
        wordCount: extractionResult.stats.words,
        language: extractionResult.language,
        sectionsDetected: Object.values(extractionResult.sections).filter(s => s.present).length,
        extractionTime: extractionResult.stats.extractionTime,
        reExtracted: true
      }
    });
    
  } catch (error) {
    // Update CV status to error if extraction failed
    if (cvId) {
      try {
        const cv = await CV.findById(cvId);
        if (cv && cv.status === 'processing') {
          cv.status = 'error';
          cv.processingError = error.message;
          await cv.save({ validateBeforeSave: false });
        }
      } catch (dbError) {
        console.error('Failed to update CV status:', dbError);
      }
    }
    
    next(error);
  }
};

/**
 * Get supported file types
 * GET /api/v1/cv/supported-types
 */
const getSupportedFileTypes = async (req, res, next) => {
  try {
    const supportedTypes = textExtractionService.getSupportedTypes();
    
    res.status(200).json({
      success: true,
      ...supportedTypes,
      uploadLimits: {
        maxFileSize: '10MB',
        maxFilesPerUpload: 1,
        allowedSimultaneousUploads: 3
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Validate file before upload
 * POST /api/v1/cv/validate
 */
const validateFile = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      throw createError('No file uploaded', 400, 'ValidationError');
    }
    
    const fileInfo = req.fileInfo;
    
    // Validate file
    const validation = await textExtractionService.validateFile(
      fileInfo.path,
      fileInfo.mimetype
    );
    
    // Cleanup temp file after validation
    try {
      await fs.unlink(fileInfo.path);
    } catch (cleanupError) {
      console.error('Error cleaning up validation file:', cleanupError);
    }
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        validation
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'File is valid for processing',
      validation,
      fileInfo: {
        originalName: fileInfo.originalName,
        size: fileInfo.size,
        mimeType: fileInfo.mimetype,
        type: validation.fileType
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

module.exports = {
  extractCVText,
  extractFromUpload,
  getCVText,
  getCVTextStats,
  getCVSections,
  reExtractCVText,
  getSupportedFileTypes,
  validateFile
};