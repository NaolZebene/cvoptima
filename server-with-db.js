// CVOptima Backend with Database
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cvoptima';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.log('❌ MongoDB error:', err.message));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'user' },
  subscription: { type: String, default: 'free' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// CV Schema
const cvSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  filename: String,
  score: Number,
  analysis: Object,
  uploadedAt: { type: Date, default: Date.now }
});

const CV = mongoose.model('CV', cvSchema);

// Health check
app.get('/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  // Count users and CVs
  const userCount = await User.countDocuments();
  const cvCount = await CV.countDocuments();
  
  res.json({
    status: 'healthy',
    message: 'CVOptima Backend with Database',
    database: dbStatus,
    stats: {
      users: userCount,
      cvs: cvCount
    },
    timestamp: new Date().toISOString()
  });
});

// API info
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'CVOptima API v1',
    endpoints: {
      auth: {
        login: 'POST /api/v1/auth/login',
        register: 'POST /api/v1/auth/register'
      },
      cv: {
        upload: 'POST /api/v1/cv/upload',
        list: 'GET /api/v1/cv'
      }
    }
  });
});

// Create admin user on startup
async function createAdminUser() {
  try {
    const adminExists = await User.findOne({ email: 'admin@cvoptima.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      const admin = new User({
        email: 'admin@cvoptima.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        subscription: 'premium'
      });
      await admin.save();
      console.log('👤 Admin user created: admin@cvoptima.com / Admin123!');
    }
  } catch (error) {
    console.log('⚠️ Could not create admin user:', error.message);
  }
}

// Auth: Register
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      name,
      role: 'user',
      subscription: 'free'
    });
    
    await user.save();
    
    res.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Auth: Login
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
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
      token: 'jwt-token-demo'
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// CV: Upload
app.post('/api/v1/cv/upload', async (req, res) => {
  try {
    const { filename, userId } = req.body;
    
    const cv = new CV({
      userId: userId || 'demo',
      filename: filename || 'cv.pdf',
      score: Math.floor(Math.random() * 30) + 70,
      analysis: {
        atsScore: Math.floor(Math.random() * 30) + 70,
        suggestions: ['Add more keywords', 'Improve formatting'],
        strengths: ['Good education section', 'Clear contact info']
      }
    });
    
    await cv.save();
    
    res.json({
      success: true,
      message: 'CV uploaded successfully',
      cv: {
        id: cv._id,
        filename: cv.filename,
        score: cv.score,
        uploadedAt: cv.uploadedAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'CV upload failed' });
  }
});

// CV: List
app.get('/api/v1/cv', async (req, res) => {
  try {
    const cvs = await CV.find().sort({ uploadedAt: -1 }).limit(10);
    
    res.json({
      success: true,
      cvs: cvs.map(cv => ({
        id: cv._id,
        filename: cv.filename,
        score: cv.score,
        uploadedAt: cv.uploadedAt
      })),
      count: cvs.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch CVs' });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 API: http://localhost:${PORT}/api/v1`);
  console.log(`💾 MongoDB: ${MONGODB_URI.includes('mongodb+srv') ? 'Atlas' : 'local'}`);
  
  // Create admin user
  await createAdminUser();
});