const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://cvoptima.vercel.app',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple in-memory database (for demo)
const users = [];
const cvs = [];

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'CVOptima Light Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API info
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'CVOptima API v1 (Light Version)',
    endpoints: {
      health: '/health',
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login'
      },
      cv: {
        upload: 'POST /api/v1/cv/upload',
        list: 'GET /api/v1/cv'
      }
    }
  });
});

// Auth routes
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user exists
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = {
      id: `user_${Date.now()}`,
      email,
      name,
      password: hashedPassword,
      role: 'user',
      subscription: 'free',
      createdAt: new Date()
    };
    
    users.push(user);
    
    // Create token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscription: user.subscription
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscription: user.subscription
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// CV routes
app.post('/api/v1/cv/upload', (req, res) => {
  // Mock CV upload
  const cv = {
    id: `cv_${Date.now()}`,
    userId: req.body.userId || 'demo_user',
    filename: req.body.filename || 'cv.pdf',
    score: Math.floor(Math.random() * 30) + 70, // 70-100
    analysis: {
      atsScore: Math.floor(Math.random() * 30) + 70,
      suggestions: ['Add more keywords', 'Improve formatting'],
      strengths: ['Good education section', 'Clear contact info']
    },
    uploadedAt: new Date()
  };
  
  cvs.push(cv);
  
  res.json({
    success: true,
    message: 'CV uploaded successfully',
    cv
  });
});

app.get('/api/v1/cv', (req, res) => {
  const userCvs = cvs.filter(cv => cv.userId === (req.query.userId || 'demo_user'));
  
  res.json({
    success: true,
    cvs: userCvs,
    count: userCvs.length
  });
});

// Connect to MongoDB if available
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (mongoURI && mongoURI !== 'mongodb://localhost:27017/cvoptima') {
      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ MongoDB connected successfully');
    } else {
      console.log('⚠️ Using in-memory database (no MongoDB)');
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️ Using in-memory database instead');
  }
};

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, async () => {
  console.log(`🚀 CVOptima Light Backend running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API: http://localhost:${PORT}/api/v1`);
  
  await connectDB();
  
  // Create demo admin user
  const demoUser = {
    id: 'admin_123',
    email: 'admin@cvoptima.com',
    name: 'Admin User',
    password: await bcrypt.hash('Admin123!', 10),
    role: 'admin',
    subscription: 'premium',
    createdAt: new Date()
  };
  users.push(demoUser);
  console.log('👤 Demo admin created: admin@cvoptima.com / Admin123!');
});