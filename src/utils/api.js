// src/utils/api.js
import axios from 'axios';

// ---------------------------------------------------------------
// BASE URL RESOLUTION
// ---------------------------------------------------------------
function getBaseURL() {
  const origin = window.location.origin;
  const protocol = window.location.protocol;

  // Detect if running in Capacitor (native mobile app)
  const isCapacitor =
    origin === 'capacitor://localhost' ||
    origin === 'ionic://localhost' ||
    origin === 'null' ||
    protocol === 'capacitor:' ||
    protocol === 'ionic:' ||
    protocol === 'file:' ||
    (typeof window.Capacitor !== 'undefined');

  if (isCapacitor) {
    // Capacitor always hits the deployed Render backend
    return 'https://pestcheck.onrender.com/api';
  }

  // Web app: use VITE_API_URL if set, otherwise default to LOCAL backend
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Default to local Django server — change this if you deploy elsewhere
  return 'http://localhost:8000/api';
}

const API_BASE_URL = getBaseURL();
console.log('API BASE URL:', API_BASE_URL);

// ---------------------------------------------------------------
// CSRF HELPER
// ---------------------------------------------------------------
function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ---------------------------------------------------------------
// Auth endpoints (skip token refresh on these)
// ---------------------------------------------------------------
const AUTH_ENDPOINTS = [
  '/auth/login/',
  '/auth/register/',
  '/auth/token/',
  '/auth/token/refresh/'
];

function isAuthEndpoint(url) {
  return AUTH_ENDPOINTS.some((endpoint) => url && url.endsWith(endpoint));
}

// ---------------------------------------------------------------
// AXIOS INSTANCE
// ---------------------------------------------------------------
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
  validateStatus: function (status) {
    return status >= 200 && status < 500;
  },
});

// ---------------------------------------------------------------
// REQUEST INTERCEPTOR
// ---------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    // Attach JWT token
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // CSRF token for non-Capacitor, non-safe methods
    const isCapacitor =
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'ionic:' ||
      window.location.protocol === 'file:' ||
      window.location.origin === 'capacitor://localhost' ||
      window.location.origin === 'ionic://localhost' ||
      (typeof window.Capacitor !== 'undefined');

    if (!isCapacitor) {
      const unsafeMethods = ['post', 'put', 'patch', 'delete'];
      if (unsafeMethods.includes(config.method)) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
          config.headers['X-CSRFToken'] = csrfToken;
        }
      }
    }

    // Let browser set Content-Type for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------
// RESPONSE INTERCEPTOR
// ---------------------------------------------------------------
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.error('[API ERROR]', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      fullURL: `${error.config?.baseURL}${error.config?.url}`,
    });

    const originalRequest = error.config;

    // Don't retry auth endpoints
    if (isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    // Refresh JWT on 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        if (!window.location.hash.includes('/login')) {
          window.location.href = '/#/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;