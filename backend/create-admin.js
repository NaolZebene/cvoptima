/**
 * Script to create default admin account
 * Run: node create-admin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cvoptima';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// User model
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscription: {
    type: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'trialing'],
      default: 'active'
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  usage: {
    cvUploads: {
      currentMonth: {
        count: { type: Number, default: 0 },
        resetDate: { type: Date, default: () => {
          const now = new Date();
          return new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }}
      },
      total: { type: Number, default: 0 }
    },
    analyses: {
      currentMonth: {
        count: { type: Number, default: 0 },
        resetDate: { type: Date, default: () => {
          const now = new Date();
          return new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }}
      },
      total: { type: Number, default: 0 }
    },
    voiceTranscriptions: {
      currentMonth: {
        count: { type: Number, default: 0 },
        resetDate: { type: Date, default: () => {
          const now = new Date();
          return new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }}
      },
      total: { type: Number, default: 0 }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Create admin account
const createAdminAccount = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@cvoptima.com' });
    
    if (existingAdmin) {
      console.log('⚠️ Admin account already exists');
      console.log('Email: admin@cvoptima.com');
      console.log('Password: (use the one you set previously)');
      console.log('To reset password, delete the user and run this script again');
      return;
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin123!', salt);
    
    // Create admin user
    const adminUser = new User({
      email: 'admin@cvoptima.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      fullName: 'Admin User',
      role: 'admin',
      subscription: {
        type: 'premium',
        status: 'active',
        startedAt: new Date()
      },
      isEmailVerified: true,
      preferences: {
        notifications: {
          email: true,
          push: true
        },
        language: 'en',
        timezone: 'UTC'
      },
      usage: {
        cvUploads: {
          currentMonth: { count: 0 },
          total: 0
        },
        analyses: {
          currentMonth: { count: 0 },
          total: 0
        },
        voiceTranscriptions: {
          currentMonth: { count: 0 },
          total: 0
        }
      }
    });
    
    await adminUser.save();
    
    console.log('✅ Admin account created successfully!');
    console.log('📧 Email: admin@cvoptima.com');
    console.log('🔑 Password: Admin123!');
    console.log('👑 Role: admin');
    console.log('💎 Subscription: premium');
    console.log('\n⚠️ IMPORTANT: Change this password immediately after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
  }
};

// Run the script
(async () => {
  await connectDB();
  await createAdminAccount();
  
  // Close connection
  mongoose.connection.close();
  console.log('🔌 Database connection closed');
})();