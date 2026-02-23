import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  plan: 'free',
  status: 'inactive',
  renewalDate: null,
  isLoading: false,
  error: null,
};

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    setSubscription: (state, action) => {
      return { ...state, ...action.payload, error: null };
    },
    setSubscriptionLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setSubscriptionError: (state, action) => {
      state.error = action.payload;
    },
    clearSubscriptionError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setSubscription,
  setSubscriptionLoading,
  setSubscriptionError,
  clearSubscriptionError,
} = subscriptionSlice.actions;

export default subscriptionSlice.reducer;
