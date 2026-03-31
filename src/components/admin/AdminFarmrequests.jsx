import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Eye, X, MapPin, Map, ExternalLink, AlertCircle, Loader } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import AdminNavigation from './AdminNavigation';
import api from '../../utils/api';
import L from 'leaflet';

// Fix default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Green farm pin icon
const farmPinIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSI0MiIgdmlld0JveD0iMCAwIDMyIDQyIj48ZWxsaXBzZSBjeD0iMTYiIGN5PSI0MCIgcng9IjYiIHJ5PSIyIiBmaWxsPSJyZ2JhKDAsMCwwLDAuMikiLz48cGF0aCBkPSJNMTYgMEM3LjE2NCAwIDAgNy4xNjQgMCAxNmMwIDEyIDE2IDI2IDE2IDI2czE2LTE0IDE2LTI2QzMyIDcuMTY0IDI0LjgzNiAwIDE2IDB6IiBmaWxsPSIjMTZhMzRhIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iNyIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
});

/**
 * Inner component: keeps the map view perfectly centred on the pin.
 * Runs every render so re-centring also works when the modal opens.
 */
const CenterOnMarker = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: false });
  }, [lat, lng, map]);
  return null;
};

/**
 * Fully static satellite map — no dragging, no zoom controls, no scroll.
 * The farm pin is always centred in the viewport.
 */
const FarmLocationMap = ({ lat, lng, farmName, height = 280 }) => (
  <div style={{ height, borderRadius: '0.5rem', overflow: 'hidden', position: 'relative' }}>
    <MapContainer
      center={[lat, lng]}
      zoom={17}
      style={{ height: '100%', width: '100%' }}
      attributionControl={false}
      // ── Disable ALL interaction ──
      dragging={false}
      touchZoom={false}
      doubleClickZoom={false}
      scrollWheelZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
    >
      {/* Re-centre whenever lat/lng change */}
      <CenterOnMarker lat={lat} lng={lng} />

      {/* Esri satellite imagery */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri"
      />
      {/* Place labels overlay */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        opacity={0.7}
      />
      <Marker position={[lat, lng]} icon={farmPinIcon}>
        <Popup>
          <div className="text-sm font-semibold">{farmName}</div>
          <div className="text-xs text-gray-500 mt-1">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </div>
        </Popup>
      </Marker>
    </MapContainer>

    {/* Transparent overlay blocks any accidental pointer interaction */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 400,
        cursor: 'default',
        pointerEvents: 'none',
      }}
    />
  </div>
);

const AdminFarmRequests = ({ user, onLogout }) => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

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
        (r.crop_type && r.crop_type.toLowerCase().includes(query)) ||
        (r.address && r.address.toLowerCase().includes(query))
      );
    }
    setFilteredRequests(filtered);
  };

  const extractErrorMessage = (error) => {
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data === 'string') return data;
      if (data.error) return data.error;
      if (data.detail) return data.detail;
      if (data.non_field_errors) return data.non_field_errors.join(' ');
      return JSON.stringify(data);
    }
    return error.message || 'An unexpected error occurred.';
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/admin/farm-requests/${selectedRequest.id}/approve/`, {
        review_notes: reviewNotes
      });
      setShowReviewModal(false);
      setSelectedRequest(null);
      setReviewNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      setActionError(extractErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !reviewNotes) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/admin/farm-requests/${selectedRequest.id}/reject/`, {
        review_notes: reviewNotes
      });
      setShowReviewModal(false);
      setSelectedRequest(null);
      setReviewNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      setActionError(extractErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const openReviewModal = (request, action) => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNotes(request.review_notes || '');
    setActionError('');
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setSelectedRequest(null);
    setReviewNotes('');
    setActionError('');
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getGoogleMapsLink = (lat, lng) =>
    `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={user} onLogout={onLogout} />

      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">Farm Registration Requests</h1>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by farm name, owner, crop type, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-2">
              {['all', 'pending', 'approved', 'rejected'].map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-5 py-3 rounded-lg font-semibold transition-colors capitalize ${
                    statusFilter === f
                      ? f === 'all'      ? 'bg-blue-600 text-white'
                      : f === 'pending'  ? 'bg-yellow-600 text-white'
                      : f === 'approved' ? 'bg-green-600 text-white'
                      : 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
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
                    {['ID', 'Farm Name', 'Farmer', 'Crop Type', 'Size (ha)', 'Address', 'Location', 'Status', 'Requested', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{request.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{request.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.user_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.crop_type || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.size || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                        {request.address
                          ? <span className="line-clamp-2">{request.address}</span>
                          : <span className="text-gray-400 italic">No address</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {request.lat.toFixed(4)}, {request.lng.toFixed(4)}
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
                          onClick={() => { setSelectedRequest(request); setShowDetailModal(true); }}
                          className="text-blue-600 hover:text-blue-800" title="View details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button onClick={() => openReviewModal(request, 'approve')}
                              className="text-green-600 hover:text-green-800" title="Approve">
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button onClick={() => openReviewModal(request, 'reject')}
                              className="text-red-600 hover:text-red-800" title="Reject">
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

      {/* ==================== DETAIL MODAL ==================== */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Farm Request Details</h2>
                <button onClick={() => { setShowDetailModal(false); setSelectedRequest(null); }}
                  className="text-gray-500 hover:text-gray-700">
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
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Address / Location Description</p>
                  <div className="flex items-start space-x-2 mt-1">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="font-semibold text-gray-800">
                      {selectedRequest.address || <span className="text-gray-400 italic font-normal">No address provided</span>}
                    </p>
                  </div>
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

              {/* Satellite Map Preview */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Map className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-semibold text-gray-700">Farm Location — Satellite View</p>
                  </div>
                  <a
                    href={getGoogleMapsLink(selectedRequest.lat, selectedRequest.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open in Google Maps</span>
                  </a>
                </div>
                <div className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <FarmLocationMap
                    lat={selectedRequest.lat}
                    lng={selectedRequest.lng}
                    farmName={selectedRequest.name}
                    height={300}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-center">
                  Satellite imagery © Esri · Map is fixed — pin marks the exact requested location
                </p>
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
                  <p className="font-semibold">
                    {selectedRequest.reviewed_by_name} on {new Date(selectedRequest.reviewed_at).toLocaleString()}
                  </p>
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
                      onClick={() => { setShowDetailModal(false); openReviewModal(selectedRequest, 'approve'); }}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />Approve
                    </button>
                    <button
                      onClick={() => { setShowDetailModal(false); openReviewModal(selectedRequest, 'reject'); }}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 font-medium flex items-center justify-center"
                    >
                      <XCircle className="w-5 h-5 mr-2" />Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setShowDetailModal(false); setSelectedRequest(null); }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== REVIEW MODAL ==================== */}
      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {reviewAction === 'approve' ? 'Approve Farm Request' : 'Reject Farm Request'}
              </h2>
              <p className="text-sm text-gray-600 mb-2">
                Request: <span className="font-semibold">#{selectedRequest.id} - {selectedRequest.name}</span>
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Farmer: <span className="font-semibold">{selectedRequest.user_name}</span>
              </p>
              {selectedRequest.address && (
                <p className="text-sm text-gray-600 mb-4">
                  Address: <span className="font-semibold">{selectedRequest.address}</span>
                </p>
              )}

              {/* Mini satellite map in review modal */}
              <div className="mb-4 rounded-lg overflow-hidden border border-gray-200">
                <FarmLocationMap
                  lat={selectedRequest.lat}
                  lng={selectedRequest.lng}
                  farmName={selectedRequest.name}
                  height={180}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {reviewAction === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason *'}
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder={reviewAction === 'approve' ? 'Farm location verified...' : 'Reason for rejection...'}
                  required={reviewAction === 'reject'}
                />
              </div>

              {actionError && (
                <div className="mb-4 flex items-start space-x-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Action failed</p>
                    <p className="text-xs text-red-700 mt-0.5 font-mono break-all">{actionError}</p>
                    {actionError.toLowerCase().includes('column') && (
                      <p className="text-xs text-red-600 mt-1">
                        💡 Run <code className="bg-red-100 px-1 rounded">python manage.py migrate</code> on the server — a database column is missing.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={reviewAction === 'approve' ? handleApprove : handleReject}
                  disabled={actionLoading}
                  className={`flex-1 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed ${
                    reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionLoading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      {reviewAction === 'approve' ? 'Approving...' : 'Rejecting...'}
                    </>
                  ) : (
                    reviewAction === 'approve' ? 'Approve & Create Farm' : 'Reject Request'
                  )}
                </button>
                <button
                  onClick={closeReviewModal}
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

export default AdminFarmRequests;