/**
 * Score History Controller
 * Handles score history tracking and analysis
 */

const scoreHistoryService = require('../services/score-history');
const { createError } = require('../middleware/error-handlers');

/**
 * Get score history for CV
 * GET /api/v1/scores/cv/:id/history
 */
const getCVScoreHistory = async (req, res, next) => {
  try {
    const cvId = req.params.id;
    const userId = req.user.id;
    const { 
      limit = 20, 
      page = 1, 
      analysisType,
      startDate,
      endDate,
      sort = '-createdAt'
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const options = {
      limit: parseInt(limit),
      skip,
      analysisType,
      sort
    };
    
    // Parse dates if provided
    if (startDate) {
      options.startDate = new Date(startDate);
    }
    
    if (endDate) {
      options.endDate = new Date(endDate);
    }
    
    const history = await scoreHistoryService.getCVScoreHistory(cvId, userId, options);
    
    // Get total count for pagination
    const totalOptions = { ...options };
    delete totalOptions.limit;
    delete totalOptions.skip;
    const totalHistory = await scoreHistoryService.getCVScoreHistory(cvId, userId, totalOptions);
    
    res.status(200).json({
      success: true,
      history,
      pagination: {
        total: totalHistory.length,
        page: parseInt(page),
        pages: Math.ceil(totalHistory.length / parseInt(limit)),
        limit: parseInt(limit)
      },
      cvId
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get specific score history entry
 * GET /api/v1/scores/:id
 */
const getScoreHistoryEntry = async (req, res, next) => {
  try {
    const entryId = req.params.id;
    const userId = req.user.id;
    
    const entry = await scoreHistoryService.getScoreHistoryEntry(entryId, userId);
    
    res.status(200).json({
      success: true,
      entry
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Update score history entry
 * PUT /api/v1/scores/:id
 */
const updateScoreHistory = async (req, res, next) => {
  try {
    const entryId = req.params.id;
    const userId = req.user.id;
    const updates = req.body;
    
    const entry = await scoreHistoryService.updateScoreHistory(entryId, userId, updates);
    
    res.status(200).json({
      success: true,
      message: 'Score history updated successfully',
      entry
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Delete score history entry
 * DELETE /api/v1/scores/:id
 */
const deleteScoreHistory = async (req, res, next) => {
  try {
    const entryId = req.params.id;
    const userId = req.user.id;
    
    await scoreHistoryService.deleteScoreHistory(entryId, userId);
    
    res.status(200).json({
      success: true,
      message: 'Score history entry deleted successfully'
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get score statistics for CV
 * GET /api/v1/scores/cv/:id/stats
 */
const getCVScoreStats = async (req, res, next) => {
  try {
    const cvId = req.params.id;
    const userId = req.user.id;
    
    const stats = await scoreHistoryService.getCVScoreStats(cvId, userId);
    
    res.status(200).json({
      success: true,
      stats,
      cvId
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get improvement trends for CV
 * GET /api/v1/scores/cv/:id/trends
 */
const getImprovementTrends = async (req, res, next) => {
  try {
    const cvId = req.params.id;
    const userId = req.user.id;
    const { 
      startDate,
      endDate
    } = req.query;
    
    const options = {};
    
    // Parse dates if provided
    if (startDate) {
      options.startDate = new Date(startDate);
    }
    
    if (endDate) {
      options.endDate = new Date(endDate);
    }
    
    const trends = await scoreHistoryService.getImprovementTrends(cvId, userId, options);
    
    res.status(200).json({
      success: true,
      trends,
      cvId
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Mark suggestion as implemented
 * POST /api/v1/scores/:id/suggestions/:index/implement
 */
const markSuggestionImplemented = async (req, res, next) => {
  try {
    const entryId = req.params.id;
    const suggestionIndex = parseInt(req.params.index);
    const userId = req.user.id;
    
    if (isNaN(suggestionIndex) || suggestionIndex < 0) {
      throw createError('Invalid suggestion index', 400, 'ValidationError');
    }
    
    const entry = await scoreHistoryService.markSuggestionImplemented(
      entryId, 
      userId, 
      suggestionIndex
    );
    
    res.status(200).json({
      success: true,
      message: 'Suggestion marked as implemented',
      entry,
      suggestionIndex
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get implemented suggestions for CV
 * GET /api/v1/scores/cv/:id/suggestions/implemented
 */
const getImplementedSuggestions = async (req, res, next) => {
  try {
    const cvId = req.params.id;
    const userId = req.user.id;
    
    const suggestions = await scoreHistoryService.getImplementedSuggestions(cvId, userId);
    
    res.status(200).json({
      success: true,
      suggestions,
      count: suggestions.length,
      cvId
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending suggestions for CV
 * GET /api/v1/scores/cv/:id/suggestions/pending
 */
const getPendingSuggestions = async (req, res, next) => {
  try {
    const cvId = req.params.id;
    const userId = req.user.id;
    
    const suggestions = await scoreHistoryService.getPendingSuggestions(cvId, userId);
    
    res.status(200).json({
      success: true,
      suggestions,
      count: suggestions.length,
      cvId
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get user score statistics
 * GET /api/v1/scores/user/stats
 */
const getUserScoreStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const stats = await scoreHistoryService.getUserScoreStats(userId);
    
    res.status(200).json({
      success: true,
      stats,
      userId
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get user score history
 * GET /api/v1/scores/user/history
 */
const getUserScoreHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      limit = 20, 
      page = 1, 
      cvId,
      analysisType,
      startDate,
      endDate,
      minScore,
      maxScore,
      sort = '-createdAt'
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const options = {
      limit: parseInt(limit),
      skip,
      cvId,
      analysisType,
      sort
    };
    
    // Parse dates if provided
    if (startDate) {
      options.startDate = new Date(startDate);
    }
    
    if (endDate) {
      options.endDate = new Date(endDate);
    }
    
    // Parse score filters
    if (minScore) {
      options.minScore = parseInt(minScore);
    }
    
    if (maxScore) {
      options.maxScore = parseInt(maxScore);
    }
    
    const history = await scoreHistoryService.getUserScoreHistory(userId, options);
    
    // Get total count for pagination
    const totalOptions = { ...options };
    delete totalOptions.limit;
    delete totalOptions.skip;
    const totalHistory = await scoreHistoryService.getUserScoreHistory(userId, totalOptions);
    
    res.status(200).json({
      success: true,
      history,
      pagination: {
        total: totalHistory.length,
        page: parseInt(page),
        pages: Math.ceil(totalHistory.length / parseInt(limit)),
        limit: parseInt(limit)
      },
      userId
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Export score history as CSV
 * GET /api/v1/scores/cv/:id/export
 */
const exportScoreHistory = async (req, res, next) => {
  try {
    const cvId = req.params.id;
    const userId = req.user.id;
    const { format = 'csv' } = req.query;
    
    if (format !== 'csv') {
      throw createError('Only CSV export is supported', 400, 'ValidationError');
    }
    
    // Get all history for this CV
    const history = await scoreHistoryService.getCVScoreHistory(cvId, userId, {});
    
    if (history.length === 0) {
      throw createError('No score history to export', 404, 'NotFoundError');
    }
    
    // Create CSV headers
    const headers = [
      'Date',
      'Score',
      'Previous Score',
      'Score Change',
      'Industry',
      'Analysis Type',
      'Keywords Score',
      'Sections Score',
      'Length Score',
      'Formatting Score',
      'Action Verbs Score',
      'Readability Score',
      'Word Count',
      'Experience Years',
      'Match Percentage',
      'Suggestions Count'
    ];
    
    // Create CSV rows
    const rows = history.map(entry => [
      new Date(entry.createdAt).toISOString(),
      entry.score,
      entry.previousScore || '',
      entry.scoreChange,
      entry.industry,
      entry.analysisType,
      entry.breakdown?.keywords || 0,
      entry.breakdown?.sections || 0,
      entry.breakdown?.length || 0,
      entry.breakdown?.formatting || 0,
      entry.breakdown?.actionVerbs || 0,
      entry.breakdown?.readability || 0,
      entry.metrics?.wordCount || 0,
      entry.metrics?.experienceYears || 0,
      entry.analysis?.keywordAnalysis?.matchPercentage || 0,
      entry.suggestions?.length || 0
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="score-history-${cvId}.csv"`);
    
    res.send(csvContent);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get score comparison between two entries
 * GET /api/v1/scores/compare/:entry1Id/:entry2Id
 */
const compareScoreEntries = async (req, res, next) => {
  try {
    const entry1Id = req.params.entry1Id;
    const entry2Id = req.params.entry2Id;
    const userId = req.user.id;
    
    // Get both entries
    const [entry1, entry2] = await Promise.all([
      scoreHistoryService.getScoreHistoryEntry(entry1Id, userId),
      scoreHistoryService.getScoreHistoryEntry(entry2Id, userId)
    ]);
    
    // Verify both entries belong to the same CV
    if (entry1.cv !== entry2.cv) {
      throw createError('Cannot compare entries from different CVs', 400, 'ValidationError');
    }
    
    // Calculate comparison
    const scoreChange = entry2.score - entry1.score;
    const scorePercentage = entry1.score > 0 ? (scoreChange / entry1.score) * 100 : 0;
    
    // Compare breakdowns
    const breakdownComparison = {};
    const categories = ['keywords', 'sections', 'length', 'formatting', 'actionVerbs', 'readability'];
    
    categories.forEach(category => {
      const score1 = entry1.breakdown?.[category] || 0;
      const score2 = entry2.breakdown?.[category] || 0;
      const change = score2 - score1;
      const percentage = score1 > 0 ? (change / score1) * 100 : 0;
      
      breakdownComparison[category] = {
        from: score1,
        to: score2,
        change,
        percentage: Math.round(percentage * 10) / 10,
        trend: change > 0 ? 'improved' : change < 0 ? 'declined' : 'unchanged'
      };
    });
    
    // Compare metrics
    const metricsComparison = {};
    const metricFields = ['wordCount', 'experienceYears', 'keywordDensity', 'sectionCount', 'actionVerbs', 'readability'];
    
    metricFields.forEach(metric => {
      const value1 = entry1.metrics?.[metric] || 0;
      const value2 = entry2.metrics?.[metric] || 0;
      const change = value2 - value1;
      const percentage = value1 > 0 ? (change / value1) * 100 : 0;
      
      metricsComparison[metric] = {
        from: value1,
        to: value2,
        change,
        percentage: Math.round(percentage * 10) / 10
      };
    });
    
    // Find new and resolved suggestions
    const suggestions1 = new Set(entry1.suggestions?.map(s => `${s.type}:${s.description}`) || []);
    const suggestions2 = new Set(entry2.suggestions?.map(s => `${s.type}:${s.description}`) || []);
    
    const newSuggestions = Array.from(suggestions2).filter(s => !suggestions1.has(s));
    const resolvedSuggestions = Array.from(suggestions1).filter(s => !suggestions2.has(s));
    
    res.status(200).json({
      success: true,
      comparison: {
        entries: {
          entry1: { id: entry1.id, date: entry1.createdAt, score: entry1.score },
          entry2: { id: entry2.id, date: entry2.createdAt, score: entry2.score }
        },
        score: {
          from: entry1.score,
          to: entry2.score,
          change: scoreChange,
          percentage: Math.round(scorePercentage * 10) / 10,
          trend: scoreChange > 0 ? 'improved' : scoreChange < 0 ? 'declined' : 'unchanged'
        },
        breakdownComparison,
        metricsComparison,
        suggestions: {
          new: newSuggestions.length,
          resolved: resolvedSuggestions.length,
          totalInEntry1: entry1.suggestions?.length || 0,
          totalInEntry2: entry2.suggestions?.length || 0
        },
        timeBetween: Math.round((new Date(entry2.createdAt) - new Date(entry1.createdAt)) / (1000 * 60 * 60 * 24)) + ' days'
      },
      cvId: entry1.cv
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCVScoreHistory,
  getScoreHistoryEntry,
  updateScoreHistory,
  deleteScoreHistory,
  getCVScoreStats,
  getImprovementTrends,
  markSuggestionImplemented,
  getImplementedSuggestions,
  getPendingSuggestions,
  getUserScoreStats,
  getUserScoreHistory,
  exportScoreHistory,
  compareScoreEntries
};