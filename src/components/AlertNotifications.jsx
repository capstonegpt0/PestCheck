import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Bell, Info, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const AlertNotifications = ({ user }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  useEffect(() => {
    fetchAlerts();
    // Refresh alerts every 5 minutes
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
      const response = await api.get('/alerts/my_alerts/');
      console.log('✅ API Response:', response.data);
      
      // Handle both array and object responses
      let alertsData = [];
      if (Array.isArray(response.data)) {
        alertsData = response.data;
      } else if (response.data && typeof response.data === 'object') {
        // If it's an object, try to extract alerts from common keys
        if (response.data.alerts) {
          alertsData = Array.isArray(response.data.alerts) ? response.data.alerts : [];
        } else if (response.data.results) {
          alertsData = Array.isArray(response.data.results) ? response.data.results : [];
        } else if (response.data.data) {
          alertsData = Array.isArray(response.data.data) ? response.data.data : [];
        } else {
          // If it's a single alert object, wrap it in array
          alertsData = [response.data];
        }
      }
      
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      // Don't show error to user - just fail silently for alerts
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
          border: 'border-red-300',
          text: 'text-red-800',
          icon: 'text-red-600',
          button: 'hover:bg-red-100'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          text: 'text-yellow-800',
          icon: 'text-yellow-600',
          button: 'hover:bg-yellow-100'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-300',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          button: 'hover:bg-blue-100'
        };
    }
  };

  // Filter out dismissed alerts - safely handle if alerts is not an array
  const activeAlerts = Array.isArray(alerts) 
    ? alerts.filter(alert => !dismissedAlerts.includes(alert.id))
    : [];

  if (loading) {
    return null;
  }

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-40 max-w-md space-y-3">
      {activeAlerts.map((alert) => {
        const colors = getAlertColors(alert.alert_type);
        
        return (
          <div
            key={alert.id}
            className={`${colors.bg} ${colors.border} border-2 rounded-lg shadow-lg p-4 animate-slide-in`}
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
      
      <style jsx>{`
        @keyframes slide-in {
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
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AlertNotifications;