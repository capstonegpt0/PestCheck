// src/utils/api.js
import axios from 'axios';

// ---------------------------------------------------------------
// BASE URL RESOLUTION
// ---------------------------------------------------------------
function getBaseURL() {
  // For Capacitor apps, ALWAYS use the full Render URL
  const origin = window.location.origin;
  
  console.log('🔍 Current origin:', origin);
  
  if (
    origin === 'capacitor://localhost' ||
    origin === 'ionic://localhost' ||
    origin === 'http://localhost' ||
    origin === 'null'
  ) {
    // ✅ Make sure this is your correct Render backend URL
    const renderURL = 'https://pestcheck.onrender.com/api';
    console.log('📱 Capacitor detected, using Render URL:', renderURL);
    return renderURL;
  }

  // For web app - check environment variable first
  if (import.meta.env.VITE_API_URL) {
    console.log('🌐 Using VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }

  // Default to Render for web deployment
  const defaultURL = 'https://pestcheck.onrender.com/api';
  console.log('🌐 Using default URL:', defaultURL);
  return defaultURL;
}

const API_BASE_URL = getBaseURL();
console.log('✅ API Base URL set to:', API_BASE_URL);

// ---------------------------------------------------------------
// CSRF HELPER
// ---------------------------------------------------------------
function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ---------------------------------------------------------------
// Endpoints that are supposed to return 401 on failure.
// The token-refresh interceptor must SKIP these – otherwise it
// swallows the real error before the component ever sees it.
// ---------------------------------------------------------------
const AUTH_ENDPOINTS = ['/auth/login/', '/auth/register/', '/auth/token/', '/auth/token/refresh/'];

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
  },
  withCredentials: true,
});

// ---------------------------------------------------------------
// REQUEST INTERCEPTOR
// ---------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    console.log('📤 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
    });

    // 1) Attach JWT Bearer token if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Added Authorization header');
    }

    // 2) Attach CSRF token for unsafe HTTP methods
    const unsafeMethods = ['post', 'put', 'patch', 'delete'];
    if (unsafeMethods.includes(config.method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
        console.log('🛡️ Added CSRF token');
      }
    }

    // 3) Let axios auto-set Content-Type for FormData (image uploads)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      console.log('📎 Removed Content-Type for FormData');
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------
// RESPONSE INTERCEPTOR – automatic JWT refresh on 401
// ---------------------------------------------------------------
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url,
      dataKeys: Object.keys(response.data || {}),
    });
    return response;
  },
  async (error) => {
    console.error('❌ API Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
      responseData: error.response?.data,
    });

    const originalRequest = error.config;

    // -------------------------------------------------------
    // SKIP auth endpoints entirely.
    // /auth/login/ legitimately returns 401 when credentials
    // are wrong. If we intercept that here we swallow the real
    // error and the login component never sees it.
    // -------------------------------------------------------
    if (isAuthEndpoint(originalRequest.url)) {
      console.log('⚠️ Auth endpoint failed - not retrying');
      return Promise.reject(error);
    }

    // For every other endpoint, attempt a silent token refresh on 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('🔄 Attempting token refresh...');

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);
        console.log('✅ Token refreshed successfully');

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // Only redirect if we're not already on login page
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