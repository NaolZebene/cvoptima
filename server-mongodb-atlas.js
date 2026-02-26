// CVOptima Backend with MongoDB Atlas
const http = require('http');
const { parse } = require('url');
const { StringDecoder } = require('string_decoder');

const PORT = process.env.PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI;

console.log('🚀 Starting CVOptima Backend with MongoDB Atlas...');
console.log(`🔧 PORT: ${PORT}`);
console.log(`🔧 MongoDB URI: ${MONGODB_URI ? 'Provided' : 'Not provided (using in-memory)'}`);

// In-memory database (fallback)
let users = [
  {
    id: 'admin_001',
    email: 'admin@cvoptima.com',
    name: 'Admin User',
    password: 'Admin123!',
    role: 'admin',
    subscription: 'premium',
    createdAt: new Date().toISOString()
  }
];

let cvs = [];
let useMongoDB = false;

// Try to connect to MongoDB if URI is provided
async function connectToMongoDB() {
  if (!MONGODB_URI) {
    console.log('⚠️ No MongoDB URI provided, using in-memory database');
    return;
  }
  
  try {
    console.log('🔧 Attempting MongoDB Atlas connection...');
    
    // Dynamic import to avoid dependency if not needed
    const mongoose = await import('mongoose');
    
    await mongoose.default.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB Atlas connected successfully');
    useMongoDB = true;
    
    // Define schemas
    const userSchema = new mongoose.default.Schema({
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, default: 'user', enum: ['user', 'admin'] },
      subscription: { type: String, default: 'free', enum: ['free', 'basic', 'premium', 'enterprise'] },
      createdAt: { type: Date, default: Date.now }
    });
    
    const cvSchema = new mongoose.default.Schema({
      userId: { type: String, required: true },
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
      uploadedAt: { type: Date, default: Date.now }
    });
    
    // Create models
    const User = mongoose.default.model('User', userSchema);
    const CV = mongoose.default.model('CV', cvSchema);
    
    // Replace in-memory functions with MongoDB functions
    users = {
      find: async (query) => User.find(query),
      findOne: async (query) => User.findOne(query),
      create: async (data) => {
        const user = new User(data);
        return user.save();
      },
      countDocuments: async (query) => User.countDocuments(query)
    };
    
    cvs = {
      find: async (query) => CV.find(query),
      create: async (data) => {
        const cv = new CV(data);
        return cv.save();
      },
      countDocuments: async () => CV.countDocuments()
    };
    
    // Create admin user if doesn't exist
    const adminExists = await User.findOne({ email: 'admin@cvoptima.com' });
    if (!adminExists) {
      const adminUser = new User({
        email: 'admin@cvoptima.com',
        password: 'Admin123!',
        name: 'Admin User',
        role: 'admin',
        subscription: 'premium'
      });
      await adminUser.save();
      console.log('👤 MongoDB Admin user created: admin@cvoptima.com / Admin123!');
    }
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('🔄 Falling back to in-memory database');
    useMongoDB = false;
  }
}

// Helper functions
function parseBody(req) {
  return new Promise((resolve) => {
    const decoder = new StringDecoder('utf-8');
    let buffer = '';
    req.on('data', (data) => {
      buffer += decoder.write(data);
    });
    req.on('end', () => {
      buffer += decoder.end();
      try {
        resolve(JSON.parse(buffer));
      } catch {
        resolve({});
      }
    });
  });
}

function jsonResponse(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.writeHead(statusCode);
  res.end(JSON.stringify(data));
}

// Create server
const server = http.createServer(async (req, res) => {
  const parsedUrl = parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;
  
  console.log(`📥 ${method} ${path}`);
  
  // Handle OPTIONS preflight
  if (method === 'OPTIONS') {
    jsonResponse(res, 200, {});
    return;
  }
  
  // Health check
  if (path === '/health' || path === '/') {
    jsonResponse(res, 200, {
      status: 'healthy',
      message: 'CVOptima Backend',
      timestamp: new Date().toISOString(),
      version: '3.0.0',
      database: useMongoDB ? 'mongodb-atlas' : 'in-memory',
      features: ['auth', 'cv-upload', 'ats-analysis', 'admin-dashboard']
    });
    return;
  }
  
  // API v1
  if (path === '/api/v1') {
    jsonResponse(res, 200, {
      message: 'CVOptima API v1',
      database: useMongoDB ? 'mongodb-atlas' : 'in-memory',
      endpoints: {
        auth: {
          register: 'POST /api/v1/auth/register',
          login: 'POST /api/v1/auth/login',
          me: 'GET /api/v1/users/me'
        },
        cv: {
          upload: 'POST /api/v1/cv/upload',
          list: 'GET /api/v1/cv'
        },
        admin: {
          dashboard: 'GET /api/v1/admin/dashboard'
        }
      }
    });
    return;
  }
  
  // Auth: Register
  if (path === '/api/v1/auth/register' && method === 'POST') {
    const body = await parseBody(req);
    const { email, password, name } = body;
    
    if (!email || !password || !name) {
      jsonResponse(res, 400, { error: 'All fields are required' });
      return;
    }
    
    try {
      const existingUser = await users.findOne({ email });
      if (existingUser) {
        jsonResponse(res, 400, { error: 'User already exists' });
        return;
      }
      
      const user = await users.create({
        email,
        password, // In production, hash this!
        name,
        role: email === 'admin@cvoptima.com' ? 'admin' : 'user',
        subscription: 'free'
      });
      
      jsonResponse(res, 200, {
        success: true,
        message: 'User registered successfully',
        user: {
          id: user._id || user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscription: user.subscription
        },
        token: `token_${Date.now()}`
      });
    } catch (error) {
      console.error('Registration error:', error);
      jsonResponse(res, 500, { error: 'Registration failed' });
    }
    return;
  }
  
  // Auth: Login
  if (path === '/api/v1/auth/login' && method === 'POST') {
    const body = await parseBody(req);
    const { email, password } = body;
    
    try {
      const user = await users.findOne({ email });
      if (!user || user.password !== password) {
        jsonResponse(res, 401, { error: 'Invalid credentials' });
        return;
      }
      
      jsonResponse(res, 200, {
        success: true,
        message: 'Login successful',
        user: {
          id: user._id || user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscription: user.subscription
        },
        token: `token_${Date.now()}`
      });
    } catch (error) {
      console.error('Login error:', error);
      jsonResponse(res, 500, { error: 'Login failed' });
    }
    return;
  }
  
  // CV: Upload
  if (path === '/api/v1/cv/upload' && method === 'POST') {
    const body = await parseBody(req);
    const { filename, originalName, fileSize, fileType, jobDescription, industry } = body;
    
    try {
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
      
      const cv = await cvs.create({
        userId: 'admin_001',
        filename: filename || 'cv.pdf',
        originalName: originalName || 'My CV.pdf',
        fileSize: fileSize || 1024,
        fileType: fileType || 'application/pdf',
        scores,
        analysis,
        jobDescription: jobDescription || 'Software Engineer',
        industry: industry || 'Technology'
      });
      
      jsonResponse(res, 200, {
        success: true,
        message: 'CV uploaded successfully',
        cv: {
          id: cv._id || cv.id,
          filename: cv.filename,
          scores: cv.scores,
          analysis: cv.analysis,
          uploadedAt: cv.uploadedAt
        }
      });
    } catch (error) {
      console.error('CV upload error:', error);
      jsonResponse(res, 500, { error: 'CV upload failed' });
    }
    return;
  }
  
  // CV: List
  if (path === '/api/v1/cv' && method === 'GET') {
    try {
      const userCvs = await cvs.find({ userId: 'admin_001' });
      
      jsonResponse(res, 200, {
        success: true,
        cvs: userCvs.map(cv => ({
          id: cv._id || cv.id,
          filename: cv.filename,
          scores: cv.scores,
          uploadedAt: cv.uploadedAt
        })),
        count: userCvs.length
      });
    } catch (error) {
      console.error('CV list error:', error);
      jsonResponse(res, 500, { error: 'Failed to fetch CVs' });
    }
    return;
  }
  
  // Admin: Dashboard
  if (path === '/api/v1/admin/dashboard' && method === 'GET') {
    try {
      const totalUsers = await users.countDocuments({});
      const totalCVs = await cvs.countDocuments();
      const activeUsers = await users.countDocuments({ subscription: { $ne: 'free' } });
      
      const recentCVs = (await cvs.find({}).sort({ uploadedAt: -1 }).limit(5)).map(cv => ({
        id: cv._id || cv.id,
        filename: cv.filename,
        score: cv.scores.overall,
        uploadedAt: cv.uploadedAt
      }));
      
      jsonResponse(res, 200, {
        success: true,
        dashboard: {
          totalUsers,
          totalCVs,
          activeUsers,
          recentCVs
        }
      });
    } catch (error) {
      console.error('Admin dashboard error:', error);
      jsonResponse(res, 500, { error: 'Failed to load dashboard' });
    }
    return;
  }
  
  // Not found
  jsonResponse(res, 404, {
    error: 'Endpoint not found',
    path,
    method
  });
});

// Start server after attempting MongoDB connection
async function startServer() {
  await connectToMongoDB();
  
  server.listen(PORT, '0.0.0.0', () => {
    const address = server.address();
    console.log('✅ CVOptima Backend started successfully!');
    console.log(`📡 Server: http://${address.address}:${address.port}`);
    console.log(`🌐 Health: http://${address.address}:${address.port}/health`);
    console.log(`🔗 API: http://${address.address}:${address.port}/api/v1`);
    console.log(`💾 Database: ${useMongoDB ? 'MongoDB Atlas' : 'in-memory'}`);
    console.log(`👤 Admin: admin@cvoptima.com / Admin123!`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Error handling
server.on('error', (error) => {
  console.error('❌ Server error:', error.message);
  process.exit(1);
});

console.log('🔄 Server setup in progress...');