import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Eye, MessageSquare, Trash2 } from 'lucide-react';
import AdminNavigation from './AdminNavigation';
import api from '../../utils/api';

const AdminDetections = ({ user, onLogout }) => {
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchDetections();
  }, []);

  useEffect(() => {
    filterDetections();
  }, [searchQuery, statusFilter, detections]);

  const fetchDetections = async () => {
    try {
      // Request a large page size to get all detections
      const response = await api.get('/admin/detections/?page_size=1000');
      const detectionData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || []);
      
      setDetections(detectionData);
      setFilteredDetections(detectionData);
      setTotalItems(response.data.count || detectionData.length);
    } catch (error) {
      console.error('Error fetching detections:', error);
      setDetections([]);
      setFilteredDetections([]);
    } finally {
      setLoading(false);
    }
  };

  const filterDetections = () => {
    let filtered = detections;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.pest_name.toLowerCase().includes(query) ||
        d.user_name.toLowerCase().includes(query) ||
        (d.farm_name && d.farm_name.toLowerCase().includes(query))
      );
    }

    setFilteredDetections(filtered);
    setTotalItems(filtered.length);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleVerify = async () => {
    if (!selectedDetection) return;

    try {
      await api.post(`/admin/detections/${selectedDetection.id}/verify_detection/`, {
        notes: adminNotes
      });
      setShowVerifyModal(false);
      setSelectedDetection(null);
      setAdminNotes('');
      fetchDetections();
    } catch (error) {
      console.error('Error verifying detection:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedDetection) return;

    try {
      await api.post(`/admin/detections/${selectedDetection.id}/reject_detection/`, {
        notes: adminNotes
      });
      setShowVerifyModal(false);
      setSelectedDetection(null);
      setAdminNotes('');
      fetchDetections();
    } catch (error) {
      console.error('Error rejecting detection:', error);
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
    setShowVerifyModal(true);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={user} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Detection Management</h1>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
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
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('verified')}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'verified' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Verified
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Rejected
              </button>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Farm
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDetections
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((detection) => (
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
                          onClick={() => {
                            setSelectedDetection(detection);
                            setShowDetailModal(true);
                          }}
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
                        <button
                          onClick={() => handleDelete(detection.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete detection"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && filteredDetections.length > 0 && (
          <div className="bg-white rounded-lg shadow mt-4 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} detections
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
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
                  {Array.from({ length: Math.min(5, Math.ceil(totalItems / itemsPerPage)) }, (_, i) => {
                    const totalPages = Math.ceil(totalItems / itemsPerPage);
                    let pageNum;
                    
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
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
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalItems / itemsPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(Math.ceil(totalItems / itemsPerPage))}
                  disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
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
                    {selectedDetection.latitude.toFixed(4)}, {selectedDetection.longitude.toFixed(4)}
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
                  <p className="text-sm text-gray-600 mb-1">Admin Notes</p>
                  <p className="text-sm bg-yellow-50 p-3 rounded border border-yellow-200">
                    {selectedDetection.admin_notes}
                  </p>
                </div>
              )}

              {selectedDetection.verified_by_name && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Verified By</p>
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
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedDetection(null);
                }}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify/Reject Modal */}
      {showVerifyModal && selectedDetection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {actionType === 'verify' ? 'Verify Detection' : 'Reject Detection'}
              </h2>
              
              <p className="text-sm text-gray-600 mb-4">
                Detection: <span className="font-semibold">#{selectedDetection.id} - {selectedDetection.pest_name}</span>
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  placeholder={actionType === 'verify' ? 'Add verification notes...' : 'Provide reason for rejection...'}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={actionType === 'verify' ? handleVerify : handleReject}
                  className={`flex-1 text-white py-2 px-4 rounded-lg font-medium ${
                    actionType === 'verify' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionType === 'verify' ? 'Verify' : 'Reject'}
                </button>
                <button
                  onClick={() => {
                    setShowVerifyModal(false);
                    setSelectedDetection(null);
                    setAdminNotes('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
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