import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ProtectedRoute from './ProtectedRoute';

const AdminRoute = ({ children }) => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  // First check authentication via ProtectedRoute
  return (
    <ProtectedRoute>
      {user?.role === 'admin' ? (
        children
      ) : (
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-800 mb-2">
                Access Denied
              </h2>
              <p className="text-red-700 mb-4">
                You don't have permission to access this page. Administrator privileges are required.
              </p>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="btn-primary"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
};

export default AdminRoute;