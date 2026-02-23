/**
 * Authentication utility functions
 */

// Token storage keys
const TOKEN_KEY = 'cvoptima_token';
const USER_KEY = 'cvoptima_user';
const REFRESH_TOKEN_KEY = 'cvoptima_refresh_token';

/**
 * Get authentication token from localStorage
 * @returns {string|null} The authentication token or null if not found
 */
export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Set authentication token in localStorage
 * @param {string} token - The authentication token
 */
export const setAuthToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Remove authentication token from localStorage
 */
export const removeAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/**
 * Get refresh token from localStorage
 * @returns {string|null} The refresh token or null if not found
 */
export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * Set refresh token in localStorage
 * @param {string} token - The refresh token
 */
export const setRefreshToken = (token) => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

/**
 * Get user data from localStorage
 * @returns {object|null} The user data or null if not found
 */
export const getUserData = () => {
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
};

/**
 * Set user data in localStorage
 * @param {object} userData - The user data object
 */
export const setUserData = (userData) => {
  localStorage.setItem(USER_KEY, JSON.stringify(userData));
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is authenticated
 */
export const isAuthenticated = () => {
  const token = getAuthToken();
  if (!token) return false;

  // Check if token is expired
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isExpired = payload.exp * 1000 < Date.now();
    return !isExpired;
  } catch (error) {
    return false;
  }
};

/**
 * Get user role from token
 * @returns {string|null} The user role or null if not found
 */
export const getUserRole = () => {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || null;
  } catch (error) {
    return null;
  }
};

/**
 * Check if user has admin role
 * @returns {boolean} True if user is admin
 */
export const isAdmin = () => {
  return getUserRole() === 'admin';
};

/**
 * Get user subscription type from token
 * @returns {string|null} The subscription type or null if not found
 */
export const getSubscriptionType = () => {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.subscription || null;
  } catch (error) {
    return null;
  }
};

/**
 * Check if user has required subscription level
 * @param {string} requiredLevel - Required subscription level
 * @returns {boolean} True if user has required subscription
 */
export const hasSubscription = (requiredLevel) => {
  const userLevel = getSubscriptionType();
  if (!userLevel) return false;

  const subscriptionLevels = {
    free: 0,
    basic: 1,
    premium: 2,
    enterprise: 3,
  };

  const userLevelValue = subscriptionLevels[userLevel] || 0;
  const requiredLevelValue = subscriptionLevels[requiredLevel] || 0;

  return userLevelValue >= requiredLevelValue;
};

/**
 * Get token expiration time
 * @returns {Date|null} The expiration date or null if not found
 */
export const getTokenExpiration = () => {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return new Date(payload.exp * 1000);
  } catch (error) {
    return null;
  }
};

/**
 * Check if token will expire soon (within 5 minutes)
 * @returns {boolean} True if token will expire soon
 */
export const isTokenExpiringSoon = () => {
  const expiration = getTokenExpiration();
  if (!expiration) return true;

  const fiveMinutes = 5 * 60 * 1000;
  return expiration.getTime() - Date.now() < fiveMinutes;
};

/**
 * Clear all authentication data
 */
export const clearAuthData = () => {
  removeAuthToken();
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/**
 * Parse JWT token payload
 * @param {string} token - JWT token
 * @returns {object|null} The token payload or null if invalid
 */
export const parseToken = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (error) {
    return null;
  }
};

/**
 * Get user ID from token
 * @returns {string|null} The user ID or null if not found
 */
export const getUserId = () => {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id || payload.userId || null;
  } catch (error) {
    return null;
  }
};

/**
 * Initialize authentication from localStorage
 * @returns {object} Authentication state
 */
export const initializeAuth = () => {
  const token = getAuthToken();
  const userData = getUserData();

  return {
    isAuthenticated: isAuthenticated(),
    token,
    user: userData,
    role: getUserRole(),
    subscription: getSubscriptionType(),
    userId: getUserId(),
  };
};

export default {
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  getRefreshToken,
  setRefreshToken,
  getUserData,
  setUserData,
  isAuthenticated,
  getUserRole,
  isAdmin,
  getSubscriptionType,
  hasSubscription,
  getTokenExpiration,
  isTokenExpiringSoon,
  clearAuthData,
  parseToken,
  getUserId,
  initializeAuth,
};