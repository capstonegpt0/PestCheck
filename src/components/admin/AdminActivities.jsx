import React, { useState, useEffect } from 'react';
import { Search, Activity, Filter, Download } from 'lucide-react';
import AdminNavigation from './AdminNavigation';
import api from '../../utils/api';

const AdminActivities = ({ user, onLogout }) => {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchActivities();
    fetchUsers();
  }, []);

  useEffect(() => {
    filterActivities();
  }, [searchQuery, userFilter, actionFilter, dateFrom, dateTo, activities]);

  const fetchActivities = async () => {
    try {
      const response = await api.get('/admin/activity-logs/');
      const activityData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || []);
      
      setActivities(activityData);
      setFilteredActivities(activityData);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
      setFilteredActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users/');
      const userData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || []);
      setUsers(userData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const filterActivities = () => {
    let filtered = activities;

    if (userFilter) {
      filtered = filtered.filter(a => a.user === parseInt(userFilter));
    }

    if (actionFilter) {
      filtered = filtered.filter(a => a.action.toLowerCase().includes(actionFilter.toLowerCase()));
    }

    if (dateFrom) {
      filtered = filtered.filter(a => new Date(a.timestamp) >= new Date(dateFrom));
    }

    if (dateTo) {
      filtered = filtered.filter(a => new Date(a.timestamp) <= new Date(dateTo));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.user_name.toLowerCase().includes(query) ||
        a.action.toLowerCase().includes(query) ||
        (a.details && a.details.toLowerCase().includes(query))
      );
    }

    setFilteredActivities(filtered);
  };

  const getActionColor = (action) => {
    if (action.includes('created')) return 'text-green-600 bg-green-50';
    if (action.includes('deleted')) return 'text-red-600 bg-red-50';
    if (action.includes('updated') || action.includes('verified')) return 'text-blue-600 bg-blue-50';
    if (action.includes('rejected')) return 'text-orange-600 bg-orange-50';
    if (action.includes('logged_in')) return 'text-purple-600 bg-purple-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getActionIcon = (action) => {
    return '•';
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Details', 'IP Address'];
    const csvData = filteredActivities.map(a => [
      new Date(a.timestamp).toLocaleString(),
      a.user_name,
      a.user_role,
      a.action,
      a.details || '',
      a.ip_address || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={user} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Activity Logs</h1>
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-5 h-5 mr-2" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User
              </label>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Users</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Filter by action (e.g., 'created', 'deleted', 'verified')..."
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {(searchQuery || userFilter || actionFilter || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setUserFilter('');
                  setActionFilter('');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Activity List */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Loading activity logs...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No activities found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredActivities.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(activity.action)}`}>
                        <span className="text-sm font-semibold">{getActionIcon(activity.action)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-gray-900">{activity.user_name}</span>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            activity.user_role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {activity.user_role}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">
                          <span className={`font-medium px-2 py-0.5 rounded ${getActionColor(activity.action)}`}>
                            {activity.action.replace(/_/g, ' ')}
                          </span>
                        </p>
                        {activity.details && (
                          <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>
                            🕐 {new Date(activity.timestamp).toLocaleString()}
                          </span>
                          {activity.ip_address && (
                            <span>
                              🌐 {activity.ip_address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {filteredActivities.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Activities</p>
                <p className="text-2xl font-bold text-gray-900">{filteredActivities.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Unique Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(filteredActivities.map(a => a.user)).size}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Today's Activities</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredActivities.filter(a => {
                    const today = new Date().toDateString();
                    return new Date(a.timestamp).toDateString() === today;
                  }).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredActivities.filter(a => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(a.timestamp) > weekAgo;
                  }).length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminActivities;