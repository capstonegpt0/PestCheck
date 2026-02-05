import React from 'react';
import { Map, Book, User, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navigation from './Navigation';
import AlertNotifications from './AlertNotifications';

const Dashboard = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} onLogout={onLogout} />
      
      {/* ✅ NEW: Proximity Alert Notifications */}
      <AlertNotifications user={user} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-8 mb-8 text-white">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {user.first_name || user.username}! ðŸ‘‹
          </h1>
          <p className="text-lg text-green-100">
            Ready to protect your crops? Choose an option below to get started.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/heatmap"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105 group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <Map className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Detect & Map
              </h3>
              <p className="text-gray-600 text-sm">
                Detect pests and track infestations on the map
              </p>
            </div>
          </Link>

          <Link
            to="/pests"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105 group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-yellow-200 transition-colors">
                <Book className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Pest Library
              </h3>
              <p className="text-gray-600 text-sm">
                Learn about common pests and control methods
              </p>
            </div>
          </Link>

          <Link
            to="/profile"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105 group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                <User className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                My Profile
              </h3>
              <p className="text-gray-600 text-sm">
                View your detection history and account settings
              </p>
            </div>
          </Link>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            ðŸ’¡ How to use PestCheck
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <span className="font-semibold">1. Detect:</span> Go to Heat Map and click "Detect Pest" to upload or capture an image
            </div>
            <div>
              <span className="font-semibold">2. Confirm:</span> Verify the AI detection and assess the damage level
            </div>
            <div>
              <span className="font-semibold">3. Track:</span> Monitor all infestations on the map and manage your farms
            </div>
          </div>
        </div>

        {/* Feature Highlight */}
        <div className="mt-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-xl font-semibold mb-2">ðŸŽ¯ New Feature: Integrated Detection</h3>
          <p className="text-blue-100">
            Detection is now integrated into the Heat Map! Click the "Detect Pest" button on the Heat Map page to:
          </p>
          <ul className="mt-3 space-y-1 text-blue-100">
            <li>â€¢ Upload or capture pest images directly</li>
            <li>â€¢ Confirm AI detections before saving</li>
            <li>â€¢ Assess damage levels from 0 (healthy) to 5 (critical)</li>
            <li>â€¢ Instantly see detections on the map</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;