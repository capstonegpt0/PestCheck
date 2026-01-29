import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader, MapPin, AlertCircle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import Navigation from './Navigation';
import api from '../utils/api';

const Detection = ({ user, onLogout }) => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [cropType, setCropType] = useState('rice');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canRetry, setCanRetry] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
      setCanRetry(false);
    }
  };

  const handleDetect = async () => {
    if (!image || !location) {
      alert('Please select an image and ensure location is available');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    setCanRetry(false);

    const formData = new FormData();
    formData.append('image', image);
    formData.append('crop_type', cropType);
    formData.append('severity', 'low');
    formData.append('latitude', location.latitude);
    formData.append('longitude', location.longitude);
    formData.append('address', 'Magalang, Pampanga');

    try {
      console.log('🚀 Starting detection...');
      console.log('📤 Crop type:', cropType);
      console.log('📤 Image:', image.name);
      
      const response = await api.post('/detections/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('✅ Response received:', response);
      console.log('✅ Status:', response.status);
      console.log('✅ Data:', response.data);

      // ✅ SUCCESS - Backend accepted the detection
      if (response.status === 201 && response.data) {
        const pestName = response.data.pest_name || response.data.pest;
        console.log('✅ Pest detected:', pestName);
        
        // Check if we got a valid pest
        if (pestName && pestName !== 'Unknown Pest' && pestName !== '') {
          console.log('✅ Valid pest detection - setting result');
          setResult(response.data);
          setError(null);
        } else {
          console.warn('⚠️ Empty or unknown pest name');
          setError('No pest detected in the image. Please try another image with clearer pest visibility.');
          setCanRetry(true);
          setResult(null);
        }
      } else {
        console.warn('⚠️ Unexpected response status:', response.status);
        setError('Unexpected response from server. Please try again.');
        setCanRetry(true);
      }

    } catch (error) {
      console.error('❌ Detection error:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);

      setResult(null);

      if (error.response?.status === 400) {
        // Backend validation rejected it
        const errorMsg = error.response.data?.error || 'No pest detected in the image. Please try another image.';
        console.log('❌ Backend rejected:', errorMsg);
        setError(errorMsg);
        setCanRetry(true);
      } else if (error.response?.status === 503) {
        setError('ML service is warming up. Please wait 30 seconds and try again.');
        setCanRetry(true);
      } else if (error.response?.status === 504) {
        setError('ML service is taking longer than expected. Please try again.');
        setCanRetry(true);
      } else if (error.response?.data?.error) {
        setError(error.response.data.error);
        setCanRetry(error.response.data.retry || false);
      } else {
        setError('Detection failed. Please try again.');
        setCanRetry(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetDetection = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setCanRetry(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      critical: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[severity] || colors.low;
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical' || severity === 'high') {
      return <AlertCircle className="w-5 h-5" />;
    }
    return <Info className="w-5 h-5" />;
  };

  return (
  <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
    <Navigation user={user} onLogout={onLogout} />
    
    <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8">
      <div className="mb-4 md:mb-8">
        <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-2">AI Pest Detection</h1>
        <p className="text-sm md:text-base text-gray-600">Upload or capture an image to identify pests</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Left Panel - Image Upload */}
        <div className="space-y-4 md:space-y-6">
          {/* Crop Selection - Make buttons bigger on mobile */}
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4">
              1. Select Crop Type
            </h2>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <button
                onClick={() => setCropType('rice')}
                className={`p-3 md:p-4 rounded-lg font-semibold transition-all text-sm md:text-base ${
                  cropType === 'rice'
                    ? 'bg-green-600 text-white shadow-md transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🌾 Rice
              </button>
              <button
                onClick={() => setCropType('corn')}
                className={`p-3 md:p-4 rounded-lg font-semibold transition-all text-sm md:text-base ${
                  cropType === 'corn'
                    ? 'bg-yellow-600 text-white shadow-md transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🌽 Corn
              </button>
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4">
              2. Upload Image
            </h2>
            
            {location && (
              <div className="mb-3 md:mb-4 flex items-center text-xs md:text-sm text-gray-600 bg-blue-50 p-2 md:p-3 rounded-lg">
                <MapPin className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
                <span className="truncate">
                  Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </span>
              </div>
            )}

            {/* Bigger buttons on mobile */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col md:flex-row items-center justify-center px-4 py-4 md:py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm md:text-base"
              >
                <Upload className="w-6 h-6 md:w-5 md:h-5 mb-1 md:mb-0 md:mr-2" />
                <span>Upload</span>
              </button>
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col md:flex-row items-center justify-center px-4 py-4 md:py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm md:text-base"
              >
                <Camera className="w-6 h-6 md:w-5 md:h-5 mb-1 md:mb-0 md:mr-2" />
                <span>Camera</span>
              </button>
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

            {/* Mobile-friendly tip */}
            <div className="mb-4 text-xs md:text-sm text-gray-500 bg-gray-50 p-2 md:p-3 rounded">
              <strong>💡 Mobile Tip:</strong> Camera button opens your device camera for instant capture!
            </div>

            {preview && (
              <div className="mb-4 md:mb-6">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-auto rounded-lg shadow-md border-2 border-gray-200"
                />
              </div>
            )}

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 md:p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 md:mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs md:text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {preview && !result && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <button
                  onClick={handleDetect}
                  disabled={loading || locationLoading}
                  className="col-span-1 md:col-span-2 bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed text-sm md:text-base"
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin mr-2 w-5 h-5" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Detect Pest
                    </>
                  )}
                </button>
                <button
                  onClick={resetDetection}
                  className="col-span-1 md:col-span-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-sm md:text-base"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Results (stacks below on mobile) */}
        <div>
          {result ? (
            <div className="space-y-4 md:space-y-6">
              {/* Results cards with mobile-friendly sizing */}
              {/* ... rest of results display ... */}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 text-center h-full flex items-center justify-center">
              <div>
                <div className="w-16 h-16 md:w-24 md:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 md:w-12 md:h-12 text-gray-400" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">
                  No Detection Yet
                </h3>
                <p className="text-sm md:text-base text-gray-600">
                  Upload or capture an image to start
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Section - Smaller text on mobile */}
      <div className="mt-6 md:mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-blue-900 mb-2">
          How it works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 text-xs md:text-sm text-blue-800">
          <div>
            <span className="font-semibold">1. Select Crop:</span> Choose rice or corn
          </div>
          <div>
            <span className="font-semibold">2. Upload Image:</span> Capture or upload a photo
          </div>
          <div>
            <span className="font-semibold">3. Get Results:</span> Receive instant identification
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Detection;