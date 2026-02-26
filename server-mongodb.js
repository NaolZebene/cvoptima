// CVOptima Backend with MongoDB
const express = require('express');
const mongoose = require('mongoose');
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

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cvoptima';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err.message));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'user', enum: ['user', 'admin'] },
  subscription: { type: String, default: 'free', enum: ['free', 'basic', 'premium', 'enterprise'] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// CV Schema
const cvSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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

const CV = mongoose.model('CV', cvSchema);

// Health check
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'healthy',
    message: 'CVOptima Backend with MongoDB',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    version: '1.0.0'
  });
});

// API info
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'CVOptima API v1',
    endpoints: {
      health: '/health',
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        me: 'GET /api/v1/users/me'
      },
      cv: {
        upload: 'POST /api/v1/cv/upload',
        list: 'GET /api/v1/cv',
        get: 'GET /api/v1/cv/:id',
        delete: 'DELETE /api/v1/cv/:id'
      },
      admin: {
        dashboard: 'GET /api/v1/admin/dashboard',
        users: 'GET /api/v1/admin/users'
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

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Auth routes
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      role: email === 'admin@cvoptima.com' ? 'admin' : 'user',
      subscription: 'free'
    });
    
    await user.save();
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'cvoptima-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscription: user.subscription,
        createdAt: user.createdAt
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
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'cvoptima-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
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
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      subscription: req.user.subscription,
      createdAt: req.user.createdAt
    }
  });
});

// CV routes
app.post('/api/v1/cv/upload', authenticate, async (req, res) => {
  try {
    const { filename, originalName, fileSize, fileType, jobDescription, industry } = req.body;
    
    // Mock analysis (in production, this would be real ATS analysis)
    const scores = {
      overall: Math.floor(Math.random() * 30) + 70,
      ats: Math.floor(Math.random() * 30) + 70,
      content: Math.floor(Math.random() * 25) + 75,
      formatting: Math.floor(Math.random() * 25) + 75,
      keywords: Math.floor(Math.random() * 30) + 70
    };
    
    const analysis = {
      strengths: [
        'Strong educational background',
        'Relevant work experience',
        'Good technical skills'
      ],
      weaknesses: [
        'Could add more quantifiable achievements',
        'Consider adding a summary section'
      ],
      suggestions: [
        'Add more industry-specific keywords',
        'Include metrics to quantify achievements',
        'Tailor to specific job description'
      ],
      keywords: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
      missingKeywords: ['TypeScript', 'AWS', 'Docker']
    };
    
    const cv = new CV({
      userId: req.user._id,
      filename,
      originalName,
      fileSize,
      fileType,
      scores,
      analysis,
      jobDescription: jobDescription || 'Software Engineer',
      industry: industry || 'Technology'
    });
    
    await cv.save();
    
    res.json({
      success: true,
      message: 'CV uploaded and analyzed successfully',
      cv: {
        id: cv._id,
        filename: cv.filename,
        scores: cv.scores,
        analysis: cv.analysis,
        uploadedAt: cv.uploadedAt,
        analyzedAt: cv.analyzedAt
      }
    });
  } catch (error) {
    console.error('CV upload error:', error);
    res.status(500).json({ error: 'CV upload failed' });
  }
});

app.get('/api/v1/cv', authenticate, async (req, res) => {
  try {
    const cvs = await CV.find({ userId: req.user._id }).sort({ uploadedAt: -1 });
    
    const stats = {
      averageScore: cvs.length > 0 
        ? cvs.reduce((sum, cv) => sum + cv.scores.overall, 0) / cvs.length 
        : 0,
      bestScore: cvs.length > 0
        ? Math.max(...cvs.map(cv => cv.scores.overall))
        : 0,
      totalCVs: cvs.length
    };
    
    res.json({
      success: true,
      cvs: cvs.map(cv => ({
        id: cv._id,
        filename: cv.filename,
        originalName: cv.originalName,
        scores: cv.scores,
        uploadedAt: cv.uploadedAt,
        analyzedAt: cv.analyzedAt
      })),
      stats
    });
  } catch (error) {
    console.error('CV list error:', error);
    res.status(500).json({ error: 'Failed to fetch CVs' });
  }
});

// Admin routes
app.get('/api/v1/admin/dashboard', authenticate, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCVs = await CV.countDocuments();
    const activeUsers = await User.countDocuments({ subscription: { $ne: 'free' } });
    
    const recentCVs = await CV.find()
      .sort({ uploadedAt: -1 })
      .limit(5)
      .populate('userId', 'email name');
    
    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 7 }
    ]);
    
    res.json({
      success: true,
      dashboard: {
        totalUsers,
        totalCVs,
        activeUsers,
        recentCVs: recentCVs.map(cv => ({
          id: cv._id,
          filename: cv.filename,
          score: cv.scores.overall,
          uploadedAt: cv.uploadedAt,
          user: cv.userId ? cv.userId.email : 'Unknown'
        })),
        userGrowth
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Initialize admin user
const initializeAdmin = async () => {
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
      console.log('👤 Admin user created: admin@cvoptima.com / Admin123!');
    } else {
      console.log('👤 Admin user already exists');
    }
  } catch (error) {
    console.error('Failed to initialize admin:', error);
  }
};

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, async () => {
  console.log(`🚀 CVOptima Backend with MongoDB running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API: http://localhost:${PORT}/api/v1`);
  
  await initializeAdmin();
  
  console.log('\n✅ Features ready:');
  console.log('  - MongoDB database');
  console.log('  - User authentication (bcrypt + JWT)');
  console.log('  - CV upload and analysis');
  console.log('  - Admin dashboard');
  console.log('  - Ready for frontend integration');
});