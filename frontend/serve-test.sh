#!/bin/bash

# Simple HTTP server to serve the API test page
# This allows you to test the backend API without installing React dependencies

echo "🚀 Starting CVOptima API Test Server"
echo "===================================="
echo ""
echo "📊 Backend Status:"
echo "   URL: http://localhost:3000"
echo "   Health Check: http://localhost:3000/api/v1/health"
echo ""
echo "🌐 Frontend Test Page:"
echo "   URL: http://localhost:8000/test-api.html"
echo ""
echo "📋 What this test page does:"
echo "   1. Checks if backend is running"
echo "   2. Tests all API endpoints"
echo "   3. Verifies authentication flow"
echo "   4. Tests CV upload functionality"
echo ""
echo "⚡ Quick test commands:"
echo "   curl http://localhost:3000/api/v1/health"
echo "   curl -X POST http://localhost:3000/api/v1/auth/register \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"email\":\"test@example.com\",\"password\":\"password123\",\"name\":\"Test User\"}'"
echo ""
echo "Starting HTTP server on port 8000..."
echo "Press Ctrl+C to stop"
echo ""

# Check if Python is available
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer 8000
else
    echo "❌ Error: Python is not installed. Please install Python to run the test server."
    echo "You can still open test-api.html directly in your browser."
    exit 1
fi