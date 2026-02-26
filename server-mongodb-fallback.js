// CVOptima Backend with MongoDB fallback
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['https://cvoptima.vercel.app', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database setup
let User, CV;
let dbType = 'in-memory';

// Try to connect to MongoDB
async function setupDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI || MONGODB_URI.includes('localhost')) {
    console.log('⚠️ No MongoDB URI found, using in-memory database');
    setupInMemoryDatabase();
    return;
  }
  
  console.log(`🔧 Attempting MongoDB connection to: ${MONGODB_URI.substring(0, 50)}...`);
  
  try {
    const mongoose = await import('mongoose');
    
    await mongoose.default.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');
    dbType = 'mongodb';
    
    // User Schema
    const userSchema = new mongoose.default.Schema({
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, default: 'user', enum: ['user', 'admin'] },
      subscription: { type: String, default: 'free', enum: ['free', 'basic', 'premium', 'enterprise'] },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });
    
    // CV Schema
    const cvSchema = new mongoose.default.Schema({
      userId: { type: mongoose.default.Schema.Types.ObjectId, ref: 'User', required: true },
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      fileSize: { type: Number, required: true },
      fileType: { type: String, required: true },
      scores: {
        overall: { type: Number, min: 0, max: 100 },
        ats: { type: Number, min: 0, max: 100 },
        content: { type: Number, min: 0, max: 100 },
        formatting: { type: Number, min: 0, max: 100 },
        keywords: { type: Number, min: 0, max: 100 }
      },
      analysis: {
        strengths: [String],
        weaknesses: [String],
        suggestions: [String],
        keywords: [String],
        missingKeywords: [String]
      },
      jobDescription: String,
      industry: String,
      uploadedAt: { type: Date, default: Date.now },
      analyzedAt: { type: Date, default: Date.now }
    });
    
    User = mongoose.default.model('User', userSchema);
    CV = mongoose.default.model('CV', cvSchema);
    
    // Initialize admin user
    await initializeAdmin();
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('🔄 Falling back to in-memory database');
    setupInMemoryDatabase();
  }
}

// In-memory database
function setupInMemoryDatabase() {
  console.log('💾 Setting up in-memory database');
  
  // In-memory collections
  const users = [];
  const cvs = [];
  
  // Mock User model
  User = {
    findOne: async (query) => users.find(u => {
      if (query.email) return u.email === query.email;
      if (query._id) return u.id === query._id;
      return false;
    }),
    findById: async (id) => users.find(u => u.id === id),
    find: async (query) => {
      if (query.subscription && query.subscription.$ne === 'free') {
        return users.filter(u => u.subscription !== 'free');
      }
      return users;
    },
    countDocuments: async (query) => {
      if (query) {
        if (query.subscription && query.subscription.$ne === 'free') {
          return users.filter(u => u.subscription !== 'free').length;
        }
      }
      return users.length;
    },
    create: async (data) => {
      const user = { ...data, id: `user_${Date.now()}`, createdAt: new Date() };
      users.push(user);
      return user;
    },
    save: async function() {
      // For document.save() mock
      return this;
    }
  };
  
  // Mock CV model
  CV = {
    find: async (query) => {
      if (query.userId) {
        return cvs.filter(cv => cv.userId === query.userId);
      }
      return cvs;
    },
    countDocuments: async () => cvs.length,
    create: async (data) => {
      const cv = { ...data, id: `cv_${Date.now()}`, uploadedAt: new Date() };
      cvs.push(cv);
      return cv;
    },
    save: async function() {
      return this;
    }
  };
  
  // Initialize admin user
  initializeInMemoryAdmin();
}

// Initialize admin user for MongoDB
async function initializeAdmin() {
  try {
    const adminExists = await User.findOne({ email: 'admin@cvoptima.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      const adminUser = new User({
        email: 'admin@cvoptima.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        subscription: 'premium'
      });
      await adminUser.save();
      console.log('👤 MongoDB Admin user created: admin@cvoptima.com / Admin123!');
    } else {
      console.log('👤 MongoDB Admin user already exists');
    }
  } catch (error) {
    console.error('Failed to initialize MongoDB admin:', error);
  }
}

// Initialize admin user for in-memory
function initializeInMemoryAdmin() {
  const adminExists = User.findOne({ email: 'admin@cvoptima.com' });
  if (!adminExists) {
    const adminUser = {
      id: 'admin_001',
      email: 'admin@cvoptima.com',
      password: bcrypt.hashSync('Admin123!', 10),
      name: 'Admin User',
      role: 'admin',
      subscription: 'premium',
      createdAt: new Date()
    };
    User.create(adminUser);
    console.log('👤 In-memory Admin user created: admin@cvoptima.com / Admin123!');
  } else {
    console.log('👤 In-memory Admin user already exists');
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'CVOptima Backend',
    timestamp: new Date().toISOString(),
    database: dbType,
    version: '1.0.0'
  });
});

// API info
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'CVOptima API v1',
    database: dbType,
    endpoints: {
      health: '/health',
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

// Auth middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cvoptima-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Auth routes
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role: email === 'admin@cvoptima.com' ? 'admin' : 'user',
      subscription: 'free'
    });
    
    const token = jwt.sign(
      { userId: user.id || user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'cvoptima-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id || user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscription: user.subscription
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user.id || user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'cvoptima-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id || user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscription: user.subscription
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// User routes
app.get('/api/v1/users/me', authenticate, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id || req.user._id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      subscription: req.user.subscription
    }
  });
});

// CV routes
app.post('/api/v1/cv/upload', authenticate, async (req, res) => {
  try {
    const { filename, originalName, fileSize, fileType, jobDescription, industry } = req.body;
    
    const scores = {
      overall: Math.floor(Math.random() * 30) + 70,
      ats: Math.floor(Math.random() * 30) + 70,
      content: Math.floor(Math.random() * 25) + 75,
      formatting: Math.floor(Math.random() * 25) + 75,
      keywords: Math.floor(Math.random() * 30) + 70
    };
    
    const analysis = {
      strengths: ['Strong education', 'Relevant experience', 'Good skills'],
      weaknesses: ['Add achievements', 'Improve summary'],
      suggestions: ['Add keywords', 'Include metrics'],
      keywords: ['JavaScript', 'React', 'Node.js'],
      missingKeywords: ['TypeScript', 'AWS']
    };
    
    const cv = await CV.create({
      userId: req.user.id || req.user._id,
      filename,
      originalName,
      fileSize,
      fileType,
      scores,
      analysis,
      jobDescription: jobDescription || 'Software Engineer',
      industry: industry || 'Technology'
    });
    
    res.json({
      success: true,
      message: 'CV uploaded successfully',
      cv: {
        id: cv.id || cv._id,
        filename: cv.filename,
        scores: cv.scores,
        analysis: cv.analysis,
        uploadedAt: cv.uploadedAt
      }
    });
  } catch (error) {
    console.error('CV upload error:', error);
    res.status(500).json({ error: 'CV upload failed' });
  }
});

app.get('/api/v1/cv', authenticate, async (req, res) => {
  try {
    const cvs = await CV.find({ userId: req.user.id || req.user._id });
    
    res.json({
      success: true,
      cvs: cvs.map(cv => ({
        id: cv.id || cv._id,
        filename: cv.filename,
        scores: cv.scores,
        uploadedAt: cv.uploadedAt
      })),
      count: cvs.length
    });
  } catch (error) {
    console.error('CV list error:', error);
    res.status(500).json({ error: 'Failed to fetch CVs' });
  }
});

// Start server
const PORT = process.env.PORT || 3002;

// Setup database first, then start server
setupDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 CVOptima Backend running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API: http://localhost:${PORT}/api/v1`);
    console.log(`💾 Database: ${dbType}`);
    console.log(`👤 Admin: admin@cvoptima.com / Admin123!`);
  });
}).catch(error => {
  console.error('Failed to setup database:', error);
  process.exit(1);
});