/**
 * User Mongoose model
 * Schema for user authentication and profile
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  lastLogin: {
    type: Date,
    default: null
  },
  
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  verificationToken: {
    type: String,
    select: false
  },
  
  resetPasswordToken: {
    type: String,
    select: false
  },
  
  resetPasswordExpires: {
    type: Date,
    select: false
  },
  
  profileImage: {
    type: String,
    default: null
  },
  
  preferences: {
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'de', 'fr', 'es']
    },
    theme: {
      type: String,
      default: 'light',
      enum: ['light', 'dark', 'auto']
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },
  
  role: {
    type: String,
    enum: ['user', 'premium', 'admin'],
    default: 'user'
  },
  
  subscription: {
    type: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    expiresAt: {
      type: Date,
      default: null
    },
    stripeCustomerId: {
      type: String,
      select: false
    },
    stripeSubscriptionId: {
      type: String,
      select: false
    }
  },
  
  stats: {
    cvCount: {
      type: Number,
      default: 0
    },
    lastCvCreated: {
      type: Date,
      default: null
    },
    totalOptimizations: {
      type: Number,
      default: 0
    }
  },
  
  // Usage tracking with monthly limits
  usage: {
    cvUploads: {
      currentMonth: {
        count: {
          type: Number,
          default: 0,
          min: 0
        },
        resetDate: {
          type: Date,
          default: () => {
            const now = new Date();
            return new Date(now.getFullYear(), now.getMonth() + 1, 1); // First day of next month
          }
        }
      },
      total: {
        type: Number,
        default: 0,
        min: 0
      },
      lastUpload: Date
    },
    
    analyses: {
      currentMonth: {
        count: {
          type: Number,
          default: 0,
          min: 0
        },
        resetDate: {
          type: Date,
          default: () => {
            const now = new Date();
            return new Date(now.getFullYear(), now.getMonth() + 1, 1);
          }
        }
      },
      total: {
        type: Number,
        default: 0,
        min: 0
      },
      lastAnalysis: Date
    },
    
    voiceTranscriptions: {
      currentMonth: {
        count: {
          type: Number,
          default: 0,
          min: 0
        },
        resetDate: {
          type: Date,
          default: () => {
            const now = new Date();
            return new Date(now.getFullYear(), now.getMonth() + 1, 1);
          }
        }
      },
      total: {
        type: Number,
        default: 0,
        min: 0
      },
      lastTranscription: Date,
      totalDuration: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    
    exports: {
      currentMonth: {
        count: {
          type: Number,
          default: 0,
          min: 0
        },
        resetDate: {
          type: Date,
          default: () => {
            const now = new Date();
            return new Date(now.getFullYear(), now.getMonth() + 1, 1);
          }
        }
      },
      total: {
        type: Number,
        default: 0,
        min: 0
      },
      lastExport: Date
    }
  },
  
  // Conversion funnel tracking
  funnel: {
    signedUp: {
      type: Date,
      default: Date.now
    },
    firstCvUpload: Date,
    firstAnalysis: Date,
    firstVoiceUse: Date,
    upgradePromptShown: Date,
    upgradeClicked: Date,
    checkoutStarted: Date,
    checkoutCompleted: Date,
    trialStarted: Date,
    trialConverted: Date,
    churned: Date
  },
  
  // A/B testing groups
  abTests: {
    upgradePromptDesign: {
      type: String,
      enum: ['A', 'B', 'C', 'control'],
      default: 'control'
    },
    pricingDisplay: {
      type: String,
      enum: ['monthly', 'annual', 'both'],
      default: 'monthly'
    },
    featureHighlight: {
      type: String,
      enum: ['voice', 'ats', 'analytics', 'all'],
      default: 'all'
    }
  }
  
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Remove password and other sensitive fields
      delete ret.password;
      delete ret.verificationToken;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.__v;
      
      // Convert _id to id
      ret.id = ret._id;
      delete ret._id;
      
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.verificationToken;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.__v;
      
      ret.id = ret._id;
      delete ret._id;
      
      return ret;
    }
  }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || '';
});

// Index for case-insensitive email search
userSchema.index({ email: 1 }, { 
  unique: true,
  collation: { locale: 'en', strength: 2 } // Case-insensitive
});

// Index for active users
userSchema.index({ isActive: 1 });

// Index for subscription type
userSchema.index({ 'subscription.type': 1 });

/**
 * Pre-save middleware to hash password
 */
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare password method
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} True if passwords match
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

/**
 * Update last login timestamp
 * @returns {Promise<User>} Updated user document
 */
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

/**
 * Check if user has active subscription
 * @returns {boolean} True if user has active subscription
 */
userSchema.methods.hasActiveSubscription = function() {
  if (this.subscription.type === 'free') return false;
  
  if (this.subscription.expiresAt) {
    return this.subscription.expiresAt > new Date();
  }
  
  return true; // No expiration date means active
};

/**
 * Check if user can create more CVs (based on subscription and monthly limits)
 * @returns {boolean} True if user can create more CVs
 */
userSchema.methods.canCreateCV = function() {
  // Check if monthly reset date has passed
  const now = new Date();
  if (this.usage.cvUploads.currentMonth.resetDate < now) {
    // Reset monthly count
    this.usage.cvUploads.currentMonth.count = 0;
    this.usage.cvUploads.currentMonth.resetDate = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );
  }
  
  // Monthly limits based on subscription
  const monthlyLimits = {
    free: 1,      // 1 CV per month
    basic: 10,    // 10 CVs per month
    premium: 100, // 100 CVs per month (effectively unlimited)
    enterprise: 1000
  };
  
  const limit = monthlyLimits[this.subscription.type] || monthlyLimits.free;
  return this.usage.cvUploads.currentMonth.count < limit;
};

/**
 * Check if user can perform analysis (based on subscription)
 * @returns {boolean} True if user can perform analysis
 */
userSchema.methods.canPerformAnalysis = function() {
  // Check if monthly reset date has passed
  const now = new Date();
  if (this.usage.analyses.currentMonth.resetDate < now) {
    // Reset monthly count
    this.usage.analyses.currentMonth.count = 0;
    this.usage.analyses.currentMonth.resetDate = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );
  }
  
  // Monthly limits for analyses
  const monthlyLimits = {
    free: 5,      // 5 analyses per month
    basic: 20,    // 20 analyses per month
    premium: 200, // 200 analyses per month
    enterprise: 1000
  };
  
  const limit = monthlyLimits[this.subscription.type] || monthlyLimits.free;
  return this.usage.analyses.currentMonth.count < limit;
};

/**
 * Check if user can use voice features
 * @returns {boolean} True if user can use voice features
 */
userSchema.methods.canUseVoiceFeatures = function() {
  // Only premium and enterprise users can use voice features
  return ['premium', 'enterprise'].includes(this.subscription.type);
};

/**
 * Check if user can export data
 * @returns {boolean} True if user can export data
 */
userSchema.methods.canExportData = function() {
  // Check if monthly reset date has passed
  const now = new Date();
  if (this.usage.exports.currentMonth.resetDate < now) {
    // Reset monthly count
    this.usage.exports.currentMonth.count = 0;
    this.usage.exports.currentMonth.resetDate = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );
  }
  
  // Export limits
  const monthlyLimits = {
    free: 0,      // No exports for free tier
    basic: 5,     // 5 exports per month
    premium: 50,  // 50 exports per month
    enterprise: 500
  };
  
  const limit = monthlyLimits[this.subscription.type] || monthlyLimits.free;
  return this.usage.exports.currentMonth.count < limit;
};

/**
 * Increment CV count and usage tracking
 * @returns {Promise<User>} Updated user document
 */
userSchema.methods.incrementCvCount = async function() {
  // Update stats
  this.stats.cvCount += 1;
  this.stats.lastCvCreated = new Date();
  
  // Update usage tracking
  this.usage.cvUploads.currentMonth.count += 1;
  this.usage.cvUploads.total += 1;
  this.usage.cvUploads.lastUpload = new Date();
  
  // Update funnel if first CV upload
  if (!this.funnel.firstCvUpload) {
    this.funnel.firstCvUpload = new Date();
  }
  
  return this.save({ validateBeforeSave: false });
};

/**
 * Increment analysis count
 * @returns {Promise<User>} Updated user document
 */
userSchema.methods.incrementAnalysisCount = async function() {
  this.stats.totalOptimizations += 1;
  
  // Update usage tracking
  this.usage.analyses.currentMonth.count += 1;
  this.usage.analyses.total += 1;
  this.usage.analyses.lastAnalysis = new Date();
  
  // Update funnel if first analysis
  if (!this.funnel.firstAnalysis) {
    this.funnel.firstAnalysis = new Date();
  }
  
  return this.save({ validateBeforeSave: false });
};

/**
 * Increment voice transcription count
 * @param {number} duration - Duration in seconds
 * @returns {Promise<User>} Updated user document
 */
userSchema.methods.incrementVoiceTranscriptionCount = async function(duration = 0) {
  this.usage.voiceTranscriptions.currentMonth.count += 1;
  this.usage.voiceTranscriptions.total += 1;
  this.usage.voiceTranscriptions.lastTranscription = new Date();
  this.usage.voiceTranscriptions.totalDuration += duration;
  
  // Update funnel if first voice use
  if (!this.funnel.firstVoiceUse) {
    this.funnel.firstVoiceUse = new Date();
  }
  
  return this.save({ validateBeforeSave: false });
};

/**
 * Increment export count
 * @returns {Promise<User>} Updated user document
 */
userSchema.methods.incrementExportCount = async function() {
  this.usage.exports.currentMonth.count += 1;
  this.usage.exports.total += 1;
  this.usage.exports.lastExport = new Date();
  
  return this.save({ validateBeforeSave: false });
};

/**
 * Increment optimization count
 * @returns {Promise<User>} Updated user document
 */
userSchema.methods.incrementOptimizationCount = async function() {
  this.stats.totalOptimizations += 1;
  return this.save({ validateBeforeSave: false });
};

/**
 * Static method to find user by email (case-insensitive)
 * @param {string} email - Email to search for
 * @returns {Promise<User|null>} User document or null
 */
userSchema.statics.findByEmail = async function(email) {
  return this.findOne({ 
    email: { $regex: new RegExp(`^${email}$`, 'i') }
  }).select('+password'); // Include password for authentication
};

/**
 * Static method to check if email exists
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if email exists
 */
userSchema.statics.emailExists = async function(email) {
  const user = await this.findOne({ 
    email: { $regex: new RegExp(`^${email}$`, 'i') }
  });
  return !!user;
};

/**
 * Get usage statistics for the user
 * @returns {Object} Usage statistics
 */
userSchema.methods.getUsageStats = function() {
  const now = new Date();
  
  // Check if monthly reset is needed
  this.checkMonthlyReset();
  
  // Get limits based on subscription
  const getLimits = () => {
    const limits = {
      free: {
        cvUploads: 1,
        analyses: 5,
        voiceTranscriptions: 0,
        exports: 0
      },
      basic: {
        cvUploads: 10,
        analyses: 20,
        voiceTranscriptions: 0,
        exports: 5
      },
      premium: {
        cvUploads: 100,
        analyses: 200,
        voiceTranscriptions: 50,
        exports: 50
      },
      enterprise: {
        cvUploads: 1000,
        analyses: 1000,
        voiceTranscriptions: 500,
        exports: 500
      }
    };
    
    return limits[this.subscription.type] || limits.free;
  };
  
  const limits = getLimits();
  
  return {
    subscription: this.subscription.type,
    cvUploads: {
      used: this.usage.cvUploads.currentMonth.count,
      limit: limits.cvUploads,
      remaining: Math.max(0, limits.cvUploads - this.usage.cvUploads.currentMonth.count),
      percentage: Math.round((this.usage.cvUploads.currentMonth.count / limits.cvUploads) * 100),
      total: this.usage.cvUploads.total,
      lastUpload: this.usage.cvUploads.lastUpload,
      resetDate: this.usage.cvUploads.currentMonth.resetDate
    },
    analyses: {
      used: this.usage.analyses.currentMonth.count,
      limit: limits.analyses,
      remaining: Math.max(0, limits.analyses - this.usage.analyses.currentMonth.count),
      percentage: Math.round((this.usage.analyses.currentMonth.count / limits.analyses) * 100),
      total: this.usage.analyses.total,
      lastAnalysis: this.usage.analyses.lastAnalysis,
      resetDate: this.usage.analyses.currentMonth.resetDate
    },
    voiceTranscriptions: {
      used: this.usage.voiceTranscriptions.currentMonth.count,
      limit: limits.voiceTranscriptions,
      remaining: Math.max(0, limits.voiceTranscriptions - this.usage.voiceTranscriptions.currentMonth.count),
      percentage: limits.voiceTranscriptions > 0 
        ? Math.round((this.usage.voiceTranscriptions.currentMonth.count / limits.voiceTranscriptions) * 100)
        : 0,
      total: this.usage.voiceTranscriptions.total,
      totalDuration: this.usage.voiceTranscriptions.totalDuration,
      lastTranscription: this.usage.voiceTranscriptions.lastTranscription,
      resetDate: this.usage.voiceTranscriptions.currentMonth.resetDate
    },
    exports: {
      used: this.usage.exports.currentMonth.count,
      limit: limits.exports,
      remaining: Math.max(0, limits.exports - this.usage.exports.currentMonth.count),
      percentage: limits.exports > 0 
        ? Math.round((this.usage.exports.currentMonth.count / limits.exports) * 100)
        : 0,
      total: this.usage.exports.total,
      lastExport: this.usage.exports.lastExport,
      resetDate: this.usage.exports.currentMonth.resetDate
    },
    features: {
      voice: this.canUseVoiceFeatures(),
      export: this.canExportData(),
      batch: ['premium', 'enterprise'].includes(this.subscription.type),
      prioritySupport: ['premium', 'enterprise'].includes(this.subscription.type)
    }
  };
};

/**
 * Check and reset monthly usage if needed
 * @returns {boolean} True if reset was performed
 */
userSchema.methods.checkMonthlyReset = function() {
  const now = new Date();
  let resetPerformed = false;
  
  // Check each usage type
  const usageTypes = ['cvUploads', 'analyses', 'voiceTranscriptions', 'exports'];
  
  usageTypes.forEach(type => {
    if (this.usage[type].currentMonth.resetDate < now) {
      // Reset monthly count
      this.usage[type].currentMonth.count = 0;
      this.usage[type].currentMonth.resetDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      );
      resetPerformed = true;
    }
  });
  
  return resetPerformed;
};

/**
 * Record funnel event
 * @param {string} event - Funnel event name
 * @returns {Promise<User>} Updated user document
 */
userSchema.methods.recordFunnelEvent = async function(event) {
  const validEvents = [
    'upgradePromptShown',
    'upgradeClicked',
    'checkoutStarted',
    'checkoutCompleted',
    'trialStarted',
    'trialConverted',
    'churned'
  ];
  
  if (validEvents.includes(event)) {
    this.funnel[event] = new Date();
    return this.save({ validateBeforeSave: false });
  }
  
  return this;
};

/**
 * Get A/B test group
 * @param {string} testName - Test name
 * @returns {string} Test group
 */
userSchema.methods.getABTestGroup = function(testName) {
  return this.abTests[testName] || 'control';
};

/**
 * Static method to get user stats
 * @returns {Promise<Object>} User statistics
 */
userSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
        premiumUsers: { $sum: { $cond: [{ $eq: ['$subscription.type', 'premium'] }, 1, 0] } },
        basicUsers: { $sum: { $cond: [{ $eq: ['$subscription.type', 'basic'] }, 1, 0] } },
        freeUsers: { $sum: { $cond: [{ $eq: ['$subscription.type', 'free'] }, 1, 0] } },
        averageCvCount: { $avg: '$stats.cvCount' },
        totalOptimizations: { $sum: '$stats.totalOptimizations' },
        totalCvUploads: { $sum: '$usage.cvUploads.total' },
        totalAnalyses: { $sum: '$usage.analyses.total' },
        totalVoiceTranscriptions: { $sum: '$usage.voiceTranscriptions.total' }
      }
    }
  ]);
  
  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    premiumUsers: 0,
    basicUsers: 0,
    freeUsers: 0,
    averageCvCount: 0,
    totalOptimizations: 0,
    totalCvUploads: 0,
    totalAnalyses: 0,
    totalVoiceTranscriptions: 0
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
