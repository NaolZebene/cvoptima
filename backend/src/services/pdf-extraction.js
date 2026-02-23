/**
 * PDF text extraction service using pdf-parse
 * Extracts text and metadata from PDF files
 */

const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const { createError } = require('../middleware/error-handlers');

/**
 * Default options for pdf-parse
 */
const DEFAULT_OPTIONS = {
  max: 0, // 0 = no limit, parse all pages
  version: 'v2.0.0', // PDF.js version
  pagerender: null, // Optional page render callback
  verbose: false // Set to true for debug output
};

/**
 * Clean extracted text
 * @param {string} text - Raw extracted text
 * @returns {string} Cleaned text
 */
const cleanText = (text) => {
  if (!text) return '';
  
  // Remove extra whitespace
  let cleaned = text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')   // Handle Mac line endings
    .replace(/\t/g, ' ')    // Replace tabs with spaces
    .replace(/\s+/g, ' ')   // Collapse multiple spaces
    .trim();
  
  // Remove common PDF artifacts
  cleaned = cleaned
    .replace(/�/g, '')      // Remove replacement characters
    .replace(/\x00/g, '')   // Remove null characters
    .replace(/[\x01-\x1F\x7F]/g, ''); // Remove control characters
  
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
      paragraphs: 0
    };
  }
  
  const characters = text.length;
  const words = text.split(/\s+/).filter(word => word.length > 0).length;
  const lines = text.split('\n').length;
  const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0).length;
  
  return {
    characters,
    words,
    lines,
    paragraphs,
    avgWordLength: words > 0 ? characters / words : 0,
    avgWordsPerLine: lines > 0 ? words / lines : 0
  };
};

/**
 * Extract text from PDF file
 * @param {string} filePath - Path to PDF file
 * @param {Object} options - pdf-parse options
 * @returns {Promise<Object>} Extraction result with text and metadata
 */
const extractText = async (filePath, options = {}) => {
  try {
    // Validate file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw createError(`PDF file not found: ${filePath}`, 404, 'NotFoundError');
    }
    
    // Read file
    const pdfBuffer = await fs.readFile(filePath);
    
    // Extract text
    const result = await extractTextFromBuffer(pdfBuffer, options);
    
    // Add file path to result
    result.filePath = filePath;
    result.fileSize = pdfBuffer.length;
    
    return result;
    
  } catch (error) {
    // Enhance error messages
    if (error.message.includes('Password required') || error.message.includes('encrypted')) {
      throw createError('PDF is password protected', 400, 'ValidationError');
    }
    
    if (error.message.includes('Invalid PDF') || error.message.includes('corrupted')) {
      throw createError('Invalid or corrupted PDF file', 400, 'ValidationError');
    }
    
    throw error;
  }
};

/**
 * Extract text from PDF buffer
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {Object} options - pdf-parse options
 * @returns {Promise<Object>} Extraction result
 */
const extractTextFromBuffer = async (pdfBuffer, options = {}) => {
  try {
    // Merge options
    const parseOptions = { ...DEFAULT_OPTIONS, ...options };
    
    // Parse PDF
    const data = await pdfParse(pdfBuffer, parseOptions);
    
    // Clean extracted text
    const cleanedText = cleanText(data.text);
    
    // Calculate statistics
    const stats = calculateStats(cleanedText);
    
    // Prepare result
    const result = {
      text: cleanedText,
      rawText: data.text,
      numpages: data.numpages,
      info: data.info || {},
      metadata: data.metadata || {},
      version: data.version,
      stats,
      extractionDate: new Date().toISOString()
    };
    
    return result;
    
  } catch (error) {
    // Check for specific PDF errors
    if (error.message.includes('Invalid PDF structure')) {
      throw createError('Invalid PDF structure', 400, 'ValidationError');
    }
    
    if (error.message.includes('file is empty')) {
      throw createError('PDF file is empty', 400, 'ValidationError');
    }
    
    throw createError(`PDF extraction failed: ${error.message}`, 500, 'ProcessingError');
  }
};

/**
 * Validate PDF file
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<boolean>} True if PDF is valid
 */
const validatePdf = async (filePath) => {
  try {
    // Check file exists
    await fs.access(filePath);
    
    // Read first few bytes to check PDF signature
    const buffer = Buffer.alloc(5);
    const fd = await fs.open(filePath, 'r');
    await fd.read(buffer, 0, 5, 0);
    await fd.close();
    
    // Check PDF signature (%PDF-)
    const signature = buffer.toString('ascii', 0, 5);
    if (signature !== '%PDF-') {
      return false;
    }
    
    // Try to parse a small portion to validate structure
    const fileBuffer = await fs.readFile(filePath);
    const limitedBuffer = fileBuffer.slice(0, Math.min(fileBuffer.length, 1024 * 1024)); // First 1MB
    
    try {
      await pdfParse(limitedBuffer, { max: 1 }); // Try to parse first page only
      return true;
    } catch {
      return false;
    }
    
  } catch (error) {
    return false;
  }
};

/**
 * Get PDF file information
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<Object>} PDF information
 */
const getPdfInfo = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    const buffer = await fs.readFile(filePath);
    
    // Get basic info without full parsing
    const data = await pdfParse(buffer, { max: 0 });
    
    return {
      fileSize: stats.size,
      numpages: data.numpages,
      info: data.info || {},
      metadata: data.metadata || {},
      version: data.version,
      isValid: true
    };
    
  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
};

/**
 * Extract text from PDF with progress reporting
 * @param {string} filePath - Path to PDF file
 * @param {Function} progressCallback - Progress callback function
 * @returns {Promise<Object>} Extraction result
 */
const extractTextWithProgress = async (filePath, progressCallback) => {
  const options = {
    pagerender: progressCallback
  };
  
  return extractText(filePath, options);
};

/**
 * Batch extract text from multiple PDFs
 * @param {Array<string>} filePaths - Array of PDF file paths
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

/**
 * Extract specific pages from PDF
 * @param {string} filePath - Path to PDF file
 * @param {Array<number>} pages - Array of page numbers (1-indexed)
 * @returns {Promise<Object>} Extraction result for specified pages
 */
const extractPages = async (filePath, pages) => {
  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    throw createError('Pages array is required', 400, 'ValidationError');
  }
  
  // Validate page numbers
  const validPages = pages.filter(page => Number.isInteger(page) && page > 0);
  if (validPages.length === 0) {
    throw createError('Invalid page numbers', 400, 'ValidationError');
  }
  
  const options = {
    max: Math.max(...validPages) // Parse up to the highest requested page
  };
  
  const result = await extractText(filePath, options);
  
  // Extract text for specific pages (simplified - pdf-parse doesn't support page-level extraction)
  // In a real implementation, you might need to modify pdf-parse or use a different library
  
  return {
    ...result,
    requestedPages: validPages,
    note: 'Full PDF extracted. Page-level extraction requires advanced PDF processing.'
  };
};

module.exports = {
  extractText,
  extractTextFromBuffer,
  validatePdf,
  getPdfInfo,
  extractTextWithProgress,
  batchExtractText,
  extractPages,
  cleanText,
  calculateStats,
  DEFAULT_OPTIONS
};