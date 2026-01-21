import React, { useState, useEffect } from 'react';
import { Search, MapPin, CheckCircle, Trash2, Eye, X } from 'lucide-react';
import AdminNavigation from './AdminNavigation';
import api from '../../utils/api';

const AdminFarms = ({ user, onLogout }) => {
  const [farms, setFarms] = useState([]);
  const [filteredFarms, setFilteredFarms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchFarms();
  }, []);

  useEffect(() => {
    filterFarms();
  }, [searchQuery, statusFilter, farms]);

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
      alert('Failed to load farms');
      setFarms([]);
      setFilteredFarms([]);
    } finally {
      setLoading(false);
    }
  };

  const filterFarms = () => {
    let filtered = farms;

    if (statusFilter === 'verified') {
      filtered = filtered.filter(f => f.is_verified);
    } else if (statusFilter === 'unverified') {
      filtered = filtered.filter(f => !f.is_verified);
    }

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
      alert('Farm verified successfully!');
      fetchFarms();
    } catch (error) {
      console.error('Error verifying farm:', error);
      alert('Failed to verify farm');
    }
  };

  const handleDeleteFarm = async (farmId) => {
    if (!window.confirm('Are you sure you want to delete this farm? This will also delete all related detections.')) {
      return;
    }

    try {
      await api.delete(`/admin/farms/${farmId}/`);
      alert('Farm deleted successfully!');
      fetchFarms();
    } catch (error) {
      console.error('Error deleting farm:', error);
      alert('Failed to delete farm');
    }
  };

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
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Farms
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
                onClick={() => setStatusFilter('unverified')}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'unverified' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Unverified
              </button>
            </div>
          </div>
        </div>

        {/* Farms Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Loading farms...</p>
            </div>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Farm Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
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
                      Infestations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFarms.map((farm) => (
                    <tr key={farm.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        #{farm.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{farm.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {farm.user_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {farm.crop_type || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {farm.size || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="text-xs">
                          {farm.lat.toFixed(4)}, {farm.lng.toFixed(4)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          farm.infestation_count > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {farm.infestation_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {farm.is_verified ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Verified
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => {
                            setSelectedFarm(farm);
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="View details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {!farm.is_verified && (
                          <button
                            onClick={() => handleVerifyFarm(farm.id)}
                            className="text-green-600 hover:text-green-800"
                            title="Verify farm"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteFarm(farm.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete farm"
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
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedFarm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Farm Details</h2>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedFarm(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
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
                  {selectedFarm.is_verified ? (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Verified
                    </span>
                  ) : (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Unverified
                    </span>
                  )}
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

              <div className="flex space-x-3 mt-6">
                {!selectedFarm.is_verified && (
                  <button
                    onClick={() => {
                      handleVerifyFarm(selectedFarm.id);
                      setShowDetailModal(false);
                      setSelectedFarm(null);
                    }}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Verify Farm
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedFarm(null);
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
    </div>
  );
};

export default AdminFarms;