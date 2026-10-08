import { create } from 'zustand';
import api from '../lib/api';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  isInitializing: true,
  isAuthenticated: false,

  // Initialize auth state on app load
  initAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isAuthenticated: false, user: null, isInitializing: false });
      return;
    }

    try {
      set({ isInitializing: true });
      const { data } = await api.get('/auth/me');
      set({ user: data.data, isAuthenticated: true, isInitializing: false });
    } catch (error) {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false, isInitializing: false });
    }
  },

  // Login
  login: async (credentials) => {
    try {
      set({ isLoading: true });
      const { data } = await api.post('/auth/login', credentials);
      const { user, token } = data;
      
      localStorage.setItem('token', token);
      set({ user, token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      const errorMessage = error.response?.data?.error?.message || 'Login failed';
      return { success: false, error: errorMessage };
    }
  },

  // Register
  register: async (userData) => {
    try {
      set({ isLoading: true });
      const { data } = await api.post('/auth/register', userData);
      const { user, token } = data;
      
      localStorage.setItem('token', token);
      set({ user, token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      const errorMessage = error.response?.data?.error?.message || 'Registration failed';
      return { success: false, error: errorMessage };
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
