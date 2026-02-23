/**
 * Watermark Service
 * Adds watermarks to PDFs for free tier users
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { createError } = require('../middleware/error-handlers');

/**
 * Add watermark to PDF
 * @param {Buffer} pdfBuffer - Original PDF buffer
 * @param {Object} options - Watermark options
 * @returns {Promise<Buffer>} Watermarked PDF buffer
 */
const addWatermarkToPDF = async (pdfBuffer, options = {}) => {
  try {
    const {
      text = 'CVOptima Free Version',
      fontSize = 24,
      opacity = 0.3,
      angle = 45,
      color = rgb(0.5, 0.5, 0.5), // Gray color
      spacing = 200,
      position = 'diagonal' // 'diagonal', 'center', 'bottom', 'top'
    } = options;
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    
    // Get font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Calculate text width for positioning
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    
    // Add watermark to each page
    pages.forEach((page, pageIndex) => {
      const { width, height } = page.getSize();
      
      switch (position) {
        case 'diagonal':
          // Add diagonal watermarks across the page
          addDiagonalWatermarks(page, text, font, fontSize, opacity, angle, color, spacing, width, height);
          break;
          
        case 'center':
          // Single centered watermark
          page.drawText(text, {
            x: (width - textWidth) / 2,
            y: height / 2,
            size: fontSize,
            font,
            color,
            opacity,
            rotate: { type: 'degrees', angle }
          });
          break;
          
        case 'bottom':
          // Watermark at bottom center
          page.drawText(text, {
            x: (width - textWidth) / 2,
            y: 50,
            size: fontSize,
            font,
            color,
            opacity,
            rotate: { type: 'degrees', angle: 0 }
          });
          break;
          
        case 'top':
          // Watermark at top center
          page.drawText(text, {
            x: (width - textWidth) / 2,
            y: height - 50,
            size: fontSize,
            font,
            color,
            opacity,
            rotate: { type: 'degrees', angle: 0 }
          });
          break;
          
        default:
          addDiagonalWatermarks(page, text, font, fontSize, opacity, angle, color, spacing, width, height);
      }
    });
    
    // Save the watermarked PDF
    const watermarkedPdfBytes = await pdfDoc.save();
    return Buffer.from(watermarkedPdfBytes);
    
  } catch (error) {
    throw createError(`Failed to add watermark: ${error.message}`, 500, 'WatermarkError');
  }
};

/**
 * Add diagonal watermarks across the page
 * @param {PDFPage} page - PDF page
 * @param {string} text - Watermark text
 * @param {PDFFont} font - Font
 * @param {number} fontSize - Font size
 * @param {number} opacity - Opacity
 * @param {number} angle - Rotation angle
 * @param {Color} color - Text color
 * @param {number} spacing - Spacing between watermarks
 * @param {number} width - Page width
 * @param {number} height - Page height
 */
const addDiagonalWatermarks = (page, text, font, fontSize, opacity, angle, color, spacing, width, height) => {
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = fontSize;
  
  // Calculate diagonal positions
  const diagonalLength = Math.sqrt(width * width + height * height);
  const numWatermarks = Math.ceil(diagonalLength / spacing);
  
  for (let i = -numWatermarks; i <= numWatermarks; i++) {
    for (let j = -numWatermarks; j <= numWatermarks; j++) {
      const x = width / 2 + i * spacing - textWidth / 2;
      const y = height / 2 + j * spacing - textHeight / 2;
      
      // Only draw if within page bounds
      if (x + textWidth > 0 && x < width && y + textHeight > 0 && y < height) {
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color,
          opacity,
          rotate: { type: 'degrees', angle }
        });
      }
    }
  }
};

/**
 * Add watermark with user-specific text
 * @param {Buffer} pdfBuffer - Original PDF buffer
 * @param {Object} user - User object
 * @param {string} watermarkType - Type of watermark
 * @returns {Promise<Buffer>} Watermarked PDF buffer
 */
const addUserWatermark = async (pdfBuffer, user, watermarkType = 'free_tier') => {
  try {
    const watermarkConfigs = {
      free_tier: {
        text: `CVOptima Free Version - ${user.email}`,
        fontSize: 20,
        opacity: 0.2,
        angle: 30,
        color: rgb(0.7, 0.1, 0.1), // Reddish color
        position: 'diagonal'
      },
      
      trial: {
        text: `CVOptima Trial - Expires ${formatDate(user.subscription.expiresAt)}`,
        fontSize: 18,
        opacity: 0.15,
        angle: 0,
        color: rgb(0.1, 0.1, 0.7), // Blueish color
        position: 'bottom'
      },
      
      basic: {
        text: 'CVOptima Basic',
        fontSize: 16,
        opacity: 0.1,
        angle: 0,
        color: rgb(0.1, 0.5, 0.1), // Greenish color
        position: 'bottom'
      },
      
      demo: {
        text: 'DEMO VERSION - NOT FOR COMMERCIAL USE',
        fontSize: 22,
        opacity: 0.25,
        angle: 45,
        color: rgb(0.8, 0.2, 0), // Orange color
        position: 'diagonal'
      },
      
      sample: {
        text: 'SAMPLE - Generated by CVOptima',
        fontSize: 18,
        opacity: 0.15,
        angle: 0,
        color: rgb(0.3, 0.3, 0.3), // Gray color
        position: 'top'
      }
    };
    
    const config = watermarkConfigs[watermarkType] || watermarkConfigs.free_tier;
    
    // Add date to watermark text
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    config.text = `${config.text} - Generated ${date}`;
    
    return await addWatermarkToPDF(pdfBuffer, config);
    
  } catch (error) {
    throw createError(`Failed to add user watermark: ${error.message}`, 500, 'WatermarkError');
  }
};

/**
 * Format date for watermark
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
const formatDate = (date) => {
  if (!date) return 'Unknown';
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Create watermark for CV analysis results
 * @param {Buffer} pdfBuffer - Original PDF buffer
 * @param {Object} analysis - Analysis results
 * @returns {Promise<Buffer>} Watermarked PDF buffer
 */
const addAnalysisWatermark = async (pdfBuffer, analysis) => {
  try {
    const score = analysis.score || 0;
    const grade = getGradeFromScore(score);
    
    const watermarkText = `CV Score: ${score}/100 (${grade}) - CVOptima Analysis`;
    
    const config = {
      text: watermarkText,
      fontSize: 16,
      opacity: 0.15,
      angle: 0,
      color: getColorFromScore(score),
      position: 'bottom',
      spacing: 300
    };
    
    return await addWatermarkToPDF(pdfBuffer, config);
    
  } catch (error) {
    throw createError(`Failed to add analysis watermark: ${error.message}`, 500, 'WatermarkError');
  }
};

/**
 * Get grade from score
 * @param {number} score - ATS score
 * @returns {string} Grade
 */
const getGradeFromScore = (score) => {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
};

/**
 * Get color from score
 * @param {number} score - ATS score
 * @returns {Color} PDF color
 */
const getColorFromScore = (score) => {
  if (score >= 80) return rgb(0.1, 0.6, 0.1); // Green
  if (score >= 60) return rgb(0.9, 0.6, 0.1); // Orange
  return rgb(0.8, 0.1, 0.1); // Red
};

/**
 * Add multiple watermarks for different purposes
 * @param {Buffer} pdfBuffer - Original PDF buffer
 * @param {Array<Object>} watermarks - Array of watermark configurations
 * @returns {Promise<Buffer>} Watermarked PDF buffer
 */
const addMultipleWatermarks = async (pdfBuffer, watermarks) => {
  try {
    let currentBuffer = pdfBuffer;
    
    for (const watermark of watermarks) {
      currentBuffer = await addWatermarkToPDF(currentBuffer, watermark);
    }
    
    return currentBuffer;
    
  } catch (error) {
    throw createError(`Failed to add multiple watermarks: ${error.message}`, 500, 'WatermarkError');
  }
};

/**
 * Create watermark for exported CV with recommendations
 * @param {Buffer} pdfBuffer - Original PDF buffer
 * @param {Object} cvData - CV data
 * @param {Array<string>} recommendations - Improvement recommendations
 * @returns {Promise<Buffer>} Watermarked PDF buffer
 */
const addRecommendationWatermark = async (pdfBuffer, cvData, recommendations) => {
  try {
    // Create recommendation text
    const recText = recommendations.slice(0, 3).join(' • ');
    const watermarkText = `CVOptima Recommendations: ${recText}`;
    
    const config = {
      text: watermarkText,
      fontSize: 12,
      opacity: 0.1,
      angle: 0,
      color: rgb(0.2, 0.2, 0.6), // Blue color
      position: 'bottom',
      spacing: 400
    };
    
    return await addWatermarkToPDF(pdfBuffer, config);
    
  } catch (error) {
    throw createError(`Failed to add recommendation watermark: ${error.message}`, 500, 'WatermarkError');
  }
};

/**
 * Check if PDF needs watermarking based on user subscription
 * @param {Object} user - User object
 * @returns {boolean} True if watermarking is required
 */
const needsWatermarking = (user) => {
  // Free tier users always get watermarks
  if (user.subscription.type === 'free') {
    return true;
  }
  
  // Trial users get watermarks
  if (user.subscription.type === 'trial') {
    return true;
  }
  
  // Basic users get light watermarks
  if (user.subscription.type === 'basic') {
    return true;
  }
  
  // Premium and enterprise users don't get watermarks
  return false;
};

/**
 * Get watermark configuration based on user subscription
 * @param {Object} user - User object
 * @returns {Object} Watermark configuration
 */
const getWatermarkConfigForUser = (user) => {
  const configs = {
    free: {
      type: 'free_tier',
      intensity: 'high',
      message: 'Free Version'
    },
    
    trial: {
      type: 'trial',
      intensity: 'medium',
      message: 'Trial Version'
    },
    
    basic: {
      type: 'basic',
      intensity: 'low',
      message: 'Basic Version'
    },
    
    premium: {
      type: null, // No watermark
      intensity: 'none',
      message: null
    },
    
    enterprise: {
      type: null,
      intensity: 'none',
      message: null
    }
  };
  
  return configs[user.subscription.type] || configs.free;
};

/**
 * Process PDF with appropriate watermarks
 * @param {Buffer} pdfBuffer - Original PDF buffer
 * @param {Object} user - User object
 * @param {Object} context - Additional context (analysis, cv data, etc.)
 * @returns {Promise<Buffer>} Processed PDF buffer
 */
const processPDFWithWatermarks = async (pdfBuffer, user, context = {}) => {
  try {
    // Check if watermarking is needed
    if (!needsWatermarking(user)) {
      return pdfBuffer; // Return original for premium users
    }
    
    let watermarkedBuffer = pdfBuffer;
    const userConfig = getWatermarkConfigForUser(user);
    
    // Add user-specific watermark
    if (userConfig.type) {
      watermarkedBuffer = await addUserWatermark(watermarkedBuffer, user, userConfig.type);
    }
    
    // Add analysis watermark if available
    if (context.analysis) {
      watermarkedBuffer = await addAnalysisWatermark(watermarkedBuffer, context.analysis);
    }
    
    // Add recommendation watermark if available
    if (context.recommendations && context.recommendations.length > 0) {
      watermarkedBuffer = await addRecommendationWatermark(
        watermarkedBuffer,
        context.cvData || {},
        context.recommendations
      );
    }
    
    return watermarkedBuffer;
    
  } catch (error) {
    // If watermarking fails, return original PDF
    console.error('Watermarking failed, returning original PDF:', error.message);
    return pdfBuffer;
  }
};

/**
 * Create watermark preview (for testing)
 * @param {Object} options - Watermark options
 * @returns {Promise<Buffer>} PDF buffer with watermark preview
 */
const createWatermarkPreview = async (options = {}) => {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    
    const { width, height } = page.getSize();
    
    // Add title
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    page.drawText('Watermark Preview', {
      x: 50,
      y: height - 50,
      size: 24,
      font,
      color: rgb(0, 0, 0)
    });
    
    // Add sample content
    const normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText('This is a sample document to demonstrate watermarking.', {
      x: 50,
      y: height - 100,
      size: 14,
      font: normalFont,
      color: rgb(0, 0, 0)
    });
    
    page.drawText('Watermarks are added based on user subscription tier.', {
      x: 50,
      y: height - 130,
      size: 14,
      font: normalFont,
      color: rgb(0, 0, 0)
    });
    
    // Add the requested watermark
    const watermarkedBuffer = await addWatermarkToPDF(
      await pdfDoc.save(),
      options
    );
    
    return Buffer.from(watermarkedBuffer);
    
  } catch (error) {
    throw createError(`Failed to create watermark preview: ${error.message}`, 500, 'WatermarkError');
  }
};

module.exports = {
  addWatermarkToPDF,
  addUserWatermark,
  addAnalysisWatermark,
  addMultipleWatermarks,
  addRecommendationWatermark,
  needsWatermarking,
  getWatermarkConfigForUser,
  processPDFWithWatermarks,
  createWatermarkPreview,
  getGradeFromScore,
  getColorFromScore
};