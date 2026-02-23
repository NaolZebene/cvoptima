import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getCVById, updateCV } from '../../store/slices/cvSlice';
import toast from 'react-hot-toast';

// Icons
import {
  ArrowLeftIcon,
  SaveIcon,
  EyeIcon,
  DownloadIcon,
  RefreshIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
} from '@heroicons/react/outline';

const CVEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');
  const [formData, setFormData] = useState({
    personal: {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      portfolio: '',
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
  });
  
  const { currentCV, isLoading } = useSelector((state) => state.cv);

  useEffect(() => {
    if (id) {
      dispatch(getCVById(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (currentCV) {
      // Parse CV data into form structure
      // This is a simplified version - in a real app, you'd parse the extracted text
      setFormData({
        personal: {
          name: currentCV.extractedData?.name || '',
          email: currentCV.extractedData?.email || '',
          phone: currentCV.extractedData?.phone || '',
          location: currentCV.extractedData?.location || '',
          linkedin: currentCV.extractedData?.linkedin || '',
          portfolio: currentCV.extractedData?.portfolio || '',
        },
        summary: currentCV.extractedData?.summary || '',
        experience: currentCV.extractedData?.experience || [],
        education: currentCV.extractedData?.education || [],
        skills: currentCV.extractedData?.skills || [],
        certifications: currentCV.extractedData?.certifications || [],
        projects: currentCV.extractedData?.projects || [],
      });
    }
  }, [currentCV]);

  const handleInputChange = (section, field, value) => {
    if (section === 'personal') {
      setFormData(prev => ({
        ...prev,
        personal: {
          ...prev.personal,
          [field]: value,
        },
      }));
    } else if (['experience', 'education', 'skills', 'certifications', 'projects'].includes(section)) {
      // For array sections, we need index
      const [sectionName, index] = field.split('-');
      const idx = parseInt(index);
      
      setFormData(prev => ({
        ...prev,
        [section]: prev[section].map((item, i) => 
          i === idx ? { ...item, [sectionName]: value } : item
        ),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: value,
      }));
    }
  };

  const addItem = (section) => {
    const template = {
      experience: { title: '', company: '', location: '', startDate: '', endDate: '', description: '' },
      education: { degree: '', institution: '', location: '', year: '', gpa: '' },
      skills: { category: '', items: '' },
      certifications: { name: '', issuer: '', date: '', credentialId: '' },
      projects: { name: '', description: '', technologies: '', url: '' },
    };

    setFormData(prev => ({
      ...prev,
      [section]: [...prev[section], template[section]],
    }));
  };

  const removeItem = (section, index) => {
    setFormData(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!id) return;

    setIsSaving(true);
    try {
      // Prepare data for API
      const updateData = {
        extractedData: formData,
        lastEdited: new Date().toISOString(),
      };

      await dispatch(updateCV({ id, cvData: updateData })).unwrap();
      toast.success('CV saved successfully!');
      setIsEditing(false);
    } catch (err) {
      toast.error(err || 'Failed to save CV');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    toast.success('Opening preview...');
    // In a real app, this would open a preview modal or new tab
  };

  const handleReanalyze = () => {
    toast.loading('Re-analyzing CV...');
    // In a real app, this would trigger re-analysis
    setTimeout(() => {
      toast.success('CV re-analyzed!');
    }, 2000);
  };

  const sections = [
    { id: 'personal', name: 'Personal Info', icon: '👤' },
    { id: 'summary', name: 'Summary', icon: '📝' },
    { id: 'experience', name: 'Experience', icon: '💼' },
    { id: 'education', name: 'Education', icon: '🎓' },
    { id: 'skills', name: 'Skills', icon: '🛠️' },
    { id: 'certifications', name: 'Certifications', icon: '📜' },
    { id: 'projects', name: 'Projects', icon: '🚀' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading CV editor...</p>
        </div>
      </div>
    );
  }

  if (!currentCV) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">CV not found</h3>
          <p className="mt-2 text-gray-600">The CV you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <button
              onClick={() => navigate(`/cv/${id}/analysis`)}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Analysis
            </button>
            
            <h1 className="text-3xl font-bold text-gray-900">
              Edit CV: {currentCV.fileName || 'Untitled CV'}
            </h1>
            <p className="mt-2 text-gray-600">
              Edit your CV content and improve your ATS score.
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button
              onClick={handlePreview}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <EyeIcon className="mr-2 h-4 w-4" />
              Preview
            </button>
            <button
              onClick={handleReanalyze}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshIcon className="mr-2 h-4 w-4" />
              Re-analyze
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <SaveIcon className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar navigation */}
        <div className="lg:w-64">
          <div className="bg-white rounded-xl shadow-card p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Sections</h3>
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg mr-3">{section.icon}</span>
                  {section.name}
                  {section.id === 'experience' && formData.experience.length > 0 && (
                    <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                      {formData.experience.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Tips</h4>
              <ul className="text-xs text-gray-600 space-y-2">
                <li className="flex items-start">
                  <CheckCircleIcon className="h-3 w-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Use action verbs (developed, managed, increased)
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-3 w-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Add quantifiable results with numbers
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-3 w-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Keep bullet points concise (1-2 lines)
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-3 w-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Include relevant keywords from job description
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main editor */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-card p-6">
            {/* Personal Info Section */}
            {activeSection === 'personal' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">Full Name *</label>
                      <input
                        type="text"
                        value={formData.personal.name}
                        onChange={(e) => handleInputChange('personal', 'name', e.target.value)}
                        className="form-input"
                        placeholder="John Doe"
                      />
                    </div>
                    
                    <div>
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        value={formData.personal.email}
                        onChange={(e) => handleInputChange('personal', 'email', e.target.value)}
                        className="form-input"
                        placeholder="john@example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        value={formData.personal.phone}
                        onChange={(e) => handleInputChange('personal', 'phone', e.target.value)}
                        className="form-input"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    
                    <div>
                      <label className="form-label">Location</label>
                      <input
                        type="text"
                        value={formData.personal.location}
                        onChange={(e) => handleInputChange('personal', 'location', e.target.value)}
                        className="form-input"
                        placeholder="City, Country"
                      />
                    </div>
                    
                    <div>
                      <label className="form-label">LinkedIn URL</label>
                      <input
                        type="url"
                        value={formData.personal.linkedin}
                        onChange={(e) => handleInputChange('personal', 'linkedin', e.target.value)}
                        className="form-input"
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                    
                    <div>
                      <label className="form-label">Portfolio/Website</label>
                      <input
                        type="url"
                        value={formData.personal.portfolio}
                        onChange={(e) => handleInputChange('personal', 'portfolio', e.target.value)}
                        className="form-input"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Section */}
            {activeSection === 'summary' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Professional Summary</h2>
                <div>
                  <label className="form-label">
                    Write a compelling summary (2-3 sentences recommended)
                  </label>
                  <textarea
                    value={formData.summary}
                    onChange={(e) => handleInputChange('summary', 'summary', e.target.value)}
                    rows="6"
                    className="form-input"
                    placeholder="Experienced software engineer with 5+ years in full-stack development. Specialized in JavaScript, React, and Node.js. Passionate about building scalable applications and mentoring junior developers."
                  />
                  <div className="mt-2 text-sm text-gray-500">
                    {formData.summary.length} characters • Aim for 150-250 characters
                  </div>
                </div>
              </div>
            )}

            {/* Experience Section */}
            {activeSection === 'experience' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Work Experience</h2>
                  <button
                    onClick={() => addItem('experience')}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Experience
                  </button>
                </div>
                
                {formData.experience.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No experience added</h3>
                    <p className="mt-2 text-gray-600">
                      Add your work experience to improve your CV score.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {formData.experience.map((exp, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-medium text-gray-900">Experience #{index + 1}</h3>
                          <button
                            onClick={() => removeItem('experience', index)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="form-label">Job Title *</label>
                            <input
                              type="text"
                              value={exp.title || ''}
                              onChange={(e) => handleInputChange('experience', `title-${index}`, e.target.value)}
                              className="form-input"
                              placeholder="Senior Software Engineer"
                            />
                          </div>
                          
                          <div>
                            <label className="form-label">Company *</label>
                            <input
                              type="text"
                              value={exp.company || ''}
                              onChange={(e) => handleInputChange('experience', `company-${index}`, e.target.value)}
                              className="form-input"
                              placeholder="TechCorp Inc."
                            />
                          </div>
                          
                          <div>
                            <label className="form-label">Location</label>
                            <input
                              type="text"
                              value={exp.location || ''}
                              onChange={(e) => handleInputChange('experience', `location-${index}`, e.target.value)}
                              className="form-input"
                              placeholder="San Francisco, CA"
                            />
                          </div>
                          
                          <div>
                            <label className="form-label">Start Date</label>
                            <input
                              type="text"
                              value={exp.startDate || ''}
                              onChange={(e) => handleInputChange('experience', `startDate-${index}`, e.target.value)}
                              className="form-input"
                              placeholder="Jan 2020"
                            />
                          </div>
                          
                          <div>
                            <label className="form-label">End Date</label>
                            <input
                              type="text"
                              value={exp.endDate || ''}
                              onChange={(e) => handleInputChange('experience', `endDate-${index}`, e.target.value)}
                              className="form-input"
                              placeholder="Present"
                            />
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <label className="form-label">Description *</label>
                          <textarea
                            value={exp.description || ''}
                            onChange={(e) => handleInputChange('experience', `description-${index}`, e.target.value)}
                            rows="3"
                            className="form-input"
                            placeholder="• Led a team of 5 developers to build a scalable e-commerce platform
• Increased application performance by 40% through optimization
• Implemented CI/CD pipelines reducing deployment time by 60%"
                          />
                          <div className="mt-1 text-sm text-gray-500">
                            Use bullet points for achievements. Include quantifiable results.
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Education Section */}
            {activeSection === 'education' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Education</h2>
                  <button
                    onClick={() => addItem('education')}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Education
                  </button>
                </div>
                
                {formData.education.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No education added</h3>
                    <p className="mt-2 text-gray-600">
                      Add your educational background.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.education.map((edu, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-medium text-gray-900">Education #{index + 1}</h3>
                          <button
                            onClick={() => removeItem('education', index)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="form-label">Degree *</label>
                            <input
                              type="text"
                              value={edu.degree || ''}
                              onChange={(e) => handleInputChange('education', `degree-${index}`, e.target.value)}
                              className="form-input"
                              placeholder="Bachelor of Science in Computer Science"
                            />
                          </div>
                          
                          <div>
                            <label className="form-label">Institution *</label>
                            <input
                              type="text"
                              value={edu.institution || ''}
                              onChange={(e) => handleInputChange('education', `institution-${index}`, e.target.value)}
                              className="form-input"
                              placeholder="State University"
                            />
                          </div>
                          
                          <div>
                            <label className="form-label">Location</label>
                            <input
                              type="text"
                              value={edu.location || ''}
                              onChange={(e) => handleInputChange('education', `location-${index}`, e.target.value)}
                              className="form-input"
                              placeholder="City, State"
                            />
                          </div>
                          
                          <div>
                            <label className="form-label">Year</label>
                            <input
                              type="text"
                              value={edu.year || ''}
                              onChange={(e) => handleInputChange('education', `year-${index}`, e.target.value)}
                              className="form-input"
                              placeholder="2020"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Skills Section */}
            {activeSection === 'skills' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Skills</h2>
                  <button
                    onClick={() => addItem('skills')}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Skill Category
                  </button>
                </div>
                
                {formData.skills.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No skills added</h3>
                    <p className="mt-2 text-gray-600">
                      Add your technical and professional skills.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.skills.map((skill, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-medium text-gray-900">Skill Category #{index + 1}</h3>
                          <button
                            onClick={() => removeItem('skills', index)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="form-label">Category *</label>
                            <input
                              type="text"
                              value={skill.category || ''}
                              onChange={(e) => handleInputChange('skills', `category-${index}`, e.target.value)}
                              className="form-input"
                              placeholder="Programming Languages"
                            />
                          </div>
                          
                          <div>
                            <label className="form-label">Skills *</label>
                            <input
                              type="text"
                              value={skill.items || ''}
                              onChange={(e) => handleInputChange('skills', `items-${index}`, e.target.value)}
                              className="form-input"
                              placeholder="JavaScript, Python, Java, C++"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons at bottom */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between">
              <div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {isEditing ? 'Cancel Editing' : 'Enable Editing'}
                </button>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handlePreview}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <EyeIcon className="inline h-4 w-4 mr-2" />
                  Preview
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <SaveIcon className="inline h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save CV'}
                </button>
              </div>
            </div>
          </div>

          {/* Score improvement tips */}
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Improvement Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-lg">
                <div className="flex items-center mb-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  <span className="font-medium text-gray-900">Keywords</span>
                </div>
                <p className="text-sm text-gray-600">
                  Add industry-specific keywords from job descriptions to increase your score.
                </p>
              </div>
              
              <div className="p-3 bg-white rounded-lg">
                <div className="flex items-center mb-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  <span className="font-medium text-gray-900">Quantifiable Results</span>
                </div>
                <p className="text-sm text-gray-600">
                  Include numbers and percentages to demonstrate impact (e.g., "increased sales by 35%").
                </p>
              </div>
              
              <div className="p-3 bg-white rounded-lg">
                <div className="flex items-center mb-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  <span className="font-medium text-gray-900">Action Verbs</span>
                </div>
                <p className="text-sm text-gray-600">
                  Start bullet points with strong action verbs: developed, managed, implemented, increased.
                </p>
              </div>
              
              <div className="p-3 bg-white rounded-lg">
                <div className="flex items-center mb-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  <span className="font-medium text-gray-900">Formatting</span>
                </div>
                <p className="text-sm text-gray-600">
                  Use consistent formatting, clear headings, and bullet points for better readability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVEditorPage;