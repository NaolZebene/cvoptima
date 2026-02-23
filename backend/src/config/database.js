/**
 * Database connection configuration
 * MongoDB connection with Mongoose
 */

const mongoose = require('mongoose');
const { getConfig } = require('./env');

/**
 * Get MongoDB connection URI
 * @returns {string} Connection URI
 */
const getConnectionUri = () => {
  const config = getConfig();
  return config.mongodbUri;
};

/**
 * Connect to MongoDB database
 * @returns {Promise<mongoose.Connection>} Mongoose connection
 */
const connectToDatabase = async () => {
  const uri = getConnectionUri();
  
  try {
    const connection = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log(`✅ MongoDB connected: ${connection.connection.host}`);
    
    // Set up connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    mongoose.connection.once('open', () => {
      console.log('MongoDB connection opened');
    });
    
    return connection;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
};

/**
 * Close MongoDB connection
 * @returns {Promise<void>}
 */
const closeDatabaseConnection = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

/**
 * Check if database is connected
 * @returns {boolean} Connection status
 */
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get database connection stats
 * @returns {Object} Connection statistics
 */
const getConnectionStats = () => {
  if (!isConnected()) {
    return { connected: false };
  }
  
  return {
    connected: true,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
    readyState: mongoose.connection.readyState,
    models: Object.keys(mongoose.connection.models),
  };
};

module.exports = {
  connectToDatabase,
  closeDatabaseConnection,
  isConnected,
  getConnectionStats,
  getConnectionUri,
  mongoose, // Export mongoose for model definitions
};