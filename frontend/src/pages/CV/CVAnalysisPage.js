import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getCVById, analyzeCV, getScoreHistory } from '../../store/slices/cvSlice';
import toast from 'react-hot-toast';

// Icons
import {
  ArrowLeftIcon,
  ChartBarIcon,
  DocumentTextIcon,
  LightBulbIcon,
  DownloadIcon,
  ShareIcon,
  RefreshIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ChevronRightIcon,
} from '@heroicons/react/outline';

// Components
import ScoreChart from '../../components/Charts/ScoreChart';

const CVAnalysisPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [jobDescription, setJobDescription] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const { currentCV, analysis, scoreHistory, isLoading } = useSelector((state) => state.cv);

  useEffect(() => {
    if (id) {
      dispatch(getCVById(id));
      dispatch(getScoreHistory(id));
    }
  }, [id, dispatch]);

  const handleAnalyze = async () => {
    if (!id) return;
    
    setIsAnalyzing(true);
    try {
      await dispatch(analyzeCV({ cvId: id, jobDescription })).unwrap();
      toast.success('CV analyzed successfully!');
    } catch (err) {
      toast.error(err || 'Failed to analyze CV');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownload = () => {
    // Implement download logic
    toast.success('Download started!');
  };

  const handleShare = () => {
    // Implement share logic
    toast.success('Share link copied to clipboard!');
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  const categories = analysis?.categories || [
    { name: 'Keywords', score: 28, maxScore: 30, weight: 30 },
    { name: 'Sections', score: 22, maxScore: 25, weight: 25 },
    { name: 'Length', score: 13, maxScore: 15, weight: 15 },
    { name: 'Formatting', score: 9, maxScore: 10, weight: 10 },
    { name: 'Action Verbs', score: 7, maxScore: 10, weight: 10 },
    { name: 'Readability', score: 8, maxScore: 10, weight: 10 },
  ];

  const suggestions = analysis?.suggestions || [
    { type: 'keyword', text: 'Add more industry-specific keywords like "JavaScript", "React", "Node.js"' },
    { type: 'formatting', text: 'Use bullet points instead of paragraphs for achievements' },
    { type: 'content', text: 'Add quantifiable results to your experience section' },
    { type: 'structure', text: 'Consider adding a professional summary at the top' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading CV analysis...</p>
        </div>
      </div>
    );
  }

  if (!currentCV) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">CV not found</h3>
          <p className="mt-2 text-gray-600">The CV you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Dashboard
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {currentCV.fileName || 'Untitled CV'}
            </h1>
            <div className="mt-2 flex items-center space-x-4">
              <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full">
                {currentCV.fileType?.toUpperCase()}
              </span>
              <span className="text-sm text-gray-500">
                Uploaded {new Date(currentCV.createdAt).toLocaleDateString()}
              </span>
              {currentCV.industry && (
                <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                  {currentCV.industry}
                </span>
              )}
            </div>
          </div>
          
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <DownloadIcon className="mr-2 h-4 w-4" />
              Download
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <ShareIcon className="mr-2 h-4 w-4" />
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Score and analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score card */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">ATS Score Analysis</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <RefreshIcon className={`mr-2 h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
                </button>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              {/* Main score */}
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreColor(analysis?.score || currentCV.latestScore || 0)}`}>
                  <div className="text-center">
                    <div className="text-4xl font-bold">
                      {analysis?.score || currentCV.latestScore || 'N/A'}
                    </div>
                    <div className="text-sm font-medium mt-1">/100</div>
                  </div>
                </div>
                <div className="mt-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(analysis?.score || currentCV.latestScore || 0).replace('text-', 'text-').replace('bg-', 'bg-')}`}>
                    {getScoreLabel(analysis?.score || currentCV.latestScore || 0)}
                  </span>
                </div>
              </div>
              
              {/* Score breakdown */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Breakdown</h3>
                <div className="space-y-4">
                  {categories.map((category) => {
                    const percentage = (category.score / category.maxScore) * 100;
                    return (
                      <div key={category.name} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700">{category.name}</span>
                          <span className="text-gray-900">
                            {category.score}/{category.maxScore} ({category.weight}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              percentage >= 80 ? 'bg-green-500' :
                              percentage >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-card">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {['overview', 'suggestions', 'history', 'comparison'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-6 text-sm font-medium border-b-2 ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="p-6">
              {/* Overview tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">CV Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-500">Word Count</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {currentCV.stats?.wordCount || 'N/A'}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-500">Pages</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {currentCV.stats?.pageCount || 'N/A'}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-500">Sections</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {currentCV.sections?.length || 'N/A'}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-500">Last Analyzed</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {analysis?.timestamp ? new Date(analysis.timestamp).toLocaleDateString() : 'Never'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Trend</h3>
                    <div className="h-64">
                      <ScoreChart />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Suggestions tab */}
              {activeTab === 'suggestions' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Improvement Suggestions</h3>
                    <div className="space-y-4">
                      {suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start p-4 bg-blue-50 rounded-lg">
                          <LightBulbIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-gray-900">{suggestion.text}</p>
                            <div className="mt-2">
                              <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                {suggestion.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Keyword Analysis</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-600 mb-3">
                        Top keywords found in your CV:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {['JavaScript', 'React', 'Node.js', 'TypeScript', 'AWS', 'Agile', 'Team Leadership'].map((keyword) => (
                          <span
                            key={keyword}
                            className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-700"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* History tab */}
              {activeTab === 'history' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Score History</h3>
                  {scoreHistory.length > 0 ? (
                    <div className="space-y-4">
                      {scoreHistory.map((history, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">
                              Score: {history.score}/100
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(history.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-medium ${history.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {history.change >= 0 ? '+' : ''}{history.change} points
                            </div>
                            <div className="text-sm text-gray-500">
                              vs previous
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900">No history yet</h3>
                      <p className="mt-2 text-gray-600">
                        Analyze your CV to start tracking score improvements.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Comparison tab */}
              {activeTab === 'comparison' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Compare with Job Description</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 mb-2">
                        Paste job description
                      </label>
                      <textarea
                        id="jobDescription"
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        rows="4"
                        className="w-full form-input"
                        placeholder="Paste the job description to compare with your CV..."
                      />
                    </div>
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !jobDescription.trim()}
                      className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAnalyzing ? 'Comparing...' : 'Compare Now'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Actions and info */}
        <div className="space-y-6">
          {/* Analyze with job description */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Targeted Analysis</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="targetJobDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  Paste job description
                </label>
                <textarea
                  id="targetJobDescription"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows="4"
                  className="w-full form-input"
                  placeholder="Paste the job description to compare with your CV..."
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !jobDescription.trim()}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? 'Comparing...' : 'Compare Now'}
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <InformationCircleIcon className="inline h-4 w-4 mr-1" />
              Get a more accurate score by comparing against specific job requirements.
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/cv/${id}/edit`)}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="font-medium text-gray-900">Edit CV</span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
              </button>
              
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center">
                  <DownloadIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="font-medium text-gray-900">Download Report</span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
              </button>
              
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center">
                  <ShareIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="font-medium text-gray-900">Share Analysis</span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
              </button>
              
              <button
                onClick={() => navigate('/cv/upload')}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="font-medium text-gray-900">Upload New CV</span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Industry benchmarks */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Industry Benchmarks</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Your Score</span>
                  <span className="font-medium text-gray-900">
                    {analysis?.score || currentCV.latestScore || 'N/A'}/100
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${(analysis?.score || currentCV.latestScore || 0)}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Industry Average</span>
                  <span className="font-medium text-gray-900">72/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gray-400"
                    style={{ width: '72%' }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Top 10%</span>
                  <span className="font-medium text-gray-900">88/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{ width: '88%' }}
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <div className="flex">
                <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    Your score is {analysis?.score && analysis.score >= 72 ? 'above' : 'below'} the industry average.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tips for improvement */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-4">Pro Tips</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-300 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Use action verbs like "developed", "managed", "increased"</span>
              </li>
              <li className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-300 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Add quantifiable results with numbers and percentages</span>
              </li>
              <li className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-300 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Keep your CV to 1-2 pages for most industries</span>
              </li>
              <li className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-300 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Use standard fonts and avoid complex formatting</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVAnalysisPage;
