#!/bin/bash
# Development setup script for CVOptima

set -e

echo "🚀 Setting up CVOptima development environment..."

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "⚠️  Docker not found, some features may not work"; }

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create environment files
echo "⚙️  Creating environment files..."

# Backend .env.example
cat > backend/.env.example << 'EOF'
# Database
MONGODB_URI=mongodb://localhost:27017/cvoptima
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
NODE_ENV=development

# Authentication
JWT_SECRET=your_jwt_secret_key_here_change_this_in_production
JWT_EXPIRES_IN=7d

# Stripe (sandbox)
STRIPE_SECRET_KEY=REPLACE_WITH_YOUR_STRIPE_TEST_SECRET_KEY  # Get from: https://dashboard.stripe.com/test/apikeys
STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXX

# Voice transcription (optional - OpenAI Whisper)
OPENAI_API_KEY=
# Legacy fallback (optional)
WHISPER_API_KEY=

# LinkedIn (development)
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# Email (development)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password

# Application URLs
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# Feature flags
ENABLE_VOICE=false
ENABLE_STRIPE=true
EOF

# Copy .env.example to .env for development
cp backend/.env.example backend/.env

# Frontend .env.example
cat > frontend/.env.example << 'EOF'
REACT_APP_API_URL=http://localhost:3000/api/v1
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_WHISPER_ENABLED=false
REACT_APP_LINKEDIN_CLIENT_ID=your_linkedin_client_id
EOF

# Copy .env.example to .env for development
cp frontend/.env.example frontend/.env

# Create Docker development environment
echo "🐳 Setting up Docker development environment..."

# Create docker-compose.override.yml for development
cat > docker-compose.override.yml << 'EOF'
services:
  backend:
    build:
      context: .
      dockerfile: docker/backend.Dockerfile.dev
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
    command: npm run dev
    ports:
      - "3000:3000"

  frontend:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile.dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      NODE_ENV: development
    command: npm start
    ports:
      - "3001:3000"
EOF

echo "✅ Development environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update backend/.env with your actual API keys"
echo "2. Update frontend/.env with your actual configuration"
echo "3. Start services: docker compose up -d"
echo "4. Run tests: cd backend && npm test"
echo "5. Start development: cd frontend && npm start"
