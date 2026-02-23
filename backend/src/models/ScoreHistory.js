/**
 * Score History Mongoose model
 * Tracks ATS score changes and improvements over time
 */

const mongoose = require('mongoose');

const scoreHistorySchema = new mongoose.Schema({
  cv: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CV',
    required: [true, 'CV reference is required'],
    index: true
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  
  // Score information
  score: {
    type: Number,
    required: [true, 'Score is required'],
    min: [0, 'Score cannot be less than 0'],
    max: [100, 'Score cannot be greater than 100']
  },
  
  previousScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  
  scoreChange: {
    type: Number,
    default: 0
  },
  
  // Score breakdown
  breakdown: {
    keywords: { type: Number, min: 0, max: 30 },
    sections: { type: Number, min: 0, max: 25 },
    length: { type: Number, min: 0, max: 15 },
    formatting: { type: Number, min: 0, max: 10 },
    actionVerbs: { type: Number, min: 0, max: 10 },
    readability: { type: Number, min: 0, max: 10 }
  },
  
  // Analysis details
  analysis: {
    keywordAnalysis: {
      matchedKeywords: [{
        keyword: String,
        count: Number,
        relevance: Number
      }],
      matchCount: Number,
      matchPercentage: Number,
      totalKeywords: Number,
      keywordDensity: Number
    },
    
    sectionAnalysis: {
      sections: mongoose.Schema.Types.Mixed,
      completenessScore: Number,
      essentialSectionsPresent: Number,
      totalSectionsPresent: Number,
      missingEssentialSections: [String]
    },
    
    lengthAnalysis: {
      wordCount: Number,
      characterCount: Number,
      lineCount: Number,
      score: Number,
      feedback: String
    },
    
    formattingAnalysis: {
      score: Number,
      issues: [String],
      lineCount: Number,
      emptyLinePercentage: Number,
      hasSpecialChars: Boolean,
      hasTables: Boolean
    },
    
    actionVerbAnalysis: {
      count: Number,
      score: Number,
      verbs: [String],
      feedback: String
    },
    
    readabilityAnalysis: {
      score: Number,
      averageSentenceLength: Number,
      readingLevel: String,
      feedback: String
    }
  },
  
  // Industry and metrics
  industry: {
    type: String,
    enum: ['technology', 'marketing', 'finance', 'healthcare', 'general'],
    default: 'general'
  },
  
  metrics: {
    wordCount: Number,
    experienceYears: Number,
    keywordDensity: Number,
    sectionCount: Number,
    actionVerbs: Number,
    readability: Number
  },
  
  // Job comparison (if applicable)
  jobComparison: {
    jobTitle: String,
    jobDescriptionLength: Number,
    cvJobFit: String,
    matchPercentage: Number
  },
  
  // Suggestions from this analysis
  suggestions: [{
    type: { type: String },
    description: String,
    priority: { type: String, enum: ['low', 'medium', 'high'] },
    action: String,
    implemented: { type: Boolean, default: false },
    implementedAt: Date
  }],
  
  // Analysis metadata
  analysisType: {
    type: String,
    enum: ['initial', 'reanalysis', 'job_comparison', 'automatic', 'manual'],
    default: 'initial'
  },
  
  trigger: {
    type: String,
    enum: ['upload', 'edit', 'job_apply', 'scheduled', 'manual'],
    default: 'manual'
  },
  
  notes: {
    type: String,
    maxlength: 500
  },
  
  // Version tracking
  cvVersion: {
    type: Number,
    default: 1
  },
  
  // Tags for organization
  tags: [{
    type: String,
    trim: true
  }],
  
  // Whether this analysis should be included in statistics
  includeInStats: {
    type: Boolean,
    default: true
  }
  
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      
      ret.id = ret._id;
      delete ret._id;
      
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      
      ret.id = ret._id;
      delete ret._id;
      
      return ret;
    }
  }
});

// Indexes for common queries
scoreHistorySchema.index({ cv: 1, createdAt: -1 });
scoreHistorySchema.index({ user: 1, createdAt: -1 });
scoreHistorySchema.index({ score: 1 });
scoreHistorySchema.index({ 'analysisType': 1 });
scoreHistorySchema.index({ createdAt: 1 });

// Virtual for score category
scoreHistorySchema.virtual('scoreCategory').get(function() {
  if (this.score >= 90) return 'excellent';
  if (this.score >= 80) return 'very_good';
  if (this.score >= 70) return 'good';
  if (this.score >= 60) return 'fair';
  if (this.score >= 50) return 'poor';
  return 'very_poor';
});

// Virtual for improvement direction
scoreHistorySchema.virtual('improvement').get(function() {
  if (!this.previousScore) return 'initial';
  if (this.score > this.previousScore) return 'improved';
  if (this.score < this.previousScore) return 'declined';
  return 'unchanged';
});

// Virtual for improvement percentage
scoreHistorySchema.virtual('improvementPercentage').get(function() {
  if (!this.previousScore || this.previousScore === 0) return 0;
  return ((this.score - this.previousScore) / this.previousScore) * 100;
});

/**
 * Get previous score entry for this CV
 * @returns {Promise<ScoreHistory|null>} Previous score entry
 */
scoreHistorySchema.methods.getPreviousEntry = async function() {
  return this.constructor.findOne({
    cv: this.cv,
    _id: { $ne: this._id }
  }).sort({ createdAt: -1 });
};

/**
 * Get next score entry for this CV
 * @returns {Promise<ScoreHistory|null>} Next score entry
 */
scoreHistorySchema.methods.getNextEntry = async function() {
  return this.constructor.findOne({
    cv: this.cv,
    _id: { $ne: this._id },
    createdAt: { $gt: this.createdAt }
  }).sort({ createdAt: 1 });
};

/**
 * Mark suggestion as implemented
 * @param {number} suggestionIndex - Index of suggestion to mark
 * @returns {Promise<ScoreHistory>} Updated document
 */
scoreHistorySchema.methods.markSuggestionImplemented = async function(suggestionIndex) {
  if (this.suggestions[suggestionIndex]) {
    this.suggestions[suggestionIndex].implemented = true;
    this.suggestions[suggestionIndex].implementedAt = new Date();
    return this.save({ validateBeforeSave: false });
  }
  return this;
};

/**
 * Get implemented suggestions
 * @returns {Array} Implemented suggestions
 */
scoreHistorySchema.methods.getImplementedSuggestions = function() {
  return this.suggestions.filter(s => s.implemented);
};

/**
 * Get pending suggestions
 * @returns {Array} Pending suggestions
 */
scoreHistorySchema.methods.getPendingSuggestions = function() {
  return this.suggestions.filter(s => !s.implemented);
};

/**
 * Get high priority suggestions
 * @returns {Array} High priority suggestions
 */
scoreHistorySchema.methods.getHighPrioritySuggestions = function() {
  return this.suggestions.filter(s => s.priority === 'high');
};

/**
 * Static method to get CV score history
 * @param {string} cvId - CV ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Score history for CV
 */
scoreHistorySchema.statics.findByCV = async function(cvId, options = {}) {
  const query = this.find({ cv: cvId });
  
  if (options.analysisType) {
    query.where('analysisType', options.analysisType);
  }
  
  if (options.startDate) {
    query.where('createdAt').gte(options.startDate);
  }
  
  if (options.endDate) {
    query.where('createdAt').lte(options.endDate);
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort({ createdAt: -1 });
  }
  
  if (options.skip) {
    query.skip(options.skip);
  }
  
  return query.exec();
};

/**
 * Static method to get user score history
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Score history for user
 */
scoreHistorySchema.statics.findByUser = async function(userId, options = {}) {
  const query = this.find({ user: userId });
  
  if (options.cvId) {
    query.where('cv', options.cvId);
  }
  
  if (options.analysisType) {
    query.where('analysisType', options.analysisType);
  }
  
  if (options.startDate) {
    query.where('createdAt').gte(options.startDate);
  }
  
  if (options.endDate) {
    query.where('createdAt').lte(options.endDate);
  }
  
  if (options.minScore) {
    query.where('score').gte(options.minScore);
  }
  
  if (options.maxScore) {
    query.where('score').lte(options.maxScore);
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort({ createdAt: -1 });
  }
  
  if (options.skip) {
    query.skip(options.skip);
  }
  
  return query.exec();
};

/**
 * Static method to get score statistics for CV
 * @param {string} cvId - CV ID
 * @returns {Promise<Object>} Score statistics
 */
scoreHistorySchema.statics.getCVStats = async function(cvId) {
  const stats = await this.aggregate([
    { $match: { cv: mongoose.Types.ObjectId.createFromHexString(cvId), includeInStats: true } },
    {
      $group: {
        _id: null,
        totalAnalyses: { $sum: 1 },
        averageScore: { $avg: '$score' },
        highestScore: { $max: '$score' },
        lowestScore: { $min: '$score' },
        firstAnalysis: { $min: '$createdAt' },
        lastAnalysis: { $max: '$createdAt' },
        totalImprovements: {
          $sum: {
            $cond: [{ $gt: ['$scoreChange', 0] }, 1, 0]
          }
        },
        totalDeclines: {
          $sum: {
            $cond: [{ $lt: ['$scoreChange', 0] }, 1, 0]
          }
        },
        averageImprovement: { $avg: '$scoreChange' }
      }
    }
  ]);
  
  const analysisTypes = await this.aggregate([
    { $match: { cv: mongoose.Types.ObjectId.createFromHexString(cvId) } },
    {
      $group: {
        _id: '$analysisType',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const scoreDistribution = await this.aggregate([
    { $match: { cv: mongoose.Types.ObjectId.createFromHexString(cvId), includeInStats: true } },
    {
      $bucket: {
        groupBy: '$score',
        boundaries: [0, 50, 60, 70, 80, 90, 101],
        default: 'other',
        output: {
          count: { $sum: 1 },
          scores: { $push: '$score' }
        }
      }
    }
  ]);
  
  return {
    ...(stats[0] || {
      totalAnalyses: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      firstAnalysis: null,
      lastAnalysis: null,
      totalImprovements: 0,
      totalDeclines: 0,
      averageImprovement: 0
    }),
    analysisTypes: analysisTypes.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
    scoreDistribution: scoreDistribution.reduce((acc, curr) => {
      const range = curr._id === 0 ? '0-49' :
                   curr._id === 50 ? '50-59' :
                   curr._id === 60 ? '60-69' :
                   curr._id === 70 ? '70-79' :
                   curr._id === 80 ? '80-89' :
                   curr._id === 90 ? '90-100' : 'other';
      acc[range] = curr.count;
      return acc;
    }, {})
  };
};

/**
 * Static method to get user score statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User score statistics
 */
scoreHistorySchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId.createFromHexString(userId), includeInStats: true } },
    {
      $group: {
        _id: null,
        totalAnalyses: { $sum: 1 },
        averageScore: { $avg: '$score' },
        highestScore: { $max: '$score' },
        lowestScore: { $min: '$score' },
        uniqueCVs: { $addToSet: '$cv' },
        firstAnalysis: { $min: '$createdAt' },
        lastAnalysis: { $max: '$createdAt' }
      }
    }
  ]);
  
  const cvStats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId.createFromHexString(userId), includeInStats: true } },
    {
      $group: {
        _id: '$cv',
        analyses: { $sum: 1 },
        averageScore: { $avg: '$score' },
        highestScore: { $max: '$score' },
        lastAnalysis: { $max: '$createdAt' }
      }
    },
    { $sort: { lastAnalysis: -1 } },
    { $limit: 10 }
  ]);
  
  const improvementStats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId.createFromHexString(userId), includeInStats: true } },
    {
      $group: {
        _id: '$cv',
        scores: { $push: { score: '$score', date: '$createdAt' } }
      }
    },
    {
      $project: {
        improvements: {
          $reduce: {
            input: { $slice: ['$scores', 1, { $subtract: [{ $size: '$scores' }, 1] }] },
            initialValue: { count: 0, total: 0 },
            in: {
              count: {
                $cond: [
                  { $gt: ['$$this.score', { $arrayElemAt: ['$scores.score', { $subtract: [{ $indexOfArray: ['$scores', '$$this'] }, 1] }] }] },
                  { $add: ['$$value.count', 1] },
                  '$$value.count'
                ]
              },
              total: { $add: ['$$value.total', 1] }
            }
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        totalImprovements: { $sum: '$improvements.count' },
        totalComparisons: { $sum: '$improvements.total' }
      }
    }
  ]);
  
  return {
    ...(stats[0] ? {
      totalAnalyses: stats[0].totalAnalyses,
      averageScore: Math.round(stats[0].averageScore * 10) / 10,
      highestScore: stats[0].highestScore,
      lowestScore: stats[0].lowestScore,
      uniqueCVs: stats[0].uniqueCVs.length,
      firstAnalysis: stats[0].firstAnalysis,
      lastAnalysis: stats[0].lastAnalysis
    } : {
      totalAnalyses: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      uniqueCVs: 0,
      firstAnalysis: null,
      lastAnalysis: null
    }),
    cvStats,
    improvementRate: improvementStats[0] ? 
      (improvementStats[0].totalComparisons > 0 ? 
        (improvementStats[0].totalImprovements / improvementStats[0].totalComparisons) * 100 : 0) : 0
  };
};

/**
 * Static method to cleanup old score history
 * @param {number} daysOld - Delete entries older than this many days
 * @returns {Promise<number>} Number of entries deleted
 */
scoreHistorySchema.statics.cleanupOldEntries = async function(daysOld = 365) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    analysisType: { $ne: 'initial' } // Keep initial analyses
  });
  
  return result.deletedCount;
};

const ScoreHistory = mongoose.model('ScoreHistory', scoreHistorySchema);

module.exports = ScoreHistory;