import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Users, MapPin, AlertTriangle, Activity, CheckCircle, XCircle, Clock, Bug } from 'lucide-react';
import AdminNavigation from './AdminNavigation';
import api from '../../utils/api';

const AdminDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState({
    users: { total_users: 0, farmers: 0, admins: 0, mao_staff: 0, verified_users: 0, unverified_users: 0 },
    farms: { total_farms: 0, verified_farms: 0, unverified_farms: 0, by_crop: {} },
    detections: { total_detections: 0, pending: 0, verified: 0, rejected: 0, resolved: 0, by_severity: {} }
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [pendingDetections, setPendingDetections] = useState([]);
  const [activePestData, setActivePestData] = useState([]);
  const [monthlyPestData, setMonthlyPestData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [userStats, farmStats, detectionStats, activities, pending, allDetections] = await Promise.all([
        api.get('/admin/users/statistics/'),
        api.get('/admin/farms/statistics/'),
        api.get('/admin/detections/statistics/'),
        api.get('/admin/activity-logs/?page_size=10'),
        api.get('/admin/detections/pending_verifications/'),
        api.get('/admin/detections/?page_size=500&confirmed=true'),
      ]);

      setStats({
        users: userStats.data,
        farms: farmStats.data,
        detections: detectionStats.data
      });

      const activityData = Array.isArray(activities.data)
        ? activities.data : (activities.data.results || []);
      const pendingData = Array.isArray(pending.data)
        ? pending.data : (pending.data.results || []);

      setRecentActivities(activityData.slice(0, 10));
      setPendingDetections(pendingData.slice(0, 5));

      // Process detections for pest charts
      const detData = Array.isArray(allDetections.data)
        ? allDetections.data : (allDetections.data.results || []);

      // Active pest reports — count by pest name (active=true)
      const activeCounts = {};
      detData.filter(d => d.active !== false).forEach(d => {
        const pest = d.pest_name || d.pest || 'Unknown';
        activeCounts[pest] = (activeCounts[pest] || 0) + 1;
      });
      const activePests = Object.entries(activeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, value]) => ({ name, value }));
      setActivePestData(activePests);

      // Monthly popular pests — current month
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthlyCounts = {};
      detData.forEach(d => {
        const dt = new Date(d.detected_at || d.reported_at);
        if (dt.getMonth() === currentMonth && dt.getFullYear() === currentYear) {
          const pest = d.pest_name || d.pest || 'Unknown';
          monthlyCounts[pest] = (monthlyCounts[pest] || 0) + 1;
        }
      });
      const monthlyPests = Object.entries(monthlyCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, value]) => ({ name, value }));
      setMonthlyPestData(monthlyPests);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#10b981', '#8b5cf6', '#3b82f6', '#f59e0b', '#ef4444', '#7f1d1d'];
  const PEST_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

  const userRoleData = [
    { name: 'Farmers',   value: stats.users.farmers   || 0 },
    { name: 'Admins',    value: stats.users.admins     || 0 },
    { name: 'MAO Staff', value: stats.users.mao_staff  || 0 },
  ].filter(d => d.value > 0);

  const detectionStatusData = [
    { name: 'Pending',  value: stats.detections.pending  || 0 },
    { name: 'Verified', value: stats.detections.verified  || 0 },
    { name: 'Rejected', value: stats.detections.rejected  || 0 },
    { name: 'Resolved', value: stats.detections.resolved  || 0 },
  ];

  const severityData = stats.detections.by_severity
    ? Object.entries(stats.detections.by_severity).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1), value
      }))
    : [];

  const summaryCards = [
    {
      label: 'Total Users', value: stats.users.total_users,
      sub: `${stats.users.verified_users ?? 0} verified`,
      icon: Users, color: 'text-blue-500'
    },
    {
      label: 'Total Farms', value: stats.farms.total_farms,
      sub: `${stats.farms.verified_farms ?? 0} verified`,
      icon: MapPin, color: 'text-green-500'
    },
    {
      label: 'Detections', value: stats.detections.total_detections,
      sub: `${stats.detections.verified ?? 0} verified`,
      icon: AlertTriangle, color: 'text-yellow-500'
    },
    {
      label: 'Pending Reviews', value: stats.detections.pending,
      sub: 'Requires attention', subColor: 'text-red-500',
      icon: Clock, color: 'text-red-500'
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation user={user} onLogout={onLogout} />
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-600 text-lg">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={user} onLogout={onLogout} />

      <div className="max-w-screen-2xl mx-auto px-6 py-6">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <span className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleString()}
          </span>
        </div>

        {/* Summary cards — always 4 columns on desktop */}
        <div className="grid grid-cols-4 gap-5 mb-6">
          {summaryCards.map(({ label, value, sub, subColor, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{label}</p>
                <p className="text-3xl font-bold text-gray-800">{value ?? 0}</p>
                <p className={`text-xs mt-1 ${subColor ?? 'text-gray-500'}`}>{sub}</p>
              </div>
              <Icon className={`w-12 h-12 ${color} opacity-80`} />
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-3 gap-5 mb-6">
          {/* User distribution pie */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4">User Distribution</h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={userRoleData}
                  cx="50%" cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {userRoleData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Detection status bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Detection Status</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={detectionStatusData} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Severity distribution pie */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Severity Distribution</h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%" cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {severityData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pest charts row */}
        <div className="grid grid-cols-2 gap-5 mb-6">

          {/* Active Pest Reports pie */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bug className="w-4 h-4 text-red-500" />
              <h2 className="text-base font-semibold text-gray-800">Active Pest Reports</h2>
              <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {activePestData.reduce((s, d) => s + d.value, 0)} active
              </span>
            </div>
            {activePestData.length === 0 ? (
              <div className="flex items-center justify-center h-52 text-gray-400 text-sm">No active reports</div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie
                      data={activePestData}
                      cx="50%" cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {activePestData.map((_, i) => (
                        <Cell key={i} fill={PEST_COLORS[i % PEST_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {activePestData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PEST_COLORS[i % PEST_COLORS.length] }} />
                        <span className="text-xs text-gray-600 truncate">{d.name}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-800 flex-shrink-0">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Monthly Popular Pests pie */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bug className="w-4 h-4 text-amber-500" />
              <h2 className="text-base font-semibold text-gray-800">
                Popular Pests This Month
              </h2>
              <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {new Date().toLocaleString('default', { month: 'long' })}
              </span>
            </div>
            {monthlyPestData.length === 0 ? (
              <div className="flex items-center justify-center h-52 text-gray-400 text-sm">No detections this month</div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie
                      data={monthlyPestData}
                      cx="50%" cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {monthlyPestData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {monthlyPestData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-gray-600 truncate">{d.name}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-800 flex-shrink-0">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Verification status summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Verification Status</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: 'Users', icon: Users, bg: 'bg-blue-50', iconColor: 'text-blue-600',
                pending: stats.users.unverified_users,
                ratio: `${stats.users.verified_users ?? 0} / ${stats.users.total_users ?? 0}`
              },
              {
                label: 'Farms', icon: MapPin, bg: 'bg-green-50', iconColor: 'text-green-600',
                pending: stats.farms.unverified_farms,
                ratio: `${stats.farms.verified_farms ?? 0} / ${stats.farms.total_farms ?? 0}`
              },
              {
                label: 'Detections', icon: AlertTriangle, bg: 'bg-yellow-50', iconColor: 'text-yellow-600',
                pending: stats.detections.pending,
                ratio: `${stats.detections.verified ?? 0} / ${stats.detections.total_detections ?? 0}`
              },
            ].map(({ label, icon: Icon, bg, iconColor, pending, ratio }) => (
              <div key={label} className={`flex items-center justify-between ${bg} rounded-lg px-4 py-3`}>
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{pending ?? 0} pending</p>
                  <p className="text-xs text-gray-500">{ratio} verified</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Detections table */}
        {pendingDetections.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">Pending Detections</h2>
              <a href="/admin/detections" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                View All →
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {['ID', 'Pest', 'User', 'Severity', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingDetections.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">#{d.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{d.pest_name}</td>
                      <td className="px-4 py-3 text-gray-600">{d.user_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          d.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          d.severity === 'high'     ? 'bg-orange-100 text-orange-800' :
                          d.severity === 'medium'   ? 'bg-yellow-100 text-yellow-800' :
                                                      'bg-green-100 text-green-800'
                        }`}>
                          {d.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(d.detected_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button className="text-green-600 hover:text-green-800">
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button className="text-red-600 hover:text-red-800">
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Recent Activities</h2>
            <a href="/admin/activities" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              View All →
            </a>
          </div>
          <div className="divide-y divide-gray-100">
            {recentActivities.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No recent activities</p>
            ) : (
              recentActivities.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {a.user_name}{' '}
                        <span className="text-gray-500 font-normal">
                          — {a.action.replace(/_/g, ' ')}
                        </span>
                      </p>
                      {a.details && (
                        <p className="text-xs text-gray-500">{a.details}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                    {new Date(a.timestamp).toLocaleString()}
                  </span>
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