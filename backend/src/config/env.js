/**
 * Environment configuration module
 * Loads and validates environment variables
 */

const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

/**
 * Validate that all required environment variables are present
 * @throws {Error} If any required variable is missing
 */
const validateEnvVars = () => {
  const required = [
    'JWT_SECRET',
    'MONGODB_URI'
  ];
  
  const missing = required.filter(variable => !process.env[variable]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

/**
 * Get configuration object with all environment variables
 * @returns {Object} Configuration object
 */
const getConfig = () => ({
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  mongodbUri: process.env.MONGODB_URI,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Authentication
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  
  // Whisper/OpenAI API
  whisperApiKey: process.env.OPENAI_API_KEY || process.env.WHISPER_API_KEY,
  
  // LinkedIn
  linkedinClientId: process.env.LINKEDIN_CLIENT_ID,
  linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  
  // Email
  emailHost: process.env.EMAIL_HOST || 'smtp.gmail.com',
  emailPort: process.env.EMAIL_PORT || 587,
  emailUser: process.env.EMAIL_USER,
  emailPassword: process.env.EMAIL_PASSWORD,
  
  // Application
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  
  // Feature flags
  enableVoice: process.env.ENABLE_VOICE !== 'false',
  enableStripe: process.env.ENABLE_STRIPE !== 'false',
});

/**
 * Check if running in production environment
 * @returns {boolean}
 */
const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Check if running in development environment
 * @returns {boolean}
 */
const isDevelopment = () => process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

/**
 * Check if running in test environment
 * @returns {boolean}
 */
const isTest = () => process.env.NODE_ENV === 'test';

module.exports = {
  validateEnvVars,
  getConfig,
  isProduction,
  isDevelopment,
  isTest
};
