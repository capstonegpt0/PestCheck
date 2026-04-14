import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bug, Loader, Clock, ShieldOff } from 'lucide-react';
import api from '../utils/api';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [accountStatus, setAccountStatus] = useState(null); // 'pending' | 'blocked' | null
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAccountStatus(null);
    setLoading(true);

    try {
      // NOTE: api.js uses validateStatus: (s) => s >= 200 && s < 500
      // This means 403 resolves here (not in catch), so we check response.status directly.
      const response = await api.post('/auth/login/', formData);
      const { status: httpStatus, data } = response;

      if (httpStatus === 403) {
        const code = data?.code;
        if (code === 'account_blocked') {
          setAccountStatus('blocked');
        } else {
          // account_pending or any other 403
          setAccountStatus('pending');
        }
        return;
      }

      if (httpStatus >= 400) {
        if (data?.non_field_errors?.[0]) {
          setError(data.non_field_errors[0]);
        } else if (data?.detail) {
          setError(data.detail);
        } else if (data?.username || data?.password) {
          const msgs = [];
          if (data.username) msgs.push(...(Array.isArray(data.username) ? data.username : [data.username]));
          if (data.password) msgs.push(...(Array.isArray(data.password) ? data.password : [data.password]));
          setError(msgs.join(', '));
        } else {
          setError('Login failed. Please check your credentials.');
        }
        return;
      }

      onLogin(data.user, data.tokens);
    } catch (err) {
      // Only network/timeout errors reach here
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Cannot connect to server. Please check your internet connection and try again.');
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Request timed out. Please try again.');
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center justify-center mb-8">
          <Bug className="w-12 h-12 text-primary mr-2" />
          <h1 className="text-3xl font-bold text-gray-800">PestCheck</h1>
        </div>

        <h2 className="text-2xl font-semibold text-center text-gray-700 mb-6">Welcome Back</h2>

        {/* Pending approval banner */}
        {accountStatus === 'pending' && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-4 mb-5 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Account Pending Approval</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Your registration is under review by the Magalang Agricultural Office.
                You will be able to log in once your RSBSA number and ID have been verified.
              </p>
            </div>
          </div>
        )}

        {/* Blocked account banner */}
        {accountStatus === 'blocked' && (
          <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-4 mb-5 flex items-start gap-3">
            <ShieldOff className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Account Blocked</p>
              <p className="text-sm text-red-700 mt-0.5">
                Your account has been blocked due to repeated invalid detection reports.
                Please contact the MAO office for assistance.
              </p>
            </div>
          </div>
        )}

        {/* Generic error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              required
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-gray-900 py-3 rounded-lg hover:bg-yellow-400 transition-colors font-semibold flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed disabled:text-white"
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

        <p className="text-center text-gray-600 mt-6 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-yellow-600 font-semibold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;