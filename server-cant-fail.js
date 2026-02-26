// Server that CANNOT fail
console.log('🚀 STARTING SERVER - THIS MESSAGE MUST APPEAR IN LOGS');

const http = require('http');
const PORT = process.env.PORT || 3002;

console.log(`🔧 PORT: ${PORT}`);
console.log(`🔧 PID: ${process.pid}`);
console.log(`🔧 Node: ${process.version}`);

// Create server
const server = http.createServer((req, res) => {
  console.log(`📥 REQUEST: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});

// Start server with error handling
try {
  server.listen(PORT, '0.0.0.0', () => {
    const addr = server.address();
    console.log(`✅ SERVER STARTED: http://${addr.address}:${addr.port}`);
    console.log(`✅ READY FOR REQUESTS`);
  });
} catch (error) {
  console.error(`❌ SERVER ERROR: ${error.message}`);
  console.error(`❌ STACK: ${error.stack}`);
  process.exit(1);
}

// Handle errors
server.on('error', (error) => {
  console.error(`❌ SERVER LISTEN ERROR: ${error.message}`);
  console.error(`❌ CODE: ${error.code}`);
  process.exit(1);
});

// Keep alive
setInterval(() => {
  console.log(`💓 HEARTBEAT: Server still alive at ${new Date().toISOString()}`);
}, 30000);

// Log exit
process.on('exit', (code) => {
  console.log(`🛑 PROCESS EXITING with code ${code}`);
});

// Catch uncaught errors
process.on('uncaughtException', (error) => {
  console.error(`💥 UNCAUGHT EXCEPTION: ${error.message}`);
  console.error(`💥 STACK: ${error.stack}`);
});

console.log('🔄 SERVER SETUP COMPLETE - WAITING FOR START...');