/**
 * ATS (Applicant Tracking System) Scoring Service
 * Analyzes CVs and provides ATS compatibility scores
 */

const { createError } = require('../middleware/error-handlers');

/**
 * Common ATS keywords by industry
 */
const INDUSTRY_KEYWORDS = {
  technology: [
    'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'php', 'ruby',
    'react', 'angular', 'vue', 'node.js', 'express', 'django', 'spring',
    'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'git',
    'rest', 'graphql', 'microservices', 'api', 'ci/cd', 'devops',
    'agile', 'scrum', 'kanban', 'tdd', 'testing', 'automation'
  ],
  marketing: [
    'seo', 'sem', 'ppc', 'cpc', 'cpa', 'roi', 'kpi', 'analytics',
    'google analytics', 'facebook ads', 'instagram', 'linkedin',
    'content marketing', 'social media', 'email marketing', 'crm',
    'hubspot', 'marketo', 'salesforce', 'conversion', 'lead generation',
    'brand awareness', 'campaign', 'strategy', 'digital marketing'
  ],
  finance: [
    'financial analysis', 'forecasting', 'budgeting', 'reporting',
    'excel', 'financial modeling', 'valuation', 'investment',
    'risk management', 'compliance', 'gaap', 'ifrs', 'audit',
    'accounting', 'tax', 'treasury', 'cash flow', 'profit & loss'
  ],
  healthcare: [
    'patient care', 'clinical', 'medical', 'healthcare', 'hipaa',
    'electronic health records', 'ehr', 'medical coding', 'icd-10',
    'clinical trials', 'pharmaceutical', 'fda', 'regulatory',
    'nursing', 'physician', 'hospital', 'clinic', 'telemedicine'
  ],
  general: [
    'leadership', 'management', 'team', 'communication', 'problem solving',
    'analytical', 'strategic', 'innovative', 'results-oriented',
    'collaboration', 'adaptability', 'initiative', 'multitasking',
    'organization', 'time management', 'critical thinking', 'creativity'
  ]
};

/**
 * Action verbs for CVs (power words)
 */
const ACTION_VERBS = [
  'achieved', 'managed', 'led', 'developed', 'implemented', 'created',
  'designed', 'built', 'improved', 'increased', 'decreased', 'reduced',
  'optimized', 'streamlined', 'automated', 'launched', 'established',
  'coordinated', 'facilitated', 'mentored', 'trained', 'resolved',
  'analyzed', 'evaluated', 'researched', 'presented', 'negotiated',
  'collaborated', 'contributed', 'transformed', 'innovated'
];

/**
 * Common CV sections
 */
const CV_SECTIONS = [
  'contact', 'summary', 'objective', 'experience', 'work history',
  'education', 'skills', 'certifications', 'projects', 'languages',
  'awards', 'publications', 'volunteer', 'references'
];

/**
 * Clean and normalize text for analysis
 * @param {string} text - Raw text
 * @returns {string} Cleaned text
 */
const cleanText = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ')     // Collapse multiple spaces
    .trim();
};

/**
 * Extract keywords from text
 * @param {string} text - CV text
 * @returns {Array} Extracted keywords with frequencies
 */
const extractKeywords = (text) => {
  const cleaned = cleanText(text);
  
  // Simple tokenization (split by spaces and filter)
  const tokens = cleaned.split(/\s+/).filter(token => 
    token.length > 2 && 
    !/^\d+$/.test(token) && // Not just numbers
    !['the', 'and', 'for', 'with', 'this', 'that', 'have', 'from', 'was', 'were', 'are', 'is', 'am', 'be', 'been', 'being'].includes(token)
  );
  
  // Count frequencies
  const frequencies = {};
  tokens.forEach(token => {
    frequencies[token] = (frequencies[token] || 0) + 1;
  });
  
  // Convert to array and sort by frequency
  return Object.entries(frequencies)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Analyze keywords against job requirements
 * @param {string} cvText - CV text
 * @param {Array} jobKeywords - Specific job keywords (optional)
 * @param {string} jobDescription - Job description text (optional)
 * @returns {Object} Keyword analysis results
 */
const analyzeKeywords = async (cvText, jobKeywords = null, jobDescription = null) => {
  try {
    const cvKeywords = extractKeywords(cvText);
    
    // Extract keywords from job description if provided
    let targetKeywords = jobKeywords || [];
    if (jobDescription && !jobKeywords) {
      const jobDescKeywords = extractKeywords(jobDescription);
      targetKeywords = jobDescKeywords.map(k => k.keyword);
    }
    
    // If no specific keywords, use general industry keywords
    if (targetKeywords.length === 0) {
      // Try to detect industry from CV text
      const industry = detectIndustry(cvText);
      targetKeywords = INDUSTRY_KEYWORDS[industry] || INDUSTRY_KEYWORDS.general;
    }
    
    // Find matches
    const matchedKeywords = [];
    const cvTextLower = cvText.toLowerCase();
    
    targetKeywords.forEach(keyword => {
      // Check for exact match or partial match
      if (cvTextLower.includes(keyword.toLowerCase())) {
        // Count occurrences
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = cvTextLower.match(regex) || [];
        const count = matches.length;
        
        // Calculate relevance (0-1)
        const relevance = Math.min(count / 10, 1); // Cap at 1
        
        matchedKeywords.push({
          keyword,
          count,
          relevance
        });
      }
    });
    
    // Calculate match percentage
    const matchCount = matchedKeywords.length;
    const matchPercentage = targetKeywords.length > 0 
      ? (matchCount / targetKeywords.length) * 100 
      : 0;
    
    // Sort by relevance
    matchedKeywords.sort((a, b) => b.relevance - a.relevance);
    
    return {
      matchedKeywords,
      matchCount,
      matchPercentage: Math.round(matchPercentage * 10) / 10,
      totalKeywords: targetKeywords.length,
      keywordDensity: (matchCount / (cvText.split(/\s+/).length || 1)) * 100
    };
    
  } catch (error) {
    throw createError(`Keyword analysis failed: ${error.message}`, 500, 'ProcessingError');
  }
};

/**
 * Detect industry from CV text
 * @param {string} text - CV text
 * @returns {string} Detected industry
 */
const detectIndustry = (text) => {
  const lowerText = text.toLowerCase();
  
  // Check for industry-specific keywords
  const industryScores = {
    technology: 0,
    marketing: 0,
    finance: 0,
    healthcare: 0
  };
  
  Object.entries(INDUSTRY_KEYWORDS).forEach(([industry, keywords]) => {
    if (industry !== 'general') {
      keywords.forEach(keyword => {
        if (lowerText.includes(keyword)) {
          industryScores[industry]++;
        }
      });
    }
  });
  
  // Find industry with highest score
  let maxIndustry = 'general';
  let maxScore = 0;
  
  Object.entries(industryScores).forEach(([industry, score]) => {
    if (score > maxScore) {
      maxScore = score;
      maxIndustry = industry;
    }
  });
  
  return maxIndustry;
};

/**
 * Check CV sections completeness
 * @param {string} text - CV text
 * @returns {Object} Section analysis results
 */
const checkSections = async (text) => {
  try {
    const lowerText = text.toLowerCase();
    const sections = {};
    
    // Check for each section
    CV_SECTIONS.forEach(section => {
      // Look for section headers
      const present = lowerText.includes(section) || 
                     lowerText.includes(`${section}:`) ||
                     lowerText.includes(`${section}\n`);
      
      sections[section] = {
        present,
        score: present ? 10 : 0
      };
    });
    
    // Calculate completeness score
    const presentSections = Object.values(sections).filter(s => s.present).length;
    const totalSections = CV_SECTIONS.length;
    const completenessScore = Math.round((presentSections / totalSections) * 100);
    
    // Essential sections (weighted more)
    const essentialSections = ['contact', 'experience', 'education', 'skills'];
    const essentialPresent = essentialSections.filter(s => sections[s]?.present).length;
    const essentialScore = Math.round((essentialPresent / essentialSections.length) * 100);
    
    // Combined score (70% essential, 30% all sections)
    const combinedScore = Math.round((essentialScore * 0.7) + (completenessScore * 0.3));
    
    return {
      sections,
      completenessScore: combinedScore,
      essentialSectionsPresent: essentialPresent,
      totalSectionsPresent: presentSections,
      missingEssentialSections: essentialSections.filter(s => !sections[s]?.present)
    };
    
  } catch (error) {
    throw createError(`Section analysis failed: ${error.message}`, 500, 'ProcessingError');
  }
};

/**
 * Calculate CV length score
 * @param {string} text - CV text
 * @returns {Object} Length analysis results
 */
const analyzeLength = (text) => {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const characters = text.length;
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // Ideal CV length: 400-800 words
  let lengthScore = 0;
  let lengthFeedback = '';
  
  if (words.length < 200) {
    lengthScore = 20;
    lengthFeedback = 'CV is too short. Consider adding more details about your experience and skills.';
  } else if (words.length >= 200 && words.length < 400) {
    lengthScore = 60;
    lengthFeedback = 'CV is somewhat short. Could benefit from more detailed descriptions.';
  } else if (words.length >= 400 && words.length <= 800) {
    lengthScore = 100;
    lengthFeedback = 'CV length is ideal for ATS systems.';
  } else if (words.length > 800 && words.length <= 1200) {
    lengthScore = 80;
    lengthFeedback = 'CV is getting long. Consider removing less relevant information.';
  } else {
    lengthScore = 40;
    lengthFeedback = 'CV is too long. ATS systems may truncate or reject very long CVs.';
  }
  
  return {
    wordCount: words.length,
    characterCount: characters,
    lineCount: lines.length,
    score: lengthScore,
    feedback: lengthFeedback
  };
};

/**
 * Analyze formatting and structure
 * @param {string} text - CV text
 * @returns {Object} Formatting analysis results
 */
const analyzeFormatting = (text) => {
  const lines = text.split('\n');
  
  // Check for common formatting issues
  const issues = [];
  let formattingScore = 100;
  
  // Check for excessive whitespace
  const emptyLines = lines.filter(line => line.trim().length === 0).length;
  const emptyLinePercentage = (emptyLines / lines.length) * 100;
  
  if (emptyLinePercentage > 30) {
    issues.push('Too much whitespace. Consider removing empty lines.');
    formattingScore -= 20;
  }
  
  // Check for very long lines
  const longLines = lines.filter(line => line.length > 120).length;
  if (longLines > 5) {
    issues.push('Some lines are very long. Consider breaking them up.');
    formattingScore -= 15;
  }
  
  // Check for special characters that might confuse ATS
  const specialChars = ['�', '�', '�', '�', '�'];
  let hasSpecialChars = false;
  
  specialChars.forEach(char => {
    if (text.includes(char)) {
      hasSpecialChars = true;
    }
  });
  
  if (hasSpecialChars) {
    issues.push('Contains special characters that may not be ATS-friendly.');
    formattingScore -= 10;
  }
  
  // Check for tables (pipes and dashes)
  const tableLines = lines.filter(line => line.includes('|') && line.includes('-')).length;
  if (tableLines > 2) {
    issues.push('Contains table formatting which may not parse well in ATS.');
    formattingScore -= 15;
  }
  
  // Ensure score doesn't go below 0
  formattingScore = Math.max(0, formattingScore);
  
  return {
    score: formattingScore,
    issues,
    lineCount: lines.length,
    emptyLinePercentage: Math.round(emptyLinePercentage),
    hasSpecialChars,
    hasTables: tableLines > 0
  };
};

/**
 * Count action verbs in CV
 * @param {string} text - CV text
 * @returns {Object} Action verb analysis
 */
const analyzeActionVerbs = (text) => {
  const lowerText = text.toLowerCase();
  const foundVerbs = [];
  
  ACTION_VERBS.forEach(verb => {
    if (lowerText.includes(verb)) {
      foundVerbs.push(verb);
    }
  });
  
  const verbCount = foundVerbs.length;
  let verbScore = 0;
  
  if (verbCount >= 10) {
    verbScore = 100;
  } else if (verbCount >= 7) {
    verbScore = 80;
  } else if (verbCount >= 5) {
    verbScore = 60;
  } else if (verbCount >= 3) {
    verbScore = 40;
  } else if (verbCount >= 1) {
    verbScore = 20;
  }
  
  return {
    count: verbCount,
    score: verbScore,
    verbs: foundVerbs,
    feedback: verbCount >= 5 
      ? 'Good use of action verbs.' 
      : 'Consider adding more action verbs to strengthen your CV.'
  };
};

/**
 * Calculate readability score
 * @param {string} text - CV text
 * @returns {Object} Readability analysis
 */
const analyzeReadability = (text) => {
  // Simple readability calculation
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  if (sentences.length === 0 || words.length === 0) {
    return {
      score: 0,
      averageSentenceLength: 0,
      readingLevel: 'Unknown'
    };
  }
  
  const averageSentenceLength = words.length / sentences.length;
  let readabilityScore = 0;
  let readingLevel = '';
  
  // Flesch Reading Ease approximation
  if (averageSentenceLength < 10) {
    readabilityScore = 90;
    readingLevel = 'Very Easy';
  } else if (averageSentenceLength < 15) {
    readabilityScore = 80;
    readingLevel = 'Easy';
  } else if (averageSentenceLength < 20) {
    readabilityScore = 70;
    readingLevel = 'Fairly Easy';
  } else if (averageSentenceLength < 25) {
    readabilityScore = 60;
    readingLevel = 'Standard';
  } else if (averageSentenceLength < 30) {
    readabilityScore = 50;
    readingLevel = 'Fairly Difficult';
  } else {
    readabilityScore = 40;
    readingLevel = 'Difficult';
  }
  
  return {
    score: readabilityScore,
    averageSentenceLength: Math.round(averageSentenceLength * 10) / 10,
    readingLevel,
    feedback: averageSentenceLength > 25 
      ? 'Sentences are quite long. Consider breaking them up for better readability.'
      : 'Readability is good for ATS systems.'
  };
};

/**
 * Generate suggestions for CV improvement
 * @param {string} text - CV text
 * @param {Object} analysis - Previous analysis results
 * @returns {Array} List of suggestions
 */
const generateSuggestions = async (text, analysis = null) => {
  const suggestions = [];
  
  // If no analysis provided, perform basic analysis
  if (!analysis) {
    analysis = await calculateATSScore(text);
  }
  
  // Keyword suggestions
  if (analysis.keywordAnalysis.matchPercentage < 50) {
    suggestions.push({
      type: 'keywords',
      description: `Increase keyword relevance. Only ${analysis.keywordAnalysis.matchPercentage}% of relevant keywords found.`,
      priority: 'high',
      action: 'Add more industry-specific keywords from job descriptions.'
    });
  }
  
  // Section suggestions
  if (analysis.sectionAnalysis.completenessScore < 70) {
    const missing = analysis.sectionAnalysis.missingEssentialSections;
    if (missing.length > 0) {
      suggestions.push({
        type: 'sections',
        description: `Add missing essential sections: ${missing.join(', ')}.`,
        priority: 'high',
        action: 'Ensure all essential CV sections are present and clearly labeled.'
      });
    }
  }
  
  // Length suggestions
  if (analysis.lengthAnalysis.score < 60) {
    suggestions.push({
      type: 'length',
      description: analysis.lengthAnalysis.feedback,
      priority: analysis.lengthAnalysis.score < 40 ? 'high' : 'medium',
      action: 'Adjust CV length to be between 400-800 words for optimal ATS compatibility.'
    });
  }
  
  // Formatting suggestions
  if (analysis.formattingAnalysis.score < 80) {
    analysis.formattingAnalysis.issues.forEach(issue => {
      suggestions.push({
        type: 'formatting',
        description: issue,
        priority: 'medium',
        action: 'Clean up formatting to ensure ATS can parse the CV correctly.'
      });
    });
  }
  
  // Action verb suggestions
  if (analysis.actionVerbAnalysis.score < 60) {
    suggestions.push({
      type: 'language',
      description: analysis.actionVerbAnalysis.feedback,
      priority: 'medium',
      action: 'Use more action verbs like "achieved", "managed", "developed" to strengthen your CV.'
    });
  }
  
  // Readability suggestions
  if (analysis.readabilityAnalysis.score < 60) {
    suggestions.push({
      type: 'readability',
      description: analysis.readabilityAnalysis.feedback,
      priority: 'medium',
      action: 'Use shorter sentences and simpler language for better ATS parsing.'
    });
  }
  
  // Add positive feedback for good scores
  if (analysis.score >= 80) {
    suggestions.push({
      type: 'positive',
      description: 'Great job! Your CV is well-optimized for ATS systems.',
      priority: 'low',
      action: 'Maintain current quality and consider fine-tuning for specific job applications.'
    });
  }
  
  // Sort by priority (high > medium > low)
  suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  return suggestions;
};

/**
 * Calculate overall ATS score for CV
 * @param {string} cvText - CV text
 * @param {Array} jobKeywords - Specific job keywords (optional)
 * @param {string} jobDescription - Job description text (optional)
 * @returns {Promise<Object>} Complete ATS analysis results
 */
const calculateATSScore = async (cvText, jobKeywords = null, jobDescription = null) => {
  try {
    if (!cvText || cvText.trim().length === 0) {
      return {
        score: 0,
        breakdown: { keywords: 0, sections: 0, length: 0, formatting: 0, actionVerbs: 0, readability: 0 },
        keywordAnalysis: { matchedKeywords: [], matchCount: 0, matchPercentage: 0 },
        sectionAnalysis: { sections: {}, completenessScore: 0 },
        lengthAnalysis: { wordCount: 0, score: 0 },
        formattingAnalysis: { score: 0, issues: [] },
        actionVerbAnalysis: { count: 0, score: 0 },
        readabilityAnalysis: { score: 0 },
        suggestions: [],
        metrics: {}
      };
    }
    
    // Perform all analyses in parallel
    const [
      keywordAnalysis,
      sectionAnalysis,
      lengthAnalysis,
      formattingAnalysis,
      actionVerbAnalysis,
      readabilityAnalysis
    ] = await Promise.all([
      analyzeKeywords(cvText, jobKeywords, jobDescription),
      checkSections(cvText),
      analyzeLength(cvText),
      analyzeFormatting(cvText),
      analyzeActionVerbs(cvText),
      analyzeReadability(cvText)
    ]);
    
    // Calculate weighted scores
    const weights = {
      keywords: 0.30,    // 30% - Most important for ATS
      sections: 0.25,    // 25% - Structure matters
      length: 0.15,      // 15% - Optimal length
      formatting: 0.10,  // 10% - Parsability
      actionVerbs: 0.10, // 10% - Language strength
      readability: 0.10  // 10% - Clarity
    };
    
    const breakdown = {
      keywords: Math.round(keywordAnalysis.matchPercentage * weights.keywords),
      sections: Math.round(sectionAnalysis.completenessScore * weights.sections),
      length: Math.round(lengthAnalysis.score * weights.length),
      formatting: Math.round(formattingAnalysis.score * weights.formatting),
      actionVerbs: Math.round(actionVerbAnalysis.score * weights.actionVerbs),
      readability: Math.round(readabilityAnalysis.score * weights.readability)
    };
    
    // Calculate total score
    const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
    
    // Generate suggestions
    const suggestions = await generateSuggestions(cvText, {
      score: totalScore,
      keywordAnalysis,
      sectionAnalysis,
      lengthAnalysis,
      formattingAnalysis,
      actionVerbAnalysis,
      readabilityAnalysis
    });
    
    // Detect industry
    const industry = detectIndustry(cvText);
    
    // Calculate additional metrics
    const wordCount = cvText.split(/\s+/).filter(w => w.length > 0).length;
    const experienceYears = estimateExperienceYears(cvText);
    
    return {
      score: Math.round(totalScore),
      breakdown,
      keywordAnalysis,
      sectionAnalysis,
      lengthAnalysis,
      formattingAnalysis,
      actionVerbAnalysis,
      readabilityAnalysis,
      suggestions,
      industry,
      metrics: {
        wordCount,
        experienceYears,
        keywordDensity: keywordAnalysis.keywordDensity,
        sectionCount: sectionAnalysis.totalSectionsPresent,
        actionVerbs: actionVerbAnalysis.count,
        readability: readabilityAnalysis.score
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    throw createError(`ATS scoring failed: ${error.message}`, 500, 'ProcessingError');
  }
};

/**
 * Estimate years of experience from CV text
 * @param {string} text - CV text
 * @returns {number} Estimated years of experience
 */
const estimateExperienceYears = (text) => {
  // Look for year patterns like "2018-2022", "5 years", "8+ years"
  const yearPatterns = [
    /\b(\d{4})\s*[-–]\s*(\d{4}|\bpresent\b)/gi,  // 2018-2022 or 2018-Present
    /\b(\d+)\+?\s+years?\b/gi,                    // 5 years or 5+ years
    /\b(\d+)\+?\s+yrs?\b/gi                       // 5 yrs or 5+ yrs
  ];
  
  let totalYears = 0;
  let experienceEntries = 0;
  
  yearPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      if (pattern.source.includes('\\d{4}')) {
        // Date range pattern
        const years = match.match(/\d{4}/g);
        if (years && years.length >= 2) {
          const startYear = parseInt(years[0]);
          const endYear = years[1] === 'present' ? new Date().getFullYear() : parseInt(years[1]);
          const duration = endYear - startYear;
          if (duration > 0 && duration < 50) { // Sanity check
            totalYears += duration;
            experienceEntries++;
          }
        }
      } else {
        // Year count pattern
        const yearsMatch = match.match(/\d+/);
        if (yearsMatch) {
          const years = parseInt(yearsMatch[0]);
          if (years > 0 && years < 50) { // Sanity check
            totalYears += years;
            experienceEntries++;
          }
        }
      }
    });
  });
  
  // If we found multiple entries, take the maximum
  // Otherwise, estimate based on word count and content
  if (experienceEntries > 0) {
    return Math.round(totalYears / experienceEntries);
  }
  
  // Fallback estimation based on content
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 1000) return 8;
  if (wordCount > 600) return 5;
  if (wordCount > 300) return 3;
  if (wordCount > 100) return 1;
  return 0;
};

/**
 * Compare CV against job description
 * @param {string} cvText - CV text
 * @param {string} jobDescription - Job description text
 * @returns {Promise<Object>} Comparison results
 */
const compareWithJobDescription = async (cvText, jobDescription) => {
  const analysis = await calculateATSScore(cvText, null, jobDescription);
  
  // Extract job title from job description if possible
  const jobTitleMatch = jobDescription.match(/(senior|junior|lead|principal)?\s*([a-z]+)\s*(engineer|developer|analyst|manager)/i);
  const jobTitle = jobTitleMatch ? jobTitleMatch[0] : 'Unknown';
  
  return {
    ...analysis,
    jobTitle,
    jobDescriptionLength: jobDescription.length,
    cvJobFit: analysis.score >= 70 ? 'Good Fit' : analysis.score >= 50 ? 'Moderate Fit' : 'Poor Fit',
    recommendations: analysis.suggestions.filter(s => s.priority === 'high')
  };
};

/**
 * Get industry-specific keyword suggestions
 * @param {string} industry - Industry name
 * @returns {Array} Industry-specific keywords
 */
const getIndustryKeywords = (industry) => {
  return INDUSTRY_KEYWORDS[industry.toLowerCase()] || INDUSTRY_KEYWORDS.general;
};

/**
 * Get all available industries
 * @returns {Array} List of supported industries
 */
const getAvailableIndustries = () => {
  return Object.keys(INDUSTRY_KEYWORDS).filter(key => key !== 'general');
};

module.exports = {
  calculateATSScore,
  analyzeKeywords,
  checkSections,
  generateSuggestions,
  compareWithJobDescription,
  getIndustryKeywords,
  getAvailableIndustries,
  extractKeywords,
  detectIndustry,
  analyzeLength,
  analyzeFormatting,
  analyzeActionVerbs,
  analyzeReadability,
  estimateExperienceYears
};