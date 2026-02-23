# CVOptima
**Voice‑First AI CV Optimization Platform**

## 🎯 Vision
CVOptima helps job seekers create professional, ATS‑friendly resumes 50‑70% faster through voice input and AI‑powered optimization.

## ✨ Features
- **Voice‑first creation**: Speak instead of type
- **Transparent ATS scoring**: See exactly why scores change
- **Industry‑specific optimization**: Tech, healthcare, finance, academia
- **Hybrid pricing**: One‑time (€9.99) + subscription (€19.99/month)
- **EU‑first compliance**: GDPR, local pricing, multiple languages
- **Real‑time collaboration**: Share with career coaches

## 🏗️ Architecture
```
cvoptima/
├── backend/          # Node.js/Express API
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── utils/
├── frontend/         # React/Redux application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── services/
├── docker/           # Docker configurations
├── docs/            # Documentation
└── scripts/         # Development scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB 6+
- Redis 7+

### Development
```bash
# Clone and setup
git clone <repository>
cd cvoptima

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start services with Docker
docker-compose up -d mongodb redis

# Start backend (development)
cd backend && npm run dev

# Start frontend (development)
cd frontend && npm start
```

### Production Deployment
```bash
# Build and run all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📊 Development Workflow

### Task Management
Tasks are managed in Taskwarrior:
```bash
# View all tasks
task list project:cvoptima

# View tasks by phase
task list project:cvoptima phase:1

# Mark task as done
task <id> done
```

### Code Quality
- **ESLint**: Airbnb style guide
- **Prettier**: Code formatting
- **Git hooks**: Pre‑commit linting, pre‑push testing
- **Commit convention**: Conventional commits

### Testing
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# End‑to‑end tests
npm run test:e2e
```

## 🔧 Configuration

### Environment Variables
Create `.env` files:
- `backend/.env` - Backend configuration
- `frontend/.env` - Frontend configuration
- `.env` - Docker Compose variables

See `.env.example` files for required variables.

### Third‑Party Services
1. **Stripe**: Payment processing
2. **Whisper API**: Speech‑to‑text
3. **LinkedIn API**: Profile integration
4. **Job APIs**: Indeed, Glassdoor, Adzuna

## 📈 Project Status

### Phase 1: Core MVP (Weeks 1‑3)
- [ ] Voice input and transcription
- [ ] Basic ATS scoring
- [ ] User authentication
- [ ] File upload and processing
- [ ] One‑time payments (€9.99)
- [ ] Mobile‑first design

### Phase 2: Differentiation (Weeks 4‑6)
- [ ] Voice interview mode
- [ ] Industry keyword packs
- [ ] Explainable scoring interface
- [ ] LinkedIn integration
- [ ] Subscription management
- [ ] GDPR compliance

### Phase 3: Advanced Features (Weeks 7‑9)
- [ ] Real‑time collaboration
- [ ] Cover letter generator
- [ ] Interview preparation
- [ ] Salary estimator
- [ ] Job matching

## 🎯 Success Metrics
- **Revenue**: €9,808 in 3 months
- **Users**: 285 paying customers
- **Profit**: €2,756 (28.1% margin)
- **Break‑even**: Mid Month 2

## 📚 Documentation
- [Product Requirements Document](PRD/cv_optimizer_prd.pdf)
- [Research Document](research/final_research_with_voice.pdf)
- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)

## 👥 Team
- **Product Owner**: Puddin (AI Assistant)
- **Technical Lead**: Puddin (AI Assistant)
- **Development**: Local LLMs + DeepSeek API

## 📄 License
MIT License - see [LICENSE](LICENSE) file

## 🤝 Contributing
1. Pick a task from Taskwarrior
2. Create feature branch
3. Implement with tests
4. Submit pull request
5. Code review and merge

---
*Built with ❤️ by Puddin & Team*