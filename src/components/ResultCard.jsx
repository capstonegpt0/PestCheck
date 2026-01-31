import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

const ResultCard = ({ result }) => {
  if (!result) return null;

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'border-red-500 bg-red-50 text-red-900';
      case 'high':
        return 'border-orange-500 bg-orange-50 text-orange-900';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50 text-yellow-900';
      case 'low':
        return 'border-green-500 bg-green-50 text-green-900';
      default:
        return 'border-gray-500 bg-gray-50 text-gray-900';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-6 h-6 text-orange-600" />;
      case 'medium':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'low':
        return <Info className="w-6 h-6 text-green-600" />;
      default:
        return <Info className="w-6 h-6 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Detection Results Card */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Detection Results</h2>
        
        {/* Severity Alert */}
        <div className={`border-2 rounded-lg p-4 mb-6 ${getSeverityColor(result.severity)}`}>
          <div className="flex items-center mb-2">
            {getSeverityIcon(result.severity)}
            <span className="ml-2 text-lg font-bold uppercase">
              {result.severity || 'Unknown'} Risk
            </span>
          </div>
          <p className="text-sm">
            Immediate attention {result.severity === 'critical' || result.severity === 'high' ? 'required' : 'recommended'}
          </p>
        </div>

        {/* Detection Details */}
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-3 border-b">
            <span className="font-semibold text-gray-700">Pest Identified:</span>
            <span className="text-lg font-bold text-gray-900">
              {result.pest_name || result.pest || 'Unknown'}
            </span>
          </div>
          
          {result.scientific_name && (
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="font-semibold text-gray-700">Scientific Name:</span>
              <span className="text-sm italic text-gray-600">{result.scientific_name}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center pb-3 border-b">
            <span className="font-semibold text-gray-700">Confidence:</span>
            <div className="flex items-center">
              <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${(result.confidence || 0) * 100}%` }}
                ></div>
              </div>
              <span className="font-semibold">
                {((result.confidence || 0) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {result.crop_type && (
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="font-semibold text-gray-700">Crop Type:</span>
              <span className="text-gray-900 capitalize">{result.crop_type}</span>
            </div>
          )}

          {result.address && (
            <div className="flex justify-between items-start pb-3 border-b">
              <span className="font-semibold text-gray-700">Location:</span>
              <span className="text-sm text-gray-600 text-right max-w-xs">{result.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Control Methods Card */}
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

      {/* Prevention Tips Card */}
      {result.prevention && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
            <Info className="w-5 h-5 mr-2 text-blue-600" />
            Prevention Tips
          </h3>
          <p className="text-gray-700 whitespace-pre-line">{result.prevention}</p>
        </div>
      )}

      {/* Symptoms Card */}
      {result.symptoms && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
            Symptoms
          </h3>
          <p className="text-gray-700 whitespace-pre-line">{result.symptoms}</p>
        </div>
      )}

      {/* Description Card */}
      {result.description && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">Description</h3>
          <p className="text-gray-700 whitespace-pre-line">{result.description}</p>
        </div>
      )}
    </div>
  );
};

export default ResultCard;