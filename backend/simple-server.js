/**
 * Simple Backend Server for Testing
 * This bypasses complex routes to get basic functionality working
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:8080'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/temp';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.doc'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  }
});

// Simple health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    message: 'CVOptima Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Simple auth endpoints
app.post('/api/v1/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email, password, and name are required' 
    });
  }
  
  // Split name into firstName and lastName
  const nameParts = name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  // Mock user creation
  const mockUser = {
    _id: 'mock_' + Date.now(),
    email,
    firstName,
    lastName,
    fullName: name,
    subscription: {
      type: 'free',
      status: 'active',
      startedAt: new Date()
    },
    createdAt: new Date()
  };
  
  // Mock JWT token
  const mockToken = 'mock_jwt_token_' + Date.now();
  
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user: mockUser,
    token: mockToken
  });
});

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and password are required' 
    });
  }
  
  // Mock user
  const mockUser = {
    _id: 'mock_user_123',
    email,
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    subscription: {
      type: 'free',
      status: 'active',
      startedAt: new Date()
    },
    createdAt: new Date()
  };
  
  // Mock JWT token
  const mockToken = 'mock_jwt_token_' + Date.now();
  
  res.status(200).json({
    success: true,
    message: 'Login successful',
    user: mockUser,
    token: mockToken
  });
});

// CV upload endpoint with file handling
app.post('/api/v1/cv/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const { jobDescription, industry } = req.body;
    
    // Clean up the uploaded file (in a real app, you'd process it)
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    // Generate mock analysis
    const mockScore = Math.floor(Math.random() * 30) + 70; // 70-100
    
    res.status(200).json({
      success: true,
      message: 'CV uploaded and analyzed successfully',
      cv: {
        _id: 'cv_' + Date.now(),
        userId: 'user_' + Date.now(),
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        metadata: {
          jobDescription: jobDescription || 'Not specified',
          industry: industry || 'General',
          uploadedAt: new Date()
        },
        analysis: {
          overallScore: mockScore,
          breakdown: {
            keywords: Math.floor(Math.random() * 20) + 80,
            formatting: Math.floor(Math.random() * 20) + 75,
            experience: Math.floor(Math.random() * 20) + 70,
            education: Math.floor(Math.random() * 20) + 85,
            skills: Math.floor(Math.random() * 20) + 80,
            summary: Math.floor(Math.random() * 20) + 75
          },
          suggestions: [
            'Add more industry-specific keywords',
            'Consider adding a professional summary',
            'Quantify your achievements with numbers',
            'Use action verbs to describe your experience',
            'Include relevant certifications if any'
          ],
          keywords: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'AWS'],
          industryMatch: industry ? 'Good match' : 'Not specified',
          createdAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload CV: ' + error.message
    });
  }
});

// Get CV by ID
app.get('/api/v1/cv/:id', (req, res) => {
  const { id } = req.params;
  
  res.status(200).json({
    success: true,
    message: 'CV retrieved successfully',
    cv: {
      _id: id,
      userId: 'user_123',
      fileName: 'Sample_CV.pdf',
      fileType: 'application/pdf',
      fileSize: 1024 * 1024,
      metadata: {
        jobDescription: 'Senior Software Engineer position',
        industry: 'Technology',
        uploadedAt: new Date(Date.now() - 86400000)
      },
      analysis: {
        overallScore: 85,
        breakdown: {
          keywords: 90,
          formatting: 80,
          experience: 85,
          education: 90,
          skills: 85,
          summary: 80
        },
        suggestions: [
          'Add more industry-specific keywords',
          'Consider adding a professional summary',
          'Quantify your achievements with numbers'
        ],
        keywords: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'AWS'],
        industryMatch: 'Excellent match',
        createdAt: new Date(Date.now() - 86400000)
      },
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(Date.now() - 86400000)
    }
  });
});

// Get user's CVs
app.get('/api/v1/cv', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  const mockCVs = Array.from({ length: 5 }, (_, i) => ({
    _id: 'cv_' + (Date.now() - i * 86400000),
    userId: 'user_123',
    fileName: `CV_${i + 1}.pdf`,
    fileType: 'application/pdf',
    fileSize: (i + 1) * 512 * 1024,
    metadata: {
      jobDescription: `Job ${i + 1} description`,
      industry: ['Technology', 'Finance', 'Healthcare', 'Marketing', 'Education'][i],
      uploadedAt: new Date(Date.now() - i * 86400000)
    },
    analysis: {
      overallScore: 70 + i * 5,
      breakdown: {
        keywords: 75 + i * 3,
        formatting: 70 + i * 4,
        experience: 80 + i * 2,
        education: 85 + i * 1,
        skills: 75 + i * 3,
        summary: 70 + i * 4
      },
      createdAt: new Date(Date.now() - i * 86400000)
    },
    createdAt: new Date(Date.now() - i * 86400000),
    updatedAt: new Date(Date.now() - i * 86400000)
  }));
  
  res.status(200).json({
    success: true,
    message: 'CVs retrieved successfully',
    cvs: mockCVs,
    pagination: {
      page,
      limit,
      total: 15,
      pages: 2
    }
  });
});

// Simple Stripe endpoints
app.get('/api/v1/stripe/plans', (req, res) => {
  const plans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for trying out basic features',
      monthlyPrice: 0,
      features: [
        '1 CV analysis per month',
        'Basic ATS scoring',
        'Limited keyword suggestions',
        'Email support',
        'Watermarked exports'
      ],
      isConfigured: true
    },
    {
      id: 'basic',
      name: 'Basic',
      description: 'Essential CV optimization tools',
      monthlyPrice: 9.99,
      features: [
        '10 CV uploads per month',
        'Advanced ATS scoring',
        'Job description matching',
        'Score history tracking',
        'Light watermark exports',
        'Email support'
      ],
      priceId: 'price_mock_basic',
      isConfigured: true
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'Complete CV optimization suite',
      monthlyPrice: 19.99,
      features: [
        'Unlimited CV uploads',
        'Premium ATS scoring',
        'Voice-to-CV creation',
        'No watermark exports',
        'Priority email support',
        'Batch processing',
        'Advanced analytics'
      ],
      priceId: 'price_mock_premium',
      isConfigured: true
    }
  ];
  
  res.status(200).json({
    success: true,
    message: 'Subscription plans retrieved',
    plans,
    stripeConfigured: true
  });
});

app.get('/api/v1/stripe/config', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Stripe configuration retrieved',
    isConfigured: true,
    publishableKey: 'pk_test_mock_key',
    hasWebhookSecret: true,
    environment: 'development'
  });
});

app.post('/api/v1/stripe/create-checkout-session', (req, res) => {
  const { priceId } = req.body;
  
  if (!priceId) {
    return res.status(400).json({
      success: false,
      message: 'Price ID is required'
    });
  }
  
  // Mock Stripe checkout session
  res.status(200).json({
    success: true,
    message: 'Checkout session created',
    sessionId: 'cs_mock_' + Date.now(),
    url: 'https://checkout.stripe.com/mock-checkout'
  });
});

// Dashboard endpoint
app.get('/api/v1/dashboard', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dashboard data retrieved',
    stats: {
      totalCVs: 3,
      averageScore: 82,
      bestScore: 92,
      monthlyUploads: 1,
      monthlyLimit: 1
    },
    recentCVs: [
      {
        _id: 'cv_1',
        fileName: 'Software Engineer CV.pdf',
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        analysis: { overallScore: 85 }
      },
      {
        _id: 'cv_2',
        fileName: 'Product Manager CV.docx',
        createdAt: new Date(Date.now() - 172800000), // 2 days ago
        analysis: { overallScore: 78 }
      }
    ]
  });
});

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Simple Backend Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API: http://localhost:${PORT}/api/v1`);
});