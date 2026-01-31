import React from 'react';
import { Camera, Map, Book, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navigation from './Navigation';

const Dashboard = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-lg p-8 mb-8 text-white">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {user.first_name || user.username}! 👋
          </h1>
          <p className="text-lg text-green-100">
            Ready to protect your crops? Choose an option below to get started.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            to="/detect"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105 group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <Camera className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Detect Pest
              </h3>
              <p className="text-gray-600 text-sm">
                Upload or capture an image to identify pests instantly
              </p>
            </div>
          </Link>

          <Link
            to="/heatmap"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105 group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <Map className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                View Map
              </h3>
              <p className="text-gray-600 text-sm">
                Track infestations and manage your farms on the map
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
            💡 How to use PestCheck
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <span className="font-semibold">1. Detect:</span> Upload or capture an image of the pest on your crops
            </div>
            <div>
              <span className="font-semibold">2. Identify:</span> Our AI will identify the pest and provide control methods
            </div>
            <div>
              <span className="font-semibold">3. Track:</span> Monitor infestations on the map and manage your farms
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;