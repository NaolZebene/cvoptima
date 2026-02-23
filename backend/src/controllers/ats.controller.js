/**
 * ATS (Applicant Tracking System) Controller
 * Handles CV analysis and scoring
 */

const CV = require('../models/CV');
const atsService = require('../services/ats-scoring');
const scoreHistoryService = require('../services/score-history');
const { createError } = require('../middleware/error-handlers');

/**
 * Analyze CV and calculate ATS score
 * POST /api/v1/ats/analyze
 */
const analyzeCV = async (req, res, next) => {
  try {
    const { cvId, cvText, jobDescription, jobKeywords } = req.body;
    const userId = req.user.id;
    
    let textToAnalyze = cvText;
    
    // If CV ID is provided, fetch the CV
    if (cvId) {
      const cv = await CV.findOne({
        _id: cvId,
        user: userId
      });
      
      if (!cv) {
        throw createError('CV not found', 404, 'NotFoundError');
      }
      
      if (!cv.extractedText) {
        throw createError('CV text not extracted yet', 400, 'ValidationError');
      }
      
      textToAnalyze = cv.extractedText;
    }
    
    // If neither CV ID nor text is provided
    if (!textToAnalyze) {
      throw createError('CV text or CV ID is required', 400, 'ValidationError');
    }
    
    // Calculate ATS score
    const analysis = await atsService.calculateATSScore(
      textToAnalyze,
      jobKeywords,
      jobDescription
    );
    
    // Create score history entry
    let scoreHistoryEntry = null;
    if (cvId) {
      scoreHistoryEntry = await scoreHistoryService.createScoreHistory({
        cvId,
        userId,
        score: analysis.score,
        breakdown: analysis.breakdown,
        analysis: {
          keywordAnalysis: analysis.keywordAnalysis,
          sectionAnalysis: analysis.sectionAnalysis,
          lengthAnalysis: analysis.lengthAnalysis,
          formattingAnalysis: analysis.formattingAnalysis,
          actionVerbAnalysis: analysis.actionVerbAnalysis,
          readabilityAnalysis: analysis.readabilityAnalysis
        },
        industry: analysis.industry,
        metrics: analysis.metrics,
        jobComparison: jobDescription ? {
          jobTitle: analysis.jobTitle,
          jobDescriptionLength: jobDescription.length,
          cvJobFit: analysis.cvJobFit,
          matchPercentage: analysis.keywordAnalysis.matchPercentage
        } : null,
        suggestions: analysis.suggestions,
        analysisType: jobDescription ? 'job_comparison' : 'initial',
        trigger: 'manual',
        notes: jobDescription ? 'Analysis with job description' : 'Initial CV analysis'
      });
    }
    
    // If CV ID was provided, update the CV with analysis results
    if (cvId) {
      const cv = await CV.findById(cvId);
      if (cv) {
        cv.atsScore = analysis.score;
        cv.atsAnalysis = {
          keywords: analysis.keywordAnalysis.matchedKeywords,
          sections: analysis.sectionAnalysis.sections,
          suggestions: analysis.suggestions
        };
        await cv.save({ validateBeforeSave: false });
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'CV analysis completed',
      analysis: {
        score: analysis.score,
        breakdown: analysis.breakdown,
        industry: analysis.industry,
        metrics: analysis.metrics,
        timestamp: analysis.timestamp
      },
      details: {
        keywordAnalysis: analysis.keywordAnalysis,
        sectionAnalysis: analysis.sectionAnalysis,
        lengthAnalysis: analysis.lengthAnalysis,
        formattingAnalysis: analysis.formattingAnalysis,
        actionVerbAnalysis: analysis.actionVerbAnalysis,
        readabilityAnalysis: analysis.readabilityAnalysis
      },
      suggestions: analysis.suggestions,
      cvId: cvId || null,
      scoreHistoryId: scoreHistoryEntry?.id || null,
      hasJobDescription: !!jobDescription
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get ATS score for specific CV
 * GET /api/v1/ats/cv/:id/score
 */
const getCVScore = async (req, res, next) => {
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
    
    // Check if CV has ATS score
    if (cv.atsScore === null || cv.atsScore === undefined) {
      throw createError('ATS score not calculated for this CV', 404, 'NotFoundError');
    }
    
    res.status(200).json({
      success: true,
      score: cv.atsScore,
      analysis: cv.atsAnalysis || {},
      cv: {
        id: cv._id,
        originalFilename: cv.originalFilename,
        status: cv.status,
        processedAt: cv.processedAt
      },
      lastUpdated: cv.updatedAt
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Compare CV with job description
 * POST /api/v1/ats/compare
 */
const compareWithJob = async (req, res, next) => {
  try {
    const { cvId, cvText, jobDescription } = req.body;
    const userId = req.user.id;
    
    if (!jobDescription) {
      throw createError('Job description is required', 400, 'ValidationError');
    }
    
    let textToAnalyze = cvText;
    
    // If CV ID is provided, fetch the CV
    if (cvId) {
      const cv = await CV.findOne({
        _id: cvId,
        user: userId
      });
      
      if (!cv) {
        throw createError('CV not found', 404, 'NotFoundError');
      }
      
      if (!cv.extractedText) {
        throw createError('CV text not extracted yet', 400, 'ValidationError');
      }
      
      textToAnalyze = cv.extractedText;
    }
    
    // If neither CV ID nor text is provided
    if (!textToAnalyze) {
      throw createError('CV text or CV ID is required', 400, 'ValidationError');
    }
    
    // Compare CV with job description
    const comparison = await atsService.compareWithJobDescription(
      textToAnalyze,
      jobDescription
    );
    
    res.status(200).json({
      success: true,
      message: 'CV-job comparison completed',
      comparison: {
        score: comparison.score,
        jobTitle: comparison.jobTitle,
        cvJobFit: comparison.cvJobFit,
        matchPercentage: comparison.keywordAnalysis.matchPercentage,
        recommendations: comparison.recommendations
      },
      analysis: {
        keywordAnalysis: comparison.keywordAnalysis,
        suggestions: comparison.suggestions
      },
      cvId: cvId || null,
      jobDescriptionLength: comparison.jobDescriptionLength
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get industry-specific keyword suggestions
 * GET /api/v1/ats/industries
 */
const getIndustries = async (req, res, next) => {
  try {
    const industries = atsService.getAvailableIndustries();
    
    res.status(200).json({
      success: true,
      industries: industries.map(industry => ({
        name: industry,
        description: getIndustryDescription(industry),
        keywordCount: atsService.getIndustryKeywords(industry).length
      })),
      totalIndustries: industries.length
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get keywords for specific industry
 * GET /api/v1/ats/industries/:industry/keywords
 */
const getIndustryKeywords = async (req, res, next) => {
  try {
    const { industry } = req.params;
    const { limit = 50 } = req.query;
    
    const keywords = atsService.getIndustryKeywords(industry);
    
    // Apply limit if specified
    const limitedKeywords = limit ? keywords.slice(0, parseInt(limit)) : keywords;
    
    res.status(200).json({
      success: true,
      industry,
      description: getIndustryDescription(industry),
      keywords: limitedKeywords,
      totalKeywords: keywords.length,
      shownKeywords: limitedKeywords.length
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get industry description
 * @param {string} industry - Industry name
 * @returns {string} Industry description
 */
const getIndustryDescription = (industry) => {
  const descriptions = {
    technology: 'Software development, IT, engineering, and technical roles',
    marketing: 'Digital marketing, advertising, content creation, and branding',
    finance: 'Banking, accounting, investment, and financial analysis',
    healthcare: 'Medical, nursing, healthcare administration, and pharmaceuticals',
    general: 'General professional skills applicable across all industries'
  };
  
  return descriptions[industry] || 'General industry';
};

/**
 * Get CV analysis history
 * GET /api/v1/ats/cv/:id/history
 */
const getAnalysisHistory = async (req, res, next) => {
  try {
    const cvId = req.params.id;
    const userId = req.user.id;
    const { limit = 10 } = req.query;
    
    // Find CV
    const cv = await CV.findOne({
      _id: cvId,
      user: userId
    });
    
    if (!cv) {
      throw createError('CV not found', 404, 'NotFoundError');
    }
    
    // In a real implementation, you would have a separate AnalysisHistory model
    // For now, we'll return the current analysis
    const history = cv.atsScore ? [{
      score: cv.atsScore,
      analysis: cv.atsAnalysis,
      analyzedAt: cv.updatedAt,
      type: 'current'
    }] : [];
    
    res.status(200).json({
      success: true,
      cvId,
      history,
      totalAnalyses: history.length,
      latestScore: cv.atsScore,
      hasHistory: history.length > 0
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Re-analyze CV (force update)
 * POST /api/v1/ats/cv/:id/re-analyze
 */
const reanalyzeCV = async (req, res, next) => {
  try {
    const cvId = req.params.id;
    const userId = req.user.id;
    const { jobDescription, jobKeywords } = req.body;
    
    // Find CV
    const cv = await CV.findOne({
      _id: cvId,
      user: userId
    });
    
    if (!cv) {
      throw createError('CV not found', 404, 'NotFoundError');
    }
    
    if (!cv.extractedText) {
      throw createError('CV text not extracted yet', 400, 'ValidationError');
    }
    
    // Calculate new ATS score
    const analysis = await atsService.calculateATSScore(
      cv.extractedText,
      jobKeywords,
      jobDescription
    );
    
    // Update CV with new analysis
    cv.atsScore = analysis.score;
    cv.atsAnalysis = {
      keywords: analysis.keywordAnalysis.matchedKeywords,
      sections: analysis.sectionAnalysis.sections,
      suggestions: analysis.suggestions,
      breakdown: analysis.breakdown,
      metrics: analysis.metrics,
      industry: analysis.industry,
      timestamp: analysis.timestamp
    };
    
    await cv.save({ validateBeforeSave: false });
    
    res.status(200).json({
      success: true,
      message: 'CV re-analyzed successfully',
      analysis: {
        score: analysis.score,
        breakdown: analysis.breakdown,
        industry: analysis.industry,
        metrics: analysis.metrics,
        previousScore: req.body.previousScore || null,
        scoreChange: req.body.previousScore ? analysis.score - req.body.previousScore : null
      },
      suggestions: analysis.suggestions,
      cvId,
      updatedAt: cv.updatedAt
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get ATS scoring statistics for user
 * GET /api/v1/ats/stats
 */
const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get all user's CVs with ATS scores
    const cvs = await CV.find({
      user: userId,
      atsScore: { $ne: null }
    }).select('atsScore originalFilename createdAt updatedAt');
    
    const scores = cvs.map(cv => cv.atsScore);
    
    // Calculate statistics
    const stats = {
      totalCVs: cvs.length,
      averageScore: scores.length > 0 ? 
        Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      scoreDistribution: {
        excellent: scores.filter(score => score >= 80).length,
        good: scores.filter(score => score >= 60 && score < 80).length,
        fair: scores.filter(score => score >= 40 && score < 60).length,
        poor: scores.filter(score => score < 40).length
      },
      recentAnalyses: cvs
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 5)
        .map(cv => ({
          id: cv._id,
          filename: cv.originalFilename,
          score: cv.atsScore,
          analyzedAt: cv.updatedAt
        }))
    };
    
    res.status(200).json({
      success: true,
      stats,
      cvsAnalyzed: cvs.length,
      lastAnalysis: cvs.length > 0 ? 
        cvs.sort((a, b) => b.updatedAt - a.updatedAt)[0].updatedAt : null
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzeCV,
  getCVScore,
  compareWithJob,
  getIndustries,
  getIndustryKeywords,
  getAnalysisHistory,
  reanalyzeCV,
  getUserStats
};