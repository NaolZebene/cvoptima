const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://cvoptima.vercel.app',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'CVOptima Minimal Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API base endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'CVOptima API v1',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      cv: '/api/v1/cv',
      users: '/api/v1/users'
    }
  });
});

// Mock endpoints for frontend
app.post('/api/v1/auth/register', (req, res) => {
  res.json({
    success: true,
    message: 'User registered successfully (mock)',
    user: {
      id: 'mock-user-123',
      email: req.body.email || 'user@example.com',
      name: req.body.name || 'Test User'
    },
    token: 'mock-jwt-token-123456'
  });
});

app.post('/api/v1/auth/login', (req, res) => {
  res.json({
    success: true,
    message: 'Login successful (mock)',
    user: {
      id: 'mock-user-123',
      email: 'admin@cvoptima.com',
      name: 'Admin User',
      role: 'admin'
    },
    token: 'mock-jwt-token-123456'
  });
});

app.get('/api/v1/users/me', (req, res) => {
  res.json({
    success: true,
    user: {
      id: 'mock-user-123',
      email: 'admin@cvoptima.com',
      name: 'Admin User',
      role: 'admin',
      subscription: 'premium'
    }
  });
});

// Simple MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cvoptima';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Continue without MongoDB for now
  }
};

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, async () => {
  console.log(`🚀 Minimal Backend Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API: http://localhost:${PORT}/api/v1`);
  
  // Try to connect to MongoDB (optional)
  await connectDB();
});