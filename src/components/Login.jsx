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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login/', formData);
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
    } finally {
      setLoading(false);
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
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
            className="w-full bg-primary text-white py-3 rounded-lg hover:bg-green-600 transition-colors font-semibold flex items-center justify-center"
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

        <p className="text-center text-gray-600 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;