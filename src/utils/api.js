// src/utils/api.js
import axios from 'axios';

// ---------------------------------------------------------------
// BASE URL RESOLUTION
// Detects whether we are running inside a Capacitor WebView,
// an Android emulator, or a normal browser and picks the
// correct backend URL accordingly.
// ---------------------------------------------------------------
function getBaseURL() {
  // 1) Build-time env var always wins (works for browser dev server)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // 2) Runtime detection for Capacitor / native WebView
  const origin = window.location.origin;

  if (
    origin === 'capacitor://localhost' ||   // Capacitor iOS
    origin === 'ionic://localhost' ||        // Ionic Capacitor
    origin === 'http://localhost' ||         // Capacitor Android (real device)
    origin === 'null'                        // some WebView contexts report "null"
  ) {
    // -------------------------------------------------------
    // CHANGE THIS if you are testing against a LOCAL dev server:
    //   Android emulator  -> 'http://10.0.2.2:8000/api'
    //   iOS simulator     -> 'http://localhost:8000/api'
    // For production Capacitor builds keep the line below:
    // -------------------------------------------------------
    return 'https://pestcheck.onrender.com/api';
  }

  // 3) Default fallback (production)
  return 'https://pestcheck.onrender.com/api';
}

const API_BASE_URL = getBaseURL();
console.log('API Base URL:', API_BASE_URL);

// ---------------------------------------------------------------
// CSRF HELPER
// Django sets a cookie called "csrftoken" that is readable from
// JavaScript because CSRF_COOKIE_HTTPONLY = False in settings.py.
// We extract it here and attach it as the X-CSRFToken header on
// every unsafe request (POST, PUT, PATCH, DELETE).
// Without this, Django's CsrfViewMiddleware returns 403 and the
// app shows "incorrect credentials" even though the credentials
// are actually fine.
// ---------------------------------------------------------------
function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ---------------------------------------------------------------
// AXIOS INSTANCE
// withCredentials: true is required so the browser sends and
// receives cookies (including csrftoken) on cross-origin requests.
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
    // 1) Attach JWT Bearer token if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2) Attach CSRF token for unsafe HTTP methods
    const unsafeMethods = ['post', 'put', 'patch', 'delete'];
    if (unsafeMethods.includes(config.method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }

    // 3) Let axios auto-set Content-Type for FormData (image uploads)
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
// RESPONSE INTERCEPTOR — automatic JWT refresh on 401
// ---------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 (unauthorized) — attempt a silent token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

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

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
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

export default api;