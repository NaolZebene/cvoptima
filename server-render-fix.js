const express = require('express');
const cors = require('cors');

const app = express();

// CRITICAL: Bind to ALL interfaces (0.0.0.0) not just localhost
const HOST = '0.0.0.0'; // Render.com needs this
const PORT = process.env.PORT || 3002;

// 1. Health check at ROOT path (Render might check / not /health)
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'CVOptima Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    host: HOST,
    port: PORT
  });
});

// 2. Also health check at /health (for good measure)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'CVOptima Backend health check',
    timestamp: new Date().toISOString()
  });
});

// 3. Simple ping endpoint
app.get('/ping', (req, res) => {
  res.json({ pong: Date.now() });
});

// 4. Then other middleware
app.use(cors({
  origin: ['https://cvoptima.vercel.app', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. API info
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'CVOptima API v1',
    endpoints: {
      root: '/',
      health: '/health',
      ping: '/ping',
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

// Simple in-memory storage
const users = [
  {
    id: 'admin_123',
    email: 'admin@cvoptima.com',
    name: 'Admin User',
    password: 'Admin123!',
    role: 'admin',
    subscription: 'premium'
  }
];

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
    password,
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

// CV routes
const cvs = [];
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

// 6. Start server with explicit host binding
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 CVOptima Backend running on ${HOST}:${PORT}`);
  console.log(`🌐 Root: http://${HOST}:${PORT}/`);
  console.log(`🌐 Health: http://${HOST}:${PORT}/health`);
  console.log(`🌐 Ping: http://${HOST}:${PORT}/ping`);
  console.log(`🔗 API: http://${HOST}:${PORT}/api/v1`);
  console.log(`👤 Demo admin: admin@cvoptima.com / Admin123!`);
  
  // Log network info
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  console.log('\n📡 Network interfaces:');
  Object.keys(networkInterfaces).forEach(iface => {
    networkInterfaces[iface].forEach(addr => {
      if (addr.family === 'IPv4' && !addr.internal) {
        console.log(`  ${iface}: ${addr.address}`);
      }
    });
  });
});

// Handle errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
});

// Handle shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Log startup
console.log('Starting CVOptima Backend for Render.com...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${PORT}`);
console.log(`Host: ${HOST}`);