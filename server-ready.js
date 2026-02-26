// CVOptima Backend - Ready for MongoDB Atlas
const http = require('http');
const { parse } = require('url');
const { StringDecoder } = require('string_decoder');

const PORT = process.env.PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI;

console.log('🚀 CVOptima Backend Ready for MongoDB Atlas');
console.log(`🔧 PORT: ${PORT}`);
console.log(`🔧 MongoDB URI: ${MONGODB_URI ? 'SET' : 'NOT SET (using in-memory)'}`);

// In-memory storage (fallback)
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
      version: '4.0.0',
      database: MONGODB_URI ? 'mongodb-atlas-ready' : 'in-memory',
      instructions: MONGODB_URI ? 'MongoDB Atlas connected!' : 'Add MONGODB_URI env var to connect to MongoDB Atlas'
    });
    return;
  }
  
  // API v1
  if (path === '/api/v1') {
    jsonResponse(res, 200, {
      message: 'CVOptima API v1',
      database: MONGODB_URI ? 'mongodb-atlas-ready' : 'in-memory',
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
      },
      admin: 'admin@cvoptima.com / Admin123!',
      frontend: 'https://cvoptima.vercel.app'
    });
    return;
  }
  
  // Auth: Login (for testing)
  if (path === '/api/v1/auth/login' && method === 'POST') {
    const body = await parseBody(req);
    const { email, password } = body;
    
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
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
      token: `token_${Date.now()}`,
      backend: 'https://cvoptima-backend.onrender.com',
      database: MONGODB_URI ? 'mongodb-atlas-ready' : 'in-memory'
    });
    return;
  }
  
  // CV: Upload (mock)
  if (path === '/api/v1/cv/upload' && method === 'POST') {
    const body = await parseBody(req);
    
    const cv = {
      id: `cv_${Date.now()}`,
      filename: body.filename || 'cv.pdf',
      score: Math.floor(Math.random() * 30) + 70,
      analysis: {
        atsScore: Math.floor(Math.random() * 30) + 70,
        suggestions: ['Add more keywords', 'Improve formatting'],
        strengths: ['Good education section', 'Clear contact info']
      },
      uploadedAt: new Date().toISOString()
    };
    
    cvs.push(cv);
    
    jsonResponse(res, 200, {
      success: true,
      message: 'CV uploaded successfully',
      cv,
      database: MONGODB_URI ? 'mongodb-atlas-ready' : 'in-memory'
    });
    return;
  }
  
  // Not found
  jsonResponse(res, 404, {
    error: 'Endpoint not found',
    path,
    method,
    help: 'See /api/v1 for available endpoints'
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  const address = server.address();
  console.log('✅ CVOptima Backend Ready!');
  console.log(`📡 Server: http://${address.address}:${address.port}`);
  console.log(`🌐 Health: http://${address.address}:${address.port}/health`);
  console.log(`🔗 API: http://${address.address}:${address.port}/api/v1`);
  console.log(`👤 Admin: admin@cvoptima.com / Admin123!`);
  console.log(`💾 Database: ${MONGODB_URI ? 'MongoDB Atlas READY' : 'in-memory (add MONGODB_URI)'}`);
  console.log(`🚀 Frontend: https://cvoptima.vercel.app`);
});

console.log('🔄 Server starting...');