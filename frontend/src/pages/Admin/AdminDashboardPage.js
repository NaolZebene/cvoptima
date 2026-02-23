import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';

// Icons
import {
  UsersIcon,
  DocumentTextIcon,
  CurrencyEuroIcon,
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  RefreshIcon,
} from '@heroicons/react/outline';

// Components
import ScoreChart from '../../components/Charts/ScoreChart';

const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useSelector((state) => state.auth);

  // Mock data for admin dashboard
  const stats = {
    totalUsers: 1245,
    activeUsers: 892,
    newUsers: 45,
    totalCVs: 3120,
    cvUploads: 128,
    analyses: 456,
    revenue: 12450.75,
    mrr: 2150.25,
    arpu: 17.25,
    conversionRate: 3.2,
    churnRate: 1.8,
  };

  const recentUsers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', plan: 'premium', joined: '2 hours ago', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', plan: 'basic', joined: '4 hours ago', status: 'active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', plan: 'free', joined: '1 day ago', status: 'active' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', plan: 'premium', joined: '2 days ago', status: 'cancelled' },
    { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', plan: 'basic', joined: '3 days ago', status: 'active' },
  ];

  const recentActivities = [
    { id: 1, user: 'John Doe', action: 'Upgraded to Premium', timestamp: '10 minutes ago' },
    { id: 2, user: 'Jane Smith', action: 'Uploaded CV', timestamp: '25 minutes ago' },
    { id: 3, user: 'Bob Johnson', action: 'Completed analysis', timestamp: '1 hour ago' },
    { id: 4, user: 'System', action: 'Daily backup completed', timestamp: '2 hours ago' },
    { id: 5, user: 'Alice Brown', action: 'Cancelled subscription', timestamp: '5 hours ago' },
  ];

  const systemHealth = {
    status: 'healthy',
    uptime: '99.95%',
    responseTime: '142ms',
    database: 'connected',
    cache: 'operational',
    api: 'stable',
    lastIncident: '7 days ago',
  };

  const refreshData = () => {
    setIsLoading(true);
    toast.loading('Refreshing admin data...');
    
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Data refreshed successfully!');
    }, 1500);
  };

  const exportData = (type) => {
    toast.loading(`Preparing ${type} export...`);
    
    setTimeout(() => {
      toast.success(`${type} export ready! Check your email.`);
    }, 2000);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="mt-2 text-gray-600">
            Administrator privileges are required to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Monitor system performance, user activity, and business metrics.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <ClockIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+{stats.newUsers} this week</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total CVs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCVs.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+{stats.cvUploads} today</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-lg">
              <CurrencyEuroIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">€{stats.mrr.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+12.5% from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-600">+0.8% improvement</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Charts and metrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue chart */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Revenue Trend</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportData('revenue')}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  <DownloadIcon className="h-4 w-4 mr-1" />
                  Export
                </button>
              </div>
            </div>
            <div className="h-64">
              <ScoreChart />
            </div>
          </div>

          {/* User growth chart */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">User Growth</h2>
            <div className="h-64">
              {/* In a real app, this would be a user growth chart */}
              <div className="flex items-end h-48 space-x-2">
                {[65, 80, 75, 90, 85, 95, 100].map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-4">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Lists and status */}
        <div className="space-y-6">
          {/* Recent users */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                View all
              </button>
            </div>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.plan === 'premium' ? 'bg-purple-100 text-purple-800' :
                      user.plan === 'basic' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.plan}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">{user.joined}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System health */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">System Health</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    systemHealth.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="font-medium text-gray-900">Overall Status</span>
                </div>
                <span className="text-sm text-gray-600 capitalize">{systemHealth.status}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Uptime</span>
                <span className="font-medium text-gray-900">{systemHealth.uptime}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Response Time</span>
                <span className="font-medium text-gray-900">{systemHealth.responseTime}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Database</span>
                <span className="font-medium text-green-600">{systemHealth.database}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Last Incident</span>
                <span className="font-medium text-gray-900">{systemHealth.lastIncident}</span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full text-left p-3 bg-white/10 rounded-lg hover:bg-white/20">
                Send Announcement
              </button>
              <button className="w-full text-left p-3 bg-white/10 rounded-lg hover:bg-white/20">
                Run System Backup
              </button>
              <button className="w-full text-left p-3 bg-white/10 rounded-lg hover:bg-white/20">
                View Error Logs
              </button>
              <button className="w-full text-left p-3 bg-white/10 rounded-lg hover:bg-white/20">
                Generate Reports
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity table */}
      <div className="mt-8 bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <div className="flex space-x-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search activities..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <FilterIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentActivities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{activity.user}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{activity.action}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-500">{activity.timestamp}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Showing 5 of 124 recent activities
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
              Previous
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Export section */}
      <div className="mt-8 bg-white rounded-xl shadow-card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Data Export</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => exportData('users')}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left"
          >
            <UsersIcon className="h-6 w-6 text-blue-600 mb-2" />
            <h3 className="font-medium text-gray-900">Export Users</h3>
            <p className="text-sm text-gray-500 mt-1">CSV format with all user data</p>
          </button>
          
          <button
            onClick={() => exportData('cvs')}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left"
          >
            <DocumentTextIcon className="h-6 w-6 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900">Export CVs</h3>
            <p className="text-sm text-gray-500 mt-1">All CV metadata and analysis results</p>
          </button>
          
          <button
            onClick={() => exportData('reports')}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left"
          >
            <ChartBarIcon className="h-6 w-6 text-purple-600 mb-2" />
            <h3 className="font-medium text-gray-900">Export Reports</h3>
            <p className="text-sm text-gray-500 mt-1">Business intelligence and analytics</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;