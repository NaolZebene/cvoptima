import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { uploadCV } from '../../store/slices/cvSlice';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

// Icons
import {
  DocumentTextIcon,
  CloudUploadIcon,
  XIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/outline';

const CVUploadPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [files, setFiles] = useState([]);
  const [jobDescription, setJobDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const { isUploading, uploadProgress } = useSelector((state) => state.cv);
  const { user } = useSelector((state) => state.auth);

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Marketing',
    'Education',
    'Engineering',
    'Design',
    'Sales',
    'Operations',
    'Other',
  ];

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    })));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDropRejected: (rejectedFiles) => {
      const file = rejectedFiles[0];
      if (file.errors[0].code === 'file-too-large') {
        toast.error('File is too large. Maximum size is 10MB.');
      } else if (file.errors[0].code === 'file-invalid-type') {
        toast.error('Invalid file type. Please upload PDF or DOCX files.');
      } else {
        toast.error('File rejected. Please try again.');
      }
    },
  });

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('cv', files[0]);
    
    if (jobDescription.trim()) {
      formData.append('jobDescription', jobDescription.trim());
    }
    
    if (industry) {
      formData.append('industry', industry);
    }

    try {
      const result = await dispatch(uploadCV(formData)).unwrap();
      toast.success('CV uploaded successfully!');
      
      // Navigate to analysis page
      navigate(`/cv/${result._id}/analysis`);
    } catch (err) {
      toast.error(err || 'Failed to upload CV');
    }
  };

  const removeFile = (fileToRemove) => {
    setFiles(files.filter(file => file !== fileToRemove));
    URL.revokeObjectURL(fileToRemove.preview);
  };

  const canUpload = () => {
    if (!user) return false;
    
    const subscription = user.subscription?.type || 'free';
    const monthlyUploads = user.usage?.monthlyUploads || 0;
    
    const limits = {
      free: 1,
      basic: 10,
      premium: 100,
      enterprise: 1000,
    };
    
    return monthlyUploads < (limits[subscription] || 1);
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) {
      return (
        <div className="p-3 bg-red-50 rounded-lg">
          <DocumentTextIcon className="h-8 w-8 text-red-600" />
        </div>
      );
    } else if (fileType.includes('word') || fileType.includes('doc')) {
      return (
        <div className="p-3 bg-blue-50 rounded-lg">
          <DocumentTextIcon className="h-8 w-8 text-blue-600" />
        </div>
      );
    }
    return (
      <div className="p-3 bg-gray-50 rounded-lg">
        <DocumentTextIcon className="h-8 w-8 text-gray-600" />
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload CV</h1>
        <p className="mt-2 text-gray-600">
          Upload your CV to get instant ATS scoring and improvement suggestions.
        </p>
      </div>

      {/* Subscription limit warning */}
      {!canUpload() && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Upload Limit Reached
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                You've reached your monthly upload limit. Upgrade your plan to upload more CVs.
              </p>
              <a
                href="/subscription"
                className="mt-2 inline-block text-sm font-medium text-yellow-800 hover:text-yellow-900"
              >
                Upgrade now →
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Upload area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload card */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload CV File</h2>
            
            {canUpload() ? (
              <>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <CloudUploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-4 text-lg font-medium text-gray-900">
                    {isDragActive ? 'Drop the file here...' : 'Drag & drop your CV here'}
                  </p>
                  <p className="mt-2 text-gray-600">or click to browse files</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Supports PDF, DOCX up to 10MB
                  </p>
                </div>

                {/* Selected file preview */}
                {files.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Selected File</h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        {getFileIcon(files[0].type)}
                        <div className="ml-4">
                          <p className="font-medium text-gray-900">{files[0].name}</p>
                          <p className="text-sm text-gray-500">
                            {(files[0].size / 1024 / 1024).toFixed(2)} MB • {files[0].type}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(files[0])}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <XIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload progress */}
                {isUploading && (
                  <div className="mt-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <ExclamationCircleIcon className="mx-auto h-12 w-12 text-yellow-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Upload Limit Reached</h3>
                <p className="mt-2 text-gray-600">
                  You've used all your free CV uploads this month. Upgrade to continue.
                </p>
                <a
                  href="/subscription"
                  className="mt-4 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Upgrade Plan
                </a>
              </div>
            )}
          </div>

          {/* Job description card */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Job Description (Optional)
              <span className="ml-2 text-sm font-normal text-gray-500">
                - For targeted analysis
              </span>
            </h2>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows="6"
              className="w-full form-input"
              placeholder="Paste the job description you're applying for. This helps us provide more targeted analysis and scoring..."
            />
            <div className="mt-3 flex items-start text-sm text-gray-500">
              <InformationCircleIcon className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
              <p>
                Adding a job description allows us to match your CV against specific keywords and requirements,
                giving you a more accurate ATS score and better improvement suggestions.
              </p>
            </div>
          </div>
        </div>

        {/* Right column - Info and actions */}
        <div className="space-y-6">
          {/* Industry selection */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Industry</h2>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full form-input"
            >
              <option value="">Select industry (optional)</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
            <div className="mt-3 text-sm text-gray-500">
              Selecting your industry helps us provide industry-specific keyword suggestions.
            </div>
          </div>

          {/* Upload info card */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">What happens next?</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900">Text Extraction</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    We'll extract text from your CV and identify key sections.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900">ATS Analysis</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Your CV will be scored against ATS systems with detailed breakdown.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <InformationCircleIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900">Improvement Suggestions</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Get actionable suggestions to improve your CV score.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <button
              onClick={handleUpload}
              disabled={isUploading || files.length === 0 || !canUpload()}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? (
                <div className="flex items-center justify-center">
                  <div className="spinner mr-2"></div>
                  Uploading...
                </div>
              ) : (
                'Upload & Analyze'
              )}
            </button>
            
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/voice/create')}
                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                Or create CV from voice →
              </button>
            </div>
          </div>

          {/* Tips card */}
          <div className="bg-blue-50 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Tips for better scores</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Use standard fonts (Arial, Calibri, Times New Roman)
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Include relevant keywords from job description
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Keep formatting simple and consistent
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Use bullet points for achievements
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVUploadPage;