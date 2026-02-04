import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Marker, useMapEvents } from 'react-leaflet';
import { Filter, MapPin, AlertTriangle, Save, X, CheckCircle, Activity, Camera, Upload, RefreshCw } from 'lucide-react';
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
  MINIMUM_THRESHOLD: 3,
  LOW_THRESHOLD: 3,
  MODERATE_THRESHOLD: 5,
  HIGH_THRESHOLD: 7,
  CRITICAL_THRESHOLD: 10
};

// Severity scale configuration (0-5)
const SEVERITY_SCALE = [
  { value: 0, label: 'Healthy', color: 'bg-green-600', description: 'No pests detected, crops are healthy' },
  { value: 1, label: 'Very Low', color: 'bg-green-400', description: 'Minimal pest presence, no visible damage' },
  { value: 2, label: 'Low', color: 'bg-yellow-400', description: 'Minor pest presence, slight damage visible' },
  { value: 3, label: 'Moderate', color: 'bg-orange-400', description: 'Noticeable pest activity, moderate damage' },
  { value: 4, label: 'High', color: 'bg-red-500', description: 'Significant pest infestation, extensive damage' },
  { value: 5, label: 'Extreme', color: 'bg-red-900', description: 'Severe infestation, crop loss imminent' }
];

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

const getPestName = (detection) => {
  return detection.pest || detection.pest_type || 'Unknown Pest';
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
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [selectedInfestationToResolve, setSelectedInfestationToResolve] = useState(null);
  const [farmForm, setFarmForm] = useState({ name: '', size: '', crop_type: '' });
  
  // New state for detection workflow
  const [detectionStep, setDetectionStep] = useState('select_farm'); // select_farm, upload_image, detecting, review, confirmed
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);
  const [severityLevel, setSeverityLevel] = useState(2); // Default to Low
  const [damageNotes, setDamageNotes] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState(null);
  
  const fileInputRef = useRef(null);
  const center = [15.2047, 120.5947];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchFilteredDetections();
    }
  }, [days]);

  const normalizeDetection = (detection) => {
    const lat = detection.lat || detection.latitude;
    const lng = detection.lng || detection.longitude;
    
    const isLatValid = lat !== null && lat !== undefined && lat !== '' && !isNaN(parseFloat(lat));
    const isLngValid = lng !== null && lng !== undefined && lng !== '' && !isNaN(parseFloat(lng));
    
    if (!isLatValid || !isLngValid) {
      console.warn('Invalid detection coordinates:', {
        detection_id: detection.id,
        pest: detection.pest || detection.pest_type,
        lat,
        lng
      });
      return null;
    }
    
    return {
      ...detection,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      pest: detection.pest || detection.pest_type || 'Unknown Pest',
      pest_type: detection.pest_type || detection.pest || 'Unknown Pest'
    };
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // FIXED: Changed from /detections/heatmap_data/ to /detections/
      // Try /detections/ endpoint instead
      const detectionsRes = await api.get(`/detections/?days=${days}`);
      const farmsRes = await api.get('/farms/');
      
      const detectionsData = Array.isArray(detectionsRes.data) 
        ? detectionsRes.data 
        : (detectionsRes.data.results || []);
      
      const farmsData = Array.isArray(farmsRes.data) 
        ? farmsRes.data 
        : (farmsRes.data.results || []);
      
      const validFarms = farmsData.filter(farm => {
        const hasLat = farm.lat !== null && farm.lat !== undefined && farm.lat !== '';
        const hasLng = farm.lng !== null && farm.lng !== undefined && farm.lng !== '';
        const isLatValid = hasLat && !isNaN(parseFloat(farm.lat));
        const isLngValid = hasLng && !isNaN(parseFloat(farm.lng));
        
        if (!isLatValid || !isLngValid) {
          console.warn('Invalid farm coordinates:', {
            farm_id: farm.id,
            name: farm.name,
            lat: farm.lat,
            lng: farm.lng
          });
          return false;
        }
        return true;
      });
      
      const validDetections = detectionsData
        .map(normalizeDetection)
        .filter(d => d !== null);
      
      console.log('Loaded data:', {
        total_detections: detectionsData.length,
        valid_detections: validDetections.length,
        total_farms: farmsData.length,
        valid_farms: validFarms.length,
        // FIXED: Added debug info for active detections
        active_detections: validDetections.filter(d => d.active === true || d.active === undefined).length,
        inactive_detections: validDetections.filter(d => d.active === false).length
      });
      
      setDetections(validDetections);
      setFarms(validFarms);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      // FIXED: Better error handling - fallback to empty arrays
      setDetections([]);
      setFarms([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredDetections = async () => {
    try {
      // FIXED: Changed from /detections/heatmap_data/ to /detections/
      const response = await api.get(`/detections/?days=${days}`);
      const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
      
      const validDetections = data
        .map(normalizeDetection)
        .filter(d => d !== null);
      
      console.log('Filtered detections:', {
        days,
        total: data.length,
        valid: validDetections.length,
        // FIXED: Added debug info
        active: validDetections.filter(d => d.active === true || d.active === undefined).length
      });
      
      setDetections(validDetections);
    } catch (error) {
      console.error('Error fetching filtered detections:', error);
    }
  };

  // FIXED: Improved active detection filtering
  // Changed from checking d.active !== false to d.active === true || d.active === undefined
  // This ensures that detections without an 'active' field are treated as active by default
  const activeDetections = detections.filter(d => {
    // Consider a detection active if:
    // 1. active field is explicitly true, OR
    // 2. active field is undefined/null (default to active)
    const isActive = d.active === true || d.active === undefined || d.active === null;
    return isActive;
  });

  const getFarmStatus = (farmId) => {
    const farmDetections = detections.filter(d => d.farm_id === farmId && (d.active === true || d.active === undefined || d.active === null));
    const count = farmDetections.length;
    
    if (count < FARM_STATUS_CONFIG.MINIMUM_THRESHOLD) {
      return { 
        showStatus: false, 
        text: 'No Status', 
        color: 'text-gray-500',
        count 
      };
    }
    
    if (count >= FARM_STATUS_CONFIG.CRITICAL_THRESHOLD) {
      return { 
        showStatus: true, 
        text: 'Critical Infestation', 
        color: 'text-red-900 font-bold',
        count 
      };
    }
    if (count >= FARM_STATUS_CONFIG.HIGH_THRESHOLD) {
      return { 
        showStatus: true, 
        text: 'High Infestation', 
        color: 'text-red-600 font-bold',
        count 
      };
    }
    if (count >= FARM_STATUS_CONFIG.MODERATE_THRESHOLD) {
      return { 
        showStatus: true, 
        text: 'Moderate Risk', 
        color: 'text-orange-600 font-semibold',
        count 
      };
    }
    if (count >= FARM_STATUS_CONFIG.LOW_THRESHOLD) {
      return { 
        showStatus: true, 
        text: 'Low Risk', 
        color: 'text-yellow-600',
        count 
      };
    }
    
    return { 
      showStatus: false, 
      text: 'No Status', 
      color: 'text-gray-500',
      count 
    };
  };

  const getFarmHeatmapColor = (farmId) => {
    const status = getFarmStatus(farmId);
    
    if (!status.showStatus) {
      return '#10b981';
    }
    
    if (status.count >= FARM_STATUS_CONFIG.CRITICAL_THRESHOLD) return '#7f1d1d';
    if (status.count >= FARM_STATUS_CONFIG.HIGH_THRESHOLD) return '#dc2626';
    if (status.count >= FARM_STATUS_CONFIG.MODERATE_THRESHOLD) return '#f97316';
    if (status.count >= FARM_STATUS_CONFIG.LOW_THRESHOLD) return '#eab308';
    
    return '#10b981';
  };

  const handleMapClick = (latlng) => {
    if (isAddingFarm) {
      setSelectedLocation(latlng);
      setShowFarmModal(true);
    } else if (isReportingInfestation) {
      setSelectedLocation(latlng);
      setShowInfestationModal(true);
    }
  };

  const handleFarmSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/farms/', {
        ...farmForm,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
      });
      
      const newFarm = response.data;
      
      if (newFarm.lat && newFarm.lng && !isNaN(parseFloat(newFarm.lat)) && !isNaN(parseFloat(newFarm.lng))) {
        setFarms([...farms, newFarm]);
      } else {
        console.warn('New farm created but has invalid coordinates:', newFarm);
      }
      
      setShowFarmModal(false);
      setIsAddingFarm(false);
      setFarmForm({ name: '', size: '', crop_type: '' });
      setSelectedLocation(null);
    } catch (error) {
      console.error('Error adding farm:', error);
      alert('Failed to add farm. Please try again.');
    }
  };

  const startReportInfestation = () => {
    if (farms.length === 0) {
      alert('Please add at least one farm before reporting an infestation.');
      return;
    }
    setDetectionStep('select_farm');
    setShowReviewModal(true);
  };

  const handleFarmSelection = (farm) => {
    setSelectedFarm(farm);
    setDetectionStep('upload_image');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const performDetection = async () => {
    if (!uploadedImage || !selectedFarm) return;
    
    setIsDetecting(true);
    setDetectionError(null);
    setDetectionStep('detecting');
    
    try {
      const formData = new FormData();
      formData.append('image', uploadedImage);
      
      const response = await api.post('/detections/detect/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setDetectionResult(response.data);
      setDetectionStep('review');
    } catch (error) {
      console.error('Detection error:', error);
      setDetectionError(error.response?.data?.error || 'Detection failed. Please try again.');
      setDetectionStep('upload_image');
    } finally {
      setIsDetecting(false);
    }
  };

  const retryDetection = () => {
    setUploadedImage(null);
    setImagePreview(null);
    setDetectionResult(null);
    setDetectionError(null);
    setDetectionStep('upload_image');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const submitReport = async () => {
    if (!detectionResult || !selectedFarm) return;
    
    try {
      const formData = new FormData();
      formData.append('image', uploadedImage);
      formData.append('farm_id', selectedFarm.id);
      formData.append('pest_type', detectionResult.pest_type);
      formData.append('confidence', detectionResult.confidence);
      formData.append('severity_level', severityLevel);
      formData.append('damage_notes', damageNotes);
      formData.append('lat', selectedFarm.lat);
      formData.append('lng', selectedFarm.lng);
      // FIXED: Explicitly set active to true when creating new reports
      formData.append('active', 'true');
      
      const response = await api.post('/detections/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const newDetection = normalizeDetection(response.data);
      if (newDetection) {
        setDetections([...detections, newDetection]);
      }
      
      resetReportWorkflow();
      alert('Infestation report submitted successfully!');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    }
  };

  const resetReportWorkflow = () => {
    setShowReviewModal(false);
    setDetectionStep('select_farm');
    setSelectedFarm(null);
    setUploadedImage(null);
    setImagePreview(null);
    setDetectionResult(null);
    setSeverityLevel(2);
    setDamageNotes('');
    setDetectionError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmResolveInfestation = (infestationId) => {
    setSelectedInfestationToResolve(infestationId);
    setShowResolveConfirm(true);
  };

  const resolveInfestation = async () => {
    if (!selectedInfestationToResolve) return;
    
    try {
      await api.patch(`/detections/${selectedInfestationToResolve}/`, {
        active: false
      });
      
      setDetections(detections.map(d => 
        d.id === selectedInfestationToResolve 
          ? { ...d, active: false }
          : d
      ));
      
      setShowResolveConfirm(false);
      setSelectedInfestationToResolve(null);
    } catch (error) {
      console.error('Error resolving infestation:', error);
      alert('Failed to resolve infestation. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading map data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} onLogout={onLogout} />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Pest Detection Heat Map</h1>
            <p className="text-gray-600 mt-1">
              Showing {activeDetections.length} active infestation{activeDetections.length !== 1 ? 's' : ''} across {farms.length} farm{farms.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>

            <button
              onClick={() => setIsAddingFarm(!isAddingFarm)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center ${
                isAddingFarm
                  ? 'bg-gray-300 text-gray-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <MapPin className="w-4 h-4 mr-2" />
              {isAddingFarm ? 'Cancel' : 'Add Farm'}
            </button>

            <button
              onClick={startReportInfestation}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center"
            >
              <Camera className="w-4 h-4 mr-2" />
              Report Infestation
            </button>
          </div>
        </div>

        {isAddingFarm && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 font-medium">
              <MapPin className="w-4 h-4 inline mr-2" />
              Click on the map to place your farm location
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: '600px' }}>
          <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapClickHandler onMapClick={handleMapClick} isAddingFarm={isAddingFarm} />
            
            {farms.map(farm => {
              const farmDetectionCount = activeDetections.filter(d => d.farm_id === farm.id).length;
              const status = getFarmStatus(farm.id);
              
              return (
                <React.Fragment key={farm.id}>
                  <Circle
                    center={[farm.lat, farm.lng]}
                    radius={500}
                    pathOptions={{
                      fillColor: getFarmHeatmapColor(farm.id),
                      fillOpacity: 0.4,
                      color: getFarmHeatmapColor(farm.id),
                      weight: 2
                    }}
                  />
                  <Marker 
                    position={[farm.lat, farm.lng]} 
                    icon={createLabeledFarmIcon(farm.name, farm.user_name)}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold text-gray-800">{farm.name}</h3>
                        <p className="text-xs text-gray-500">Owner: {farm.user_name}</p>
                        <p className="text-sm text-gray-600">{farm.crop_type}</p>
                        <p className="text-sm text-gray-600">{farm.size} hectares</p>
                        <p className="text-sm font-semibold mt-2">
                          Active Infestations: {farmDetectionCount}
                        </p>
                        {status.showStatus && (
                          <p className={`text-sm font-medium mt-1 ${status.color}`}>
                            Status: {status.text}
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
            
            {activeDetections.map(detection => (
              <Circle
                key={detection.id}
                center={[detection.lat, detection.lng]}
                radius={100}
                pathOptions={{
                  fillColor: detection.severity === 'critical' ? '#7f1d1d' : 
                            detection.severity === 'high' ? '#dc2626' : 
                            detection.severity === 'medium' ? '#f97316' : 
                            '#eab308',
                  fillOpacity: 0.7,
                  color: detection.severity === 'critical' ? '#7f1d1d' : 
                         detection.severity === 'high' ? '#dc2626' : 
                         detection.severity === 'medium' ? '#f97316' : 
                         '#eab308',
                  weight: 2
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-gray-800">{getPestName(detection)}</h3>
                    <p className="text-xs text-gray-500">Reported by: {detection.user_name || 'Unknown'}</p>
                    <p className="text-sm text-gray-600">
                      Severity: <span className={`font-medium ${
                        detection.severity === 'critical' ? 'text-red-900' : 
                        detection.severity === 'high' ? 'text-red-500' : 
                        detection.severity === 'medium' ? 'text-yellow-500' : 
                        'text-green-500'
                      }`}>{detection.severity}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Confidence: {(detection.confidence * 100).toFixed(1)}%
                    </p>
                    {detection.damage_notes && (
                      <p className="text-xs text-gray-600 mt-2">
                        Notes: {detection.damage_notes}
                      </p>
                    )}
                  </div>
                </Popup>
              </Circle>
            ))}
          </MapContainer>
        </div>

        {/* Farm Modal */}
        {showFarmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Farm</h2>
              <form onSubmit={handleFarmSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Farm Name</label>
                  <input
                    type="text"
                    required
                    value={farmForm.name}
                    onChange={(e) => setFarmForm({ ...farmForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Green Valley Farm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size (hectares)</label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    value={farmForm.size}
                    onChange={(e) => setFarmForm({ ...farmForm, size: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., 5.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type</label>
                  <input
                    type="text"
                    required
                    value={farmForm.crop_type}
                    onChange={(e) => setFarmForm({ ...farmForm, crop_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Rice, Corn, Vegetables"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFarmModal(false);
                      setSelectedLocation(null);
                      setFarmForm({ name: '', size: '', crop_type: '' });
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium"
                  >
                    Add Farm
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Report Infestation Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Report Pest Infestation</h2>
                <button
                  onClick={resetReportWorkflow}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Step 1: Select Farm */}
              {detectionStep === 'select_farm' && (
                <div className="space-y-4">
                  <p className="text-gray-600">Select the farm where you detected the pest:</p>
                  <div className="space-y-2">
                    {farms.map(farm => (
                      <button
                        key={farm.id}
                        onClick={() => handleFarmSelection(farm)}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors text-left"
                      >
                        <p className="font-semibold text-gray-800">{farm.name}</p>
                        <p className="text-sm text-gray-600">{farm.crop_type} - {farm.size} hectares</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Upload Image */}
              {detectionStep === 'upload_image' && (
                <div className="space-y-4">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Selected Farm:</strong> {selectedFarm?.name}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Pest Image
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors flex flex-col items-center"
                    >
                      <Upload className="w-12 h-12 text-gray-400 mb-2" />
                      <span className="text-gray-600">Click to upload image</span>
                    </button>
                  </div>

                  {imagePreview && (
                    <div className="space-y-4">
                      <div className="border rounded-lg overflow-hidden">
                        <img src={imagePreview} alt="Uploaded" className="w-full h-64 object-contain bg-gray-50" />
                      </div>
                      
                      {detectionError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <p className="text-red-800 text-sm">{detectionError}</p>
                        </div>
                      )}

                      <div className="flex space-x-3">
                        <button
                          onClick={retryDetection}
                          className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
                        >
                          Change Image
                        </button>
                        <button
                          onClick={performDetection}
                          disabled={isDetecting}
                          className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 font-medium flex items-center justify-center disabled:opacity-50"
                        >
                          {isDetecting ? (
                            <>
                              <Activity className="w-4 h-4 mr-2 animate-spin" />
                              Detecting...
                            </>
                          ) : (
                            <>
                              <Camera className="w-4 h-4 mr-2" />
                              Detect Pest
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Detecting */}
              {detectionStep === 'detecting' && (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 text-red-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">Analyzing image for pests...</p>
                  <p className="text-gray-500 text-sm mt-2">This may take a few moments</p>
                </div>
              )}

              {/* Step 4: Review and Submit */}
              {detectionStep === 'review' && detectionResult && (
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-2">Detection Results</h3>
                    <p className="text-sm text-green-700">
                      <strong>Pest Type:</strong> {detectionResult.pest_type}
                    </p>
                    <p className="text-sm text-green-700">
                      <strong>Confidence:</strong> {(detectionResult.confidence * 100).toFixed(1)}%
                    </p>
                  </div>

                  {imagePreview && (
                    <div className="border rounded-lg overflow-hidden">
                      <img src={imagePreview} alt="Detection" className="w-full h-48 object-contain bg-gray-50" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Severity Level <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {SEVERITY_SCALE.map(scale => (
                        <button
                          key={scale.value}
                          onClick={() => setSeverityLevel(scale.value)}
                          className={`w-full p-3 border-2 rounded-lg transition-all ${
                            severityLevel === scale.value
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-200 hover:border-red-300'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className={`w-12 h-12 rounded-lg ${scale.color} flex items-center justify-center text-white font-bold mr-3`}>
                              {scale.value}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{scale.label}</p>
                              <p className="text-xs text-gray-600">{scale.description}</p>
                            </div>
                            {severityLevel === scale.value && (
                              <CheckCircle className="w-6 h-6 text-red-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={damageNotes}
                      onChange={(e) => setDamageNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      rows="3"
                      placeholder="Describe damage extent, affected area, or other observations..."
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={retryDetection}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium flex items-center justify-center"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry Detection
                    </button>
                    <button
                      onClick={submitReport}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 font-medium flex items-center justify-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm & Submit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resolve Confirmation Modal */}
        {showResolveConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
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
                  // FIXED: Updated to use the new active detection filtering
                  const infestationCount = detections.filter(d => 
                    d.farm_id === farm.id && (d.active === true || d.active === undefined || d.active === null)
                  ).length;
                  return (
                    <div key={farm.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{farm.name}</p>
                          <p className="text-xs text-gray-400">Owner: {farm.user_name}</p>
                          <p className="text-sm text-gray-600">{farm.crop_type} - {farm.size} hectares</p>
                          
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
                          <p className="font-semibold text-gray-800">{getPestName(detection)}</p>
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
                          {(detection.user_name === user?.username || user?.role === 'admin') && (
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