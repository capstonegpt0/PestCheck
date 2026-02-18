import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Bell, Info, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const AlertNotifications = ({ user }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  useEffect(() => {
    fetchAlerts();
    // Refresh alerts every 5 minutes to catch new ones
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load dismissed alerts from localStorage
    const dismissed = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
    setDismissedAlerts(dismissed);
  }, []);

  const fetchAlerts = async () => {
    try {
      let response;
      let alertsData = [];
      
      // Try my_alerts first, then fall back to /alerts/
      try {
        response = await api.get('/alerts/my_alerts/');
        // validateStatus in api.js accepts 4xx, so check status manually
        if (response.status >= 400) {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err) {
        console.log('my_alerts unavailable, falling back to /alerts/');
        try {
          response = await api.get('/alerts/');
          if (response.status >= 400) {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (err2) {
          console.log('Both alert endpoints failed');
          setAlerts([]);
          setLoading(false);
          return;
        }
      }
      
      console.log('Alerts API response:', response.status, response.data);
      
      // Extract alerts array from response
      if (Array.isArray(response.data)) {
        alertsData = response.data;
      } else if (response.data && typeof response.data === 'object') {
        if (response.data.results) {
          alertsData = Array.isArray(response.data.results) ? response.data.results : [];
        } else if (response.data.alerts) {
          alertsData = Array.isArray(response.data.alerts) ? response.data.alerts : [];
        } else if (Array.isArray(response.data.data)) {
          alertsData = response.data.data;
        }
        // Don't treat error objects like {detail: "..."} as alerts
      }
      
      // Filter to only active, non-expired alerts
      const now = new Date();
      const activeAlerts = alertsData.filter(alert => {
        // Must have id and title (basic sanity check)
        if (!alert.id || !alert.title) return false;
        // Must be active
        if (!alert.is_active) return false;
        // Check expiration
        if (alert.expires_at) {
          const expiryDate = new Date(alert.expires_at);
          if (now > expiryDate) return false;
        }
        return true;
      });
      
      setAlerts(activeAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (alertId) => {
    const newDismissed = [...dismissedAlerts, alertId];
    setDismissedAlerts(newDismissed);
    localStorage.setItem('dismissedAlerts', JSON.stringify(newDismissed));
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="w-6 h-6" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6" />;
      case 'info':
      default:
        return <Info className="w-6 h-6" />;
    }
  };

  const getAlertColors = (type) => {
    switch (type) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-400',
          text: 'text-red-800',
          icon: 'text-red-600',
          button: 'hover:bg-red-100'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-400',
          text: 'text-yellow-800',
          icon: 'text-yellow-600',
          button: 'hover:bg-yellow-100'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-400',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          button: 'hover:bg-blue-100'
        };
    }
  };

  // Filter out dismissed alerts - safely handle if alerts is not an array
  const visibleAlerts = Array.isArray(alerts) 
    ? alerts.filter(alert => !dismissedAlerts.includes(alert.id))
    : [];

  if (loading) {
    return null;
  }

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-40 max-w-md space-y-3">
      {visibleAlerts.map((alert) => {
        const colors = getAlertColors(alert.alert_type);
        
        return (
          <div
            key={alert.id}
            className={`${colors.bg} border-l-4 ${colors.border} rounded-lg shadow-lg p-4 animate-slide-in`}
          >
            <div className="flex items-start">
              <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
                {getAlertIcon(alert.alert_type)}
              </div>
              
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-semibold ${colors.text} mb-1`}>
                  {alert.title}
                </h3>
                <p className={`text-sm ${colors.text} whitespace-pre-line`}>
                  {alert.message}
                </p>
                
                {/* Target area */}
                {alert.target_area && (
                  <p className="text-xs opacity-75 mt-2">
                    📍 {alert.target_area}
                  </p>
                )}
                
                {/* Expiration info */}
                {alert.expires_at && (
                  <p className="text-xs opacity-75 mt-1">
                    Expires: {new Date(alert.expires_at).toLocaleDateString()}
                  </p>
                )}
                
                {/* Timestamp */}
                {alert.created_at && (
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(alert.created_at).toLocaleString()}
                  </p>
                )}
              </div>
              
              <button
                onClick={() => dismissAlert(alert.id)}
                className={`ml-2 ${colors.text} ${colors.button} rounded-lg p-1 transition-colors flex-shrink-0`}
                aria-label="Dismiss alert"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        );
      })}
      
      <style>{`
        @keyframes alert-slide-in {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: alert-slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AlertNotifications;