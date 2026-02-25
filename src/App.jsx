import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';

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

// PWA Components
import PWAInstallPrompt from './components/PWAInstallPrompt'
import OfflineIndicator from './components/OfflineIndicator'

// Global Alert Notifications (shown on all pages for logged-in farmers)
import AlertNotifications from './components/AlertNotifications';

import api from './utils/api';


function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Refresh user data from the API to get latest is_verified, role, etc.
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    try {
      const response = await api.get('/auth/profile/');
      if (response.data) {
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      // Don't clear session on refresh failure — keep stale data as fallback
    }
  }, []);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        // Set cached user data immediately for fast render
        setUser(JSON.parse(userData));
        // Then refresh from API to get latest data (is_verified, role, etc.)
        refreshUser();
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

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
  const ProtectedRoute = ({ children, requireAdmin = false }) => {
    if (!user) {
      return <Navigate to="/login" />;
    }

    if (requireAdmin && user.role !== 'admin') {
      return <Navigate to="/dashboard" />;
    }

    return children;
  };

  // Role-based redirect
  const RoleBasedRedirect = () => {
    if (!user) {
      return <Navigate to="/login" />;
    }
    
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" />;
    }
    
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
      {/* PWA Components - Add these at the top level */}
      <OfflineIndicator />
      <PWAInstallPrompt />
      
      {/* Global Alert Notifications - shown on all pages for logged-in farmers */}
      {user && user.role !== 'admin' && <AlertNotifications user={user} />}
      
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            user ? (
              <RoleBasedRedirect />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/register"
          element={
            user ? (
              <RoleBasedRedirect />
            ) : (
              <Register onRegister={handleLogin} />
            )
          }
        />

        {/* User/Farmer Routes */}
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

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminUsers user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/farms"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminFarms user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/detections"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDetections user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pests"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminPests user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/alerts"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminAlerts user={user} onLogout={handleLogout} />
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
        <Route 
          path="/admin/farm-requests" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminFarmRequests user={user} onLogout={handleLogout} />
             </ProtectedRoute>
          }
        />
        
        {/* Default Route */}
        <Route path="/" element={<RoleBasedRedirect />} />
        
        {/* 404 Route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;