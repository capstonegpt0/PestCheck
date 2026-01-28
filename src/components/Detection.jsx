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
      console.log('Sending detection request...');
      console.log('Crop type:', cropType);
      console.log('Location:', location);
      
      const response = await api.post('/detections/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Detection response:', response.data);

      // Check if we got valid pest detection
      if (!response.data.pest_name || response.data.pest_name === 'Unknown Pest' || response.data.pest_name === '') {
        setError('No pest detected in the image. Please try another image with clearer pest visibility.');
        setCanRetry(true);
      } else {
        // Valid detection
        setResult(response.data);
      }
    } catch (error) {
      console.error('Detection error:', error);
      console.error('Error response:', error.response?.data);

      const errorData = error.response?.data;
      
      if (error.response?.status === 503) {
        setError('ML service is warming up. Please wait 30 seconds and try again.');
        setCanRetry(true);
      } else if (error.response?.status === 504) {
        setError('ML service is taking longer than expected. Please try again.');
        setCanRetry(true);
      } else if (errorData?.error) {
        setError(errorData.error);
        if (errorData.retry) {
          setCanRetry(true);
        }
      } else if (typeof errorData === 'object') {
        // Handle validation errors
        const errorMessages = Object.entries(errorData)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\n');
        setError(errorMessages);
      } else {
        setError('Detection failed. Please try again.');
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
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} onLogout={onLogout} />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">AI Pest Detection</h1>
          <p className="text-gray-600">Upload or capture an image to identify pests and get treatment recommendations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Image Upload */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Select Crop Type</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setCropType('rice')}
                  className={`p-4 rounded-lg font-semibold transition-all ${
                    cropType === 'rice'
                      ? 'bg-green-600 text-white shadow-md transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🌾 Rice
                </button>
                <button
                  onClick={() => setCropType('corn')}
                  className={`p-4 rounded-lg font-semibold transition-all ${
                    cropType === 'corn'
                      ? 'bg-yellow-600 text-white shadow-md transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🌽 Corn
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Upload Image</h2>
              
              {location && (
                <div className="mb-4 flex items-center text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                  <span>Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload
                </button>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Camera
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

              {preview && (
                <div className="mb-6">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-auto rounded-lg shadow-md border-2 border-gray-200"
                  />
                </div>
              )}

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-red-800 whitespace-pre-line">{error}</p>
                      {canRetry && (
                        <p className="text-xs text-red-600 mt-2">
                          💡 Tip: Make sure the image clearly shows the pest. You can try again with a better photo.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {preview && !result && (
                <div className="space-y-3">
                  <button
                    onClick={handleDetect}
                    disabled={loading || locationLoading}
                    className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin mr-2 w-5 h-5" />
                        Analyzing Image...
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
                    className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Results */}
          <div>
            {result ? (
              <div className="space-y-6">
                {/* Detection Results */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Detection Results</h2>
                  
                  <div className={`border-2 rounded-lg p-4 mb-6 ${getSeverityColor(result.severity)}`}>
                    <div className="flex items-center mb-2">
                      {getSeverityIcon(result.severity)}
                      <span className="ml-2 text-lg font-bold uppercase">{result.severity} Risk</span>
                    </div>
                    <p className="text-sm">Immediate attention {result.severity === 'critical' || result.severity === 'high' ? 'required' : 'recommended'}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="font-semibold text-gray-700">Pest Identified:</span>
                      <span className="text-lg font-bold text-gray-900">{result.pest_name}</span>
                    </div>
                    
                    {result.scientific_name && (
                      <div className="flex justify-between items-center pb-3 border-b">
                        <span className="font-semibold text-gray-700">Scientific Name:</span>
                        <span className="text-sm italic text-gray-600">{result.scientific_name}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="font-semibold text-gray-700">Crop Type:</span>
                      <span className="text-gray-900 capitalize">{result.crop_type}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="font-semibold text-gray-700">Confidence:</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${result.confidence * 100}%` }}
                          ></div>
                        </div>
                        <span className="font-semibold">{(result.confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    {result.num_detections > 1 && (
                      <div className="flex justify-between items-center pb-3 border-b">
                        <span className="font-semibold text-gray-700">Pests Detected:</span>
                        <span className="font-semibold text-red-600">{result.num_detections}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Symptoms */}
                {result.symptoms && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
                      Symptoms
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{result.symptoms}</p>
                  </div>
                )}

                {/* Control Methods */}
                {result.control_methods && result.control_methods.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                      Control Methods
                    </h3>
                    <ul className="space-y-2">
                      {result.control_methods.map((method, index) => (
                        <li key={index} className="flex items-start">
                          <span className="inline-block w-6 h-6 bg-green-100 text-green-700 rounded-full text-center font-semibold text-sm mr-3 flex-shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <span className="text-gray-700">{method}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prevention */}
                {result.prevention && result.prevention.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
                      <Info className="w-5 h-5 mr-2 text-blue-600" />
                      Prevention Tips
                    </h3>
                    <ul className="space-y-2">
                      {result.prevention.map((tip, index) => (
                        <li key={index} className="flex items-start">
                          <span className="inline-block w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-center font-semibold text-sm mr-3 flex-shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <span className="text-gray-700">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={resetDetection}
                  className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-lg"
                >
                  Analyze Another Image
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center h-full flex items-center justify-center">
                <div>
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Detection Yet</h3>
                  <p className="text-gray-600">
                    Upload or capture an image to start pest detection
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How it works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <span className="font-semibold">1. Select Crop:</span> Choose rice or corn to optimize detection
            </div>
            <div>
              <span className="font-semibold">2. Upload Image:</span> Capture or upload a clear photo of the affected area
            </div>
            <div>
              <span className="font-semibold">3. Get Results:</span> Receive instant pest identification and treatment guidance
            </div>
          </div>
          <div className="mt-4 text-xs text-blue-700 bg-blue-100 p-3 rounded">
            ℹ️ <strong>Note:</strong> The first detection may take 30-60 seconds as the ML service warms up. Subsequent detections will be faster.
          </div>
          <div className="mt-2 text-xs text-blue-700 bg-blue-100 p-3 rounded">
            📸 <strong>Tip:</strong> For best results, ensure the pest is clearly visible in the image with good lighting and focus.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Detection;