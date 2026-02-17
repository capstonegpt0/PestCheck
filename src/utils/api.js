// src/utils/api.js
import axios from 'axios';

// ---------------------------------------------------------------
// BASE URL RESOLUTION - ENHANCED FOR CAPACITOR
// ---------------------------------------------------------------
function getBaseURL() {
  const origin = window.location.origin;
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  console.log('ðŸ” Environment Detection:');
  console.log('  Origin:', origin);
  console.log('  Protocol:', protocol);
  console.log('  Hostname:', hostname);
  console.log('  User Agent:', navigator.userAgent);
  
  // Detect if running in Capacitor
  const isCapacitor = 
    origin === 'capacitor://localhost' ||
    origin === 'ionic://localhost' ||
    origin === 'http://localhost' ||
    origin === 'null' ||
    protocol === 'capacitor:' ||
    protocol === 'ionic:' ||
    protocol === 'file:' ||
    (typeof window.Capacitor !== 'undefined');
  
  if (isCapacitor) {
    const renderURL = 'https://pestcheck.onrender.com/api';
    console.log('ðŸ“± CAPACITOR MODE DETECTED');
    console.log('  Using Render URL:', renderURL);
    return renderURL;
  }

  // Web app mode
  if (import.meta.env.VITE_API_URL) {
    console.log('ðŸŒ WEB MODE - Using VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }

  const defaultURL = 'https://pestcheck.onrender.com/api';
  console.log('ðŸŒ WEB MODE - Using default URL:', defaultURL);
  return defaultURL;
}

const API_BASE_URL = getBaseURL();
console.log('âœ… FINAL API BASE URL:', API_BASE_URL);

// ---------------------------------------------------------------
// NETWORK TEST FUNCTION
// ---------------------------------------------------------------
export async function testNetworkConnectivity() {
  console.log('ðŸ”¬ === NETWORK CONNECTIVITY TEST ===');
  
  const results = {
    internetAccess: false,
    backendReachable: false,
    corsConfigured: false,
    details: [],
    errors: []
  };
  
  try {
    // Test 1: Check internet connectivity
    console.log('Test 1: Checking internet access...');
    try {
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      results.internetAccess = true;
      results.details.push('âœ… Internet access confirmed');
      console.log('âœ… Internet access: OK');
    } catch (err) {
      results.errors.push('❌ No internet access - Check WiFi/cellular');
      console.error('❌ Internet test failed:', err.message);
    }
    
    // Test 2: Check if backend is reachable
    console.log('Test 2: Checking backend reachability...');
    try {
      const backendURL = API_BASE_URL.replace('/api', '');
      console.log('  Testing:', backendURL);
      
      const response = await fetch(backendURL, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/json',
        },
        // Don't use mode: 'no-cors' here as we need to see the response
      });
      
      results.backendReachable = response.ok || response.status === 404;
      results.details.push(`âœ… Backend reachable (${response.status})`);
      console.log('âœ… Backend reachable:', response.status);
    } catch (err) {
      results.errors.push(`❌ Cannot reach backend: ${err.message}`);
      console.error('❌ Backend test failed:', err.message);
      
      if (err.message.includes('Failed to fetch')) {
        results.errors.push('ðŸ’¡ Possible causes:');
        results.errors.push('  - Backend is down/sleeping (Render free tier)');
        results.errors.push('  - Wrong backend URL');
        results.errors.push('  - Network firewall blocking requests');
      }
    }
    
    // Test 3: Check CORS
    console.log('Test 3: Checking CORS configuration...');
    try {
      const loginURL = `${API_BASE_URL}/auth/login/`;
      console.log('  Testing:', loginURL);
      
      const response = await fetch(loginURL, {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,authorization',
        },
      });
      
      const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
      const allowMethods = response.headers.get('Access-Control-Allow-Methods');
      
      results.corsConfigured = allowOrigin === '*' || allowOrigin !== null;
      results.details.push(`âœ… CORS configured: ${allowOrigin || 'Not set'}`);
      console.log('âœ… CORS Allow-Origin:', allowOrigin);
      console.log('âœ… CORS Allow-Methods:', allowMethods);
    } catch (err) {
      results.errors.push(`❌ CORS check failed: ${err.message}`);
      console.error('❌ CORS test failed:', err.message);
    }
    
    // Test 4: Try actual API call
    console.log('Test 4: Testing actual API endpoint...');
    try {
      const response = await axios.get(`${API_BASE_URL}/pests/`, {
        timeout: 10000,
        validateStatus: () => true, // Accept any status
      });
      
      results.details.push(`âœ… API endpoint accessible (${response.status})`);
      console.log('âœ… API test:', response.status);
    } catch (err) {
      results.errors.push(`❌ API call failed: ${err.message}`);
      console.error('❌ API test failed:', err);
    }
    
  } catch (err) {
    results.errors.push(`❌ Test suite error: ${err.message}`);
    console.error('❌ Test suite error:', err);
  }
  
  console.log('ðŸ”¬ === TEST RESULTS ===');
  console.log('Internet:', results.internetAccess ? 'âœ…' : 'âŒ');
  console.log('Backend:', results.backendReachable ? 'âœ…' : 'âŒ');
  console.log('CORS:', results.corsConfigured ? 'âœ…' : 'âŒ');
  console.log('Details:', results.details);
  console.log('Errors:', results.errors);
  
  return results;
}

// ---------------------------------------------------------------
// CSRF HELPER
// ---------------------------------------------------------------
function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ---------------------------------------------------------------
// Auth endpoints
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
// AXIOS INSTANCE - ENHANCED
// ---------------------------------------------------------------
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for cold starts
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // CRITICAL: No credentials for Capacitor
  withCredentials: false,
  
  // Enhanced error messages
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Accept 4xx errors
  },
});

// ---------------------------------------------------------------
// REQUEST INTERCEPTOR - ENHANCED
// ---------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    console.log('ðŸ“¤ API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      fullURL: `${config.baseURL}${config.url}`,
      timeout: config.timeout,
      timestamp: new Date().toISOString(),
    });

    // 1) JWT token
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('ðŸ” Authorization header added');
    }

    // 2) Skip CSRF for Capacitor
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
          console.log('🛡️ CSRF token added');
        }
      }
    } else {
      console.log('ðŸ“± Capacitor mode - CSRF skipped');
    }

    // 3) FormData handling
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      console.log('ðŸ“Ž FormData detected - Content-Type removed');
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------
// RESPONSE INTERCEPTOR - ENHANCED ERROR HANDLING
// ---------------------------------------------------------------
api.interceptors.response.use(
  (response) => {
    console.log('âœ… API Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      dataSize: JSON.stringify(response.data || {}).length,
      timestamp: new Date().toISOString(),
    });
    return response;
  },
  async (error) => {
    // Enhanced error logging
    console.error('❌ === API ERROR DETAILS ===');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Status:', error.response?.status);
    console.error('URL:', error.config?.url);
    console.error('Full URL:', `${error.config?.baseURL}${error.config?.url}`);
    console.error('Method:', error.config?.method?.toUpperCase());
    console.error('Response Data:', error.response?.data);
    console.error('Network Error:', !error.response);
    console.error('Timestamp:', new Date().toISOString());
    
    // Categorize error
    if (!error.response) {
      console.error('ðŸ”´ NETWORK ERROR - No response from server');
      console.error('Possible causes:');
      console.error('  1. No internet connection');
      console.error('  2. Backend is down/sleeping');
      console.error('  3. CORS blocking the request');
      console.error('  4. Request timeout');
      console.error('  5. Wrong backend URL');
    } else if (error.response.status >= 500) {
      console.error('ðŸ”´ SERVER ERROR -', error.response.status);
    } else if (error.response.status >= 400) {
      console.error('ðŸ”´ CLIENT ERROR -', error.response.status);
    }
    console.error('========================');

    const originalRequest = error.config;

    // Skip auth endpoints
    if (isAuthEndpoint(originalRequest.url)) {
      console.log('⚠️ Auth endpoint failed - not retrying');
      return Promise.reject(error);
    }

    // Token refresh on 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('ðŸ”„ Attempting token refresh...');

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
        console.log('âœ… Token refreshed successfully');

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
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