// Ultra simple server to debug Render.com health check
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3002;

// Log the port we're using
console.log(`🔧 PORT from environment: ${process.env.PORT || 'not set (using 3002)'}`);
console.log(`🔧 Server will use port: ${PORT}`);

// 1. Root endpoint - responds IMMEDIATELY
app.get('/', (req, res) => {
  console.log('✅ Health check received from:', req.ip, 'on port:', PORT);
  console.log('✅ Request headers:', JSON.stringify(req.headers));
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'CVOptima Debug Server',
    actualPort: PORT,
    envPort: process.env.PORT,
    node: process.version
  });
});

// 2. Start server with error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  const address = server.address();
  console.log('🚀 Server started successfully!');
  console.log(`📡 Address: ${address.address}:${address.port}`);
  console.log(`🌐 Family: ${address.family}`);
  console.log(`🔗 URL: http://${address.address}:${address.port}/`);
  console.log(`⚡ PID: ${process.pid}`);
  console.log(`📦 Node: ${process.version}`);
  
  // Test that server is actually listening
  const net = require('net');
  const tester = new net.Socket();
  tester.setTimeout(1000);
  
  tester.on('connect', () => {
    console.log('✅ Server is accepting connections');
    tester.destroy();
  });
  
  tester.on('timeout', () => {
    console.log('❌ Server NOT accepting connections (timeout)');
    tester.destroy();
  });
  
  tester.on('error', (err) => {
    console.log('❌ Connection error:', err.message);
  });
  
  tester.connect(PORT, '127.0.0.1');
});

// 3. Error handling
server.on('error', (error) => {
  console.error('❌ Server error:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use!`);
    console.error('Try: kill -9 $(lsof -t -i:3002)');
  }
  process.exit(1);
});

// 4. Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// 5. Handle shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

console.log('Starting debug server for Render.com...');