import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import api from './utils/api';

// User Components
import Dashboard from './components/Dashboard';
import HeatMap from './components/HeatMap';
import PestLibrary from './components/PestLibrary';
import Profile from './components/Profile';

// Admin Components
import AdminDashboard from './components/admin/AdminDashboard';
import AdminUsers from './components/admin/AdminUsers';
import AdminFarms from './components/admin/AdminFarms';
import AdminDetections from './components/admin/AdminDetections';
import AdminPests from './components/admin/AdminPests';
import AdminAlerts from './components/admin/AdminAlerts';
import AdminActivities from './components/admin/AdminActivities';
import AdminFarmRequests from './components/admin/AdminFarmrequests';
import AdminMonthlyReport from './components/admin/AdminMonthlyreports';
import AdminHeatMap from './components/admin/AdminHeatMap';

// PWA Components
import PWAInstallPrompt from './components/PWAInstallPrompt';
import OfflineIndicator from './components/OfflineIndicator';

// Global Alert Notifications (shown on all pages for logged-in farmers)
import AlertNotifications from './components/AlertNotifications';


function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // ✅ Global interceptor: auto-logout if account is blocked mid-session
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => {
        // api.js uses validateStatus: s => s < 500, so 403 comes here (not catch)
        if (
          response.status === 403 &&
          response.data?.code === 'account_blocked'
        ) {
          forceLogout();
        }
        return response;
      },
      (error) => {
        // Fallback: catches 403 if validateStatus is ever changed
        if (
          error.response?.status === 403 &&
          error.response?.data?.code === 'account_blocked'
        ) {
          forceLogout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  const forceLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.replace('/#/login?reason=blocked');
  };

  const handleLogin = (userData, tokens) => {
    setUser(userData);
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/#/login';
  };

  // Protected Route Component
  const ProtectedRoute = ({ children, requireAdmin = false, requireStaff = false }) => {
    if (!user) {
      return <Navigate to="/login" />;
    }

    if (requireAdmin && user.role !== 'admin') {
      if (user.role === 'mao_staff') {
        return <Navigate to="/admin/farm-requests" />;
      }
      return <Navigate to="/dashboard" />;
    }

    if (requireStaff && !['admin', 'mao_staff'].includes(user.role)) {
      return <Navigate to="/dashboard" />;
    }

    return children;
  };

  // Role-based redirect
  const RoleBasedRedirect = () => {
    if (!user) {
      return <Navigate to="/login" />;
    }
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" />;
    if (user.role === 'mao_staff') return <Navigate to="/admin/farm-requests" />;
    return <Navigate to="/dashboard" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <OfflineIndicator />
      <PWAInstallPrompt />

      {/* Global Alert Notifications - shown on all pages for logged-in farmers */}
      {user && user.role === 'farmer' && <AlertNotifications user={user} />}

      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={user ? <RoleBasedRedirect /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/register"
          element={user ? <RoleBasedRedirect /> : <Register onRegister={handleLogin} />}
        />

        {/* ==================== FARMER ROUTES ==================== */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/heatmap"
          element={
            <ProtectedRoute>
              <HeatMap user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pests"
          element={
            <ProtectedRoute>
              <PestLibrary user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* ==================== ADMIN-ONLY ROUTES ==================== */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/activities"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminActivities user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* ==================== SHARED ROUTES (admin + MAO staff) ==================== */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireStaff={true}>
              <AdminUsers user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/farms"
          element={
            <ProtectedRoute requireStaff={true}>
              <AdminFarms user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/farm-requests"
          element={
            <ProtectedRoute requireStaff={true}>
              <AdminFarmRequests user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/detections"
          element={
            <ProtectedRoute requireStaff={true}>
              <AdminDetections user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pests"
          element={
            <ProtectedRoute requireStaff={true}>
              <AdminPests user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/alerts"
          element={
            <ProtectedRoute requireStaff={true}>
              <AdminAlerts user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/monthly-report"
          element={
            <ProtectedRoute requireStaff={true}>
              <AdminMonthlyReport user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/heatmap"
          element={
            <ProtectedRoute requireStaff={true}>
              <AdminHeatMap user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* MAO staff verification review */}
        <Route
          path="/admin/verification"
          element={
            <ProtectedRoute requireStaff={true}>
              <AdminUsers user={user} onLogout={handleLogout} initialTab="verification" />
            </ProtectedRoute>
          }
        />

        {/* Default / 404 */}
        <Route path="/" element={<RoleBasedRedirect />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;