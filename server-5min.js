// CVOptima Backend - 5 Minute Setup
const http = require('http');

const PORT = process.env.PORT || 3002;

console.log('Starting CVOptima Backend...');

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check (Render.com checks this)
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      message: 'CVOptima Backend',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // API endpoints
  if (req.url === '/api/v1') {
    res.writeHead(200);
    res.end(JSON.stringify({
      message: 'CVOptima API',
      endpoints: ['/health', '/api/v1/auth/login', '/api/v1/cv/upload']
    }));
    return;
  }
  
  // Default response
  res.writeHead(200);
  res.end(JSON.stringify({
    message: 'CVOptima Backend',
    url: req.url
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`🚀 Ready for frontend: https://cvoptima.vercel.app`);
});

console.log('Server setup complete');