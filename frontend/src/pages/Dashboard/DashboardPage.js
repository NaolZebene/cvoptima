import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getCVs } from '../../store/slices/cvSlice';
import { getCurrentUser } from '../../store/slices/authSlice';

// Icons
import {
  DocumentTextIcon,
  UploadIcon,
  MicrophoneIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowRightIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/outline';

// Components
import CVUploadCard from '../../components/CV/CVUploadCard';

const DashboardPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { user } = useSelector((state) => state.auth);
  const { cvs, isLoading: cvsLoading } = useSelector((state) => state.cv);

  // Fetch CVs on component mount
  useEffect(() => {
    dispatch(getCVs({ page: 1, limit: 10 }));
  }, [dispatch]);

  // Handle quick actions
  const handleUploadCV = () => {
    navigate('/cv/upload');
  };

  const handleVoiceCV = () => {
    navigate('/voice');
  };

  const handleViewAnalysis = (cvId) => {
    navigate(`/cv/${cvId}/analysis`);
  };

  // Calculate stats
  const totalCVs = cvs?.length || 0;
  const averageScore = cvs?.length > 0 
    ? Math.round(cvs.reduce((sum, cv) => sum + (cv.analysis?.overallScore || 0), 0) / cvs.length)
    : 0;
  const bestScore = cvs?.length > 0
    ? Math.max(...cvs.map(cv => cv.analysis?.overallScore || 0))
    : 0;

  // Get recent CVs (last 3)
  const recentCVs = cvs?.slice(0, 3) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.firstName || 'User'}!
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your CVs and track your progress
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={handleUploadCV}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New CV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total CVs</p>
                <p className="text-2xl font-bold text-gray-900">{totalCVs}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{averageScore}<span className="text-sm text-gray-500">/100</span></p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Best Score</p>
                <p className="text-2xl font-bold text-gray-900">{bestScore}<span className="text-sm text-gray-500">/100</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleUploadCV}
              className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <UploadIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="font-semibold text-gray-900">Upload CV</h3>
                  <p className="text-sm text-gray-600 mt-1">Upload PDF or DOCX for analysis</p>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
              </div>
            </button>
            
            <button
              onClick={handleVoiceCV}
              className="bg-white border-2 border-gray-200 rounded-xl p-6 text-left hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <MicrophoneIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="font-semibold text-gray-900">Create with Voice</h3>
                  <p className="text-sm text-gray-600 mt-1">Speak your experience, get a CV</p>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-purple-600" />
              </div>
            </button>
          </div>
        </div>

        {/* Recent CVs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent CVs</h2>
            <Link to="/cv" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              View all
            </Link>
          </div>
          
          {cvsLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          ) : recentCVs.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-200">
                {recentCVs.map((cv) => (
                  <div key={cv._id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <DocumentTextIcon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="ml-4">
                          <h3 className="font-medium text-gray-900">
                            {cv.metadata?.fileName || 'Untitled CV'}
                          </h3>
                          <div className="flex items-center mt-1">
                            <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-500">
                              {new Date(cv.createdAt).toLocaleDateString()}
                            </span>
                            {cv.analysis?.overallScore && (
                              <>
                                <span className="mx-2 text-gray-300">•</span>
                                <span className="text-sm font-medium text-gray-700">
                                  Score: {cv.analysis.overallScore}/100
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewAnalysis(cv._id)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        View Analysis
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No CVs yet</h3>
              <p className="text-gray-600 mb-6">Upload your first CV to get started with analysis</p>
              <button
                onClick={handleUploadCV}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UploadIcon className="h-5 w-5 mr-2" />
                Upload First CV
              </button>
            </div>
          )}
        </div>

        {/* Usage Summary */}
        {user?.subscription?.type === 'free' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="font-semibold text-gray-900">Free Plan Usage</h3>
                <p className="text-sm text-gray-600 mt-1">
                  You have used {user?.usage?.cvUploads?.currentMonth?.count || 0} of 1 CV uploads this month
                </p>
                <div className="mt-3">
                  <div className="w-full bg-blue-100 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min((user?.usage?.cvUploads?.currentMonth?.count || 0) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0</span>
                    <span>1 CV/month</span>
                  </div>
                </div>
              </div>
              <Link
                to="/subscription"
                className="ml-4 px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Upgrade
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;