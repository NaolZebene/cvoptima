/**
 * File upload middleware using Multer
 * Handles CV file uploads (PDF and DOCX)
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createError } = require('./error-handlers');

// Allowed file types for CV uploads
const ALLOWED_MIME_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
};

const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Upload directory
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Disk storage configuration for Multer
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create user-specific directory if user is authenticated
    let userDir = UPLOAD_DIR;
    
    if (req.user && req.user.id) {
      userDir = path.join(UPLOAD_DIR, req.user.id);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
    }
    
    cb(null, userDir);
  },
  
  filename: (req, file, cb) => {
    // Generate unique filename: cv_timestamp_random.extension
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.originalname).toLowerCase();
    
    // Use original extension or default based on mimetype
    const finalExtension = extension || ALLOWED_MIME_TYPES[file.mimetype] || '.bin';
    
    const filename = `cv_${timestamp}_${random}${finalExtension}`;
    cb(null, filename);
  }
});

/**
 * File filter for Multer
 */
const fileFilter = (req, file, cb) => {
  // Check file type
  if (ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(createError(
      `Only PDF and DOCX files are allowed. Received: ${file.mimetype}`,
      400,
      'ValidationError'
    ), false);
  }
};

/**
 * Multer configuration
 */
const multerConfig = {
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Maximum 1 file per request
  }
};

/**
 * Multer middleware instance
 */
const upload = multer(multerConfig);

/**
 * Single file upload middleware for CVs
 */
const uploadSingleCV = upload.single('cvFile');

/**
 * Audio file filter for voice uploads
 */
const audioFileFilter = (req, file, cb) => {
  const allowedMimeTypes = {
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'audio/wav': '.wav',
    'audio/webm': '.webm',
    'audio/x-m4a': '.m4a',
    'audio/x-wav': '.wav'
  };
  
  const allowedExtensions = ['.mp3', '.m4a', '.wav', '.webm'];
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  // Check MIME type
  if (allowedMimeTypes[file.mimetype]) {
    // Check extension matches MIME type
    if (allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file extension for audio: ${fileExt}. Allowed: ${allowedExtensions.join(', ')}`), false);
    }
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only audio files are allowed.`), false);
  }
};

/**
 * Multer configuration for audio files
 */
const audioMulterConfig = {
  storage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB for audio (Whisper limit)
    files: 1
  }
};

/**
 * Multer middleware instance for audio files
 */
const uploadAudio = multer(audioMulterConfig);

/**
 * Single audio file upload middleware
 */
const uploadSingleAudio = uploadAudio.single('audio');

/**
 * Memory storage for immediate processing (without saving to disk)
 */
const memoryStorage = multer.memoryStorage();

const memoryUpload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

const uploadToMemory = memoryUpload.single('cvFile');

/**
 * Validate file type by extension
 * @param {string} filename - File name to validate
 * @returns {boolean} True if file type is allowed
 */
const validateFileType = (filename) => {
  const extension = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(extension);
};

/**
 * Get allowed file extensions
 * @returns {string[]} Array of allowed extensions
 */
const getAllowedExtensions = () => {
  return [...ALLOWED_EXTENSIONS];
};

/**
 * Get maximum file size in bytes
 * @returns {number} Maximum file size in bytes
 */
const getMaxFileSize = () => {
  return MAX_FILE_SIZE;
};

/**
 * Get maximum file size in human-readable format
 * @returns {string} Human-readable file size
 */
const getMaxFileSizeHuman = () => {
  const sizeInMB = MAX_FILE_SIZE / (1024 * 1024);
  return `${sizeInMB}MB`;
};

/**
 * Handle Multer upload errors
 * @param {Error} error - Multer error
 * @returns {Error} Formatted error
 */
const handleUploadError = (error) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return createError(
          `File too large. Maximum size is ${getMaxFileSizeHuman()}`,
          413,
          'ValidationError'
        );
      case 'LIMIT_FILE_COUNT':
        return createError('Too many files. Maximum 1 file allowed', 413, 'ValidationError');
      case 'LIMIT_UNEXPECTED_FILE':
        return createError('Unexpected file field', 400, 'ValidationError');
      default:
        return createError(`File upload error: ${error.message}`, 400, 'ValidationError');
    }
  }
  
  return error;
};

/**
 * Cleanup temporary files
 * @param {string} filePath - Path to file to delete
 * @returns {Promise<void>}
 */
const cleanupTempFile = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (error) {
    console.error('Error cleaning up temp file:', error);
  }
};

/**
 * Cleanup all files in a directory (for user cleanup)
 * @param {string} directory - Directory to clean
 * @returns {Promise<void>}
 */
const cleanupDirectory = async (directory) => {
  try {
    if (fs.existsSync(directory)) {
      const files = await fs.promises.readdir(directory);
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        await cleanupTempFile(filePath);
      }
      
      // Remove empty directory
      await fs.promises.rmdir(directory);
    }
  } catch (error) {
    console.error('Error cleaning up directory:', error);
  }
};

/**
 * Get file information
 * @param {Object} file - Multer file object
 * @returns {Object} File information
 */
const getFileInfo = (file) => {
  if (!file) return null;
  
  return {
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype,
    extension: path.extname(file.originalname).toLowerCase(),
    uploadedAt: new Date()
  };
};

/**
 * Validate uploaded file
 * @param {Object} file - Multer file object
 * @returns {Object} Validation result
 */
const validateUploadedFile = (file) => {
  if (!file) {
    return {
      valid: false,
      error: 'No file uploaded'
    };
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${getMaxFileSizeHuman()}`
    };
  }
  
  // Check file type
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
    };
  }
  
  return {
    valid: true,
    fileInfo: getFileInfo(file)
  };
};

/**
 * Middleware wrapper for file upload with error handling
 */
const uploadCV = (req, res, next) => {
  uploadSingleCV(req, res, (error) => {
    if (error) {
      return next(handleUploadError(error));
    }
    
    // Validate the uploaded file
    const validation = validateUploadedFile(req.file);
    if (!validation.valid) {
      // Cleanup the uploaded file if invalid
      if (req.file && req.file.path) {
        cleanupTempFile(req.file.path);
      }
      return next(createError(validation.error, 400, 'ValidationError'));
    }
    
    // Attach file info to request
    req.fileInfo = validation.fileInfo;
    next();
  });
};

/**
 * Middleware for memory upload (process without saving)
 */
const uploadCVToMemory = (req, res, next) => {
  uploadToMemory(req, res, (error) => {
    if (error) {
      return next(handleUploadError(error));
    }
    
    // Validate the uploaded file
    const validation = validateUploadedFile(req.file);
    if (!validation.valid) {
      return next(createError(validation.error, 400, 'ValidationError'));
    }
    
    // Attach file info to request
    req.fileInfo = validation.fileInfo;
    next();
  });
};

module.exports = {
  upload: uploadCV,
  uploadToMemory: uploadCVToMemory,
  uploadSingleAudio,
  validateFileType,
  getAllowedExtensions,
  getMaxFileSize,
  getMaxFileSizeHuman,
  handleUploadError,
  cleanupTempFile,
  cleanupDirectory,
  getFileInfo,
  validateUploadedFile,
  UPLOAD_DIR,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE
};