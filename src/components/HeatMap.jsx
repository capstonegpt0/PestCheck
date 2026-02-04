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
      
      const detectionsRes = await api.get(`/detections/heatmap_data/?days=${days}`);
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
        
        if (!hasLat || !hasLng || !isLatValid || !isLngValid) {
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
      
      setFarms(validFarms);
      setDetections(validDetections);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load map data: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredDetections = async () => {
    try {
      const response = await api.get(`/detections/heatmap_data/?days=${days}`);
      const detectionsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || []);
      
      const validDetections = detectionsData
        .map(normalizeDetection)
        .filter(d => d !== null);
      
      setDetections(validDetections);
    } catch (error) {
      console.error('Error fetching filtered detections:', error);
    }
  };

  // Start manual infestation report
  const startInfestationReport = () => {
    setIsReportingInfestation(true);
    setDetectionStep('select_farm');
    setSelectedFarm(null);
    setUploadedImage(null);
    setImagePreview(null);
    setDetectionResult(null);
    setSeverityLevel(2);
    setDamageNotes('');
    setDetectionError(null);
    setShowInfestationModal(true);
  };

  // Handle farm selection
  const handleFarmSelection = (farmId) => {
    const farm = farms.find(f => f.id === parseInt(farmId));
    setSelectedFarm(farm);
    setDetectionStep('upload_image');
  };

  // Handle image upload
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

  // Trigger detection with YOLOv5
  const detectPest = async () => {
    if (!uploadedImage || !selectedFarm) {
      alert('Please select a farm and upload an image first');
      return;
    }

    setIsDetecting(true);
    setDetectionError(null);
    setDetectionStep('detecting');

    try {
      const formData = new FormData();
      formData.append('image', uploadedImage);
      formData.append('crop_type', selectedFarm.crop_type || 'rice');

      console.log('🔍 Calling detection preview API...');
      
      const response = await api.post('/detections/preview/', formData);
      
      console.log('✅ Detection result:', response.data);
      setDetectionResult(response.data);
      setDetectionStep('review');
      
    } catch (error) {
      console.error('❌ Detection error:', error);
      const errorMsg = error.response?.data?.error || error.message;
      setDetectionError(errorMsg);
      setDetectionStep('upload_image');
      
      if (error.response?.data?.retry) {
        alert(`Detection failed: ${errorMsg}\n\nPlease try again with a clearer image or wait a moment if the service is starting up.`);
      } else {
        alert(`Detection failed: ${errorMsg}`);
      }
    } finally {
      setIsDetecting(false);
    }
  };

  // Map severity 0-5 to backend severity levels
  const mapSeverityToBackend = (level) => {
    if (level === 0) return 'low';
    if (level === 1) return 'low';
    if (level === 2) return 'low';
    if (level === 3) return 'medium';
    if (level === 4) return 'high';
    if (level === 5) return 'critical';
    return 'medium';
  };

  // Submit confirmed report
  const submitReport = async () => {
    if (!detectionResult || !selectedFarm || !uploadedImage) {
      alert('Missing required data. Please start over.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', uploadedImage);
      formData.append('crop_type', selectedFarm.crop_type || 'rice');
      formData.append('pest_name', detectionResult.pest_name);
      formData.append('pest_type', detectionResult.pest_name);
      formData.append('confidence', detectionResult.confidence.toString());
      formData.append('severity', mapSeverityToBackend(severityLevel));
      formData.append('latitude', selectedFarm.lat.toString());
      formData.append('longitude', selectedFarm.lng.toString());
      formData.append('farm_id', selectedFarm.id.toString());
      formData.append('address', 'Magalang, Pampanga');
      formData.append('description', damageNotes || `Severity level ${severityLevel}/5. ${SEVERITY_SCALE[severityLevel].description}`);
      formData.append('active', 'true');

      console.log('📤 Submitting confirmed detection...');
      
      const response = await api.post('/detections/', formData);
      
      console.log('✅ Detection saved:', response.data);
      
      alert('Pest infestation report submitted successfully!');
      resetInfestationForm();
      fetchInitialData();
      
    } catch (error) {
      console.error('❌ Submit error:', error);
      alert('Failed to submit report: ' + (error.response?.data?.error || error.message));
    }
  };

  // Reset and close modal
  const resetInfestationForm = () => {
    setIsReportingInfestation(false);
    setShowInfestationModal(false);
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

  // Retry detection with new image
  const retryDetection = () => {
    setDetectionStep('upload_image');
    setUploadedImage(null);
    setImagePreview(null);
    setDetectionResult(null);
    setDetectionError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const saveFarm = async () => {
    if (!farmForm.name || !farmForm.size || !farmForm.crop_type || !selectedLocation) {
      alert('Please fill in all fields and select a location on the map');
      return;
    }
    
    try {
      const requestData = {
        name: farmForm.name,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        size: parseFloat(farmForm.size),
        crop_type: farmForm.crop_type,
        description: `Farm registered on ${new Date().toLocaleDateString()}`
      };
      
      await api.post('/farm-requests/', requestData);
      
      alert('Farm registration request submitted! Admin will review your request.');
      resetFarmForm();
      fetchInitialData();
    } catch (error) {
      console.error('Error submitting farm request:', error);
      alert('Failed to submit farm request: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resetFarmForm = () => {
    setFarmForm({ name: '', size: '', crop_type: '' });
    setSelectedLocation(null);
    setIsAddingFarm(false);
    setShowFarmModal(false);
  };

  const handleMapClick = (latlng) => {
    setSelectedLocation(latlng);
  };

  const confirmResolveInfestation = (detectionId) => {
    setSelectedInfestationToResolve(detectionId);
    setShowResolveConfirm(true);
  };

  const resolveInfestation = async () => {
    if (!selectedInfestationToResolve) return;
    
    try {
      await api.patch(`/detections/${selectedInfestationToResolve}/`, {
        active: false,
        status: 'resolved'
      });
      
      alert('Infestation marked as resolved');
      setShowResolveConfirm(false);
      setSelectedInfestationToResolve(null);
      fetchInitialData();
    } catch (error) {
      console.error('Error resolving infestation:', error);
      alert('Failed to resolve infestation: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getFarmHeatmapColor = (farmId) => {
    const farmDetections = detections.filter(d => d.farm_id === farmId && d.active !== false);
    const count = farmDetections.length;
    
    if (count === 0) return '#10b981';
    if (count < FARM_STATUS_CONFIG.LOW_THRESHOLD) return '#fbbf24';
    if (count < FARM_STATUS_CONFIG.MODERATE_THRESHOLD) return '#f97316';
    if (count < FARM_STATUS_CONFIG.HIGH_THRESHOLD) return '#ef4444';
    if (count < FARM_STATUS_CONFIG.CRITICAL_THRESHOLD) return '#dc2626';
    return '#7f1d1d';
  };

  const getFarmStatus = (farmId) => {
    const farmDetections = detections.filter(d => d.farm_id === farmId && d.active !== false);
    const count = farmDetections.length;
    
    if (count < FARM_STATUS_CONFIG.MINIMUM_THRESHOLD) {
      return { 
        text: 'Monitoring', 
        color: 'text-gray-600',
        showStatus: false
      };
    }
    
    if (count >= FARM_STATUS_CONFIG.CRITICAL_THRESHOLD) {
      return { text: 'Critical Risk', color: 'text-red-900', showStatus: true };
    }
    if (count >= FARM_STATUS_CONFIG.HIGH_THRESHOLD) {
      return { text: 'High Risk', color: 'text-red-600', showStatus: true };
    }
    if (count >= FARM_STATUS_CONFIG.MODERATE_THRESHOLD) {
      return { text: 'Moderate Risk', color: 'text-orange-500', showStatus: true };
    }
    if (count >= FARM_STATUS_CONFIG.LOW_THRESHOLD) {
      return { text: 'Low Risk', color: 'text-yellow-600', showStatus: true };
    }
    
    return { 
      text: 'Monitoring', 
      color: 'text-gray-600',
      showStatus: false 
    };
  };

  const activeDetections = detections.filter(d => d.active !== false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Loading map data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Pest Infestation Heat Map</h1>
          
          <div className="flex space-x-3">
            <button
              onClick={startInfestationReport}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium flex items-center"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Report Infestation
            </button>
            
            <button
              onClick={() => {
                setIsAddingFarm(true);
                setShowFarmModal(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium flex items-center"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Register Farm
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <label className="text-sm font-medium text-gray-700">Filter by time period:</label>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '600px' }}>
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            
            <MapClickHandler onMapClick={handleMapClick} isAddingFarm={isAddingFarm} />
            
            {farms.map(farm => (
              <Marker
                key={`farm-${farm.id}`}
                position={[farm.lat, farm.lng]}
                icon={createLabeledFarmIcon(farm.name, farm.user_name || 'Unknown')}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-lg">{farm.name}</h3>
                    <p className="text-sm text-gray-600">Owner: {farm.user_name}</p>
                    <p className="text-sm">Crop: {farm.crop_type}</p>
                    <p className="text-sm">Size: {farm.size} hectares</p>
                    {getFarmStatus(farm.id).showStatus && (
                      <p className={`text-sm font-semibold mt-2 ${getFarmStatus(farm.id).color}`}>
                        {getFarmStatus(farm.id).text}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
            
            {activeDetections.map(detection => (
              <Circle
                key={`detection-${detection.id}`}
                center={[detection.latitude, detection.longitude]}
                radius={
                  detection.severity === 'critical' ? 200 :
                  detection.severity === 'high' ? 150 :
                  detection.severity === 'medium' ? 100 :
                  75
                }
                pathOptions={{
                  fillColor: 
                    detection.severity === 'critical' ? '#7f1d1d' :
                    detection.severity === 'high' ? '#dc2626' :
                    detection.severity === 'medium' ? '#f97316' :
                    '#fbbf24',
                  fillOpacity: 0.4,
                  color: 
                    detection.severity === 'critical' ? '#7f1d1d' :
                    detection.severity === 'high' ? '#dc2626' :
                    detection.severity === 'medium' ? '#f97316' :
                    '#fbbf24',
                  weight: 2
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold">{getPestName(detection)}</h3>
                    <p className="text-sm">Severity: {detection.severity}</p>
                    {detection.description && (
                      <p className="text-sm mt-1">{detection.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Reported by: {detection.user_name || 'Unknown'}
                    </p>
                  </div>
                </Popup>
              </Circle>
            ))}
            
            {selectedLocation && (
              <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
            )}
          </MapContainer>
        </div>

        {/* Farm Registration Modal */}
        {showFarmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Register New Farm</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Farm Name</label>
                  <input
                    type="text"
                    value={farmForm.name}
                    onChange={(e) => setFarmForm({...farmForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter farm name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size (hectares)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={farmForm.size}
                    onChange={(e) => setFarmForm({...farmForm, size: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter size"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type</label>
                  <select
                    value={farmForm.crop_type}
                    onChange={(e) => setFarmForm({...farmForm, crop_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select crop type</option>
                    <option value="rice">Rice</option>
                    <option value="corn">Corn</option>
                  </select>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm text-blue-800">
                    {selectedLocation 
                      ? `Selected: ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}` 
                      : 'Click on the map to select farm location'}
                  </p>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={saveFarm}
                    disabled={!selectedLocation}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
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

        {/* Infestation Report Modal - Multi-step */}
        {showInfestationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Report Pest Infestation</h2>
              
              {/* Step 1: Select Farm */}
              {detectionStep === 'select_farm' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      1. Select Farm Location
                    </label>
                    <select
                      value={selectedFarm?.id || ''}
                      onChange={(e) => handleFarmSelection(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">Choose a farm...</option>
                      {farms.map(farm => (
                        <option key={farm.id} value={farm.id}>
                          {farm.name} - {farm.crop_type} ({farm.size} ha)
                        </option>
                      ))}
                    </select>
                  </div>
                  {farms.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        No farms registered yet. Please register a farm first using the "Register Farm" button.
                      </p>
                    </div>
                  )}
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={resetInfestationForm}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Upload Image */}
              {detectionStep === 'upload_image' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Selected Farm:</strong> {selectedFarm?.name} ({selectedFarm?.crop_type})
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      2. Upload Photo of Affected Crop
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    
                    {!imagePreview ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Camera className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-600 mb-2">Click to upload or take a photo</p>
                        <p className="text-sm text-gray-500">Support for JPG, PNG</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <img 
                          src={imagePreview} 
                          alt="Uploaded crop" 
                          className="w-full h-64 object-contain bg-gray-100 rounded-lg"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium flex items-center justify-center"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Change Image
                        </button>
                      </div>
                    )}
                  </div>

                  {detectionError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800">{detectionError}</p>
                    </div>
                  )}

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => {
                        setDetectionStep('select_farm');
                        setUploadedImage(null);
                        setImagePreview(null);
                      }}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
                    >
                      Back
                    </button>
                    <button
                      onClick={detectPest}
                      disabled={!uploadedImage}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Detect Pest
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Detecting (Loading) */}
              {detectionStep === 'detecting' && (
                <div className="space-y-4 text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
                  <p className="text-lg font-medium text-gray-800">Analyzing image with AI...</p>
                  <p className="text-sm text-gray-600">This may take a few moments</p>
                </div>
              )}

              {/* Step 4: Review Detection */}
              {detectionStep === 'review' && detectionResult && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-bold text-green-800 mb-2">✓ Pest Detected</h3>
                    <p className="text-sm text-green-700">
                      <strong>Pest:</strong> {detectionResult.pest_name}
                    </p>
                    <p className="text-sm text-green-700">
                      <strong>Confidence:</strong> {(detectionResult.confidence * 100).toFixed(1)}%
                    </p>
                    {detectionResult.scientific_name && (
                      <p className="text-sm text-green-700">
                        <strong>Scientific Name:</strong> {detectionResult.scientific_name}
                      </p>
                    )}
                  </div>

                  <div className="border-2 border-gray-200 rounded-lg p-4">
                    <img 
                      src={imagePreview} 
                      alt="Detected pest" 
                      className="w-full h-48 object-contain bg-gray-100 rounded-lg mb-3"
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-yellow-800 mb-2">
                      Is this pest identification correct?
                    </p>
                    <p className="text-xs text-yellow-700">
                      If incorrect, you can retry with a different photo
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      3. Damage Assessment (Severity: {severityLevel}/5)
                    </label>
                    
                    {/* Visual Severity Scale */}
                    <div className="space-y-2 mb-4">
                      {SEVERITY_SCALE.map((scale) => (
                        <button
                          key={scale.value}
                          onClick={() => setSeverityLevel(scale.value)}
                          className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                            severityLevel === scale.value
                              ? 'border-red-600 bg-red-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-12 h-12 ${scale.color} rounded-lg flex items-center justify-center text-white font-bold text-xl`}>
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
                  const infestationCount = detections.filter(d => d.farm_id === farm.id && d.active !== false).length;
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