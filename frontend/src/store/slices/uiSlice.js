import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isSidebarOpen: true,
  theme: 'light',
  notifications: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarOpen: (state, action) => {
      state.isSidebarOpen = action.payload;
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    pushNotification: (state, action) => {
      state.notifications.push(action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const {
  setSidebarOpen,
  toggleSidebar,
  setTheme,
  pushNotification,
  clearNotifications,
} = uiSlice.actions;

export default uiSlice.reducer;
