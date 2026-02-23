import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import cvService from '../../services/cvService';

// Async thunks
export const uploadCV = createAsyncThunk(
  'cv/uploadCV',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await cvService.uploadCV(formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'CV upload failed');
    }
  }
);

export const getCVs = createAsyncThunk(
  'cv/getCVs',
  async ({ page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await cvService.getCVs(page, limit);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch CVs');
    }
  }
);

export const getCVById = createAsyncThunk(
  'cv/getCVById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await cvService.getCVById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch CV');
    }
  }
);

export const updateCV = createAsyncThunk(
  'cv/updateCV',
  async ({ id, cvData }, { rejectWithValue }) => {
    try {
      const response = await cvService.updateCV(id, cvData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update CV');
    }
  }
);

export const analyzeCV = createAsyncThunk(
  'cv/analyzeCV',
  async ({ cvId, jobDescription }, { rejectWithValue }) => {
    try {
      const response = await cvService.analyzeCV(cvId, jobDescription);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'CV analysis failed');
    }
  }
);

export const deleteCV = createAsyncThunk(
  'cv/deleteCV',
  async (id, { rejectWithValue }) => {
    try {
      await cvService.deleteCV(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete CV');
    }
  }
);

export const getScoreHistory = createAsyncThunk(
  'cv/getScoreHistory',
  async (cvId, { rejectWithValue }) => {
    try {
      const response = await cvService.getScoreHistory(cvId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch score history');
    }
  }
);

const initialState = {
  cvs: [],
  currentCV: null,
  analysis: null,
  scoreHistory: [],
  uploadProgress: 0,
  isLoading: false,
  isUploading: false,
  isAnalyzing: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
};

const cvSlice = createSlice({
  name: 'cv',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentCV: (state) => {
      state.currentCV = null;
      state.analysis = null;
      state.scoreHistory = [];
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    resetUploadProgress: (state) => {
      state.uploadProgress = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      // Upload CV
      .addCase(uploadCV.pending, (state) => {
        state.isUploading = true;
        state.uploadProgress = 0;
        state.error = null;
      })
      .addCase(uploadCV.fulfilled, (state, action) => {
        state.isUploading = false;
        state.uploadProgress = 100;
        state.cvs.unshift(action.payload);
        state.currentCV = action.payload;
        state.error = null;
      })
      .addCase(uploadCV.rejected, (state, action) => {
        state.isUploading = false;
        state.uploadProgress = 0;
        state.error = action.payload;
      })
      
      // Get CVs
      .addCase(getCVs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getCVs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cvs = action.payload.cvs;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(getCVs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Get CV by ID
      .addCase(getCVById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getCVById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentCV = action.payload;
        state.error = null;
      })
      .addCase(getCVById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update CV
      .addCase(updateCV.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCV.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentCV = action.payload;
        // Update in CVs list if it exists there
        state.cvs = state.cvs.map(cv => 
          cv._id === action.payload._id ? action.payload : cv
        );
        state.error = null;
      })
      .addCase(updateCV.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Analyze CV
      .addCase(analyzeCV.pending, (state) => {
        state.isAnalyzing = true;
        state.error = null;
      })
      .addCase(analyzeCV.fulfilled, (state, action) => {
        state.isAnalyzing = false;
        state.analysis = action.payload;
        if (state.currentCV) {
          state.currentCV.latestScore = action.payload.score;
        }
        state.error = null;
      })
      .addCase(analyzeCV.rejected, (state, action) => {
        state.isAnalyzing = false;
        state.error = action.payload;
      })
      
      // Delete CV
      .addCase(deleteCV.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteCV.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cvs = state.cvs.filter(cv => cv._id !== action.payload);
        if (state.currentCV?._id === action.payload) {
          state.currentCV = null;
          state.analysis = null;
          state.scoreHistory = [];
        }
        state.error = null;
      })
      .addCase(deleteCV.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Get score history
      .addCase(getScoreHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getScoreHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.scoreHistory = action.payload;
        state.error = null;
      })
      .addCase(getScoreHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentCV, setUploadProgress, resetUploadProgress } = cvSlice.actions;
export default cvSlice.reducer;