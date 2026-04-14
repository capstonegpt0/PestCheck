// src/utils/api.js
import axios from 'axios';

// ---------------------------------------------------------------
// BASE URL RESOLUTION
// ---------------------------------------------------------------
function getBaseURL() {
  const origin = window.location.origin;
  const protocol = window.location.protocol;

  const isCapacitor =
    origin === 'capacitor://localhost' ||
    origin === 'ionic://localhost' ||
    origin === 'null' ||
    protocol === 'capacitor:' ||
    protocol === 'ionic:' ||
    protocol === 'file:' ||
    (typeof window.Capacitor !== 'undefined');

  if (isCapacitor) {
    return 'https://pestcheck.onrender.com/api';
  }

  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

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
  '/auth/token/refresh/',
];

function isAuthEndpoint(url) {
  return AUTH_ENDPOINTS.some((endpoint) => url && url.endsWith(endpoint));
}

// ---------------------------------------------------------------
// Force logout helper
// ---------------------------------------------------------------
function forceLogout(reason = '') {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  if (!window.location.hash.includes('/login')) {
    window.location.replace(reason ? `/#/login?reason=${reason}` : '/#/login');
  }
}

// ---------------------------------------------------------------
// AXIOS INSTANCE
// ---------------------------------------------------------------
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: false,
  // ✅ FIX: removed validateStatus override so 401 properly reaches the error interceptor
});

// ---------------------------------------------------------------
// REQUEST INTERCEPTOR
// ---------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

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

// ✅ Queue for concurrent 401s — only one refresh fires at a time
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    // ✅ Handle account_blocked here too (in case App.jsx interceptor isn't mounted yet)
    if (response.status === 403 && response.data?.code === 'account_blocked') {
      forceLogout('blocked');
    }
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

    // ✅ Handle account_blocked on 403
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'account_blocked'
    ) {
      forceLogout('blocked');
      return Promise.reject(error);
    }

    // Don't retry auth endpoints
    if (isAuthEndpoint(originalRequest?.url)) {
      return Promise.reject(error);
    }

    // ✅ Refresh JWT on 401
    if (error.response?.status === 401 && !originalRequest._retry) {

      // If already refreshing, queue this request until the refresh completes
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        // ✅ Use plain axios (not `api`) to avoid triggering this interceptor again
        const { data } = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = data.access;
        localStorage.setItem('access_token', newAccessToken);

        // Update default header for all future requests
        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

        // Resolve all queued requests with the new token
        processQueue(null, newAccessToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        // ✅ Refresh token expired — force logout cleanly
        forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;