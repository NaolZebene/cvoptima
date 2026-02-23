#!/bin/bash

# Frontend Dependency Installation Script
# Run this script to install all required dependencies for the CVOptima frontend

echo "🚀 Installing CVOptima Frontend Dependencies..."
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check npm version
echo "📦 Node.js version: $(node --version)"
echo "📦 npm version: $(npm --version)"

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
    
    # Create a simple test to verify
    echo "🧪 Running quick verification..."
    
    # Check if package.json has required scripts
    if [ -f "package.json" ]; then
        echo "📄 Package.json found with scripts:"
        grep -A5 '"scripts"' package.json
        
        # Test if React is available
        if [ -d "node_modules/react" ]; then
            echo "✅ React is installed"
        else
            echo "⚠️ React not found in node_modules"
        fi
        
        if [ -d "node_modules/react-scripts" ]; then
            echo "✅ React Scripts is installed"
        else
            echo "⚠️ React Scripts not found in node_modules"
        fi
    fi
    
    echo ""
    echo "🎉 Installation complete!"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Start the development server: npm start"
    echo "   2. Open http://localhost:3001 in your browser"
    echo "   3. Test the application with the mock backend"
    echo ""
    echo "📊 Backend is running at: http://localhost:3000"
    echo "🔗 API Health Check: http://localhost:3000/api/v1/health"
    
else
    echo "❌ Dependency installation failed!"
    echo "Please check the error messages above."
    exit 1
fi