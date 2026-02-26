#!/bin/bash

# CVOptima Vercel Deployment Script
# Run this script to deploy CVOptima to Vercel

echo "🚀 CVOptima Vercel Deployment"
echo "=============================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Login to Vercel
echo "🔐 Logging into Vercel..."
echo "Use these credentials:"
echo "  Email: znaol60@gmail.com"
echo "  Password: @Nevapark60"
echo ""
vercel login

# Navigate to frontend directory
cd frontend

# Deploy to Vercel
echo "📦 Deploying frontend to Vercel..."
echo ""
echo "When prompted:"
echo "1. Set up and deploy: Y"
echo "2. Which scope: Select 'znaol60 (znaol60@gmail.com)'"
echo "3. Link to existing project: N"
echo "4. Project name: cvoptima"
echo "5. Directory: . (press Enter)"
echo "6. Override settings: N"
echo ""
echo "Press any key to continue..."
read -n 1

vercel

echo ""
echo "✅ Frontend deployed!"
echo ""

# Get deployment URL
echo "🌐 Your deployment URLs:"
echo "Frontend: https://cvoptima.vercel.app"
echo ""
echo "📋 Next steps:"
echo "1. Deploy backend to Render.com (see VERCEL_DEPLOYMENT_GUIDE.md)"
echo "2. Configure environment variables in Vercel dashboard"
echo "3. Update backend CORS to allow your Vercel domain"
echo "4. Test the application"
echo ""
echo "📚 Full deployment guide: VERCEL_DEPLOYMENT_GUIDE.md"
echo ""

# Open deployment guide
if command -v xdg-open &> /dev/null; then
    xdg-open ../VERCEL_DEPLOYMENT_GUIDE.md 2>/dev/null
elif command -v open &> /dev/null; then
    open ../VERCEL_DEPLOYMENT_GUIDE.md 2>/dev/null
else
    echo "📄 Deployment guide: ../VERCEL_DEPLOYMENT_GUIDE.md"
fi