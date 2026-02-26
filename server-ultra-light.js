const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: ['https://cvoptima.vercel.app', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// In-memory database
const users = [
  {
    id: 'admin_123',
    email: 'admin@cvoptima.com',
    name: 'Admin User',
    password: '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq5gJ6X.7Q8.6.6q.6.6q.6.6q', // Admin123!
    role: 'admin',
    subscription: 'premium'
  }
];
const cvs = [];

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'CVOptima Ultra Light Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API info
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'CVOptima API v1 (Ultra Light)',
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
app.post('/api/v1/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  // Check if user exists
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  // Create user (mock password hash)
  const user = {
    id: `user_${Date.now()}`,
    email,
    name,
    password: `hashed_${password}`, // Mock hash
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
    token: 'mock-jwt-token-' + Date.now()
  });
});

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Find user
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Mock password check
  if (password !== 'Admin123!' && email === 'admin@cvoptima.com') {
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
    token: 'mock-jwt-token-' + Date.now()
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

// Get current user
app.get('/api/v1/users/me', (req, res) => {
  res.json({
    success: true,
    user: {
      id: 'admin_123',
      email: 'admin@cvoptima.com',
      name: 'Admin User',
      role: 'admin',
      subscription: 'premium'
    }
  });
});

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 CVOptima Ultra Light Backend running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API: http://localhost:${PORT}/api/v1`);
  console.log(`👤 Demo admin: admin@cvoptima.com / Admin123!`);
});