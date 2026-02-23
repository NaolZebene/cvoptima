/**
 * Authentication controller
 * Handles user registration, login, and authentication
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createError, ValidationError } = require('../middleware/error-handlers');
const { getConfig } = require('../config/env');

/**
 * Generate JWT token for user
 * @param {Object} user - User document
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  const config = getConfig();
  
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      subscription: user.subscription.type
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
      issuer: 'cvoptima-api',
      audience: 'cvoptima-users'
    }
  );
};

/**
 * Register new user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }
    
    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Please provide a valid email address');
    }
    
    // Validate password length
    if (password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }
    
    // Check if user already exists (case-insensitive)
    const existingUser = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });
    
    if (existingUser) {
      throw createError('Email already exists', 400, 'ConflictError');
    }
    
    // Create new user
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      firstName: firstName?.trim(),
      lastName: lastName?.trim()
    });
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Prepare response
    const userResponse = user.toJSON();
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse,
      token,
      tokenExpiresIn: getConfig().jwtExpiresIn
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }
    
    // Find user by email (case-insensitive, include password)
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    }).select('+password');
    
    // Check if user exists
    if (!user) {
      throw createError('Invalid credentials', 401, 'AuthenticationError');
    }
    
    // Check if user is active
    if (!user.isActive) {
      throw createError('Account is deactivated', 403, 'AuthorizationError');
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw createError('Invalid credentials', 401, 'AuthenticationError');
    }
    
    // Update last login
    await user.updateLastLogin();
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Prepare response
    const userResponse = user.toJSON();
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token,
      tokenExpiresIn: getConfig().jwtExpiresIn
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getProfile = async (req, res, next) => {
  try {
    // User is attached to request by auth middleware
    const user = await User.findById(req.user.id);
    
    if (!user) {
      throw createError('User not found', 404, 'NotFoundError');
    }
    
    res.status(200).json({
      success: true,
      user: user.toJSON()
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, preferences } = req.body;
    const userId = req.user.id;
    
    // Build update object
    const updateData = {};
    
    if (firstName !== undefined) {
      updateData.firstName = firstName.trim();
    }
    
    if (lastName !== undefined) {
      updateData.lastName = lastName.trim();
    }
    
    if (preferences !== undefined) {
      updateData.preferences = preferences;
    }
    
    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!user) {
      throw createError('User not found', 404, 'NotFoundError');
    }
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current password and new password are required');
    }
    
    // Validate new password length
    if (newPassword.length < 6) {
      throw new ValidationError('New password must be at least 6 characters');
    }
    
    // Find user with password
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      throw createError('User not found', 404, 'NotFoundError');
    }
    
    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw createError('Current password is incorrect', 401, 'AuthenticationError');
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user (client-side token invalidation)
 * POST /api/auth/logout
 */
const logout = (req, res) => {
  // Note: JWT tokens are stateless, so logout is handled client-side
  // by removing the token from storage
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

/**
 * Verify JWT token
 * GET /api/auth/verify
 */
const verifyToken = (req, res) => {
  // If we reach here, the token is valid (protected by auth middleware)
  res.status(200).json({
    success: true,
    message: 'Token is valid',
    user: req.user
  });
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  verifyToken,
  generateToken
};