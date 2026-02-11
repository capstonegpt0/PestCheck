import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Marker, useMapEvents } from 'react-leaflet';
import { Filter, MapPin, AlertTriangle, Save, X, CheckCircle, Activity, Camera, Upload, Loader, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';
import Navigation from './Navigation';
import AlertNotifications from './AlertNotifications';
import api from '../utils/api';
import L from 'leaflet';
import { PEST_REFERENCE_DATA, getPestById } from '../utils/pestReferenceData';

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
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [selectedInfestationToResolve, setSelectedInfestationToResolve] = useState(null);
  const [farmForm, setFarmForm] = useState({ name: '', size: '', crop_type: '' });

  // Detection workflow states
  const [showDetectionModal, setShowDetectionModal] = useState(false);
  const [detectionStep, setDetectionStep] = useState('upload');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);
  const [detectionLoading, setDetectionLoading] = useState(false);
  const [detectionError, setDetectionError] = useState(null);
  const [damageLevel, setDamageLevel] = useState(2);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [locationChoice, setLocationChoice] = useState('farm'); // 'farm' or 'current'
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const center = [15.2047, 120.5947];

  // Group detections by farm AND pest type - same pest merges, different pests offset
  const getGroupedAndOffsetDetections = (detections) => {
    const farmPestGroups = {};
    const standalone = [];

    // First, group by farm_id and pest type
    detections.forEach(detection => {
      if (detection.farm_id) {
        const farmId = detection.farm_id;
        const pestType = detection.pest || detection.pest_name || 'unknown';
        const groupKey = `${farmId}_${pestType}`;

        if (!farmPestGroups[groupKey]) {
          farmPestGroups[groupKey] = {
            farm_id: farmId,
            pest: pestType,
            detections: [],
            displayDetection: detection // Use first detection for display
          };
        }
        farmPestGroups[groupKey].detections.push(detection);
      } else {
        // No farm - show individual
        standalone.push({
          isGroup: false,
          detection: detection,
          position: {
            lat: parseFloat(detection.lat || detection.latitude),
            lng: parseFloat(detection.lng || detection.longitude)
          }
        });
      }
    });

    // Convert to array and calculate positions
    const farmGroups = Object.values(farmPestGroups);
    
    // Group by farm to calculate offsets
    const farmPestsByFarm = {};
    farmGroups.forEach(group => {
      if (!farmPestsByFarm[group.farm_id]) {
        farmPestsByFarm[group.farm_id] = [];
      }
      farmPestsByFarm[group.farm_id].push(group);
    });

    // Calculate offset positions for each pest type on the same farm
    const result = [];
    
    Object.keys(farmPestsByFarm).forEach(farmId => {
      const pestGroups = farmPestsByFarm[farmId];
      const totalPests = pestGroups.length;

      pestGroups.forEach((group, index) => {
        const baseDetection = group.displayDetection;
        let position;

        if (totalPests === 1) {
          // Only one pest type on this farm - no offset
          position = {
            lat: parseFloat(baseDetection.lat || baseDetection.latitude),
            lng: parseFloat(baseDetection.lng || baseDetection.longitude)
          };
        } else {
          // Multiple pest types - offset in circle pattern
          const baseOffsetMeters = 80;
          const offsetDistance = baseOffsetMeters / 111320; // Convert to degrees
          
          const angle = (index / totalPests) * 2 * Math.PI;
          const offsetLat = Math.cos(angle) * offsetDistance;
          const offsetLng = Math.sin(angle) * offsetDistance;

          position = {
            lat: parseFloat(baseDetection.lat || baseDetection.latitude) + offsetLat,
            lng: parseFloat(baseDetection.lng || baseDetection.longitude) + offsetLng
          };
        }

        result.push({
          isGroup: group.detections.length > 1,
          detection: baseDetection,
          allDetections: group.detections,
          count: group.detections.length,
          position: position,
          farm_id: group.farm_id,
          pest: group.pest
        });
      });
    });

    return [...result, ...standalone];
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchFilteredDetections();
    }
  }, [days]);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setLocationLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocation({
            latitude: 15.2047,
            longitude: 120.5947
          });
          setLocationLoading(false);
        }
      );
    } else {
      setLocation({
        latitude: 15.2047,
        longitude: 120.5947
      });
      setLocationLoading(false);
    }
  }, []);

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
      
      console.log(`Ã¢Å“â€¦ Loaded ${validFarms.length} valid farms out of ${farmsData.length}`);
      console.log(`Ã¢Å“â€¦ Loaded ${validDetections.length} valid detections out of ${detectionsData.length}`);
      
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
      console.warn('No infestation selected');
      return;
    }

    try {
      console.log(`Attempting to resolve infestation ID: ${selectedInfestationToResolve}`);
      
      const detectionToResolve = detections.find(d => d.id === selectedInfestationToResolve);
      
      if (!detectionToResolve) {
        console.error('Detection not found in local state');
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
      
    } catch (error) {
      console.error('Error resolving infestation:', error);
    }
  };

  // Detection workflow functions
  const startDetection = () => {
    setShowDetectionModal(true);
    setDetectionStep('upload');
    setSelectedImage(null);
    setImagePreview(null);
    setDetectionResult(null);
    setDetectionError(null);
    setDamageLevel(2);
    setSelectedFarm(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setDetectionError(null);
    }
  };

  const handleCameraClick = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const runDetection = async () => {
    if (!selectedImage || !location) {
      alert('Please select an image and ensure location is available');
      return;
    }

    setDetectionLoading(true);
    setDetectionStep('detecting');
    setDetectionError(null);

    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('crop_type', 'rice'); // Backend will determine actual crop from detected pest
    formData.append('severity', 'low');
    formData.append('latitude', location.latitude);
    formData.append('longitude', location.longitude);
    formData.append('address', 'Detected Location');
    formData.append('confirmed', 'false'); // Mark as unconfirmed initially
    formData.append('active', 'false'); // Don't count as active until confirmed

    try {
      const response = await api.post('/detections/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201 && response.data) {
        const pestName = response.data.pest_name || response.data.pest;
        
        if (pestName && pestName !== 'Unknown Pest' && pestName !== '') {
          // Store the result with ID so we can update or delete it
          setDetectionResult(response.data);
          setDetectionStep('confirm');
        } else {
          setDetectionError('No pest detected in the image. Please try another image with clearer pest visibility.');
          setDetectionStep('upload');
        }
      } else {
        setDetectionError('Unexpected response from server. Please try again.');
        setDetectionStep('upload');
      }
    } catch (error) {
      console.error('Detection error:', error);
      
      if (error.response?.status === 400) {
        setDetectionError(error.response.data?.error || 'No pest detected. Please try another image.');
      } else if (error.response?.status === 503) {
        setDetectionError('ML service is warming up. Please wait 30 seconds and try again.');
      } else {
        setDetectionError('Detection failed. Please try again.');
      }
      setDetectionStep('upload');
    } finally {
      setDetectionLoading(false);
    }
  };

  const confirmDetection = async (isCorrect) => {
    if (isCorrect) {
      setDetectionStep('assessment');
    } else {
      // User rejected the detection - delete the unconfirmed record
      if (detectionResult && detectionResult.id) {
        try {
          await api.delete(`/detections/${detectionResult.id}/`);
          console.log(`Deleted rejected detection ID: ${detectionResult.id}`);
        } catch (error) {
          console.error('Error deleting rejected detection:', error);
        }
      }
      setDetectionError('Please try another image with a clearer view of the pest.');
      setDetectionStep('upload');
      setDetectionResult(null);
    }
  };

  const saveDetection = async () => {
    if (!detectionResult) {
      alert('Detection result is missing.');
      return;
    }

    // Only require farm selection if using farm location
    if (locationChoice === 'farm' && !selectedFarm) {
      alert('Please select a farm before saving the detection.');
      return;
    }

    try {
      setDetectionLoading(true);

      const severityMap = {
        0: 'low',
        1: 'low',
        2: 'medium',
        3: 'medium',
        4: 'high',
        5: 'critical'
      };

      const severity = severityMap[damageLevel] || 'medium';

      // Find the selected farm - use loose comparison for id type mismatch
      const farm = farms.find(f => Number(f.id) === Number(selectedFarm));
      
      console.log('ðŸ“ saveDetection debug:', {
        locationChoice,
        selectedFarm,
        selectedFarmType: typeof selectedFarm,
        farmFound: !!farm,
        farmName: farm?.name,
        farmLat: farm?.lat,
        farmLng: farm?.lng,
        farmLatType: typeof farm?.lat,
        currentLocation: location,
        allFarmIds: farms.map(f => ({ id: f.id, type: typeof f.id })),
      });

      const updateData = {
        severity: severity,
        active: true,
        confirmed: true
      };

      // Only add farm_id if using farm location
      if (locationChoice === 'farm' && selectedFarm) {
        updateData.farm_id = selectedFarm;
      }

      if (locationChoice === 'farm') {
        if (farm && farm.lat != null && farm.lng != null) {
          updateData.latitude = parseFloat(farm.lat);
          updateData.longitude = parseFloat(farm.lng);
          console.log('ðŸ“ Using FARM coordinates:', updateData.latitude, updateData.longitude);
        } else {
          console.warn('âš ï¸ Farm location chosen but farm coords missing!', { farm });
          // Fallback: try to get coords from the farm object with other field names
          if (farm && farm.latitude != null && farm.longitude != null) {
            updateData.latitude = parseFloat(farm.latitude);
            updateData.longitude = parseFloat(farm.longitude);
            console.log('ðŸ“ Using FARM coordinates (latitude/longitude fields):', updateData.latitude, updateData.longitude);
          }
        }
      } else if (locationChoice === 'current' && location) {
        updateData.latitude = location.latitude;
        updateData.longitude = location.longitude;
        console.log('ðŸ“ Using CURRENT coordinates:', updateData.latitude, updateData.longitude);
      }

      console.log('ðŸ“ Final PATCH data:', JSON.stringify(updateData));

      // Update the existing detection record to confirm it
      const response = await api.patch(`/detections/${detectionResult.id}/`, updateData);
      console.log('ðŸ“ PATCH response:', response.data);

      setDetectionStep('success');
      
      setTimeout(() => {
        fetchFilteredDetections();
        closeDetectionModal();
      }, 1500);
    } catch (error) {
      console.error('Error saving detection:', error);
      console.error('Error response:', error.response?.data);
      alert('Failed to save detection. Please try again.');
    } finally {
      setDetectionLoading(false);
    }
  };

  const closeDetectionModal = async () => {
    // If there's an unconfirmed detection, delete it
    if (detectionResult && detectionResult.id && detectionStep !== 'success') {
      try {
        await api.delete(`/detections/${detectionResult.id}/`);
        console.log(`Deleted unconfirmed detection on modal close ID: ${detectionResult.id}`);
      } catch (error) {
        console.error('Error deleting unconfirmed detection on close:', error);
      }
    }
    
    setShowDetectionModal(false);
    setDetectionStep('upload');
    setSelectedImage(null);
    setImagePreview(null);
    setDetectionResult(null);
    setDetectionError(null);
    setDamageLevel(2);
    setSelectedFarm(null);
    setLocationChoice('farm');
  };

  const getDamageLevelText = (level) => {
    const labels = {
      0: 'Healthy - No damage',
      1: 'Minimal - Very light damage',
      2: 'Low - Minor damage',
      3: 'Moderate - Noticeable damage',
      4: 'High - Significant damage',
      5: 'Critical - Severe damage'
    };
    return labels[level] || 'Medium';
  };

  const getDamageLevelColor = (level) => {
    if (level === 0) return 'bg-green-500';
    if (level === 1) return 'bg-green-400';
    if (level === 2) return 'bg-yellow-400';
    if (level === 3) return 'bg-orange-400';
    if (level === 4) return 'bg-red-500';
    if (level === 5) return 'bg-red-900';
    return 'bg-yellow-400';
  };

  const resetFarmForm = () => {
    setFarmForm({ name: '', size: '', crop_type: '' });
    setSelectedLocation(null);
    setShowFarmModal(false);
  };

  const activeDetections = detections.filter(d => d.active !== false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} onLogout={onLogout} />
      
      {/* âœ… NEW: Proximity Alert Notifications */}
      <AlertNotifications user={user} />
      
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
            onClick={startDetection}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Camera className="w-5 h-5 mr-2" />
            Detect Pest
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

        {/* Map */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6" style={{ height: '500px', position: 'relative', zIndex: 1 }}>
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
                    console.error('Ã¢ÂÅ’ Filtering out invalid farm before render:', {
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
                    console.error('Ã¢ÂÅ’ Skipping farm with invalid coords in map:', farm);
                    return null;
                  }
                  
                  return (
                    <Marker
                      key={farm.id}
                      position={[lat, lng]}
                      icon={createLabeledFarmIcon(farm.name || 'Unknown Farm', farm.user_name || 'Unknown')}
                    >
                      <Popup maxWidth={350} maxHeight={400}>
                        <div className="p-2">
                          <h3 className="font-bold text-lg border-b pb-2 mb-2">{farm.name}</h3>
                          <p className="text-sm text-gray-600">Owner: {farm.user_name}</p>
                          <p className="text-sm">{farm.crop_type} - {farm.size} hectares</p>
                          
                          {(() => {
                            const farmInfestations = detections.filter(d => d.farm_id === farm.id && d.active !== false);
                            return (
                              <div className="mt-3">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="font-semibold text-sm">
                                    Active Infestations: {farmInfestations.length}
                                  </p>
                                </div>
                                {farmInfestations.length > 0 ? (
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {farmInfestations.map((infestation, idx) => (
                                      <div key={infestation.id} className="bg-gray-50 border border-gray-200 rounded p-2">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <p className="font-medium text-sm">{idx + 1}. {infestation.pest}</p>
                                            <p className="text-xs text-gray-600">
                                              Severity: <span className={`font-medium ${
                                                infestation.severity === 'critical' ? 'text-red-900' : 
                                                infestation.severity === 'high' ? 'text-red-500' : 
                                                infestation.severity === 'medium' ? 'text-yellow-500' : 
                                                'text-green-500'
                                              }`}>{infestation.severity}</span>
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              Reported: {new Date(infestation.detected_at || infestation.reported_at).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              By: {infestation.user_name || 'Unknown'}
                                            </p>
                                          </div>
                                          <div 
                                            className="w-3 h-3 rounded-full ml-2 mt-1 flex-shrink-0"
                                            style={{
                                              backgroundColor: infestation.severity === 'critical' ? '#7f1d1d' :
                                                             infestation.severity === 'high' ? '#ef4444' :
                                                             infestation.severity === 'medium' ? '#f97316' : '#fbbf24'
                                            }}
                                          ></div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-500 italic">No active infestations</p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })
                .filter(marker => marker !== null)
              }

              {/* Detection Circles - Grouped by Farm and Pest Type */}
              {(() => {
                // Get grouped detections
                const validDetections = activeDetections.filter(detection => {
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
                    console.error('Ã¢ÂÅ’ Filtering out invalid detection before render:', {
                      id: detection.id,
                      pest: detection.pest,
                      lat,
                      lng
                    });
                    return false;
                  }
                  return true;
                });

                const groupedDetections = getGroupedAndOffsetDetections(validDetections);

                return groupedDetections.map((item, index) => {
                  const { position, detection, isGroup, count, allDetections } = item;
                  
                  // Double safety check
                  if (isNaN(position.lat) || isNaN(position.lng) || !isFinite(position.lat) || !isFinite(position.lng)) {
                    console.error('Ã¢ÂÅ’ Skipping detection with invalid coords in map:', detection);
                    return null;
                  }
                  
                  // Determine severity for display
                  let displaySeverity = detection.severity;
                  if (isGroup && allDetections && allDetections.length > 0) {
                    // Use highest severity from all grouped detections
                    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
                    displaySeverity = allDetections.reduce((highest, d) => {
                      const currentLevel = severityOrder[d.severity] || 0;
                      const highestLevel = severityOrder[highest] || 0;
                      return currentLevel > highestLevel ? d.severity : highest;
                    }, 'low');
                  }
                  
                  const radius = displaySeverity === 'critical' ? 300 :
                              displaySeverity === 'high' ? 200 :
                              displaySeverity === 'medium' ? 150 : 100;
                
                  const color = displaySeverity === 'critical' ? '#7f1d1d' :
                             displaySeverity === 'high' ? '#ef4444' :
                             displaySeverity === 'medium' ? '#f97316' : '#fbbf24';

                  // ✅ NEW: Check if user is verified
                  const isVerified = detection.user_verified !== false; // Default to true if not specified
                  
                  // VERIFIED users: Large hollow circles with border (size varies by severity)
                  // UNVERIFIED users: VERY SMALL solid dot (10px - same for all severities)
                  const adjustedRadius = isVerified ? radius : 10; // VERY SMALL 10px dot for unverified
                  const fillOpacity = isVerified ? 0.3 : 1; // Completely solid for unverified dots
                  const borderColor = isVerified ? color : color; // Same color for unverified
                  const borderWeight = isVerified ? 2 : 0; // No border for unverified dots

                  return (
                    <Circle
                      key={`detection-group-${index}-${detection.id}`}
                      center={[position.lat, position.lng]}
                      radius={adjustedRadius}
                      pathOptions={{
                        fillColor: color,
                        fillOpacity: fillOpacity,
                        color: borderColor,
                        weight: borderWeight,
                        opacity: isVerified ? 1 : 0.95 // Slightly transparent border for dots
                      }}
                    >
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-bold text-lg">{detection.pest}</h3>
                          
                          {isGroup && count > 1 ? (
                            <>
                              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold inline-block mb-2">
                                {count} Reports Merged
                              </div>
                              <p className="text-sm font-medium">Highest Severity: {displaySeverity}</p>
                              
                              <div className="mt-2 border-t pt-2">
                                <p className="text-xs font-semibold text-gray-700 mb-1">All Reports:</p>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                  {allDetections.map((det, idx) => (
                                    <div key={det.id} className="text-xs bg-gray-50 p-1 rounded">
                                      <span className="font-medium">#{idx + 1}</span> - 
                                      Severity: <span className={`font-medium ${
                                        det.severity === 'critical' ? 'text-red-900' : 
                                        det.severity === 'high' ? 'text-red-500' : 
                                        det.severity === 'medium' ? 'text-yellow-600' : 
                                        'text-green-600'
                                      }`}>{det.severity}</span>
                                      <br/>
                                      <span className="text-gray-500">
                                        {new Date(det.detected_at || det.reported_at).toLocaleDateString()} - {det.user_name || 'Unknown'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* ✅ NEW: Show warning for unverified users */}
                              {!isVerified && (
                                <div className="bg-yellow-50 border-l-2 border-yellow-400 p-2 mb-2">
                                  <p className="text-xs text-yellow-800 font-medium">
                                    ⚠️ Unverified User Detection
                                  </p>
                                  <p className="text-xs text-yellow-700">
                                    Data may be less reliable
                                  </p>
                                </div>
                              )}
                              
                              <p className="text-sm">Severity: {displaySeverity}</p>
                              <p className="text-xs text-gray-600">
                                {new Date(detection.detected_at || detection.reported_at).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                Reported by: {detection.user_name || 'Unknown'}
                                {!isVerified && (
                                  <span className="ml-1 bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded text-xs">
                                    Unverified
                                  </span>
                                )}
                              </p>
                            </>
                          )}
                          
                          {detection.farm_id && (
                            <p className="text-xs text-blue-600 mt-2 italic">
                              ðŸ“ {isGroup && count === 1 ? 'Farm detection' : `Merged ${count} same-pest reports`}
                            </p>
                          )}
                        </div>
                      </Popup>
                    </Circle>
                  );
                }).filter(circle => circle !== null);
              })()}
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
                    ðŸ“ Location: {selectedLocation?.lat.toFixed(4)}, {selectedLocation?.lng.toFixed(4)}
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

        {/* Detection Modal */}
        {showDetectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
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

                    {detectionError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                          <p className="text-sm text-red-800">{detectionError}</p>
                        </div>
                      </div>
                    )}

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
                    <p className="text-gray-600">this will take a moment</p>
                  </div>
                )}

                {/* Confirmation Step */}
                {detectionStep === 'confirm' && detectionResult && (() => {
                  // Get pest reference data
                  const pestName = detectionResult.pest_name || detectionResult.pest || '';
                  const pestData = getPestById(pestName) || getPestById(pestName.toLowerCase().replace(/\s+/g, '-'));
                  const referenceImages = pestData?.referenceImages || [];
                  const identificationTips = pestData?.identificationTips || [];
                  const referenceDamageImage = pestData?.damageImage || null;

                  return (
                    <div className="space-y-6">
                      {/* Detection Info */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-blue-900 mb-2">Detection Result</h3>
                        <p className="text-2xl font-bold text-gray-800 mb-1">
                          {detectionResult.pest_name || detectionResult.pest}
                        </p>
                        {(detectionResult.scientific_name || pestData?.scientificName) && (
                          <p className="text-sm italic text-gray-600 mb-2">
                            {detectionResult.scientific_name || pestData.scientificName}
                          </p>
                        )}
                        {detectionResult.crop_type && (
                          <p className="text-sm text-gray-700 mb-1">
                            Crop: <span className="font-semibold capitalize">{detectionResult.crop_type}</span>
                          </p>
                        )}
                        <p className="text-sm text-gray-700">
                          Confidence: <span className="font-semibold">{(detectionResult.confidence * 100).toFixed(1)}%</span>
                        </p>
                      </div>

                      {/* Image Comparison Section */}
                      <div>
                        <h4 className="text-base font-semibold text-gray-800 mb-3 text-center">
                          ðŸ“¸ Visual Comparison
                        </h4>
                        
                        {/* User's Captured Image */}
                        <div className="space-y-2 mb-4">
                          <p className="text-sm font-medium text-center text-blue-700">Your Captured Image</p>
                          <div className="border-2 border-blue-400 rounded-lg overflow-hidden shadow-md bg-white">
                            {imagePreview ? (
                              <img 
                                src={imagePreview} 
                                alt="Your captured pest" 
                                className="w-full h-48 object-cover"
                              />
                            ) : (
                              <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                                <p className="text-gray-400 text-sm">Image not available</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reference Images from Pest Database */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-center text-green-700">
                            {referenceImages.length > 1 ? 'Reference Images' : 'Reference Pest'}
                          </p>
                          {referenceImages.length > 0 ? (
                            <div className={`grid ${referenceImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                              {referenceImages.map((refImg, idx) => (
                                <div key={idx} className="border-2 border-green-400 rounded-lg overflow-hidden shadow-md bg-white">
                                  <div className="relative">
                                    <img 
                                      src={refImg.url} 
                                      alt={`Reference: ${pestName} (${refImg.stage || ''})`}
                                      className="w-full h-40 object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                    <div className="hidden w-full h-40 flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                                      <AlertCircle className="w-10 h-10 text-gray-400 mb-2" />
                                      <p className="text-gray-500 text-xs text-center px-4">
                                        Reference image<br/>not available
                                      </p>
                                    </div>
                                    {refImg.stage && (
                                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded capitalize">
                                        {refImg.stage}
                                      </div>
                                    )}
                                  </div>
                                  {refImg.description && (
                                    <p className="text-xs text-gray-500 text-center py-1 px-2 bg-gray-50 border-t border-gray-100">
                                      {refImg.description}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="border-2 border-green-400 rounded-lg overflow-hidden shadow-md bg-white">
                              <div className="w-full h-40 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                                <AlertCircle className="w-10 h-10 text-gray-400 mb-2" />
                                <p className="text-gray-500 text-xs text-center px-4">
                                  Reference image<br/>not available
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Reference Damage Section */}
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-gray-800 mb-2 text-center">
                            ðŸŒ¾ Reference Damage Pattern
                          </h4>
                          <div className="border-2 border-red-400 rounded-lg overflow-hidden shadow-md bg-white">
                            {referenceDamageImage ? (
                              <div className="relative">
                                <img 
                                  src={referenceDamageImage} 
                                  alt={`Typical damage from ${pestName}`}
                                  className="w-full h-64 object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                                <div className="hidden w-full h-64 flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                                  <AlertCircle className="w-10 h-10 text-gray-400 mb-2" />
                                  <p className="text-gray-500 text-xs text-center px-4">
                                    Reference damage image<br/>not available
                                  </p>
                                </div>
                                <div className="absolute bottom-2 left-2 bg-red-900 bg-opacity-80 text-white text-xs px-2 py-1 rounded">
                                  Typical {pestName} Damage
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-64 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                                <AlertCircle className="w-10 h-10 text-gray-400 mb-2" />
                                <p className="text-gray-500 text-xs text-center px-4">
                                  Reference damage image<br/>not available
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Identification Tips */}
                        {identificationTips.length > 0 && (
                          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-start">
                              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                              <div className="text-sm text-blue-900">
                                <p className="font-semibold mb-1">ðŸ“ Identification Tips:</p>
                                <ul className="list-disc list-inside space-y-0.5 text-xs">
                                  {identificationTips.slice(0, 5).map((tip, idx) => (
                                    <li key={idx}>{tip}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Comparison Tips */}
                        <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                          <div className="flex items-start">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                            <div className="text-sm text-yellow-800">
                              <p className="font-semibold mb-1">ðŸ’¡ Comparison Tips:</p>
                              <ul className="list-disc list-inside space-y-0.5 text-xs">
                                <li>Compare body color and patterns with reference pest</li>
                                <li>Check body shape and size against reference</li>
                                <li>Look for distinctive markings on the pest</li>
                                <li>Compare damage patterns with reference damage</li>
                                <li>Verify feeding marks and damage symptoms</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Confirmation Question and Buttons */}
                      <div className="text-center">
                        <p className="text-lg font-medium text-gray-800 mb-4">
                          Does your image match the reference pest and damage pattern?
                        </p>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => confirmDetection(true)}
                            className="flex-1 bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center transition-colors"
                          >
                            <ThumbsUp className="w-5 h-5 mr-2" />
                            Yes, Matches
                          </button>
                          <button
                            onClick={() => confirmDetection(false)}
                            className="flex-1 bg-red-600 text-white py-4 rounded-lg hover:bg-red-700 font-semibold flex items-center justify-center transition-colors"
                          >
                            <ThumbsDown className="w-5 h-5 mr-2" />
                            No, Different
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Assessment Step */}
                {detectionStep === 'assessment' && detectionResult && (
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-green-900">
                        Detected: {detectionResult.pest_name || detectionResult.pest}
                      </h3>
                    </div>

                    {/* Location Choice */}
                    <div>
                      <label className="block text-lg font-medium text-gray-800 mb-3">
                        ðŸ“ Pin Location <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <button
                          type="button"
                          onClick={() => setLocationChoice('farm')}
                          className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                            locationChoice === 'farm'
                              ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <MapPin className={`w-6 h-6 mb-1 ${locationChoice === 'farm' ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className={`text-sm font-semibold ${locationChoice === 'farm' ? 'text-green-700' : 'text-gray-600'}`}>
                            Farm Location
                          </span>
                          <span className="text-xs text-gray-500 mt-0.5">Pin on your farm</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocationChoice('current')}
                          className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                            locationChoice === 'current'
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <Activity className={`w-6 h-6 mb-1 ${locationChoice === 'current' ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className={`text-sm font-semibold ${locationChoice === 'current' ? 'text-blue-700' : 'text-gray-600'}`}>
                            Current Location
                          </span>
                          <span className="text-xs text-gray-500 mt-0.5">Use GPS coordinates</span>
                        </button>
                      </div>
                    </div>

                    {/* Farm Selection - only shown when Farm Location is selected */}
                    {locationChoice === 'farm' && (
                      <div>
                        <label className="block text-lg font-medium text-gray-800 mb-2">
                          Select Farm <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedFarm || ''}
                          onChange={(e) => setSelectedFarm(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        >
                          <option value="">Choose a farm...</option>
                          {farms.filter(farm => farm.user_name === user.username).map(farm => (
                            <option key={farm.id} value={farm.id}>
                              {farm.name} - {farm.crop_type} ({farm.size} hectares)
                            </option>
                          ))}
                        </select>
                        {!selectedFarm && (
                          <p className="text-sm text-red-600 mt-1">Please select a farm to save the detection</p>
                        )}
                        {farms.filter(farm => farm.user_name === user.username).length === 0 && (
                          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">
                              âš ï¸ You don't have any approved farms yet. Please request a farm first or wait for admin approval.
                            </p>
                          </div>
                        )}

                        {/* Location info hint */}
                        {selectedFarm && (
                          <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                            <p>ðŸ“ Detection will be pinned at <span className="font-semibold">{farms.find(f => f.id === selectedFarm)?.name || 'selected farm'}</span>'s location on the map.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Current Location Info - shown when Current Location is selected */}
                    {locationChoice === 'current' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-blue-900 mb-1">Using Current Location</p>
                            <p className="text-sm text-blue-800">
                              ðŸ“ Detection will be pinned at your current GPS coordinates:
                              {location ? (
                                <span className="font-semibold block mt-1">
                                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                </span>
                              ) : (
                                <span className="block mt-1 text-blue-600">Loading GPS...</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

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
                        disabled={detectionLoading || (locationChoice === 'farm' && !selectedFarm)}
                        className="flex-1 bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
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
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Active Infestations by Farm</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {activeDetections.length === 0 ? (
                <p className="text-gray-500">No active infestations reported.</p>
              ) : (
                (() => {
                  // Group detections by farm
                  const detectionsByFarm = {};
                  activeDetections.forEach(detection => {
                    const farmId = detection.farm_id;
                    if (!detectionsByFarm[farmId]) {
                      detectionsByFarm[farmId] = [];
                    }
                    detectionsByFarm[farmId].push(detection);
                  });

                  // Sort farms by number of infestations (descending)
                  const sortedFarmIds = Object.keys(detectionsByFarm).sort((a, b) => 
                    detectionsByFarm[b].length - detectionsByFarm[a].length
                  );

                  return sortedFarmIds.map(farmId => {
                    const farm = farms.find(f => f.id === parseInt(farmId));
                    const farmDetections = detectionsByFarm[farmId];
                    
                    return (
                      <div key={farmId} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-gray-800">
                              {farm ? farm.name : `Farm ID: ${farmId}`}
                            </h3>
                            {farm && (
                              <p className="text-xs text-gray-500">
                                {farm.crop_type} - {farm.size} ha - Owner: {farm.user_name}
                              </p>
                            )}
                          </div>
                          <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                            {farmDetections.length} {farmDetections.length === 1 ? 'Infestation' : 'Infestations'}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {farmDetections.map((detection, idx) => (
                            <div key={detection.id} className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                                      #{idx + 1}
                                    </span>
                                    <p className="font-semibold text-gray-800">{detection.pest}</p>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Reported by: {detection.user_name || 'Unknown'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Date: {new Date(detection.detected_at || detection.reported_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Severity: <span className={`font-bold ${
                                      detection.severity === 'critical' ? 'text-red-900' : 
                                      detection.severity === 'high' ? 'text-red-500' : 
                                      detection.severity === 'medium' ? 'text-yellow-600' : 
                                      'text-green-600'
                                    }`}>{detection.severity.toUpperCase()}</span>
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className={`w-4 h-4 rounded-full ${
                                    detection.severity === 'critical' ? 'bg-red-900' : 
                                    detection.severity === 'high' ? 'bg-red-500' : 
                                    detection.severity === 'medium' ? 'bg-yellow-500' : 
                                    'bg-green-500'
                                  }`}></div>
                                  {(detection.user_name === user.username || user.role === 'admin') && (
                                    <button
                                      onClick={() => confirmResolveInfestation(detection.id)}
                                      className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded transition-colors"
                                      title="Mark as resolved"
                                    >
                                      <CheckCircle className="w-5 h-5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatMap;