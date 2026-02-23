#!/bin/bash

# Minimal Frontend Installation
# Installs only essential dependencies to get React running

echo "🚀 CVOptima Minimal Frontend Installation"
echo "=========================================="
echo ""
echo "This will install only essential dependencies to get React running."
echo "Full installation may take longer but includes all features."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "📦 Node.js version: $(node --version)"
echo "📦 npm version: $(npm --version)"
echo ""

# Create a minimal package.json if needed
if [ ! -f "package.json" ]; then
    echo "📄 Creating minimal package.json..."
    cat > package.json << EOF
{
  "name": "cvoptima-frontend-minimal",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
EOF
    echo "✅ Created minimal package.json"
fi

echo ""
echo "📥 Installing minimal dependencies..."
echo "This may take a few minutes..."
echo ""

# Install minimal dependencies
npm install --no-audit --progress=false

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Minimal dependencies installed!"
    echo ""
    
    # Create a simple test HTML file
    echo "📄 Creating test page..."
    cat > public/test-minimal.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CVOptima Minimal Test</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 600px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
        }
        h1 {
            color: #4f46e5;
            margin-bottom: 20px;
        }
        .status {
            background: #f0f9ff;
            border: 2px solid #0ea5e9;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .success {
            color: #10b981;
            font-weight: bold;
        }
        .next-steps {
            text-align: left;
            background: #f8fafc;
            padding: 20px;
            border-radius: 10px;
            margin-top: 20px;
        }
        code {
            background: #1e293b;
            color: #f1f5f9;
            padding: 5px 10px;
            border-radius: 5px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 CVOptima Minimal Test</h1>
        <p>React is installed and ready!</p>
        
        <div class="status">
            <p class="success">✅ Frontend dependencies installed successfully</p>
            <p>Backend API: <code>http://localhost:3000</code></p>
            <p>React Development Server: <code>http://localhost:3001</code></p>
        </div>
        
        <div class="next-steps">
            <h3>Next Steps:</h3>
            <ol>
                <li><strong>Start React server:</strong> Run <code>npm start</code></li>
                <li><strong>Open browser:</strong> Visit <code>http://localhost:3001</code></li>
                <li><strong>Test API:</strong> Backend is running at <code>http://localhost:3000</code></li>
                <li><strong>Full installation:</strong> Run <code>npm install</code> again for all features</li>
            </ol>
        </div>
        
        <button onclick="testBackend()" style="
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 20px;
        ">
            Test Backend Connection
        </button>
        
        <div id="testResult" style="margin-top: 20px;"></div>
    </div>
    
    <script>
        async function testBackend() {
            const result = document.getElementById('testResult');
            result.innerHTML = '<p>Testing backend connection...</p>';
            
            try {
                const response = await fetch('http://localhost:3000/api/v1/health');
                const data = await response.json();
                
                if (response.ok && data.status === 'ok') {
                    result.innerHTML = `
                        <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 10px; padding: 15px;">
                            <p style="color: #10b981; font-weight: bold;">✅ Backend is running!</p>
                            <p>Version: ${data.version}</p>
                            <p>Message: ${data.message}</p>
                        </div>
                    `;
                } else {
                    result.innerHTML = `
                        <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 10px; padding: 15px;">
                            <p style="color: #ef4444; font-weight: bold;">❌ Backend connection failed</p>
                            <p>Error: ${data.message || 'Unknown error'}</p>
                        </div>
                    `;
                }
            } catch (error) {
                result.innerHTML = `
                    <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 10px; padding: 15px;">
                        <p style="color: #ef4444; font-weight: bold;">❌ Cannot connect to backend</p>
                        <p>Make sure the backend server is running on port 3000</p>
                    </div>
                `;
            }
        }
        
        // Test backend on page load
        window.onload = testBackend;
    </script>
</body>
</html>
EOF
    
    echo "✅ Created test page: public/test-minimal.html"
    echo ""
    echo "🎉 INSTALLATION COMPLETE!"
    echo ""
    echo "🚀 To start React development server:"
    echo "   npm start"
    echo ""
    echo "🌐 Then open in your browser:"
    echo "   http://localhost:3001"
    echo ""
    echo "🔗 Backend API is running at:"
    echo "   http://localhost:3000"
    echo ""
    echo "📄 Test page also available at:"
    echo "   http://localhost:3001/test-minimal.html"
    
else
    echo ""
    echo "❌ Installation failed!"
    echo "Please check the error messages above."
    exit 1
fi