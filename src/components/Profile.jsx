import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, MapPin, Camera } from 'lucide-react';
import Navigation from './Navigation';
import api from '../utils/api';

const Profile = ({ user, onLogout }) => {
  const [profileData, setProfileData] = useState(null);
  const [myDetections, setMyDetections] = useState([]);
  const [stats, setStats] = useState({
    totalDetections: 0,
    criticalCases: 0,
    recentActivity: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const [profileRes, detectionsRes] = await Promise.all([
        api.get('/auth/profile/'),
        api.get('/detections/?my_detections=true')
      ]);

      setProfileData(profileRes.data);
      setMyDetections(detectionsRes.data.results);

      // Calculate stats
      const total = detectionsRes.data.count || detectionsRes.data.results.length;
      const critical = detectionsRes.data.results.filter(d => d.severity === 'critical').length;
      const recent = detectionsRes.data.results.filter(d => {
        const detectedDate = new Date(d.detected_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return detectedDate > weekAgo;
      }).length;

      setStats({
        totalDetections: total,
        criticalCases: critical,
        recentActivity: recent
      });
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} onLogout={onLogout} />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">My Profile</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center mb-4">
                  <User className="w-16 h-16 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-1">
                  {profileData?.first_name} {profileData?.last_name}
                </h2>
                <p className="text-gray-600 mb-4">@{profileData?.username}</p>

                <div className="w-full space-y-3 mt-4">
                  <div className="flex items-center text-gray-700">
                    <Mail className="w-5 h-5 mr-3 text-gray-500" />
                    <span className="text-sm">{profileData?.email}</span>
                  </div>
                  
                  {profileData?.phone && (
                    <div className="flex items-center text-gray-700">
                      <Phone className="w-5 h-5 mr-3 text-gray-500" />
                      <span className="text-sm">{profileData.phone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-gray-700">
                    <Calendar className="w-5 h-5 mr-3 text-gray-500" />
                    <span className="text-sm">
                      Joined {new Date(profileData?.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center text-gray-700">
                    <MapPin className="w-5 h-5 mr-3 text-gray-500" />
                    <span className="text-sm">Magalang, Pampanga</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Card */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Statistics</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Detections</span>
                  <span className="text-2xl font-bold text-primary">{stats.totalDetections}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Critical Cases</span>
                  <span className="text-2xl font-bold text-red-500">{stats.criticalCases}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">This Week</span>
                  <span className="text-2xl font-bold text-blue-500">{stats.recentActivity}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800">My Detections</h3>
                <Camera className="w-6 h-6 text-gray-500" />
              </div>

              {myDetections.length === 0 ? (
                <div className="text-center py-12">
                  <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No detections yet</p>
                  <a
                    href="/detect"
                    className="inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Start Detecting
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {myDetections.map((detection) => (
                    <div
                      key={detection.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-800">
                              {detection.pest_name}
                            </h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              detection.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              detection.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                              detection.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {detection.severity}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Crop:</span> {detection.crop_type}
                            </div>
                            <div>
                              <span className="font-medium">Confidence:</span> {(detection.confidence * 100).toFixed(1)}%
                            </div>
                            <div>
                              <span className="font-medium">Date:</span> {new Date(detection.detected_at).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">Location:</span> {detection.address || 'Magalang'}
                            </div>
                          </div>
                        </div>
                        
                        {detection.image && (
                          <img
                            src={detection.image}
                            alt={detection.pest_name}
                            className="w-24 h-24 object-cover rounded-lg ml-4"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Actions */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Actions</h3>
              
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Edit Profile
                </button>
                <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Change Password
                </button>
                <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Notification Settings
                </button>
                <button
                  onClick={onLogout}
                  className="w-full text-left px-4 py-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
