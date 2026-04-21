import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Marker, useMapEvents, GeoJSON } from 'react-leaflet';
import {
  Filter, MapPin, AlertTriangle, Save, X, CheckCircle, Activity,
  Camera, Upload, Loader, ThumbsUp, ThumbsDown, AlertCircle,
  Shield, Bug, Leaf, ChevronDown, ChevronUp, List, Layers,
  Menu, Search, Home, Clock
} from 'lucide-react';
import Navigation from './Navigation';
import api from '../utils/api';
import L from 'leaflet';
import { PEST_REFERENCE_DATA, getPestById } from '../utils/pestReferenceData';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
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
          width: 32px; height: 32px; margin: 0 auto;
          background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMTBiOTgxIj48cGF0aCBkPSJNMTIgMkw0IDhWMjBIMjBWOEwxMiAyWk0xOCAxOEg2VjlMMTIgNC41TDE4IDlWMThaTTggMTBIMTBWMTZIOFYxMFpNMTQgMTBIMTZWMTZIMTRWMTBaIi8+PC9zdmc+');
          background-size: contain; background-repeat: no-repeat;
        "></div>
      </div>
    `,
    iconSize: [150, 70], iconAnchor: [75, 70], popupAnchor: [0, -70]
  });
};

const FARM_STATUS_CONFIG = {
  MINIMUM_THRESHOLD: 3, LOW_THRESHOLD: 3, MODERATE_THRESHOLD: 5,
  HIGH_THRESHOLD: 7, CRITICAL_THRESHOLD: 10
};

const MapClickHandler = ({ onMapClick, isAddingFarm }) => {
  useMapEvents({
    click: (e) => { if (isAddingFarm) onMapClick(e.latlng); },
  });
  return null;
};

// ── Panel Overlay ──────────────────────────────────────────────────────────────
const PanelOverlay = ({ title, onClose, children, width = 360, side = 'left', topOffset = 60 }) => (
  <div style={{
    position: 'absolute',
    [side]: 12,
    top: topOffset,
    width,
    maxHeight: 'calc(100% - 80px)',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    overflow: 'hidden',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
      <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{title}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#666' }}>
        <X size={18} />
      </button>
    </div>
    <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
  </div>
);

// ── Draggable Bottom Sheet Modal ───────────────────────────────────────────────
// All drag state lives in refs so React never re-renders mid-gesture (no jitter).
const DraggableBottomSheet = ({ title, onClose, children, icon, badge }) => {
  const sheetRef = React.useRef(null);
  const handleRef = React.useRef(null);

  // Drag state — all refs, no setState during the gesture
  const dragging = React.useRef(false);
  const startY = React.useRef(0);
  const currentTranslate = React.useRef(0);
  const isExpanded = React.useRef(false);

  const COLLAPSED_H = 55; // vh
  const EXPANDED_H  = 88; // vh

  // Apply translate directly to the DOM element (no React re-render)
  const applyTranslate = (dy) => {
    if (!sheetRef.current) return;
    sheetRef.current.style.transform = `translateY(${dy}px)`;
    sheetRef.current.style.transition = 'none';
  };

  const snapTo = (expanded, close = false) => {
    if (!sheetRef.current) return;
    if (close) {
      sheetRef.current.style.transition = 'transform 0.28s cubic-bezier(0.32,0.72,0,1)';
      sheetRef.current.style.transform = `translateY(100%)`;
      setTimeout(onClose, 290);
      return;
    }
    isExpanded.current = expanded;
    sheetRef.current.style.height = `${expanded ? EXPANDED_H : COLLAPSED_H}vh`;
    sheetRef.current.style.transition = 'transform 0.28s cubic-bezier(0.32,0.72,0,1), height 0.28s ease';
    sheetRef.current.style.transform = 'translateY(0)';
    currentTranslate.current = 0;
  };

  const onPointerDown = (e) => {
    // Only handle primary pointer (ignore multi-touch second finger)
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    startY.current = e.clientY;
    currentTranslate.current = 0;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const delta = e.clientY - startY.current;
    // Allow slight upward drag (expand) but cap downward drag for feel
    const clamped = Math.max(-30, delta);
    currentTranslate.current = clamped;
    applyTranslate(Math.max(0, clamped));
  };

  const onPointerUp = (e) => {
    if (!dragging.current) return;
    dragging.current = false;
    const delta = e.clientY - startY.current;
    if (delta > 80) {
      snapTo(false, true);          // swipe down → close
    } else if (delta < -60) {
      snapTo(true);                 // swipe up → expand
    } else {
      snapTo(isExpanded.current);   // return to current snap
    }
  };

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 5000 }}
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          height: `${COLLAPSED_H}vh`,
          transform: 'translateY(0)',
          transition: 'height 0.28s ease',
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.22)',
          zIndex: 5001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle — only this area initiates drag */}
        <div
          ref={handleRef}
          style={{ padding: '10px 0 0', cursor: 'grab', userSelect: 'none', flexShrink: 0, touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <div style={{ width: 40, height: 4, background: '#d1d5db', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {icon && (
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {icon}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>{title}</div>
                {badge != null && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{badge} total</div>}
              </div>
            </div>
            <button
              onClick={onClose}
              onPointerDown={e => e.stopPropagation()}
              style={{ background: '#f3f4f6', border: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ height: 1, background: '#f0f0f0' }} />
        </div>
        {/* Scrollable content — separate from drag area */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </>
  );
};

// ── FAB Button ─────────────────────────────────────────────────────────────────
const FAB = ({ onClick, icon, label, color = '#1a73e8', textColor = '#fff', small = false }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: small ? 6 : 8,
      padding: small ? '8px 14px' : '10px 18px',
      background: color, color: textColor,
      border: 'none', borderRadius: 24, cursor: 'pointer',
      fontWeight: 600, fontSize: small ? 12 : 13,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      whiteSpace: 'nowrap',
      transition: 'box-shadow 0.15s, transform 0.1s',
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.28)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'}
  >
    {icon}
    <span>{label}</span>
  </button>
);

// ── Map Control Button ─────────────────────────────────────────────────────────
const MapControlBtn = ({ onClick, children, active = false, title = '' }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 40, height: 40,
      background: active ? '#e8f0fe' : '#fff',
      border: 'none', borderRadius: 8, cursor: 'pointer',
      color: active ? '#1a73e8' : '#444',
      boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
      transition: 'background 0.15s',
    }}
  >
    {children}
  </button>
);

// ── Severity Badge ─────────────────────────────────────────────────────────────
const SevBadge = ({ sev }) => {
  const colors = { low: ['#fef9c3','#ca8a04'], medium: ['#ffedd5','#ea580c'], high: ['#fee2e2','#dc2626'], critical: ['#3b0000','#fff'] };
  const [bg, text] = colors[sev] || colors.low;
  return (
    <span style={{ background: bg, color: text, borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
      {sev}
    </span>
  );
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
  const [farmForm, setFarmForm] = useState({ name: '', size: '', crop_type: 'Rice', barangay: '' });
  const [farmSortMode, setFarmSortMode] = useState('mine');
  const [pestFilter, setPestFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [showDetectionModal, setShowDetectionModal] = useState(false);
  const [detectionStep, setDetectionStep] = useState('upload');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);
  const [detectionLoading, setDetectionLoading] = useState(false);
  const [detectionError, setDetectionError] = useState(null);
  const [damageLevel, setDamageLevel] = useState(2);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [locationChoice, setLocationChoice] = useState(user?.is_verified ? 'farm' : 'current');
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [selectedDotKey, setSelectedDotKey] = useState(null);

  // Panel states (Google Maps-style overlays)
  const [showFarmsPanel, setShowFarmsPanel] = useState(false);
  const [showInfestationsPanel, setShowInfestationsPanel] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const center = [15.2139, 120.6619];

  const magalangMask = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]],
        [[120.60, 15.16], [120.72, 15.16], [120.72, 15.27], [120.60, 15.27], [120.60, 15.16]]
      ]
    }
  };

  const getGroupedAndOffsetDetections = (detections) => {
    const farmPestGroups = {};
    const standalone = [];
    detections.forEach(detection => {
      if (detection.farm_id) {
        const farmId = detection.farm_id;
        const pestType = detection.pest || detection.pest_name || 'unknown';
        const groupKey = `${farmId}_${pestType}`;
        if (!farmPestGroups[groupKey]) {
          farmPestGroups[groupKey] = { farm_id: farmId, pest: pestType, detections: [], displayDetection: detection };
        }
        farmPestGroups[groupKey].detections.push(detection);
      } else {
        standalone.push({ isGroup: false, detection, position: { lat: parseFloat(detection.lat || detection.latitude), lng: parseFloat(detection.lng || detection.longitude) } });
      }
    });
    const farmGroups = Object.values(farmPestGroups);
    const farmPestsByFarm = {};
    farmGroups.forEach(group => {
      if (!farmPestsByFarm[group.farm_id]) farmPestsByFarm[group.farm_id] = [];
      farmPestsByFarm[group.farm_id].push(group);
    });
    const result = [];
    Object.keys(farmPestsByFarm).forEach(farmId => {
      const pestGroups = farmPestsByFarm[farmId];
      pestGroups.forEach((group, index) => {
        const baseDetection = group.displayDetection;
        let position;
        if (pestGroups.length === 1) {
          position = { lat: parseFloat(baseDetection.lat || baseDetection.latitude), lng: parseFloat(baseDetection.lng || baseDetection.longitude) };
        } else {
          const offsetDistance = 80 / 111320;
          const angle = (index / pestGroups.length) * 2 * Math.PI;
          position = {
            lat: parseFloat(baseDetection.lat || baseDetection.latitude) + Math.cos(angle) * offsetDistance,
            lng: parseFloat(baseDetection.lng || baseDetection.longitude) + Math.sin(angle) * offsetDistance
          };
        }
        result.push({ isGroup: group.detections.length > 1, detection: baseDetection, allDetections: group.detections, count: group.detections.length, position, farm_id: group.farm_id, pest: group.pest });
      });
    });
    return [...result, ...standalone];
  };

  useEffect(() => { fetchInitialData(); }, []);
  useEffect(() => { if (!loading) fetchFilteredDetections(); }, [days]);
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); setLocationLoading(false); },
        () => { setLocation({ latitude: 15.2139, longitude: 120.6619 }); setLocationLoading(false); }
      );
    } else {
      setLocation({ latitude: 15.2139, longitude: 120.6619 });
      setLocationLoading(false);
    }
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [detectionsRes, farmsRes] = await Promise.all([
        api.get(`/detections/heatmap_data/?days=${days}`),
        api.get('/farms/')
      ]);
      const detectionsData = Array.isArray(detectionsRes.data) ? detectionsRes.data : (detectionsRes.data.results || []);
      const farmsData = Array.isArray(farmsRes.data) ? farmsRes.data : (farmsRes.data.results || []);
      const validFarms = farmsData.filter(f => f.lat && f.lng && !isNaN(parseFloat(f.lat)) && !isNaN(parseFloat(f.lng)));
      const validDetections = detectionsData.filter(d => {
        const lat = d.lat || d.latitude; const lng = d.lng || d.longitude;
        if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) return false;
        d.latitude = parseFloat(lat); d.longitude = parseFloat(lng); d.lat = parseFloat(lat); d.lng = parseFloat(lng);
        return true;
      });
      setDetections(validDetections);
      setFarms(validFarms);
    } catch (e) { setFarms([]); setDetections([]); } finally { setLoading(false); }
  };

  const fetchFilteredDetections = async () => {
    try {
      const res = await api.get(`/detections/heatmap_data/?days=${days}`);
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      const valid = data.filter(d => {
        const lat = d.lat || d.latitude; const lng = d.lng || d.longitude;
        if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) return false;
        d.lat = parseFloat(lat); d.lng = parseFloat(lng); d.latitude = d.lat; d.longitude = d.lng;
        return true;
      });
      setDetections(valid);
    } catch (e) { setDetections([]); }
  };

  const handleMapClick = (latlng) => {
    setSelectedLocation(latlng);
    if (isAddingFarm) { setShowFarmModal(true); setIsAddingFarm(false); }
  };

  const saveFarm = async () => {
    if (!selectedLocation || !farmForm.name) { alert('Please fill in required fields'); return; }
    if (!farmForm.barangay) { alert('Please select a barangay'); return; }
    const sizeValue = parseFloat(farmForm.size);
    if (farmForm.size !== '' && (isNaN(sizeValue) || sizeValue <= 0)) { alert('Farm size must be a positive number'); return; }
    try {
      await api.post('/farm-requests/', { name: farmForm.name, size: farmForm.size || '5', crop_type: farmForm.crop_type || 'Rice', barangay: farmForm.barangay, lat: selectedLocation.lat, lng: selectedLocation.lng });
      resetFarmForm();
      alert('Farm request submitted! An admin will review it soon.');
      fetchInitialData();
    } catch (e) { alert('Failed to submit: ' + (e.response?.data?.error || e.message)); }
  };

  const getFarmStatus = (farmId) => {
    const count = detections.filter(d => d.farm_id === farmId && d.active !== false).length;
    if (count < FARM_STATUS_CONFIG.MINIMUM_THRESHOLD) return { text: '', color: 'text-gray-500', showStatus: false };
    if (count >= FARM_STATUS_CONFIG.CRITICAL_THRESHOLD) return { text: 'Critical - High Infestation', color: 'text-red-700', showStatus: true };
    if (count >= FARM_STATUS_CONFIG.HIGH_THRESHOLD) return { text: 'High Risk - Monitor Closely', color: 'text-orange-600', showStatus: true };
    if (count >= FARM_STATUS_CONFIG.MODERATE_THRESHOLD) return { text: 'Moderate Risk - Action Needed', color: 'text-yellow-600', showStatus: true };
    if (count >= FARM_STATUS_CONFIG.LOW_THRESHOLD) return { text: 'Low Risk - Early Detection', color: 'text-green-600', showStatus: true };
    return { text: '', color: 'text-gray-500', showStatus: false };
  };

  const getFarmHeatmapColor = (farmId) => {
    const count = detections.filter(d => d.farm_id === farmId && d.active !== false).length;
    if (count === 0) return '#d1d5db';
    if (count < 3) return '#3b82f6';
    if (count < 5) return '#fbbf24';
    if (count < 7) return '#f97316';
    if (count < 10) return '#ef4444';
    return '#7f1d1d';
  };

  const confirmResolveInfestation = (id) => { setSelectedInfestationToResolve(id); setShowResolveConfirm(true); };

  const resolveInfestation = async () => {
    if (!selectedInfestationToResolve) return;
    try {
      try { await api.patch(`/detections/${selectedInfestationToResolve}/`, { active: false, status: 'resolved' }); }
      catch { await api.put(`/detections/${selectedInfestationToResolve}/`, { active: false, status: 'resolved' }); }
      setDetections(detections.filter(d => d.id !== selectedInfestationToResolve));
    } catch (e) { console.error(e); }
    setShowResolveConfirm(false); setSelectedInfestationToResolve(null);
  };

  const startDetection = () => {
    setShowDetectionModal(true); setDetectionStep('upload'); setSelectedImage(null);
    setImagePreview(null); setDetectionResult(null); setDetectionError(null); setDamageLevel(2);
    setSelectedFarm(null); setSelectedBarangay('');
    if (!user.is_verified) setLocationChoice('current');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) { setSelectedImage(file); setImagePreview(URL.createObjectURL(file)); setDetectionError(null); }
  };

  const runDetection = async () => {
    if (!selectedImage || !location) { alert('Please select an image and ensure location is available'); return; }
    setDetectionLoading(true); setDetectionStep('detecting'); setDetectionError(null);
    const formData = new FormData();
    formData.append('image', selectedImage); formData.append('crop_type', 'rice');
    formData.append('severity', 'low'); formData.append('latitude', location.latitude);
    formData.append('longitude', location.longitude); formData.append('address', 'Detected Location');
    formData.append('confirmed', 'false'); formData.append('active', 'false');
    try {
      const response = await api.post('/detections/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (response.data?.no_pest_detected) {
        setDetectionResult({
          pest_name: '',
          confidence: 0.0,
          no_pest_detected: true,
          bounding_boxes: [],
          image_width: null,
          image_height: null,
          scientific_name: '',
          symptoms: '',
          control_methods: [],
          prevention: [],
          message: response.data.message || 'No pest was detected in this image.',
        });
        setDetectionStep('confirm');
      }
      else if ((response.status === 200 || response.status === 201) && response.data) {
        const pestName = response.data.pest_name || response.data.pest;
        if (pestName && pestName !== 'Unknown Pest' && pestName !== '') { setDetectionResult(response.data); setDetectionStep('confirm'); }
        else { setDetectionError('No pest detected. Try a clearer image.'); setDetectionStep('upload'); }
      } else { setDetectionError('Unexpected response. Please try again.'); setDetectionStep('upload'); }
    } catch (e) {
      if (e.response?.status === 503) setDetectionError('ML service is warming up. Please wait 30 seconds and try again.');
      else setDetectionError('Detection failed. Please try again.');
      setDetectionStep('upload');
    } finally { setDetectionLoading(false); }
  };

  const confirmDetection = async (isCorrect) => {
    if (isCorrect) { setDetectionStep('assessment'); }
    else {
      if (detectionResult?.id) {
        try { await api.delete(`/detections/${detectionResult.id}/`); } catch (e) { console.error(e); }
      }
      setDetectionError('Please try another image with a clearer view of the pest.');
      setDetectionStep('upload'); setDetectionResult(null);
    }
  };

  const saveDetection = async () => {
    if (!detectionResult) { alert('Detection result is missing.'); return; }
    if (locationChoice === 'farm' && !selectedFarm) { alert('Please select a farm.'); return; }
    if (locationChoice === 'current' && !selectedBarangay) { alert('Please select your barangay.'); return; }
    try {
      setDetectionLoading(true);
      const severityMap = { 0: 'low', 1: 'low', 2: 'medium', 3: 'medium', 4: 'high', 5: 'critical' };
      const updateData = { severity: severityMap[damageLevel] || 'medium', active: true, confirmed: true };
      if (locationChoice === 'farm' && selectedFarm) updateData.farm_id = selectedFarm;
      if (locationChoice === 'farm') {
        const farm = farms.find(f => Number(f.id) === Number(selectedFarm));
        if (farm?.lat && farm?.lng) { updateData.latitude = parseFloat(farm.lat); updateData.longitude = parseFloat(farm.lng); }
      } else if (locationChoice === 'current' && location) {
        updateData.latitude = location.latitude; updateData.longitude = location.longitude;
        updateData.address = selectedBarangay + ', Magalang, Pampanga';
      }
      await api.patch(`/detections/${detectionResult.id}/`, updateData);
      setDetectionStep('success');
      setTimeout(() => { fetchFilteredDetections(); closeDetectionModal(true); }, 1500);
    } catch (e) { console.error(e); alert('Failed to save detection.'); } finally { setDetectionLoading(false); }
  };

  const closeDetectionModal = async (wasSuccessful = false) => {
    if (!wasSuccessful && detectionResult?.id) {
      try { await api.delete(`/detections/${detectionResult.id}/`); } catch (e) { console.error(e); }
    }
    setShowDetectionModal(false); setDetectionStep('upload'); setSelectedImage(null);
    setImagePreview(null); setDetectionResult(null); setDetectionError(null); setDamageLevel(2);
    setSelectedFarm(null); setSelectedBarangay(''); setLocationChoice(user.is_verified ? 'farm' : 'current');
  };

  const getDamageLevelText = (level) => ({
    0: 'Healthy - No damage', 1: 'Minimal - Very light damage', 2: 'Low - Minor damage',
    3: 'Moderate - Noticeable damage', 4: 'High - Significant damage', 5: 'Critical - Severe damage'
  })[level] || 'Medium';

  const getDamageLevelColor = (level) => ['bg-green-500','bg-green-400','bg-yellow-400','bg-orange-400','bg-red-500','bg-red-900'][level] || 'bg-yellow-400';

  const resetFarmForm = () => { setFarmForm({ name: '', size: '', crop_type: 'Rice', barangay: '' }); setSelectedLocation(null); setShowFarmModal(false); };

  const activeDetections = detections.filter(d => d.active !== false);
  const uniquePests = [...new Set(activeDetections.map(d => d.pest || d.pest_name).filter(Boolean))].sort();
  const filteredDetections = activeDetections.filter(d => {
    if (pestFilter !== 'all' && (d.pest || d.pest_name || '') !== pestFilter) return false;
    if (severityFilter !== 'all' && d.severity !== severityFilter) return false;
    return true;
  });
  const activeFilterCount = [pestFilter, severityFilter].filter(f => f !== 'all').length;

  const severityColor = (sev) => sev === 'critical' ? '#7f1d1d' : sev === 'high' ? '#ef4444' : sev === 'medium' ? '#f97316' : '#fbbf24';
  const severityRadius = (sev) => sev === 'critical' ? 300 : sev === 'high' ? 200 : sev === 'medium' ? 150 : 100;

  // Farms panel sorted
  const sortedFarms = [...farms].sort((a, b) => {
    if (farmSortMode === 'mine') {
      const aM = a.user_name === user.username ? 0 : 1;
      const bM = b.user_name === user.username ? 0 : 1;
      if (aM !== bM) return aM - bM;
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  // Infestations by farm
  const detectionsByFarm = {};
  activeDetections.forEach(d => {
    const key = d.farm_id != null ? d.farm_id : '__unassigned__';
    if (!detectionsByFarm[key]) detectionsByFarm[key] = [];
    detectionsByFarm[key].push(d);
  });
  const sortedFarmIds = Object.keys(detectionsByFarm).sort((a, b) => {
    if (a === '__unassigned__') return 1;
    if (b === '__unassigned__') return -1;
    return detectionsByFarm[b].length - detectionsByFarm[a].length;
  });

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Navigation — always visible above everything */}
      <div style={{ position: 'relative', zIndex: 2000, flexShrink: 0 }}>
        <Navigation user={user} onLogout={onLogout} />
      </div>

      {/* Full-screen map container */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* ── Map ── */}
        {loading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e8eaed', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 48, height: 48, border: '4px solid #1a73e8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: '#555', fontWeight: 600, fontSize: 14 }}>Loading map data…</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <MapContainer
            center={center} zoom={14} minZoom={12} maxZoom={18}
            style={{ height: '100%', width: '100%' }}
            attributionControl={false}
            maxBounds={[[15.16, 120.60], [15.27, 120.72]]}
            maxBoundsViscosity={1.0}
            zoomControl={false}
          >
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={18} maxNativeZoom={18} />
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" opacity={0.7} maxZoom={18} maxNativeZoom={18} />
            <GeoJSON data={magalangMask} style={{ fillColor: '#e5e7eb', fillOpacity: 1, color: '#9ca3af', weight: 2, opacity: 1 }} />
            <MapClickHandler onMapClick={handleMapClick} isAddingFarm={isAddingFarm} />

            {/* Farm Markers */}
            {farms.filter(f => f.lat && f.lng && !isNaN(parseFloat(f.lat)) && !isNaN(parseFloat(f.lng))).map(farm => {
              const lat = parseFloat(farm.lat); const lng = parseFloat(farm.lng);
              if (isNaN(lat) || isNaN(lng)) return null;
              return (
                <Marker key={farm.id} position={[lat, lng]} icon={createLabeledFarmIcon(farm.name || 'Unknown Farm', farm.user_name || 'Unknown')}>
                  <Popup maxWidth={350} maxHeight={400}>
                    <div style={{ padding: 8 }}>
                      <h3 style={{ fontWeight: 700, fontSize: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 8, marginBottom: 8 }}>{farm.name}</h3>
                      <p style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>Owner: {farm.user_name}</p>
                      <p style={{ fontSize: 13 }}>{farm.crop_type} — {farm.size} ha</p>
                      {(() => {
                        const infestations = detections.filter(d => d.farm_id === farm.id && d.active !== false);
                        return (
                          <div style={{ marginTop: 10 }}>
                            <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Active Infestations: {infestations.length}</p>
                            {infestations.length > 0 ? (
                              <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {infestations.map((inf, i) => (
                                  <div key={inf.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontWeight: 600, fontSize: 12 }}>{i + 1}. {inf.pest}</span>
                                      <SevBadge sev={inf.severity} />
                                    </div>
                                    <p style={{ fontSize: 11, color: '#777', marginTop: 2 }}>By: {inf.user_name} · {new Date(inf.detected_at || inf.reported_at).toLocaleDateString()}</p>
                                  </div>
                                ))}
                              </div>
                            ) : <p style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>No active infestations</p>}
                          </div>
                        );
                      })()}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Detection Dots */}
            {(() => {
              const isValid = (v) => v != null && v !== '' && !isNaN(parseFloat(v)) && isFinite(parseFloat(v));
              const valid = filteredDetections.filter(d => isValid(d.lat || d.latitude) && isValid(d.lng || d.longitude));
              const locationGroups = {};
              valid.forEach(d => {
                const lat = parseFloat(d.lat || d.latitude); const lng = parseFloat(d.lng || d.longitude);
                const key = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
                if (!locationGroups[key]) locationGroups[key] = { lat, lng, detections: [], key };
                locationGroups[key].detections.push(d);
              });
              const sevOrder = { low: 1, medium: 2, high: 3, critical: 4 };
              const highestSev = (dets) => dets.reduce((h, d) => (sevOrder[d.severity] || 0) > (sevOrder[h] || 0) ? d.severity : h, 'low');

              return Object.values(locationGroups).map(({ lat, lng, detections: gDets, key }) => {
                const isSelected = selectedDotKey === key;
                const hs = highestSev(gDets);
                const color = severityColor(hs);
                const isVerified = gDets.some(d => d.user_is_verified !== false);
                const count = gDets.length;
                const dotColor = isVerified ? color : '#9ca3af';
                const dotIcon = L.divIcon({
                  className: '',
                  html: `<div style="width:${count>1?20:14}px;height:${count>1?20:14}px;background:${dotColor};border:2.5px solid ${isVerified ? color : '#6b7280'};border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:700;cursor:pointer;">${count>1?count:''}</div>`,
                  iconSize: [count>1?20:14,count>1?20:14], iconAnchor: [count>1?10:7,count>1?10:7], popupAnchor: [0,-(count>1?12:9)],
                });
                return (
                  <React.Fragment key={key}>
                    {isSelected && <Circle center={[lat,lng]} radius={severityRadius(hs)} pathOptions={{ fillColor: color, fillOpacity: 0.25, color, weight: 2 }} />}
                    <Marker position={[lat,lng]} icon={dotIcon} eventHandlers={{ click: () => setSelectedDotKey(p => p === key ? null : key) }}>
                      <Popup>
                        <div style={{ minWidth: 200, maxWidth: 280 }}>
                          <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 8, marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                              <span style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>
                                {count === 1 ? (gDets[0].pest || 'Unknown Pest') : `${count} Detections at this location`}
                              </span>
                            </div>
                            {!isVerified && <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 4, padding: '3px 6px', fontSize: 10, color: '#92400e', fontWeight: 600 }}>⚠ Unverified user data</div>}
                          </div>
                          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {gDets.map((det, i) => (
                              <div key={det.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <span style={{ fontWeight: 600, fontSize: 12, flex: 1 }}>{count>1?`${i+1}. `:''}{det.pest || det.pest_name || 'Unknown'}</span>
                                  <SevBadge sev={det.severity} />
                                </div>
                                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{det.user_name || 'Unknown'} · {new Date(det.detected_at || det.reported_at).toLocaleDateString()}</div>
                              </div>
                            ))}
                          </div>
                          {count > 1 && <div style={{ marginTop: 8, fontSize: 10, color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: 6 }}>Highest: <strong style={{ color: severityColor(hs) }}>{hs}</strong></div>}
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                );
              });
            })()}
          </MapContainer>
        )}

        {/* ── Top search bar (Google Maps style) ── */}
        {!loading && (
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: '#fff', borderRadius: 24, padding: '0 16px', height: 46, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.2)', minWidth: 220 }}>
              <Search size={16} color="#666" />
              <span style={{ color: '#333', fontSize: 14, fontWeight: 500 }}>Magalang, Pampanga</span>
            </div>
            {/* Time range pill */}
            <div style={{ background: '#fff', borderRadius: 24, padding: '0 14px', height: 38, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              <Clock size={14} color="#1a73e8" />
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                style={{ border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: '#1a73e8', background: 'transparent', cursor: 'pointer' }}
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Bottom action bar ── */}
        {!loading && (
          <div style={{
            position: 'absolute', bottom: 92, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'rgba(255,255,255,0.97)',
            borderRadius: 28,
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            backdropFilter: 'blur(8px)',
          }}>
            {/* Farms */}
            <button
              onClick={() => { setShowFarmsPanel(p => !p); setShowInfestationsPanel(false); setShowFiltersPanel(false); }}
              title="View Farms"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '8px 14px', border: 'none', borderRadius: 22, cursor: 'pointer',
                background: showFarmsPanel ? '#e8f0fe' : 'transparent',
                color: showFarmsPanel ? '#1a73e8' : '#444',
                transition: 'background 0.15s, color 0.15s',
                minWidth: 60,
              }}
            >
              <Home size={18} color={showFarmsPanel ? '#1a73e8' : '#555'} />
              <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1 }}>Farms</span>
              <span style={{ fontSize: 9, color: showFarmsPanel ? '#1a73e8' : '#9ca3af', lineHeight: 1 }}>{farms.length}</span>
            </button>

            {/* Divider */}
            <div style={{ width: 1, height: 32, background: '#e5e7eb', margin: '0 2px' }} />

            {/* Infestations */}
            <button
              onClick={() => { setShowInfestationsPanel(p => !p); setShowFarmsPanel(false); setShowFiltersPanel(false); }}
              title="View Infestations"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '8px 14px', border: 'none', borderRadius: 22, cursor: 'pointer',
                background: showInfestationsPanel ? '#fce8e6' : 'transparent',
                color: showInfestationsPanel ? '#c5221f' : '#444',
                transition: 'background 0.15s, color 0.15s',
                minWidth: 60, position: 'relative',
              }}
            >
              <AlertTriangle size={18} color={showInfestationsPanel ? '#c5221f' : '#555'} />
              <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1 }}>Alerts</span>
              {activeDetections.length > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 8,
                  background: '#dc2626', color: '#fff',
                  borderRadius: 99, fontSize: 8, fontWeight: 700,
                  padding: '1px 4px', lineHeight: 1.4, minWidth: 14, textAlign: 'center',
                }}>{activeDetections.length > 99 ? '99+' : activeDetections.length}</span>
              )}
            </button>

            {/* Divider */}
            <div style={{ width: 1, height: 32, background: '#e5e7eb', margin: '0 2px' }} />

            {/* Detect Pest — primary CTA */}
            <button
              onClick={startDetection}
              title="Detect Pest"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '8px 18px', border: 'none', borderRadius: 22, cursor: 'pointer',
                background: 'linear-gradient(135deg, #1a73e8, #0d5cca)',
                color: '#fff',
                boxShadow: '0 2px 10px rgba(26,115,232,0.4)',
                transition: 'transform 0.12s, box-shadow 0.12s',
                minWidth: 68,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,115,232,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(26,115,232,0.4)'; }}
            >
              <Camera size={20} color="#fff" />
              <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1 }}>Detect</span>
            </button>

            {/* Divider */}
            <div style={{ width: 1, height: 32, background: '#e5e7eb', margin: '0 2px' }} />

            {/* Filter */}
            <button
              onClick={() => { setShowFiltersPanel(p => !p); setShowFarmsPanel(false); setShowInfestationsPanel(false); }}
              title="Filter"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '8px 14px', border: 'none', borderRadius: 22, cursor: 'pointer',
                background: showFiltersPanel || activeFilterCount > 0 ? '#e6f4ea' : 'transparent',
                color: showFiltersPanel || activeFilterCount > 0 ? '#137333' : '#444',
                transition: 'background 0.15s, color 0.15s',
                minWidth: 60, position: 'relative',
              }}
            >
              <Filter size={18} color={showFiltersPanel || activeFilterCount > 0 ? '#137333' : '#555'} />
              <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1 }}>Filter</span>
              {activeFilterCount > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 8,
                  background: '#137333', color: '#fff',
                  borderRadius: 99, fontSize: 8, fontWeight: 700,
                  padding: '1px 4px', lineHeight: 1.4, minWidth: 14, textAlign: 'center',
                }}>{activeFilterCount}</span>
              )}
            </button>

            {/* Request Farm — verified users only */}
            {user.is_verified && (
              <>
                <div style={{ width: 1, height: 32, background: '#e5e7eb', margin: '0 2px' }} />
                <button
                  onClick={() => setIsAddingFarm(v => !v)}
                  title="Request Farm"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 3, padding: '8px 14px', border: 'none', borderRadius: 22, cursor: 'pointer',
                    background: isAddingFarm ? '#fff7ed' : 'transparent',
                    color: isAddingFarm ? '#ea580c' : '#444',
                    transition: 'background 0.15s, color 0.15s',
                    minWidth: 60,
                  }}
                >
                  <MapPin size={18} color={isAddingFarm ? '#ea580c' : '#555'} />
                  <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1 }}>{isAddingFarm ? 'Placing…' : 'Add Farm'}</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Right side: zoom controls + legend ── */}
        {!loading && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <MapControlBtn onClick={() => setShowLegend(p => !p)} active={showLegend} title="Legend">
              <Layers size={18} />
            </MapControlBtn>
          </div>
        )}

        {/* ── Adding Farm Banner ── */}
        {isAddingFarm && (
          <div style={{ position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 1001, background: '#f97316', color: '#fff', padding: '10px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin size={16} />
            Click anywhere on the map to place your farm
            <button onClick={() => setIsAddingFarm(false)} style={{ background: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: 8, padding: '3px 8px', color: '#fff', cursor: 'pointer', fontSize: 12, marginLeft: 4 }}>Cancel</button>
          </div>
        )}

        {/* ── Legend Panel ── */}
        {showLegend && (
          <div style={{ position: 'absolute', right: 60, top: '50%', transform: 'translateY(-50%)', zIndex: 1001, background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.18)', minWidth: 180 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#1a1a1a' }}>Infestation Levels</div>
            {[['#d1d5db','No infestations'], ['#3b82f6','Monitoring (1-2)'], ['#fbbf24','Low risk (3-4)'], ['#f97316','Moderate (5-6)'], ['#ef4444','High risk (7-9)'], ['#7f1d1d','Critical (10+)']].map(([c, label]) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#444' }}>{label}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8, marginTop: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#1a1a1a' }}>Detection Dots</div>
              {[['#ef4444','Critical'], ['#f97316','High'], ['#fbbf24','Medium'], ['#16a34a','Low']].map(([c, label]) => (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: c, flexShrink: 0, border: `2px solid ${c}` }} />
                  <span style={{ fontSize: 12, color: '#444' }}>{label} severity</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Farms Draggable Sheet ── */}
        {showFarmsPanel && (
          <DraggableBottomSheet
            title="All Farms"
            badge={farms.length}
            icon={<Home size={18} color="#1a73e8" />}
            onClose={() => setShowFarmsPanel(false)}
          >
            {/* Sort toggle */}
            <div style={{ padding: '8px 14px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 6 }}>
              {['mine', 'all'].map(mode => (
                <button key={mode} onClick={() => setFarmSortMode(mode)} style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: farmSortMode === mode ? '#e8f0fe' : '#f3f4f6', color: farmSortMode === mode ? '#1a73e8' : '#555', transition: 'all 0.15s' }}>
                  {mode === 'mine' ? 'My Farms First' : 'All Farms'}
                </button>
              ))}
            </div>
            <div style={{ padding: '8px 0' }}>
              {farms.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No farms registered yet.</div>
              ) : (() => {
                const myCount = farms.filter(f => f.user_name === user.username).length;
                let dividerShown = false;
                return sortedFarms.map((farm, idx) => {
                  const status = getFarmStatus(farm.id);
                  const infCount = detections.filter(d => d.farm_id === farm.id && d.active !== false).length;
                  const isMine = farm.user_name === user.username;
                  let divider = null;
                  if (farmSortMode === 'mine' && !isMine && !dividerShown && myCount > 0) {
                    dividerShown = true;
                    divider = <div key="div" style={{ padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ flex: 1, height: 1, background: '#e5e7eb' }} /><span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>Other Farms</span><div style={{ flex: 1, height: 1, background: '#e5e7eb' }} /></div>;
                  }
                  const card = (
                    <div key={farm.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f5f5f5', background: isMine ? '#f0fdf4' : 'transparent', transition: 'background 0.1s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a' }}>{farm.name}</span>
                            {isMine && <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, border: '1px solid #bbf7d0' }}>MY FARM</span>}
                          </div>
                          <p style={{ fontSize: 11, color: '#888', margin: '0 0 2px' }}>Owner: {farm.user_name}</p>
                          <p style={{ fontSize: 12, color: '#555', margin: 0 }}>{farm.crop_type} · {farm.size} ha</p>
                          {status.showStatus && <p style={{ fontSize: 12, fontWeight: 600, marginTop: 3, color: status.color.replace('text-','').replace('-600','').replace('-700','') }}>{status.text}</p>}
                          {infCount > 0 && <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{infCount} active infestation{infCount !== 1 ? 's' : ''}</p>}
                        </div>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: getFarmHeatmapColor(farm.id), flexShrink: 0, marginTop: 2 }} />
                      </div>
                    </div>
                  );
                  return divider ? [divider, card] : card;
                });
              })()}
            </div>
          </DraggableBottomSheet>
        )}

        {/* ── Infestations Draggable Sheet ── */}
        {showInfestationsPanel && (
          <DraggableBottomSheet
            title="Active Infestations"
            badge={activeDetections.length}
            icon={<AlertTriangle size={18} color="#dc2626" />}
            onClose={() => setShowInfestationsPanel(false)}
          >
            <div style={{ padding: '8px 0' }}>
              {activeDetections.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No active infestations.</div>
              ) : sortedFarmIds.map(farmId => {
                const isUnassigned = farmId === '__unassigned__';
                const farm = isUnassigned ? null : farms.find(f => f.id === parseInt(farmId));
                const farmDets = detectionsByFarm[farmId];
                return (
                  <div key={farmId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    {/* Farm header */}
                    <div style={{ padding: '10px 16px 6px', background: isUnassigned ? '#eff6ff' : '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        {isUnassigned ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MapPin size={13} color="#3b82f6" />
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#1e40af' }}>GPS / Field Detections</span>
                          </div>
                        ) : (
                          <div>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a' }}>{farm ? farm.name : `Unknown Farm (#${farmId})`}</span>
                            {farm && <p style={{ fontSize: 11, color: '#888', margin: '1px 0 0' }}>{farm.crop_type} · {farm.size} ha · {farm.user_name}</p>}
                          </div>
                        )}
                      </div>
                      <span style={{ background: isUnassigned ? '#dbeafe' : '#fee2e2', color: isUnassigned ? '#1d4ed8' : '#991b1b', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                        {farmDets.length}
                      </span>
                    </div>
                    {/* Detections */}
                    {farmDets.map((det, idx) => (
                      <div key={det.id} style={{ padding: '8px 16px', borderTop: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ background: '#e5e7eb', color: '#374151', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 700 }}>#{idx + 1}</span>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{det.pest}</span>
                          </div>
                          <p style={{ fontSize: 11, color: '#888', margin: '0 0 1px' }}>By: {det.user_name || 'Unknown'}{det.user_is_verified === false && <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 600, marginLeft: 4 }}>Unverified</span>}</p>
                          <p style={{ fontSize: 11, color: '#888', margin: 0 }}>{new Date(det.detected_at || det.reported_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <SevBadge sev={det.severity} />
                          {(det.user_name === user.username || user.role === 'admin') && (
                            <button onClick={() => confirmResolveInfestation(det.id)} title="Mark as resolved" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', padding: 2, borderRadius: 4 }}>
                              <CheckCircle size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </DraggableBottomSheet>
        )}
        {showFiltersPanel && (
          <PanelOverlay title="Filter Detections" onClose={() => setShowFiltersPanel(false)} width={280}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>PEST TYPE</label>
                <select value={pestFilter} onChange={e => setPestFilter(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13, color: '#333', outline: 'none' }}>
                  <option value="all">All Pests</option>
                  {uniquePests.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>SEVERITY</label>
                <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13, color: '#333', outline: 'none' }}>
                  <option value="all">All Severities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                <span style={{ fontSize: 12, color: '#888' }}>{filteredDetections.length} detection{filteredDetections.length !== 1 ? 's' : ''} shown</span>
                {activeFilterCount > 0 && (
                  <button onClick={() => { setPestFilter('all'); setSeverityFilter('all'); }} style={{ fontSize: 12, color: '#c5221f', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </PanelOverlay>
        )}

        {/* ── Farm Request Modal ── */}
        {showFarmModal && (
          <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998 }} onClick={resetFarmForm} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 9999, background: '#fff', borderRadius: 16, padding: '24px', width: '90%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.22)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 700, fontSize: 20, color: '#1a1a1a', margin: 0 }}>Request New Farm</h2>
                <button onClick={resetFarmForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 4 }}><X size={20} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[['Farm Name *', 'text', 'name', 'e.g., Northern Rice Field'], ['Size (hectares)', 'number', 'size', '5']].map(([label, type, key, ph]) => (
                  <div key={key}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 5 }}>{label}</label>
                    <input type={type} value={farmForm[key]} placeholder={ph} onChange={e => {
                      if (key === 'size') { const v = e.target.value; if (v === '' || parseFloat(v) > 0) setFarmForm(f => ({...f, [key]: v})); }
                      else setFarmForm(f => ({...f, [key]: e.target.value}));
                    }} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 5 }}>Crop Type</label>
                  <select value={farmForm.crop_type} onChange={e => setFarmForm(f => ({...f, crop_type: e.target.value}))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none' }}>
                    <option value="Rice">Rice</option>
                    <option value="Corn">Corn</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 5 }}>Barangay <span style={{ color: '#e53e3e' }}>*</span></label>
                  <select value={farmForm.barangay} onChange={e => setFarmForm(f => ({...f, barangay: e.target.value}))} style={{ width: '100%', padding: '10px 12px', border: farmForm.barangay ? '1px solid #e0e0e0' : '1px solid #e53e3e', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' }}>
                    <option value="">-- Select Barangay --</option>
                    <option>Ayala</option>
                    <option>Bucanan</option>
                    <option>Camias</option>
                    <option>Dolores</option>
                    <option>Escaler</option>
                    <option>La Paz</option>
                    <option>Navaling</option>
                    <option>San Agustin</option>
                    <option>San Antonio</option>
                    <option>San Francisco</option>
                    <option>San Ildefonso</option>
                    <option>San Isidro</option>
                    <option>San Jose</option>
                    <option>San Miguel</option>
                    <option>San Nicolas 1st (Poblacion)</option>
                    <option>San Nicolas 2nd</option>
                    <option>San Pablo (Poblacion)</option>
                    <option>San Pedro I</option>
                    <option>San Pedro II</option>
                    <option>San Roque</option>
                    <option>San Vicente</option>
                    <option>Santa Cruz (Poblacion)</option>
                    <option>Santa Lucia</option>
                    <option>Santa Maria</option>
                    <option>Santo Niño</option>
                    <option>Santo Rosario</option>
                    <option>Turu</option>
                  </select>
                  {!farmForm.barangay && <p style={{ fontSize: 11, color: '#e53e3e', marginTop: 3 }}>Required</p>}
                </div>
                <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#555' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 600 }}>📍 Location: {selectedLocation?.lat.toFixed(4)}, {selectedLocation?.lng.toFixed(4)}</p>
                  <p style={{ margin: 0, color: '#888' }}>Your request will be reviewed by an administrator before approval.</p>
                </div>
                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button onClick={saveFarm} style={{ flex: 1, padding: '11px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Save size={15} /> Submit Request
                  </button>
                  <button onClick={resetFarmForm} style={{ flex: 1, padding: '11px', background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Detection Modal (bottom sheet) ── */}
        {showDetectionModal && (
          <>
            <style>{`body { overflow: hidden !important; }`}</style>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000 }} onClick={closeDetectionModal} />
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10001, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', pointerEvents: 'none' }}>
              <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 672, maxHeight: 'calc(90vh - 80px - env(safe-area-inset-bottom,0px))', marginBottom: 'calc(80px + env(safe-area-inset-bottom,0px))', borderRadius: '16px 16px 0 0', boxShadow: '0 -4px 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', pointerEvents: 'auto', overflow: 'hidden' }}>
                {/* Drag handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                  <div style={{ width: 40, height: 4, borderRadius: 2, background: '#d1d5db' }} />
                </div>
                {/* Scrollable content */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 8 }}>
                    <h2 style={{ fontWeight: 700, fontSize: 20, color: '#1a1a1a', margin: 0 }}>Pest Detection</h2>
                    <button onClick={closeDetectionModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 4 }}><X size={22} /></button>
                  </div>

                  {/* Upload Step */}
                  {detectionStep === 'upload' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 10 }}>Upload or Capture Image</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          {[['Upload', Upload, '#eff6ff', '#1d4ed8', '#bfdbfe', () => fileInputRef.current?.click()], ['Camera', Camera, '#f0fdf4', '#15803d', '#bbf7d0', () => cameraInputRef.current?.click()]].map(([label, Icon, bg, color, border, fn]) => (
                            <button key={label} onClick={fn} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: bg, border: `2px solid ${border}`, borderRadius: 12, cursor: 'pointer', gap: 8 }}>
                              <Icon size={32} color={color} />
                              <span style={{ fontWeight: 700, fontSize: 14, color }}>{label}</span>
                            </button>
                          ))}
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} style={{ display: 'none' }} />
                      </div>
                      {imagePreview && (
                        <div>
                          <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 8 }}>Image Preview</label>
                          <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 10, border: '2px solid #e5e7eb' }} />
                        </div>
                      )}
                      {detectionError && (
                        <div style={{ background: detectionError.includes('No pest') ? '#fefce8' : '#fef2f2', border: `1px solid ${detectionError.includes('No pest') ? '#fbbf24' : '#fca5a5'}`, borderRadius: 10, padding: 14, display: 'flex', gap: 10 }}>
                          <AlertCircle size={18} color={detectionError.includes('No pest') ? '#ca8a04' : '#dc2626'} style={{ flexShrink: 0, marginTop: 1 }} />
                          <div>
                            <p style={{ fontWeight: 700, fontSize: 13, color: detectionError.includes('No pest') ? '#92400e' : '#991b1b', margin: '0 0 3px' }}>{detectionError.includes('No pest') ? 'No Pest Detected' : 'Detection Failed'}</p>
                            <p style={{ fontSize: 13, color: detectionError.includes('No pest') ? '#78350f' : '#7f1d1d', margin: 0 }}>{detectionError}</p>
                          </div>
                        </div>
                      )}
                      {imagePreview && (
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={runDetection} disabled={detectionLoading || locationLoading} style={{ flex: 1, padding: '13px', background: detectionLoading || locationLoading ? '#9ca3af' : '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: detectionLoading || locationLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <CheckCircle size={18} /> Detect Pest
                          </button>
                          <button onClick={() => { setSelectedImage(null); setImagePreview(null); setDetectionError(null); }} style={{ padding: '13px 20px', background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Clear</button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detecting Step */}
                  {detectionStep === 'detecting' && (
                    <div style={{ padding: '40px 0', textAlign: 'center' }}>
                      <Loader size={56} color="#16a34a" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                      <h3 style={{ fontWeight: 700, fontSize: 20, color: '#1a1a1a', marginBottom: 8 }}>Analyzing Image…</h3>
                      <p style={{ color: '#888', fontSize: 14 }}>This will take a moment</p>
                    </div>
                  )}

                  {/* Confirm Step */}
                  {detectionStep === 'confirm' && detectionResult && (() => {
                    const pestName = detectionResult.pest_name || detectionResult.pest || '';
                    const noPest = detectionResult.no_pest_detected === true;
                    const pestData = noPest ? null : (getPestById(pestName) || getPestById(pestName.toLowerCase().replace(/\s+/g, '-')));
                    const referenceImages = pestData?.referenceImages || [];
                    const identificationTips = pestData?.identificationTips || [];

                    // ── Confidence & Accuracy Metrics ──────────────────────────────
                    const rawConf = detectionResult.confidence ?? detectionResult.confidence_score ?? 0;
                    const confPct = noPest ? 0 : Math.round(Math.min(rawConf > 1 ? rawConf : rawConf * 100, 100));
                    const numDetections = noPest ? 0 : (detectionResult.num_detections ?? 1);
                    const mlSeverity = detectionResult.severity || 'low';
                    const symptoms = detectionResult.symptoms || '';

                    // Derive colour & label for the confidence level
                    const confColor  = noPest ? '#6b7280' : (confPct >= 80 ? '#16a34a' : confPct >= 55 ? '#d97706' : '#dc2626');
                    const confBg     = noPest ? '#f9fafb' : (confPct >= 80 ? '#f0fdf4' : confPct >= 55 ? '#fffbeb' : '#fef2f2');
                    const confBorder = noPest ? '#e5e7eb' : (confPct >= 80 ? '#bbf7d0' : confPct >= 55 ? '#fde68a' : '#fecaca');
                    const confLabel  = noPest ? 'Not Detected' : (confPct >= 80 ? 'High Confidence' : confPct >= 55 ? 'Moderate Confidence' : 'Low Confidence');
                    const confDesc   = noPest
                      ? 'No pest was identified in this image. The image may be unclear, too far away, or the affected area may not be visible. Please try again with a clearer, closer photo.'
                      : (confPct >= 80
                        ? 'The AI model is highly certain this pest is present in your image.'
                        : confPct >= 55
                        ? 'The AI model is reasonably confident. Please verify against the reference images.'
                        : 'The AI model has low certainty. Carefully compare with reference images before confirming.');

                    // ── Advanced / bounding-box panel ──────────────────────────────
                    const BoundingBoxPanel = () => {
                      const [open, setOpen] = React.useState(false);
                      const canvasRef = React.useRef(null);
                      const boxes = detectionResult.bounding_boxes || [];
                      const imgW   = detectionResult.image_width;
                      const imgH   = detectionResult.image_height;
                      const modelUsed = detectionResult.model_used || '—';

                      // Friendly model label
                      const modelLabel = {
                        'primary':                   'Primary model (best.pt)',
                        'primary-weak-class-winner':  'Primary model won (weak-class comparison)',
                        'fallback':                   'Fallback model (bestfine.pt)',
                        'fallback-weak-class-winner': 'Fallback model won (weak-class comparison)',
                        'primary-fallback-empty':     'Primary model (fallback found nothing)',
                      }[modelUsed] || modelUsed;

                      // Draw boxes onto canvas whenever panel opens or imagePreview changes
                      React.useEffect(() => {
                        if (!open || !canvasRef.current || !imagePreview || boxes.length === 0 || !imgW || !imgH) return;
                        const canvas = canvasRef.current;
                        const ctx = canvas.getContext('2d');
                        const image = new Image();
                        image.onload = () => {
                          // Scale to fit canvas width (max 560px)
                          const displayW = canvas.width;
                          const scale = displayW / imgW;
                          const displayH = imgH * scale;
                          canvas.height = displayH;
                          ctx.clearRect(0, 0, displayW, displayH);
                          ctx.drawImage(image, 0, 0, displayW, displayH);
                          boxes.forEach((box, idx) => {
                            const x  = box.xmin * scale;
                            const y  = box.ymin * scale;
                            const w  = (box.xmax - box.xmin) * scale;
                            const h  = (box.ymax - box.ymin) * scale;
                            const pct = Math.round(Math.min(box.confidence > 1 ? box.confidence : box.confidence * 100, 100));
                            // Box
                            ctx.strokeStyle = '#22c55e';
                            ctx.lineWidth   = 2.5;
                            ctx.strokeRect(x, y, w, h);
                            // Semi-transparent fill
                            ctx.fillStyle = 'rgba(34,197,94,0.10)';
                            ctx.fillRect(x, y, w, h);
                            // Label background
                            const label = `${box.label || pestName} ${pct}%`;
                            ctx.font = 'bold 12px sans-serif';
                            const tw = ctx.measureText(label).width + 8;
                            const th = 18;
                            const ly = y > th + 2 ? y - th - 2 : y + 2;
                            ctx.fillStyle = '#16a34a';
                            ctx.fillRect(x, ly, tw, th);
                            // Label text
                            ctx.fillStyle = '#fff';
                            ctx.fillText(label, x + 4, ly + 13);
                          });
                        };
                        image.src = imagePreview;
                      }, [open, imagePreview, boxes, imgW, imgH]);

                      return (
                        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                          {/* Toggle button */}
                          <button
                            onClick={() => setOpen(o => !o)}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '11px 14px', background: open ? '#0f172a' : '#1e293b',
                              border: 'none', cursor: 'pointer', gap: 8,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 14 }}>🔬</span>
                              <span style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0', letterSpacing: '0.02em' }}>
                                How was this detected?
                              </span>
                              <span style={{ fontSize: 10, background: '#334155', color: '#94a3b8', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>
                                ADVANCED
                              </span>
                            </div>
                            <span style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1 }}>{open ? '▲' : '▼'}</span>
                          </button>

                          {/* Panel content */}
                          {open && (
                            <div style={{ background: '#0f172a', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>

                              {/* Model info row */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div style={{ background: '#1e293b', borderRadius: 8, padding: '9px 11px' }}>
                                  <p style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Model Used</p>
                                  <p style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{modelLabel}</p>
                                </div>
                                <div style={{ background: '#1e293b', borderRadius: 8, padding: '9px 11px' }}>
                                  <p style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Architecture</p>
                                  <p style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600, margin: 0 }}>YOLOv5 (custom)</p>
                                </div>
                                <div style={{ background: '#1e293b', borderRadius: 8, padding: '9px 11px' }}>
                                  <p style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Regions Detected</p>
                                  <p style={{ fontSize: 20, color: '#22c55e', fontWeight: 800, margin: 0 }}>{boxes.length}</p>
                                </div>
                                <div style={{ background: '#1e293b', borderRadius: 8, padding: '9px 11px' }}>
                                  <p style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Image Size</p>
                                  <p style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600, margin: 0 }}>{imgW && imgH ? `${imgW} × ${imgH}px` : '—'}</p>
                                </div>
                              </div>

                              {/* Per-box breakdown */}
                              {boxes.length > 0 && (
                                <div>
                                  <p style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                                    Detection Regions
                                  </p>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {boxes.map((box, i) => {
                                      const bPct = Math.round(Math.min(box.confidence > 1 ? box.confidence : box.confidence * 100, 100));
                                      const bColor = bPct >= 80 ? '#22c55e' : bPct >= 55 ? '#f59e0b' : '#f87171';
                                      return (
                                        <div key={i} style={{ background: '#1e293b', borderRadius: 8, padding: '8px 11px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                          <div style={{ width: 22, height: 22, borderRadius: 5, background: '#22c55e22', border: '1.5px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 800 }}>{i + 1}</span>
                                          </div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                              <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600 }}>{box.label || pestName}</span>
                                              <span style={{ fontSize: 11, color: bColor, fontWeight: 800 }}>{bPct}%</span>
                                            </div>
                                            <div style={{ height: 4, background: '#334155', borderRadius: 99, overflow: 'hidden' }}>
                                              <div style={{ height: '100%', width: `${bPct}%`, background: bColor, borderRadius: 99 }} />
                                            </div>
                                            <p style={{ fontSize: 10, color: '#475569', margin: '4px 0 0', fontFamily: 'monospace' }}>
                                              [{Math.round(box.xmin)}, {Math.round(box.ymin)}] → [{Math.round(box.xmax)}, {Math.round(box.ymax)}]
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Canvas with bounding boxes drawn on uploaded image */}
                              <div>
                                <p style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                                  Detected Regions on Your Image
                                </p>
                                {imagePreview && boxes.length > 0 ? (
                                  <div style={{ borderRadius: 8, overflow: 'hidden', border: '1.5px solid #22c55e33' }}>
                                    <canvas
                                      ref={canvasRef}
                                      width={560}
                                      style={{ width: '100%', display: 'block' }}
                                    />
                                  </div>
                                ) : imagePreview ? (
                                  <div style={{ borderRadius: 8, overflow: 'hidden', border: '1.5px solid #334155' }}>
                                    <img
                                      src={imagePreview}
                                      alt="Analyzed — no pest regions found"
                                      style={{ width: '100%', display: 'block', objectFit: 'contain' }}
                                    />
                                    <div style={{ background: '#1e293b', padding: '6px 10px', textAlign: 'center' }}>
                                      <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>No pest regions were identified in this image.</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ background: '#1e293b', borderRadius: 8, padding: '20px', textAlign: 'center' }}>
                                    <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>No image available.</p>
                                  </div>
                                )}
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    };

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                        {/* ── Header: Pest name ── */}
                        <div style={{ background: noPest ? '#f9fafb' : '#eff6ff', border: `1px solid ${noPest ? '#e5e7eb' : '#bfdbfe'}`, borderRadius: 12, padding: 16 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: noPest ? '#6b7280' : '#1d4ed8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detection Result</p>
                          <p style={{ fontSize: 24, fontWeight: 800, color: noPest ? '#374151' : '#1a1a1a', margin: '0 0 4px' }}>
                            {noPest ? '🔍 No Pest Detected' : pestName}
                          </p>
                          {!noPest && (detectionResult.scientific_name || pestData?.scientificName) && (
                            <p style={{ fontSize: 13, fontStyle: 'italic', color: '#555', margin: 0 }}>{detectionResult.scientific_name || pestData?.scientificName}</p>
                          )}
                          {noPest && (
                            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0', lineHeight: 1.5 }}>
                              {detectionResult.message}
                            </p>
                          )}
                        </div>

                        {/* ── Confidence Meter ── */}
                        <div style={{ background: confBg, border: `1.5px solid ${confBorder}`, borderRadius: 14, padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: confColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Activity size={18} color={confColor} />
                              </div>
                              <div>
                                <p style={{ fontWeight: 700, fontSize: 13, color: confColor, margin: 0 }}>{confLabel}</p>
                                <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>AI Model Confidence</p>
                              </div>
                            </div>
                            <span style={{ fontSize: 28, fontWeight: 800, color: confColor, lineHeight: 1 }}>{confPct}%</span>
                          </div>
                          {/* Progress bar */}
                          <div style={{ height: 10, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                            <div style={{
                              height: '100%',
                              width: `${confPct}%`,
                              background: `linear-gradient(90deg, ${confColor}99, ${confColor})`,
                              borderRadius: 99,
                              transition: 'width 0.6s ease',
                            }} />
                          </div>
                          {/* Tick marks */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            {['0%','25%','50%','75%','100%'].map(t => (
                              <span key={t} style={{ fontSize: 9, color: '#9ca3af' }}>{t}</span>
                            ))}
                          </div>
                          <p style={{ fontSize: 12, color: '#555', margin: 0, lineHeight: 1.5 }}>{confDesc}</p>
                        </div>

                        {/* ── Advanced: How was this detected? ── */}
                        <BoundingBoxPanel />

                        {/* ── Accuracy Metrics Grid ── */}
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📊 Detection Parameters</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

                            {/* Confidence score */}
                            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px' }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Confidence Score</p>
                              <p style={{ fontSize: 20, fontWeight: 800, color: confColor, margin: 0 }}>{confPct}%</p>
                              <div style={{ height: 4, background: '#e5e7eb', borderRadius: 99, marginTop: 6, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${confPct}%`, background: confColor, borderRadius: 99 }} />
                              </div>
                            </div>

                            {/* Detections count */}
                            <div style={{ background: noPest ? '#f9fafb' : '#f0f9ff', border: `1px solid ${noPest ? '#e5e7eb' : '#bae6fd'}`, borderRadius: 10, padding: '10px 12px' }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Instances Found</p>
                              <p style={{ fontSize: 20, fontWeight: 800, color: noPest ? '#6b7280' : '#0369a1', margin: '0 0 2px' }}>{numDetections}</p>
                              <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>{noPest ? 'no pest regions found' : `pest region${numDetections !== 1 ? 's' : ''} detected`}</p>
                            </div>

                            {/* Crop type — only show when a pest was found */}
                            {!noPest && (
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 12px' }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Crop Type</p>
                              <p style={{ fontSize: 20, fontWeight: 800, color: '#15803d', margin: '0 0 2px', textTransform: 'capitalize' }}>
                                {detectionResult.crop_type || 'Rice'}
                              </p>
                              <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>analyzed crop</p>
                            </div>
                            )}
                          </div>
                        </div>

                        {/* ── Symptoms / Evidence ── */}
                        {!noPest && symptoms && (
                          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 14px' }}>
                            <p style={{ fontWeight: 700, fontSize: 13, color: '#c2410c', marginBottom: 6 }}>🌿 Observed Symptoms</p>
                            <p style={{ fontSize: 13, color: '#7c2d12', margin: 0, lineHeight: 1.55 }}>{symptoms}</p>
                          </div>
                        )}

                        {/* ── Confidence Interpretation Guide ── */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
                          <p style={{ fontWeight: 700, fontSize: 12, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>How to Read Confidence</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {[
                              { range: '80–100%', color: '#16a34a', bg: '#f0fdf4', label: 'High', desc: 'Very likely correct — strong visual match' },
                              { range: '55–79%', color: '#d97706', bg: '#fffbeb', label: 'Moderate', desc: 'Probable match — verify with reference images' },
                              { range: '0–54%', color: '#dc2626', bg: '#fef2f2', label: 'Low', desc: 'Uncertain — carefully compare before confirming' },
                            ].map(({ range, color, bg, label, desc }) => (
                              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: bg, borderRadius: 7, padding: '6px 10px' }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color, minWidth: 52 }}>{range}</span>
                                <div>
                                  <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}: </span>
                                  <span style={{ fontSize: 11, color: '#555' }}>{desc}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ── Your Captured Image ── */}
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', marginBottom: 8, textAlign: 'center' }}>Your Captured Image</p>
                          <div style={{ border: '2px solid #60a5fa', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                            {imagePreview ? (
                              <img src={imagePreview} alt="Your captured pest" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
                                <AlertCircle size={32} color="#9ca3af" style={{ marginBottom: 8 }} />
                                <p style={{ fontSize: 12, color: '#9ca3af' }}>Image not available</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ── Reference Images ── */}
                        {!noPest && (
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#15803d', marginBottom: 8, textAlign: 'center' }}>
                            {referenceImages.length > 1 ? 'Reference Images' : 'Reference Pest'}
                          </p>
                          {referenceImages.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: referenceImages.length > 1 ? '1fr 1fr' : '1fr', gap: 10 }}>
                              {referenceImages.map((refImg, i) => (
                                <div key={i} style={{ border: '2px solid #4ade80', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                                  <div style={{ position: 'relative' }}>
                                    <img
                                      src={refImg.url || refImg}
                                      alt={`Reference: ${pestName}`}
                                      style={{ width: '100%', height: 150, objectFit: 'cover' }}
                                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                                    />
                                    <div style={{ display: 'none', width: '100%', height: 150, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
                                      <AlertCircle size={32} color="#9ca3af" style={{ marginBottom: 8 }} />
                                      <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '0 12px' }}>Reference image not available</p>
                                    </div>
                                    {refImg.stage && (
                                      <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>
                                        {refImg.stage}
                                      </div>
                                    )}
                                  </div>
                                  {refImg.description && (
                                    <p style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', padding: '4px 8px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                                      {refImg.description}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ border: '2px solid #4ade80', borderRadius: 10, overflow: 'hidden' }}>
                              <div style={{ width: '100%', height: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
                                <AlertCircle size={32} color="#9ca3af" style={{ marginBottom: 8 }} />
                                <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '0 12px' }}>Reference image not available</p>
                              </div>
                            </div>
                          )}
                        </div>
                        )}

                        {/* ── Reference Damage Image ── */}
                        {!noPest && (() => {
                          const referenceDamageImage = pestData?.damageImage || null;
                          return (
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 8, textAlign: 'center' }}>Reference Damage Pattern</p>
                              <div style={{ border: '2px solid #f87171', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                                {referenceDamageImage ? (
                                  <div style={{ position: 'relative' }}>
                                    <img
                                      src={referenceDamageImage}
                                      alt={`Typical damage from ${pestName}`}
                                      style={{ width: '100%', height: 200, objectFit: 'cover' }}
                                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                                    />
                                    <div style={{ display: 'none', width: '100%', height: 200, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
                                      <AlertCircle size={32} color="#9ca3af" style={{ marginBottom: 8 }} />
                                      <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '0 12px' }}>Reference damage image not available</p>
                                    </div>
                                    <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(127,29,29,0.8)', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 4 }}>
                                      Typical {pestName} Damage
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ width: '100%', height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
                                    <AlertCircle size={32} color="#9ca3af" style={{ marginBottom: 8 }} />
                                    <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '0 12px' }}>Reference damage image not available</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* ── Identification Tips ── */}
                        {!noPest && identificationTips.length > 0 && (
                          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px' }}>
                            <p style={{ fontWeight: 700, fontSize: 13, color: '#1d4ed8', marginBottom: 8 }}>🔍 Identification Tips:</p>
                            <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {identificationTips.slice(0, 5).map((t, i) => <li key={i} style={{ fontSize: 12, color: '#334155' }}>{t}</li>)}
                            </ul>
                          </div>
                        )}

                        {/* ── Comparison Tips (pest found) / Retry Tips (no pest) ── */}
                        {noPest ? (
                          <div style={{ background: '#fefce8', border: '1px solid #fbbf24', borderRadius: 10, padding: '12px 14px' }}>
                            <p style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 8 }}>📸 Tips for a Better Photo:</p>
                            <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {['Move closer to the affected plant or pest', 'Ensure good lighting — avoid shadows', 'Keep the camera steady to avoid blur', 'Focus on the damaged leaf, stem, or insect', 'Capture the pest directly, not just the damage'].map((t, i) => (
                                <li key={i} style={{ fontSize: 12, color: '#78350f' }}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                        <div style={{ background: '#fefce8', border: '1px solid #fbbf24', borderRadius: 10, padding: '12px 14px' }}>
                          <p style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 8 }}>📋 Comparison Tips:</p>
                          <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {['Compare body color and patterns', 'Check body shape and size', 'Look for distinctive markings', 'Compare damage patterns', 'Verify feeding marks and symptoms'].map((t, i) => (
                              <li key={i} style={{ fontSize: 12, color: '#78350f' }}>{t}</li>
                            ))}
                          </ul>
                        </div>
                        )}

                        {/* ── Confirm / Reject ── */}
                        <div style={{ textAlign: 'center' }}>
                          {noPest ? (
                            <>
                              <p style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 12 }}>Would you like to try with a different image?</p>
                              <button
                                onClick={() => confirmDetection(false)}
                                style={{ width: '100%', padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                              >
                                🔄 Try Another Image
                              </button>
                            </>
                          ) : (
                            <>
                              <p style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 12 }}>Does your image match the reference pest and damage pattern?</p>
                              <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => confirmDetection(true)} style={{ flex: 1, padding: '14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                  <ThumbsUp size={18} /> Yes, Matches
                                </button>
                                <button onClick={() => confirmDetection(false)} style={{ flex: 1, padding: '14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                  <ThumbsDown size={18} /> No, Different
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                      </div>
                    );
                  })()}

                  {/* Assessment Step */}
                  {detectionStep === 'assessment' && detectionResult && (() => {
                    const pestName = detectionResult.pest_name || detectionResult.pest || '';
                    const pestData = getPestById(pestName) || getPestById(pestName.toLowerCase().replace(/\s+/g, '-'));
                    const controlList = (detectionResult.control_methods?.length > 0 ? detectionResult.control_methods : (pestData?.controlMethods || '').split(',').map(s => s.trim()).filter(Boolean));
                    const preventionList = (detectionResult.prevention?.length > 0 ? detectionResult.prevention : (pestData?.prevention || '').split(',').map(s => s.trim()).filter(Boolean));
                    const refSymptoms = pestData?.symptoms || detectionResult.symptoms || '';
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 14 }}>
                          <p style={{ fontWeight: 700, fontSize: 16, color: '#166534', margin: '0 0 2px' }}>Detected: {detectionResult.pest_name || detectionResult.pest}</p>
                          {(detectionResult.scientific_name || pestData?.scientificName) && <p style={{ fontSize: 13, fontStyle: 'italic', color: '#15803d', margin: 0 }}>{detectionResult.scientific_name || pestData?.scientificName}</p>}
                        </div>
                        {(controlList.length > 0 || preventionList.length > 0 || refSymptoms) && (
                          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                            <div style={{ background: 'linear-gradient(to right, #fef2f2, #fff7ed)', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Shield size={18} color="#dc2626" />
                              <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>Control Methods & Recommendations</span>
                            </div>
                            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                              {refSymptoms && (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><Bug size={15} color="#d97706" /><p style={{ fontWeight: 600, fontSize: 13, color: '#555', margin: 0 }}>Damage Signs</p></div>
                                  <p style={{ fontSize: 13, color: '#555', background: '#fefce8', border: '1px solid #fef08a', borderRadius: 8, padding: '10px 12px', margin: 0, lineHeight: 1.6 }}>{refSymptoms}</p>
                                </div>
                              )}
                              {controlList.length > 0 && (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><Shield size={15} color="#dc2626" /><p style={{ fontWeight: 600, fontSize: 13, color: '#555', margin: 0 }}>How to Control</p></div>
                                  {controlList.map((m, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                                      <span style={{ background: '#fecaca', color: '#991b1b', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                                      <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.5 }}>{m}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {preventionList.length > 0 && (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><Leaf size={15} color="#16a34a" /><p style={{ fontWeight: 600, fontSize: 13, color: '#555', margin: 0 }}>Prevention</p></div>
                                  {preventionList.map((t, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                                      <CheckCircle size={15} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
                                      <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.5 }}>{t}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Location choice */}
                        <div>
                          <label style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', display: 'block', marginBottom: 10 }}>📍 Pin Location <span style={{ color: '#dc2626' }}>*</span></label>
                          {!user.is_verified && (
                            <div style={{ background: '#fefce8', border: '1px solid #fbbf24', borderRadius: 10, padding: '10px 12px', marginBottom: 12, display: 'flex', gap: 8 }}>
                              <AlertTriangle size={17} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                              <div>
                                <p style={{ fontWeight: 700, fontSize: 13, color: '#92400e', margin: '0 0 2px' }}>Unverified Account</p>
                                <p style={{ fontSize: 12, color: '#78350f', margin: 0 }}>Your detection will use your current GPS location.</p>
                              </div>
                            </div>
                          )}
                          {user.is_verified ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                              {[['farm', 'Farm Location', 'Pin on your farm', MapPin, '#16a34a', '#dcfce7', '#bbf7d0'], ['current', 'Current Location', 'Use GPS coordinates', Activity, '#1a73e8', '#eff6ff', '#bfdbfe']].map(([val, label, sub, Icon, color, bg, border]) => (
                                <button key={val} type="button" onClick={() => setLocationChoice(val)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 10px', borderRadius: 12, border: `2px solid ${locationChoice === val ? border : '#e5e7eb'}`, background: locationChoice === val ? bg : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                                  <Icon size={22} color={locationChoice === val ? color : '#9ca3af'} style={{ marginBottom: 6 }} />
                                  <span style={{ fontWeight: 700, fontSize: 13, color: locationChoice === val ? color : '#555' }}>{label}</span>
                                  <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div style={{ padding: '14px', background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12 }}>
                              <Activity size={22} color="#1a73e8" style={{ marginBottom: 6 }} />
                              <span style={{ fontWeight: 700, fontSize: 13, color: '#1d4ed8' }}>Current Location</span>
                            </div>
                          )}
                        </div>
                        {/* Farm selection */}
                        {locationChoice === 'farm' && (
                          <div>
                            <label style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', display: 'block', marginBottom: 8 }}>Select Farm <span style={{ color: '#dc2626' }}>*</span></label>
                            <select value={selectedFarm || ''} onChange={e => setSelectedFarm(e.target.value ? parseInt(e.target.value) : null)} style={{ width: '100%', padding: '11px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none' }}>
                              <option value="">Choose a farm...</option>
                              {farms.filter(f => f.user_name === user.username).map(f => <option key={f.id} value={f.id}>{f.name} - {f.crop_type} ({f.size} ha){f.barangay ? ` · ${f.barangay}` : ''}</option>)}
                            </select>
                            {!selectedFarm && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>Please select a farm to save the detection</p>}
                            {farms.filter(f => f.user_name === user.username).length === 0 && (
                              <div style={{ marginTop: 8, background: '#fefce8', border: '1px solid #fbbf24', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#92400e' }}>
                                You don't have any approved farms yet.
                              </div>
                            )}
                            {selectedFarm && (() => {
                              const farm = farms.find(f => f.id === selectedFarm);
                              return (
                                <div style={{ marginTop: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#166534' }}>
                                  ✅ Pinned at <strong>{farm?.name}</strong>
                                  {farm?.barangay && <span> · <strong>{farm.barangay}</strong>, Magalang</span>}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        {locationChoice === 'current' && location && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#1d4ed8' }}>
                              <p style={{ fontWeight: 600, marginBottom: 4 }}>📍 Current GPS Coordinates:</p>
                              <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 12 }}>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
                            </div>
                            <div>
                              <label style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', display: 'block', marginBottom: 6 }}>Your Barangay <span style={{ color: '#dc2626' }}>*</span></label>
                              <select value={selectedBarangay} onChange={e => setSelectedBarangay(e.target.value)} style={{ width: '100%', padding: '11px 12px', border: `1px solid ${!selectedBarangay ? '#fca5a5' : '#e0e0e0'}`, borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' }}>
                                <option value="">Select barangay...</option>
                                {['Alagao','Baliti','Brgy. 1 Poblacion','Brgy. 2 Poblacion','Brgy. 3 Poblacion','Brgy. 4 Poblacion','Brgy. 5 Poblacion','Brgy. 6 Poblacion','Brgy. 7 Poblacion','Brgy. 8 Poblacion','Camias','Dolores','Escaler','La Paz','Navaling','Niugan','Paguiruan','Pandapog','San Agustin','San Francisco','San Ildefonso','San Isidro','San Jose','San Miguel','San Nicolas','San Roque','San Vicente','Santa Cruz','Santa Lucia','Santa Maria','Santo Niño','Santo Rosario','Taguig','Vizal San Pablo','Vizal Santo Cristo','Vizal Santo Niño'].map(b => (
                                  <option key={b} value={b}>{b}</option>
                                ))}
                              </select>
                              {!selectedBarangay && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>Please select your barangay</p>}
                            </div>
                          </div>
                        )}
                        {/* Damage level */}
                        <div>
                          <label style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', display: 'block', marginBottom: 10 }}>Damage Level: <span style={{ color: '#1a73e8' }}>Level {damageLevel}</span></label>
                          <input type="range" min={0} max={5} value={damageLevel} onChange={e => setDamageLevel(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#1a73e8' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                            {[0,1,2,3,4,5].map(n => <span key={n} style={{ fontSize: 11, color: '#888' }}>{n}</span>)}
                          </div>
                          <div style={{ marginTop: 10, textAlign: 'center', padding: '12px', borderRadius: 10, border: '2px solid #e5e7eb', background: '#f9fafb' }}>
                            <p style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a', margin: 0 }}>Level {damageLevel}: {getDamageLevelText(damageLevel)}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={saveDetection} disabled={detectionLoading || (locationChoice === 'farm' && !selectedFarm) || (locationChoice === 'current' && !selectedBarangay)} style={{ flex: 1, padding: '14px', background: (detectionLoading || (locationChoice === 'farm' && !selectedFarm) || (locationChoice === 'current' && !selectedBarangay)) ? '#9ca3af' : '#1a73e8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: (detectionLoading || (locationChoice === 'farm' && !selectedFarm) || (locationChoice === 'current' && !selectedBarangay)) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {detectionLoading ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={18} /> Save Detection</>}
                          </button>
                          <button onClick={() => setDetectionStep('confirm')} style={{ padding: '14px 20px', background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Back</button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Success Step */}
                  {detectionStep === 'success' && detectionResult && (() => {
                    const pestName = detectionResult.pest_name || detectionResult.pest || '';
                    const pestData = getPestById(pestName) || getPestById(pestName.toLowerCase().replace(/\s+/g, '-'));
                    const controlList = (detectionResult.control_methods?.length > 0 ? detectionResult.control_methods : (pestData?.controlMethods || '').split(',').map(s => s.trim()).filter(Boolean));
                    const preventionList = (detectionResult.prevention?.length > 0 ? detectionResult.prevention : (pestData?.prevention || '').split(',').map(s => s.trim()).filter(Boolean));
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <div style={{ padding: '32px 0', textAlign: 'center' }}>
                          <div style={{ width: 80, height: 80, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <CheckCircle size={48} color="#16a34a" />
                          </div>
                          <h3 style={{ fontWeight: 800, fontSize: 22, color: '#1a1a1a', marginBottom: 6 }}>Detection Saved!</h3>
                          <p style={{ color: '#888', fontSize: 14 }}>The infestation has been recorded and will appear on the map.</p>
                        </div>
                        {(controlList.length > 0 || preventionList.length > 0) && (
                          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                            <div style={{ background: 'linear-gradient(to right, #eff6ff, #f0fdf4)', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Shield size={18} color="#1a73e8" />
                              <span style={{ fontWeight: 700, fontSize: 14 }}>Quick Action Guide — {pestName}</span>
                            </div>
                            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                              {controlList.length > 0 && <div><p style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Immediate Actions</p>{controlList.slice(0,3).map((m,i) => <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#555', marginBottom: 4 }}><span style={{ color: '#dc2626', flexShrink: 0 }}>•</span>{m}</div>)}</div>}
                              {preventionList.length > 0 && <div><p style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Prevention</p>{preventionList.slice(0,3).map((t,i) => <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#555', marginBottom: 4 }}><span style={{ color: '#16a34a', flexShrink: 0 }}>•</span>{t}</div>)}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Resolve Confirmation Modal ── */}
        {showResolveConfirm && (
          <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10002 }} onClick={() => { setShowResolveConfirm(false); setSelectedInfestationToResolve(null); }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10003, background: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 380, boxShadow: '0 8px 40px rgba(0,0,0,0.22)' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <CheckCircle size={32} color="#16a34a" />
                </div>
                <h2 style={{ fontWeight: 700, fontSize: 18, color: '#1a1a1a', marginBottom: 8 }}>Confirm Resolution</h2>
                <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Are you sure you want to mark this infestation as resolved?</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={resolveInfestation} style={{ flex: 1, padding: '11px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Yes, Resolve</button>
                <button onClick={() => { setShowResolveConfirm(false); setSelectedInfestationToResolve(null); }} style={{ flex: 1, padding: '11px', background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </>
        )}

      </div>{/* end map wrapper */}
    </div>
  );
};

export default HeatMap;