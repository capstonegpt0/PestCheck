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
const VerificationReviewModal = ({ request, onClose, onAction }) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showIdImage, setShowIdImage] = useState(false);

  if (!request) return null;

  const handleAction = async (action) => {
    if (action === 'reject' && !reviewNotes.trim()) {
      setError('Please provide a reason for rejection.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post(`/admin/verification-requests/${request.id}/${action}/`, {
        review_notes: reviewNotes
      });
      onAction();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${action} request.`);
    } finally {
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
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
          {request.status === 'pending' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Review Notes <span className="text-gray-400 font-normal">(required for rejection)</span>
              </h3>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter review notes or reason for rejection..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
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
        {request.status === 'pending' && (
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
        {request.status !== 'pending' && (
          <div className="p-6 border-t border-gray-200">
            <button onClick={onClose} className="w-full bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium">
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
    setUsersLoading(true);
    try {
      const response = await api.get('/admin/users/');
      const userData = Array.isArray(response.data)
        ? response.data
        : (response.data.results || []);
      setUsers(userData);
      setFilteredUsers(userData);
    } catch (error) {
      console.error('Error fetching users:', error);
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
    setVrLoading(true);
    try {
      const response = await api.get('/admin/verification-requests/');
      const data = Array.isArray(response.data)
        ? response.data
        : (response.data.results || []);
      setVerificationRequests(data);
      setPendingCount(data.filter(r => r.status === 'pending').length);
    } catch (error) {
      console.error('Error fetching verification requests:', error);
      setVerificationRequests([]);
    } finally {
      setVrLoading(false);
    }
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
                <div className="p-8 text-center"><p className="text-gray-600">Loading users...</p></div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center"><p className="text-gray-600">No users found</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-gray-600 font-semibold">{u.username.charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{u.username}</div>
                                <div className="text-sm text-gray-500">{u.first_name} {u.last_name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(u.role)}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {u.is_verified ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                ✓ Verified
                              </span>
                            ) : (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Unverified
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(u.date_joined || u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              {!u.is_verified && (
                                <button
                                  onClick={() => handleVerifyUser(u.id)}
                                  className="text-green-600 hover:text-green-800 transition-colors"
                                  title="Verify user directly"
                                >
                                  <UserCheck className="w-5 h-5" />
                                </button>
                              )}
                              <button
                                onClick={() => { setSelectedUser(u); setNewRole(u.role); setShowRoleModal(true); }}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Change role"
                              >
                                <Shield className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Delete user"
                              >
                                <Trash2 className="w-5 h-5" />
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
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Pending', count: verificationRequests.filter(r => r.status === 'pending').length, color: 'amber' },
                { label: 'Approved', count: verificationRequests.filter(r => r.status === 'approved').length, color: 'green' },
                { label: 'Rejected', count: verificationRequests.filter(r => r.status === 'rejected').length, color: 'red' },
              ].map(({ label, count, color }) => (
                <div key={label} className={`bg-white rounded-lg shadow p-4 border-l-4 border-${color}-400`}>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className={`text-2xl font-bold text-${color}-600`}>{count}</p>
                </div>
              ))}
            </div>

            {/* Filter Tabs */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="flex border-b border-gray-200 px-4">
                {['pending', 'approved', 'rejected', 'all'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setVrFilter(f)}
                    className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors capitalize ${
                      vrFilter === f
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {f === 'all' ? 'All Requests' : `${f.charAt(0).toUpperCase() + f.slice(1)}`}
                    {f === 'pending' && pendingCount > 0 && (
                      <span className="ml-1.5 text-xs font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Requests List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {vrLoading ? (
                <div className="p-8 text-center"><p className="text-gray-600">Loading verification requests...</p></div>
              ) : filteredVRs.length === 0 ? (
                <div className="p-12 text-center">
                  <ShieldCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">
                    No {vrFilter !== 'all' ? vrFilter : ''} verification requests
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {vrFilter === 'pending' ? 'All requests have been reviewed.' : 'No records to show.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Farmer', 'RSBSA Number', 'Submitted', 'Status', 'Reviewed By', 'Actions'].map((h) => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredVRs.map((vr) => (
                        <tr key={vr.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-blue-700 font-semibold text-sm">
                                  {vr.user_name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">@{vr.user_name}</p>
                                <p className="text-xs text-gray-500">{vr.user_full_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-sm text-gray-800 bg-gray-100 px-2 py-1 rounded">
                              {vr.rsbsa_number}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(vr.created_at).toLocaleDateString('en-PH', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getVRStatusBadge(vr.status)}`}>
                              {getVRStatusIcon(vr.status)}
                              {vr.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {vr.reviewed_by_name ? `@${vr.reviewed_by_name}` : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => setSelectedVR(vr)}
                              className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                vr.status === 'pending'
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              {vr.status === 'pending' ? 'Review' : 'View'}
                            </button>
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

      {/* Change Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Change User Role</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">User: <span className="font-semibold">{selectedUser?.username}</span></p>
              <p className="text-sm text-gray-600 mb-4">Current Role: <span className="font-semibold">{selectedUser?.role}</span></p>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="farmer">Farmer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleChangeRole}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium"
              >
                Change Role
              </button>
              <button
                onClick={() => { setShowRoleModal(false); setSelectedUser(null); setNewRole(''); }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
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
          onAction={() => {
            fetchVerificationRequests();
            fetchUsers();
          }}
        />
      )}
    </div>
  );
};

export default AdminUsers;