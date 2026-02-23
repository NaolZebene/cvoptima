import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getCurrentUser } from '../../store/slices/authSlice';

const ProtectedRoute = ({ children, requireSubscription = null }) => {
  const location = useLocation();
  const dispatch = useDispatch();
  
  const { isAuthenticated, isLoading, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, isAuthenticated, isLoading]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check subscription requirement
  if (requireSubscription) {
    const subscriptionLevels = {
      free: 0,
      basic: 1,
      premium: 2,
      enterprise: 3,
    };

    const userLevel = subscriptionLevels[user?.subscription?.type] || 0;
    const requiredLevel = subscriptionLevels[requireSubscription] || 0;

    if (userLevel < requiredLevel) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-yellow-800 mb-2">
                Upgrade Required
              </h2>
              <p className="text-yellow-700 mb-4">
                This feature requires a {requireSubscription} subscription.
              </p>
              <button
                onClick={() => window.location.href = '/subscription'}
                className="btn-primary"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // Check if subscription is active
  if (user?.subscription?.status === 'cancelled' || user?.subscription?.status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Subscription Inactive
            </h2>
            <p className="text-red-700 mb-4">
              Your subscription is no longer active. Please renew to continue using premium features.
            </p>
            <button
              onClick={() => window.location.href = '/subscription'}
              className="btn-primary"
            >
              Renew Subscription
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if account is active
  if (!user?.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Account Deactivated
            </h2>
            <p className="text-red-700 mb-4">
              Your account has been deactivated. Please contact support for assistance.
            </p>
            <button
              onClick={() => window.location.href = '/contact'}
              className="btn-primary"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  // All checks passed, render children
  return children;
};

export default ProtectedRoute;