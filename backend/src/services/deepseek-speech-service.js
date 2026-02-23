/**
 * DeepSeek Speech-to-Text Service
 * Free alternative to Whisper API using DeepSeek's capabilities
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { createError } = require('../middleware/error-handlers');

/**
 * Configuration for DeepSeek Speech API
 */
const DEEPSEEK_SPEECH_CONFIG = {
  apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com',
  model: process.env.DEEPSEEK_SPEECH_MODEL || 'deepseek-speech',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: ['.mp3', '.wav', '.m4a', '.ogg', '.flac'],
  maxAudioDuration: 5 * 60, // 5 minutes in seconds (free tier limit)
  defaultLanguage: 'en',
  supportedLanguages: [
    'en', // English
    'zh', // Chinese
    'es', // Spanish
    'fr', // French
    'de', // German
    'it', // Italian
    'pt', // Portuguese
    'ru', // Russian
    'ja', // Japanese
    'ko', // Korean
    'ar', // Arabic
    'hi', // Hindi
  ],
  // Free tier limits
  freeTierLimits: {
    dailyMinutes: 30,
    monthlyMinutes: 300,
    maxFileSize: 10 * 1024 * 1024,
    maxDuration: 5 * 60,
  }
};

/**
 * Get DeepSeek API key from environment
 */
const getDeepSeekApiKey = () => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured in environment variables');
  }
  return apiKey;
};

/**
 * Validate audio file
 */
const validateAudioFile = async (filePath, fileSize) => {
  // Check file size
  if (fileSize > DEEPSEEK_SPEECH_CONFIG.maxFileSize) {
    throw createError(
      `Audio file too large. Maximum size is ${DEEPSEEK_SPEECH_CONFIG.maxFileSize / (1024 * 1024)}MB`,
      400,
      'ValidationError'
    );
  }

  // Check file extension
  const ext = path.extname(filePath).toLowerCase();
  if (!DEEPSEEK_SPEECH_CONFIG.supportedFormats.includes(ext)) {
    throw createError(
      `Unsupported audio format. Supported formats: ${DEEPSEEK_SPEECH_CONFIG.supportedFormats.join(', ')}`,
      400,
      'ValidationError'
    );
  }

  // Check if file exists
  try {
    await fs.access(filePath);
  } catch (error) {
    throw createError('Audio file not found', 404, 'NotFoundError');
  }
};

/**
 * Transcribe audio using DeepSeek Speech API
 */
const transcribeAudio = async (audioBuffer, options = {}) => {
  try {
    const apiKey = getDeepSeekApiKey();
    
    // Prepare form data
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: `audio_${Date.now()}.wav`,
      contentType: 'audio/wav'
    });
    formData.append('model', options.model || DEEPSEEK_SPEECH_CONFIG.model);
    
    if (options.language) {
      formData.append('language', options.language);
    }
    
    if (options.prompt) {
      formData.append('prompt', options.prompt);
    }
    
    if (options.response_format) {
      formData.append('response_format', options.response_format);
    }

    // Make API request
    const response = await axios.post(
      `${DEEPSEEK_SPEECH_CONFIG.apiUrl}/audio/transcriptions`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    return response.data;

  } catch (error) {
    console.error('DeepSeek Speech API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      throw createError('Invalid DeepSeek API key', 401, 'AuthError');
    } else if (error.response?.status === 429) {
      throw createError('Rate limit exceeded. Please try again later.', 429, 'RateLimitError');
    } else if (error.response?.status === 400) {
      throw createError(
        error.response.data?.error?.message || 'Invalid audio file or parameters',
        400,
        'ValidationError'
      );
    } else {
      throw createError(
        'Speech recognition service temporarily unavailable',
        503,
        'ServiceError'
      );
    }
  }
};

/**
 * Translate audio using DeepSeek Speech API
 */
const translateAudio = async (audioBuffer, options = {}) => {
  try {
    const apiKey = getDeepSeekApiKey();
    
    // Prepare form data
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: `audio_${Date.now()}.wav`,
      contentType: 'audio/wav'
    });
    formData.append('model', options.model || DEEPSEEK_SPEECH_CONFIG.model);
    formData.append('target_language', options.targetLanguage || 'en');
    
    if (options.sourceLanguage) {
      formData.append('source_language', options.sourceLanguage);
    }
    
    if (options.prompt) {
      formData.append('prompt', options.prompt);
    }

    // Make API request
    const response = await axios.post(
      `${DEEPSEEK_SPEECH_CONFIG.apiUrl}/audio/translations`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    return response.data;

  } catch (error) {
    console.error('DeepSeek Speech Translation Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      throw createError('Invalid DeepSeek API key', 401, 'AuthError');
    } else if (error.response?.status === 429) {
      throw createError('Rate limit exceeded. Please try again later.', 429, 'RateLimitError');
    } else if (error.response?.status === 400) {
      throw createError(
        error.response.data?.error?.message || 'Invalid audio file or parameters',
        400,
        'ValidationError'
      );
    } else {
      throw createError(
        'Speech translation service temporarily unavailable',
        503,
        'ServiceError'
      );
    }
  }
};

/**
 * Estimate cost for transcription/translation
 */
const estimateCost = (audioDuration, service = 'transcription') => {
  // DeepSeek Speech is free for reasonable usage
  // This function estimates if user is within free tier limits
  
  const minutes = audioDuration / 60;
  
  if (minutes > DEEPSEEK_SPEECH_CONFIG.freeTierLimits.maxDuration / 60) {
    return {
      cost: 0,
      message: 'Audio exceeds free tier duration limit',
      withinLimits: false,
      limitExceeded: 'duration'
    };
  }
  
  // For free tier, always return 0 cost
  return {
    cost: 0,
    message: 'Free tier - within limits',
    withinLimits: true,
    estimatedMinutes: minutes
  };
};

/**
 * Get supported languages
 */
const getSupportedLanguages = () => {
  return {
    languages: DEEPSEEK_SPEECH_CONFIG.supportedLanguages.map(code => ({
      code,
      name: getLanguageName(code),
      supported: true
    })),
    defaultLanguage: DEEPSEEK_SPEECH_CONFIG.defaultLanguage
  };
};

/**
 * Get language name from code
 */
const getLanguageName = (code) => {
  const languageNames = {
    'en': 'English',
    'zh': 'Chinese',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic',
    'hi': 'Hindi',
  };
  return languageNames[code] || code;
};

/**
 * Process batch audio files
 */
const processBatch = async (audioFiles, options = {}) => {
  const results = [];
  
  for (const file of audioFiles) {
    try {
      const result = await transcribeAudio(file.buffer, {
        ...options,
        language: file.language || options.language
      });
      
      results.push({
        fileId: file.id,
        success: true,
        transcription: result.text,
        language: result.language,
        duration: result.duration
      });
    } catch (error) {
      results.push({
        fileId: file.id,
        success: false,
        error: error.message,
        errorCode: error.code
      });
    }
  }
  
  return results;
};

module.exports = {
  transcribeAudio,
  translateAudio,
  validateAudioFile,
  estimateCost,
  getSupportedLanguages,
  processBatch,
  config: DEEPSEEK_SPEECH_CONFIG
};