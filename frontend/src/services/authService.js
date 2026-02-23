import axios from 'axios';
import { getAuthToken, removeAuthToken } from '../utils/auth';
import normalizeApiBase from './apiBase';

const API_URL = normalizeApiBase(process.env.REACT_APP_API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      removeAuthToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const authService = {
  // Register new user
  async register(email, password, name) {
    const [firstName = '', ...rest] = (name || '').trim().split(/\s+/);
    const lastName = rest.join(' ');

    const response = await api.post('/auth/register', {
      email,
      password,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    });
    return response;
  },

  // Login user
  async login(email, password) {
    const response = await api.post('/auth/login', {
      email,
      password,
    });
    return response;
  },

  // Logout user
  async logout() {
    const response = await api.post('/auth/logout');
    return response;
  },

  // Get current user
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response;
  },

  // Refresh token
  async refreshToken() {
    const response = await api.post('/auth/refresh');
    return response;
  },

  // Request password reset
  async requestPasswordReset(email) {
    const response = await api.post('/auth/forgot-password', { email });
    return response;
  },

  // Reset password with token
  async resetPassword(token, newPassword) {
    const response = await api.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return response;
  },

  // Update user profile
  async updateProfile(userData) {
    const response = await api.put('/auth/profile', userData);
    return response;
  },

  // Change password
  async changePassword(currentPassword, newPassword) {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response;
  },

  // Verify email
  async verifyEmail(token) {
    const response = await api.post('/auth/verify-email', { token });
    return response;
  },

  // Resend verification email
  async resendVerificationEmail() {
    const response = await api.post('/auth/resend-verification');
    return response;
  },

  // Get user statistics
  async getUserStats() {
    const response = await api.get('/auth/stats');
    return response;
  },

  // Get user activity
  async getUserActivity(limit = 10) {
    const response = await api.get('/auth/activity', {
      params: { limit },
    });
    return response;
  },

  // Delete account
  async deleteAccount(password) {
    const response = await api.delete('/auth/account', {
      data: { password },
    });
    return response;
  },
};

export default authService;
