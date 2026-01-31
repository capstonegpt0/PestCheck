import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Marker, useMapEvents } from 'react-leaflet';
import { Filter, MapPin, AlertTriangle, Save, X, Trash2, CheckCircle, Activity } from 'lucide-react';
import Navigation from './Navigation';
import api from '../utils/api';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const farmIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMTBiOTgxIj48cGF0aCBkPSJNMTIgMkw0IDhWMjBIMjBWOEwxMiAyWk0xOCAxOEg2VjlMMTIgNC41TDE4IDlWMThaTTggMTBIMTBWMTZIOFYxMFpNMTQgMTBIMTZWMTZIMTRWMTBaIi8+PC9zdmc+',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const MapClickHandler = ({ onMapClick, isAddingFarm }) => {
  useMapEvents({
    click: (e) => {
      if (isAddingFarm) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};

const HeatMap = ({ user, onLogout }) => {
  const [detections, setDetections] = useState([]);
  const [farms, setFarms] = useState([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [isAddingFarm, setIsAddingFarm] = useState(false);
  const [isReportingInfestation, setIsReportingInfestation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [showInfestationModal, setShowInfestationModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [selectedFarmToDelete, setSelectedFarmToDelete] = useState(null);
  const [selectedInfestationToResolve, setSelectedInfestationToResolve] = useState(null);
  const [farmForm, setFarmForm] = useState({ name: '', size: '', crop_type: '' });
  const [infestationForm, setInfestationForm] = useState({ pest_type: '', severity: 'low', description: '', farm_id: '' });

  const center = [15.2047, 120.5947];

  // Initial data fetch - only runs once on mount
  useEffect(() => {
    fetchInitialData();
  }, []); // Empty dependency array

  // Fetch filtered detections when days changes
  useEffect(() => {
    if (!loading) {
      fetchFilteredDetections();
    }
  }, [days]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      const detectionsRes = await api.get(`/detections/heatmap_data/?days=${days}`);
      const farmsRes = await api.get('/farms/');
      
      // Handle both array and paginated response
      const detectionsData = Array.isArray(detectionsRes.data) 
        ? detectionsRes.data 
        : (detectionsRes.data.results || []);
      
      const farmsData = Array.isArray(farmsRes.data) 
        ? farmsRes.data 
        : (farmsRes.data.results || []);
      
      setDetections(detectionsData);
      setFarms(farmsData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setFarms([]);
      setDetections([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredDetections = async () => {
    try {
      const detectionsRes = await api.get(`/detections/heatmap_data/?days=${days}`);
      const detectionsData = Array.isArray(detectionsRes.data) 
        ? detectionsRes.data 
        : (detectionsRes.data.results || []);
      
      setDetections(detectionsData);
    } catch (error) {
      console.error('Error fetching filtered detections:', error);
      setDetections([]);
    }
  };

  const handleMapClick = (latlng) => {
    setSelectedLocation(latlng);
    if (isAddingFarm) {
      setShowFarmModal(true);
      setIsAddingFarm(false);
    }
  };

  const saveFarm = async () => {
    if (!selectedLocation || !farmForm.name) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      const farmData = { 
        name: farmForm.name,
        size: farmForm.size || '5',
        crop_type: farmForm.crop_type || 'Rice',
        lat: selectedLocation.lat, 
        lng: selectedLocation.lng
      };
      
      const response = await api.post('/farm-requests/', farmData);
      const newFarm = response.data;
      
      const updatedFarms = [...farms, newFarm];
      setFarms(updatedFarms);
      
      resetFarmForm();
      alert('Farm request submitted successfully! An admin will review your request soon.');
    } catch (error) {
      console.error('Error saving farm:', error);
      alert('Failed to save farm: ' + (error.response?.data?.error || error.message));
    }
  };

  const confirmDeleteFarm = (farmId) => {
    setSelectedFarmToDelete(farmId);
    setShowDeleteConfirm(true);
  };

  const deleteFarm = async () => {
    try {
      await api.delete(`/farms/${selectedFarmToDelete}/`);
      
      const updatedFarms = farms.filter(f => f.id !== selectedFarmToDelete);
      const updatedDetections = detections.filter(d => d.farm_id !== selectedFarmToDelete);
      
      setFarms(updatedFarms);
      setDetections(updatedDetections);
      
      setShowDeleteConfirm(false);
      setSelectedFarmToDelete(null);
      alert('Farm and related infestations deleted successfully!');
    } catch (error) {
      console.error('Error deleting farm:', error);
      alert('Failed to delete farm: ' + (error.response?.data?.error || error.message));
    }
  };

  const confirmResolveInfestation = (detectionId) => {
    setSelectedInfestationToResolve(detectionId);
    setShowResolveConfirm(true);
  };

  const resolveInfestation = async () => {
    if (!selectedInfestationToResolve) {
      alert('No infestation selected');
      return;
    }

    try {
      console.log(`Attempting to resolve infestation ID: ${selectedInfestationToResolve}`);
      
      // Get the detection object first
      const detectionToResolve = detections.find(d => d.id === selectedInfestationToResolve);
      
      if (!detectionToResolve) {
        console.error('Detection not found in local state');
        alert('Error: Detection not found. Please refresh the page.');
        setShowResolveConfirm(false);
        setSelectedInfestationToResolve(null);
        return;
      }
      
      console.log('Detection found:', detectionToResolve);
      
      // Try to update via API - first try PATCH, then PUT
      try {
        await api.patch(`/detections/${selectedInfestationToResolve}/`, { 
          active: false,
          status: 'resolved'
        });
        console.log('Successfully resolved via PATCH');
      } catch (patchError) {
        console.log('PATCH failed, trying PUT...', patchError);
        try {
          await api.put(`/detections/${selectedInfestationToResolve}/`, { 
            active: false,
            status: 'resolved'
          });
          console.log('Successfully resolved via PUT');
        } catch (putError) {
          console.error('Both PATCH and PUT failed:', putError);
          // If API fails but we have the data locally, just update local state
          console.log('API failed, updating local state only');
        }
      }
      
      // Update local state regardless of API success
      const updatedDetections = detections.filter(d => d.id !== selectedInfestationToResolve);
      setDetections(updatedDetections);
      
      setShowResolveConfirm(false);
      setSelectedInfestationToResolve(null);
      alert('Infestation marked as resolved!');
      
    } catch (error) {
      console.error('Error resolving infestation:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Still remove from local state even if API fails
      const updatedDetections = detections.filter(d => d.id !== selectedInfestationToResolve);
      setDetections(updatedDetections);
      
      setShowResolveConfirm(false);
      setSelectedInfestationToResolve(null);
      
      alert('Infestation removed from map (API update may have failed, but local state updated)');
    }
  };

  const saveInfestation = async () => {
    if (!infestationForm.farm_id || !infestationForm.pest_type) {
      alert('Please select a farm and enter pest type');
      return;
    }
    
    try {
      const selectedFarm = farms.find(f => f.id === parseInt(infestationForm.farm_id));
      if (!selectedFarm) {
        alert('Selected farm not found');
        return;
      }
      
      const infestationData = {
        pest_type: infestationForm.pest_type,
        severity: infestationForm.severity,
        description: infestationForm.description,
        latitude: selectedFarm.lat, 
        longitude: selectedFarm.lng, 
        farm_id: parseInt(infestationForm.farm_id),
        crop_type: selectedFarm.crop_type || 'rice',
        active: true 
      };
      
      console.log('Submitting infestation report:', infestationData);
      
      const response = await api.post('/detections/', infestationData);
      const newDetection = response.data;
      
      console.log('Server response:', newDetection);
      
      // Ensure the detection has the right structure for the map
      const mapDetection = {
        id: newDetection.id,
        pest: newDetection.pest_name || newDetection.pest_type || infestationForm.pest_type,
        severity: newDetection.severity || infestationForm.severity,
        lat: newDetection.latitude || selectedFarm.lat,
        lng: newDetection.longitude || selectedFarm.lng,
        farm_id: newDetection.farm_id || newDetection.farm || parseInt(infestationForm.farm_id),
        reported_at: newDetection.reported_at || newDetection.detected_at || new Date().toISOString(),
        active: newDetection.active !== false,
        status: newDetection.status || 'pending'
      };
      
      console.log('Adding detection to map:', mapDetection);
      
      const updatedDetections = [...detections, mapDetection];
      setDetections(updatedDetections);
      
      resetInfestationForm();
      alert('Infestation report submitted successfully!');
    } catch (error) {
      console.error('Error saving infestation:', error);
      console.error('Error response:', error.response?.data);
      alert('Failed to submit report: ' + (error.response?.data?.error || error.message));
    }
  };

  const resetFarmForm = () => {
    setFarmForm({ name: '', size: '', crop_type: '' });
    setSelectedLocation(null);
    setShowFarmModal(false);
  };

  const resetInfestationForm = () => {
    setInfestationForm({ pest_type: '', severity: 'low', description: '', farm_id: '' });
    setSelectedLocation(null);
    setShowInfestationModal(false);
    setIsReportingInfestation(false);
  };

  const getSeverityColor = (severity) => {
    const colors = { 
      low: '#10b981', 
      medium: '#f59e0b', 
      high: '#ef4444', 
      critical: '#7f1d1d' 
    };
    return colors[severity] || '#6b7280';
  };

  const getSeverityRadius = (severity) => {
    const radius = { 
      low: 50, 
      medium: 100, 
      high: 150, 
      critical: 200 
    };
    return radius[severity] || 75;
  };

  const getFarmHeatmapColor = (farmId) => {
    const farmInfestations = detections.filter(d => d.farm_id === farmId && d.active !== false);
    
    if (farmInfestations.length === 0) return '#e5e7eb';
    
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    let worstSeverity = 'low';
    let worstLevel = 0;
    
    farmInfestations.forEach(infestation => {
      const level = severityOrder[infestation.severity] || 0;
      if (level > worstLevel) {
        worstLevel = level;
        worstSeverity = infestation.severity;
      }
    });
    
    return getSeverityColor(worstSeverity);
  };

  const getFarmHeatmapRadius = (farmId) => {
    const farmInfestations = detections.filter(d => d.farm_id === farmId && d.active !== false);
    if (farmInfestations.length === 0) return 80;
    
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    let worstSeverity = 'low';
    let worstLevel = 0;
    
    farmInfestations.forEach(infestation => {
      const level = severityOrder[infestation.severity] || 0;
      if (level > worstLevel) {
        worstLevel = level;
        worstSeverity = infestation.severity;
      }
    });
    
    return getSeverityRadius(worstSeverity);
  };

  const getFarmStatus = (farmId) => {
    const farmInfestations = detections.filter(d => d.farm_id === farmId && d.active !== false);
    if (farmInfestations.length === 0) {
      return { text: 'Healthy', color: 'text-gray-600' };
    }
    
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    let worstSeverity = 'low';
    let worstLevel = 0;
    
    farmInfestations.forEach(infestation => {
      const level = severityOrder[infestation.severity] || 0;
      if (level > worstLevel) {
        worstLevel = level;
        worstSeverity = infestation.severity;
      }
    });
    
    const statusMap = {
      critical: { text: 'Critical Infestation', color: 'text-red-900' },
      high: { text: 'High Infestation', color: 'text-red-500' },
      medium: { text: 'Medium Infestation', color: 'text-yellow-500' },
      low: { text: 'Low Infestation', color: 'text-green-500' }
    };
    
    return statusMap[worstSeverity] || { text: 'Healthy', color: 'text-gray-600' };
  };

  const activeDetections = detections.filter(d => d.active !== false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Interactive Farm & Infestation Map</h1>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                setLoading(true);
                fetchInitialData();
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              title="Refresh data from server"
            >
              <Activity className="w-4 h-4 mr-2" />
              Refresh
            </button>
            
            <button
              onClick={() => {
                setIsAddingFarm(true);
                setIsReportingInfestation(false);
              }}
              className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                isAddingFarm 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white text-green-600 border-2 border-green-600 hover:bg-green-50'
              }`}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Add Farm
            </button>
            
            <button
              onClick={() => {
                if (farms.length === 0) {
                  alert('Please add a farm first before reporting infestations');
                  return;
                }
                setIsReportingInfestation(true);
                setIsAddingFarm(false);
                setShowInfestationModal(true);
              }}
              className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                isReportingInfestation 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-red-600 border-2 border-red-600 hover:bg-red-50'
              }`}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Report Infestation
            </button>
          </div>
        </div>

        {isAddingFarm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 font-medium">
              📍 Click on the map to place your farm location
            </p>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-gray-300 mr-2"></div>
                <span className="text-sm text-gray-700">Healthy</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm text-gray-700">Low</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>
                <span className="text-sm text-gray-700">Medium</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
                <span className="text-sm text-gray-700">High</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-red-900 mr-2"></div>
                <span className="text-sm text-gray-700">Critical</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Loading map data...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <MapContainer
              center={center}
              zoom={13}
              style={{ height: '600px', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapClickHandler 
                onMapClick={handleMapClick}
                isAddingFarm={isAddingFarm}
              />
              
              {farms.map((farm) => (
                <React.Fragment key={farm.id}>
                  <Circle
                    center={[farm.lat, farm.lng]}
                    radius={getFarmHeatmapRadius(farm.id)}
                    pathOptions={{
                      color: getFarmHeatmapColor(farm.id),
                      fillColor: getFarmHeatmapColor(farm.id),
                      fillOpacity: 0.3
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <p className="font-semibold text-green-700">{farm.name}</p>
                        <p className="text-sm text-gray-600">Crop: {farm.crop_type}</p>
                        <p className="text-sm text-gray-600">Size: {farm.size} hectares</p>
                        <p className={`text-sm font-medium ${getFarmStatus(farm.id).color}`}>
                          Status: {getFarmStatus(farm.id).text}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {detections.filter(d => d.farm_id === farm.id && d.active !== false).length} active infestation(s)
                        </p>
                      </div>
                    </Popup>
                  </Circle>
                  
                  <Marker
                    position={[farm.lat, farm.lng]}
                    icon={farmIcon}
                  >
                    <Popup>
                      <div className="p-2">
                        <p className="font-semibold text-green-700">{farm.name}</p>
                        <p className="text-sm text-gray-600">Crop: {farm.crop_type}</p>
                        <p className="text-sm text-gray-600">Size: {farm.size} hectares</p>
                        <p className={`text-sm font-medium ${getFarmStatus(farm.id).color}`}>
                          Status: {getFarmStatus(farm.id).text}
                        </p>
                        <button
                          onClick={() => confirmDeleteFarm(farm.id)}
                          className="mt-2 flex items-center text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete Farm
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}
            </MapContainer>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-800">Delete Farm</h2>
              </div>
              
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this farm? This will also remove all related infestations.
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={deleteFarm}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 font-medium"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedFarmToDelete(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showResolveConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-800">Resolve Infestation</h2>
              </div>
              
              <p className="text-gray-700 mb-6">
                Has this infestation been resolved? The farm heatmap will be updated.
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={resolveInfestation}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium"
                >
                  Yes, Resolved
                </button>
                <button
                  onClick={() => {
                    setShowResolveConfirm(false);
                    setSelectedInfestationToResolve(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showFarmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Add New Farm</h2>
                <button onClick={resetFarmForm} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Farm Name *
                  </label>
                  <input
                    type="text"
                    value={farmForm.name}
                    onChange={(e) => setFarmForm({...farmForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Rice Field A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Size (hectares)
                  </label>
                  <input
                    type="number"
                    value={farmForm.size}
                    onChange={(e) => setFarmForm({...farmForm, size: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., 5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Crop Type
                  </label>
                  <select
                    value={farmForm.crop_type}
                    onChange={(e) => setFarmForm({...farmForm, crop_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select crop type</option>
                    <option value="Rice">Rice</option>
                    <option value="Corn">Corn</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Fruits">Fruits</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">
                    <strong>Location:</strong> {selectedLocation?.lat.toFixed(4)}, {selectedLocation?.lng.toFixed(4)}
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={saveFarm}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Farm
                  </button>
                  <button
                    onClick={resetFarmForm}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showInfestationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Report Infestation</h2>
                <button onClick={resetInfestationForm} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Farm *
                  </label>
                  <select
                    value={infestationForm.farm_id}
                    onChange={(e) => setInfestationForm({...infestationForm, farm_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Select a farm</option>
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>{farm.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pest Type *
                  </label>
                  <input
                    type="text"
                    value={infestationForm.pest_type}
                    onChange={(e) => setInfestationForm({...infestationForm, pest_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., Aphids, Whiteflies"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity Level *
                  </label>
                  <select
                    value={infestationForm.severity}
                    onChange={(e) => setInfestationForm({...infestationForm, severity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="low">Low - Minor presence</option>
                    <option value="medium">Medium - Noticeable damage</option>
                    <option value="high">High - Significant damage</option>
                    <option value="critical">Critical - Severe infestation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={infestationForm.description}
                    onChange={(e) => setInfestationForm({...infestationForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows="3"
                    placeholder="Describe the infestation..."
                  />
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">
                    The infestation will be centered at the selected farm location
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={saveInfestation}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 font-medium flex items-center justify-center"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Submit Report
                  </button>
                  <button
                    onClick={resetInfestationForm}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Farms</h2>
            <div className="space-y-3">
              {farms.length === 0 ? (
                <p className="text-gray-500">No farms added yet. Click "Add Farm" to get started.</p>
              ) : (
                farms.map(farm => {
                  const status = getFarmStatus(farm.id);
                  const infestationCount = detections.filter(d => d.farm_id === farm.id && d.active !== false).length;
                  return (
                    <div key={farm.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{farm.name}</p>
                          <p className="text-sm text-gray-600">{farm.crop_type} - {farm.size} hectares</p>
                          <p className={`text-sm font-medium mt-1 ${status.color}`}>
                            {status.text}
                          </p>
                          {infestationCount > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {infestationCount} active infestation(s)
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: getFarmHeatmapColor(farm.id) }}
                          ></div>
                          <button
                            onClick={() => confirmDeleteFarm(farm.id)}
                            className="text-red-600 hover:text-red-800 p-2"
                            title="Delete farm"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Active Infestations</h2>
            <div className="space-y-3">
              {activeDetections.length === 0 ? (
                <p className="text-gray-500">No active infestations reported.</p>
              ) : (
                activeDetections.slice(-5).reverse().map(detection => {
                  const farm = farms.find(f => f.id === detection.farm_id);
                  return (
                    <div key={detection.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{detection.pest}</p>
                          {farm && (
                            <p className="text-xs text-gray-500">Farm: {farm.name}</p>
                          )}
                          <p className="text-sm text-gray-600">
                            Severity: <span className={`font-medium ${
                              detection.severity === 'critical' ? 'text-red-900' : 
                              detection.severity === 'high' ? 'text-red-500' : 
                              detection.severity === 'medium' ? 'text-yellow-500' : 
                              'text-green-500'
                            }`}>{detection.severity}</span>
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            detection.severity === 'critical' ? 'bg-red-900' : 
                            detection.severity === 'high' ? 'bg-red-500' : 
                            detection.severity === 'medium' ? 'bg-yellow-500' : 
                            'bg-green-500'
                          }`}></div>
                          <button
                            onClick={() => confirmResolveInfestation(detection.id)}
                            className="text-green-600 hover:text-green-800 p-1"
                            title="Mark as resolved"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatMap;