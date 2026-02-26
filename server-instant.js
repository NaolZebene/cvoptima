// Instant response server for Render.com
const http = require('http');

const PORT = process.env.PORT || 3002;

console.log('🚀 Starting instant server for Render.com...');
console.log(`🔧 PORT: ${PORT}`);
console.log(`🔧 PID: ${process.pid}`);

// Create the simplest possible server
const server = http.createServer((req, res) => {
  console.log(`📥 Request: ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
  
  // Instant response for any request
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  
  const response = {
    status: 'healthy',
    message: 'CVOptima Instant Server',
    timestamp: new Date().toISOString(),
    port: PORT,
    pid: process.pid,
    url: req.url,
    method: req.method
  };
  
  console.log(`📤 Response:`, response);
  res.end(JSON.stringify(response));
});

// Start server INSTANTLY
server.listen(PORT, '0.0.0.0', () => {
  const address = server.address();
  console.log('✅ Server started INSTANTLY!');
  console.log(`📡 Address: ${address.address}:${address.port}`);
  console.log(`🌐 URL: http://${address.address}:${address.port}/`);
  console.log(`⚡ Ready in: 0ms`);
  
  // Test that we can connect to ourselves
  const testClient = new http.Agent();
  const req = http.request({
    hostname: 'localhost',
    port: PORT,
    path: '/',
    method: 'GET',
    agent: testClient
  }, (testRes) => {
    let data = '';
    testRes.on('data', chunk => data += chunk);
    testRes.on('end', () => {
      console.log('✅ Self-test passed:', JSON.parse(data).status);
      testClient.destroy();
    });
  });
  
  req.on('error', (err) => {
    console.log('❌ Self-test failed:', err.message);
    testClient.destroy();
  });
  
  req.end();
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
server.on('clientError', (err, socket) => {
  console.log('Client error:', err.message);
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

// Log startup time
const startTime = Date.now();
process.on('exit', () => {
  const uptime = Date.now() - startTime;
  console.log(`🛑 Server shutting down after ${uptime}ms`);
});

// Keep process alive
setInterval(() => {
  // Just keep alive
}, 60000);

console.log('🔄 Server setup complete, waiting for requests...');