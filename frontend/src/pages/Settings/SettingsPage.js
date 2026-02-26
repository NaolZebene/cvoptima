import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { setTheme } from '../../store/slices/uiSlice';

// Icons
import {
  UserIcon,
  MailIcon,
  LockClosedIcon,
  BellIcon,
  GlobeIcon,
  CreditCardIcon,
  TrashIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/outline';

const SettingsPage = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useSelector((state) => state.auth);
  const { theme } = useSelector((state) => state.ui);

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'security', name: 'Security', icon: LockClosedIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'billing', name: 'Billing', icon: CreditCardIcon },
    { id: 'preferences', name: 'Preferences', icon: GlobeIcon },
    { id: 'data', name: 'Data & Privacy', icon: DownloadIcon },
  ];

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Profile updated successfully!');
    }, 1500);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Password changed successfully!');
    }, 1500);
  };

  const handleExportData = () => {
    toast.loading('Preparing your data export...');
    
    // Simulate export
    setTimeout(() => {
      toast.success('Data export ready! Check your email.');
    }, 3000);
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.loading('Deleting your account...');
      
      // Simulate deletion
      setTimeout(() => {
        toast.success('Account deleted successfully.');
        // In a real app, this would log the user out and redirect
      }, 3000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar navigation */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-3" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1">
          {/* Profile tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-card p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>
              
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      defaultValue={user?.name?.split(' ')[0] || ''}
                      className="form-input"
                      placeholder="John"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      defaultValue={user?.name?.split(' ')[1] || ''}
                      className="form-input"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    defaultValue={user?.email || ''}
                    className="form-input"
                    placeholder="john@example.com"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Your email address is used for login and notifications.
                  </p>
                </div>
                
                <div>
                  <label className="form-label">Job Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Software Engineer"
                  />
                </div>
                
                <div>
                  <label className="form-label">Industry</label>
                  <select className="form-input">
                    <option value="">Select your industry</option>
                    <option value="technology">Technology</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="finance">Finance</option>
                    <option value="marketing">Marketing</option>
                    <option value="education">Education</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label">Bio</label>
                  <textarea
                    rows="4"
                    className="form-input"
                    placeholder="Tell us a bit about yourself..."
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Brief description for your profile. Max 200 characters.
                  </p>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Change password */}
              <div className="bg-white rounded-xl shadow-card p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Change Password</h2>
                
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div>
                    <label className="form-label">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        className="form-input pr-10"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOffIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="form-label">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        className="form-input pr-10"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOffIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="form-label">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="form-input pr-10"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOffIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Two-factor authentication */}
              <div className="bg-white rounded-xl shadow-card p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Two-Factor Authentication</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">2FA Status</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Add an extra layer of security to your account.
                    </p>
                  </div>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    Enable 2FA
                  </button>
                </div>
              </div>

              {/* Active sessions */}
              <div className="bg-white rounded-xl shadow-card p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Active Sessions</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">Current Session</div>
                      <div className="text-sm text-gray-500">Chrome on Windows • Just now</div>
                    </div>
                    <div className="text-green-600 font-medium">Active</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">Mobile Session</div>
                      <div className="text-sm text-gray-500">Safari on iPhone • 2 hours ago</div>
                    </div>
                    <button className="text-sm text-red-600 hover:text-red-700">
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-card p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'CV analysis completed', description: 'Get notified when your CV analysis is ready' },
                      { label: 'Score improvements', description: 'Receive updates when your CV score improves' },
                      { label: 'Subscription updates', description: 'Notifications about your subscription status' },
                      { label: 'Product updates', description: 'New features and improvements' },
                      { label: 'Marketing emails', description: 'Tips, guides, and promotional offers' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{item.label}</div>
                          <div className="text-sm text-gray-500">{item.description}</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Push Notifications</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Browser notifications', description: 'Receive notifications in your browser' },
                      { label: 'Mobile push notifications', description: 'Notifications on your mobile device' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{item.label}</div>
                          <div className="text-sm text-gray-500">{item.description}</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked={index === 0} />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Billing tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Current plan */}
              <div className="bg-white rounded-xl shadow-card p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Current Plan</h2>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 capitalize">
                      {user?.subscription?.type || 'Free'} Plan
                    </div>
                    <div className="text-gray-600 mt-1">
                      {user?.subscription?.type === 'free' ? '€0/month' : 
                       user?.subscription?.type === 'basic' ? '€9.99/month' : 
                       '€19.99/month'}
                    </div>
                    {user?.subscription?.nextBillingDate && (
                      <div className="text-sm text-gray-500 mt-2">
                        Next billing date: {user.subscription.nextBillingDate}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 md:mt-0">
                    <button
                      onClick={() => window.location.href = '/subscription'}
                      className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                    >
                      {user?.subscription?.type === 'free' ? 'Upgrade Plan' : 'Change Plan'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-white rounded-xl shadow-card p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Payment Method</h2>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <CreditCardIcon className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="ml-4">
                      <div className="font-medium text-gray-900">Visa ending in 4242</div>
                      <div className="text-sm text-gray-500">Expires 12/2026</div>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 font-medium">
                    Update
                  </button>
                </div>
              </div>

              {/* Billing history */}
              <div className="bg-white rounded-xl shadow-card p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Billing History</h2>
                <div className="space-y-4">
                  {[
                    { date: 'Feb 23, 2026', description: 'Premium Plan - Monthly', amount: '€19.99', status: 'Paid' },
                    { date: 'Jan 23, 2026', description: 'Premium Plan - Monthly', amount: '€19.99', status: 'Paid' },
                    { date: 'Dec 23, 2025', description: 'Basic to Premium Upgrade', amount: '€10.00', status: 'Paid' },
                    { date: 'Dec 23, 2025', description: 'Basic Plan - Monthly', amount: '€9.99', status: 'Paid' },
                  ].map((invoice, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{invoice.description}</div>
                        <div className="text-sm text-gray-500">{invoice.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">{invoice.amount}</div>
                        <div className={`text-sm ${
                          invoice.status === 'Paid' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {invoice.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <button className="text-blue-600 hover:text-blue-700 font-medium">
                    View Full Billing History
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preferences tab */}
          {activeTab === 'preferences' && (
            <div className="bg-white rounded-xl shadow-card p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Preferences</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Language & Region</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">Language</label>
                      <select className="form-input">
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="form-label">Time Zone</label>
                      <select className="form-input">
                        <option value="UTC">UTC</option>
                        <option value="EST">Eastern Time (EST)</option>
                        <option value="CET">Central European Time (CET)</option>
                        <option value="PST">Pacific Time (PST)</option>
                        <option value="GMT">Greenwich Mean Time (GMT)</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Display Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">Dark Mode</div>
                        <div className="text-sm text-gray-500">Switch to dark theme</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={theme === 'dark'}
                          onChange={(e) => {
                            const newTheme = e.target.checked ? 'dark' : 'light';
                            dispatch(setTheme(newTheme));
                            toast.success(`Switched to ${newTheme} mode`);
                          }}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">Compact View</div>
                        <div className="text-sm text-gray-500">Use compact spacing</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Data & Privacy tab */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Data export */}
              <div className="bg-white rounded-xl shadow-card p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Data Export</h2>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Download all your data from CVOptima. This includes your CVs, analysis results, score history, and account information.
                  </p>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex">
                      <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Export Information</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          Your data will be prepared and sent to your email within 24 hours. The export includes data in JSON and CSV formats.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleExportData}
                    className="w-full py-3 px-4 border-2 border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50"
                  >
                    <DownloadIcon className="inline h-5 w-5 mr-2" />
                    Request Data Export
                  </button>
                </div>
              </div>

              {/* Account deletion */}
              <div className="bg-white rounded-xl shadow-card p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Delete Account</h2>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="flex">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Warning</h3>
                        <p className="text-sm text-red-700 mt-1">
                          Deleting your account will permanently remove all your data, including CVs, analysis results, and subscription information. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    className="w-full py-3 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
                  >
                    <TrashIcon className="inline h-5 w-5 mr-2" />
                    Delete My Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;