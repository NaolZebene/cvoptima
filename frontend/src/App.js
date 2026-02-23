import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { Provider } from 'react-redux';
import store from './store/store';

// Layout components
import Layout from './components/Layout/Layout';

// Page components
import HomePage from './pages/Home/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import CVUploadPage from './pages/CV/CVUploadPage';
import CVAnalysisPage from './pages/CV/CVAnalysisPage';
import CVEditorPage from './pages/CV/CVEditorPage';
import VoiceCVPage from './pages/Voice/VoiceCVPage';
import SubscriptionPage from './pages/Subscription/SubscriptionPage';
import AdminDashboardPage from './pages/Admin/AdminDashboardPage';
import SettingsPage from './pages/Settings/SettingsPage';

// Protected route component
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AdminRoute from './components/Auth/AdminRoute';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="App">
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Layout><HomePage /></Layout>} />
              <Route path="/login" element={<Layout><LoginPage /></Layout>} />
              <Route path="/register" element={<Layout><RegisterPage /></Layout>} />
              
              {/* Protected routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Layout><DashboardPage /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/cv/upload" element={
                <ProtectedRoute>
                  <Layout><CVUploadPage /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/cv/:id/analysis" element={
                <ProtectedRoute>
                  <Layout><CVAnalysisPage /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/cv/:id/edit" element={
                <ProtectedRoute>
                  <Layout><CVEditorPage /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/voice/create" element={
                <ProtectedRoute>
                  <Layout><VoiceCVPage /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/subscription" element={
                <ProtectedRoute>
                  <Layout><SubscriptionPage /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Layout><SettingsPage /></Layout>
                </ProtectedRoute>
              } />
              
              {/* Admin routes */}
              <Route path="/admin" element={
                <AdminRoute>
                  <Layout><AdminDashboardPage /></Layout>
                </AdminRoute>
              } />
              
              {/* 404 route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;