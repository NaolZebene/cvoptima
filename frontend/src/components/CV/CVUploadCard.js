import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useDispatch, useSelector } from 'react-redux';
import { uploadCV, setUploadProgress, resetUploadProgress } from '../../store/slices/cvSlice';
import toast from 'react-hot-toast';

// Icons
import {
  DocumentTextIcon,
  XIcon,
  CloudUploadIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/outline';

const CVUploadCard = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [jobDescription, setJobDescription] = useState('');
  
  const dispatch = useDispatch();
  const { isUploading, uploadProgress, error } = useSelector((state) => state.cv);
  const { user } = useSelector((state) => state.auth);

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

    try {
      await dispatch(uploadCV(formData)).unwrap();
      toast.success('CV uploaded successfully!');
      handleClose();
    } catch (err) {
      toast.error(err || 'Failed to upload CV');
    }
  };

  const handleClose = () => {
    setFiles([]);
    setJobDescription('');
    setIsOpen(false);
    dispatch(resetUploadProgress());
    
    // Revoke object URLs
    files.forEach(file => URL.revokeObjectURL(file.preview));
  };

  const removeFile = (fileToRemove) => {
    setFiles(files.filter(file => file !== fileToRemove));
    URL.revokeObjectURL(fileToRemove.preview);
  };

  // Check subscription limits
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

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          <CloudUploadIcon className="h-6 w-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <CloudUploadIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Upload CV
                </h3>
                
                {/* Subscription limit warning */}
                {!canUpload() && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex">
                      <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" />
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-yellow-800">
                          Upload Limit Reached
                        </h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          You've reached your monthly upload limit. Upgrade your plan to upload more CVs.
                        </p>
                        <button
                          onClick={() => window.location.href = '/subscription'}
                          className="mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900"
                        >
                          Upgrade now →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dropzone */}
                {canUpload() && (
                  <>
                    <div className="mt-4">
                      <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                          isDragActive
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <input {...getInputProps()} />
                        <CloudUploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          {isDragActive
                            ? 'Drop the file here...'
                            : 'Drag & drop your CV here, or click to select'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          PDF or DOCX up to 10MB
                        </p>
                      </div>
                    </div>

                    {/* Selected files */}
                    {files.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Selected File
                        </h4>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {files[0].name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(files[0].size / 1024 / 1024).toFixed(2)} MB
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

                    {/* Job description */}
                    <div className="mt-4">
                      <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700">
                        Job Description (Optional)
                      </label>
                      <textarea
                        id="jobDescription"
                        rows="3"
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        className="mt-1 form-input"
                        placeholder="Paste the job description for targeted analysis..."
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Adding a job description will provide more targeted analysis and scoring.
                      </p>
                    </div>

                    {/* Upload progress */}
                    {isUploading && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {canUpload() ? (
              <>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading || files.length === 0}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <div className="spinner mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    'Upload & Analyze'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isUploading}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVUploadCard;