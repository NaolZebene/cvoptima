// SIMPLE CVOptima Backend - No database dependencies
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: ['https://cvoptima.vercel.app', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Health check - FIRST endpoint
app.get('/health', (req, res) => {
  console.log('✅ Health check received');
  res.json({
    status: 'healthy',
    message: 'CVOptima Simple Backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'in-memory'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CVOptima API',
    endpoints: {
      health: '/health',
      api: '/api/v1'
    }
  });
});

// API v1
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'CVOptima API v1',
    endpoints: {
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        me: 'GET /api/v1/users/me'
      },
      cv: {
        upload: 'POST /api/v1/cv/upload',
        list: 'GET /api/v1/cv'
      }
    }
  });
});

// In-memory storage
const users = [
  {
    id: 'admin_001',
    email: 'admin@cvoptima.com',
    name: 'Admin User',
    password: 'Admin123!', // Plain text for demo
    role: 'admin',
    subscription: 'premium',
    createdAt: new Date()
  }
];

const cvs = [];

// Auth routes
app.post('/api/v1/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  const user = {
    id: `user_${Date.now()}`,
    email,
    name,
    password, // In production, hash this!
    role: 'user',
    subscription: 'free',
    createdAt: new Date()
  };
  
  users.push(user);
  
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
    token: `token_${Date.now()}`
  });
});

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  if (user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
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
    token: `token_${Date.now()}`
  });
});

// User routes
app.get('/api/v1/users/me', (req, res) => {
  // Mock authentication - in production, check JWT token
  const user = users.find(u => u.email === 'admin@cvoptima.com');
  
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      subscription: user.subscription
    }
  });
});

// CV routes
app.post('/api/v1/cv/upload', (req, res) => {
  const cv = {
    id: `cv_${Date.now()}`,
    userId: req.body.userId || 'demo_user',
    filename: req.body.filename || 'cv.pdf',
    score: Math.floor(Math.random() * 30) + 70,
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

// Start server
const PORT = process.env.PORT || 3002;

// Start server IMMEDIATELY
const server = app.listen(PORT, '0.0.0.0', () => {
  const address = server.address();
  console.log('🚀 CVOptima Simple Backend started successfully!');
  console.log(`📡 Server: http://${address.address}:${address.port}`);
  console.log(`🌐 Health: http://${address.address}:${address.port}/health`);
  console.log(`🔗 API: http://${address.address}:${address.port}/api/v1`);
  console.log(`👤 Admin: admin@cvoptima.com / Admin123!`);
  console.log(`💾 Database: in-memory (no dependencies)`);
});

// Error handling
server.on('error', (error) => {
  console.error('❌ Server error:', error.message);
  process.exit(1);
});

console.log('Starting CVOptima Simple Backend...');