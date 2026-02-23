/**
 * DOCX text extraction service using mammoth
 * Extracts text, HTML, and metadata from DOCX files
 */

const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const { createError } = require('../middleware/error-handlers');

/**
 * Default options for mammoth
 */
const DEFAULT_OPTIONS = {
  includeEmbeddedStyleMap: true,
  includeDefaultStyleMap: true,
  styleMap: [
    "p[style-name='Title'] => h1:fresh",
    "p[style-name='Heading 1'] => h2:fresh",
    "p[style-name='Heading 2'] => h3:fresh",
    "p[style-name='Heading 3'] => h4:fresh",
    "p[style-name='Heading 4'] => h5:fresh",
    "p[style-name='Heading 5'] => h6:fresh",
    "p[style-name='Heading 6'] => h6:fresh",
    "r[style-name='Strong'] => strong",
    "r[style-name='Emphasis'] => em",
    "r[style-name='Code'] => code",
    "p[style-name='List Paragraph'] => li",
    "p[style-name='Quote'] => blockquote > p:fresh",
    "p[style-name='Intense Quote'] => blockquote > p:fresh"
  ],
  convertImage: mammoth.images.imgElement(() => ({})), // Don't embed images
  ignoreEmptyParagraphs: true
};

/**
 * Clean extracted text
 * @param {string} text - Raw extracted text
 * @returns {string} Cleaned text
 */
const cleanText = (text) => {
  if (!text) return '';
  
  // Remove extra whitespace but preserve paragraph structure
  let cleaned = text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')   // Handle Mac line endings
    .replace(/\t/g, ' ')    // Replace tabs with spaces
    .replace(/[ \t]+/g, ' ') // Collapse multiple spaces/tabs
    .replace(/\n\s*\n\s*\n+/g, '\n\n') // Collapse multiple blank lines
    .trim();
  
  // Remove common DOCX artifacts and control characters
  cleaned = cleaned
    .replace(/�/g, '')      // Remove replacement characters
    .replace(/\x00/g, '')   // Remove null characters
    .replace(/[\x01-\x1F\x7F]/g, ''); // Remove control characters
  
  // Clean up bullet points and numbering
  cleaned = cleaned
    .replace(/^[•◦‣⁃]\s*/gm, '• ') // Standardize bullet points
    .replace(/^\d+[\.\)]\s*/gm, (match) => match.replace(/\s+$/, ' ') + ' '); // Standardize numbering
  
  return cleaned;
};

/**
 * Calculate text statistics
 * @param {string} text - Text to analyze
 * @returns {Object} Text statistics
 */
const calculateStats = (text) => {
  if (!text) {
    return {
      characters: 0,
      words: 0,
      lines: 0,
      paragraphs: 0,
      sentences: 0
    };
  }
  
  const characters = text.length;
  const words = text.split(/\s+/).filter(word => word.length > 0).length;
  const lines = text.split('\n').length;
  const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0).length;
  
  // Approximate sentence count (simple heuristic)
  const sentences = (text.match(/[.!?]+(\s|$)/g) || []).length;
  
  return {
    characters,
    words,
    lines,
    paragraphs,
    sentences,
    avgWordLength: words > 0 ? characters / words : 0,
    avgWordsPerLine: lines > 0 ? words / lines : 0,
    avgWordsPerParagraph: paragraphs > 0 ? words / paragraphs : 0,
    avgSentencesPerParagraph: paragraphs > 0 ? sentences / paragraphs : 0
  };
};

/**
 * Extract metadata from DOCX
 * @param {string} filePath - Path to DOCX file
 * @returns {Promise<Object>} DOCX metadata
 */
const extractMetadata = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    
    return {
      fileSize: stats.size,
      fileName: path.basename(filePath),
      fileExtension: path.extname(filePath).toLowerCase(),
      lastModified: stats.mtime,
      created: stats.birthtime,
      isValid: true,
      extractionDate: new Date().toISOString()
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
      extractionDate: new Date().toISOString()
    };
  }
};

/**
 * Extract text from DOCX file
 * @param {string} filePath - Path to DOCX file
 * @param {Object} options - mammoth options
 * @returns {Promise<Object>} Extraction result with text and metadata
 */
const extractText = async (filePath, options = {}) => {
  try {
    // Validate file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw createError(`DOCX file not found: ${filePath}`, 404, 'NotFoundError');
    }
    
    // Merge options
    const extractOptions = { ...DEFAULT_OPTIONS, ...options };
    
    // Extract text using mammoth
    const result = await mammoth.extractRawText({ path: filePath }, extractOptions);
    
    // Clean extracted text
    const cleanedText = cleanText(result.value);
    
    // Calculate statistics
    const stats = calculateStats(cleanedText);
    
    // Extract metadata
    const metadata = await extractMetadata(filePath);
    
    // Check for images
    const hasImages = result.messages.some(msg => 
      msg.message && msg.message.includes('image')
    );
    
    // Prepare final result
    const extractionResult = {
      text: cleanedText,
      rawText: result.value,
      html: null, // Will be populated if extractWithHtml is used
      messages: result.messages || [],
      stats,
      metadata,
      hasImages,
      images: [],
      extractionDate: new Date().toISOString(),
      filePath,
      fileSize: metadata.fileSize
    };
    
    return extractionResult;
    
  } catch (error) {
    // Enhance error messages
    if (error.message.includes('not a valid DOCX file') || 
        error.message.includes('Invalid DOCX')) {
      throw createError('Invalid or corrupted DOCX file', 400, 'ValidationError');
    }
    
    if (error.message.includes('not a zip file')) {
      throw createError('File is not a valid DOCX (not a ZIP archive)', 400, 'ValidationError');
    }
    
    throw createError(`DOCX extraction failed: ${error.message}`, 500, 'ProcessingError');
  }
};

/**
 * Extract text from DOCX buffer
 * @param {Buffer} docxBuffer - DOCX file buffer
 * @param {Object} options - mammoth options
 * @returns {Promise<Object>} Extraction result
 */
const extractTextFromBuffer = async (docxBuffer, options = {}) => {
  try {
    // Merge options
    const extractOptions = { ...DEFAULT_OPTIONS, ...options };
    
    // Extract text using mammoth
    const result = await mammoth.extractRawText({ buffer: docxBuffer }, extractOptions);
    
    // Clean extracted text
    const cleanedText = cleanText(result.value);
    
    // Calculate statistics
    const stats = calculateStats(cleanedText);
    
    // Prepare result
    const extractionResult = {
      text: cleanedText,
      rawText: result.value,
      html: null,
      messages: result.messages || [],
      stats,
      hasImages: result.messages.some(msg => 
        msg.message && msg.message.includes('image')
      ),
      images: [],
      extractionDate: new Date().toISOString(),
      fileSize: docxBuffer.length
    };
    
    return extractionResult;
    
  } catch (error) {
    if (error.message.includes('not a valid DOCX file')) {
      throw createError('Invalid DOCX file structure', 400, 'ValidationError');
    }
    
    throw createError(`DOCX extraction failed: ${error.message}`, 500, 'ProcessingError');
  }
};

/**
 * Extract text and HTML from DOCX
 * @param {string} filePath - Path to DOCX file
 * @param {Object} options - mammoth options
 * @returns {Promise<Object>} Extraction result with text and HTML
 */
const extractWithHtml = async (filePath, options = {}) => {
  try {
    // Validate file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw createError(`DOCX file not found: ${filePath}`, 404, 'NotFoundError');
    }
    
    // Merge options
    const extractOptions = { ...DEFAULT_OPTIONS, ...options };
    
    // Extract both text and HTML
    const [textResult, htmlResult] = await Promise.all([
      mammoth.extractRawText({ path: filePath }, extractOptions),
      mammoth.convertToHtml({ path: filePath }, extractOptions)
    ]);
    
    // Clean extracted text
    const cleanedText = cleanText(textResult.value);
    
    // Calculate statistics
    const stats = calculateStats(cleanedText);
    
    // Extract metadata
    const metadata = await extractMetadata(filePath);
    
    // Combine messages
    const allMessages = [
      ...(textResult.messages || []),
      ...(htmlResult.messages || [])
    ];
    
    // Prepare final result
    const extractionResult = {
      text: cleanedText,
      rawText: textResult.value,
      html: htmlResult.value,
      messages: allMessages,
      stats,
      metadata,
      hasImages: allMessages.some(msg => 
        msg.message && msg.message.includes('image')
      ),
      images: [],
      extractionDate: new Date().toISOString(),
      filePath,
      fileSize: metadata.fileSize
    };
    
    return extractionResult;
    
  } catch (error) {
    throw createError(`DOCX extraction failed: ${error.message}`, 500, 'ProcessingError');
  }
};

/**
 * Validate DOCX file
 * @param {string} filePath - Path to DOCX file
 * @returns {Promise<boolean>} True if DOCX is valid
 */
const validateDocx = async (filePath) => {
  try {
    // Check file exists
    await fs.access(filePath);
    
    // Read first few bytes to check DOCX signature
    const buffer = Buffer.alloc(4);
    const fd = await fs.open(filePath, 'r');
    await fd.read(buffer, 0, 4, 0);
    await fd.close();
    
    // Check DOCX signature (ZIP file with PK header)
    const signature = buffer.toString('hex');
    if (signature !== '504b0304') { // PK\x03\x04 in hex
      return false;
    }
    
    // Try to extract a small portion to validate structure
    const fileBuffer = await fs.readFile(filePath);
    const limitedBuffer = fileBuffer.slice(0, Math.min(fileBuffer.length, 1024 * 1024)); // First 1MB
    
    try {
      await mammoth.extractRawText({ buffer: limitedBuffer }, { 
        ...DEFAULT_OPTIONS,
        ignoreEmptyParagraphs: true 
      });
      return true;
    } catch {
      return false;
    }
    
  } catch (error) {
    return false;
  }
};

/**
 * Get DOCX file information
 * @param {string} filePath - Path to DOCX file
 * @returns {Promise<Object>} DOCX information
 */
const getDocxInfo = async (filePath) => {
  try {
    const metadata = await extractMetadata(filePath);
    
    // Try to get basic info without full parsing
    const fileBuffer = await fs.readFile(filePath);
    const limitedBuffer = fileBuffer.slice(0, Math.min(fileBuffer.length, 1024 * 1024));
    
    const result = await mammoth.extractRawText({ buffer: limitedBuffer }, {
      ...DEFAULT_OPTIONS,
      ignoreEmptyParagraphs: true
    });
    
    return {
      ...metadata,
      hasContent: result.value.length > 0,
      messageCount: result.messages ? result.messages.length : 0,
      hasWarnings: result.messages ? result.messages.some(m => m.type === 'warning') : false,
      hasImages: result.messages ? result.messages.some(m => m.message && m.message.includes('image')) : false
    };
    
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
      extractionDate: new Date().toISOString()
    };
  }
};

/**
 * Extract raw text without cleaning
 * @param {string} filePath - Path to DOCX file
 * @param {Object} options - mammoth options
 * @returns {Promise<Object>} Raw extraction result
 */
const extractRawText = async (filePath, options = {}) => {
  const extractOptions = { ...DEFAULT_OPTIONS, ...options };
  
  const result = await mammoth.extractRawText({ path: filePath }, extractOptions);
  
  const stats = calculateStats(result.value);
  
  return {
    rawText: result.value,
    text: cleanText(result.value), // Also provide cleaned version
    messages: result.messages || [],
    stats,
    extractionDate: new Date().toISOString()
  };
};

/**
 * Batch extract text from multiple DOCXs
 * @param {Array<string>} filePaths - Array of DOCX file paths
 * @param {Object} options - Extraction options
 * @returns {Promise<Array<Object>>} Array of extraction results
 */
const batchExtractText = async (filePaths, options = {}) => {
  const results = [];
  
  for (const filePath of filePaths) {
    try {
      const result = await extractText(filePath, options);
      results.push({
        filePath,
        success: true,
        result
      });
    } catch (error) {
      results.push({
        filePath,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
};

module.exports = {
  extractText,
  extractTextFromBuffer,
  extractWithHtml,
  extractRawText,
  validateDocx,
  getDocxInfo,
  extractMetadata,
  batchExtractText,
  cleanText,
  calculateStats,
  DEFAULT_OPTIONS
};