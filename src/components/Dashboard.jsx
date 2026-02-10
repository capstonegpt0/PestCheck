import React from 'react';
import { Map, Book, User, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navigation from './Navigation';
import AlertNotifications from './AlertNotifications';

// ✅ NEW: Verification Status Banner Component
const VerificationStatusBanner = ({ user }) => {
  // Don't show banner for admins or verified users
  if (user.role === 'admin' || user.is_verified) {
    return null;
  }

  return (
    <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Account Pending Verification
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Your account is currently unverified. While you can still use the pest detection feature,
              you cannot request farm registrations until your account is verified by an administrator.
            </p>
            <p className="mt-2">
              <strong>What you can do:</strong>
            </p>
            <ul className="list-disc list-inside mt-1 ml-2">
              <li>Use the pest detection feature</li>
              <li>View the pest library</li>
              <li>See detections from other farmers on the map</li>
            </ul>
            <p className="mt-2">
              <strong>Limitations:</strong>
            </p>
            <ul className="list-disc list-inside mt-1 ml-2">
              <li>Cannot request farm registration</li>
              <li>Your detections appear as smaller markers on the map</li>
              <li>Other users will see your detections with an "Unverified User" label</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} onLogout={onLogout} />
      
      {/* Alert Notifications */}
      <AlertNotifications user={user} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-8 mb-8 text-white">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {user.first_name || user.username}!
          </h1>
          <p className="text-lg text-green-100">
            Ready to protect your crops? Choose an option below to get started.
          </p>
        </div>

        {/* ✅ NEW: Verification Status Banner */}
        <VerificationStatusBanner user={user} />

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
            How to use PestCheck
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
          <h3 className="text-xl font-semibold mb-2">New Feature: Integrated Detection</h3>
          <p className="text-blue-100">
            Detection is now integrated into the Heat Map! Click the "Detect Pest" button on the Heat Map page to:
          </p>
          <ul className="mt-3 space-y-1 text-blue-100">
            <li>• Upload or capture pest images directly</li>
            <li>• Confirm AI detections before saving</li>
            <li>• Assess damage levels from 0 (healthy) to 5 (critical)</li>
            <li>• Instantly see detections on the map</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;