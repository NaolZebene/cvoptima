import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Icons
import {
  DocumentTextIcon,
  ChartBarIcon,
  MicrophoneIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/outline';

const HomePage = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const features = [
    {
      name: 'ATS Score Analysis',
      description: 'Get instant ATS compatibility scores with detailed breakdowns and improvement suggestions.',
      icon: ChartBarIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Voice-Based CV Creation',
      description: 'Create professional CVs by simply speaking. Our AI transcribes and structures your experience.',
      icon: MicrophoneIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      name: 'Industry-Specific Optimization',
      description: 'Tailored keyword suggestions for tech, healthcare, finance, and more industries.',
      icon: ShieldCheckIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      name: 'Score Tracking & Analytics',
      description: 'Track your CV improvement over time with detailed analytics and progress reports.',
      icon: DocumentTextIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '€0',
      period: 'forever',
      description: 'Perfect for trying out basic features',
      features: [
        '1 CV analysis per month',
        'Basic ATS scoring',
        'Limited keyword suggestions',
        'Email support',
      ],
      buttonText: 'Get Started Free',
      buttonLink: '/register',
      highlighted: false,
    },
    {
      name: 'Basic',
      price: '€9.99',
      period: 'per month',
      description: 'For regular job seekers',
      features: [
        '10 CV analyses per month',
        'Advanced ATS scoring',
        'Industry keyword packs',
        'Priority email support',
        'Score history tracking',
      ],
      buttonText: 'Start Free Trial',
      buttonLink: '/subscription',
      highlighted: true,
    },
    {
      name: 'Premium',
      price: '€19.99',
      period: 'per month',
      description: 'For serious career advancement',
      features: [
        'Unlimited CV analyses',
        'Voice-based CV creation',
        'All industry keyword packs',
        'Priority phone support',
        'Advanced analytics dashboard',
        'Team collaboration features',
      ],
      buttonText: 'Start Free Trial',
      buttonLink: '/subscription',
      highlighted: false,
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block">Optimize Your CV for</span>
                  <span className="block text-blue-600">ATS Success</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Get instant ATS compatibility scores, voice-based CV creation, and industry-specific optimization to land more interviews.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    {isAuthenticated ? (
                      <Link
                        to="/dashboard"
                        className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                      >
                        Go to Dashboard
                        <ArrowRightIcon className="ml-2 h-5 w-5" />
                      </Link>
                    ) : (
                      <Link
                        to="/register"
                        className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                      >
                        Get Started Free
                        <ArrowRightIcon className="ml-2 h-5 w-5" />
                      </Link>
                    )}
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Link
                      to="/cv/upload"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 md:py-4 md:text-lg md:px-10"
                    >
                      Try CV Analysis
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-56 w-full bg-gradient-to-r from-blue-400 to-purple-600 sm:h-72 md:h-96 lg:w-full lg:h-full">
            <div className="h-full w-full flex items-center justify-center">
              <div className="relative w-4/5 h-4/5 bg-white rounded-lg shadow-2xl p-8">
                <div className="absolute -top-4 -left-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">
                  ATS Score: 92/100
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-green-600 font-bold">Keywords</div>
                      <div className="text-2xl font-bold">28/30</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-blue-600 font-bold">Formatting</div>
                      <div className="text-2xl font-bold">9/10</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to optimize your CV
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Our platform combines advanced AI with industry expertise to give you the best chance at landing interviews.
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              {features.map((feature) => (
                <div key={feature.name} className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-white text-white">
                    <div className={`h-10 w-10 rounded-md flex items-center justify-center ${feature.bgColor}`}>
                      <feature.icon className={`h-6 w-6 ${feature.color}`} aria-hidden="true" />
                    </div>
                  </div>
                  <div className="ml-16">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{feature.name}</h3>
                    <p className="mt-2 text-base text-gray-500">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center mb-12">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Pricing</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Choose the perfect plan for your needs
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Start with our free plan and upgrade as you need more features.
            </p>
          </div>

          <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`border rounded-lg shadow-sm divide-y divide-gray-200 ${
                  plan.highlighted ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200'
                }`}
              >
                <div className="p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">{plan.name}</h3>
                  <p className="mt-4">
                    <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                    <span className="text-base font-medium text-gray-500">/{plan.period}</span>
                  </p>
                  <p className="mt-4 text-sm text-gray-500">{plan.description}</p>
                  <Link
                    to={plan.buttonLink}
                    className={`mt-8 block w-full py-3 px-6 border border-transparent rounded-md text-center font-medium ${
                      plan.highlighted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    {plan.buttonText}
                  </Link>
                </div>
                <div className="pt-6 pb-8 px-6">
                  <h4 className="text-sm font-medium text-gray-900 tracking-wide uppercase">What's included</h4>
                  <ul className="mt-6 space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex space-x-3">
                        <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500" aria-hidden="true" />
                        <span className="text-sm text-gray-500">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to optimize your CV?</span>
            <span className="block text-blue-200">Start your free trial today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
              >
                Get started for free
              </Link>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link
                to="/cv/upload"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-500 hover:bg-blue-400"
              >
                Try CV analysis
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;