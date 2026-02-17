import React, { useState, useEffect } from 'react';
import { Bell, Plus, Edit, Trash2, AlertTriangle, Info, AlertCircle, X, Eye } from 'lucide-react';
import AdminNavigation from './AdminNavigation';
import api from '../../utils/api';

const AdminAlerts = ({ user, onLogout }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [farms, setFarms] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    alert_type: 'info',
    target_area: '',
    is_active: true,
    expires_at: ''
  });

  useEffect(() => {
    fetchAlerts();
    fetchFarms();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/admin/alerts/');
      const alertData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || []);
      
      setAlerts(alertData);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFarms = async () => {
    try {
      const response = await api.get('/admin/farms/');
      const farmData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || []);
      setFarms(farmData);
    } catch (error) {
      console.error('Error fetching farms:', error);
      setFarms([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingAlert) {
        await api.put(`/admin/alerts/${editingAlert.id}/`, formData);
      } else {
        await api.post('/admin/alerts/', formData);
      }
      
      setShowModal(false);
      resetForm();
      fetchAlerts();
    } catch (error) {
      console.error('Error saving alert:', error);
    }
  };

  const handleDelete = async (alertId) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      await api.delete(`/admin/alerts/${alertId}/`);
      fetchAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const handleToggleActive = async (alertId) => {
    try {
      await api.post(`/admin/alerts/${alertId}/toggle_active/`);
      fetchAlerts();
    } catch (error) {
      console.error('Error toggling alert:', error);
    }
  };

  const openEditModal = (alert) => {
    setEditingAlert(alert);
    setFormData({
      title: alert.title,
      message: alert.message,
      alert_type: alert.alert_type,
      target_area: alert.target_area || '',
      is_active: alert.is_active,
      expires_at: alert.expires_at ? new Date(alert.expires_at).toISOString().slice(0, 16) : ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingAlert(null);
    setFormData({
      title: '',
      message: '',
      alert_type: 'info',
      target_area: '',
      is_active: true,
      expires_at: ''
    });
  };

  const getAlertIcon = (type) => {
    const icons = {
      warning: <AlertTriangle className="w-5 h-5" />,
      info: <Info className="w-5 h-5" />,
      critical: <AlertCircle className="w-5 h-5" />
    };
    return icons[type] || <Bell className="w-5 h-5" />;
  };

  const getAlertColor = (type) => {
    const colors = {
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      critical: 'bg-red-50 border-red-200 text-red-800'
    };
    return colors[type] || 'bg-gray-50 border-gray-200 text-gray-800';
  };

  const getNotificationPreviewColor = (type) => {
    const colors = {
      warning: 'bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800',
      info: 'bg-blue-50 border-l-4 border-blue-400 text-blue-800',
      critical: 'bg-red-50 border-l-4 border-red-400 text-red-800'
    };
    return colors[type] || 'bg-gray-50 border-l-4 border-gray-400 text-gray-800';
  };

  const handlePreview = (alert) => {
    setEditingAlert(alert);
    setShowPreview(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={user} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">Alert Management</h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Alert
          </button>
        </div>

        {/* Info Box */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                How Alert Notifications Work
              </h3>
              <p className="text-sm text-blue-800">
                Alerts you create here will appear as <strong>dismissible notifications</strong> in the top-right corner 
                of users' screens when they log in. Users can close them by clicking the X button. Once dismissed, 
                they won't see that alert again. Use the <strong>Preview</strong> button (eye icon) to see exactly 
                how users will see each alert.
              </p>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">Loading alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No alerts created yet</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Alert
              </button>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`border rounded-lg p-6 ${getAlertColor(alert.alert_type)} ${
                  !alert.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="mt-1">
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold">{alert.title}</h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          alert.alert_type === 'critical' ? 'bg-red-200 text-red-900' :
                          alert.alert_type === 'warning' ? 'bg-yellow-200 text-yellow-900' :
                          'bg-blue-200 text-blue-900'
                        }`}>
                          {alert.alert_type}
                        </span>
                        {!alert.is_active && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm mb-3">{alert.message}</p>
                      <div className="flex items-center space-x-4 text-xs">
                        {alert.target_area && (
                          <span>📍 {alert.target_area}</span>
                        )}
                        <span>Created: {new Date(alert.created_at).toLocaleDateString()}</span>
                        {alert.expires_at && (
                          <span>Expires: {new Date(alert.expires_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handlePreview(alert)}
                      className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                      title="Preview how users see this"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(alert.id)}
                      className={`p-2 rounded-lg ${
                        alert.is_active 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                      title={alert.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <Bell className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openEditModal(alert)}
                      className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingAlert ? 'Edit Alert' : 'Create New Alert'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alert Type *
                  </label>
                  <select
                    value={formData.alert_type}
                    onChange={(e) => setFormData({...formData, alert_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="info">Information</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., High Pest Activity Detected"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="4"
                    placeholder="Enter the alert message..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Area
                  </label>
                  <select
                    value={formData.target_area}
                    onChange={(e) => setFormData({...formData, target_area: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Farms (Region-wide)</option>
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.name}>
                        {farm.name} — {farm.user_name} ({farm.crop_type || 'N/A'})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.target_area 
                      ? `Alert will be shown to the owner of "${formData.target_area}"` 
                      : 'Alert will be shown to all users in the region'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                    Alert is active
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {editingAlert ? 'Update Alert' : 'Create Alert'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal - Shows how users will see the alert */}
      {showPreview && editingAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Alert Preview</h2>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setEditingAlert(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  This is how users will see this alert in the top-right corner of their screen:
                </p>

                {/* Preview notification */}
                <div className="bg-gray-100 p-8 rounded-lg">
                  <div className="max-w-md ml-auto">
                    <div
                      className={`${getNotificationPreviewColor(editingAlert.alert_type)} p-4 rounded-lg shadow-lg`}
                      role="alert"
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          {getAlertIcon(editingAlert.alert_type)}
                        </div>
                        <div className="ml-3 flex-1">
                          <h3 className="text-sm font-semibold mb-1">
                            {editingAlert.title}
                          </h3>
                          <p className="text-sm">
                            {editingAlert.message}
                          </p>
                          {editingAlert.target_area && (
                            <p className="text-xs mt-2 opacity-75">
                              📍 {editingAlert.target_area}
                            </p>
                          )}
                          {editingAlert.expires_at && (
                            <p className="text-xs mt-1 opacity-75">
                              Expires: {new Date(editingAlert.expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button
                          className="flex-shrink-0 ml-3 inline-flex text-gray-400 hover:text-gray-600"
                          disabled
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">How it works:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Users see this notification when they log in</li>
                        <li>They can dismiss it by clicking the X button</li>
                        <li>Once dismissed, they won't see it again</li>
                        <li>{editingAlert.is_active ? 'This alert is currently ACTIVE' : 'This alert is currently INACTIVE (users won\'t see it)'}</li>
                        {editingAlert.expires_at && (
                          <li>It will automatically hide after the expiration date</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowPreview(false);
                  setEditingAlert(null);
                }}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAlerts;