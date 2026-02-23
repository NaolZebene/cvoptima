/**
 * Text extraction service
 * Unified service for extracting text from PDF and DOCX files
 */

const fs = require('fs').promises;
const path = require('path');
const pdfService = require('./pdf-extraction');
const docxService = require('./docx-extraction');
const { createError } = require('../middleware/error-handlers');

/**
 * Supported file types and their services
 */
const SUPPORTED_TYPES = {
  '.pdf': {
    service: pdfService,
    mimeTypes: ['application/pdf'],
    description: 'PDF Document'
  },
  '.docx': {
    service: docxService,
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    description: 'Microsoft Word Document'
  }
};

/**
 * Get file type from extension or MIME type
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 * @returns {Object} File type info
 */
const getFileType = (filename, mimeType = null) => {
  const extension = path.extname(filename).toLowerCase();
  
  // Check by extension first
  if (SUPPORTED_TYPES[extension]) {
    return {
      extension,
      service: SUPPORTED_TYPES[extension].service,
      mimeTypes: SUPPORTED_TYPES[extension].mimeTypes,
      description: SUPPORTED_TYPES[extension].description,
      isValid: true
    };
  }
  
  // Check by MIME type if provided
  if (mimeType) {
    for (const [ext, typeInfo] of Object.entries(SUPPORTED_TYPES)) {
      if (typeInfo.mimeTypes.includes(mimeType)) {
        return {
          extension: ext,
          service: typeInfo.service,
          mimeTypes: typeInfo.mimeTypes,
          description: typeInfo.description,
          isValid: true
        };
      }
    }
  }
  
  return {
    extension,
    service: null,
    mimeTypes: [],
    description: 'Unsupported file type',
    isValid: false
  };
};

/**
 * Validate file before extraction
 * @param {string} filePath - Path to file
 * @param {string} mimeType - MIME type
 * @returns {Promise<Object>} Validation result
 */
const validateFile = async (filePath, mimeType = null) => {
  try {
    // Check file exists
    const stats = await fs.stat(filePath);
    
    // Get file type
    const filename = path.basename(filePath);
    const fileType = getFileType(filename, mimeType);
    
    if (!fileType.isValid) {
      return {
        isValid: false,
        error: `Unsupported file type: ${fileType.extension}. Supported types: ${Object.keys(SUPPORTED_TYPES).join(', ')}`
      };
    }
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (stats.size > maxSize) {
      return {
        isValid: false,
        error: `File too large: ${(stats.size / (1024 * 1024)).toFixed(2)}MB. Maximum size is 10MB.`
      };
    }
    
    // Check if file is empty
    if (stats.size === 0) {
      return {
        isValid: false,
        error: 'File is empty'
      };
    }
    
    // Validate specific file type
    let typeSpecificValid = false;
    if (fileType.extension === '.pdf') {
      typeSpecificValid = await pdfService.validatePdf(filePath);
    } else if (fileType.extension === '.docx') {
      typeSpecificValid = await docxService.validateDocx(filePath);
    }
    
    if (!typeSpecificValid) {
      return {
        isValid: false,
        error: `Invalid or corrupted ${fileType.description} file`
      };
    }
    
    return {
      isValid: true,
      fileType: fileType.extension,
      service: fileType.service,
      fileSize: stats.size,
      fileName: filename,
      description: fileType.description
    };
    
  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
};

/**
 * Extract text from file
 * @param {string} filePath - Path to file
 * @param {string} mimeType - MIME type
 * @param {Object} options - Extraction options
 * @returns {Promise<Object>} Extraction result
 */
const extractText = async (filePath, mimeType = null, options = {}) => {
  try {
    // Validate file
    const validation = await validateFile(filePath, mimeType);
    
    if (!validation.isValid) {
      throw createError(validation.error, 400, 'ValidationError');
    }
    
    const { service, fileType } = validation;
    
    // Extract text based on file type
    let extractionResult;
    
    if (fileType === '.pdf') {
      extractionResult = await service.extractText(filePath, options);
    } else if (fileType === '.docx') {
      extractionResult = await service.extractText(filePath, options);
    } else {
      throw createError(`Unsupported file type: ${fileType}`, 400, 'ValidationError');
    }
    
    // Add file type info to result
    extractionResult.fileType = fileType;
    extractionResult.fileName = validation.fileName;
    extractionResult.description = validation.description;
    
    // Calculate additional statistics
    extractionResult.stats.extractionTime = new Date() - new Date(extractionResult.extractionDate);
    extractionResult.stats.charactersPerSecond = extractionResult.stats.extractionTime > 0 
      ? Math.round(extractionResult.stats.characters / (extractionResult.stats.extractionTime / 1000))
      : 0;
    
    // Detect language (simple heuristic)
    extractionResult.language = detectLanguage(extractionResult.text);
    
    // Detect sections in CV
    extractionResult.sections = detectSections(extractionResult.text);
    
    return extractionResult;
    
  } catch (error) {
    // Re-throw with enhanced error message
    if (error.name === 'ValidationError' || error.name === 'NotFoundError') {
      throw error;
    }
    
    throw createError(`Text extraction failed: ${error.message}`, 500, 'ProcessingError');
  }
};

/**
 * Extract text from buffer
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} filename - Original filename
 * @param {string} mimeType - MIME type
 * @param {Object} options - Extraction options
 * @returns {Promise<Object>} Extraction result
 */
const extractTextFromBuffer = async (fileBuffer, filename, mimeType = null, options = {}) => {
  try {
    // Get file type
    const fileType = getFileType(filename, mimeType);
    
    if (!fileType.isValid) {
      throw createError(`Unsupported file type: ${fileType.extension}`, 400, 'ValidationError');
    }
    
    // Check file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileBuffer.length > maxSize) {
      throw createError(`File too large: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)}MB. Maximum size is 10MB.`, 400, 'ValidationError');
    }
    
    // Extract text based on file type
    let extractionResult;
    
    if (fileType.extension === '.pdf') {
      extractionResult = await fileType.service.extractTextFromBuffer(fileBuffer, options);
    } else if (fileType.extension === '.docx') {
      extractionResult = await fileType.service.extractTextFromBuffer(fileBuffer, options);
    } else {
      throw createError(`Unsupported file type: ${fileType.extension}`, 400, 'ValidationError');
    }
    
    // Add file type info to result
    extractionResult.fileType = fileType.extension;
    extractionResult.fileName = filename;
    extractionResult.description = fileType.description;
    extractionResult.fileSize = fileBuffer.length;
    
    // Calculate additional statistics
    extractionResult.stats.extractionTime = new Date() - new Date(extractionResult.extractionDate);
    extractionResult.stats.charactersPerSecond = extractionResult.stats.extractionTime > 0 
      ? Math.round(extractionResult.stats.characters / (extractionResult.stats.extractionTime / 1000))
      : 0;
    
    // Detect language
    extractionResult.language = detectLanguage(extractionResult.text);
    
    // Detect sections in CV
    extractionResult.sections = detectSections(extractionResult.text);
    
    return extractionResult;
    
  } catch (error) {
    if (error.name === 'ValidationError') {
      throw error;
    }
    
    throw createError(`Text extraction failed: ${error.message}`, 500, 'ProcessingError');
  }
};

/**
 * Simple language detection (heuristic)
 * @param {string} text - Text to analyze
 * @returns {string} Detected language code
 */
const detectLanguage = (text) => {
  if (!text || text.length < 50) {
    return 'unknown';
  }
  
  const sample = text.toLowerCase().substring(0, 1000);
  
  // Common English words
  const englishWords = ['the', 'and', 'you', 'that', 'have', 'for', 'not', 'with', 'this', 'but'];
  // Common Italian words
  const italianWords = ['il', 'la', 'e', 'di', 'che', 'non', 'per', 'con', 'una', 'del'];
  // Common Spanish words
  const spanishWords = ['el', 'la', 'y', 'de', 'que', 'no', 'en', 'con', 'una', 'por'];
  // Common French words
  const frenchWords = ['le', 'la', 'et', 'de', 'que', 'ne', 'en', 'avec', 'une', 'pour'];
  // Common German words
  const germanWords = ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich'];
  
  const counts = {
    en: englishWords.filter(word => sample.includes(` ${word} `)).length,
    it: italianWords.filter(word => sample.includes(` ${word} `)).length,
    es: spanishWords.filter(word => sample.includes(` ${word} `)).length,
    fr: frenchWords.filter(word => sample.includes(` ${word} `)).length,
    de: germanWords.filter(word => sample.includes(` ${word} `)).length
  };
  
  // Find language with highest count
  let maxLang = 'en';
  let maxCount = counts.en;
  
  for (const [lang, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxLang = lang;
    }
  }
  
  // If no significant matches, return unknown
  if (maxCount < 3) {
    return 'unknown';
  }
  
  return maxLang;
};

/**
 * Detect sections in CV text
 * @param {string} text - CV text
 * @returns {Object} Detected sections
 */
const detectSections = (text) => {
  const sections = {
    contact: { present: false, lines: [] },
    summary: { present: false, lines: [] },
    experience: { present: false, lines: [] },
    education: { present: false, lines: [] },
    skills: { present: false, lines: [] },
    projects: { present: false, lines: [] },
    certifications: { present: false, lines: [] },
    languages: { present: false, lines: [] }
  };
  
  if (!text) return sections;
  
  const lines = text.split('\n');
  const lowerText = text.toLowerCase();
  
  // Section keywords
  const sectionKeywords = {
    contact: ['contact', 'address', 'phone', 'email', 'linkedin', 'github', 'portfolio', 'website'],
    summary: ['summary', 'objective', 'profile', 'about', 'professional summary'],
    experience: ['experience', 'work history', 'employment', 'career', 'professional experience'],
    education: ['education', 'academic', 'qualifications', 'degrees', 'university'],
    skills: ['skills', 'competencies', 'technical skills', 'abilities', 'expertise'],
    projects: ['projects', 'portfolio', 'work samples', 'case studies'],
    certifications: ['certifications', 'certificates', 'licenses', 'awards'],
    languages: ['languages', 'language skills', 'linguistic']
  };
  
  // Detect sections by keywords
  for (const [section, keywords] of Object.entries(sectionKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        sections[section].present = true;
        
        // Try to extract section content (simplified)
        const keywordIndex = lowerText.indexOf(keyword.toLowerCase());
        if (keywordIndex !== -1) {
          // Extract a few lines after the keyword
          const startLine = text.substring(0, keywordIndex).split('\n').length - 1;
          const endLine = Math.min(startLine + 10, lines.length); // Next 10 lines
          
          sections[section].lines = lines.slice(startLine, endLine).filter(line => line.trim().length > 0);
        }
        break;
      }
    }
  }
  
  return sections;
};

/**
 * Process and store extracted text in MongoDB
 * @param {Object} cvDocument - CV Mongoose document
 * @param {Object} extractionResult - Text extraction result
 * @returns {Promise<Object>} Updated CV document
 */
const processAndStoreText = async (cvDocument, extractionResult) => {
  try {
    const CV = require('../models/CV');
    
    // Update CV document with extracted text
    cvDocument.extractedText = extractionResult.text;
    cvDocument.textLength = extractionResult.stats.characters;
    cvDocument.status = 'processed';
    cvDocument.processedAt = new Date();
    cvDocument.processingTime = extractionResult.stats.extractionTime;
    
    // Store additional metadata
    cvDocument.metadata = {
      ...cvDocument.metadata,
      extraction: {
        fileType: extractionResult.fileType,
        fileName: extractionResult.fileName,
        language: extractionResult.language,
        sections: extractionResult.sections,
        stats: extractionResult.stats,
        extractionDate: extractionResult.extractionDate
      }
    };
    
    // Save to database
    await cvDocument.save();
    
    return {
      success: true,
      cv: cvDocument.toJSON(),
      extraction: {
        textLength: extractionResult.stats.characters,
        wordCount: extractionResult.stats.words,
        language: extractionResult.language,
        sectionsDetected: Object.values(extractionResult.sections).filter(s => s.present).length,
        extractionTime: extractionResult.stats.extractionTime
      }
    };
    
  } catch (error) {
    throw createError(`Failed to store extracted text: ${error.message}`, 500, 'DatabaseError');
  }
};

/**
 * Batch process multiple files
 * @param {Array<Object>} files - Array of file objects with path and metadata
 * @param {Object} options - Extraction options
 * @returns {Promise<Array<Object>>} Array of processing results
 */
const batchProcessFiles = async (files, options = {}) => {
  const results = [];
  
  for (const file of files) {
    try {
      const extractionResult = await extractText(file.path, file.mimeType, options);
      results.push({
        file: file.path,
        success: true,
        result: extractionResult
      });
    } catch (error) {
      results.push({
        file: file.path,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
};

/**
 * Get supported file types
 * @returns {Object} Supported file types information
 */
const getSupportedTypes = () => {
  const types = {};
  
  for (const [extension, info] of Object.entries(SUPPORTED_TYPES)) {
    types[extension] = {
      mimeTypes: info.mimeTypes,
      description: info.description,
      maxSize: '10MB'
    };
  }
  
  return {
    supportedTypes: types,
    maxFileSize: '10MB',
    totalSupported: Object.keys(types).length
  };
};

module.exports = {
  extractText,
  extractTextFromBuffer,
  validateFile,
  processAndStoreText,
  batchProcessFiles,
  getSupportedTypes,
  detectLanguage,
  detectSections,
  SUPPORTED_TYPES
};