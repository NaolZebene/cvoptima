// CVOptima Proper Backend
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cvoptima';

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.log('❌ MongoDB error:', err.message));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'CVOptima Backend with MongoDB',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// API
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'CVOptima API v1',
    endpoints: {
      auth: '/api/v1/auth/login',
      cv: '/api/v1/cv/upload',
      admin: '/api/v1/admin/dashboard'
    }
  });
});

// Auth login
app.post('/api/v1/auth/login', (req, res) => {
  res.json({
    success: true,
    user: {
      email: 'admin@cvoptima.com',
      name: 'Admin User',
      role: 'admin'
    },
    token: 'jwt-token-demo'
  });
});

// CV upload
app.post('/api/v1/cv/upload', (req, res) => {
  res.json({
    success: true,
    score: 85,
    suggestions: ['Add keywords', 'Improve formatting']
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 API: http://localhost:${PORT}/api/v1`);
  console.log(`💾 MongoDB: ${MONGODB_URI.includes('mongodb+srv') ? 'Atlas' : 'local'}`);
});