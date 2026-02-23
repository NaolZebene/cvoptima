/**
 * Whisper API Service
 * Handles speech-to-text conversion using OpenAI's Whisper API
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');
const { createError } = require('../middleware/error-handlers');

/**
 * Configuration for Whisper API
 */
const WHISPER_CONFIG = {
  apiUrl: process.env.OPENAI_API_URL || 'https://api.openai.com/v1',
  model: process.env.WHISPER_MODEL || 'whisper-1',
  maxFileSize: 25 * 1024 * 1024, // 25MB (Whisper limit)
  supportedFormats: ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'],
  maxAudioDuration: 60 * 60, // 60 minutes in seconds
  defaultLanguage: 'en',
  supportedLanguages: [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'ja', 'zh',
    'ko', 'ar', 'hi', 'tr', 'pl', 'sv', 'da', 'no', 'fi', 'el'
  ]
};

/**
 * Validate audio file
 * @param {string} filePath - Path to audio file
 * @returns {Promise<Object>} Validation result
 */
const validateAudioFile = async (filePath) => {
  try {
    // Check file exists
    await fs.access(filePath);
    
    const stats = await fs.stat(filePath);
    const filename = path.basename(filePath);
    const extension = path.extname(filename).toLowerCase();
    
    // Check file size
    if (stats.size > WHISPER_CONFIG.maxFileSize) {
      return {
        isValid: false,
        error: `File too large: ${(stats.size / (1024 * 1024)).toFixed(2)}MB. Maximum size is 25MB.`
      };
    }
    
    // Check file format
    if (!WHISPER_CONFIG.supportedFormats.includes(extension)) {
      return {
        isValid: false,
        error: `Unsupported file format: ${extension}. Supported formats: ${WHISPER_CONFIG.supportedFormats.join(', ')}`
      };
    }
    
    // Check if file is empty
    if (stats.size === 0) {
      return {
        isValid: false,
        error: 'File is empty'
      };
    }
    
    return {
      isValid: true,
      fileSize: stats.size,
      filename,
      extension,
      lastModified: stats.mtime
    };
    
  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
};

/**
 * Transcribe audio file using Whisper API
 * @param {string} filePath - Path to audio file
 * @param {Object} options - Transcription options
 * @returns {Promise<Object>} Transcription result
 */
const transcribeAudio = async (filePath, options = {}) => {
  try {
    // Validate file
    const validation = await validateAudioFile(filePath);
    
    if (!validation.isValid) {
      throw createError(validation.error, 400, 'ValidationError');
    }
    
    // Check API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw createError('OpenAI API key not configured', 500, 'ConfigurationError');
    }
    
    // Prepare form data
    const formData = new FormData();
    const fileStream = await fs.readFile(filePath);
    
    formData.append('file', fileStream, {
      filename: validation.filename,
      contentType: getContentType(validation.extension)
    });
    
    formData.append('model', WHISPER_CONFIG.model);
    
    // Set language if provided
    if (options.language && WHISPER_CONFIG.supportedLanguages.includes(options.language)) {
      formData.append('language', options.language);
    }
    
    // Set prompt if provided (for context)
    if (options.prompt && options.prompt.length > 0) {
      formData.append('prompt', options.prompt.substring(0, 1000)); // Limit prompt length
    }
    
    // Set response format
    formData.append('response_format', options.responseFormat || 'json');
    
    // Set temperature if provided
    if (options.temperature !== undefined) {
      formData.append('temperature', Math.min(Math.max(options.temperature, 0), 1));
    }
    
    // Make API request
    const startTime = Date.now();
    
    const response = await axios.post(
      `${WHISPER_CONFIG.apiUrl}/audio/transcriptions`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formData.getHeaders()
        },
        timeout: 300000, // 5 minute timeout for large files
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    const processingTime = Date.now() - startTime;
    
    // Prepare result
    const result = {
      text: response.data.text || '',
      processingTime,
      fileInfo: {
        filename: validation.filename,
        fileSize: validation.fileSize,
        extension: validation.extension
      },
      apiResponse: response.data,
      timestamp: new Date().toISOString()
    };
    
    // Add language detection if available
    if (response.data.language) {
      result.language = response.data.language;
    }
    
    // Add duration if available
    if (response.data.duration) {
      result.duration = response.data.duration;
    }
    
    return result;
    
  } catch (error) {
    // Handle specific API errors
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 400:
          throw createError(`Invalid request: ${data.error?.message || 'Bad request'}`, 400, 'ValidationError');
        case 401:
          throw createError('Invalid OpenAI API key', 401, 'AuthenticationError');
        case 429:
          throw createError('Rate limit exceeded. Please try again later.', 429, 'RateLimitError');
        case 500:
          throw createError('OpenAI API server error', 500, 'ApiError');
        default:
          throw createError(`OpenAI API error: ${data.error?.message || 'Unknown error'}`, status, 'ApiError');
      }
    }
    
    if (error.code === 'ECONNABORTED') {
      throw createError('Request timeout. The audio file might be too large.', 408, 'TimeoutError');
    }
    
    if (error.code === 'ENOTFOUND') {
      throw createError('Cannot connect to OpenAI API', 503, 'ConnectionError');
    }
    
    throw createError(`Transcription failed: ${error.message}`, 500, 'ProcessingError');
  }
};

/**
 * Get content type for audio file extension
 * @param {string} extension - File extension
 * @returns {string} Content type
 */
const getContentType = (extension) => {
  const contentTypes = {
    '.mp3': 'audio/mpeg',
    '.mp4': 'audio/mp4',
    '.mpeg': 'audio/mpeg',
    '.mpga': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.wav': 'audio/wav',
    '.webm': 'audio/webm'
  };
  
  return contentTypes[extension] || 'application/octet-stream';
};

/**
 * Transcribe audio from buffer
 * @param {Buffer} audioBuffer - Audio buffer
 * @param {string} filename - Original filename
 * @param {Object} options - Transcription options
 * @returns {Promise<Object>} Transcription result
 */
const transcribeAudioBuffer = async (audioBuffer, filename, options = {}) => {
  try {
    // Create temporary file
    const tempDir = path.join(__dirname, '../../temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, `audio_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(filename)}`);
    
    try {
      // Write buffer to temp file
      await fs.writeFile(tempFilePath, audioBuffer);
      
      // Transcribe using file method
      const result = await transcribeAudio(tempFilePath, options);
      
      return result;
      
    } finally {
      // Cleanup temp file
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
    
  } catch (error) {
    throw createError(`Buffer transcription failed: ${error.message}`, 500, 'ProcessingError');
  }
};

/**
 * Translate audio file using Whisper API
 * @param {string} filePath - Path to audio file
 * @param {string} targetLanguage - Target language code
 * @param {Object} options - Translation options
 * @returns {Promise<Object>} Translation result
 */
const translateAudio = async (filePath, targetLanguage = 'en', options = {}) => {
  try {
    // Validate file
    const validation = await validateAudioFile(filePath);
    
    if (!validation.isValid) {
      throw createError(validation.error, 400, 'ValidationError');
    }
    
    // Check API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw createError('OpenAI API key not configured', 500, 'ConfigurationError');
    }
    
    // Prepare form data
    const formData = new FormData();
    const fileStream = await fs.readFile(filePath);
    
    formData.append('file', fileStream, {
      filename: validation.filename,
      contentType: getContentType(validation.extension)
    });
    
    formData.append('model', WHISPER_CONFIG.model);
    
    // Set target language
    if (targetLanguage && WHISPER_CONFIG.supportedLanguages.includes(targetLanguage)) {
      // Note: Whisper translation API automatically translates to English
      // For other languages, we might need additional processing
      if (targetLanguage !== 'en') {
        console.warn(`Whisper only translates to English. Requested: ${targetLanguage}`);
      }
    }
    
    // Set prompt if provided
    if (options.prompt && options.prompt.length > 0) {
      formData.append('prompt', options.prompt.substring(0, 1000));
    }
    
    // Set response format
    formData.append('response_format', options.responseFormat || 'json');
    
    // Make API request to translations endpoint
    const startTime = Date.now();
    
    const response = await axios.post(
      `${WHISPER_CONFIG.apiUrl}/audio/translations`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formData.getHeaders()
        },
        timeout: 300000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    const processingTime = Date.now() - startTime;
    
    // Prepare result
    const result = {
      text: response.data.text || '',
      processingTime,
      fileInfo: {
        filename: validation.filename,
        fileSize: validation.fileSize,
        extension: validation.extension
      },
      translation: {
        targetLanguage: 'en', // Whisper only translates to English
        originalLanguage: response.data.language || 'unknown'
      },
      apiResponse: response.data,
      timestamp: new Date().toISOString()
    };
    
    return result;
    
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 400:
          throw createError(`Invalid translation request: ${data.error?.message || 'Bad request'}`, 400, 'ValidationError');
        case 401:
          throw createError('Invalid OpenAI API key', 401, 'AuthenticationError');
        case 429:
          throw createError('Rate limit exceeded for translation', 429, 'RateLimitError');
        default:
          throw createError(`Translation API error: ${data.error?.message || 'Unknown error'}`, status, 'ApiError');
      }
    }
    
    throw createError(`Translation failed: ${error.message}`, 500, 'ProcessingError');
  }
};

/**
 * Get supported languages
 * @returns {Object} Supported languages information
 */
const getSupportedLanguages = () => {
  const languageNames = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'nl': 'Dutch',
    'ru': 'Russian',
    'ja': 'Japanese',
    'zh': 'Chinese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'tr': 'Turkish',
    'pl': 'Polish',
    'sv': 'Swedish',
    'da': 'Danish',
    'no': 'Norwegian',
    'fi': 'Finnish',
    'el': 'Greek'
  };
  
  return {
    languages: WHISPER_CONFIG.supportedLanguages.map(code => ({
      code,
      name: languageNames[code] || code,
      supportsTranscription: true,
      supportsTranslation: code !== 'en' // All non-English languages support translation to English
    })),
    defaultLanguage: WHISPER_CONFIG.defaultLanguage,
    totalLanguages: WHISPER_CONFIG.supportedLanguages.length
  };
};

/**
 * Get service configuration
 * @returns {Object} Service configuration
 */
const getServiceConfig = () => {
  return {
    ...WHISPER_CONFIG,
    apiKeyConfigured: !!process.env.OPENAI_API_KEY,
    maxFileSizeHuman: `${WHISPER_CONFIG.maxFileSize / (1024 * 1024)}MB`,
    supportedFormats: WHISPER_CONFIG.supportedFormats,
    maxAudioDurationHuman: `${WHISPER_CONFIG.maxAudioDuration / 60} minutes`
  };
};

/**
 * Estimate transcription cost
 * @param {number} audioDuration - Audio duration in seconds
 * @returns {Object} Cost estimation
 */
const estimateCost = (audioDuration) => {
  // Whisper pricing: $0.006 per minute
  const pricePerMinute = 0.006;
  const minutes = audioDuration / 60;
  const cost = minutes * pricePerMinute;
  
  return {
    audioDuration,
    minutes: Math.round(minutes * 100) / 100,
    cost: Math.round(cost * 10000) / 10000, // Round to 4 decimal places
    currency: 'USD',
    pricePerMinute,
    estimatedApiCalls: 1
  };
};

/**
 * Batch transcribe multiple audio files
 * @param {Array<Object>} files - Array of file objects
 * @param {Object} options - Transcription options
 * @returns {Promise<Array<Object>>} Array of transcription results
 */
const batchTranscribe = async (files, options = {}) => {
  const results = [];
  
  for (const file of files) {
    try {
      const result = await transcribeAudio(file.path, {
        ...options,
        language: file.language || options.language
      });
      
      results.push({
        file: file.path,
        success: true,
        result
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

module.exports = {
  transcribeAudio,
  transcribeAudioBuffer,
  translateAudio,
  validateAudioFile,
  getSupportedLanguages,
  getServiceConfig,
  estimateCost,
  batchTranscribe,
  WHISPER_CONFIG
};