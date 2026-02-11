import React, { useState, useEffect } from 'react';
import {
 User, Mail, Phone, Calendar, MapPin, Settings, Lock, Bell,
 X, Save, Eye, EyeOff, ShieldCheck, ShieldAlert, FileText, Upload,
 Clock, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import Navigation from './Navigation';
import api from '../utils/api';



// ==================== VERIFICATION REQUEST MODAL ====================
const VerificationRequestModal = ({ isOpen, onClose, onSuccess, existingRequest }) => {
 const [rsbsaNumber, setRsbsaNumber] = useState('');
 const [validIdFile, setValidIdFile] = useState(null);
 const [validIdPreview, setValidIdPreview] = useState(null);
 const [notes, setNotes] = useState('');
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');

 useEffect(() => {
 if (!isOpen) {
 setRsbsaNumber('');
 setValidIdFile(null);
 setValidIdPreview(null);
 setNotes('');
 setError('');
 }
 }, [isOpen]);

 const handleFileChange = (e) => {
 const file = e.target.files[0];
 if (!file) return;
 if (!file.type.startsWith('image/')) {
 setError('Please upload an image file (JPG, PNG, etc.)');
 return;
 }
 if (file.size > 5 * 1024 * 1024) {
 setError('Image must be smaller than 5MB');
 return;
 }
 setValidIdFile(file);
 setValidIdPreview(URL.createObjectURL(file));
 setError('');
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 setError('');

 if (!rsbsaNumber.trim()) {
 setError('Please enter your RSBSA number.');
 return;
 }
 if (!validIdFile) {
 setError('Please upload a valid ID image.');
 return;
 }

 setLoading(true);
 try {
 const formData = new FormData();
 formData.append('rsbsa_number', rsbsaNumber.trim());
 formData.append('valid_id_image', validIdFile);
 formData.append('notes', notes.trim());

 await api.post('/verification-requests/', formData, {
 headers: { 'Content-Type': 'multipart/form-data' }
 });

 onSuccess();
 onClose();
 } catch (err) {
 setError(err.response?.data?.error || 'Failed to submit verification request. Please try again.');
 } finally {
 setLoading(false);
 }
 };

 if (!isOpen) return null;

 // Show status if there is an existing request
 if (existingRequest) {
 return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
 <div className="flex justify-between items-center p-6 border-b border-gray-200">
 <h2 className="text-xl font-bold text-gray-800 flex items-center">
 <ShieldCheck className="w-5 h-5 mr-2 text-primary" />
 Verification Request Status
 </h2>
 <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
 <X className="w-5 h-5" />
 </button>
 </div>
 <div className="p-6">
 {existingRequest.status === 'pending' && (
 <div className="text-center py-4">
 <Clock className="w-16 h-16 text-amber-400 mx-auto mb-3" />
 <h3 className="text-lg font-semibold text-gray-800 mb-2">Under Review</h3>
 <p className="text-gray-600 text-sm">
 Your verification request has been submitted and is being reviewed by our admin team.
 You will be notified once it has been processed.
 </p>
 <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
 <p className="text-sm font-medium text-amber-800">Submitted Details:</p>
 <p className="text-sm text-amber-700 mt-1">RSBSA Number: {existingRequest.rsbsa_number}</p>
 <p className="text-sm text-amber-700">
 Submitted: {new Date(existingRequest.created_at).toLocaleDateString()}
 </p>
 </div>
 </div>
 )}
 {existingRequest.status === 'rejected' && (
 <div className="text-center py-4">
 <XCircle className="w-16 h-16 text-red-400 mx-auto mb-3" />
 <h3 className="text-lg font-semibold text-gray-800 mb-2">Request Rejected</h3>
 <p className="text-gray-600 text-sm">Your previous request was rejected.</p>
 {existingRequest.review_notes && (
 <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-left">
 <p className="text-sm font-medium text-red-800">Admin Feedback:</p>
 <p className="text-sm text-red-700 mt-1">{existingRequest.review_notes}</p>
 </div>
 )}
 <p className="text-sm text-gray-500 mt-4">
 You may submit a new verification request with corrected information.
 </p>
 </div>
 )}
 </div>
 <div className="p-6 border-t border-gray-200">
 <button
 onClick={onClose}
 className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
 >
 Close
 </button>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
 <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
 <h2 className="text-xl font-bold text-gray-800 flex items-center">
 <ShieldCheck className="w-5 h-5 mr-2 text-primary" />
 Request Verification
 </h2>
 <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="p-6">
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
 <p className="text-sm text-blue-800 font-medium mb-1">Why get verified?</p>
 <p className="text-sm text-blue-700">
 Verified farmers gain access to farm registration and full pest monitoring features.
 Verification requires your RSBSA (Registry System for Basic Sectors in Agriculture) number and a valid government-issued ID.
 </p>
 </div>

 {error && (
 <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
 {error}
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-5">
 {/* RSBSA Number */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 RSBSA Number <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={rsbsaNumber}
 onChange={(e) => setRsbsaNumber(e.target.value)}
 placeholder="e.g. 03-0101-000-00000-0"
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
 required
 />
 <p className="text-xs text-gray-500 mt-1">
 Your RSBSA registration number from the Department of Agriculture
 </p>
 </div>

 {/* Valid ID Upload */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Valid Government ID <span className="text-red-500">*</span>
 </label>
 <div
 className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
 validIdPreview
 ? 'border-primary bg-green-50'
 : 'border-gray-300 hover:border-primary hover:bg-gray-50'
 }`}
 onClick={() => document.getElementById('valid-id-upload').click()}
 >
 {validIdPreview ? (
 <div>
 <img
 src={validIdPreview}
 alt="ID Preview"
 className="max-h-48 mx-auto rounded-lg object-cover mb-2"
 />
 <p className="text-sm text-primary font-medium">
 {validIdFile?.name}
 </p>
 <p className="text-xs text-gray-500 mt-1">Click to change</p>
 </div>
 ) : (
 <div>
 <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
 <p className="text-sm text-gray-600">Click to upload your valid ID</p>
 <p className="text-xs text-gray-400 mt-1">JPG, PNG Max 5MB</p>
 </div>
 )}
 </div>
 <input
 id="valid-id-upload"
 type="file"
 accept="image/*"
 onChange={handleFileChange}
 className="hidden"
 />
 <p className="text-xs text-gray-500 mt-1">
 Accepted IDs: PhilSys, Driver's License, Passport, SSS, GSIS, PRC, Voter's ID
 </p>
 </div>

 {/* Additional Notes */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Additional Notes <span className="text-gray-400">(optional)</span>
 </label>
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Any additional information for the admin..."
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
 />
 </div>

 <div className="flex space-x-3 pt-2">
 <button
 type="submit"
 disabled={loading}
 className="flex-1 bg-primary text-white py-2.5 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
 >
 {loading ? (
 <>
 <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
 </svg>
 Submitting...
 </>
 ) : (
 <>
 <ShieldCheck className="w-4 h-4 mr-2" />
 Submit Request
 </>
 )}
 </button>
 <button
 type="button"
 onClick={onClose}
 className="flex-1 bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
 >
 Cancel
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 );
};


// ==================== SETTINGS MODAL ====================
const SettingsModal = ({ isOpen, onClose, user, onUpdateSuccess }) => {
 const [activeTab, setActiveTab] = useState('profile');
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const [showCurrentPassword, setShowCurrentPassword] = useState(false);
 const [showNewPassword, setShowNewPassword] = useState(false);
 const [showConfirmPassword, setShowConfirmPassword] = useState(false);

 const [profileData, setProfileData] = useState({
 first_name: '',
 last_name: '',
 email: '',
 phone: ''
 });

 const [passwordData, setPasswordData] = useState({
 current_password: '',
 new_password: '',
 confirm_password: ''
 });

 const [notificationSettings, setNotificationSettings] = useState({
 email_notifications: true,
 detection_alerts: true,
 weekly_reports: false,
 critical_alerts: true
 });

 useEffect(() => {
 if (user && isOpen) {
 setProfileData({
 first_name: user.first_name || '',
 last_name: user.last_name || '',
 email: user.email || '',
 phone: user.phone || ''
 });
 }
 }, [user, isOpen]);

 const handleUpdateProfile = async (e) => {
 e.preventDefault();
 setLoading(true);
 setError('');
 setSuccess('');
 try {
 await api.patch('/auth/profile/update/', profileData);
 setSuccess('Profile updated successfully!');
 setTimeout(() => { onUpdateSuccess(); setSuccess(''); }, 2000);
 } catch (err) {
 setError(err.response?.data?.error || 'Failed to update profile');
 } finally {
 setLoading(false);
 }
 };

 const handleChangePassword = async (e) => {
 e.preventDefault();
 setLoading(true);
 setError('');
 setSuccess('');
 if (passwordData.new_password !== passwordData.confirm_password) {
 setError('New passwords do not match');
 setLoading(false);
 return;
 }
 if (passwordData.new_password.length < 8) {
 setError('Password must be at least 8 characters long');
 setLoading(false);
 return;
 }
 try {
 await api.post('/auth/change-password/', {
 current_password: passwordData.current_password,
 new_password: passwordData.new_password
 });
 setSuccess('Password changed successfully!');
 setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
 setTimeout(() => setSuccess(''), 3000);
 } catch (err) {
 setError(err.response?.data?.error || 'Failed to change password');
 } finally {
 setLoading(false);
 }
 };

 const handleUpdateNotifications = async (e) => {
 e.preventDefault();
 setLoading(true);
 setError('');
 setSuccess('');
 try {
 await api.patch('/auth/notification-settings/', notificationSettings);
 setSuccess('Notification settings updated!');
 setTimeout(() => setSuccess(''), 2000);
 } catch (err) {
 setError(err.response?.data?.error || 'Failed to update settings');
 } finally {
 setLoading(false);
 }
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
 <h2 className="text-2xl font-bold text-gray-800 flex items-center">
 <Settings className="w-6 h-6 mr-2" />
 Settings
 </h2>
 <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
 <X className="w-6 h-6" />
 </button>
 </div>

 {/* Tabs */}
 <div className="border-b border-gray-200">
 <div className="flex space-x-4 px-6">
 {[
 { key: 'profile', icon: User, label: 'Profile' },
 { key: 'password', icon: Lock, label: 'Password' },
 { key: 'notifications', icon: Bell, label: 'Notifications' },
 ].map(({ key, icon: Icon, label }) => (
 <button
 key={key}
 onClick={() => setActiveTab(key)}
 className={`py-3 px-4 font-medium border-b-2 transition-colors ${
 activeTab === key
 ? 'border-primary text-primary'
 : 'border-transparent text-gray-600 hover:text-gray-800'
 }`}
 >
 <Icon className="w-4 h-4 inline mr-2" />
 {label}
 </button>
 ))}
 </div>
 </div>

 {/* Content */}
 <div className="p-6">
 {error && (
 <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
 {error}
 </div>
 )}
 {success && (
 <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
 {success}
 </div>
 )}

 {/* Profile Tab */}
 {activeTab === 'profile' && (
 <form onSubmit={handleUpdateProfile} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
 <input
 type="text"
 value={profileData.first_name}
 onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
 <input
 type="text"
 value={profileData.last_name}
 onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
 />
 </div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
 <input
 type="email"
 value={profileData.email}
 onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
 <input
 type="tel"
 value={profileData.phone}
 onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
 placeholder="+63 XXX XXX XXXX"
 />
 </div>
 <div className="flex space-x-3 pt-4">
 <button
 type="submit"
 disabled={loading}
 className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center disabled:bg-gray-400"
 >
 <Save className="w-4 h-4 mr-2" />
 {loading ? 'Saving...' : 'Save Changes'}
 </button>
 <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium">
 Cancel
 </button>
 </div>
 </form>
 )}

 {/* Password Tab */}
 {activeTab === 'password' && (
 <form onSubmit={handleChangePassword} className="space-y-4">
 {[
 { label: 'Current Password', key: 'current_password', show: showCurrentPassword, toggle: setShowCurrentPassword },
 { label: 'New Password', key: 'new_password', show: showNewPassword, toggle: setShowNewPassword, hint: 'Must be at least 8 characters long' },
 { label: 'Confirm New Password', key: 'confirm_password', show: showConfirmPassword, toggle: setShowConfirmPassword },
 ].map(({ label, key, show, toggle, hint }) => (
 <div key={key}>
 <label className="block text-sm font-medium text-gray-700 mb-1">{label} *</label>
 <div className="relative">
 <input
 type={show ? 'text' : 'password'}
 value={passwordData[key]}
 onChange={(e) => setPasswordData({ ...passwordData, [key]: e.target.value })}
 className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
 minLength={key !== 'current_password' ? 8 : undefined}
 required
 />
 <button type="button" onClick={() => toggle(!show)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">
 {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
 </button>
 </div>
 {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
 </div>
 ))}
 <div className="flex space-x-3 pt-4">
 <button
 type="submit"
 disabled={loading}
 className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center disabled:bg-gray-400"
 >
 <Lock className="w-4 h-4 mr-2" />
 {loading ? 'Changing...' : 'Change Password'}
 </button>
 <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium">
 Cancel
 </button>
 </div>
 </form>
 )}

 {/* Notifications Tab */}
 {activeTab === 'notifications' && (
 <form onSubmit={handleUpdateNotifications} className="space-y-4">
 <div className="space-y-3">
 {[
 { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive updates via email', danger: false },
 { key: 'detection_alerts', label: 'Detection Alerts', desc: 'Get notified about new pest detections', danger: false },
 { key: 'weekly_reports', label: 'Weekly Reports', desc: 'Receive weekly summary reports', danger: false },
 { key: 'critical_alerts', label: 'Critical Alerts', desc: 'Important notifications about critical infestations', danger: true },
 ].map(({ key, label, desc, danger }) => (
 <div
 key={key}
 className={`flex items-center justify-between p-4 border rounded-lg ${danger ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}
 >
 <div>
 <h4 className="font-medium text-gray-800">{label}</h4>
 <p className="text-sm text-gray-600">{desc}</p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={notificationSettings[key]}
 onChange={(e) => setNotificationSettings({ ...notificationSettings, [key]: e.target.checked })}
 className="sr-only peer"
 />
 <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 ${danger ? 'peer-focus:ring-red-300 peer-checked:bg-red-600' : 'peer-focus:ring-green-300 peer-checked:bg-primary'} rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
 </label>
 </div>
 ))}
 </div>
 <div className="flex space-x-3 pt-4">
 <button
 type="submit"
 disabled={loading}
 className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center disabled:bg-gray-400"
 >
 <Save className="w-4 h-4 mr-2" />
 {loading ? 'Saving...' : 'Save Settings'}
 </button>
 <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium">
 Cancel
 </button>
 </div>
 </form>
 )}
 </div>
 </div>
 </div>
 );
};


// ==================== MAIN PROFILE COMPONENT ====================
const Profile = ({ user, onLogout }) => {
 const [profileData, setProfileData] = useState(null);
 const [loading, setLoading] = useState(true);
 const [showSettings, setShowSettings] = useState(false);
 const [showVerificationModal, setShowVerificationModal] = useState(false);
 const [verificationRequest, setVerificationRequest] = useState(null);
 const [verificationLoading, setVerificationLoading] = useState(false);

 useEffect(() => {
 fetchProfileData();
 fetchVerificationStatus();
 }, []);

 const fetchProfileData = async () => {
 try {
 const profileRes = await api.get('/auth/profile/');
 setProfileData(profileRes.data);
 } catch (error) {
 console.error('Error fetching profile data:', error);
 } finally {
 setLoading(false);
 }
 };

 const fetchVerificationStatus = async () => {
 setVerificationLoading(true);
 try {
 const res = await api.get('/verification-requests/my_request/');
 setVerificationRequest(res.data);
 } catch (err) {
 // No request yet that's fine
 setVerificationRequest(null);
 } finally {
 setVerificationLoading(false);
 }
 };

 const handleVerificationSuccess = () => {
 fetchVerificationStatus();
 fetchProfileData();
 };

 const getVerificationBadge = () => {
 if (profileData?.is_verified) {
 return (
 <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-300 mb-2">
 <CheckCircle className="w-4 h-4 mr-1.5" />
 Verified Farmer
 </span>
 );
 }
 if (verificationRequest?.status === 'pending') {
 return (
 <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-300 mb-2">
 <Clock className="w-4 h-4 mr-1.5" />
 Verification Pending
 </span>
 );
 }
 if (verificationRequest?.status === 'rejected') {
 return (
 <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-300 mb-2">
 <XCircle className="w-4 h-4 mr-1.5" />
 Verification Rejected
 </span>
 );
 }
 return (
 <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-300 mb-2">
 <ShieldAlert className="w-4 h-4 mr-1.5" />
 Unverified User
 </span>
 );
 };

 const getVerificationCTA = () => {
 // Already verified no CTA needed
 if (profileData?.is_verified) return null;

 // Pending review
 if (verificationRequest?.status === 'pending') {
 return (
 <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
 <div className="flex items-start">
 <Clock className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
 <div>
 <p className="text-xs font-medium text-blue-800">Request Under Review</p>
 <p className="text-xs text-blue-600 mt-0.5">
 Submitted {new Date(verificationRequest.created_at).toLocaleDateString()}
 </p>
 <button
 onClick={() => setShowVerificationModal(true)}
 className="text-xs text-blue-700 underline mt-1 hover:text-blue-900"
 >
 View details
 </button>
 </div>
 </div>
 </div>
 );
 }

 // Rejected allow resubmission
 if (verificationRequest?.status === 'rejected') {
 return (
 <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
 <div className="flex items-start mb-2">
 <XCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
 <div>
 <p className="text-xs font-medium text-red-800">Previous Request Rejected</p>
 {verificationRequest.review_notes && (
 <p className="text-xs text-red-600 mt-0.5">"{verificationRequest.review_notes}"</p>
 )}
 </div>
 </div>
 <button
 onClick={() => setShowVerificationModal(true)}
 className="w-full bg-red-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
 >
 <ShieldCheck className="w-3 h-3 mr-1" />
 Resubmit Verification
 </button>
 </div>
 );
 }

 // No request yet show CTA
 return (
 <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
 <div className="flex items-start mb-2">
 <AlertTriangle className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
 <div>
 <p className="text-xs font-medium text-amber-800">Account not verified</p>
 <p className="text-xs text-amber-600 mt-0.5">
 Submit your RSBSA number and valid ID to unlock all features.
 </p>
 </div>
 </div>
 <button
 onClick={() => setShowVerificationModal(true)}
 className="w-full bg-primary text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-green-600 transition-colors flex items-center justify-center"
 >
 <ShieldCheck className="w-3 h-3 mr-1" />
 Request Verification
 </button>
 </div>
 );
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-gray-50">
 <Navigation user={user} onLogout={onLogout} />
 <div className="flex items-center justify-center h-96">
 <div className="text-xl">Loading profile...</div>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-gray-50">
 <Navigation user={user} onLogout={onLogout} />

 <div className="max-w-7xl mx-auto px-4 py-8">
 <h1 className="text-3xl font-bold text-gray-800 mb-8">My Profile</h1>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Profile Card */}
 <div className="lg:col-span-1">
 <div className="bg-white rounded-lg shadow p-6">
 <div className="flex flex-col items-center">
 <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center mb-4">
 <User className="w-16 h-16 text-white" />
 </div>

 <h2 className="text-2xl font-bold text-gray-800 mb-1">
 {profileData?.first_name} {profileData?.last_name}
 </h2>
 <p className="text-gray-600 mb-3">@{profileData?.username}</p>

 {/* Verification Status Badge */}
 {getVerificationBadge()}

 {/* Verification CTA for unverified users */}
 {!verificationLoading && getVerificationCTA()}

 <div className="w-full space-y-3 mt-4">
 <div className="flex items-center text-gray-700">
 <Mail className="w-5 h-5 mr-3 text-gray-500" />
 <span className="text-sm">{profileData?.email}</span>
 </div>
 {profileData?.phone && (
 <div className="flex items-center text-gray-700">
 <Phone className="w-5 h-5 mr-3 text-gray-500" />
 <span className="text-sm">{profileData.phone}</span>
 </div>
 )}
 <div className="flex items-center text-gray-700">
 <Calendar className="w-5 h-5 mr-3 text-gray-500" />
 <span className="text-sm">
 Joined {new Date(profileData?.created_at || profileData?.date_joined).toLocaleDateString()}
 </span>
 </div>
 <div className="flex items-center text-gray-700">
 <MapPin className="w-5 h-5 mr-3 text-gray-500" />
 <span className="text-sm">Magalang, Pampanga</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Account Actions */}
 <div className="lg:col-span-2">
 <div className="bg-white rounded-lg shadow p-6">
 <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Actions</h3>
 <div className="space-y-3">
 <button
 onClick={() => setShowSettings(true)}
 className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
 >
 <Settings className="w-5 h-5 mr-3 text-gray-600" />
 Settings
 </button>

 {/* Show verification button in account actions for unverified users */}
 {!profileData?.is_verified && (
 <button
 onClick={() => setShowVerificationModal(true)}
 className="w-full text-left px-4 py-3 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors flex items-center text-amber-700"
 >
 <ShieldCheck className="w-5 h-5 mr-3 text-amber-500" />
 {verificationRequest?.status === 'pending'
 ? 'View Verification Status'
 : verificationRequest?.status === 'rejected'
 ? 'Resubmit Verification Request'
 : 'Request Account Verification'}
 </button>
 )}

 <button
 onClick={onLogout}
 className="w-full text-left px-4 py-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
 >
 Logout
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Settings Modal */}
 <SettingsModal
 isOpen={showSettings}
 onClose={() => setShowSettings(false)}
 user={profileData}
 onUpdateSuccess={fetchProfileData}
 />

 {/* Verification Request Modal */}
 <VerificationRequestModal
 isOpen={showVerificationModal}
 onClose={() => setShowVerificationModal(false)}
 onSuccess={handleVerificationSuccess}
 existingRequest={
 verificationRequest?.status === 'pending' ? verificationRequest : null
 }
 />
 </div>
 );
};

export default Profile;