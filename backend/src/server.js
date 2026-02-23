/**
 * Express server setup with basic routing
 * Main application server file
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { getConfig, isProduction, validateEnvVars } = require('./config/env');
const { connectToDatabase } = require('./config/database');

// Create Express application
const app = express();
const config = getConfig();

// Validate environment variables on startup
try {
  validateEnvVars();
} catch (error) {
  console.error('Environment validation failed:', error.message);
  process.exit(1);
}

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: isProduction() 
    ? [config.frontendUrl, config.appUrl]
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:5173', 'http://localhost:8080'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
const { setupLogging, setupApiLogging } = require('./middleware/logging');
setupLogging(app);
setupApiLogging(app);

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'cvoptima-backend',
    version: '1.0.0'
  });
});

// API version route
app.get('/api/v1', (req, res) => {
  const voiceEndpoint = config.enableVoice ? '/api/v1/voice' : 'disabled';

  res.status(200).json({
    message: 'CVOptima API v1',
    endpoints: {
      auth: '/api/v1/auth',
      cv: '/api/v1/cv',
      payment: '/api/v1/payment',
      voice: voiceEndpoint
    },
    documentation: '/api/v1/docs'
  });
});

// Import routes
const authRoutes = require('./routes/auth.routes');
const cvRoutes = require('./routes/cv.routes');
const extractionRoutes = require('./routes/extraction.routes');
const atsRoutes = require('./routes/ats.routes');
const scoreHistoryRoutes = require('./routes/score-history.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const voiceRoutes = require('./routes/voice.routes');
const adminRoutes = require('./routes/admin.routes');
const stripeRoutes = require('./routes/stripe.routes');

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/cv', cvRoutes);
app.use('/api/v1/extract', extractionRoutes);
app.use('/api/v1/ats', atsRoutes);
app.use('/api/v1/scores', scoreHistoryRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/stripe', stripeRoutes);
if (config.enableVoice) {
  app.use('/api/v1/voice', voiceRoutes);
}
app.use('/api/v1/admin', adminRoutes);

// Backward-compatible auth alias for older frontend configs
app.use('/auth', authRoutes);

// Test route for development
if (!isProduction()) {
  app.get('/api/test', (req, res) => {
    res.status(200).json({ 
      message: 'Test route working',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString()
    });
  });
}

// Setup error handlers
const { setupErrorHandlers } = require('./middleware/error-handlers');
setupErrorHandlers(app);

/**
 * Start the server
 * @param {number} port - Port to listen on
 * @returns {Promise<http.Server>} HTTP server instance
 */
const startServer = async (port = config.port) => {
  try {
    // Connect to database
    await connectToDatabase();
    
    // Start listening
    const server = app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🌐 Health check: http://localhost:${port}/health`);
      console.log(`🔗 API: http://localhost:${port}/api/v1`);
    });
    
    // Graceful shutdown handler
    const shutdown = async () => {
      console.log('Shutting down server...');
      
      server.close(async () => {
        console.log('HTTP server closed');
        
        // Close database connection
        const { closeDatabaseConnection } = require('./config/database');
        await closeDatabaseConnection();
        
        console.log('Server shutdown complete');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Export app for testing
module.exports = app;

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}
