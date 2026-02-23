#!/bin/bash

# Start CVOptima Static Demo
# This shows all frontend pages without React installation

echo "🚀 Starting CVOptima Static Demo"
echo "================================"
echo ""
echo "📊 Backend Status:"
echo "   URL: http://localhost:3000"
echo "   Health: http://localhost:3000/api/v1/health"
echo ""
echo "🌐 Frontend Demo:"
echo "   URL: http://localhost:8080/static-demo.html"
echo ""
echo "🎯 What this demo shows:"
echo "   1. Dashboard with stats"
echo "   2. CV upload interface"
echo "   3. CV analysis with scoring"
echo "   4. Voice CV creation"
echo "   5. Subscription plans"
echo "   6. User settings"
echo "   7. Admin dashboard"
echo ""
echo "🔗 Backend connectivity is tested automatically"
echo "🔄 Backend status shown in bottom-right corner"
echo ""
echo "⚡ Quick test commands:"
echo "   curl http://localhost:3000/api/v1/health"
echo "   curl -X POST http://localhost:3000/api/v1/auth/register \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"email\":\"demo@example.com\",\"password\":\"demo123\",\"name\":\"Demo User\"}'"
echo ""
echo "Starting demo server on port 8080..."
echo "Press Ctrl+C to stop"
echo ""

# Check if Python is available
if command -v python3 &> /dev/null; then
    python3 -m http.server 8080
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer 8080
else
    echo "❌ Error: Python is not installed."
    echo "You can still open static-demo.html directly in your browser."
    echo ""
    echo "To open directly:"
    echo "   Open cvoptima/frontend/static-demo.html in your browser"
    exit 1
fi