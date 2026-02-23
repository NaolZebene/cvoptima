import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getCVs } from '../../store/slices/cvSlice';
import { getCurrentUser } from '../../store/slices/authSlice';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';

// Icons
import {
  DocumentTextIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  MicrophoneIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/outline';

// Components
import CVUploadCard from '../../components/CV/CVUploadCard';
import ScoreChart from '../../components/Charts/ScoreChart';
import UsageStats from '../../components/Stats/UsageStats';

const DashboardPage = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('overview');
  
  const { user } = useSelector((state) => state.auth);
  const { cvs, isLoading: cvsLoading, pagination } = useSelector((state) => state.cv);

  // Fetch CVs on component mount
  useEffect(() => {
    dispatch(getCVs({ page: 1, limit: 5 }));
  }, [dispatch]);

  // Mock data for charts and stats
  const scoreData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'ATS Score',
        data: [65, 72, 78, 82, 85, 88],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const stats = {
    totalCVs: cvs?.length || 0,
    averageScore: cvs?.reduce((acc, cv) => acc + (cv.latestScore || 0), 0) / (cvs?.length || 1) || 0,
    bestScore: Math.max(...(cvs?.map(cv => cv.latestScore || 0) || [0])),
    monthlyUsage: {
      cvUploads: 3,
      analyses: 8,
      voiceMinutes: 45,
    },
    subscription: {
      type: user?.subscription?.type || 'free',
      limit: user?.subscription?.type === 'free' ? 1 : user?.subscription?.type === 'basic' ? 10 : 'Unlimited',
      used: 3,
    },
  };

  const recentActivity = [
    {
      id: 1,
      type: 'cv_upload',
      title: 'CV Uploaded',
      description: 'Software Engineer CV uploaded',
      time: '2 hours ago',
      icon: DocumentTextIcon,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      id: 2,
      type: 'analysis',
      title: 'Analysis Complete',
      description: 'ATS score: 85/100',
      time: '4 hours ago',
      icon: ChartBarIcon,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      id: 3,
      type: 'voice',
      title: 'Voice CV Created',
      description: '15-minute recording processed',
      time: '1 day ago',
      icon: MicrophoneIcon,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      id: 4,
      type: 'subscription',
      title: 'Subscription Updated',
      description: 'Upgraded to Premium plan',
      time: '2 days ago',
      icon: CheckCircleIcon,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
    },
  ];

  const quickActions = [
    {
      title: 'Upload CV',
      description: 'Upload and analyze a new CV',
      icon: PlusIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      link: '/cv/upload',
    },
    {
      title: 'Create Voice CV',
      description: 'Record and create CV from voice',
      icon: MicrophoneIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      link: '/voice/create',
    },
    {
      title: 'View Analytics',
      description: 'Detailed CV performance analytics',
      icon: ChartBarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      link: '/dashboard/analytics',
    },
    {
      title: 'Upgrade Plan',
      description: 'Unlock premium features',
      icon: ArrowUpIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      link: '/subscription',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {user?.name || 'User'}!
            </h1>
            <p className="mt-2 text-blue-100">
              Here's what's happening with your CV optimization journey.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="inline-flex items-center px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <span className="font-medium">{user?.subscription?.type || 'Free'} Plan</span>
              {user?.subscription?.type === 'free' && (
                <Link
                  to="/subscription"
                  className="ml-3 px-3 py-1 bg-white text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50"
                >
                  Upgrade
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total CVs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCVs}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm text-gray-500">
              <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span>+2 this month</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageScore.toFixed(1)}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm text-gray-500">
              <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span>+5.2% from last month</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-lg">
              <MicrophoneIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Voice Minutes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.monthlyUsage.voiceMinutes}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm text-gray-500">
              <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
              <span>45/120 min used</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Best Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.bestScore || 'N/A'}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm text-gray-500">
              <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span>Personal best!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Chart and Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score trend chart */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Score Trend</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    activeTab === 'overview'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('detailed')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    activeTab === 'detailed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Detailed
                </button>
              </div>
            </div>
            <div className="h-64">
              <ScoreChart data={scoreData} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  to={action.link}
                  className="group p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-card-hover transition-all duration-200"
                >
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg ${action.bgColor}`}>
                      <action.icon className={`h-6 w-6 ${action.color}`} />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-medium text-gray-900 group-hover:text-blue-600">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right column - Recent Activity and Usage */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start">
                  <div className={`p-2 rounded-lg ${activity.bgColor}`}>
                    <activity.icon className={`h-5 w-5 ${activity.color}`} />
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                    <p className="text-sm text-gray-500">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/activity"
              className="mt-6 block text-center text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              View all activity
            </Link>
          </div>

          {/* Usage Stats */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Monthly Usage</h2>
            <UsageStats stats={stats.monthlyUsage} subscription={stats.subscription} />
            
            {stats.subscription.type === 'free' && stats.subscription.used >= stats.subscription.limit && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex">
                  <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Limit Reached</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      You've used all your free CV analyses this month. Upgrade to continue.
                    </p>
                    <Link
                      to="/subscription"
                      className="mt-2 inline-block text-sm font-medium text-yellow-800 hover:text-yellow-900"
                    >
                      Upgrade now →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent CVs */}
      <div className="bg-white rounded-xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent CVs</h2>
          <Link
            to="/cv"
            className="text-sm text-blue-600 hover:text-blue-500 font-medium"
          >
            View all
          </Link>
        </div>
        
        {cvsLoading ? (
          <div className="text-center py-8">
            <div className="spinner mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading CVs...</p>
          </div>
        ) : cvs?.length > 0 ? (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CV Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cvs.slice(0, 5).map((cv) => (
                  <tr key={cv._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {cv.fileName || 'Untitled CV'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {cv.fileType?.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {cv.industry || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-bold text-gray-900">
                          {cv.latestScore || 'N/A'}
                        </div>
                        {cv.latestScore && (
                          <div className="ml-2">
                            {cv.latestScore >= 80 ? (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Excellent
                              </span>
                            ) : cv.latestScore >= 60 ? (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Good
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                Needs Work
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(cv.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/cv/${cv._id}/analysis`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Analyze
                      </Link>
                      <Link
                        to={`/cv/${cv._id}/edit`}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No CVs yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by uploading your first CV.
            </p>
            <div className="mt-6">
              <Link
                to="/cv/upload"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Upload CV
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* CV Upload Card (floating) */}
      <CVUploadCard />
    </div>
  );
};

export default DashboardPage;