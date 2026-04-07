import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, X, Info, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../utils/api';

// How long a dismissal lasts before the alert can be shown again (ms)
// Set to 24 hours — so a re-activated alert will re-appear next day
const DISMISSAL_TTL_MS = 24 * 60 * 60 * 1000;

// Poll every 60 seconds instead of 5 minutes
const POLL_INTERVAL_MS = 60 * 1000;

/**
 * Reads dismissed alerts from localStorage and strips out any entries
 * that are older than DISMISSAL_TTL_MS.
 * Storage format: { [alertId]: dismissedAtTimestamp }
 */
const loadDismissed = () => {
  try {
    const raw = localStorage.getItem('dismissedAlertsV2');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const valid = {};
    Object.entries(parsed).forEach(([id, ts]) => {
      if (now - ts < DISMISSAL_TTL_MS) {
        valid[id] = ts;
      }
    });
    // Write back the pruned version
    localStorage.setItem('dismissedAlertsV2', JSON.stringify(valid));
    return valid;
  } catch {
    return {};
  }
};

const saveDismissed = (dismissed) => {
  try {
    localStorage.setItem('dismissedAlertsV2', JSON.stringify(dismissed));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
};

const AlertNotifications = ({ user }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  // dismissed: { [alertId]: timestampMs }
  const [dismissed, setDismissed] = useState(() => loadDismissed());

  // Keep a ref so the focus-handler always sees the latest fetchAlerts
  const fetchAlertsRef = useRef(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setFetchError(false);
      let response;

      // Try /alerts/my_alerts/ first (filtered to user's farms + general)
      try {
        response = await api.get('/alerts/my_alerts/');
        if (response.status >= 400) {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (primaryErr) {
        console.warn('[AlertNotifications] my_alerts failed, falling back to /alerts/', primaryErr?.message);
        // Fallback to the standard list endpoint
        response = await api.get('/alerts/');
        if (response.status >= 400) {
          throw new Error(`HTTP ${response.status}`);
        }
      }

      // Normalise the response shape — the API can return an array or paginated object
      let alertsData = [];
      if (Array.isArray(response.data)) {
        alertsData = response.data;
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        alertsData = response.data.results;
      } else if (response.data?.alerts && Array.isArray(response.data.alerts)) {
        alertsData = response.data.alerts;
      }
      // Ignore plain error objects like { detail: "..." }

      const now = new Date();
      const activeAlerts = alertsData.filter((alert) => {
        if (!alert.id || !alert.title) return false;
        if (!alert.is_active) return false;
        if (alert.expires_at && new Date(alert.expires_at) <= now) return false;
        return true;
      });

      setAlerts(activeAlerts);
    } catch (err) {
      console.error('[AlertNotifications] Failed to fetch alerts:', err?.message || err);
      setFetchError(true);
      // Keep whatever we already have — don't wipe existing alerts on a transient error
    } finally {
      setLoading(false);
    }
  }, []);

  // Store the latest fetchAlerts in a ref for the focus handler
  useEffect(() => {
    fetchAlertsRef.current = fetchAlerts;
  }, [fetchAlerts]);

  // Initial fetch + polling + tab-focus refresh
  useEffect(() => {
    fetchAlerts();

    const interval = setInterval(fetchAlerts, POLL_INTERVAL_MS);

    // Refresh immediately when the user returns to the tab
    const handleFocus = () => {
      if (fetchAlertsRef.current) fetchAlertsRef.current();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && fetchAlertsRef.current) fetchAlertsRef.current();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchAlerts]);

  const dismissAlert = (alertId) => {
    const updated = { ...dismissed, [alertId]: Date.now() };
    setDismissed(updated);
    saveDismissed(updated);
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
      default:
        return <Info className="w-5 h-5" />;
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
          button: 'hover:bg-red-100',
          badge: 'bg-red-600',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-400',
          text: 'text-yellow-800',
          icon: 'text-yellow-600',
          button: 'hover:bg-yellow-100',
          badge: 'bg-yellow-500',
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-400',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          button: 'hover:bg-blue-100',
          badge: 'bg-blue-500',
        };
    }
  };

  // Filter alerts that are visible: not expired and not recently dismissed
  const visibleAlerts = Array.isArray(alerts)
    ? alerts.filter((alert) => {
        // Enforce expiry at render time — catches alerts that expired between polls
        if (alert.expires_at && new Date(alert.expires_at) <= new Date()) return false;

        const dismissedAt = dismissed[alert.id];
        if (!dismissedAt) return true; // Never dismissed
        // Re-show if the alert was updated after the dismissal
        if (alert.created_at) {
          const alertTs = new Date(alert.created_at).getTime();
          if (alertTs > dismissedAt) return true; // Alert was re-created/updated
        }
        // Still within the TTL — keep hidden
        return Date.now() - dismissedAt >= DISMISSAL_TTL_MS;
      })
    : [];

  // Don't render anything until initial fetch completes
  if (loading) return null;

  // Show a subtle retry indicator if fetch failed and we have nothing to show
  if (fetchError && visibleAlerts.length === 0) {
    return (
      <div className="fixed top-20 right-2 sm:right-4 z-40">
        <button
          onClick={fetchAlerts}
          className="flex items-center space-x-1 bg-white border border-gray-200 text-gray-500 text-xs px-3 py-1.5 rounded-full shadow hover:bg-gray-50 transition-colors"
          title="Could not load alerts — click to retry"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry alerts</span>
        </button>
      </div>
    );
  }

  if (visibleAlerts.length === 0) return null;

  return (
    <>
      <div className="fixed top-20 right-2 sm:right-4 z-40 w-[calc(100vw-1rem)] sm:w-96 max-w-sm space-y-3">
        {visibleAlerts.map((alert) => {
          const colors = getAlertColors(alert.alert_type);

          return (
            <div
              key={alert.id}
              className={`${colors.bg} border-l-4 ${colors.border} rounded-lg shadow-lg p-4 alert-slide-in`}
            >
              <div className="flex items-start">
                {/* Icon */}
                <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
                  {getAlertIcon(alert.alert_type)}
                </div>

                {/* Body */}
                <div className="ml-3 flex-1 min-w-0">
                  {/* Type badge + title */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`inline-block text-white text-xs font-bold px-1.5 py-0.5 rounded ${colors.badge} capitalize`}
                    >
                      {alert.alert_type}
                    </span>
                    <h3 className={`text-sm font-semibold ${colors.text} leading-tight`}>
                      {alert.title}
                    </h3>
                  </div>

                  {/* Message */}
                  <p className={`text-sm ${colors.text} whitespace-pre-line leading-relaxed`}>
                    {alert.message}
                  </p>

                  {/* Target area */}
                  {alert.target_area && (
                    <p className={`text-xs ${colors.text} opacity-70 mt-1.5`}>
                      📍 {alert.target_area}
                    </p>
                  )}

                  {/* Expiry */}
                  {alert.expires_at && (
                    <p className={`text-xs ${colors.text} opacity-60 mt-1`}>
                      Expires: {new Date(alert.expires_at).toLocaleDateString()}
                    </p>
                  )}

                  {/* Timestamp */}
                  {alert.created_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Dismiss button */}
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className={`ml-2 flex-shrink-0 ${colors.text} ${colors.button} rounded-lg p-1 transition-colors`}
                  aria-label="Dismiss alert"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes alert-slide-in {
          from {
            transform: translateX(110vw);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .alert-slide-in {
          animation: alert-slide-in 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </>
  );
};

export default AlertNotifications;