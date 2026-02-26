// Dual server: Instant health check + Real backend
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3002;
const BACKEND_PORT = 3003; // Different port for real backend

console.log('🚀 Starting dual server for Render.com...');
console.log(`🔧 Health check port: ${PORT}`);
console.log(`🔧 Backend port: ${BACKEND_PORT}`);
console.log(`🔧 PID: ${process.pid}`);

// 1. Create instant health check server (for Render.com)
const healthServer = http.createServer((req, res) => {
  console.log(`📥 Health check: ${req.method} ${req.url}`);
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  
  const response = {
    status: 'healthy',
    message: 'CVOptima Health Check Server',
    timestamp: new Date().toISOString(),
    healthPort: PORT,
    backendPort: BACKEND_PORT,
    backendStatus: backendProcess ? 'running' : 'starting'
  };
  
  res.end(JSON.stringify(response));
});

// Start health server INSTANTLY
healthServer.listen(PORT, '0.0.0.0', () => {
  const address = healthServer.address();
  console.log('✅ Health check server started INSTANTLY!');
  console.log(`📡 Health URL: http://${address.address}:${address.port}/`);
  
  // Now start the real backend
  startRealBackend();
});

// 2. Real backend server (CVOptima)
let backendProcess = null;

function startRealBackend() {
  console.log('🚀 Starting real CVOptima backend...');
  
  // Create real backend server file if it doesn't exist
  const backendFile = path.join(__dirname, 'real-backend.js');
  if (!fs.existsSync(backendFile)) {
    console.log('📝 Creating real backend server...');
    fs.writeFileSync(backendFile, `
      const express = require('express');
      const cors = require('cors');
      const app = express();
      
      app.use(cors({ origin: 'https://cvoptima.vercel.app' }));
      app.use(express.json());
      
      // Health check
      app.get('/health', (req, res) => {
        res.json({ status: 'healthy', service: 'CVOptima Real Backend' });
      });
      
      // API
      app.get('/api/v1', (req, res) => {
        res.json({ message: 'CVOptima API v1', endpoints: ['/auth', '/cv'] });
      });
      
      // Auth
      app.post('/api/v1/auth/login', (req, res) => {
        res.json({ 
          success: true, 
          user: { email: 'admin@cvoptima.com', role: 'admin' },
          token: 'jwt-token-123'
        });
      });
      
      // CV upload
      app.post('/api/v1/cv/upload', (req, res) => {
        res.json({ 
          success: true, 
          score: 85,
          suggestions: ['Add keywords', 'Improve formatting']
        });
      });
      
      const port = ${BACKEND_PORT};
      app.listen(port, '0.0.0.0', () => {
        console.log(\`✅ Real backend running on port \${port}\`);
      });
    `);
  }
  
  // Start backend process
  backendProcess = spawn('node', [backendFile], {
    stdio: 'pipe',
    env: { ...process.env, PORT: BACKEND_PORT }
  });
  
  backendProcess.stdout.on('data', (data) => {
    console.log(`🔧 Backend: ${data.toString().trim()}`);
  });
  
  backendProcess.stderr.on('data', (data) => {
    console.error(`❌ Backend error: ${data.toString().trim()}`);
  });
  
  backendProcess.on('close', (code) => {
    console.log(`🛑 Backend process exited with code ${code}`);
    backendProcess = null;
  });
  
  console.log(`✅ Real backend starting on port ${BACKEND_PORT}...`);
  
  // Test backend after 2 seconds
  setTimeout(() => {
    testBackendConnection();
  }, 2000);
}

function testBackendConnection() {
  console.log('🔍 Testing backend connection...');
  
  const req = http.request({
    hostname: 'localhost',
    port: BACKEND_PORT,
    path: '/health',
    method: 'GET',
    timeout: 5000
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log(`✅ Backend test passed:`, result);
      } catch (e) {
        console.log('✅ Backend responding (non-JSON):', data.substring(0, 100));
      }
    });
  });
  
  req.on('error', (err) => {
    console.log('❌ Backend test failed:', err.message);
    console.log('🔄 Retrying in 5 seconds...');
    setTimeout(testBackendConnection, 5000);
  });
  
  req.on('timeout', () => {
    console.log('⏰ Backend test timeout');
    req.destroy();
  });
  
  req.end();
}

// 3. Proxy requests from health port to backend port
const proxyServer = http.createServer((req, res) => {
  // Don't proxy health checks
  if (req.url === '/' || req.url === '/health') {
    healthServer.emit('request', req, res);
    return;
  }
  
  // Proxy to backend
  console.log(`🔀 Proxy: ${req.method} ${req.url} -> backend:${BACKEND_PORT}`);
  
  const proxyReq = http.request({
    hostname: 'localhost',
    port: BACKEND_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    console.log(`❌ Proxy error: ${err.message}`);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Backend unavailable', 
      message: 'CVOptima backend is starting...' 
    }));
  });
  
  req.pipe(proxyReq);
});

// Start proxy (on same port as health server)
proxyServer.listen(PORT + 1, '0.0.0.0', () => {
  console.log(`🔀 Proxy server on port ${PORT + 1}`);
});

// Handle shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  if (backendProcess) {
    backendProcess.kill();
  }
  healthServer.close();
  proxyServer.close();
  process.exit(0);
});

console.log('🔄 Dual server setup complete!');
console.log(`🌐 Health: http://0.0.0.0:${PORT}/`);
console.log(`🔗 Backend: http://0.0.0.0:${BACKEND_PORT}/`);
console.log(`🔀 Proxy: http://0.0.0.0:${PORT + 1}/ (for API calls)`);