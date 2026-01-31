import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, MapPin, AlertTriangle, Book, Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import AdminNavigation from './AdminNavigation';
import api from '../../utils/api';

const AdminDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState({
    users: { total: 0, farmers: 0, verified: 0, unverified: 0 },
    farms: { total: 0, verified: 0, unverified: 0, by_crop: {} },
    detections: { total: 0, pending: 0, verified: 0, rejected: 0, resolved: 0, by_severity: {} }
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [pendingDetections, setPendingDetections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [userStats, farmStats, detectionStats, activities, pending] = await Promise.all([
        api.get('/admin/users/statistics/'),
        api.get('/admin/farms/statistics/'),
        api.get('/admin/detections/statistics/'),
        api.get('/admin/activity-logs/?page_size=10'),
        api.get('/admin/detections/pending_verifications/')
      ]);

      setStats({
        users: userStats.data,
        farms: farmStats.data,
        detections: detectionStats.data
      });
      
      const activityData = Array.isArray(activities.data) 
        ? activities.data 
        : (activities.data.results || []);
      
      const pendingData = Array.isArray(pending.data) 
        ? pending.data 
        : (pending.data.results || []);
      
      setRecentActivities(activityData.slice(0, 10));
      setPendingDetections(pendingData.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setRecentActivities([]);
      setPendingDetections([]);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = {
    primary: '#10b981',
    blue: '#3b82f6',
    yellow: '#f59e0b',
    red: '#ef4444',
    purple: '#8b5cf6',
    gray: '#6b7280'
  };

  const userRoleData = [
    { name: 'Farmers', value: stats.users.farmers },
    { name: 'Admins', value: stats.users.admins }
  ];

  const detectionStatusData = [
    { name: 'Pending', value: stats.detections.pending },
    { name: 'Verified', value: stats.detections.verified },
    { name: 'Rejected', value: stats.detections.rejected },
    { name: 'Resolved', value: stats.detections.resolved }
  ];

  const severityData = stats.detections.by_severity ? 
    Object.entries(stats.detections.by_severity).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    })) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation user={user} onLogout={onLogout} />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">Loading admin dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={user} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="text-sm text-gray-600">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-gray-800">{stats.users.total_users}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.users.verified_users} verified
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Farms</p>
                <p className="text-3xl font-bold text-gray-800">{stats.farms.total_farms}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.farms.verified_farms} verified
                </p>
              </div>
              <MapPin className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Detections</p>
                <p className="text-3xl font-bold text-gray-800">{stats.detections.total_detections}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.detections.verified} verified
                </p>
              </div>
              <AlertTriangle className="w-12 h-12 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pending Reviews</p>
                <p className="text-3xl font-bold text-gray-800">{stats.detections.pending}</p>
                <p className="text-xs text-red-500 mt-1">Requires attention</p>
              </div>
              <Clock className="w-12 h-12 text-red-500" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">User Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userRoleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userRoleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={[COLORS.primary, COLORS.purple][index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Detection Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={detectionStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.blue} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Severity Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={[COLORS.primary, COLORS.yellow, COLORS.red, '#7f1d1d'][index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Verification Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-sm font-medium text-gray-700">Users</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {stats.users.unverified_users} pending
                  </div>
                  <div className="text-xs text-gray-500">
                    {stats.users.verified_users} / {stats.users.total_users} verified
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-sm font-medium text-gray-700">Farms</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {stats.farms.unverified_farms} pending
                  </div>
                  <div className="text-xs text-gray-500">
                    {stats.farms.verified_farms} / {stats.farms.total_farms} verified
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
                  <span className="text-sm font-medium text-gray-700">Detections</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {stats.detections.pending} pending
                  </div>
                  <div className="text-xs text-gray-500">
                    {stats.detections.verified} / {stats.detections.total_detections} verified
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Detections */}
        {pendingDetections.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Pending Detections</h2>
              <a href="/admin/detections" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View All →
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pest</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingDetections.map((detection) => (
                    <tr key={detection.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        #{detection.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {detection.pest_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {detection.user_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          detection.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          detection.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          detection.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {detection.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(detection.detected_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-green-600 hover:text-green-800 mr-3">
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button className="text-red-600 hover:text-red-800">
                          <XCircle className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Recent Activities</h2>
            <a href="/admin/activities" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All →
            </a>
          </div>
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent activities</p>
            ) : (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <Activity className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.user_name} <span className="text-gray-600">- {activity.action.replace(/_/g, ' ')}</span>
                      </p>
                      <p className="text-xs text-gray-500">{activity.details}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;