/**
 * CV Mongoose model
 * Schema for CV uploads and processing
 */

const mongoose = require('mongoose');

const cvSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  
  originalFilename: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  
  storedFilename: {
    type: String,
    required: [true, 'Stored filename is required'],
    trim: true
  },
  
  filePath: {
    type: String,
    required: [true, 'File path is required'],
    trim: true
  },
  
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [1, 'File size must be at least 1 byte']
  },
  
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    enum: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },
  
  extension: {
    type: String,
    required: [true, 'File extension is required'],
    enum: ['.pdf', '.docx']
  },
  
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'processed', 'error', 'archived'],
    default: 'uploaded',
    index: true
  },
  
  processingError: {
    type: String,
    default: null
  },
  
  // Extracted content
  extractedText: {
    type: String,
    default: null
  },
  
  textLength: {
    type: Number,
    default: 0
  },
  
  // ATS analysis results
  atsScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  
  atsAnalysis: {
    keywords: [{
      keyword: String,
      count: Number,
      relevance: Number
    }],
    sections: {
      contact: { present: Boolean, score: Number },
      summary: { present: Boolean, score: Number },
      experience: { present: Boolean, score: Number },
      education: { present: Boolean, score: Number },
      skills: { present: Boolean, score: Number }
    },
    suggestions: [{
      type: String,
      description: String,
      priority: { type: String, enum: ['low', 'medium', 'high'] }
    }]
  },
  
  // Voice processing (if applicable)
  voiceTranscript: {
    type: String,
    default: null
  },
  
  voiceProcessingTime: {
    type: Number,
    default: null
  },
  
  // Metadata
  uploadSource: {
    type: String,
    enum: ['web', 'mobile', 'api', 'voice'],
    default: 'web'
  },
  
  processingTime: {
    type: Number,
    default: null
  },
  
  processedAt: {
    type: Date,
    default: null
  },
  
  // Version tracking
  version: {
    type: Number,
    default: 1
  },
  
  parentCV: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CV',
    default: null
  },
  
  // Tags for organization
  tags: [{
    type: String,
    trim: true
  }],
  
  // Custom fields
  customFields: {
    jobTitle: { type: String, trim: true },
    targetIndustry: { type: String, trim: true },
    targetCompany: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  
  // Privacy settings
  isPublic: {
    type: Boolean,
    default: false
  },
  
  shareToken: {
    type: String,
    default: null,
    index: true
  },
  
  shareExpiresAt: {
    type: Date,
    default: null
  }
  
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret.filePath; // Don't expose internal file paths
      delete ret.shareToken;
      
      ret.id = ret._id;
      delete ret._id;
      
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret.filePath;
      delete ret.shareToken;
      
      ret.id = ret._id;
      delete ret._id;
      
      return ret;
    }
  }
});

// Index for user + status queries
cvSchema.index({ user: 1, status: 1 });
cvSchema.index({ user: 1, createdAt: -1 });
cvSchema.index({ status: 1, createdAt: 1 });

// Virtual for file URL (if files are served via API)
cvSchema.virtual('fileUrl').get(function() {
  if (!this.storedFilename) return null;
  return `/api/v1/cv/${this._id}/file`;
});

// Virtual for download URL
cvSchema.virtual('downloadUrl').get(function() {
  if (!this.storedFilename) return null;
  return `/api/v1/cv/${this._id}/download`;
});

// Virtual for share URL (if shared)
cvSchema.virtual('shareUrl').get(function() {
  if (!this.shareToken) return null;
  return `/share/cv/${this.shareToken}`;
});

// Virtual for processing status
cvSchema.virtual('isProcessing').get(function() {
  return this.status === 'processing';
});

cvSchema.virtual('isProcessed').get(function() {
  return this.status === 'processed';
});

cvSchema.virtual('hasError').get(function() {
  return this.status === 'error';
});

/**
 * Update CV status
 * @param {string} status - New status
 * @param {string} error - Error message (if any)
 * @returns {Promise<CV>} Updated CV document
 */
cvSchema.methods.updateStatus = async function(status, error = null) {
  this.status = status;
  
  if (error) {
    this.processingError = error;
  }
  
  if (status === 'processed') {
    this.processedAt = new Date();
  }
  
  return this.save({ validateBeforeSave: false });
};

/**
 * Set ATS analysis results
 * @param {Object} analysis - ATS analysis object
 * @returns {Promise<CV>} Updated CV document
 */
cvSchema.methods.setAtsAnalysis = async function(analysis) {
  this.atsAnalysis = analysis;
  
  if (analysis.score !== undefined) {
    this.atsScore = analysis.score;
  }
  
  this.status = 'processed';
  this.processedAt = new Date();
  
  return this.save({ validateBeforeSave: false });
};

/**
 * Set extracted text
 * @param {string} text - Extracted text
 * @returns {Promise<CV>} Updated CV document
 */
cvSchema.methods.setText = async function(text) {
  this.extractedText = text;
  this.textLength = text ? text.length : 0;
  
  return this.save({ validateBeforeSave: false });
};

/**
 * Generate share token
 * @param {number} expiresInHours - Hours until token expires
 * @returns {Promise<CV>} Updated CV document
 */
cvSchema.methods.generateShareToken = async function(expiresInHours = 24) {
  const crypto = require('crypto');
  
  this.shareToken = crypto.randomBytes(32).toString('hex');
  this.shareExpiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  this.isPublic = true;
  
  return this.save({ validateBeforeSave: false });
};

/**
 * Revoke share token
 * @returns {Promise<CV>} Updated CV document
 */
cvSchema.methods.revokeShareToken = async function() {
  this.shareToken = null;
  this.shareExpiresAt = null;
  this.isPublic = false;
  
  return this.save({ validateBeforeSave: false });
};

/**
 * Check if share token is valid
 * @returns {boolean} True if token is valid and not expired
 */
cvSchema.methods.isShareValid = function() {
  if (!this.shareToken || !this.shareExpiresAt) {
    return false;
  }
  
  return this.shareExpiresAt > new Date();
};

/**
 * Create a new version of this CV
 * @param {Object} updates - Updates for the new version
 * @returns {Promise<CV>} New CV version
 */
cvSchema.methods.createVersion = async function(updates = {}) {
  const newCV = await this.constructor.create({
    ...this.toObject(),
    ...updates,
    _id: undefined, // Let MongoDB generate new ID
    parentCV: this._id,
    version: this.version + 1,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return newCV;
};

/**
 * Static method to get user's CVs
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} User's CVs
 */
cvSchema.statics.findByUser = async function(userId, options = {}) {
  const query = this.find({ user: userId });
  
  if (options.status) {
    query.where('status', options.status);
  }
  
  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort({ createdAt: -1 });
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  if (options.skip) {
    query.skip(options.skip);
  }
  
  return query.exec();
};

/**
 * Static method to get CV statistics for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} CV statistics
 */
cvSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId.createFromHexString(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        processed: { $sum: { $cond: [{ $eq: ['$status', 'processed'] }, 1, 0] } },
        processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
        error: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
        totalSize: { $sum: '$fileSize' },
        avgScore: { $avg: '$atsScore' },
        latestUpload: { $max: '$createdAt' }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0,
    processed: 0,
    processing: 0,
    error: 0,
    totalSize: 0,
    avgScore: 0,
    latestUpload: null
  };
};

/**
 * Static method to cleanup old CVs
 * @param {number} daysOld - Delete CVs older than this many days
 * @returns {Promise<number>} Number of CVs deleted
 */
cvSchema.statics.cleanupOldCVs = async function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    status: { $ne: 'processed' } // Keep processed CVs
  });
  
  return result.deletedCount;
};

const CV = mongoose.model('CV', cvSchema);

module.exports = CV;