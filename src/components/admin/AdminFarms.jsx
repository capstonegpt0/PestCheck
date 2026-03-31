import React, { useState, useEffect } from 'react';
import { Search, MapPin, CheckCircle, Trash2, Eye, X, ExternalLink, Map } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

// Reusable satellite map for a single farm pin
const FarmLocationMap = ({ lat, lng, farmName, height = 280 }) => (
  <div style={{ height, borderRadius: '0.5rem', overflow: 'hidden' }}>
    <MapContainer
      center={[lat, lng]}
      zoom={17}
      style={{ height: '100%', width: '100%' }}
      attributionControl={false}
      zoomControl={true}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri"
      />
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
  </div>
);

const AdminFarms = ({ user, onLogout }) => {
  const [farms, setFarms] = useState([]);
  const [filteredFarms, setFilteredFarms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => { fetchFarms(); }, []);
  useEffect(() => { filterFarms(); }, [searchQuery, statusFilter, farms]);

  const fetchFarms = async () => {
    try {
      const response = await api.get('/admin/farms/');
      const farmData = Array.isArray(response.data)
        ? response.data
        : (response.data.results || []);
      setFarms(farmData);
      setFilteredFarms(farmData);
    } catch (error) {
      console.error('Error fetching farms:', error);
      setFarms([]);
      setFilteredFarms([]);
    } finally {
      setLoading(false);
    }
  };

  const filterFarms = () => {
    let filtered = farms;
    if (statusFilter === 'verified') filtered = filtered.filter(f => f.is_verified);
    else if (statusFilter === 'unverified') filtered = filtered.filter(f => !f.is_verified);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(f =>
        f.name.toLowerCase().includes(query) ||
        f.user_name.toLowerCase().includes(query) ||
        (f.crop_type && f.crop_type.toLowerCase().includes(query))
      );
    }
    setFilteredFarms(filtered);
  };

  const handleVerifyFarm = async (farmId) => {
    try {
      await api.post(`/admin/farms/${farmId}/verify_farm/`);
      fetchFarms();
    } catch (error) {
      console.error('Error verifying farm:', error);
    }
  };

  const handleDeleteFarm = async (farmId) => {
    if (!window.confirm('Are you sure you want to delete this farm? This will also delete all related detections.')) return;
    try {
      await api.delete(`/admin/farms/${farmId}/`);
      fetchFarms();
    } catch (error) {
      console.error('Error deleting farm:', error);
    }
  };

  const getGoogleMapsLink = (lat, lng) =>
    `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={user} onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Farm Management</h1>

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
              {[
                { key: 'all', label: 'All Farms', active: 'bg-blue-600' },
                { key: 'verified', label: 'Verified', active: 'bg-green-600' },
                { key: 'unverified', label: 'Unverified', active: 'bg-yellow-600' },
              ].map(({ key, label, active }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                    statusFilter === key ? `${active} text-white` : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Farms Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center"><p className="text-gray-600">Loading farms...</p></div>
          ) : filteredFarms.length === 0 ? (
            <div className="p-8 text-center">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No farms found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['ID', 'Farm Name', 'Owner', 'Crop Type', 'Size (ha)', 'Location', 'Infestations', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFarms.map((farm) => (
                    <tr key={farm.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{farm.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{farm.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{farm.user_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{farm.crop_type || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{farm.size || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {farm.lat.toFixed(4)}, {farm.lng.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          farm.infestation_count > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {farm.infestation_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          farm.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {farm.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => { setSelectedFarm(farm); setShowDetailModal(true); }}
                          className="text-blue-600 hover:text-blue-800" title="View details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {!farm.is_verified && (
                          <button onClick={() => handleVerifyFarm(farm.id)}
                            className="text-green-600 hover:text-green-800" title="Verify farm">
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button onClick={() => handleDeleteFarm(farm.id)}
                          className="text-red-600 hover:text-red-800" title="Delete farm">
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
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedFarm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Farm Details</h2>
                <button onClick={() => { setShowDetailModal(false); setSelectedFarm(null); }}
                  className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Farm ID</p>
                  <p className="font-semibold">#{selectedFarm.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    selectedFarm.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedFarm.is_verified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Farm Name</p>
                  <p className="font-semibold">{selectedFarm.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Owner</p>
                  <p className="font-semibold">{selectedFarm.user_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Crop Type</p>
                  <p className="font-semibold">{selectedFarm.crop_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Size</p>
                  <p className="font-semibold">{selectedFarm.size || 'N/A'} hectares</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Latitude</p>
                  <p className="font-semibold">{selectedFarm.lat.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Longitude</p>
                  <p className="font-semibold">{selectedFarm.lng.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Infestations</p>
                  <p className="font-semibold">{selectedFarm.infestation_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-semibold">{new Date(selectedFarm.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Satellite Map */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Map className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-semibold text-gray-700">Farm Location — Satellite View</p>
                  </div>
                  <a
                    href={getGoogleMapsLink(selectedFarm.lat, selectedFarm.lng)}
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
                    lat={selectedFarm.lat}
                    lng={selectedFarm.lng}
                    farmName={selectedFarm.name}
                    height={280}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-center">
                  Satellite imagery © Esri · Scroll to zoom, drag to pan
                </p>
              </div>

              <div className="flex space-x-3">
                {!selectedFarm.is_verified && (
                  <button
                    onClick={() => { handleVerifyFarm(selectedFarm.id); setShowDetailModal(false); setSelectedFarm(null); }}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />Verify Farm
                  </button>
                )}
                <button
                  onClick={() => { setShowDetailModal(false); setSelectedFarm(null); }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFarms;