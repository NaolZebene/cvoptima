/**
 * Score History Service
 * Manages ATS score history tracking and analysis
 */

const ScoreHistory = require('../models/ScoreHistory');
const CV = require('../models/CV');
const { createError } = require('../middleware/error-handlers');

/**
 * Create score history entry
 * @param {Object} data - Score history data
 * @returns {Promise<Object>} Created score history entry
 */
const createScoreHistory = async (data) => {
  try {
    const {
      cvId,
      userId,
      score,
      breakdown,
      analysis,
      industry,
      metrics,
      jobComparison,
      suggestions,
      analysisType = 'initial',
      trigger = 'manual',
      notes = '',
      tags = []
    } = data;
    
    // Validate required fields
    if (!cvId || !userId || score === undefined) {
      throw createError('Missing required fields: cvId, userId, score', 400, 'ValidationError');
    }
    
    // Get previous score for this CV
    const previousEntry = await ScoreHistory.findOne({
      cv: cvId,
      user: userId
    }).sort({ createdAt: -1 });
    
    const previousScore = previousEntry ? previousEntry.score : null;
    const scoreChange = previousScore !== null ? score - previousScore : 0;
    
    // Get CV version
    const cv = await CV.findById(cvId);
    const cvVersion = cv ? cv.version : 1;
    
    // Create score history entry
    const scoreHistory = await ScoreHistory.create({
      cv: cvId,
      user: userId,
      score,
      previousScore,
      scoreChange,
      breakdown,
      analysis,
      industry,
      metrics,
      jobComparison,
      suggestions,
      analysisType,
      trigger,
      notes,
      tags,
      cvVersion,
      includeInStats: true
    });
    
    // Update CV with latest score if this is the highest score
    if (cv) {
      if (cv.atsScore === null || cv.atsScore === undefined || score > cv.atsScore) {
        cv.atsScore = score;
        cv.atsAnalysis = {
          keywords: analysis?.keywordAnalysis?.matchedKeywords || [],
          sections: analysis?.sectionAnalysis?.sections || {},
          suggestions: suggestions || []
        };
        await cv.save({ validateBeforeSave: false });
      }
    }
    
    return scoreHistory.toJSON();
    
  } catch (error) {
    throw createError(`Failed to create score history: ${error.message}`, 500, 'DatabaseError');
  }
};

/**
 * Get score history for CV
 * @param {string} cvId - CV ID
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Score history entries
 */
const getCVScoreHistory = async (cvId, userId, options = {}) => {
  try {
    // Verify user owns the CV
    const cv = await CV.findOne({
      _id: cvId,
      user: userId
    });
    
    if (!cv) {
      throw createError('CV not found or access denied', 404, 'NotFoundError');
    }
    
    const history = await ScoreHistory.findByCV(cvId, options);
    
    return history.map(entry => entry.toJSON());
    
  } catch (error) {
    if (error.name === 'NotFoundError') {
      throw error;
    }
    throw createError(`Failed to get score history: ${error.message}`, 500, 'DatabaseError');
  }
};

/**
 * Get score history for user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Score history entries
 */
const getUserScoreHistory = async (userId, options = {}) => {
  try {
    const history = await ScoreHistory.findByUser(userId, options);
    
    return history.map(entry => entry.toJSON());
    
  } catch (error) {
    throw createError(`Failed to get user score history: ${error.message}`, 500, 'DatabaseError');
  }
};

/**
 * Get specific score history entry
 * @param {string} entryId - Score history entry ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Score history entry
 */
const getScoreHistoryEntry = async (entryId, userId) => {
  try {
    const entry = await ScoreHistory.findById(entryId);
    
    if (!entry) {
      throw createError('Score history entry not found', 404, 'NotFoundError');
    }
    
    // Verify user owns this entry
    if (entry.user.toString() !== userId) {
      throw createError('Access denied', 403, 'AuthorizationError');
    }
    
    return entry.toJSON();
    
  } catch (error) {
    if (error.name === 'NotFoundError' || error.name === 'AuthorizationError') {
      throw error;
    }
    throw createError(`Failed to get score history entry: ${error.message}`, 500, 'DatabaseError');
  }
};

/**
 * Update score history entry
 * @param {string} entryId - Score history entry ID
 * @param {string} userId - User ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated score history entry
 */
const updateScoreHistory = async (entryId, userId, updates) => {
  try {
    const entry = await ScoreHistory.findById(entryId);
    
    if (!entry) {
      throw createError('Score history entry not found', 404, 'NotFoundError');
    }
    
    // Verify user owns this entry
    if (entry.user.toString() !== userId) {
      throw createError('Access denied', 403, 'AuthorizationError');
    }
    
    // Allowed updates
    const allowedUpdates = ['notes', 'tags', 'includeInStats'];
    const updateData = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });
    
    // Update suggestions if provided
    if (updates.suggestions && Array.isArray(updates.suggestions)) {
      updateData.suggestions = updates.suggestions;
    }
    
    Object.assign(entry, updateData);
    await entry.save();
    
    return entry.toJSON();
    
  } catch (error) {
    if (error.name === 'NotFoundError' || error.name === 'AuthorizationError') {
      throw error;
    }
    throw createError(`Failed to update score history: ${error.message}`, 500, 'DatabaseError');
  }
};

/**
 * Delete score history entry
 * @param {string} entryId - Score history entry ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if deleted
 */
const deleteScoreHistory = async (entryId, userId) => {
  try {
    const entry = await ScoreHistory.findById(entryId);
    
    if (!entry) {
      throw createError('Score history entry not found', 404, 'NotFoundError');
    }
    
    // Verify user owns this entry
    if (entry.user.toString() !== userId) {
      throw createError('Access denied', 403, 'AuthorizationError');
    }
    
    // Don't allow deletion of initial analysis
    if (entry.analysisType === 'initial') {
      throw createError('Cannot delete initial analysis', 400, 'ValidationError');
    }
    
    await entry.deleteOne();
    
    return true;
    
  } catch (error) {
    if (error.name === 'NotFoundError' || error.name === 'AuthorizationError' || error.name === 'ValidationError') {
      throw error;
    }
    throw createError(`Failed to delete score history: ${error.message}`, 500, 'DatabaseError');
  }
};

/**
 * Get score statistics for CV
 * @param {string} cvId - CV ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Score statistics
 */
const getCVScoreStats = async (cvId, userId) => {
  try {
    // Verify user owns the CV
    const cv = await CV.findOne({
      _id: cvId,
      user: userId
    });
    
    if (!cv) {
      throw createError('CV not found or access denied', 404, 'NotFoundError');
    }
    
    const stats = await ScoreHistory.getCVStats(cvId);
    
    // Add CV information
    stats.cv = {
      id: cv._id,
      originalFilename: cv.originalFilename,
      currentScore: cv.atsScore,
      createdAt: cv.createdAt,
      updatedAt: cv.updatedAt
    };
    
    return stats;
    
  } catch (error) {
    if (error.name === 'NotFoundError') {
      throw error;
    }
    throw createError(`Failed to get CV score stats: ${error.message}`, 500, 'DatabaseError');
  }
};

/**
 * Get score statistics for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User score statistics
 */
const getUserScoreStats = async (userId) => {
  try {
    const stats = await ScoreHistory.getUserStats(userId);
    
    return stats;
    
  } catch (error) {
    throw createError(`Failed to get user score stats: ${error.message}`, 500, 'DatabaseError');
  }
};

/**
 * Get score improvement trends
 * @param {string} cvId - CV ID
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Improvement trends
 */
const getImprovementTrends = async (cvId, userId, options = {}) => {
  try {
    // Verify user owns the CV
    const cv = await CV.findOne({
      _id: cvId,
      user: userId
    });
    
    if (!cv) {
      throw createError('CV not found or access denied', 404, 'NotFoundError');
    }
    
    const history = await ScoreHistory.findByCV(cvId, {
      ...options,
      sort: { createdAt: 1 }
    });
    
    if (history.length < 2) {
      return {
        hasEnoughData: false,
        message: 'Need at least 2 analyses to calculate trends',
        historyCount: history.length
      };
    }
    
    // Calculate trends
    const scores = history.map(entry => ({
      score: entry.score,
      date: entry.createdAt,
      breakdown: entry.breakdown
    }));
    
    // Overall trend
    const firstScore = scores[0].score;
    const lastScore = scores[scores.length - 1].score;
    const overallChange = lastScore - firstScore;
    const overallPercentage = firstScore > 0 ? (overallChange / firstScore) * 100 : 0;
    
    // Monthly trends
    const monthlyTrends = {};
    scores.forEach(score => {
      const month = score.date.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyTrends[month]) {
        monthlyTrends[month] = {
          count: 0,
          total: 0,
          highest: 0,
          lowest: 100
        };
      }
      
      monthlyTrends[month].count++;
      monthlyTrends[month].total += score.score;
      monthlyTrends[month].highest = Math.max(monthlyTrends[month].highest, score.score);
      monthlyTrends[month].lowest = Math.min(monthlyTrends[month].lowest, score.score);
    });
    
    // Calculate monthly averages
    const monthlyAverages = Object.entries(monthlyTrends).map(([month, data]) => ({
      month,
      average: Math.round((data.total / data.count) * 10) / 10,
      highest: data.highest,
      lowest: data.lowest,
      count: data.count
    })).sort((a, b) => a.month.localeCompare(b.month));
    
    // Category trends
    const categoryTrends = {};
    const categories = ['keywords', 'sections', 'length', 'formatting', 'actionVerbs', 'readability'];
    
    categories.forEach(category => {
      const categoryScores = history.map(entry => ({
        score: entry.breakdown?.[category] || 0,
        date: entry.createdAt
      }));
      
      if (categoryScores.length > 1) {
        const first = categoryScores[0].score;
        const last = categoryScores[categoryScores.length - 1].score;
        const change = last - first;
        const percentage = first > 0 ? (change / first) * 100 : 0;
        
        categoryTrends[category] = {
          first,
          last,
          change,
          percentage: Math.round(percentage * 10) / 10,
          trend: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable'
        };
      }
    });
    
    // Improvement streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let improvementCount = 0;
    
    for (let i = 1; i < scores.length; i++) {
      if (scores[i].score > scores[i - 1].score) {
        currentStreak++;
        improvementCount++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    const improvementRate = (improvementCount / (scores.length - 1)) * 100;
    
    return {
      hasEnoughData: true,
      overall: {
        firstScore,
        lastScore,
        change: overallChange,
        percentage: Math.round(overallPercentage * 10) / 10,
        trend: overallChange > 0 ? 'improving' : overallChange < 0 ? 'declining' : 'stable'
      },
      monthlyAverages,
      categoryTrends,
      streaks: {
        currentStreak,
        longestStreak,
        improvementCount,
        totalComparisons: scores.length - 1,
        improvementRate: Math.round(improvementRate * 10) / 10
      },
      summary: {
        totalAnalyses: scores.length,
        timeSpan: {
          start: scores[0].date,
          end: scores[scores.length - 1].date,
          days: Math.round((scores[scores.length - 1].date - scores[0].date) / (1000 * 60 * 60 * 24))
        }
      }
    };
    
  } catch (error) {
    if (error.name === 'NotFoundError') {
      throw error;
    }
    throw createError(`Failed to get improvement trends: ${error.message}`, 500, 'ProcessingError');
  }
};

/**
 * Mark suggestion as implemented
 * @param {string} entryId - Score history entry ID
 * @param {string} userId - User ID
 * @param {number} suggestionIndex - Index of suggestion to mark
 * @returns {Promise<Object>} Updated score history entry
 */
const markSuggestionImplemented = async (entryId, userId, suggestionIndex) => {
  try {
    const entry = await ScoreHistory.findById(entryId);
    
    if (!entry) {
      throw createError('Score history entry not found', 404, 'NotFoundError');
    }
    
    // Verify user owns this entry
    if (entry.user.toString() !== userId) {
      throw createError('Access denied', 403, 'AuthorizationError');
    }
    
    // Check if suggestion index is valid
    if (!entry.suggestions[suggestionIndex]) {
      throw createError('Invalid suggestion index', 400, 'ValidationError');
    }
    
    await entry.markSuggestionImplemented(suggestionIndex);
    
    return entry.toJSON();
    
  } catch (error) {
    if (error.name === 'NotFoundError' || error.name === 'AuthorizationError' || error.name === 'ValidationError') {
      throw error;
    }
    throw createError(`Failed to mark suggestion: ${error.message}`, 500, 'DatabaseError');
  }
};

/**
 * Get implemented suggestions for CV
 * @param {string} cvId - CV ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Implemented suggestions
 */
const getImplementedSuggestions = async (cvId, userId) => {
  try {
    // Verify user owns the CV
    const cv = await CV.findOne({
      _id: cvId,
      user: userId
    });
    
    if (!cv) {
      throw createError('CV not found or access denied', 404, 'NotFoundError');
    }
    
    const history = await ScoreHistory.findByCV(cvId, { sort: { createdAt: -1 } });
    
    const implementedSuggestions = [];
    
    history.forEach(entry => {
      entry.getImplementedSuggestions().forEach(suggestion => {
        implementedSuggestions.push({
          entryId: entry._id,
          analyzedAt: entry.createdAt,
          score: entry.score,
          ...suggestion
        });
      });
    });
    
    return implementedSuggestions;
    
  } catch (error) {
    if (error.name === 'NotFoundError') {
      throw error;
    }
    throw createError(`Failed to get implemented suggestions: ${error.message}`, 500, 'DatabaseError');
  }
};

/**
 * Get pending suggestions for CV
 * @param {string} cvId - CV ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Pending suggestions
 */
const getPendingSuggestions = async (cvId, userId) => {
  try {
    // Verify user owns the CV
    const cv = await CV.findOne({
      _id: cvId,
      user: userId
    });
    
    if (!cv) {
      throw createError('CV not found or access denied', 404, 'NotFoundError');
    }
    
    const history = await ScoreHistory.findByCV(cvId, { sort: { createdAt: -1 } });
    
    const pendingSuggestions = [];
    
    history.forEach(entry => {
      entry.getPendingSuggestions().forEach(suggestion => {
        pendingSuggestions.push({
          entryId: entry._id,
          analyzedAt: entry.createdAt,
          score: entry.score,
          ...suggestion
        });
      });
    });
    
    // Remove duplicates (same suggestion from multiple analyses)
    const uniqueSuggestions = [];
    const seenSuggestions = new Set();
    
    pendingSuggestions.forEach(suggestion => {
      const key = `${suggestion.type}:${suggestion.description}`;
      if (!seenSuggestions.has(key)) {
        seenSuggestions.add(key);
        uniqueSuggestions.push(suggestion);
      }
    });
    
    // Sort by priority (high > medium > low)
    uniqueSuggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    return uniqueSuggestions;
    
  } catch (error) {
    if (error.name === 'NotFoundError') {
      throw error;
    }
    throw createError(`Failed to get pending suggestions: ${error.message}`, 500, 'DatabaseError');
  }
};

/**
 * Cleanup old score history entries
 * @param {number} daysOld - Delete entries older than this many days
 * @returns {Promise<number>} Number of entries deleted
 */
const cleanupOldScoreHistory = async (daysOld = 365) => {
  try {
    const deletedCount = await ScoreHistory.cleanupOldEntries(daysOld);
    
    return deletedCount;
    
  } catch (error) {
    throw createError(`Failed to cleanup score history: ${error.message}`, 500, 'DatabaseError');
  }
};

module.exports = {
  createScoreHistory,
  getCVScoreHistory,
  getUserScoreHistory,
  getScoreHistoryEntry,
  updateScoreHistory,
  deleteScoreHistory,
  getCVScoreStats,
  getUserScoreStats,
  getImprovementTrends,
  markSuggestionImplemented,
  getImplementedSuggestions,
  getPendingSuggestions,
  cleanupOldScoreHistory
};