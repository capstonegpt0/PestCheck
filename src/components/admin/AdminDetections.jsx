import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Eye, Trash2, AlertCircle } from 'lucide-react';
import AdminNavigation from './AdminNavigation';
import api from '../../utils/api';

const AdminDetections = ({ user, onLogout }) => {
  const isAdmin = user?.role === 'admin';
  const [detections, setDetections] = useState([]);
  const [filteredDetections, setFilteredDetections] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionType, setActionType] = useState(''); // 'verify' or 'reject'
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchDetections();
  }, [currentPage, itemsPerPage, searchQuery, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, itemsPerPage]);

  const fetchDetections = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        page_size: itemsPerPage,
        confirmed: 'true',
      });
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await api.get(`/admin/detections/?${params.toString()}`);

      if (response.data && response.data.results !== undefined) {
        setDetections(response.data.results);
        setFilteredDetections(response.data.results);
        setTotalItems(response.data.count || 0);
      } else {
        const data = Array.isArray(response.data) ? response.data : [];
        setDetections(data);
        setFilteredDetections(data);
        setTotalItems(data.length);
      }
    } catch (error) {
      console.error('Error fetching detections:', error);
      setDetections([]);
      setFilteredDetections([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedDetection) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/admin/detections/${selectedDetection.id}/verify_detection/`, {
        notes: adminNotes
      });
      closeVerifyModal();
      fetchDetections();
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to verify detection. Please try again.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDetection) return;

    // Enforce reason on the frontend as well
    if (!adminNotes.trim()) {
      setActionError('Please provide a reason for rejection. The farmer will be notified with this message.');
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/admin/detections/${selectedDetection.id}/reject_detection/`, {
        notes: adminNotes
      });
      closeVerifyModal();
      fetchDetections();
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to reject detection. Please try again.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (detectionId) => {
    if (!window.confirm('Are you sure you want to delete this detection? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/admin/detections/${detectionId}/`);
      fetchDetections();
    } catch (error) {
      console.error('Error deleting detection:', error);
    }
  };

  const openVerifyModal = (detection, action) => {
    setSelectedDetection(detection);
    setActionType(action);
    setAdminNotes(detection.admin_notes || '');
    setActionError('');
    setShowVerifyModal(true);
  };

  const closeVerifyModal = () => {
    setShowVerifyModal(false);
    setSelectedDetection(null);
    setAdminNotes('');
    setActionError('');
    setActionLoading(false);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      resolved: 'bg-blue-100 text-blue-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityBadge = (severity) => {
    const badges = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return badges[severity] || 'bg-gray-100 text-gray-800';
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={user} onLogout={onLogout} />

      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">Detection Management</h1>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by pest name, user, or farm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex space-x-2">
              {['all', 'pending', 'verified', 'rejected', 'resolved'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-6 py-3 rounded-lg font-semibold capitalize transition-colors ${
                    statusFilter === s
                      ? s === 'all' ? 'bg-blue-600 text-white'
                        : s === 'pending' ? 'bg-yellow-600 text-white'
                        : s === 'verified' ? 'bg-green-600 text-white'
                        : s === 'rejected' ? 'bg-red-600 text-white'
                        : 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detections Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Loading detections...</p>
            </div>
          ) : filteredDetections.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No detections found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pest</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farm</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDetections.map((detection) => (
                    <tr key={detection.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        #{detection.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{detection.pest_name}</div>
                        <div className="text-sm text-gray-500">{detection.crop_type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {detection.user_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {detection.farm_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityBadge(detection.severity)}`}>
                          {detection.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(detection.status)}`}>
                          {detection.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(detection.detected_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => { setSelectedDetection(detection); setShowDetailModal(true); }}
                          className="text-blue-600 hover:text-blue-800"
                          title="View details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {detection.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openVerifyModal(detection, 'verify')}
                              className="text-green-600 hover:text-green-800"
                              title="Verify"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => openVerifyModal(detection, 'reject')}
                              className="text-orange-600 hover:text-orange-800"
                              title="Reject"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(detection.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete detection"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && totalItems > 0 && (
          <div className="bg-white rounded-lg shadow mt-4 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} detections
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="ml-4 px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>

                <div className="flex items-center space-x-1">
                  {getPageNumbers().map((pageNum, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 border rounded text-sm ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedDetection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Detection Details</h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Detection ID</p>
                  <p className="font-semibold">#{selectedDetection.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(selectedDetection.status)}`}>
                    {selectedDetection.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pest Name</p>
                  <p className="font-semibold">{selectedDetection.pest_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Crop Type</p>
                  <p className="font-semibold">{selectedDetection.crop_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Severity</p>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityBadge(selectedDetection.severity)}`}>
                    {selectedDetection.severity}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Confidence</p>
                  <p className="font-semibold">{(selectedDetection.confidence * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Reported By</p>
                  <p className="font-semibold">{selectedDetection.user_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Farm</p>
                  <p className="font-semibold">{selectedDetection.farm_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-semibold text-xs">
                    {selectedDetection.latitude?.toFixed(4)}, {selectedDetection.longitude?.toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Detected At</p>
                  <p className="font-semibold">{new Date(selectedDetection.detected_at).toLocaleString()}</p>
                </div>
              </div>

              {selectedDetection.description && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Description</p>
                  <p className="text-sm bg-gray-50 p-3 rounded">{selectedDetection.description}</p>
                </div>
              )}

              {selectedDetection.admin_notes && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">
                    {selectedDetection.status === 'rejected' ? 'Rejection Reason' : 'Admin Notes'}
                  </p>
                  <p className={`text-sm p-3 rounded border ${
                    selectedDetection.status === 'rejected'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    {selectedDetection.admin_notes}
                  </p>
                </div>
              )}

              {selectedDetection.verified_by_name && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    {selectedDetection.status === 'rejected' ? 'Rejected By' : 'Verified By'}
                  </p>
                  <p className="font-semibold">{selectedDetection.verified_by_name}</p>
                </div>
              )}

              {selectedDetection.image && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Detection Image</p>
                  <img
                    src={selectedDetection.image}
                    alt={selectedDetection.pest_name}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}

              <button
                onClick={() => { setShowDetailModal(false); setSelectedDetection(null); }}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify / Reject Modal */}
      {showVerifyModal && selectedDetection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {actionType === 'verify' ? 'Verify Detection' : 'Reject Detection'}
              </h2>

              <p className="text-sm text-gray-600 mb-4">
                Detection: <span className="font-semibold">#{selectedDetection.id} — {selectedDetection.pest_name}</span>
              </p>

              {/* Rejection warning banner */}
              {actionType === 'reject' && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">
                    The farmer will receive a notification with your reason. This detection will be removed from the map.
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {actionType === 'reject' ? (
                    <span>Reason for rejection <span className="text-red-500">*</span></span>
                  ) : (
                    'Verification notes (optional)'
                  )}
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => { setAdminNotes(e.target.value); setActionError(''); }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    actionError && actionType === 'reject' ? 'border-red-400' : 'border-gray-300'
                  }`}
                  rows="4"
                  placeholder={
                    actionType === 'verify'
                      ? 'Add verification notes...'
                      : 'e.g. Image quality too low, pest not clearly visible...'
                  }
                />
                {actionError && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {actionError}
                  </p>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={actionType === 'verify' ? handleVerify : handleReject}
                  disabled={actionLoading}
                  className={`flex-1 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-60 disabled:cursor-not-allowed ${
                    actionType === 'verify'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionLoading
                    ? 'Processing...'
                    : actionType === 'verify' ? 'Verify' : 'Reject'
                  }
                </button>
                <button
                  onClick={closeVerifyModal}
                  disabled={actionLoading}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDetections;