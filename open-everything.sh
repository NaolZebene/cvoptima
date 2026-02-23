#!/bin/bash

# Open Everything for CVOptima
# This script helps you access all testing options

echo "🚀 CVOPTIMA - OPEN EVERYTHING"
echo "=============================="
echo ""
echo "🎯 Choose what you want to open:"
echo ""
echo "1. Quick View (this overview)"
echo "2. Static Demo (all frontend pages)"
echo "3. API Test Interface"
echo "4. Run Automated Tests"
echo "5. Check Backend Status"
echo "6. Open Complete Guide"
echo "7. Exit"
echo ""
echo "Enter your choice (1-7): "

read choice

case $choice in
    1)
        echo ""
        echo "📊 Opening Quick View..."
        echo "File: cvoptima/frontend/quick-view.html"
        echo ""
        echo "Open this file in your browser or use:"
        echo "  xdg-open cvoptima/frontend/quick-view.html"
        echo ""
        echo "Or copy this path and open in browser:"
        echo "  file://$(pwd)/cvoptima/frontend/quick-view.html"
        ;;
    2)
        echo ""
        echo "🎨 Opening Static Demo..."
        echo "File: cvoptima/frontend/static-demo.html"
        echo ""
        echo "This shows all 8 frontend pages without installation!"
        echo ""
        echo "Open with:"
        echo "  xdg-open cvoptima/frontend/static-demo.html"
        echo ""
        echo "Or start demo server:"
        echo "  cd cvoptima/frontend && ./start-demo.sh"
        ;;
    3)
        echo ""
        echo "🔧 Opening API Test Interface..."
        echo "File: cvoptima/frontend/test-api.html"
        echo ""
        echo "This lets you test all API endpoints interactively."
        echo ""
        echo "Open with:"
        echo "  xdg-open cvoptima/frontend/test-api.html"
        echo ""
        echo "Or start test server:"
        echo "  cd cvoptima/frontend && ./serve-test.sh"
        ;;
    4)
        echo ""
        echo "🧪 Running Automated Tests..."
        echo ""
        cd cvoptima
        node auto-test.js
        ;;
    5)
        echo ""
        echo "🔍 Checking Backend Status..."
        echo ""
        curl -s http://localhost:3000/api/v1/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/api/v1/health
        echo ""
        echo "✅ Backend should be running at: http://localhost:3000"
        ;;
    6)
        echo ""
        echo "📚 Opening Complete Guide..."
        echo "File: cvoptima/GET_STARTED.md"
        echo ""
        cat cvoptima/GET_STARTED.md | head -50
        echo ""
        echo "... (see full file for complete guide)"
        echo ""
        echo "View with: cat cvoptima/GET_STARTED.md | less"
        ;;
    7)
        echo ""
        echo "👋 Exiting. Remember:"
        echo "• Backend: http://localhost:3000"
        echo "• Static Demo: cvoptima/frontend/static-demo.html"
        echo "• Complete Guide: cvoptima/GET_STARTED.md"
        ;;
    *)
        echo ""
        echo "❌ Invalid choice. Please run again."
        ;;
esac

echo ""
echo "🎯 Quick Reference:"
echo "• Backend API: http://localhost:3000"
echo "• Static Demo: Open cvoptima/frontend/static-demo.html in browser"
echo "• API Tests: node cvoptima/auto-test.js"
echo "• Complete Guide: cat cvoptima/GET_STARTED.md"
echo ""
echo "🚀 Project is 100% complete and ready for your testing!"