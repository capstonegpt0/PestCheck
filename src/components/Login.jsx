import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bug, Loader } from 'lucide-react';
import api from '../utils/api';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDebugInfo('');
    setLoading(true);

    try {
      console.log('=== LOGIN ATTEMPT ===');
      console.log('API Base URL:', api.defaults.baseURL);
      console.log('Form data:', { username: formData.username, password: '***' });
      console.log('Origin:', window.location.origin);
      
      const response = await api.post('/auth/login/', formData);
      
      console.log('=== LOGIN SUCCESS ===');
      console.log('Response status:', response.status);
      console.log('Response data keys:', Object.keys(response.data));
      
      onLogin(response.data.user, response.data.tokens);
    } catch (err) {
      // --- DEBUG: log everything so we can see exactly what is happening ---
      console.error('=== LOGIN ERROR DEBUG ===');
      console.error('err.message:', err.message);
      console.error('err.response?.status:', err.response?.status);
      console.error('err.response?.data:', JSON.stringify(err.response?.data));
      console.error('err.response?.headers:', JSON.stringify(err.response?.headers));
      console.error('err.config?.url:', err.config?.url);
      console.error('err.config?.baseURL:', err.config?.baseURL);
      console.error('========================');

      // Show the ACTUAL error from Django if available, otherwise show
      // the raw status + message so we can diagnose remotely.
      if (err.response?.data) {
        const data = err.response.data;
        // Django non_field_errors (e.g. wrong credentials)
        if (data.non_field_errors?.[0]) {
          setError(data.non_field_errors[0]);
        }
        // Django field errors or detail message
        else if (data.detail) {
          setError(data.detail);
        }
        // Any other error shape — stringify it so we see it
        else {
          setError(JSON.stringify(data));
        }
      } else if (err.message) {
        // No response at all — network error or CORS block.
        // Show the raw message so we know it's not a credentials issue.
        setError(`Network error: ${err.message}`);
      } else {
        setError('Login failed. Please check your credentials.');
      }
      // --- ENHANCED ERROR LOGGING ---
      console.error('=== LOGIN ERROR DEBUG ===');
      console.error('Full error object:', err);
      console.error('err.message:', err.message);
      console.error('err.code:', err.code);
      console.error('err.response?.status:', err.response?.status);
      console.error('err.response?.data:', JSON.stringify(err.response?.data, null, 2));
      console.error('err.response?.headers:', JSON.stringify(err.response?.headers, null, 2));
      console.error('err.config?.url:', err.config?.url);
      console.error('err.config?.baseURL:', err.config?.baseURL);
      console.error('err.config?.method:', err.config?.method);
      console.error('err.config?.headers:', JSON.stringify(err.config?.headers, null, 2));
      console.error('========================');

      // Build debug info
      const debug = `
Error Code: ${err.code || 'N/A'}
Status: ${err.response?.status || 'N/A'}
URL: ${err.config?.baseURL}${err.config?.url}
Method: ${err.config?.method?.toUpperCase()}
Origin: ${window.location.origin}
      `.trim();
      setDebugInfo(debug);

      // Show the ACTUAL error from Django if available
      if (err.response?.data) {
        const data = err.response.data;
        
        // Django non_field_errors (e.g. wrong credentials)
        if (data.non_field_errors?.[0]) {
          setError(data.non_field_errors[0]);
        }
        // Django field errors or detail message
        else if (data.detail) {
          setError(data.detail);
        }
        // Username or password errors
        else if (data.username || data.password) {
          const errors = [];
          if (data.username) {
            errors.push(...(Array.isArray(data.username) ? data.username : [data.username]));
          }
          if (data.password) {
            errors.push(...(Array.isArray(data.password) ? data.password : [data.password]));
          }
          setError(errors.join(', '));
        }
        // Any other error shape – stringify it so we see it
        else {
          setError(JSON.stringify(data, null, 2));
        }
      } else if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        // Network error – can't reach server
        setError(`❌ Cannot connect to server

Please check:
1. Backend is deployed and running on Render
2. You have an active internet connection
3. Backend URL is correct: ${api.defaults.baseURL}

If using Render free tier, the server may be sleeping.
Wait 30 seconds and try again.`);
      } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        setError(`⏱️ Request timeout

The server is taking too long to respond.

If using Render free tier:
- The server may be sleeping (cold start)
- Wait 30-60 seconds and try again
- First request after sleep takes longer

If problem persists:
- Check Render dashboard for errors
- Check server logs`);
      } else if (err.code === 'ERR_BAD_REQUEST' && err.response?.status === 400) {
        setError(`Bad request - Invalid credentials or missing data`);
      } else if (err.message) {
        // No response at all – network error or CORS block
        setError(`Network error: ${err.message}`);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Test connection function
  const testConnection = async () => {
    console.log('=== TESTING CONNECTION ===');
    console.log('API Base URL:', api.defaults.baseURL);
    setDebugInfo('Testing connection...');
    
    try {
      // Test 1: Check if backend is reachable
      const testURL = api.defaults.baseURL.replace('/api', '');
      console.log('Test 1: Fetching backend root:', testURL);
      
      const response1 = await fetch(testURL, {
        method: 'GET',
        mode: 'cors',
      });
      
      console.log('✅ Backend reachable');
      console.log('  Status:', response1.status);
      console.log('  OK:', response1.ok);
      
      // Test 2: Check CORS preflight for login endpoint
      const loginURL = `${api.defaults.baseURL}/auth/login/`;
      console.log('Test 2: Testing login endpoint CORS:', loginURL);
      
      const response2 = await fetch(loginURL, {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
      });
      
      console.log('✅ CORS preflight response');
      console.log('  Status:', response2.status);
      console.log('  Allow-Origin:', response2.headers.get('Access-Control-Allow-Origin'));
      console.log('  Allow-Methods:', response2.headers.get('Access-Control-Allow-Methods'));
      
      // Test 3: Try actual API call
      console.log('Test 3: Testing actual API instance');
      
      try {
        await api.get('/pests/');
        console.log('✅ API instance works (public endpoint accessible)');
      } catch (apiError) {
        console.log('⚠️ API call failed (expected if auth required):', apiError.response?.status);
      }
      
      const results = `
✅ Connection Test Results:

1. Backend Reachable: ${response1.ok ? 'YES' : 'NO'} (${response1.status})
2. CORS Configured: ${response2.ok ? 'YES' : 'NO'} (${response2.status})
3. Backend URL: ${api.defaults.baseURL}
4. Origin: ${window.location.origin}

${response1.ok && response2.ok ? 
  '✅ Backend is accessible! If login fails, check credentials.' : 
  '❌ Connection issues detected. Check backend deployment.'}
      `.trim();
      
      setDebugInfo(results);
      alert('Connection test completed - check results below login form');
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      
      const errorInfo = `
❌ Connection Test Failed

Error: ${error.message}
Code: ${error.code || 'N/A'}

Possible causes:
- Backend is not deployed or stopped
- Wrong backend URL
- No internet connection
- CORS not configured

Backend URL: ${api.defaults.baseURL}
      `.trim();
      
      setDebugInfo(errorInfo);
      alert(`Connection test failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center justify-center mb-8">
          <Bug className="w-12 h-12 text-primary mr-2" />
          <h1 className="text-3xl font-bold text-gray-800">PestCheck</h1>
        </div>
        
        <h2 className="text-2xl font-semibold text-center text-gray-700 mb-6">
          Welcome Back
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-lg hover:bg-green-600 transition-colors font-semibold flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader className="animate-spin mr-2 w-5 h-5" />
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {/* Debug Tools */}
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={testConnection}
            className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
          >
            🔧 Test Backend Connection
          </button>
        </div>

        <p className="text-center text-gray-600 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            Register
          </Link>
        </p>

        {/* Debug Info Display */}
        {debugInfo && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-700 font-mono">
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold">Debug Info:</span>
              <button
                onClick={() => setDebugInfo('')}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <pre className="whitespace-pre-wrap">{debugInfo}</pre>
          </div>
        )}

        {/* System Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-gray-600">
          <p className="font-semibold mb-1">System Info:</p>
          <p className="truncate">API: {api.defaults.baseURL}</p>
          <p>Origin: {window.location.origin}</p>
          <p>Platform: {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;