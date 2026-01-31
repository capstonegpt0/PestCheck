import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Eye, X, MapPin } from 'lucide-react';
import AdminNavigation from './AdminNavigation';
import api from '../../utils/api';

const AdminFarmRequests = ({ user, onLogout }) => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState(''); // 'approve' or 'reject'
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [searchQuery, statusFilter, requests]);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/admin/farm-requests/');
      const requestData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || []);
      
      setRequests(requestData);
      setFilteredRequests(requestData);
    } catch (error) {
      console.error('Error fetching farm requests:', error);
      alert('Failed to load farm requests');
      setRequests([]);
      setFilteredRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.user_name.toLowerCase().includes(query) ||
        (r.crop_type && r.crop_type.toLowerCase().includes(query))
      );
    }

    setFilteredRequests(filtered);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      await api.post(`/admin/farm-requests/${selectedRequest.id}/approve/`, {
        review_notes: reviewNotes
      });
      alert('Farm request approved! Farm has been created.');
      setShowReviewModal(false);
      setSelectedRequest(null);
      setReviewNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !reviewNotes) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      await api.post(`/admin/farm-requests/${selectedRequest.id}/reject/`, {
        review_notes: reviewNotes
      });
      alert('Farm request rejected');
      setShowReviewModal(false);
      setSelectedRequest(null);
      setReviewNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    }
  };

  const openReviewModal = (request, action) => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNotes(request.review_notes || '');
    setShowReviewModal(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={user} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Farm Registration Requests</h1>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by farm name, owner, or crop type..."
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
                onClick={() => setStatusFilter('approved')}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Approved
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

        {/* Requests Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Loading farm requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No farm requests found</p>
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
                      Farm Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Farmer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Crop Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size (ha)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requested
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        #{request.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{request.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.user_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.crop_type || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.size || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="text-xs">
                          {request.lat.toFixed(4)}, {request.lng.toFixed(4)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="View details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openReviewModal(request, 'approve')}
                              className="text-green-600 hover:text-green-800"
                              title="Approve"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => openReviewModal(request, 'reject')}
                              className="text-red-600 hover:text-red-800"
                              title="Reject"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Farm Request Details</h2>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedRequest(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Request ID</p>
                  <p className="font-semibold">#{selectedRequest.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Farm Name</p>
                  <p className="font-semibold">{selectedRequest.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Farmer</p>
                  <p className="font-semibold">{selectedRequest.user_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Crop Type</p>
                  <p className="font-semibold">{selectedRequest.crop_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Size</p>
                  <p className="font-semibold">{selectedRequest.size || 'N/A'} hectares</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Latitude</p>
                  <p className="font-semibold">{selectedRequest.lat.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Longitude</p>
                  <p className="font-semibold">{selectedRequest.lng.toFixed(6)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Requested On</p>
                  <p className="font-semibold">{new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
              </div>

              {selectedRequest.description && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Description</p>
                  <p className="text-sm bg-gray-50 p-3 rounded">{selectedRequest.description}</p>
                </div>
              )}

              {selectedRequest.review_notes && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Review Notes</p>
                  <p className="text-sm bg-yellow-50 p-3 rounded border border-yellow-200">
                    {selectedRequest.review_notes}
                  </p>
                </div>
              )}

              {selectedRequest.reviewed_by_name && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Reviewed By</p>
                  <p className="font-semibold">{selectedRequest.reviewed_by_name} on {new Date(selectedRequest.reviewed_at).toLocaleString()}</p>
                </div>
              )}

              {selectedRequest.approved_farm_id && (
                <div className="mb-4 bg-green-50 p-3 rounded border border-green-200">
                  <p className="text-sm text-green-800">
                    ✓ Farm created (ID: #{selectedRequest.approved_farm_id})
                  </p>
                </div>
              )}

              <div className="flex space-x-3">
                {selectedRequest.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        openReviewModal(selectedRequest, 'approve');
                      }}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        openReviewModal(selectedRequest, 'reject');
                      }}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 font-medium flex items-center justify-center"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedRequest(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {reviewAction === 'approve' ? 'Approve Farm Request' : 'Reject Farm Request'}
              </h2>
              
              <p className="text-sm text-gray-600 mb-4">
                Request: <span className="font-semibold">#{selectedRequest.id} - {selectedRequest.name}</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Farmer: <span className="font-semibold">{selectedRequest.user_name}</span>
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {reviewAction === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason *'}
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  placeholder={reviewAction === 'approve' ? 'Farm location verified...' : 'Reason for rejection...'}
                  required={reviewAction === 'reject'}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={reviewAction === 'approve' ? handleApprove : handleReject}
                  className={`flex-1 text-white py-2 px-4 rounded-lg font-medium ${
                    reviewAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {reviewAction === 'approve' ? 'Approve & Create Farm' : 'Reject Request'}
                </button>
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setSelectedRequest(null);
                    setReviewNotes('');
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

export default AdminFarmRequests;