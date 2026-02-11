import React, { useState, useEffect } from 'react';
import {
  Search, CheckCircle, XCircle, Edit, Trash2, UserCheck, Shield,
  ShieldCheck, ShieldAlert, FileText, Eye, Clock, X, AlertTriangle
} from 'lucide-react';
import AdminNavigation from './AdminNavigation';
import api from '../../utils/api';


// Helper to get full image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  const backendUrl = import.meta.env.VITE_API_URL || 'https://pestcheck-api.onrender.com';
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return `${backendUrl}/${cleanPath}`;
};


// ==================== VERIFICATION REVIEW MODAL ====================
const VerificationReviewModal = ({ request, onClose, onActionComplete }) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showIdImage, setShowIdImage] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!request) return null;

  const handleAction = async (action) => {
    if (action === 'reject' && !reviewNotes.trim()) {
      setError('Please provide a reason for rejection.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess(false);
    
    console.log(`🔄 Attempting to ${action} verification request ID:`, request.id);
    console.log('Review notes:', reviewNotes);
    
    try {
      const response = await api.post(`/admin/verification-requests/${request.id}/${action}/`, {
        review_notes: reviewNotes
      });
      
      console.log(`✅ ${action} successful:`, response.data);
      
      // Show success message
      setSuccess(true);
      
      // Wait a bit to show success, then close and refresh
      setTimeout(async () => {
        console.log('🔄 Calling onActionComplete to refresh data...');
        await onActionComplete();
        console.log('✅ Data refreshed, closing modal');
        onClose();
      }, 500);
      
    } catch (err) {
      console.error(`❌ Failed to ${action} request:`, err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      const errorMessage = err.response?.data?.error 
        || err.response?.data?.message 
        || err.message 
        || `Failed to ${action} request.`;
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const idImageUrl = request.valid_id_image_url || getImageUrl(request.valid_id_image);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Verification Request Review
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Submitted {new Date(request.created_at).toLocaleDateString('en-PH', {
                year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>Action completed successfully! Refreshing data...</span>
            </div>
          )}

          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Farmer Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Username</p>
                <p className="text-sm font-medium text-gray-800">@{request.user_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Full Name</p>
                <p className="text-sm font-medium text-gray-800">{request.user_full_name || '—'}</p>
              </div>
            </div>
          </div>

          {/* RSBSA Number */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2">
              RSBSA Registration Number
            </h3>
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <p className="text-lg font-mono font-semibold text-blue-900">{request.rsbsa_number}</p>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Registry System for Basic Sectors in Agriculture
            </p>
          </div>

          {/* Valid ID Image */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Valid Government ID
            </h3>
            {idImageUrl ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {showIdImage ? (
                  <div>
                    <img
                      src={idImageUrl}
                      alt="Valid ID"
                      className="w-full object-contain max-h-80"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div style={{ display: 'none' }} className="p-4 text-center text-gray-500 text-sm">
                      Image could not be loaded.
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-3">ID image is hidden for privacy</p>
                    <button
                      onClick={() => setShowIdImage(true)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View ID Image
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-sm text-red-600">
                No ID image uploaded.
              </div>
            )}
          </div>

          {/* User Notes */}
          {request.notes && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Additional Notes from User</h3>
              <p className="text-sm text-gray-700 italic">"{request.notes}"</p>
            </div>
          )}

          {/* Admin Review Section */}
          {request.status === 'pending' && !success && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Review Notes <span className="text-gray-400 font-normal">(required for rejection)</span>
              </h3>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter review notes or reason for rejection..."
                rows={3}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none disabled:bg-gray-100"
              />
            </div>
          )}

          {/* Already reviewed info */}
          {request.status !== 'pending' && (
            <div className={`rounded-lg p-4 ${
              request.status === 'approved' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center mb-2">
                {request.status === 'approved'
                  ? <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  : <XCircle className="w-4 h-4 text-red-600 mr-2" />
                }
                <span className={`text-sm font-semibold ${
                  request.status === 'approved' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {request.status === 'approved' ? 'Approved' : 'Rejected'} by {request.reviewed_by_name}
                </span>
              </div>
              {request.review_notes && (
                <p className="text-sm text-gray-700">"{request.review_notes}"</p>
              )}
              {request.reviewed_at && (
                <p className="text-xs text-gray-500 mt-1">
                  on {new Date(request.reviewed_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {request.status === 'pending' && !success && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex space-x-3">
            <button
              onClick={() => handleAction('approve')}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {loading ? 'Processing...' : 'Approve & Verify User'}
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={loading}
              className="flex-1 bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {loading ? 'Processing...' : 'Reject Request'}
            </button>
          </div>
        )}
        {(request.status !== 'pending' || success) && (
          <div className="p-6 border-t border-gray-200">
            <button 
              onClick={onClose} 
              disabled={loading && !success}
              className="w-full bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


// ==================== MAIN ADMIN USERS COMPONENT ====================
const AdminUsers = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('users');

  // Users state
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState('');

  // Verification requests state
  const [verificationRequests, setVerificationRequests] = useState([]);
  const [vrFilter, setVrFilter] = useState('pending');
  const [vrLoading, setVrLoading] = useState(true);
  const [selectedVR, setSelectedVR] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetchUsers();
    fetchVerificationRequests();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, roleFilter, users]);

  // ==================== USER FUNCTIONS ====================
  const fetchUsers = async () => {
    console.log('🔄 Fetching users...');
    setUsersLoading(true);
    try {
      const response = await api.get('/admin/users/');
      console.log('✅ Users response:', response.data);
      
      const userData = Array.isArray(response.data)
        ? response.data
        : (response.data.results || []);
      setUsers(userData);
      setFilteredUsers(userData);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.username.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.first_name && u.first_name.toLowerCase().includes(query)) ||
        (u.last_name && u.last_name.toLowerCase().includes(query))
      );
    }
    setFilteredUsers(filtered);
  };

  const handleVerifyUser = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/verify_user/`);
      fetchUsers();
    } catch (error) {
      console.error('Error verifying user:', error);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !newRole) return;
    try {
      await api.post(`/admin/users/${selectedUser.id}/change_role/`, { role: newRole });
      setShowRoleModal(false);
      setSelectedUser(null);
      setNewRole('');
      fetchUsers();
    } catch (error) {
      console.error('Error changing role:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${userId}/`);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = { admin: 'bg-purple-100 text-purple-800', farmer: 'bg-green-100 text-green-800' };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  // ==================== VERIFICATION REQUEST FUNCTIONS ====================
  const fetchVerificationRequests = async () => {
    console.log('🔄 Fetching verification requests...');
    setVrLoading(true);
    try {
      const response = await api.get('/admin/verification-requests/');
      console.log('✅ Verification requests response:', response.data);
      
      const data = Array.isArray(response.data)
        ? response.data
        : (response.data.results || []);
      
      console.log('📋 Processed VR data:', data);
      console.log('📊 Pending count:', data.filter(r => r.status === 'pending').length);
      
      setVerificationRequests(data);
      setPendingCount(data.filter(r => r.status === 'pending').length);
    } catch (error) {
      console.error('❌ Error fetching verification requests:', error);
      setVerificationRequests([]);
    } finally {
      setVrLoading(false);
    }
  };

  const handleActionComplete = async () => {
    console.log('🔄 handleActionComplete: Starting data refresh...');
    
    // Refresh both users and verification requests
    await Promise.all([
      fetchUsers(),
      fetchVerificationRequests()
    ]);
    
    console.log('✅ handleActionComplete: Data refresh completed');
  };

  const filteredVRs = verificationRequests.filter(r =>
    vrFilter === 'all' ? true : r.status === vrFilter
  );

  const getVRStatusBadge = (status) => {
    const map = {
      pending: 'bg-amber-100 text-amber-800 border border-amber-200',
      approved: 'bg-green-100 text-green-800 border border-green-200',
      rejected: 'bg-red-100 text-red-800 border border-red-200',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  const getVRStatusIcon = (status) => {
    if (status === 'pending') return <Clock className="w-3.5 h-3.5 mr-1" />;
    if (status === 'approved') return <CheckCircle className="w-3.5 h-3.5 mr-1" />;
    return <XCircle className="w-3.5 h-3.5 mr-1" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={user} onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">User Management</h1>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-white rounded-lg shadow p-1 mb-6 w-fit">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-2.5 rounded-md font-medium text-sm transition-colors flex items-center ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            All Users
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-5 py-2.5 rounded-md font-medium text-sm transition-colors flex items-center ${
              activeTab === 'verification'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Verification Requests
            {pendingCount > 0 && (
              <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                activeTab === 'verification' ? 'bg-white text-blue-600' : 'bg-amber-500 text-white'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>
        </div>


        {/* ==================== USERS TAB ==================== */}
        {activeTab === 'users' && (
          <>
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by username, email, or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex space-x-2">
                  {['all', 'farmer', 'admin'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setRoleFilter(filter)}
                      className={`px-5 py-3 rounded-lg font-semibold text-sm transition-colors capitalize ${
                        roleFilter === filter
                          ? filter === 'all' ? 'bg-blue-600 text-white'
                          : filter === 'farmer' ? 'bg-green-600 text-white'
                          : 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {filter === 'all' ? 'All Users' : `${filter.charAt(0).toUpperCase() + filter.slice(1)}s`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {usersLoading ? (
                <div className="p-12 text-center text-gray-500">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No users found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Joined</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                {u.username.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-3">
                                <p className="font-semibold text-gray-800">{u.username}</p>
                                <p className="text-sm text-gray-500">{u.first_name} {u.last_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(u.role)}`}>
                              {u.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <UserCheck className="w-3 h-3 mr-1" />}
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {u.is_verified ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Unverified
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(u.date_joined).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end space-x-2">
                              {!u.is_verified && (
                                <button
                                  onClick={() => handleVerifyUser(u.id)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Verify User"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setNewRole(u.role);
                                  setShowRoleModal(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Change Role"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================== VERIFICATION REQUESTS TAB ==================== */}
        {activeTab === 'verification' && (
          <>
            {/* Filter Buttons */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex space-x-2">
                {['pending', 'approved', 'rejected', 'all'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setVrFilter(filter)}
                    className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors capitalize ${
                      vrFilter === filter
                        ? filter === 'pending' ? 'bg-amber-600 text-white'
                        : filter === 'approved' ? 'bg-green-600 text-white'
                        : filter === 'rejected' ? 'bg-red-600 text-white'
                        : 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter === 'all' ? 'All Requests' : filter}
                    {filter === 'pending' && pendingCount > 0 && (
                      <span className="ml-2 bg-white text-amber-600 rounded-full px-2 py-0.5 text-xs font-bold">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Verification Requests Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {vrLoading ? (
                <div className="p-12 text-center text-gray-500">Loading verification requests...</div>
              ) : filteredVRs.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  No {vrFilter !== 'all' ? vrFilter : ''} verification requests found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">RSBSA Number</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Submitted</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredVRs.map((vr) => (
                        <tr key={vr.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                {vr.user_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-3">
                                <p className="font-semibold text-gray-800">@{vr.user_name}</p>
                                <p className="text-sm text-gray-500">{vr.user_full_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-mono text-sm text-gray-800">{vr.rsbsa_number}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getVRStatusBadge(vr.status)}`}>
                              {getVRStatusIcon(vr.status)}
                              {vr.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(vr.created_at).toLocaleDateString('en-PH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end">
                              <button
                                onClick={() => setSelectedVR(vr)}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Review
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Change User Role</h3>
            <p className="text-gray-600 mb-4">
              Change role for <span className="font-semibold">{selectedUser.username}</span>
            </p>
            <div className="space-y-3 mb-6">
              {['farmer', 'admin'].map((role) => (
                <label key={role} className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={newRole === role}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 font-medium text-gray-800 capitalize">{role}</span>
                </label>
              ))}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleChangeRole}
                className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setNewRole('');
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Review Modal */}
      {selectedVR && (
        <VerificationReviewModal
          request={selectedVR}
          onClose={() => setSelectedVR(null)}
          onActionComplete={handleActionComplete}
        />
      )}
    </div>
  );
};

export default AdminUsers;