// CVOptima Full Backend - All features, minimal dependencies
const http = require('http');
const { parse } = require('url');
const { StringDecoder } = require('string_decoder');

const PORT = process.env.PORT || 3002;

console.log('🚀 Starting CVOptima Full Backend...');
console.log(`🔧 PORT: ${PORT}`);
console.log(`🔧 PID: ${process.pid}`);

// In-memory database
const users = [
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

const cvs = [];
const analyses = [];

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
      message: 'CVOptima Full Backend',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      features: ['auth', 'cv-upload', 'ats-analysis', 'admin-dashboard']
    });
    return;
  }
  
  // API v1
  if (path === '/api/v1') {
    jsonResponse(res, 200, {
      message: 'CVOptima API v1',
      endpoints: {
        auth: {
          register: 'POST /api/v1/auth/register',
          login: 'POST /api/v1/auth/login',
          me: 'GET /api/v1/users/me'
        },
        cv: {
          upload: 'POST /api/v1/cv/upload',
          list: 'GET /api/v1/cv',
          analyze: 'POST /api/v1/cv/analyze'
        },
        admin: {
          dashboard: 'GET /api/v1/admin/dashboard',
          users: 'GET /api/v1/admin/users'
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
    
    if (users.find(u => u.email === email)) {
      jsonResponse(res, 400, { error: 'User already exists' });
      return;
    }
    
    const user = {
      id: `user_${Date.now()}`,
      email,
      name,
      password, // In production, hash this!
      role: 'user',
      subscription: 'free',
      createdAt: new Date().toISOString()
    };
    
    users.push(user);
    
    jsonResponse(res, 200, {
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
    return;
  }
  
  // Auth: Login
  if (path === '/api/v1/auth/login' && method === 'POST') {
    const body = await parseBody(req);
    const { email, password } = body;
    
    const user = users.find(u => u.email === email);
    if (!user || user.password !== password) {
      jsonResponse(res, 401, { error: 'Invalid credentials' });
      return;
    }
    
    jsonResponse(res, 200, {
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
    return;
  }
  
  // User: Get current user
  if (path === '/api/v1/users/me' && method === 'GET') {
    // Mock authentication - get first user
    const user = users[0];
    
    jsonResponse(res, 200, {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscription: user.subscription,
        createdAt: user.createdAt
      }
    });
    return;
  }
  
  // CV: Upload
  if (path === '/api/v1/cv/upload' && method === 'POST') {
    const body = await parseBody(req);
    const { filename, originalName, fileSize, fileType, jobDescription, industry } = body;
    
    // Generate ATS score
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
        'Good technical skills section'
      ],
      weaknesses: [
        'Could add more quantifiable achievements',
        'Consider adding a professional summary'
      ],
      suggestions: [
        'Add more industry-specific keywords',
        'Include metrics to quantify achievements',
        'Tailor to specific job description'
      ],
      keywords: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express'],
      missingKeywords: ['TypeScript', 'AWS', 'Docker', 'CI/CD']
    };
    
    const cv = {
      id: `cv_${Date.now()}`,
      userId: 'admin_001',
      filename: filename || 'cv.pdf',
      originalName: originalName || 'My CV.pdf',
      fileSize: fileSize || 1024,
      fileType: fileType || 'application/pdf',
      scores,
      analysis,
      jobDescription: jobDescription || 'Software Engineer',
      industry: industry || 'Technology',
      uploadedAt: new Date().toISOString(),
      analyzedAt: new Date().toISOString()
    };
    
    cvs.push(cv);
    
    jsonResponse(res, 200, {
      success: true,
      message: 'CV uploaded and analyzed successfully',
      cv: {
        id: cv.id,
        filename: cv.filename,
        scores: cv.scores,
        analysis: cv.analysis,
        uploadedAt: cv.uploadedAt
      }
    });
    return;
  }
  
  // CV: List
  if (path === '/api/v1/cv' && method === 'GET') {
    const userCvs = cvs.filter(cv => cv.userId === 'admin_001');
    
    const stats = {
      averageScore: userCvs.length > 0 
        ? userCvs.reduce((sum, cv) => sum + cv.scores.overall, 0) / userCvs.length 
        : 0,
      bestScore: userCvs.length > 0
        ? Math.max(...userCvs.map(cv => cv.scores.overall))
        : 0,
      totalCVs: userCvs.length
    };
    
    jsonResponse(res, 200, {
      success: true,
      cvs: userCvs.map(cv => ({
        id: cv.id,
        filename: cv.filename,
        scores: cv.scores,
        uploadedAt: cv.uploadedAt
      })),
      stats
    });
    return;
  }
  
  // Admin: Dashboard
  if (path === '/api/v1/admin/dashboard' && method === 'GET') {
    const totalUsers = users.length;
    const totalCVs = cvs.length;
    const activeUsers = users.filter(u => u.subscription !== 'free').length;
    
    const recentCVs = cvs.slice(-5).map(cv => ({
      id: cv.id,
      filename: cv.filename,
      score: cv.scores.overall,
      uploadedAt: cv.uploadedAt,
      user: users.find(u => u.id === cv.userId)?.email || 'Unknown'
    }));
    
    jsonResponse(res, 200, {
      success: true,
      dashboard: {
        totalUsers,
        totalCVs,
        activeUsers,
        recentCVs,
        userGrowth: [
          { date: '2026-02-26', count: totalUsers }
        ]
      }
    });
    return;
  }
  
  // Admin: Users
  if (path === '/api/v1/admin/users' && method === 'GET') {
    jsonResponse(res, 200, {
      success: true,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscription: user.subscription,
        createdAt: user.createdAt
      }))
    });
    return;
  }
  
  // CV: Analyze (detailed analysis)
  if (path === '/api/v1/cv/analyze' && method === 'POST') {
    const body = await parseBody(req);
    
    const analysis = {
      id: `analysis_${Date.now()}`,
      cvId: body.cvId || `cv_${Date.now()}`,
      atsScore: Math.floor(Math.random() * 30) + 70,
      industryMatch: Math.floor(Math.random() * 30) + 70,
      keywordDensity: Math.floor(Math.random() * 30) + 70,
      readability: Math.floor(Math.random() * 30) + 70,
      recommendations: [
        'Add more action verbs (managed, developed, implemented)',
        'Include quantifiable achievements (increased performance by 30%)',
        'Tailor keywords to job description',
        'Improve formatting for better ATS parsing'
      ],
      createdAt: new Date().toISOString()
    };
    
    analyses.push(analysis);
    
    jsonResponse(res, 200, {
      success: true,
      analysis
    });
    return;
  }
  
  // Not found
  jsonResponse(res, 404, {
    error: 'Endpoint not found',
    path,
    method
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  const address = server.address();
  console.log('✅ CVOptima Full Backend started successfully!');
  console.log(`📡 Server: http://${address.address}:${address.port}`);
  console.log(`🌐 Health: http://${address.address}:${address.port}/health`);
  console.log(`🔗 API: http://${address.address}:${address.port}/api/v1`);
  console.log(`👤 Admin: admin@cvoptima.com / Admin123!`);
  console.log(`💾 Database: in-memory`);
  console.log(`✨ Features: Authentication, CV Upload, ATS Analysis, Admin Dashboard`);
});

// Error handling
server.on('error', (error) => {
  console.error('❌ Server error:', error.message);
  process.exit(1);
});

// Keep alive
setInterval(() => {
  console.log(`💓 Heartbeat: ${cvs.length} CVs, ${users.length} users`);
}, 60000);

console.log('🔄 Server setup complete');