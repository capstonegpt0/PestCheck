// src/utils/api.js
import axios from 'axios';
import mockApi from './mockAPI';

// Toggle between real API and mock data
const USE_MOCK_DATA = falses; // Set to false when backend is ready

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://pestcheck-api.onrender.com/api';

console.log('API Base URL:', API_BASE_URL);
console.log('Using mock data:', USE_MOCK_DATA);

// Real API instance
const realApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

realApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

realApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken
        });
        const { access } = response.data;
        localStorage.setItem('access_token', access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return realApi(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Export either mock or real API
const api = USE_MOCK_DATA ? mockApi : realApi;

export default api;