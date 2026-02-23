/**
 * Admin Dashboard Service
 * Provides data and analytics for admin dashboard
 */

const { createError } = require('../middleware/error-handlers');
const User = require('../models/User');
const CV = require('../models/CV');
const ScoreHistory = require('../models/ScoreHistory');

/**
 * Get dashboard overview
 * @returns {Promise<Object>} Dashboard overview
 */
const getDashboardOverview = async () => {
  try {
    // Get current date and time ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);
    
    const thisMonth = new Date(today);
    thisMonth.setMonth(thisMonth.getMonth() - 1);
    
    // Get user statistics
    const [
      totalUsers,
      todayUsers,
      yesterdayUsers,
      activeUsers,
      userGrowth
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: yesterday, $lt: today } }),
      User.countDocuments({ lastLogin: { $gte: thisWeek } }),
      getUserGrowth()
    ]);
    
    // Get CV statistics
    const [
      totalCVs,
      todayCVs,
      processedCVs,
      averageScore
    ] = await Promise.all([
      CV.countDocuments(),
      CV.countDocuments({ createdAt: { $gte: today } }),
      CV.countDocuments({ status: 'processed' }),
      getAverageATSScore()
    ]);
    
    // Get subscription statistics
    const subscriptionStats = await getSubscriptionStats();
    
    // Get revenue statistics
    const revenueStats = await getRevenueStats();
    
    // Get conversion funnel
    const conversionFunnel = await getConversionFunnel();
    
    // Get system health
    const systemHealth = await getSystemHealth();
    
    // Get recent activity
    const recentActivity = await getRecentActivity();
    
    // Get performance metrics
    const performanceMetrics = await getPerformanceMetrics();
    
    return {
      overview: {
        timestamp: now.toISOString(),
        period: {
          today: today.toISOString(),
          week: thisWeek.toISOString(),
          month: thisMonth.toISOString()
        }
      },
      
      users: {
        total: totalUsers,
        today: todayUsers,
        yesterday: yesterdayUsers,
        active: activeUsers,
        growth: userGrowth,
        dailyAverage: Math.round(totalUsers / 30) // Assuming 30 days
      },
      
      cvs: {
        total: totalCVs,
        today: todayCVs,
        processed: processedCVs,
        processingRate: totalCVs > 0 ? Math.round((processedCVs / totalCVs) * 100) : 0,
        averageScore: averageScore
      },
      
      subscriptions: subscriptionStats,
      
      revenue: revenueStats,
      
      conversion: conversionFunnel,
      
      system: systemHealth,
      
      activity: recentActivity,
      
      performance: performanceMetrics,
      
      alerts: await getSystemAlerts(),
      
      insights: await generateDashboardInsights(
        totalUsers,
        totalCVs,
        subscriptionStats,
        revenueStats,
        conversionFunnel
      )
    };
    
  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    throw createError('Failed to load dashboard data', 500, 'DashboardError');
  }
};

/**
 * Get user growth statistics
 * @returns {Promise<Object>} User growth data
 */
const getUserGrowth = async () => {
  const now = new Date();
  const last30Days = new Date(now);
  last30Days.setDate(last30Days.getDate() - 30);
  
  const last7Days = new Date(now);
  last7Days.setDate(last7Days.getDate() - 7);
  
  const [
    total30DaysAgo,
    total7DaysAgo,
    newLast30Days,
    newLast7Days
  ] = await Promise.all([
    User.countDocuments({ createdAt: { $lt: last30Days } }),
    User.countDocuments({ createdAt: { $lt: last7Days } }),
    User.countDocuments({ createdAt: { $gte: last30Days } }),
    User.countDocuments({ createdAt: { $gte: last7Days } })
  ]);
  
  const growth30Days = total30DaysAgo > 0 
    ? ((newLast30Days / total30DaysAgo) * 100) 
    : newLast30Days > 0 ? 100 : 0;
  
  const growth7Days = total7DaysAgo > 0 
    ? ((newLast7Days / total7DaysAgo) * 100) 
    : newLast7Days > 0 ? 100 : 0;
  
  // Calculate daily growth for chart
  const dailyGrowth = await getDailyUserGrowth(30);
  
  return {
    last30Days: {
      newUsers: newLast30Days,
      growthRate: growth30Days,
      trend: growth30Days > 10 ? 'up' : growth30Days < -5 ? 'down' : 'stable'
    },
    last7Days: {
      newUsers: newLast7Days,
      growthRate: growth7Days,
      trend: growth7Days > 15 ? 'up' : growth7Days < -5 ? 'down' : 'stable'
    },
    daily: dailyGrowth
  };
};

/**
 * Get daily user growth
 * @param {number} days - Number of days
 * @returns {Promise<Array>} Daily growth data
 */
const getDailyUserGrowth = async (days = 30) => {
  const dailyData = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    });
    
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: startOfDay, $lt: endOfDay }
    });
    
    dailyData.push({
      date: startOfDay.toISOString().split('T')[0],
      newUsers,
      activeUsers,
      dayOfWeek: startOfDay.toLocaleDateString('en-US', { weekday: 'short' })
    });
  }
  
  return dailyData;
};

/**
 * Get average ATS score
 * @returns {Promise<number>} Average score
 */
const getAverageATSScore = async () => {
  const result = await CV.aggregate([
    { $match: { atsScore: { $exists: true, $ne: null } } },
    { $group: { _id: null, averageScore: { $avg: '$atsScore' } } }
  ]);
  
  return result.length > 0 ? Math.round(result[0].averageScore) : 0;
};

/**
 * Get subscription statistics
 * @returns {Promise<Object>} Subscription stats
 */
const getSubscriptionStats = async () => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: '$subscription.type',
        count: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ['$subscription.status', 'active'] }, 1, 0] }
        },
        trialing: {
          $sum: { $cond: [{ $eq: ['$subscription.status', 'trialing'] }, 1, 0] }
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ['$subscription.status', 'cancelled'] }, 1, 0] }
        },
        avgCvCount: { $avg: '$stats.cvCount' },
        avgOptimizations: { $avg: '$stats.totalOptimizations' }
      }
    }
  ]);
  
  // Format results
  const formattedStats = {
    free: { count: 0, active: 0, trialing: 0, cancelled: 0, avgCvCount: 0, avgOptimizations: 0 },
    basic: { count: 0, active: 0, trialing: 0, cancelled: 0, avgCvCount: 0, avgOptimizations: 0 },
    premium: { count: 0, active: 0, trialing: 0, cancelled: 0, avgCvCount: 0, avgOptimizations: 0 }
  };
  
  stats.forEach(stat => {
    const plan = stat._id || 'free';
    formattedStats[plan] = {
      count: stat.count,
      active: stat.active,
      trialing: stat.trialing,
      cancelled: stat.cancelled,
      avgCvCount: Math.round(stat.avgCvCount || 0),
      avgOptimizations: Math.round(stat.avgOptimizations || 0)
    };
  });
  
  // Calculate totals
  const totalUsers = Object.values(formattedStats).reduce((sum, stat) => sum + stat.count, 0);
  const paidUsers = formattedStats.basic.count + formattedStats.premium.count;
  const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;
  
  // Calculate MRR (Monthly Recurring Revenue)
  const mrr = (formattedStats.basic.active * 9.99) + (formattedStats.premium.active * 19.99);
  
  // Calculate churn rate
  const totalActivePaid = formattedStats.basic.active + formattedStats.premium.active;
  const totalCancelled = formattedStats.basic.cancelled + formattedStats.premium.cancelled;
  const churnRate = totalActivePaid > 0 ? (totalCancelled / (totalActivePaid + totalCancelled)) * 100 : 0;
  
  return {
    byPlan: formattedStats,
    totals: {
      totalUsers,
      freeUsers: formattedStats.free.count,
      paidUsers,
      activePaid: totalActivePaid,
      trialing: formattedStats.basic.trialing + formattedStats.premium.trialing,
      cancelled: totalCancelled
    },
    metrics: {
      conversionRate: Math.round(conversionRate * 100) / 100,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
      ltv: calculateLTV(formattedStats)
    }
  };
};

/**
 * Calculate Lifetime Value (LTV)
 * @param {Object} subscriptionStats - Subscription statistics
 * @returns {number} LTV estimate
 */
const calculateLTV = (subscriptionStats) => {
  const basicLTV = subscriptionStats.basic.avgCvCount * 0.5; // Estimated value per CV
  const premiumLTV = subscriptionStats.premium.avgCvCount * 1.0; // Higher value per CV
  
  const totalLTV = (subscriptionStats.basic.count * basicLTV) + 
                   (subscriptionStats.premium.count * premiumLTV);
  const totalPaid = subscriptionStats.basic.count + subscriptionStats.premium.count;
  
  return totalPaid > 0 ? Math.round((totalLTV / totalPaid) * 100) / 100 : 0;
};

/**
 * Get revenue statistics
 * @returns {Promise<Object>} Revenue stats
 */
const getRevenueStats = async () => {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(thisMonth);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  // Get subscription revenue (estimated)
  const subscriptionStats = await getSubscriptionStats();
  const currentMRR = subscriptionStats.metrics.mrr;
  
  // Calculate monthly growth
  const lastMonthMRR = currentMRR * 0.9; // Simulated - in production, query historical data
  
  const mrrGrowth = lastMonthMRR > 0 
    ? ((currentMRR - lastMonthMRR) / lastMonthMRR) * 100 
    : currentMRR > 0 ? 100 : 0;
  
  // Get revenue by plan
  const revenueByPlan = {
    basic: subscriptionStats.byPlan.basic.active * 9.99,
    premium: subscriptionStats.byPlan.premium.active * 19.99
  };
  
  // Calculate projected revenue
  const projectedMonthly = currentMRR * 1.1; // 10% growth projection
  const projectedAnnual = projectedMonthly * 12;
  
  // Get revenue trends (simulated)
  const monthlyTrend = await getMonthlyRevenueTrend(6);
  
  return {
    current: {
      mrr: currentMRR,
      arr: currentMRR * 12,
      growth: mrrGrowth,
      trend: mrrGrowth > 5 ? 'up' : mrrGrowth < -5 ? 'down' : 'stable'
    },
    byPlan: revenueByPlan,
    projected: {
      monthly: Math.round(projectedMonthly * 100) / 100,
      annual: Math.round(projectedAnnual * 100) / 100,
      confidence: 75 // 75% confidence in projection
    },
    trends: monthlyTrend,
    targets: {
      monthly: 1000, // $1000 monthly target
      annual: 12000, // $12,000 annual target
      progress: Math.min(100, (currentMRR / 1000) * 100)
    }
  };
};

/**
 * Get monthly revenue trend
 * @param {number} months - Number of months
 * @returns {Promise<Array>} Monthly revenue data
 */
const getMonthlyRevenueTrend = async (months = 6) => {
  const monthlyData = [];
  const now = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    // Simulated revenue data - in production, query actual transactions
    const baseRevenue = 500; // Base revenue
    const growthFactor = 1 + (i * 0.1); // 10% monthly growth
    const randomFactor = 0.9 + (Math.random() * 0.2); // Random variation
    
    const monthlyRevenue = Math.round(baseRevenue * growthFactor * randomFactor);
    
    monthlyData.push({
      month: monthStart.toISOString().split('T')[0].substring(0, 7),
      revenue: monthlyRevenue,
      growth: i > 0 ? Math.round(((monthlyRevenue / monthlyData[i-1]?.revenue) - 1) * 100) : 0
    });
  }
  
  return monthlyData;
};

/**
 * Get conversion funnel
 * @returns {Promise<Object>} Conversion funnel data
 */
const getConversionFunnel = async () => {
  const funnelStages = [
    { key: 'signedUp', name: 'Sign Up' },
    { key: 'firstCvUpload', name: 'First CV Upload' },
    { key: 'firstAnalysis', name: 'First Analysis' },
    { key: 'upgradePromptShown', name: 'Upgrade Prompt Shown' },
    { key: 'upgradeClicked', name: 'Upgrade Clicked' },
    { key: 'checkoutStarted', name: 'Checkout Started' },
    { key: 'checkoutCompleted', name: 'Checkout Completed' }
  ];
  
  const funnelData = [];
  let previousCount = await User.countDocuments();
  
  for (const stage of funnelStages) {
    const count = await User.countDocuments({ [`funnel.${stage.key}`]: { $exists: true } });
    const percentage = previousCount > 0 ? (count / previousCount) * 100 : 0;
    const dropoff = previousCount - count;
    
    funnelData.push({
      stage: stage.name,
      key: stage.key,
      count,
      percentage: Math.round(percentage * 100) / 100,
      dropoff,
      dropoffPercentage: previousCount > 0 ? Math.round((dropoff / previousCount) * 100 * 100) / 100 : 0
    });
    
    previousCount = count;
  }
  
  // Calculate overall conversion rate
  const totalSignups = await User.countDocuments();
  const totalPaid = await User.countDocuments({ 'subscription.type': { $in: ['basic', 'premium'] } });
  const overallConversion = totalSignups > 0 ? (totalPaid / totalSignups) * 100 : 0;
  
  // Identify bottlenecks
  const bottlenecks = funnelData
    .filter(stage => stage.dropoffPercentage > 50)
    .map(stage => ({
      stage: stage.stage,
      dropoff: stage.dropoffPercentage,
      severity: stage.dropoffPercentage > 80 ? 'critical' : 
               stage.dropoffPercentage > 60 ? 'high' : 'medium'
    }));
  
  return {
    stages: funnelData,
    overall: {
      signups: totalSignups,
      paid: totalPaid,
      conversionRate: Math.round(overallConversion * 100) / 100,
      estimatedValue: totalPaid * 15 // Average customer value
    },
    bottlenecks,
    recommendations: generateFunnelRecommendations(bottlenecks)
  };
};

/**
 * Generate funnel recommendations
 * @param {Array} bottlenecks - Bottlenecks
 * @returns {Array} Recommendations
 */
const generateFunnelRecommendations = (bottlenecks) => {
  const recommendations = [];
  
  bottlenecks.forEach(bottleneck => {
    let recommendation;
    
    switch (bottleneck.stage) {
      case 'First CV Upload':
        recommendation = 'Improve onboarding to encourage first CV upload. Consider adding a tutorial or incentives.';
        break;
      case 'First Analysis':
        recommendation = 'Make analysis more prominent and easier to access. Consider auto-analyzing uploaded CVs.';
        break;
      case 'Upgrade Prompt Shown':
        recommendation = 'Optimize upgrade prompt timing and design. A/B test different approaches.';
        break;
      case 'Upgrade Clicked':
        recommendation = 'Improve call-to-action design and value proposition. Highlight benefits more clearly.';
        break;
      case 'Checkout Started':
        recommendation = 'Simplify checkout process. Reduce steps and add trust signals.';
        break;
      case 'Checkout Completed':
        recommendation = 'Offer payment options and guarantees. Reduce form fields and friction.';
        break;
      default:
        recommendation = `Analyze user behavior at ${bottleneck.stage} stage to identify barriers.`;
    }
    
    recommendations.push({
      stage: bottleneck.stage,
      severity: bottleneck.severity,
      recommendation,
      priority: bottleneck.severity === 'critical' ? 'high' : 'medium'
    });
  });
  
  return recommendations;
};

/**
 * Get system health status
 * @returns {Promise<Object>} System health data
 */
const getSystemHealth = async () => {
  const now = new Date();
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Get recent activity
  const [
    recentUsers,
    recentCVs,
    recentErrors,
    queueStatus
  ] = await Promise.all([
    User.countDocuments({ lastLogin: { $gte: lastHour } }),
    CV.countDocuments({ createdAt: { $gte: lastHour } }),
    // In production, query error logs
    Promise.resolve(0),
    // In production, check queue status
    Promise.resolve({ active: true, size: 0 })
  ]);
  
  // Check database connection
  const dbStatus = await checkDatabaseStatus();
  
  // Check external services
  const services = await checkExternalServices();
  
  // Calculate uptime (simulated)
  const uptime = 99.95; // 99.95% uptime
  
  return {
    status: dbStatus.connected && services.stripe ? 'healthy' : 'degraded',
    timestamp: now.toISOString(),
    
    database: dbStatus,
    
    services,
    
    activity: {
      usersLastHour: recentUsers,
      cvsLastHour: recentCVs,
      errorsLastHour: recentErrors,
      queue: queueStatus
    },
    
    performance: {
      uptime,
      responseTime: 125, // ms average
      errorRate: 0.05, // 0.05%
      load: 45 // 45% average
    },
    
    alerts: dbStatus.connected ? [] : ['Database connection issue']
  };
};

/**
 * Check database status
 * @returns {Promise<Object>} Database status
 */
const checkDatabaseStatus = async () => {
  try {
    // Try to count users as a simple health check
    const userCount = await User.countDocuments();
    
    return {
      connected: true,
      type: 'MongoDB',
      responseTime: 50, // ms
      size: 'unknown', // In production, get actual size
      collections: 4 // Users, CVs, ScoreHistory, etc.
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      type: 'MongoDB',
      responseTime: null
    };
  }
};

/**
 * Check external services
 * @returns {Promise<Object>} Service status
 */
const checkExternalServices = async () => {
  // In production, actually ping these services
  return {
    stripe: !!process.env.STRIPE_SECRET_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    email: true, // Assuming email service is working
    storage: true // Assuming file storage is working
  };
};

/**
 * Get recent activity
 * @returns {Promise<Object>} Recent activity
 */
const getRecentActivity = async () => {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const [
    newUsers,
    newCVs,
    upgrades,
    recentScores
  ] = await Promise.all([
    User.find({ createdAt: { $gte: last24Hours } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('email name createdAt subscription.type'),
    
    CV.find({ createdAt: { $gte: last24Hours } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'email name')
      .select('originalFilename atsScore createdAt'),
    
    User.find({ 'funnel.checkoutCompleted': { $gte: last24Hours } })
      .sort({ 'funnel.checkoutCompleted': -1 })
      .limit(10)
      .select('email name subscription.type funnel.checkoutCompleted'),
    
    ScoreHistory.find({ createdAt: { $gte: last24Hours } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'email name')
      .populate('cv', 'originalFilename')
      .select('score improvement createdAt')
  ]);
  
  return {
    newUsers: newUsers.map(user => ({
      email: user.email,
      name: user.name,
      plan: user.subscription.type,
      time: user.createdAt
    })),
    
    newCVs: newCVs.map(cv => ({
      filename: cv.originalFilename,
      user: cv.user?.email || 'Unknown',
      score: cv.atsScore,
      time: cv.createdAt
    })),
    
    upgrades: upgrades.map(user => ({
      email: user.email,
      name: user.name,
      plan: user.subscription.type,
      time: user.funnel.checkoutCompleted
    })),
    
    scores: recentScores.map(score => ({
      user: score.user?.email || 'Unknown',
      cv: score.cv?.originalFilename || 'Unknown',
      score: score.score,
      improvement: score.improvement,
      time: score.createdAt
    })),
    
    summary: {
      totalNewUsers: newUsers.length,
      totalNewCVs: newCVs.length,
      totalUpgrades: upgrades.length,
      totalScores: recentScores.length
    }
  };
};

/**
 * Get performance metrics
 * @returns {Promise<Object>} Performance metrics
 */
const getPerformanceMetrics = async () => {
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Get processing times
  const processingTimes = await CV.aggregate([
    { $match: { 
      status: 'processed',
      processingStartedAt: { $exists: true },
      processingCompletedAt: { $exists: true },
      createdAt: { $gte: last7Days }
    }},
    { $project: {
      processingTime: { 
        $subtract: ['$processingCompletedAt', '$processingStartedAt'] 
      },
      subscription: '$userSubscription'
    }},
    { $group: {
      _id: '$subscription',
      avgTime: { $avg: '$processingTime' },
      minTime: { $min: '$processingTime' },
      maxTime: { $max: '$processingTime' },
      count: { $sum: 1 }
    }}
  ]);
  
  // Get score distribution
  const scoreDistribution = await CV.aggregate([
    { $match: { atsScore: { $exists: true } } },
    { $bucket: {
      groupBy: '$atsScore',
      boundaries: [0, 20, 40, 60, 80, 100],
      default: 'other',
      output: {
        count: { $sum: 1 },
        avgScore: { $avg: '$atsScore' }
      }
    }}
  ]);
  
  // Get user engagement
  const engagement = await User.aggregate([
    { $match: { lastLogin: { $gte: last7Days } } },
    { $group: {
      _id: null,
      avgCvCount: { $avg: '$stats.cvCount' },
      avgOptimizations: { $avg: '$stats.totalOptimizations' },
      avgSessions: { $avg: '$stats.sessionCount' || 0 }
    }}
  ]);
  
  return {
    processing: {
      bySubscription: processingTimes.reduce((acc, item) => {
        acc[item._id || 'free'] = {
          avgTime: Math.round(item.avgTime / 1000), // Convert to seconds
          minTime: Math.round(item.minTime / 1000),
          maxTime: Math.round(item.maxTime / 1000),
          count: item.count
        };
        return acc;
      }, {}),
      overall: {
        avgTime: 5, // seconds (simulated)
        satisfaction: 95 // 95% of CVs processed within expected time
      }
    },
    
    scores: {
      distribution: scoreDistribution.map(bucket => ({
        range: `${bucket._id}-${bucket._id + 20}`,
        count: bucket.count,
        percentage: 0 // Will be calculated
      })),
      average: await getAverageATSScore(),
      improvement: await getAverageImprovement()
    },
    
    engagement: engagement[0] ? {
      avgCvCount: Math.round(engagement[0].avgCvCount || 0),
      avgOptimizations: Math.round(engagement[0].avgOptimizations || 0),
      avgSessions: Math.round(engagement[0].avgSessions || 0),
      retention: 65 // 65% 7-day retention (simulated)
    } : {
      avgCvCount: 0,
      avgOptimizations: 0,
      avgSessions: 0,
      retention: 0
    },
    
    system: {
      apiResponseTime: 125, // ms
      pageLoadTime: 1.2, // seconds
      errorRate: 0.05, // 0.05%
      satisfaction: 92 // 92% user satisfaction
    }
  };
};

/**
 * Get average improvement
 * @returns {Promise<number>} Average improvement
 */
const getAverageImprovement = async () => {
  const result = await ScoreHistory.aggregate([
    { $match: { improvement: { $exists: true, $ne: null } } },
    { $group: { _id: null, avgImprovement: { $avg: '$improvement' } } }
  ]);
  
  return result.length > 0 ? Math.round(result[0].avgImprovement) : 0;
};

/**
 * Get system alerts
 * @returns {Promise<Array>} System alerts
 */
const getSystemAlerts = async () => {
  const alerts = [];
  const now = new Date();
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Check for recent errors (simulated)
  const errorCount = 0; // In production, query error logs
  
  if (errorCount > 10) {
    alerts.push({
      type: 'error',
      severity: 'high',
      message: `High error rate detected: ${errorCount} errors in the last hour`,
      time: now.toISOString(),
      action: 'Check error logs and investigate'
    });
  }
  
  // Check for slow processing (simulated)
  const slowProcessing = false; // In production, check processing times
  
  if (slowProcessing) {
    alerts.push({
      type: 'performance',
      severity: 'medium',
      message: 'CV processing times are above threshold',
      time: now.toISOString(),
      action: 'Optimize processing pipeline'
    });
  }
  
  // Check for low conversion (simulated)
  const conversionRate = await getConversionRateLast24Hours();
  
  if (conversionRate < 1) {
    alerts.push({
      type: 'business',
      severity: 'medium',
      message: `Low conversion rate: ${conversionRate.toFixed(2)}% in last 24 hours`,
      time: now.toISOString(),
      action: 'Review funnel and optimize conversion points'
    });
  }
  
  return alerts;
};

/**
 * Get conversion rate for last 24 hours
 * @returns {Promise<number>} Conversion rate
 */
const getConversionRateLast24Hours = async () => {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const [
    signups,
    conversions
  ] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: last24Hours } }),
    User.countDocuments({ 
      'funnel.checkoutCompleted': { $gte: last24Hours },
      'subscription.type': { $in: ['basic', 'premium'] }
    })
  ]);
  
  return signups > 0 ? (conversions / signups) * 100 : 0;
};

/**
 * Generate dashboard insights
 * @param {number} totalUsers - Total users
 * @param {number} totalCVs - Total CVs
 * @param {Object} subscriptionStats - Subscription statistics
 * @param {Object} revenueStats - Revenue statistics
 * @param {Object} conversionFunnel - Conversion funnel
 * @returns {Promise<Array>} Insights
 */
const generateDashboardInsights = async (
  totalUsers,
  totalCVs,
  subscriptionStats,
  revenueStats,
  conversionFunnel
) => {
  const insights = [];
  const now = new Date();
  
  // User growth insight
  if (totalUsers > 100) {
    const growthRate = subscriptionStats.metrics.conversionRate;
    
    if (growthRate > 10) {
      insights.push({
        type: 'positive',
        title: 'Strong User Growth',
        message: `Conversion rate is ${growthRate.toFixed(1)}%, above industry average.`,
        impact: 'high',
        suggestion: 'Consider scaling marketing efforts.'
      });
    } else if (growthRate < 5) {
      insights.push({
        type: 'warning',
        title: 'Low Conversion Rate',
        message: `Conversion rate is ${growthRate.toFixed(1)}%, below target.`,
        impact: 'high',
        suggestion: 'Review funnel bottlenecks and optimize.'
      });
    }
  }
  
  // Revenue insight
  const mrr = revenueStats.current.mrr;
  const target = revenueStats.targets.monthly;
  
  if (mrr > target) {
    insights.push({
      type: 'positive',
      title: 'Revenue Target Achieved',
      message: `MRR of $${mrr} exceeds monthly target of $${target}.`,
      impact: 'high',
      suggestion: 'Set new revenue targets and expand features.'
    });
  } else if (mrr < target * 0.5) {
    insights.push({
      type: 'warning',
      title: 'Revenue Below Target',
      message: `MRR of $${mrr} is below 50% of monthly target.`,
      impact: 'high',
      suggestion: 'Focus on conversion optimization and pricing strategy.'
    });
  }
  
  // Engagement insight
  const cvPerUser = totalUsers > 0 ? totalCVs / totalUsers : 0;
  
  if (cvPerUser > 2) {
    insights.push({
      type: 'positive',
      title: 'High User Engagement',
      message: `Users upload an average of ${cvPerUser.toFixed(1)} CVs each.`,
      impact: 'medium',
      suggestion: 'Leverage engaged users for testimonials and referrals.'
    });
  } else if (cvPerUser < 1) {
    insights.push({
      type: 'warning',
      title: 'Low User Engagement',
      message: 'Users upload less than 1 CV on average.',
      impact: 'medium',
      suggestion: 'Improve onboarding and encourage first CV upload.'
    });
  }
  
  // Funnel bottleneck insight
  const bottlenecks = conversionFunnel.bottlenecks;
  
  if (bottlenecks.length > 0) {
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical');
    
    if (criticalBottlenecks.length > 0) {
      insights.push({
        type: 'critical',
        title: 'Critical Funnel Bottlenecks',
        message: `${criticalBottlenecks.length} critical bottlenecks identified.`,
        impact: 'high',
        suggestion: 'Address bottlenecks immediately to improve conversion.'
      });
    }
  }
  
  // Seasonal insight (example)
  const month = now.getMonth();
  if (month === 0) { // January
    insights.push({
      type: 'info',
      title: 'Seasonal Opportunity',
      message: 'January is peak season for job searching and CV updates.',
      impact: 'medium',
      suggestion: 'Increase marketing efforts and offer seasonal promotions.'
    });
  }
  
  return insights;
};

/**
 * Get detailed report
 * @param {string} reportType - Report type
 * @param {Object} options - Report options
 * @returns {Promise<Object>} Detailed report
 */
const getDetailedReport = async (reportType, options = {}) => {
  switch (reportType) {
    case 'user_analytics':
      return await getUserAnalyticsReport(options);
      
    case 'revenue_analysis':
      return await getRevenueAnalysisReport(options);
      
    case 'conversion_funnel':
      return await getConversionFunnelReport(options);
      
    case 'performance_metrics':
      return await getPerformanceMetricsReport(options);
      
    default:
      throw createError(`Unknown report type: ${reportType}`, 400, 'ValidationError');
  }
};

/**
 * Get user analytics report
 * @param {Object} options - Report options
 * @returns {Promise<Object>} User analytics report
 */
const getUserAnalyticsReport = async (options) => {
  const { startDate, endDate, segmentBy = 'subscription' } = options;
  
  const users = await User.find({
    createdAt: { 
      $gte: new Date(startDate || '2026-01-01'), 
      $lte: new Date(endDate || new Date()) 
    }
  });
  
  // Segment analysis
  const segments = {};
  
  if (segmentBy === 'subscription') {
    const groups = ['free', 'basic', 'premium'];
    groups.forEach(group => {
      const groupUsers = users.filter(u => u.subscription.type === group);
      segments[group] = analyzeUserSegment(groupUsers);
    });
  } else if (segmentBy === 'signup_month') {
    // Group by signup month
    users.forEach(user => {
      const signupDate = new Date(user.createdAt);
      const monthKey = `${signupDate.getFullYear()}-${signupDate.getMonth() + 1}`;
      
      if (!segments[monthKey]) {
        segments[monthKey] = [];
      }
      segments[monthKey].push(user);
    });
    
    // Analyze each month
    Object.keys(segments).forEach(monthKey => {
      segments[monthKey] = analyzeUserSegment(segments[monthKey]);
    });
  }
  
  return {
    reportType: 'user_analytics',
    period: { startDate, endDate },
    totalUsers: users.length,
    segments,
    summary: analyzeUserSegment(users),
    recommendations: generateUserAnalyticsRecommendations(segments)
  };
};

/**
 * Analyze user segment
 * @param {Array} users - User segment
 * @returns {Object} Segment analysis
 */
const analyzeUserSegment = (users) => {
  if (users.length === 0) {
    return {
      count: 0,
      avgCvCount: 0,
      avgOptimizations: 0,
      retention: 0,
      conversionRate: 0
    };
  }
  
  const totalCvCount = users.reduce((sum, user) => sum + (user.stats.cvCount || 0), 0);
  const totalOptimizations = users.reduce((sum, user) => sum + (user.stats.totalOptimizations || 0), 0);
  const paidUsers = users.filter(u => u.subscription.type !== 'free').length;
  
  // Calculate retention (users active in last 7 days)
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activeUsers = users.filter(u => u.lastLogin && new Date(u.lastLogin) > last7Days).length;
  
  return {
    count: users.length,
    avgCvCount: Math.round(totalCvCount / users.length * 10) / 10,
    avgOptimizations: Math.round(totalOptimizations / users.length * 10) / 10,
    retention: Math.round((activeUsers / users.length) * 100),
    conversionRate: Math.round((paidUsers / users.length) * 100),
    totalRevenue: calculateSegmentRevenue(users)
  };
};

/**
 * Calculate segment revenue
 * @param {Array} users - User segment
 * @returns {number} Estimated revenue
 */
const calculateSegmentRevenue = (users) => {
  const basicUsers = users.filter(u => u.subscription.type === 'basic').length;
  const premiumUsers = users.filter(u => u.subscription.type === 'premium').length;
  
  return (basicUsers * 9.99) + (premiumUsers * 19.99);
};

/**
 * Generate user analytics recommendations
 * @param {Object} segments - User segments
 * @returns {Array} Recommendations
 */
const generateUserAnalyticsRecommendations = (segments) => {
  const recommendations = [];
  
  // Compare free vs paid users
  const freeUsers = segments.free;
  const paidUsers = segments.basic || segments.premium;
  
  if (freeUsers && paidUsers) {
    const cvDifference = paidUsers.avgCvCount - freeUsers.avgCvCount;
    
    if (cvDifference > 2) {
      recommendations.push({
        type: 'engagement',
        priority: 'medium',
        message: 'Paid users upload significantly more CVs than free users.',
        action: 'Highlight this benefit in upgrade prompts.'
      });
    }
  }
  
  // Check retention rates
  Object.entries(segments).forEach(([segment, data]) => {
    if (data.retention < 50) {
      recommendations.push({
        type: 'retention',
        priority: 'high',
        message: `Low retention (${data.retention}%) in ${segment} segment.`,
        action: 'Implement re-engagement campaigns for this segment.'
      });
    }
  });
  
  return recommendations;
};

/**
 * Get revenue analysis report
 * @param {Object} options - Report options
 * @returns {Promise<Object>} Revenue analysis report
 */
const getRevenueAnalysisReport = async (options) => {
  // This would integrate with Stripe API in production
  // For now, return simulated data
  
  const { startDate = '2026-01-01', endDate = new Date().toISOString().split('T')[0] } = options;
  
  // Simulated revenue data
  const monthlyRevenue = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  let baseRevenue = 500;
  
  while (current <= end) {
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    
    // Simulate growth
    const growthFactor = 1 + (Math.random() * 0.2); // 0-20% growth
    const monthly = Math.round(baseRevenue * growthFactor);
    baseRevenue = monthly;
    
    monthlyRevenue.push({
      month: current.toISOString().split('T')[0].substring(0, 7),
      revenue: monthly,
      customers: Math.round(monthly / 15), // Average $15 per customer
      growth: growthFactor - 1
    });
    
    current.setMonth(current.getMonth() + 1);
  }
  
  // Calculate metrics
  const totalRevenue = monthlyRevenue.reduce((sum, month) => sum + month.revenue, 0);
  const avgMonthlyGrowth = monthlyRevenue.length > 1 
    ? monthlyRevenue.reduce((sum, month, index) => {
        if (index > 0) return sum + month.growth;
        return sum;
      }, 0) / (monthlyRevenue.length - 1)
    : 0;
  
  return {
    reportType: 'revenue_analysis',
    period: { startDate, endDate },
    summary: {
      totalRevenue,
      avgMonthlyRevenue: Math.round(totalRevenue / monthlyRevenue.length),
      avgMonthlyGrowth: Math.round(avgMonthlyGrowth * 100),
      customerCount: monthlyRevenue.reduce((sum, month) => sum + month.customers, 0),
      avgRevenuePerCustomer: Math.round(totalRevenue / monthlyRevenue.reduce((sum, month) => sum + month.customers, 0))
    },
    monthlyBreakdown: monthlyRevenue,
    trends: {
      seasonality: detectSeasonality(monthlyRevenue),
      growthTrend: avgMonthlyGrowth > 0.1 ? 'accelerating' : avgMonthlyGrowth > 0 ? 'steady' : 'declining'
    },
    forecasts: {
      nextMonth: Math.round(baseRevenue * 1.1),
      nextQuarter: Math.round(baseRevenue * 1.1 * 3),
      confidence: 75
    },
    recommendations: generateRevenueRecommendations(monthlyRevenue, avgMonthlyGrowth)
  };
};

/**
 * Detect seasonality in revenue
 * @param {Array} monthlyRevenue - Monthly revenue data
 * @returns {Object} Seasonality analysis
 */
const detectSeasonality = (monthlyRevenue) => {
  // Simple seasonality detection
  const monthlyAverages = {};
  
  monthlyRevenue.forEach(month => {
    const monthNum = parseInt(month.month.split('-')[1]);
    if (!monthlyAverages[monthNum]) {
      monthlyAverages[monthNum] = [];
    }
    monthlyAverages[monthNum].push(month.revenue);
  });
  
  const seasonality = {};
  Object.keys(monthlyAverages).forEach(month => {
    const avg = monthlyAverages[month].reduce((sum, rev) => sum + rev, 0) / monthlyAverages[month].length;
    const overallAvg = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0) / monthlyRevenue.length;
    
    seasonality[month] = {
      average: Math.round(avg),
      difference: Math.round(((avg - overallAvg) / overallAvg) * 100),
      trend: avg > overallAvg ? 'above' : 'below'
    };
  });
  
  return seasonality;
};

/**
 * Generate revenue recommendations
 * @param {Array} monthlyRevenue - Monthly revenue
 * @param {number} growthRate - Growth rate
 * @returns {Array} Recommendations
 */
const generateRevenueRecommendations = (monthlyRevenue, growthRate) => {
  const recommendations = [];
  
  if (growthRate < 0.05) {
    recommendations.push({
      type: 'growth',
      priority: 'high',
      message: 'Revenue growth is below target (5%).',
      action: 'Review pricing strategy and conversion optimization.'
    });
  }
  
  // Check for seasonal patterns
  const seasonality = detectSeasonality(monthlyRevenue);
  const strongMonths = Object.entries(seasonality).filter(([_, data]) => data.difference > 20);
  
  if (strongMonths.length > 0) {
    recommendations.push({
      type: 'seasonal',
      priority: 'medium',
      message: `Strong seasonal performance detected in ${strongMonths.length} months.`,
      action: 'Plan marketing campaigns around peak seasons.'
    });
  }
  
  // Check customer acquisition cost (simulated)
  const cac = 50; // Simulated CAC
  const ltv = 150; // Simulated LTV
  
  if (cac > ltv * 0.33) {
    recommendations.push({
      type: 'efficiency',
      priority: 'high',
      message: `Customer acquisition cost ($${cac}) is high relative to LTV ($${ltv}).`,
      action: 'Optimize marketing channels and improve retention.'
    });
  }
  
  return recommendations;
};

/**
 * Get conversion funnel report
 * @param {Object} options - Report options
 * @returns {Promise<Object>} Conversion funnel report
 */
const getConversionFunnelReport = async (options) => {
  const { startDate, endDate } = options;
  
  const users = await User.find({
    createdAt: { 
      $gte: new Date(startDate || '2026-01-01'), 
      $lte: new Date(endDate || new Date()) 
    }
  });
  
  // Calculate funnel metrics
  const funnel = await getConversionFunnel();
  
  // Calculate time between stages
  const stageTimes = await calculateFunnelStageTimes(users);
  
  // Segment analysis
  const segments = {
    bySubscription: await analyzeFunnelBySubscription(users),
    bySource: await analyzeFunnelBySource(users), // Would require tracking source
    byDevice: await analyzeFunnelByDevice(users) // Would require tracking device
  };
  
  return {
    reportType: 'conversion_funnel',
    period: { startDate, endDate },
    funnel,
    stageTimes,
    segments,
    optimizationOpportunities: identifyFunnelOptimizations(funnel, stageTimes),
    recommendations: generateFunnelOptimizationRecommendations(funnel, stageTimes)
  };
};

/**
 * Calculate funnel stage times
 * @param {Array} users - Users
 * @returns {Promise<Object>} Stage times
 */
const calculateFunnelStageTimes = async (users) => {
  const times = {};
  
  // Define stage pairs
  const stagePairs = [
    ['signedUp', 'firstCvUpload'],
    ['firstCvUpload', 'firstAnalysis'],
    ['firstAnalysis', 'upgradePromptShown'],
    ['upgradePromptShown', 'upgradeClicked'],
    ['upgradeClicked', 'checkoutStarted'],
    ['checkoutStarted', 'checkoutCompleted']
  ];
  
  for (const [fromStage, toStage] of stagePairs) {
    const stageUsers = users.filter(user => 
      user.funnel[fromStage] && user.funnel[toStage]
    );
    
    if (stageUsers.length > 0) {
      const timeDiffs = stageUsers.map(user => {
        const fromTime = new Date(user.funnel[fromStage]);
        const toTime = new Date(user.funnel[toStage]);
        return toTime - fromTime;
      });
      
      const avgTime = timeDiffs.reduce((sum, time) => sum + time, 0) / timeDiffs.length;
      const medianTime = calculateMedian(timeDiffs);
      
      times[`${fromStage}_to_${toStage}`] = {
        users: stageUsers.length,
        averageTime: formatTime(avgTime),
        medianTime: formatTime(medianTime),
        minTime: formatTime(Math.min(...timeDiffs)),
        maxTime: formatTime(Math.max(...timeDiffs))
      };
    }
  }
  
  return times;
};

/**
 * Analyze funnel by subscription
 * @param {Array} users - Users
 * @returns {Promise<Object>} Subscription analysis
 */
const analyzeFunnelBySubscription = async (users) => {
  const segments = {
    free: users.filter(u => u.subscription.type === 'free'),
    basic: users.filter(u => u.subscription.type === 'basic'),
    premium: users.filter(u => u.subscription.type === 'premium')
  };
  
  const analysis = {};
  
  Object.entries(segments).forEach(([segment, segmentUsers]) => {
    if (segmentUsers.length > 0) {
      analysis[segment] = {
        count: segmentUsers.length,
        conversionRate: segment === 'free' ? 0 : 100,
        avgTimeToConvert: calculateAvgTimeToConvert(segmentUsers),
        topFunnelStage: getTopFunnelStage(segmentUsers)
      };
    }
  });
  
  return analysis;
};

/**
 * Calculate average time to convert
 * @param {Array} users - Users
 * @returns {string} Average time
 */
const calculateAvgTimeToConvert = (users) => {
  const convertedUsers = users.filter(u => u.subscription.type !== 'free');
  
  if (convertedUsers.length === 0) return 'N/A';
  
  const times = convertedUsers.map(user => {
    const signupDate = new Date(user.funnel.signedUp || user.createdAt);
    const conversionDate = new Date(user.funnel.checkoutCompleted || new Date());
    return conversionDate - signupDate;
  });
  
  const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  return formatTime(avgTime);
};

/**
 * Get top funnel stage
 * @param {Array} users - Users
 * @returns {string} Top funnel stage
 */
const getTopFunnelStage = (users) => {
  const stages = [
    'firstCvUpload',
    'firstAnalysis',
    'upgradePromptShown',
    'upgradeClicked',
    'checkoutStarted',
    'checkoutCompleted'
  ];
  
  let topStage = 'signedUp';
  let topCount = users.length;
  
  stages.forEach(stage => {
    const count = users.filter(u => u.funnel[stage]).length;
    if (count > 0 && count < topCount) {
      topStage = stage;
      topCount = count;
    }
  });
  
  return topStage;
};

/**
 * Identify funnel optimizations
 * @param {Object} funnel - Funnel data
 * @param {Object} stageTimes - Stage times
 * @returns {Array} Optimization opportunities
 */
const identifyFunnelOptimizations = (funnel, stageTimes) => {
  const opportunities = [];
  
  // Check for high dropoff stages
  funnel.stages.forEach((stage, index) => {
    if (stage.dropoffPercentage > 50) {
      opportunities.push({
        stage: stage.stage,
        type: 'dropoff',
        severity: stage.dropoffPercentage > 80 ? 'critical' : 'high',
        impact: `Losing ${stage.dropoff} users (${stage.dropoffPercentage}%)`,
        potentialGain: Math.round(stage.dropoff * 0.3) // Assuming 30% recovery
      });
    }
  });
  
  // Check for slow stages
  Object.entries(stageTimes).forEach(([stagePair, data]) => {
    const avgHours = parseTimeToHours(data.averageTime);
    
    if (avgHours > 24 * 7) { // More than a week
      opportunities.push({
        stage: stagePair,
        type: 'timing',
        severity: 'medium',
        impact: `Users take ${data.averageTime} on average`,
        potentialGain: `Reduce time by 50% to improve conversion`
      });
    }
  });
  
  return opportunities;
};

/**
 * Generate funnel optimization recommendations
 * @param {Object} funnel - Funnel data
 * @param {Object} stageTimes - Stage times
 * @returns {Array} Recommendations
 */
const generateFunnelOptimizationRecommendations = (funnel, stageTimes) => {
  const recommendations = [];
  
  // Dropoff recommendations
  funnel.stages.forEach(stage => {
    if (stage.dropoffPercentage > 50) {
      recommendations.push({
        stage: stage.stage,
        priority: stage.dropoffPercentage > 80 ? 'high' : 'medium',
        action: getDropoffAction(stage.stage),
        expectedImpact: `Reduce dropoff by ${Math.round(stage.dropoffPercentage * 0.3)}%`,
        effort: 'medium'
      });
    }
  });
  
  // Timing recommendations
  Object.entries(stageTimes).forEach(([stagePair, data]) => {
    const avgHours = parseTimeToHours(data.averageTime);
    
    if (avgHours > 24 * 7) { // More than a week
      recommendations.push({
        stage: stagePair,
        priority: 'medium',
        action: 'Implement progress nudges and reminders',
        expectedImpact: `Reduce time by 50% to ${formatTime(parseTimeToHours(data.averageTime) * 0.5 * 3600000)}`,
        effort: 'low'
      });
    }
  });
  
  return recommendations;
};

/**
 * Get action for dropoff stage
 * @param {string} stage - Funnel stage
 * @returns {string} Action recommendation
 */
const getDropoffAction = (stage) => {
  const actions = {
    'First CV Upload': 'Improve onboarding flow, add tutorial, offer incentives',
    'First Analysis': 'Make analysis more prominent, auto-analyze on upload',
    'Upgrade Prompt Shown': 'Optimize prompt timing and design, A/B test variations',
    'Upgrade Clicked': 'Improve CTA design, highlight value proposition',
    'Checkout Started': 'Simplify checkout process, add trust signals',
    'Checkout Completed': 'Offer payment options, reduce form fields'
  };
  
  return actions[stage] || 'Analyze user behavior to identify barriers';
};

/**
 * Get performance metrics report
 * @param {Object} options - Report options
 * @returns {Promise<Object>} Performance metrics report
 */
const getPerformanceMetricsReport = async (options) => {
  const { startDate, endDate } = options;
  
  const [
    processingMetrics,
    scoreMetrics,
    engagementMetrics,
    systemMetrics
  ] = await Promise.all([
    getProcessingMetrics(startDate, endDate),
    getScoreMetrics(startDate, endDate),
    getEngagementMetrics(startDate, endDate),
    getSystemMetrics(startDate, endDate)
  ]);
  
  return {
    reportType: 'performance_metrics',
    period: { startDate, endDate },
    processing: processingMetrics,
    scores: scoreMetrics,
    engagement: engagementMetrics,
    system: systemMetrics,
    benchmarks: getPerformanceBenchmarks(),
    recommendations: generatePerformanceRecommendations(
      processingMetrics,
      scoreMetrics,
      engagementMetrics,
      systemMetrics
    )
  };
};

/**
 * Get processing metrics
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Processing metrics
 */
const getProcessingMetrics = async (startDate, endDate) => {
  const cvs = await CV.find({
    createdAt: { 
      $gte: new Date(startDate || '2026-01-01'), 
      $lte: new Date(endDate || new Date()) 
    }
  });
  
  const processedCVs = cvs.filter(cv => cv.status === 'processed');
  const processingTimes = processedCVs
    .filter(cv => cv.processingStartedAt && cv.processingCompletedAt)
    .map(cv => cv.processingCompletedAt - cv.processingStartedAt);
  
  const avgTime = processingTimes.length > 0 
    ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
    : 0;
  
  const successRate = cvs.length > 0 ? (processedCVs.length / cvs.length) * 100 : 0;
  
  return {
    total: cvs.length,
    processed: processedCVs.length,
    successRate: Math.round(successRate * 100) / 100,
    avgProcessingTime: Math.round(avgTime / 1000), // seconds
    byFileType: analyzeByFileType(cvs),
    trends: await getProcessingTrends(startDate, endDate)
  };
};

/**
 * Analyze by file type
 * @param {Array} cvs - CV documents
 * @returns {Object} File type analysis
 */
const analyzeByFileType = (cvs) => {
  const analysis = {};
  
  cvs.forEach(cv => {
    const type = cv.extension?.toLowerCase() || 'unknown';
    if (!analysis[type]) {
      analysis[type] = { count: 0, processed: 0 };
    }
    analysis[type].count++;
    if (cv.status === 'processed') {
      analysis[type].processed++;
    }
  });
  
  // Calculate success rates
  Object.keys(analysis).forEach(type => {
    analysis[type].successRate = analysis[type].count > 0 
      ? Math.round((analysis[type].processed / analysis[type].count) * 100) 
      : 0;
  });
  
  return analysis;
};

/**
 * Get processing trends
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Array>} Processing trends
 */
const getProcessingTrends = async (startDate, endDate) => {
  // Simulated trend data
  const trends = [];
  const start = new Date(startDate || '2026-01-01');
  const end = new Date(endDate || new Date());
  
  let current = new Date(start);
  let baseTime = 5000; // 5 seconds base
  
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    
    // Simulate improvement over time
    const improvement = 0.95; // 5% improvement per period
    baseTime *= improvement;
    
    trends.push({
      date: dateStr,
      avgTime: Math.round(baseTime / 1000),
      successRate: 95 + (Math.random() * 5), // 95-100%
      volume: Math.round(10 + (Math.random() * 20)) // 10-30 CVs
    });
    
    // Move to next day
    current.setDate(current.getDate() + 1);
  }
  
  return trends;
};

/**
 * Get score metrics
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Score metrics
 */
const getScoreMetrics = async (startDate, endDate) => {
  const scores = await ScoreHistory.find({
    createdAt: { 
      $gte: new Date(startDate || '2026-01-01'), 
      $lte: new Date(endDate || new Date()) 
    }
  });
  
  if (scores.length === 0) {
    return {
      total: 0,
      average: 0,
      distribution: [],
      improvement: 0,
      trends: []
    };
  }
  
  const totalScore = scores.reduce((sum, score) => sum + score.score, 0);
  const avgScore = totalScore / scores.length;
  
  const improvements = scores.filter(s => s.improvement).map(s => s.improvement);
  const avgImprovement = improvements.length > 0 
    ? improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length 
    : 0;
  
  // Score distribution
  const distribution = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100
  scores.forEach(score => {
    const bucket = Math.floor(score.score / 20);
    if (bucket >= 0 && bucket < 5) {
      distribution[bucket]++;
    }
  });
  
  return {
    total: scores.length,
    average: Math.round(avgScore * 100) / 100,
    median: calculateMedian(scores.map(s => s.score)),
    improvement: Math.round(avgImprovement * 100) / 100,
    distribution: distribution.map((count, index) => ({
      range: `${index * 20}-${(index + 1) * 20}`,
      count,
      percentage: Math.round((count / scores.length) * 100)
    })),
    byIndustry: await getScoresByIndustry(scores),
    trends: await getScoreTrends(startDate, endDate)
  };
};

/**
 * Get scores by industry
 * @param {Array} scores - Score history
 * @returns {Promise<Object>} Industry analysis
 */
const getScoresByIndustry = async (scores) => {
  const industries = {};
  
  scores.forEach(score => {
    const industry = score.industry || 'unknown';
    if (!industries[industry]) {
      industries[industry] = { scores: [], count: 0 };
    }
    industries[industry].scores.push(score.score);
    industries[industry].count++;
  });
  
  // Calculate averages
  Object.keys(industries).forEach(industry => {
    const data = industries[industry];
    const avg = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
    industries[industry] = {
      count: data.count,
      average: Math.round(avg * 100) / 100,
      percentage: Math.round((data.count / scores.length) * 100)
    };
  });
  
  return industries;
};

/**
 * Get score trends
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Array>} Score trends
 */
const getScoreTrends = async (startDate, endDate) => {
  // Simulated trend data
  const trends = [];
  const start = new Date(startDate || '2026-01-01');
  const end = new Date(endDate || new Date());
  
  let current = new Date(start);
  let baseScore = 65; // 65 base score
  
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    
    // Simulate slight improvement over time
    baseScore += Math.random() * 0.5 - 0.25; // Small random change
    
    trends.push({
      date: dateStr,
      average: Math.round(baseScore * 100) / 100,
      count: Math.round(5 + (Math.random() * 10)), // 5-15 scores
      improvement: Math.random() * 10 // 0-10% improvement
    });
    
    // Move to next day
    current.setDate(current.getDate() + 1);
  }
  
  return trends;
};

/**
 * Get engagement metrics
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Engagement metrics
 */
const getEngagementMetrics = async (startDate, endDate) => {
  const users = await User.find({
    createdAt: { 
      $gte: new Date(startDate || '2026-01-01'), 
      $lte: new Date(endDate || new Date()) 
    }
  });
  
  const activeUsers = users.filter(u => u.lastLogin).length;
  const totalCvCount = users.reduce((sum, u) => sum + (u.stats.cvCount || 0), 0);
  const totalOptimizations = users.reduce((sum, u) => sum + (u.stats.totalOptimizations || 0), 0);
  
  // Calculate retention
  const retention = await calculateRetention(startDate, endDate);
  
  // Calculate session data (simulated)
  const sessionData = await getSessionData(startDate, endDate);
  
  return {
    totalUsers: users.length,
    activeUsers,
    activityRate: Math.round((activeUsers / users.length) * 100),
    avgCvPerUser: Math.round((totalCvCount / users.length) * 10) / 10,
    avgOptimizationsPerUser: Math.round((totalOptimizations / users.length) * 10) / 10,
    retention,
    sessions: sessionData,
    trends: await getEngagementTrends(startDate, endDate)
  };
};

/**
 * Calculate retention
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Retention metrics
 */
const calculateRetention = async (startDate, endDate) => {
  // Simplified retention calculation
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const [
    totalUsers,
    active7Days,
    active30Days
  ] = await Promise.all([
    User.countDocuments({
      createdAt: { 
        $gte: new Date(startDate || '2026-01-01'), 
        $lte: new Date(endDate || new Date()) 
      }
    }),
    User.countDocuments({ lastLogin: { $gte: last7Days } }),
    User.countDocuments({ lastLogin: { $gte: last30Days } })
  ]);
  
  return {
    d7: totalUsers > 0 ? Math.round((active7Days / totalUsers) * 100) : 0,
    d30: totalUsers > 0 ? Math.round((active30Days / totalUsers) * 100) : 0,
    cohort: await calculateCohortRetention()
  };
};

/**
 * Calculate cohort retention
 * @returns {Promise<Array>} Cohort retention
 */
const calculateCohortRetention = async () => {
  // Simulated cohort data
  const cohorts = [];
  const now = new Date();
  
  for (let i = 0; i < 4; i++) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    
    const cohortUsers = await User.countDocuments({
      createdAt: { $gte: month, $lt: nextMonth }
    });
    
    const activeUsers = await User.countDocuments({
      createdAt: { $gte: month, $lt: nextMonth },
      lastLogin: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    cohorts.push({
      month: month.toISOString().split('T')[0].substring(0, 7),
      total: cohortUsers,
      active: activeUsers,
      retention: cohortUsers > 0 ? Math.round((activeUsers / cohortUsers) * 100) : 0
    });
  }
  
  return cohorts;
};

/**
 * Get session data
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Session data
 */
const getSessionData = async (startDate, endDate) => {
  // Simulated session data
  return {
    avgDuration: 8.5, // minutes
    avgPages: 4.2,
    bounceRate: 32, // percentage
    returningUsers: 45 // percentage
  };
};

/**
 * Get engagement trends
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Array>} Engagement trends
 */
const getEngagementTrends = async (startDate, endDate) => {
  // Simulated trend data
  const trends = [];
  const start = new Date(startDate || '2026-01-01');
  const end = new Date(endDate || new Date());
  
  let current = new Date(start);
  let baseEngagement = 60; // 60% base
  
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    
    // Simulate engagement changes
    baseEngagement += Math.random() * 2 - 1; // Small random change
    
    trends.push({
      date: dateStr,
      engagement: Math.max(0, Math.min(100, Math.round(baseEngagement))),
      activeUsers: Math.round(10 + (Math.random() * 20)),
      avgSessions: Math.round(1.5 + (Math.random() * 1))
    });
    
    // Move to next day
    current.setDate(current.getDate() + 1);
  }
  
  return trends;
};

/**
 * Get system metrics
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} System metrics
 */
const getSystemMetrics = async (startDate, endDate) => {
  // Simulated system metrics
  return {
    uptime: 99.95,
    responseTime: {
      api: 125, // ms
      page: 1200, // ms
      database: 45 // ms
    },
    errorRate: 0.05, // percentage
    throughput: {
      requests: 1250, // per minute
      cvs: 45, // per hour
      users: 12 // per hour
    },
    resources: {
      cpu: 45, // percentage
      memory: 62, // percentage
      storage: 28 // percentage
    },
    alerts: {
      critical: 0,
      warning: 2,
      info: 5
    }
  };
};

/**
 * Get performance benchmarks
 * @returns {Object} Performance benchmarks
 */
const getPerformanceBenchmarks = () => {
  return {
    processing: {
      target: 10, // seconds
      industry: 15, // seconds
      best: 5 // seconds
    },
    scores: {
      target: 70, // average score
      industry: 65, // average score
      best: 80 // average score
    },
    engagement: {
      target: 60, // percentage
      industry: 50, // percentage
      best: 75 // percentage
    },
    system: {
      target: 99.9, // uptime percentage
      industry: 99.5, // uptime percentage
      best: 99.99 // uptime percentage
    }
  };
};

/**
 * Generate performance recommendations
 * @param {Object} processing - Processing metrics
 * @param {Object} scores - Score metrics
 * @param {Object} engagement - Engagement metrics
 * @param {Object} system - System metrics
 * @returns {Array} Recommendations
 */
const generatePerformanceRecommendations = (processing, scores, engagement, system) => {
  const recommendations = [];
  const benchmarks = getPerformanceBenchmarks();
  
  // Processing recommendations
  if (processing.avgProcessingTime > benchmarks.processing.target) {
    recommendations.push({
      area: 'processing',
      priority: 'medium',
      issue: `Processing time (${processing.avgProcessingTime}s) above target (${benchmarks.processing.target}s)`,
      action: 'Optimize extraction algorithms and implement caching',
      impact: 'High'
    });
  }
  
  // Score recommendations
  if (scores.average < benchmarks.scores.target) {
    recommendations.push({
      area: 'scores',
      priority: 'high',
      issue: `Average score (${scores.average}) below target (${benchmarks.scores.target})`,
      action: 'Improve scoring algorithm and keyword database',
      impact: 'High'
    });
  }
  
  // Engagement recommendations
  if (engagement.activityRate < benchmarks.engagement.target) {
    recommendations.push({
      area: 'engagement',
      priority: 'medium',
      issue: `Activity rate (${engagement.activityRate}%) below target (${benchmarks.engagement.target}%)`,
      action: 'Implement re-engagement campaigns and improve onboarding',
      impact: 'Medium'
    });
  }
  
  // System recommendations
  if (system.uptime < benchmarks.system.target) {
    recommendations.push({
      area: 'system',
      priority: 'critical',
      issue: `Uptime (${system.uptime}%) below target (${benchmarks.system.target}%)`,
      action: 'Investigate infrastructure issues and implement redundancy',
      impact: 'Critical'
    });
  }
  
  // Check error rate
  if (system.errorRate > 0.1) {
    recommendations.push({
      area: 'system',
      priority: 'high',
      issue: `Error rate (${system.errorRate}%) above acceptable threshold (0.1%)`,
      action: 'Review error logs and fix recurring issues',
      impact: 'High'
    });
  }
  
  return recommendations;
};

/**
 * Helper: Calculate median
 * @param {Array} numbers - Array of numbers
 * @returns {number} Median
 */
const calculateMedian = (numbers) => {
  if (numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  
  return sorted[middle];
};

/**
 * Helper: Format time
 * @param {number} milliseconds - Time in milliseconds
 * @returns {string} Formatted time
 */
const formatTime = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
};

/**
 * Helper: Parse time to hours
 * @param {string} timeString - Formatted time string
 * @returns {number} Hours
 */
const parseTimeToHours = (timeString) => {
  const match = timeString.match(/(\d+)\s+(day|hour|minute|second)/);
  if (!match) return 0;
  
  const [, value, unit] = match;
  const numValue = parseInt(value, 10);
  
  switch (unit) {
    case 'day': return numValue * 24;
    case 'hour': return numValue;
    case 'minute': return numValue / 60;
    case 'second': return numValue / 3600;
    default: return 0;
  }
};

module.exports = {
  getDashboardOverview,
  getDetailedReport,
  
  // Report functions
  getUserAnalyticsReport,
  getRevenueAnalysisReport,
  getConversionFunnelReport,
  getPerformanceMetricsReport,
  
  // Helper functions
  calculateMedian,
  formatTime,
  parseTimeToHours,
  
  // For testing
  generateDashboardInsights,
  generateFunnelRecommendations,
  generatePerformanceRecommendations
};

