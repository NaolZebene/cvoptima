/**
 * CV controller
 * Handles CV upload, processing, and management
 */

const fs = require('fs').promises;
const path = require('path');
const CV = require('../models/CV');
const User = require('../models/User');
const { createError, ValidationError } = require('../middleware/error-handlers');
const { UPLOAD_DIR } = require('../middleware/file-upload');

/**
 * Upload CV file
 * POST /api/v1/cv/upload
 */
const uploadCV = async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      throw new ValidationError('No file uploaded');
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
    
    // Create CV document
    const cv = await CV.create({
      user: user._id,
      originalFilename: fileInfo.originalName,
      storedFilename: fileInfo.filename,
      filePath: fileInfo.path,
      fileSize: fileInfo.size,
      mimeType: fileInfo.mimetype,
      extension: fileInfo.extension,
      status: 'uploaded',
      uploadSource: req.body.source || 'web'
    });
    
    // Increment user's CV count
    await user.incrementCvCount();
    
    // Prepare response
    const cvResponse = cv.toJSON();
    
    res.status(201).json({
      success: true,
      message: 'CV uploaded successfully',
      cv: cvResponse,
      file: {
        originalName: fileInfo.originalName,
        size: fileInfo.size,
        mimeType: fileInfo.mimetype
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
 * Get user's CVs
 * GET /api/v1/cv
 */
const getCVs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, limit = 20, page = 1, sort = '-createdAt' } = req.query;
    
    // Parse pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query options
    const options = {};
    if (status) options.status = status;
    if (sort) options.sort = sort;
    if (limit) options.limit = parseInt(limit);
    if (skip) options.skip = skip;
    
    // Get CVs
    const cvs = await CV.findByUser(userId, options);
    
    // Get total count for pagination
    const total = await CV.countDocuments({ user: userId });
    
    // Get user stats
    const stats = await CV.getUserStats(userId);
    
    res.status(200).json({
      success: true,
      count: cvs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      cvs: cvs.map(cv => cv.toJSON()),
      stats
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get single CV
 * GET /api/v1/cv/:id
 */
const getCV = async (req, res, next) => {
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
    
    res.status(200).json({
      success: true,
      cv: cv.toJSON()
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Delete CV
 * DELETE /api/v1/cv/:id
 */
const deleteCV = async (req, res, next) => {
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
    
    // Delete file from disk
    try {
      await fs.unlink(cv.filePath);
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
      // Continue with DB deletion even if file deletion fails
    }
    
    // Delete from database
    await cv.deleteOne();
    
    // Decrement user's CV count
    const user = await User.findById(userId);
    if (user && user.stats.cvCount > 0) {
      user.stats.cvCount -= 1;
      await user.save({ validateBeforeSave: false });
    }
    
    res.status(200).json({
      success: true,
      message: 'CV deleted successfully'
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Update CV metadata
 * PUT /api/v1/cv/:id
 */
const updateCV = async (req, res, next) => {
  try {
    const cvId = req.params.id;
    const userId = req.user.id;
    const updates = req.body;
    
    // Find CV
    const cv = await CV.findOne({
      _id: cvId,
      user: userId
    });
    
    if (!cv) {
      throw createError('CV not found', 404, 'NotFoundError');
    }
    
    // Allowed updates
    const allowedUpdates = ['tags', 'customFields', 'isPublic'];
    const updateData = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });
    
    // Update CV
    Object.assign(cv, updateData);
    await cv.save();
    
    res.status(200).json({
      success: true,
      message: 'CV updated successfully',
      cv: cv.toJSON()
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Share CV
 * POST /api/v1/cv/:id/share
 */
const shareCV = async (req, res, next) => {
  try {
    const cvId = req.params.id;
    const userId = req.user.id;
    const { expiresInHours = 24 } = req.body;
    
    // Find CV
    const cv = await CV.findOne({
      _id: cvId,
      user: userId
    });
    
    if (!cv) {
      throw createError('CV not found', 404, 'NotFoundError');
    }
    
    // Generate share token
    await cv.generateShareToken(expiresInHours);
    
    res.status(200).json({
      success: true,
      message: 'CV shared successfully',
      shareUrl: cv.shareUrl,
      expiresAt: cv.shareExpiresAt
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke share
 * DELETE /api/v1/cv/:id/share
 */
const revokeShare = async (req, res, next) => {
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
    
    // Revoke share
    await cv.revokeShareToken();
    
    res.status(200).json({
      success: true,
      message: 'Share revoked successfully'
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get shared CV (public endpoint, no authentication required)
 * GET /share/cv/:token
 */
const getSharedCV = async (req, res, next) => {
  try {
    const { token } = req.params;
    
    // Find CV by share token
    const cv = await CV.findOne({ shareToken: token });
    
    if (!cv) {
      throw createError('Shared CV not found', 404, 'NotFoundError');
    }
    
    // Check if share is still valid
    if (!cv.isShareValid()) {
      throw createError('Share link has expired', 410, 'NotFoundError');
    }
    
    // Get basic CV info (no sensitive data)
    const cvResponse = cv.toJSON();
    
    // Remove file path and other sensitive info
    delete cvResponse.filePath;
    delete cvResponse.shareToken;
    delete cvResponse.shareExpiresAt;
    
    res.status(200).json({
      success: true,
      cv: cvResponse,
      shared: true
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Download CV file
 * GET /api/v1/cv/:id/download
 */
const downloadCV = async (req, res, next) => {
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
      throw createError('CV file not found', 404, 'NotFoundError');
    }
    
    // Set download headers
    res.setHeader('Content-Type', cv.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${cv.originalFilename}"`);
    res.setHeader('Content-Length', cv.fileSize);
    
    // Stream file
    const fileStream = fs.createReadStream(cv.filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get CV file (view)
 * GET /api/v1/cv/:id/file
 */
const getCVFile = async (req, res, next) => {
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
      throw createError('CV file not found', 404, 'NotFoundError');
    }
    
    // Set view headers
    res.setHeader('Content-Type', cv.mimeType);
    res.setHeader('Content-Length', cv.fileSize);
    
    // Stream file
    const fileStream = fs.createReadStream(cv.filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Process CV (start processing)
 * POST /api/v1/cv/:id/process
 */
const processCV = async (req, res, next) => {
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
    
    // Check if already processing or processed
    if (cv.status === 'processing') {
      throw createError('CV is already being processed', 400, 'ValidationError');
    }
    
    if (cv.status === 'processed') {
      throw createError('CV is already processed', 400, 'ValidationError');
    }
    
    // Update status to processing
    await cv.updateStatus('processing');
    
    // TODO: In production, this would queue a job for processing
    // For now, we'll just acknowledge the request
    
    res.status(202).json({
      success: true,
      message: 'CV processing started',
      cv: cv.toJSON(),
      processing: true
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get CV processing status
 * GET /api/v1/cv/:id/status
 */
const getCVStatus = async (req, res, next) => {
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
    
    res.status(200).json({
      success: true,
      status: cv.status,
      processingError: cv.processingError,
      processedAt: cv.processedAt,
      atsScore: cv.atsScore,
      hasAnalysis: !!cv.atsAnalysis
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadCV,
  getCVs,
  getCV,
  deleteCV,
  updateCV,
  shareCV,
  revokeShare,
  getSharedCV,
  downloadCV,
  getCVFile,
  processCV,
  getCVStatus
};