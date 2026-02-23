import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Icons
import {
  DocumentTextIcon,
  ChartBarIcon,
  MicrophoneIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  UploadIcon,
  SparklesIcon,
  TrendingUpIcon,
  UserGroupIcon,
} from '@heroicons/react/outline';

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  const handleTryDemo = () => {
    // Open static demo in new tab
    window.open('/static-demo.html', '_blank');
  };

  const features = [
    {
      name: 'Instant ATS Scoring',
      description: 'Get your CV scored in seconds. See exactly how applicant tracking systems view your resume.',
      icon: ChartBarIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      stats: '95% accuracy',
    },
    {
      name: 'Voice-to-CV AI',
      description: 'Speak your experience, get a professional CV. Powered by DeepSeek AI transcription.',
      icon: MicrophoneIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      stats: '12 languages',
    },
    {
      name: 'Smart Optimization',
      description: 'AI-powered suggestions to improve keywords, formatting, and content for your industry.',
      icon: SparklesIcon,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      stats: '50+ industries',
    },
    {
      name: 'Progress Tracking',
      description: 'Watch your scores improve over time with detailed analytics and improvement reports.',
      icon: TrendingUpIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      stats: 'Track history',
    },
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Upload Your CV',
      description: 'Drag & drop your PDF or DOCX file. We support all major formats.',
      icon: UploadIcon,
    },
    {
      step: 2,
      title: 'Get Instant Analysis',
      description: 'Our AI analyzes your CV against ATS systems in real-time.',
      icon: ChartBarIcon,
    },
    {
      step: 3,
      title: 'Receive AI Suggestions',
      description: 'Get specific, actionable recommendations to improve your score.',
      icon: SparklesIcon,
    },
    {
      step: 4,
      title: 'Download & Apply',
      description: 'Export your optimized CV and start getting more interviews.',
      icon: DocumentTextIcon,
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Software Engineer',
      company: 'TechCorp',
      content: 'Increased my interview calls by 300% after optimizing my CV with CVOptima.',
      avatar: 'SC',
    },
    {
      name: 'Marcus Johnson',
      role: 'Marketing Director',
      company: 'GrowthLabs',
      content: 'The voice-to-CV feature saved me hours. Finally a tool that understands busy professionals.',
      avatar: 'MJ',
    },
    {
      name: 'Priya Sharma',
      role: 'Healthcare Admin',
      company: 'MediCare Plus',
      content: 'Industry-specific suggestions were spot on. My CV now speaks the right language.',
      avatar: 'PS',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Get Your CV <span className="text-blue-600">ATS-Ready</span> in Minutes
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
            AI-powered CV optimization that helps you pass applicant tracking systems and land more interviews. 
            Free to start, powerful results.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </button>
            <button
              onClick={handleTryDemo}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-gray-50 transition-colors"
            >
              Try Live Demo
              <SparklesIcon className="ml-2 h-5 w-5" />
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            No credit card required • Free plan includes 1 CV analysis per month
          </p>
        </div>

        {/* Hero Image/Preview */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
            <div className="aspect-video bg-gradient-to-r from-blue-50 to-purple-50 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-800 mb-2">CV Analysis Preview</h3>
                <p className="text-gray-600">Upload your CV to see your personalized ATS score</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need for CV Success
            </h2>
            <p className="text-xl text-gray-600">
              Professional tools used by thousands of job seekers
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="bg-white p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all"
              >
                <div className={`inline-flex p-3 rounded-xl ${feature.bgColor} mb-4`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.name}</h3>
                <p className="text-gray-600 mb-3">{feature.description}</p>
                <span className="text-sm font-medium text-gray-500">{feature.stats}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How CVOptima Works
            </h2>
            <p className="text-xl text-gray-600">
              Get from upload to optimized CV in 4 simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step) => (
              <div key={step.step} className="relative">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-full text-lg font-bold mb-4">
                    {step.step}
                  </div>
                  <div className="inline-flex p-3 rounded-xl bg-gray-100 mb-4">
                    <step.icon className="h-6 w-6 text-gray-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
                {step.step < 4 && (
                  <div className="hidden lg:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
                    <ArrowRightIcon className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Trusted by Professionals
            </h2>
            <p className="text-xl text-gray-600">
              See what our users are saying
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="bg-gray-50 p-6 rounded-2xl border border-gray-200"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.role} • {testimonial.company}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">"{testimonial.content}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Optimize Your CV?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of professionals who are getting more interviews with CVOptima
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-blue-600 bg-white rounded-xl hover:bg-gray-50 transition-colors"
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial'}
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </button>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-transparent rounded-xl border-2 border-white hover:bg-white/10 transition-colors"
            >
              View Pricing Plans
            </Link>
          </div>
          <p className="mt-6 text-blue-200 text-sm">
            Free plan includes: 1 CV analysis/month • Basic ATS scoring • Email support
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">CVOptima</h3>
              <p className="text-gray-400">
                AI-powered CV optimization for the modern job seeker.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/features" className="hover:text-white">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link to="/demo" className="hover:text-white">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/about" className="hover:text-white">About</Link></li>
                <li><Link to="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/privacy" className="hover:text-white">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-white">Terms</Link></li>
                <li><Link to="/cookies" className="hover:text-white">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} CVOptima. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;