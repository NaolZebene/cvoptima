#!/bin/bash

# CVOptima GitHub Pages Deployment Script

echo "🚀 CVOptima GitHub Pages Deployment"
echo "=================================="

echo ""
echo "📋 Deployment Strategy:"
echo "  • Frontend: GitHub Pages (free, no SMS)"
echo "  • Backend: Render.com (free)"
echo "  • Database: MongoDB Atlas (free)"
echo ""

echo "📝 Step-by-Step Instructions:"
echo ""
echo "1. 📦 ENABLE GITHUB PAGES:"
echo "   • Go to: https://github.com/NaolZebene/cvoptima/settings/pages"
echo "   • Source: Deploy from a branch"
echo "   • Branch: main → /frontend/build"
echo "   • Click 'Save'"
echo ""

echo "2. 🗄️ CREATE MONGODB ATLAS DATABASE:"
echo "   • Go to: https://www.mongodb.com/cloud/atlas"
echo "   • Create free cluster (M0 Sandbox)"
echo "   • Get connection string"
echo ""

echo "3. ⚙️ DEPLOY BACKEND TO RENDER.COM:"
echo "   • Go to: https://render.com"
echo "   • Sign up with GitHub"
echo "   • Create Web Service:"
echo "     - Name: cvoptima-backend"
echo "     - Build: cd backend && npm install"
echo "     - Start: cd backend && npm start"
echo "   • Add environment variables (see below)"
echo ""

echo "4. 🔧 CONFIGURE FRONTEND:"
echo "   • GitHub → Settings → Secrets → Actions"
echo "   • Add secret: REACT_APP_API_URL"
echo "   • Value: https://cvoptima-backend.onrender.com/api/v1"
echo ""

echo "5. 🚀 DEPLOY:"
echo "   • Push to main branch:"
echo "     git add ."
echo "     git commit -m 'Deploy to GitHub Pages'"
echo "     git push origin main"
echo ""

echo "📊 ENVIRONMENT VARIABLES:"
echo ""
echo "Backend (Render.com):"
echo "NODE_ENV=production"
echo "PORT=10000"
echo "MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cvoptima?retryWrites=true&w=majority"
echo "JWT_SECRET=your-jwt-secret-here"
echo "CORS_ORIGIN=https://naolzebene.github.io"
echo ""

echo "Frontend (GitHub Secret):"
echo "REACT_APP_API_URL=https://cvoptima-backend.onrender.com/api/v1"
echo ""

echo "🌐 DEPLOYMENT URLs:"
echo "• Frontend: https://naolzebene.github.io/cvoptima"
echo "• Backend: https://cvoptima-backend.onrender.com"
echo "• API: https://cvoptima-backend.onrender.com/api/v1"
echo ""

echo "✅ COMPLETE GUIDE: GITHUB_PAGES_DEPLOYMENT.md"
echo ""

echo "💡 TIP: GitHub Pages deployment is automatic after push!"
echo "      The workflow file (.github/workflows/deploy.yml) is already configured."
echo ""

# Check if we should commit and push
read -p "Do you want to commit and push now? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Committing and pushing..."
    cd /home/ai-bot/.openclaw/workspace/cvoptima
    git add .
    git commit -m "Add GitHub Pages deployment configuration"
    git push origin main
    echo "✅ Push complete! Deployment will start automatically."
fi

echo ""
echo "🎉 Deployment instructions ready!"