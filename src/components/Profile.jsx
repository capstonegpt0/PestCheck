import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Calendar, MapPin, Settings, Lock, Bell,
  X, Save, Eye, EyeOff, Accessibility, Type, ZoomIn
} from 'lucide-react';
import Navigation from './Navigation';
import PageContent from './PageContent';
import api from '../utils/api';


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
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    push_enabled: true,
    detection_alerts: true,
    critical_alerts: true,
  });

  const [largeFontMode, setLargeFontMode] = useState(() => {
    return localStorage.getItem('pestcheck_large_font') === 'true';
  });

  useEffect(() => {
    if (user && isOpen) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      api.get('/auth/notification-settings/').then((res) => {
        if (res.data && typeof res.data === 'object') {
          setNotificationSettings((prev) => ({ ...prev, ...res.data }));
        }
      }).catch(() => {});
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
        new_password: passwordData.new_password,
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
      if (notificationSettings.push_enabled) {
        if ('Notification' in window && Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            setNotificationSettings((prev) => ({ ...prev, push_enabled: false }));
            setError('Push notification permission was denied. You can enable it in browser settings.');
            setLoading(false);
            return;
          }
        }
        try {
          const { subscribeToPush } = await import('../utils/pushNotifications');
          await subscribeToPush();
        } catch (pushErr) {
          console.error('Push subscription failed:', pushErr);
        }
      }
      await api.patch('/auth/notification-settings/', notificationSettings);
      setSuccess('Notification settings updated!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLargeFont = (enabled) => {
    setLargeFontMode(enabled);
    localStorage.setItem('pestcheck_large_font', String(enabled));
    if (enabled) {
      document.documentElement.classList.add('large-font-mode');
    } else {
      document.documentElement.classList.remove('large-font-mode');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center overflow-y-auto z-50 p-4 py-6">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-auto">
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
          <div className="flex overflow-x-auto scrollbar-hide px-3 sm:px-6 gap-0">
            {[
              { key: 'profile', icon: User, label: 'Profile' },
              { key: 'password', icon: Lock, label: 'Password' },
              { key: 'notifications', icon: Bell, label: 'Notifications' },
              { key: 'accessibility', icon: Accessibility, label: 'Accessibility' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-shrink-0 flex items-center py-3 px-2 sm:px-4 font-medium border-b-2 transition-colors text-sm whitespace-nowrap ${
                  activeTab === key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{label}</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
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
                    <button
                      type="button"
                      onClick={() => toggle(!show)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
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
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
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
                  { key: 'push_enabled', label: 'Push Notifications', desc: 'Receive browser push notifications', danger: false },
                  { key: 'detection_alerts', label: 'Detection Alerts', desc: 'Get notified about new pest detections near your farms', danger: false },
                  { key: 'critical_alerts', label: 'Critical Alerts', desc: 'Important notifications about critical infestations', danger: true },
                ].map(({ key, label, desc, danger }) => (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      danger ? 'border-red-200 bg-red-50' : 'border-gray-200'
                    }`}
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
                      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 ${
                        danger
                          ? 'peer-focus:ring-red-300 peer-checked:bg-red-600'
                          : 'peer-focus:ring-green-300 peer-checked:bg-primary'
                      } rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
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
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Accessibility Tab */}
          {activeTab === 'accessibility' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Accessibility className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Accessibility Settings</p>
                    <p className="text-sm text-blue-700 mt-0.5">
                      Adjust display settings to improve readability and make PestCheck easier to use.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start flex-1 mr-4">
                    <Type className="w-5 h-5 text-gray-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-gray-800">Large Text</h4>
                      <p className="text-sm text-gray-600 mt-0.5">
                        Increases font sizes across the app for better readability.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={largeFontMode}
                      onChange={(e) => handleToggleLargeFont(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 peer-checked:bg-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>

                {/* Preview */}
                <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center mb-3">
                    <ZoomIn className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Preview</span>
                  </div>
                  <div className={largeFontMode ? 'space-y-2' : 'space-y-1'}>
                    <p className={`font-bold text-gray-800 ${largeFontMode ? 'text-xl' : 'text-base'}`}>
                      Sample Heading
                    </p>
                    <p className={`text-gray-600 ${largeFontMode ? 'text-lg leading-relaxed' : 'text-sm'}`}>
                      This is how text will appear throughout the app when {largeFontMode ? 'large text is enabled' : 'using default text size'}.
                    </p>
                    <p className={`text-gray-500 ${largeFontMode ? 'text-base' : 'text-xs'}`}>
                      Small details like dates and labels will also be {largeFontMode ? 'easier to read' : 'at standard size'}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Done
                </button>
              </div>
            </div>
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

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const res = await api.get('/auth/profile/');
      setProfileData(res.data);
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} onLogout={onLogout} />
        <PageContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-xl">Loading profile...</div>
          </div>
        </PageContent>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} onLogout={onLogout} />
      <PageContent>
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-5 sm:mb-8">My Profile</h1>

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
                  <p className="text-gray-600 mb-4">@{profileData?.username}</p>

                  <div className="w-full space-y-3">
                    <div className="flex items-center text-gray-700">
                      <Mail className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
                      <span className="text-sm">{profileData?.email}</span>
                    </div>
                    {profileData?.phone && (
                      <div className="flex items-center text-gray-700">
                        <Phone className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
                        <span className="text-sm">{profileData.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center text-gray-700">
                      <Calendar className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
                      <span className="text-sm">
                        Joined {new Date(profileData?.created_at || profileData?.date_joined).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <MapPin className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
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

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          user={profileData}
          onUpdateSuccess={fetchProfileData}
        />
      </PageContent>
    </div>
  );
};

export default Profile;