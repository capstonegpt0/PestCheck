import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bug, Loader, Wifi, WifiOff, Activity } from 'lucide-react';
import api, { testNetworkConnectivity } from '../utils/api';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [networkStatus, setNetworkStatus] = useState(null);
  const [testing, setTesting] = useState(false);

  // Auto-test network on mount
  useEffect(() => {
    autoTestNetwork();
  }, []);

  const autoTestNetwork = async () => {
    console.log('🔄 Auto-testing network on mount...');
    try {
      const results = await testNetworkConnectivity();
      setNetworkStatus(results);
      
      if (!results.internetAccess) {
        setError('❌ No internet connection detected. Please check your WiFi or cellular data.');
      } else if (!results.backendReachable) {
        setError('⚠️ Cannot reach backend server. It may be sleeping (Render free tier). Click "Test Connection" to wake it up.');
      }
    } catch (err) {
      console.error('Auto-test failed:', err);
    }
  };

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
      console.log('Protocol:', window.location.protocol);
      console.log('Is Capacitor:', typeof window.Capacitor !== 'undefined');
      
      const response = await api.post('/auth/login/', formData);
      
      console.log('=== LOGIN SUCCESS ===');
      console.log('Response status:', response.status);
      console.log('Response data keys:', Object.keys(response.data));
      
      onLogin(response.data.user, response.data.tokens);
    } catch (err) {
      console.error('=== LOGIN ERROR ===');
      console.error('Full error:', err);
      console.error('Error message:', err.message);
      console.error('Error code:', err.code);
      console.error('Response status:', err.response?.status);
      console.error('Response data:', err.response?.data);
      console.error('Request URL:', err.config?.url);
      console.error('Request method:', err.config?.method);
      console.error('===================');

      let errorMessage = '';
      let debugDetails = '';

      // Network errors (no response)
      if (!err.response) {
        if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
          errorMessage = `❌ Network Error - Cannot connect to server

Possible causes:
1️⃣ No internet connection
2️⃣ Backend server is down or sleeping (Render free tier)
3️⃣ Firewall/VPN blocking requests
4️⃣ Wrong backend URL

🔧 Quick fixes:
• Check your internet connection
• Click "Test Connection" to wake up server
• Wait 30 seconds and try again
• Try cellular data instead of WiFi`;

          debugDetails = `
Network Error Details:
• Error Code: ${err.code}
• Message: ${err.message}
• Backend URL: ${api.defaults.baseURL}
• Your Origin: ${window.location.origin}
• Is Capacitor: ${typeof window.Capacitor !== 'undefined'}
          `.trim();
        } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
          errorMessage = `⏱️ Request Timeout

The server took too long to respond.

If using Render free tier:
• First request after sleep takes 30-60 seconds
• Click "Test Connection" to wake it up
• Wait and try again

If problem persists:
• Check if backend is running on Render dashboard
• Look at Render logs for errors`;

          debugDetails = `
Timeout Details:
• Timeout: ${err.config?.timeout}ms
• Backend URL: ${api.defaults.baseURL}
          `.trim();
        } else {
          errorMessage = `❌ Connection Failed

${err.message}

Check:
• Internet connection
• Backend server status on Render
• Firewall settings`;

          debugDetails = `
Error: ${err.message}
Code: ${err.code || 'N/A'}
URL: ${api.defaults.baseURL}
          `.trim();
        }
      }
      // HTTP error responses
      else {
        const status = err.response.status;
        const data = err.response.data;

        if (status === 400) {
          // Django validation errors
          if (data.non_field_errors) {
            errorMessage = data.non_field_errors[0];
          } else if (data.username || data.password) {
            const errors = [];
            if (data.username) errors.push(...(Array.isArray(data.username) ? data.username : [data.username]));
            if (data.password) errors.push(...(Array.isArray(data.password) ? data.password : [data.password]));
            errorMessage = errors.join('\n');
          } else if (data.detail) {
            errorMessage = data.detail;
          } else {
            errorMessage = 'Invalid login credentials';
          }
        } else if (status === 401) {
          errorMessage = 'Invalid username or password';
        } else if (status === 403) {
          errorMessage = data.detail || 'Access forbidden';
        } else if (status === 404) {
          errorMessage = 'Login endpoint not found. Backend configuration issue.';
        } else if (status >= 500) {
          errorMessage = `Server Error (${status})

The backend server encountered an error.
Check Render logs for details.`;
        } else {
          errorMessage = data.detail || data.error || `HTTP ${status} error`;
        }

        debugDetails = `
HTTP ${status} Error:
${JSON.stringify(data, null, 2)}
        `.trim();
      }

      setError(errorMessage);
      setDebugInfo(debugDetails);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setError('');
    setDebugInfo('Testing connection...');
    
    console.log('🔬 Starting comprehensive connection test...');
    
    try {
      const results = await testNetworkConnectivity();
      setNetworkStatus(results);
      
      // Build report
      let report = '🔬 CONNECTION TEST RESULTS\n\n';
      
      report += `Internet Access: ${results.internetAccess ? '✅ OK' : '❌ FAILED'}\n`;
      report += `Backend Reachable: ${results.backendReachable ? '✅ OK' : '❌ FAILED'}\n`;
      report += `CORS Configured: ${results.corsConfigured ? '✅ OK' : '❌ FAILED'}\n\n`;
      
      if (results.details.length > 0) {
        report += 'Details:\n';
        results.details.forEach(detail => {
          report += `  ${detail}\n`;
        });
      }
      
      if (results.errors.length > 0) {
        report += '\nErrors:\n';
        results.errors.forEach(error => {
          report += `  ${error}\n`;
        });
      }
      
      report += `\nBackend URL: ${api.defaults.baseURL}`;
      report += `\nYour Origin: ${window.location.origin}`;
      report += `\nProtocol: ${window.location.protocol}`;
      report += `\nIs Capacitor: ${typeof window.Capacitor !== 'undefined'}`;
      
      setDebugInfo(report);
      
      // Show appropriate message
      if (results.internetAccess && results.backendReachable && results.corsConfigured) {
        setError('✅ All tests passed! Backend is accessible. You can try logging in now.');
      } else if (!results.internetAccess) {
        setError('❌ No internet connection. Check your WiFi or cellular data.');
      } else if (!results.backendReachable) {
        setError('⚠️ Backend not responding. It may be sleeping. Wait 30 seconds and test again.');
      } else if (!results.corsConfigured) {
        setError('⚠️ CORS issue detected. Check backend settings.py CORS configuration.');
      }
      
    } catch (err) {
      console.error('Connection test failed:', err);
      setError(`Test failed: ${err.message}`);
      setDebugInfo(`Error: ${err.message}\nStack: ${err.stack}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center justify-center mb-8">
          <Bug className="w-12 h-12 text-primary mr-2" />
          <h1 className="text-3xl font-bold text-gray-800">PestCheck</h1>
        </div>

        {/* Network Status Indicator */}
        {networkStatus && (
          <div className={`mb-4 p-3 rounded-lg flex items-center ${
            networkStatus.internetAccess && networkStatus.backendReachable
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}>
            {networkStatus.internetAccess && networkStatus.backendReachable ? (
              <>
                <Wifi className="w-5 h-5 mr-2" />
                <span className="text-sm">Connected to backend</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 mr-2" />
                <span className="text-sm">Connection issue detected</span>
              </>
            )}
          </div>
        )}
        
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
              disabled={loading}
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
              disabled={loading}
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
            onClick={handleTestConnection}
            disabled={testing}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center disabled:bg-gray-400"
          >
            {testing ? (
              <>
                <Loader className="animate-spin mr-2 w-4 h-4" />
                Testing...
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 mr-2" />
                Test Connection
              </>
            )}
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
            <pre className="whitespace-pre-wrap overflow-auto max-h-64">{debugInfo}</pre>
          </div>
        )}

        {/* System Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-gray-600">
          <p className="font-semibold mb-1">System Info:</p>
          <p className="truncate">API: {api.defaults.baseURL}</p>
          <p>Origin: {window.location.origin}</p>
          <p>Protocol: {window.location.protocol}</p>
          <p>Capacitor: {typeof window.Capacitor !== 'undefined' ? 'Yes' : 'No'}</p>
          <p>Platform: {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;