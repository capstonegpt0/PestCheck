import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Marker, useMapEvents } from 'react-leaflet';
import { Filter, MapPin, AlertTriangle, Save, X, CheckCircle, Activity } from 'lucide-react';
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

// Function to create a labeled farm icon
const createLabeledFarmIcon = (farmName, ownerName) => {
  return L.divIcon({
    className: 'custom-farm-marker',
    html: `
      <div style="position: relative; text-align: center;">
        <div style="
          background: white;
          padding: 4px 8px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          margin-bottom: 4px;
          border: 2px solid #10b981;
          color: #047857;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
        ">
          ${farmName}<br/>
          <span style="font-size: 9px; color: #6b7280; font-weight: 500;">${ownerName}</span>
        </div>
        <div style="
          width: 32px;
          height: 32px;
          margin: 0 auto;
          background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMTBiOTgxIj48cGF0aCBkPSJNMTIgMkw0IDhWMjBIMjBWOEwxMiAyWk0xOCAxOEg2VjlMMTIgNC41TDE4IDlWMThaTTggMTBIMTBWMTZIOFYxMFpNMTQgMTBIMTZWMTZIMTRWMTBaIi8+PC9zdmc+');
          background-size: contain;
          background-repeat: no-repeat;
        "></div>
      </div>
    `,
    iconSize: [150, 70],
    iconAnchor: [75, 70],
    popupAnchor: [0, -70]
  });
};

// Farm status thresholds configuration
const FARM_STATUS_CONFIG = {
  MINIMUM_THRESHOLD: 3,    // Minimum detections before showing any status
  LOW_THRESHOLD: 3,        // Low risk: 3-4 detections
  MODERATE_THRESHOLD: 5,   // Moderate risk: 5-6 detections  
  HIGH_THRESHOLD: 7,       // High risk: 7-9 detections
  CRITICAL_THRESHOLD: 10   // Critical: 10+ detections
};

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
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [selectedInfestationToResolve, setSelectedInfestationToResolve] = useState(null);
  const [farmForm, setFarmForm] = useState({ name: '', size: '', crop_type: '' });
  const [infestationForm, setInfestationForm] = useState({ pest_type: '', severity: 'low', description: '', farm_id: '' });

  const center = [15.2047, 120.5947];

  useEffect(() => {
    fetchInitialData();
  }, []);

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
      
      console.log('Raw farms response:', farmsRes.data);
      console.log('Raw detections response:', detectionsRes.data);
      
      const detectionsData = Array.isArray(detectionsRes.data) 
        ? detectionsRes.data 
        : (detectionsRes.data.results || []);
      
      const farmsData = Array.isArray(farmsRes.data) 
        ? farmsRes.data 
        : (farmsRes.data.results || []);
      
      console.log('Farms array:', farmsData);
      console.log('Detections array:', detectionsData);
      
      // Validate and filter out invalid data with detailed logging
      const validFarms = farmsData.filter(farm => {
        const hasLat = farm.lat !== null && farm.lat !== undefined && farm.lat !== '';
        const hasLng = farm.lng !== null && farm.lng !== undefined && farm.lng !== '';
        const isLatValid = hasLat && !isNaN(parseFloat(farm.lat));
        const isLngValid = hasLng && !isNaN(parseFloat(farm.lng));
        
        if (!hasLat || !hasLng || !isLatValid || !isLngValid) {
          console.warn('Invalid farm coordinates:', {
            farm_id: farm.id,
            name: farm.name,
            lat: farm.lat,
            lng: farm.lng,
            hasLat,
            hasLng,
            isLatValid,
            isLngValid
          });
          return false;
        }
        return true;
      });
      
      const validDetections = detectionsData.filter(detection => {
        // The API returns 'lat' and 'lng', NOT 'latitude' and 'longitude'
        const lat = detection.lat || detection.latitude;
        const lng = detection.lng || detection.longitude;
        
        const isLatValid = lat !== null && lat !== undefined && lat !== '' && !isNaN(parseFloat(lat));
        const isLngValid = lng !== null && lng !== undefined && lng !== '' && !isNaN(parseFloat(lng));
        
        if (!isLatValid || !isLngValid) {
          console.warn('Invalid detection coordinates:', {
            detection_id: detection.id,
            pest: detection.pest || detection.pest_name,
            lat: lat,
            lng: lng,
            original_lat: detection.lat,
            original_lng: detection.lng,
            original_latitude: detection.latitude,
            original_longitude: detection.longitude,
            isLatValid,
            isLngValid
          });
          return false;
        }
        
        // Normalize to both property names for compatibility
        detection.latitude = parseFloat(lat);
        detection.longitude = parseFloat(lng);
        detection.lat = parseFloat(lat);
        detection.lng = parseFloat(lng);
        
        return true;
      });
      
      console.log(`✅ Loaded ${validFarms.length} valid farms out of ${farmsData.length}`);
      console.log(`✅ Loaded ${validDetections.length} valid detections out of ${detectionsData.length}`);
      
      setDetections(validDetections);
      setFarms(validFarms);
      
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
      
      // Validate and filter - API returns 'lat' and 'lng'
      const validDetections = detectionsData.filter(detection => {
        const lat = detection.lat || detection.latitude;
        const lng = detection.lng || detection.longitude;
        
        const isLatValid = lat !== null && lat !== undefined && lat !== '' && !isNaN(parseFloat(lat));
        const isLngValid = lng !== null && lng !== undefined && lng !== '' && !isNaN(parseFloat(lng));
        
        if (!isLatValid || !isLngValid) {
          console.warn('Invalid detection coordinates during filter:', {
            detection_id: detection.id,
            lat,
            lng
          });
          return false;
        }
        
        // Normalize to both property names
        detection.latitude = parseFloat(lat);
        detection.longitude = parseFloat(lng);
        detection.lat = parseFloat(lat);
        detection.lng = parseFloat(lng);
        
        return true;
      });
      
      setDetections(validDetections);
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
        // NOTE: No status field - farms start with no status by default
      };
      
      const response = await api.post('/farm-requests/', farmData);
      
      resetFarmForm();
      alert('Farm request submitted successfully! An admin will review your request soon.');
      
      fetchInitialData();
    } catch (error) {
      console.error('Error saving farm request:', error);
      alert('Failed to submit farm request: ' + (error.response?.data?.error || error.message));
    }
  };

  /**
   * Calculate farm status based on active detection count
   * Returns null/empty status until threshold is reached
   */
  const getFarmStatus = (farmId) => {
    const activeInfestations = detections.filter(
      d => d.farm_id === farmId && d.active !== false
    );
    
    const count = activeInfestations.length;
    
    // NO STATUS until minimum threshold is reached
    if (count < FARM_STATUS_CONFIG.MINIMUM_THRESHOLD) {
      return {
        text: '',
        color: 'text-gray-500',
        showStatus: false
      };
    }
    
    // Critical status: 10+ detections
    if (count >= FARM_STATUS_CONFIG.CRITICAL_THRESHOLD) {
      return {
        text: 'Critical - High Infestation',
        color: 'text-red-700',
        showStatus: true
      };
    }
    
    // High risk: 7-9 detections
    if (count >= FARM_STATUS_CONFIG.HIGH_THRESHOLD) {
      return {
        text: 'High Risk - Monitor Closely',
        color: 'text-orange-600',
        showStatus: true
      };
    }
    
    // Moderate risk: 5-6 detections
    if (count >= FARM_STATUS_CONFIG.MODERATE_THRESHOLD) {
      return {
        text: 'Moderate Risk - Action Needed',
        color: 'text-yellow-600',
        showStatus: true
      };
    }
    
    // Low risk: 3-4 detections (above threshold)
    if (count >= FARM_STATUS_CONFIG.LOW_THRESHOLD) {
      return {
        text: 'Low Risk - Early Detection',
        color: 'text-green-600',
        showStatus: true
      };
    }
    
    return {
      text: '',
      color: 'text-gray-500',
      showStatus: false
    };
  };

  const getFarmHeatmapColor = (farmId) => {
    const activeInfestations = detections.filter(d => d.farm_id === farmId && d.active !== false);
    const count = activeInfestations.length;

    if (count === 0) return '#d1d5db'; // Gray - No status/No infestations
    if (count < 3) return '#3b82f6'; // Blue - Monitoring
    if (count < 5) return '#fbbf24'; // Yellow - Low risk
    if (count < 7) return '#f97316'; // Orange - Moderate
    if (count < 10) return '#ef4444'; // Red - High
    return '#7f1d1d'; // Dark red - Critical
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
      
      const detectionToResolve = detections.find(d => d.id === selectedInfestationToResolve);
      
      if (!detectionToResolve) {
        console.error('Detection not found in local state');
        alert('Error: Detection not found. Please refresh the page.');
        setShowResolveConfirm(false);
        setSelectedInfestationToResolve(null);
        return;
      }
      
      console.log('Detection found:', detectionToResolve);
      
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
          console.log('API failed, updating local state only');
        }
      }
      
      const updatedDetections = detections.filter(d => d.id !== selectedInfestationToResolve);
      setDetections(updatedDetections);
      
      setShowResolveConfirm(false);
      setSelectedInfestationToResolve(null);
      
      alert('Infestation marked as resolved!');
      
    } catch (error) {
      console.error('Error resolving infestation:', error);
      alert('Failed to resolve infestation. Please try again.');
    }
  };

  const saveInfestation = async () => {
    if (!infestationForm.farm_id || !infestationForm.pest_type) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const selectedFarm = farms.find(f => f.id === parseInt(infestationForm.farm_id));
      
      if (!selectedFarm) {
        alert('Selected farm not found');
        return;
      }

      const infestationData = {
        pest: infestationForm.pest_type,
        severity: infestationForm.severity,
        latitude: selectedFarm.lat,
        longitude: selectedFarm.lng,
        address: 'Magalang, Pampanga',
        farm_id: selectedFarm.id,
        description: infestationForm.description,
        active: true
      };

      await api.post('/detections/', infestationData);
      
      resetInfestationForm();
      alert('Infestation reported successfully!');
      
      fetchInitialData();
    } catch (error) {
      console.error('Error reporting infestation:', error);
      alert('Failed to report infestation: ' + (error.response?.data?.error || error.message));
    }
  };

  const resetFarmForm = () => {
    setFarmForm({ name: '', size: '', crop_type: '' });
    setSelectedLocation(null);
    setShowFarmModal(false);
  };

  const resetInfestationForm = () => {
    setInfestationForm({ pest_type: '', severity: 'low', description: '', farm_id: '' });
    setShowInfestationModal(false);
  };

  const activeDetections = detections.filter(d => d.active !== false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Infestation Heat Map</h1>
          <p className="text-gray-600">Track and manage pest infestations across farms</p>
        </div>

        {/* Map Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Time Range:</span>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          <button
            onClick={fetchInitialData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Refresh map data"
          >
            <Activity className="w-5 h-5 mr-2" />
            Refresh
          </button>

          <div className="flex-1"></div>

          <button
            onClick={() => setShowInfestationModal(true)}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <AlertTriangle className="w-5 h-5 mr-2" />
            Report Infestation
          </button>

          <button
            onClick={() => setIsAddingFarm(true)}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              isAddingFarm
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-primary text-white hover:bg-green-600'
            }`}
            disabled={isAddingFarm}
          >
            <MapPin className="w-5 h-5 mr-2" />
            {isAddingFarm ? 'Click on map to place farm...' : 'Request Farm'}
          </button>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Map Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-gray-300"></div>
              <span>No Infestations</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span>Monitoring (1-2)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span>Low Risk (3-4)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-orange-500"></div>
              <span>Moderate (5-6)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span>High (7-9)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#7f1d1d' }}></div>
              <span>Critical (10+)</span>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6" style={{ height: '500px' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Activity className="w-8 h-8 text-primary animate-spin mr-2" />
              <span className="text-gray-600">Loading map data...</span>
            </div>
          ) : (
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} attributionControl={false}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onMapClick={handleMapClick} isAddingFarm={isAddingFarm} />

              {/* Farm Markers */}
              {farms
                .filter(farm => {
                  // Triple check coordinates are valid
                  const hasValidLat = farm.lat !== null && 
                                     farm.lat !== undefined && 
                                     farm.lat !== '' && 
                                     !isNaN(parseFloat(farm.lat)) &&
                                     isFinite(parseFloat(farm.lat));
                  const hasValidLng = farm.lng !== null && 
                                     farm.lng !== undefined && 
                                     farm.lng !== '' && 
                                     !isNaN(parseFloat(farm.lng)) &&
                                     isFinite(parseFloat(farm.lng));
                  
                  if (!hasValidLat || !hasValidLng) {
                    console.error('❌ Filtering out invalid farm before render:', {
                      id: farm.id,
                      name: farm.name,
                      lat: farm.lat,
                      lng: farm.lng,
                      hasValidLat,
                      hasValidLng
                    });
                    return false;
                  }
                  return true;
                })
                .map((farm) => {
                  // Double safety check
                  const lat = parseFloat(farm.lat);
                  const lng = parseFloat(farm.lng);
                  
                  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
                    console.error('❌ Skipping farm with invalid coords in map:', farm);
                    return null;
                  }
                  
                  return (
                    <Marker
                      key={farm.id}
                      position={[lat, lng]}
                      icon={createLabeledFarmIcon(farm.name || 'Unknown Farm', farm.user_name || 'Unknown')}
                    >
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-bold text-lg">{farm.name}</h3>
                          <p className="text-sm text-gray-600">Owner: {farm.user_name}</p>
                          <p className="text-sm">{farm.crop_type} - {farm.size} hectares</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Active Infestations: {detections.filter(d => d.farm_id === farm.id && d.active !== false).length}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })
                .filter(marker => marker !== null)
              }

              {/* Detection Circles */}
              {activeDetections
                .filter(detection => {
                  // API returns 'lat' and 'lng' - check these first
                  const lat = detection.lat || detection.latitude;
                  const lng = detection.lng || detection.longitude;
                  
                  const hasValidLat = lat !== null && 
                                     lat !== undefined && 
                                     lat !== '' && 
                                     !isNaN(parseFloat(lat)) &&
                                     isFinite(parseFloat(lat));
                  const hasValidLng = lng !== null && 
                                     lng !== undefined && 
                                     lng !== '' && 
                                     !isNaN(parseFloat(lng)) &&
                                     isFinite(parseFloat(lng));
                  
                  if (!hasValidLat || !hasValidLng) {
                    console.error('❌ Filtering out invalid detection before render:', {
                      id: detection.id,
                      pest: detection.pest,
                      lat,
                      lng,
                      hasValidLat,
                      hasValidLng
                    });
                    return false;
                  }
                  return true;
                })
                .map((detection) => {
                  // API returns 'lat' and 'lng'
                  const lat = parseFloat(detection.lat || detection.latitude);
                  const lng = parseFloat(detection.lng || detection.longitude);
                  
                  // Double safety check
                  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
                    console.error('❌ Skipping detection with invalid coords in map:', detection);
                    return null;
                  }
                  
                  const radius = detection.severity === 'critical' ? 300 :
                              detection.severity === 'high' ? 200 :
                              detection.severity === 'medium' ? 150 : 100;
                
                  const color = detection.severity === 'critical' ? '#7f1d1d' :
                             detection.severity === 'high' ? '#ef4444' :
                             detection.severity === 'medium' ? '#f97316' : '#fbbf24';

                  return (
                    <Circle
                      key={detection.id}
                      center={[lat, lng]}
                      radius={radius}
                      pathOptions={{
                        fillColor: color,
                        fillOpacity: 0.3,
                        color: color,
                        weight: 2
                      }}
                    >
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-bold">{detection.pest}</h3>
                          <p className="text-sm">Severity: {detection.severity}</p>
                          <p className="text-xs text-gray-600">
                            {new Date(detection.detected_at || detection.reported_at).toLocaleDateString()}
                          </p>
                        </div>
                      </Popup>
                    </Circle>
                  );
                })
                .filter(circle => circle !== null)
              }
            </MapContainer>
          )}
        </div>

        {/* Farm Modal */}
        {showFarmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" style={{ zIndex: 10000 }}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Request New Farm</h2>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., Northern Rice Field"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Crop Type
                  </label>
                  <select
                    value={farmForm.crop_type}
                    onChange={(e) => setFarmForm({...farmForm, crop_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="Rice">Rice</option>
                    <option value="Corn">Corn</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Mixed">Mixed Crops</option>
                  </select>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">
                    📍 Location: {selectedLocation?.lat.toFixed(4)}, {selectedLocation?.lng.toFixed(4)}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Your farm request will be reviewed by an administrator before approval.
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={saveFarm}
                    className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-green-600 font-medium flex items-center justify-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Submit Request
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

        {/* Infestation Modal */}
        {showDetectionModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Pest Detection</h2>
          <button onClick={closeDetectionModal} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Upload Step */}
        {detectionStep === 'upload' && (
          <div className="space-y-6">
            {/* Crop Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Crop Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setCropType('rice')}
                  className={`p-4 rounded-lg font-semibold transition-all ${
                    cropType === 'rice'
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Rice
                </button>
                <button
                  onClick={() => setCropType('corn')}
                  className={`p-4 rounded-lg font-semibold transition-all ${
                    cropType === 'corn'
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Corn
                </button>
              </div>
            </div>

            {/* Upload Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload or Capture Image
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleUploadClick}
                  className="flex flex-col items-center justify-center p-6 bg-blue-50 border-2 border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Upload className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="font-semibold text-blue-800">Upload</span>
                </button>
                <button
                  onClick={handleCameraClick}
                  className="flex flex-col items-center justify-center p-6 bg-green-50 border-2 border-green-300 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Camera className="w-8 h-8 text-green-600 mb-2" />
                  <span className="font-semibold text-green-800">Camera</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Preview
                </label>
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-auto rounded-lg shadow-md border-2 border-gray-200"
                />
              </div>
            )}

            {/* Error Message */}
            {detectionError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-sm text-red-800">{detectionError}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            {imagePreview && (
              <div className="flex space-x-3">
                <button
                  onClick={runDetection}
                  disabled={detectionLoading || locationLoading}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center disabled:bg-gray-400"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Detect Pest
                </button>
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                    setDetectionError(null);
                  }}
                  className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {/* Detecting Step */}
        {detectionStep === 'detecting' && (
          <div className="py-12 text-center">
            <Loader className="w-16 h-16 text-green-600 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Analyzing Image...</h3>
            <p className="text-gray-600">Our AI is identifying the pest</p>
          </div>
        )}

        {/* Confirmation Step */}
        {detectionStep === 'confirm' && detectionResult && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Detection Result</h3>
              <p className="text-2xl font-bold text-gray-800 mb-1">
                {detectionResult.pest_name || detectionResult.pest}
              </p>
              {detectionResult.scientific_name && (
                <p className="text-sm italic text-gray-600 mb-2">{detectionResult.scientific_name}</p>
              )}
              <p className="text-sm text-gray-700">
                Confidence: <span className="font-semibold">{(detectionResult.confidence * 100).toFixed(1)}%</span>
              </p>
            </div>

            <div className="text-center">
              <p className="text-lg font-medium text-gray-800 mb-4">Is this detection correct?</p>
              <div className="flex space-x-4">
                <button
                  onClick={() => confirmDetection(true)}
                  className="flex-1 bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center"
                >
                  <ThumbsUp className="w-5 h-5 mr-2" />
                  Yes, Correct
                </button>
                <button
                  onClick={() => confirmDetection(false)}
                  className="flex-1 bg-red-600 text-white py-4 rounded-lg hover:bg-red-700 font-semibold flex items-center justify-center"
                >
                  <ThumbsDown className="w-5 h-5 mr-2" />
                  No, Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assessment Step */}
        {detectionStep === 'assessment' && detectionResult && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-900">
                Detected: {detectionResult.pest_name || detectionResult.pest}
              </h3>
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-800 mb-4">
                How severe is the damage?
              </label>
              
              <div className="mb-6">
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={damageLevel}
                  onChange={(e) => setDamageLevel(parseInt(e.target.value))}
                  className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${damageLevel * 20}%, #e5e7eb ${damageLevel * 20}%, #e5e7eb 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-600 mt-2">
                  <span>0</span>
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>

              <div className={`text-center p-4 rounded-lg border-2 ${getDamageLevelColor(damageLevel)} bg-opacity-20`}>
                <p className="text-xl font-bold text-gray-800">
                  Level {damageLevel}: {getDamageLevelText(damageLevel)}
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={saveDetection}
                disabled={detectionLoading}
                className="flex-1 bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center disabled:bg-gray-400"
              >
                {detectionLoading ? (
                  <>
                    <Loader className="animate-spin w-5 h-5 mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Save Detection
                  </>
                )}
              </button>
              <button
                onClick={() => setDetectionStep('confirm')}
                className="px-6 bg-gray-200 text-gray-700 py-4 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Success Step */}
        {detectionStep === 'success' && (
          <div className="py-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Detection Saved!</h3>
            <p className="text-gray-600">The infestation has been recorded and will appear on the map.</p>
          </div>
        )}
      </div>
    </div>
  </div>
)}

        {/* Resolve Confirmation Modal */}
        {showResolveConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" style={{ zIndex: 10000 }}>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm Resolution</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to mark this infestation as resolved?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={resolveInfestation}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium"
                >
                  Yes, Resolve
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

        {/* Farm and Infestation Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">All Farms</h2>
            <div className="space-y-3">
              {farms.length === 0 ? (
                <p className="text-gray-500">No farms registered yet.</p>
              ) : (
                farms.map(farm => {
                  const status = getFarmStatus(farm.id);
                  const infestationCount = detections.filter(d => d.farm_id === farm.id && d.active !== false).length;
                  return (
                    <div key={farm.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{farm.name}</p>
                          <p className="text-xs text-gray-400">Owner: {farm.user_name}</p>
                          <p className="text-sm text-gray-600">{farm.crop_type} - {farm.size} hectares</p>
                          
                          {/* Only show status if threshold is reached */}
                          {status.showStatus && (
                            <p className={`text-sm font-medium mt-1 ${status.color}`}>
                              {status.text}
                            </p>
                          )}
                          
                          {infestationCount > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {infestationCount} active infestation(s)
                              {!status.showStatus && infestationCount < FARM_STATUS_CONFIG.MINIMUM_THRESHOLD && ' (monitoring)'}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: getFarmHeatmapColor(farm.id) }}
                          ></div>
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
                          <p className="text-xs text-gray-400">Reported by: {detection.user_name || 'Unknown'}</p>
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
                          {(detection.user_name === user.username || user.role === 'admin') && (
                            <button
                              onClick={() => confirmResolveInfestation(detection.id)}
                              className="text-green-600 hover:text-green-800 p-1"
                              title="Mark as resolved"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          )}
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