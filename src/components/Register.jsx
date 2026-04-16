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

  // Per-field inline errors (client-side + server-side mapped)
  const [fieldErrors, setFieldErrors] = useState({});

  const validatePassword = (pwd) => {
    return [
      { test: pwd.length >= 8,          label: 'At least 8 characters' },
      { test: /[A-Z]/.test(pwd),        label: 'At least 1 uppercase letter' },
      { test: /[a-z]/.test(pwd),        label: 'At least 1 lowercase letter' },
      { test: /[0-9]/.test(pwd),        label: 'At least 1 number' },
      { test: /[^A-Za-z0-9]/.test(pwd), label: 'At least 1 special character (!@#$%^&*)' },
    ];
  };

  const [validIdFile, setValidIdFile] = useState(null);
  const [validIdPreview, setValidIdPreview] = useState(null);
  const [fileError, setFileError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Clear a specific field error when the user starts correcting it
  const clearFieldError = (name) => {
    if (fieldErrors[name]) {
      setFieldErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    clearFieldError(name);
  };

  const handleNameKeyDown = (e) => {
    if (/\d/.test(e.key)) e.preventDefault();
  };

  const handlePhoneChange = (e) => {
    const cleaned = e.target.value.replace(/[^\d+\s\-()]/g, '');
    setFormData({ ...formData, phone: cleaned });
    clearFieldError('phone');
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
      e.target.value = '';
      return;
    }
    setFileError('');
    setValidIdFile(file);
    setValidIdPreview(URL.createObjectURL(file));
  };

  // ── Client-side validation — returns field-keyed error object ──────────────
  const validateForm = () => {
    const errors = {};

    if (!formData.first_name.trim())
      errors.first_name = 'First name is required.';

    if (!formData.last_name.trim())
      errors.last_name = 'Last name is required.';

    if (!formData.username.trim()) {
      errors.username = 'Username is required.';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters.';
    } else if (!/^[\w.@+-]+$/.test(formData.username)) {
      errors.username = 'Username may only contain letters, numbers, and @/./+/-/_ characters.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email)) {
      errors.email = 'Enter a valid email address (e.g. name@example.com).';
    }

    const pwdRules = validatePassword(formData.password);
    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (pwdRules.some((r) => !r.test)) {
      errors.password = 'Password does not meet all the requirements below.';
    }

    if (!formData.password_confirm) {
      errors.password_confirm = 'Please confirm your password.';
    } else if (formData.password !== formData.password_confirm) {
      errors.password_confirm = 'Passwords do not match.';
    }

    if (!formData.rsbsa_number.trim())
      errors.rsbsa_number = 'RSBSA number is required.';

    if (!validIdFile)
      errors.valid_id_image = 'Please upload a valid government-issued ID image.';

    return errors;
  };

  // ── Map DRF error response to field-keyed errors ───────────────────────────
  const mapServerErrors = (data) => {
    if (!data || typeof data !== 'object') return null;

    const FIELD_MAP = {
      username:     (v) => v,
      email:        (v) => v,
      password:     (v) => v,
      first_name:   (v) => v,
      last_name:    (v) => v,
      phone:        (v) => v,
      rsbsa_number: () => 'An account with this RSBSA number is already registered.',
      valid_id_image: (v) => v,
      // DRF non-field errors land in 'non_field_errors' or 'detail'
    };

    const mapped = {};

    for (const [key, transform] of Object.entries(FIELD_MAP)) {
      if (data[key]) {
        const raw = Array.isArray(data[key]) ? data[key][0] : data[key];
        mapped[key] = transform(raw);
      }
    }

    // Friendly rewrites for common Django/DRF messages
    if (mapped.username) {
      if (/already exists/i.test(mapped.username))
        mapped.username = 'This username is already taken. Please choose a different one.';
      if (/150 characters/i.test(mapped.username))
        mapped.username = 'Username must be 150 characters or fewer.';
    }
    if (mapped.email) {
      if (/already exists/i.test(mapped.email))
        mapped.email = 'An account with this email already exists.';
      if (/valid email/i.test(mapped.email))
        mapped.email = 'Enter a valid email address (e.g. name@example.com).';
    }
    if (mapped.password) {
      if (/too short/i.test(mapped.password))
        mapped.password = 'Password must be at least 8 characters.';
      if (/too common/i.test(mapped.password))
        mapped.password = 'This password is too common. Please choose a stronger one.';
      if (/entirely numeric/i.test(mapped.password))
        mapped.password = 'Password cannot be entirely numeric.';
    }

    return Object.keys(mapped).length > 0 ? mapped : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Run client-side validation first
    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      // Scroll to the first error
      const firstKey = Object.keys(clientErrors)[0];
      document.querySelector(`[name="${firstKey}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setFieldErrors({});
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
      const responseData = err.response?.data;
      const mapped = mapServerErrors(responseData);

      if (mapped) {
        setFieldErrors(mapped);
        // Scroll to the first server error field
        const firstKey = Object.keys(mapped)[0];
        document.querySelector(`[name="${firstKey}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Fallback: non-field / unexpected error shown at the top
        const fallback =
          responseData?.detail ||
          responseData?.non_field_errors?.[0] ||
          (typeof responseData === 'string' ? responseData : null) ||
          'Registration failed. Please check your information and try again.';
        setFieldErrors({ _general: fallback });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Reusable inline error message ──────────────────────────────────────────
  const FieldError = ({ name }) =>
    fieldErrors[name] ? (
      <p className="flex items-center gap-1.5 mt-1.5 text-sm text-red-600">
        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {fieldErrors[name]}
      </p>
    ) : null;

  // Helper: add red border when a field has an error
  const inputClass = (name) =>
    `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors ${
      fieldErrors[name]
        ? 'border-red-400 bg-red-50 focus:ring-red-300'
        : 'border-gray-300'
    }`;

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

        {/* General / non-field error banner */}
        {fieldErrors._general && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{fieldErrors._general}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

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
                className={inputClass('first_name')}
                required
              />
              <FieldError name="first_name" />
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
                className={inputClass('last_name')}
                required
              />
              <FieldError name="last_name" />
            </div>
          </div>

          {/* ── Username ── */}
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
              className={inputClass('username')}
              required
            />
            <FieldError name="username" />
          </div>

          {/* ── Email ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className={inputClass('email')}
              required
            />
            <FieldError name="email" />
          </div>

          {/* ── Phone ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder="+63 9XX XXX XXXX"
              className={inputClass('phone')}
            />
            <FieldError name="phone" />
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
                className={inputClass('password')}
                required
                minLength={8}
              />
              <FieldError name="password" />
              {formData.password.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {validatePassword(formData.password).map((rule) => (
                    <li
                      key={rule.label}
                      className={`flex items-center gap-1.5 text-xs ${rule.test ? 'text-green-600' : 'text-red-500'}`}
                    >
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
                className={inputClass('password_confirm')}
                required
                minLength={8}
              />
              <FieldError name="password_confirm" />
              {/* Live match indicator once both fields have content */}
              {formData.password_confirm.length > 0 && formData.password.length > 0 && !fieldErrors.password_confirm && (
                <p className={`flex items-center gap-1.5 mt-1.5 text-xs ${formData.password === formData.password_confirm ? 'text-green-600' : 'text-red-500'}`}>
                  {formData.password === formData.password_confirm ? (
                    <>
                      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Passwords match
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Passwords do not match
                    </>
                  )}
                </p>
              )}
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
                className={inputClass('rsbsa_number')}
                required
              />
              <FieldError name="rsbsa_number" />
              {!fieldErrors.rsbsa_number && (
                <p className="text-xs text-gray-400 mt-1">
                  Your Registry System for Basic Sectors in Agriculture number from the DA
                </p>
              )}
            </div>

            {/* ID Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid Government ID <span className="text-red-500">*</span>
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  fileError || fieldErrors.valid_id_image
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
                    <Upload className={`w-8 h-8 mx-auto mb-2 ${fieldErrors.valid_id_image ? 'text-red-400' : 'text-gray-400'}`} />
                    <p className={`text-sm ${fieldErrors.valid_id_image ? 'text-red-600' : 'text-gray-600'}`}>
                      Click to upload your valid ID
                    </p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG · Max 5 MB</p>
                  </div>
                )}
              </div>
              <input
                id="reg-valid-id"
                name="valid_id_image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {(fileError || fieldErrors.valid_id_image) && (
                <div className="flex items-start gap-2 mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{fileError || fieldErrors.valid_id_image}</span>
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