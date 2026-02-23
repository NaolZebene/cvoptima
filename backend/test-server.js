const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'CVOptima Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Authentication test routes
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Email and password are required'
    });
  }
  
  // Mock login response
  res.json({
    status: 'success',
    message: 'Login successful',
    data: {
      user: {
        id: 'user_123',
        email: email,
        name: 'Test User',
        subscription: 'free',
        role: 'user'
      },
      token: 'mock-jwt-token-123456'
    }
  });
});

app.post('/api/v1/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({
      status: 'error',
      message: 'Email, password, and name are required'
    });
  }
  
  // Mock registration response
  res.status(201).json({
    status: 'success',
    message: 'Registration successful',
    data: {
      user: {
        id: 'user_' + Date.now(),
        email: email,
        name: name,
        subscription: 'free',
        role: 'user'
      },
      token: 'mock-jwt-token-' + Date.now()
    }
  });
});

// CV upload test route
app.post('/api/v1/cv/upload', (req, res) => {
  // Mock file upload response
  res.json({
    status: 'success',
    message: 'CV uploaded successfully',
    data: {
      cv: {
        id: 'cv_' + Date.now(),
        fileName: 'test-cv.pdf',
        fileSize: 1024 * 1024, // 1MB
        fileType: 'application/pdf',
        uploadSource: 'web',
        atsScore: 78,
        extractedData: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '+1 (555) 123-4567',
          summary: 'Experienced software engineer...',
          experience: [
            {
              title: 'Senior Software Engineer',
              company: 'TechCorp Inc.',
              location: 'San Francisco, CA',
              startDate: 'Jan 2020',
              endDate: 'Present',
              description: 'Led development of scalable applications...'
            }
          ],
          education: [
            {
              degree: 'Bachelor of Science in Computer Science',
              institution: 'State University',
              location: 'City, State',
              year: '2020'
            }
          ],
          skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS']
        },
        suggestions: [
          {
            category: 'keywords',
            suggestion: 'Add more industry-specific keywords',
            impact: '+5 points'
          },
          {
            category: 'quantifiable_results',
            suggestion: 'Include numbers to demonstrate impact',
            impact: '+8 points'
          }
        ],
        createdAt: new Date().toISOString()
      }
    }
  });
});

// Dashboard test route
app.get('/api/v1/dashboard', (req, res) => {
  const token = req.headers.authorization;
  
  if (!token || !token.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
  }
  
  // Mock dashboard response
  res.json({
    status: 'success',
    data: {
      stats: {
        totalCVs: 5,
        averageScore: 72,
        bestScore: 89,
        voiceMinutes: 0,
        monthlyUsage: {
          cvUploads: 1,
          cvAnalyses: 3,
          voiceTranscriptions: 0,
          exports: 0
        }
      },
      recentCVs: [
        {
          id: 'cv_1',
          fileName: 'Software Engineer CV.pdf',
          atsScore: 78,
          uploadedAt: '2026-02-22T10:30:00Z'
        },
        {
          id: 'cv_2',
          fileName: 'Updated Resume.docx',
          atsScore: 85,
          uploadedAt: '2026-02-21T14:20:00Z'
        }
      ],
      scoreTrend: [
        { date: '2026-02-15', score: 65 },
        { date: '2026-02-18', score: 72 },
        { date: '2026-02-20', score: 78 },
        { date: '2026-02-22', score: 85 }
      ]
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/v1/health`);
  console.log(`🔐 Test login: POST http://localhost:${PORT}/api/v1/auth/login`);
  console.log(`📄 Test upload: POST http://localhost:${PORT}/api/v1/cv/upload`);
});