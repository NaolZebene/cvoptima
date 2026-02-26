// ULTRA SIMPLE Server - No dependencies at all!
const http = require('http');

const PORT = process.env.PORT || 3002;

console.log('🚀 Starting ULTRA SIMPLE server...');
console.log(`🔧 PORT: ${PORT}`);
console.log(`🔧 PID: ${process.pid}`);

// Create server that responds to ANY request
const server = http.createServer((req, res) => {
  console.log(`📥 Request: ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      message: 'CVOptima Ultra Simple Backend',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }));
    return;
  }
  
  // API v1 endpoint
  if (req.url === '/api/v1') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'CVOptima API v1',
      endpoints: ['/health', '/api/v1/auth/login', '/api/v1/cv/upload']
    }));
    return;
  }
  
  // Mock login endpoint
  if (req.url === '/api/v1/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        user: { email: 'admin@cvoptima.com', name: 'Admin User' },
        token: 'demo-token-123'
      }));
    });
    return;
  }
  
  // Mock CV upload endpoint
  if (req.url === '/api/v1/cv/upload' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        score: 85,
        suggestions: ['Add more keywords', 'Improve formatting']
      }));
    });
    return;
  }
  
  // Default response
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'CVOptima Backend',
    url: req.url,
    method: req.method
  }));
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  const address = server.address();
  console.log('✅ Server started successfully!');
  console.log(`📡 Listening on: http://${address.address}:${address.port}`);
  console.log(`🌐 Health check: http://${address.address}:${address.port}/health`);
  console.log(`🔗 API: http://${address.address}:${address.port}/api/v1`);
});

// Handle errors
server.on('error', (error) => {
  console.error('❌ Server error:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use!`);
  }
  process.exit(1);
});

// Keep alive
setInterval(() => {
  console.log(`💓 Heartbeat: Server alive at ${new Date().toISOString()}`);
}, 30000);

console.log('🔄 Server setup complete');