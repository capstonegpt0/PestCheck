import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bug, Loader, Upload, ShieldCheck, CheckCircle } from 'lucide-react';
import api from '../utils/api';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    phone: '',
    rsbsa_number: '',
    notes: '',
  });
  const [passwordErrors, setPasswordErrors] = useState([]);

  const validatePassword = (pwd) => {
    const rules = [
      { test: pwd.length >= 8,          label: 'At least 8 characters' },
      { test: /[A-Z]/.test(pwd),        label: 'At least 1 uppercase letter' },
      { test: /[a-z]/.test(pwd),        label: 'At least 1 lowercase letter' },
      { test: /[0-9]/.test(pwd),        label: 'At least 1 number' },
      { test: /[^A-Za-z0-9]/.test(pwd), label: 'At least 1 special character (!@#$%^&*)' },
    ];
    return rules;
  };

  const [validIdFile, setValidIdFile] = useState(null);
  const [validIdPreview, setValidIdPreview] = useState(null);
  const [fileError, setFileError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'password') {
      setPasswordErrors(validatePassword(value));
    }
  };

  // Block digits from name fields
  const handleNameKeyDown = (e) => {
    if (/\d/.test(e.key)) e.preventDefault();
  };

  // Strip any non-digit, non-+, non-space character on input for phone
  const handlePhoneChange = (e) => {
    const cleaned = e.target.value.replace(/[^\d+\s\-()]/g, '');
    setFormData({ ...formData, phone: cleaned });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFileError('Please upload an image file (JPG, PNG, etc.)');
      setValidIdFile(null);
      setValidIdPreview(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError(
        `File too large: ${(file.size / (1024 * 1024)).toFixed(1)} MB. Please upload an image smaller than 5 MB.`
      );
      setValidIdFile(null);
      setValidIdPreview(null);
      // Reset the input so the same file can be re-selected after compression
      e.target.value = '';
      return;
    }
    setFileError('');
    setValidIdFile(file);
    setValidIdPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match');
      return;
    }

    const pwdRules = validatePassword(formData.password);
    if (pwdRules.some((r) => !r.test)) {
      setError('Password does not meet the required criteria.');
      return;
    }
    if (!validIdFile) {
      setError('Please upload a valid government-issued ID image.');
      return;
    }
    if (!formData.rsbsa_number.trim()) {
      setError('RSBSA number is required.');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([k, v]) => data.append(k, v));
      data.append('valid_id_image', validIdFile);

      await api.post('/auth/register/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSubmitted(true);
    } catch (err) {
      const errors = err.response?.data;
      if (errors) {
        const msg = Object.values(errors).flat().join(' ');
        setError(msg);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-10 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Registration Submitted!</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Your registration is now <strong>pending admin approval</strong>. An administrator from the
            Magalang Agricultural Office will review your RSBSA number and ID, then activate your account.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-amber-800 mb-1">What happens next?</p>
            <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
              <li>MAO staff reviews your RSBSA number and ID</li>
              <li>You receive a notification once approved</li>
              <li>You can then log in and use PestCheck</li>
            </ul>
          </div>
          <Link
            to="/login"
            className="block w-full bg-primary text-gray-900 py-3 rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Registration form ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8">
        <div className="flex items-center justify-center mb-6">
          <Bug className="w-12 h-12 text-primary mr-2" />
          <h1 className="text-3xl font-bold text-gray-800">PestCheck</h1>
        </div>

        <h2 className="text-2xl font-semibold text-center text-gray-700 mb-2">Create Account</h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          Farmer registration requires RSBSA verification. Your account will be active once approved by MAO.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Name ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                name="first_name"
                type="text"
                value={formData.first_name}
                onChange={handleChange}
                onKeyDown={handleNameKeyDown}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                name="last_name"
                type="text"
                value={formData.last_name}
                onChange={handleChange}
                onKeyDown={handleNameKeyDown}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* ── Username / Email / Phone ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder="+63 9XX XXX XXXX"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
          </div>

          {/* ── Password ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                required
                minLength={8}
              />
              {formData.password.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {validatePassword(formData.password).map((rule) => (
                    <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${rule.test ? 'text-green-600' : 'text-red-500'}`}>
                      {rule.test ? (
                        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      {rule.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                name="password_confirm"
                type="password"
                value={formData.password_confirm}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                required
                minLength={8}
              />
            </div>
          </div>

          {/* ── RSBSA ── */}
          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center mb-4">
              <ShieldCheck className="w-5 h-5 text-primary mr-2" />
              <h3 className="text-base font-semibold text-gray-800">RSBSA Verification</h3>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-blue-800">
              Your account will be reviewed by the Magalang Agricultural Office before activation.
              A valid RSBSA number and government-issued ID are required.
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RSBSA Number <span className="text-red-500">*</span>
              </label>
              <input
                name="rsbsa_number"
                type="text"
                value={formData.rsbsa_number}
                onChange={handleChange}
                placeholder="e.g. 03-0101-000-00000-0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Your Registry System for Basic Sectors in Agriculture number from the DA
              </p>
            </div>

            {/* ID Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid Government ID <span className="text-red-500">*</span>
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  fileError
                    ? 'border-red-400 bg-red-50'
                    : validIdPreview
                    ? 'border-primary bg-green-50'
                    : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                }`}
                onClick={() => document.getElementById('reg-valid-id').click()}
              >
                {validIdPreview ? (
                  <div>
                    <img
                      src={validIdPreview}
                      alt="ID Preview"
                      className="max-h-40 mx-auto rounded-lg object-cover mb-2"
                    />
                    <p className="text-sm text-primary font-medium">{validIdFile?.name}</p>
                    <p className="text-xs text-gray-400 mt-1">Click to change</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload your valid ID</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG · Max 5 MB</p>
                  </div>
                )}
              </div>
              <input
                id="reg-valid-id"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {fileError && (
                <div className="flex items-start gap-2 mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{fileError}</span>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Accepted: PhilSys, Driver's License, Passport, SSS, GSIS, PRC, Voter's ID
              </p>
            </div>

            {/* Optional notes */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional information for the admin..."
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-gray-900 py-3 rounded-lg hover:bg-yellow-400 transition-colors font-semibold flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed disabled:text-white"
          >
            {loading ? (
              <>
                <Loader className="animate-spin mr-2 w-5 h-5" />
                Submitting Registration...
              </>
            ) : (
              'Submit Registration'
            )}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-yellow-600 font-semibold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;