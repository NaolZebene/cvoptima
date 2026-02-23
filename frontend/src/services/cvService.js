import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const cvService = {
  // Upload CV file
  async uploadCV(formData, onUploadProgress) {
    const response = await api.post('/cv/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(percentCompleted);
        }
      },
    });
    return response;
  },

  // Get all CVs for current user
  async getCVs(page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc') {
    const response = await api.get('/cv', {
      params: {
        page,
        limit,
        sortBy,
        sortOrder,
      },
    });
    return response;
  },

  // Get single CV by ID
  async getCVById(id) {
    const response = await api.get(`/cv/${id}`);
    return response;
  },

  // Update CV
  async updateCV(id, cvData) {
    const response = await api.put(`/cv/${id}`, cvData);
    return response;
  },

  // Delete CV
  async deleteCV(id) {
    const response = await api.delete(`/cv/${id}`);
    return response;
  },

  // Analyze CV with ATS scoring
  async analyzeCV(cvId, jobDescription = '') {
    const response = await api.post(`/ats/analyze/${cvId}`, {
      jobDescription,
    });
    return response;
  },

  // Get ATS score breakdown
  async getScoreBreakdown(cvId) {
    const response = await api.get(`/ats/score/${cvId}`);
    return response;
  },

  // Get suggestions for CV improvement
  async getSuggestions(cvId) {
    const response = await api.get(`/ats/suggestions/${cvId}`);
    return response;
  },

  // Get score history for CV
  async getScoreHistory(cvId, limit = 10) {
    const response = await api.get(`/scores/history/${cvId}`, {
      params: { limit },
    });
    return response;
  },

  // Get score trends
  async getScoreTrends(cvId, period = 'month') {
    const response = await api.get(`/scores/trends/${cvId}`, {
      params: { period },
    });
    return response;
  },

  // Compare CV with job description
  async compareWithJob(cvId, jobDescription) {
    const response = await api.post(`/ats/compare/${cvId}`, {
      jobDescription,
    });
    return response;
  },

  // Get industry-specific keywords
  async getIndustryKeywords(industry) {
    const response = await api.get(`/ats/keywords/${industry}`);
    return response;
  },

  // Share CV with token
  async shareCV(cvId, expiresIn = '7d') {
    const response = await api.post(`/cv/${id}/share`, {
      expiresIn,
    });
    return response;
  },

  // Get shared CV by token
  async getSharedCV(token) {
    const response = await api.get(`/share/${token}`);
    return response;
  },

  // Download CV file
  async downloadCV(cvId) {
    const response = await api.get(`/cv/${id}/download`, {
      responseType: 'blob',
    });
    return response;
  },

  // Process CV (extract text, analyze, etc.)
  async processCV(cvId) {
    const response = await api.post(`/cv/${id}/process`);
    return response;
  },

  // Get CV processing status
  async getProcessingStatus(cvId) {
    const response = await api.get(`/cv/${id}/status`);
    return response;
  },

  // Get CV statistics
  async getCVStats() {
    const response = await api.get('/cv/stats');
    return response;
  },

  // Export CV data
  async exportCVData(cvId, format = 'json') {
    const response = await api.get(`/cv/${id}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response;
  },

  // Batch analyze multiple CVs
  async batchAnalyze(cvIds, jobDescription = '') {
    const response = await api.post('/ats/batch-analyze', {
      cvIds,
      jobDescription,
    });
    return response;
  },

  // Get CV templates
  async getTemplates() {
    const response = await api.get('/cv/templates');
    return response;
  },

  // Apply template to CV
  async applyTemplate(cvId, templateId) {
    const response = await api.post(`/cv/${id}/template`, {
      templateId,
    });
    return response;
  },

  // Generate CV preview
  async generatePreview(cvId, templateId = 'default') {
    const response = await api.get(`/cv/${id}/preview`, {
      params: { templateId },
      responseType: 'blob',
    });
    return response;
  },

  // Optimize CV for specific job
  async optimizeForJob(cvId, jobDescription, optimizationLevel = 'standard') {
    const response = await api.post(`/cv/${id}/optimize`, {
      jobDescription,
      optimizationLevel,
    });
    return response;
  },
};

export default cvService;