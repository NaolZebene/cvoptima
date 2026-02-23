/**
 * Usage Tracking Middleware
 * Tracks user usage and enforces subscription limits
 */

const { createError } = require('./error-handlers');

/**
 * Middleware to check if user can upload CV
 * @returns {Function} Express middleware
 */
const checkCvUploadLimit = () => {
  return async (req, res, next) => {
    try {
      const user = req.userObj;
      
      if (!user) {
        throw createError('User not found', 401, 'AuthenticationError');
      }
      
      // Check monthly reset
      user.checkMonthlyReset();
      
      // Check if user can upload CV
      if (!user.canCreateCV()) {
        const usage = user.getUsageStats();
        
        throw createError(
          'CV upload limit reached',
          429,
          'UsageLimitError',
          {
            limit: usage.cvUploads.limit,
            used: usage.cvUploads.used,
            resetDate: usage.cvUploads.resetDate,
            suggestion: 'Upgrade to a higher plan for more uploads'
          }
        );
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user can perform analysis
 * @returns {Function} Express middleware
 */
const checkAnalysisLimit = () => {
  return async (req, res, next) => {
    try {
      const user = req.userObj;
      
      if (!user) {
        throw createError('User not found', 401, 'AuthenticationError');
      }
      
      // Check monthly reset
      user.checkMonthlyReset();
      
      // Check if user can perform analysis
      if (!user.canPerformAnalysis()) {
        const usage = user.getUsageStats();
        
        throw createError(
          'Analysis limit reached',
          429,
          'UsageLimitError',
          {
            limit: usage.analyses.limit,
            used: usage.analyses.used,
            resetDate: usage.analyses.resetDate,
            suggestion: 'Upgrade to a higher plan for more analyses'
          }
        );
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user can use voice features
 * @returns {Function} Express middleware
 */
const checkVoiceFeatureAccess = () => {
  return async (req, res, next) => {
    try {
      const user = req.userObj;
      
      if (!user) {
        throw createError('User not found', 401, 'AuthenticationError');
      }
      
      // Check monthly reset
      user.checkMonthlyReset();
      
      // Check if user can use voice features
      if (!user.canUseVoiceFeatures()) {
        const usage = user.getUsageStats();
        
        throw createError(
          'Voice features require premium subscription',
          403,
          'FeatureAccessError',
          {
            requiredPlan: 'premium',
            currentPlan: user.subscription.type,
            suggestion: 'Upgrade to Premium plan to access voice features'
          }
        );
      }
      
      // Check voice transcription limit
      if (user.usage.voiceTranscriptions.currentMonth.count >= 50) { // Premium limit
        const usage = user.getUsageStats();
        
        throw createError(
          'Voice transcription limit reached',
          429,
          'UsageLimitError',
          {
            limit: usage.voiceTranscriptions.limit,
            used: usage.voiceTranscriptions.used,
            resetDate: usage.voiceTranscriptions.resetDate,
            suggestion: 'Voice transcription limit will reset next month'
          }
        );
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user can export data
 * @returns {Function} Express middleware
 */
const checkExportLimit = () => {
  return async (req, res, next) => {
    try {
      const user = req.userObj;
      
      if (!user) {
        throw createError('User not found', 401, 'AuthenticationError');
      }
      
      // Check monthly reset
      user.checkMonthlyReset();
      
      // Check if user can export data
      if (!user.canExportData()) {
        const usage = user.getUsageStats();
        
        throw createError(
          'Export limit reached or not available',
          403,
          'FeatureAccessError',
          {
            limit: usage.exports.limit,
            used: usage.exports.used,
            currentPlan: user.subscription.type,
            suggestion: 'Upgrade to Basic or Premium plan for export features'
          }
        );
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to track usage after successful operation
 * @param {string} operationType - Type of operation (cv_upload, analysis, voice, export)
 * @returns {Function} Express middleware
 */
const trackUsage = (operationType) => {
  return async (req, res, next) => {
    try {
      const user = req.userObj;
      
      if (!user) {
        throw createError('User not found', 401, 'AuthenticationError');
      }
      
      // Store original send function
      const originalSend = res.send;
      
      // Override send to track usage after successful response
      res.send = function(data) {
        try {
          // Only track usage if response is successful (2xx status)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            setTimeout(async () => {
              try {
                switch (operationType) {
                  case 'cv_upload':
                    await user.incrementCvCount();
                    break;
                    
                  case 'analysis':
                    await user.incrementAnalysisCount();
                    break;
                    
                  case 'voice':
                    const duration = req.body?.duration || req.file?.duration || 0;
                    await user.incrementVoiceTranscriptionCount(duration);
                    break;
                    
                  case 'export':
                    await user.incrementExportCount();
                    break;
                }
              } catch (trackingError) {
                console.error('Error tracking usage:', trackingError);
                // Don't fail the request if tracking fails
              }
            }, 0); // Run in next tick
          }
        } catch (error) {
          console.error('Error in usage tracking middleware:', error);
        }
        
        // Call original send
        return originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to get current usage statistics
 * @returns {Function} Express middleware
 */
const getUsageStats = () => {
  return async (req, res, next) => {
    try {
      const user = req.userObj;
      
      if (!user) {
        throw createError('User not found', 401, 'AuthenticationError');
      }
      
      // Check monthly reset
      user.checkMonthlyReset();
      
      // Get usage statistics
      const usageStats = user.getUsageStats();
      
      // Add to response locals for use in controllers
      res.locals.usageStats = usageStats;
      
      // Also add to request for convenience
      req.usageStats = usageStats;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check feature access
 * @param {string} feature - Feature name
 * @returns {Function} Express middleware
 */
const checkFeatureAccess = (feature) => {
  return async (req, res, next) => {
    try {
      const user = req.userObj;
      
      if (!user) {
        throw createError('User not found', 401, 'AuthenticationError');
      }
      
      let hasAccess = false;
      let requiredPlan = 'free';
      
      switch (feature) {
        case 'voice':
          hasAccess = user.canUseVoiceFeatures();
          requiredPlan = 'premium';
          break;
          
        case 'export':
          hasAccess = user.canExportData();
          requiredPlan = user.subscription.type === 'free' ? 'basic' : user.subscription.type;
          break;
          
        case 'batch':
          hasAccess = ['premium', 'enterprise'].includes(user.subscription.type);
          requiredPlan = 'premium';
          break;
          
        case 'priority_support':
          hasAccess = ['premium', 'enterprise'].includes(user.subscription.type);
          requiredPlan = 'premium';
          break;
          
        case 'advanced_analytics':
          hasAccess = ['premium', 'enterprise'].includes(user.subscription.type);
          requiredPlan = 'premium';
          break;
          
        default:
          hasAccess = true; // Unknown feature, allow access
      }
      
      if (!hasAccess) {
        throw createError(
          `Feature "${feature}" requires ${requiredPlan} subscription`,
          403,
          'FeatureAccessError',
          {
            feature,
            requiredPlan,
            currentPlan: user.subscription.type,
            suggestion: `Upgrade to ${requiredPlan} plan to access this feature`
          }
        );
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to record funnel events
 * @param {string} event - Funnel event name
 * @returns {Function} Express middleware
 */
const recordFunnelEvent = (event) => {
  return async (req, res, next) => {
    try {
      const user = req.userObj;
      
      if (!user) {
        throw createError('User not found', 401, 'AuthenticationError');
      }
      
      // Store original send function
      const originalSend = res.send;
      
      // Override send to record funnel event after successful response
      res.send = function(data) {
        try {
          // Only record event if response is successful (2xx status)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            setTimeout(async () => {
              try {
                await user.recordFunnelEvent(event);
              } catch (trackingError) {
                console.error('Error recording funnel event:', trackingError);
                // Don't fail the request if tracking fails
              }
            }, 0); // Run in next tick
          }
        } catch (error) {
          console.error('Error in funnel tracking middleware:', error);
        }
        
        // Call original send
        return originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check A/B test group
 * @param {string} testName - A/B test name
 * @returns {Function} Express middleware
 */
const checkABTestGroup = (testName) => {
  return async (req, res, next) => {
    try {
      const user = req.userObj;
      
      if (!user) {
        throw createError('User not found', 401, 'AuthenticationError');
      }
      
      // Get user's A/B test group
      const testGroup = user.getABTestGroup(testName);
      
      // Add to response locals for use in controllers
      res.locals.abTestGroup = testGroup;
      res.locals.abTestName = testName;
      
      // Also add to request for convenience
      req.abTestGroup = testGroup;
      req.abTestName = testName;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Error handler for usage limit errors
 * @param {Error} error - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
const usageErrorHandler = (error, req, res, next) => {
  if (error.name === 'UsageLimitError') {
    return res.status(error.statusCode || 429).json({
      success: false,
      error: error.name,
      message: error.message,
      details: error.details || {},
      timestamp: new Date().toISOString()
    });
  }
  
  if (error.name === 'FeatureAccessError') {
    return res.status(error.statusCode || 403).json({
      success: false,
      error: error.name,
      message: error.message,
      details: error.details || {},
      timestamp: new Date().toISOString()
    });
  }
  
  next(error);
};

module.exports = {
  checkCvUploadLimit,
  checkAnalysisLimit,
  checkVoiceFeatureAccess,
  checkExportLimit,
  trackUsage,
  getUsageStats,
  checkFeatureAccess,
  recordFunnelEvent,
  checkABTestGroup,
  usageErrorHandler
};