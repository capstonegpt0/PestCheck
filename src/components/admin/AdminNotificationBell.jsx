import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell, X, CheckCheck, FileText, Users, AlertTriangle,
  MapPin, Activity, Clock, ChevronRight, RefreshCw, Info,
  ShieldCheck, Megaphone
} from 'lucide-react';
import api from '../../utils/api';

const POLL_INTERVAL_MS = 60_000;
const STORAGE_KEY      = 'adminDismissedNotifs_v1';

const loadDismissed = () => {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
};
const saveDismissed = (set) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); }
  catch { /* quota */ }
};

const CATEGORIES = {
  farm_requests: {
    label: 'Farm Requests',
    icon: FileText,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    dot: 'bg-purple-500',
    badge: 'bg-purple-100 text-purple-700',
    href: '/admin/farm-requests',
  },
  pending_verifications: {
    label: 'Verifications',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    href: '/admin/users',
  },
  pending_detections: {
    label: 'Detections',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    href: '/admin/detections',
  },
  active_alerts: {
    label: 'Alerts',
    icon: Megaphone,
    color: 'text-red-600',
    bg: 'bg-red-50',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700',
    href: '/admin/alerts',
  },
  recent_activities: {
    label: 'Activities',
    icon: Activity,
    color: 'text-green-600',
    bg: 'bg-green-50',
    dot: 'bg-green-500',
    badge: 'bg-green-100 text-green-700',
    href: '/admin/activities',
  },
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60)   return 'Just now';
  const m = Math.floor(seconds / 60);
  if (m < 60)         return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)         return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(dateStr).toLocaleDateString();
};

const AdminNotificationBell = ({ user }) => {
  const isAdmin   = user?.role === 'admin';

  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(false);
  const [isOpen,    setIsOpen]    = useState(false);
  const [dismissed, setDismissed] = useState(() => loadDismissed());
  const [activeTab, setActiveTab] = useState('all');

  const panelRef = useRef(null);
  const fetchRef = useRef(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const batch = [];

      // Farm requests (pending)
      try {
        const r = await api.get('/admin/farm-requests/');
        const data = Array.isArray(r.data) ? r.data : (r.data.results || []);
        data
          .filter(d => d.status === 'pending')
          .forEach(d => batch.push({
            id:       `farm_req_${d.id}`,
            category: 'farm_requests',
            title:    `Farm Request: ${d.farm_name || d.name || `#${d.id}`}`,
            subtitle: `by ${d.farmer_name || d.user_name || 'Unknown farmer'}`,
            time:     d.created_at || d.submitted_at,
            raw:      d,
          }));
      } catch { /* optional */ }

      // Pending user verifications
      try {
        const r = await api.get('/admin/users/');
        const data = Array.isArray(r.data) ? r.data : (r.data.results || []);
        data
          .filter(d => d.role === 'farmer' && !d.is_verified)
          .forEach(d => batch.push({
            id:       `verify_${d.id}`,
            category: 'pending_verifications',
            title:    `Farmer awaiting verification`,
            subtitle: d.username || d.email || `#${d.id}`,
            time:     d.date_joined || d.created_at,
            raw:      d,
          }));
      } catch { /* optional */ }

      // Pending detections
      try {
        const r = await api.get('/admin/detections/pending_verifications/');
        const data = Array.isArray(r.data) ? r.data : (r.data.results || []);
        data.forEach(d => batch.push({
          id:       `detect_${d.id}`,
          category: 'pending_detections',
          title:    `Pest detection pending: ${d.pest_name || 'Unknown'}`,
          subtitle: `${d.user_name || 'Farmer'} · ${d.severity || 'unknown'} severity`,
          time:     d.detected_at || d.created_at,
          raw:      d,
        }));
      } catch { /* optional */ }

      // Active alerts
      try {
        const r = await api.get('/admin/alerts/');
        const data = Array.isArray(r.data) ? r.data : (r.data.results || []);
        data
          .filter(d => d.is_active)
          .slice(0, 5)
          .forEach(d => batch.push({
            id:       `alert_${d.id}`,
            category: 'active_alerts',
            title:    d.title,
            subtitle: `${d.alert_type} · ${d.target_area || 'All areas'}`,
            time:     d.created_at,
            raw:      d,
          }));
      } catch { /* optional */ }

      // Recent activities (admin only)
      if (isAdmin) {
        try {
          const r = await api.get('/admin/activity-logs/?page_size=8');
          const data = Array.isArray(r.data) ? r.data : (r.data.results || []);
          data.slice(0, 8).forEach(d => batch.push({
            id:       `act_${d.id}`,
            category: 'recent_activities',
            title:    (d.action || '').replace(/_/g, ' '),
            subtitle: d.user_name || 'System',
            time:     d.timestamp,
            raw:      d,
          }));
        } catch { /* optional */ }
      }

      batch.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
      setItems(batch);
    } catch (e) {
      console.error('[AdminNotificationBell] fetch error', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchRef.current = fetchAll; }, [fetchAll]);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, POLL_INTERVAL_MS);
    const onFocus = () => fetchRef.current?.();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus); };
  }, [fetchAll]);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const dismiss = (id, e) => {
    e.stopPropagation();
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(next);
  };

  const dismissAll = () => {
    const next = new Set(dismissed);
    visibleItems.forEach(i => next.add(i.id));
    setDismissed(next);
    saveDismissed(next);
  };

  const visibleItems = items.filter(i => !dismissed.has(i.id));
  const actionable   = ['farm_requests', 'pending_verifications', 'pending_detections'];
  const urgentCount  = visibleItems.filter(i => actionable.includes(i.category)).length;

  const tabItems = activeTab === 'all'
    ? visibleItems
    : visibleItems.filter(i => i.category === activeTab);

  const availableTabs = ['all', ...Object.keys(CATEGORIES).filter(
    cat => visibleItems.some(i => i.category === cat)
  )];

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { if (!isOpen) fetchAll(); setIsOpen(o => !o); }}
        className="relative p-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        aria-label="Admin notifications"
      >
        <Bell className="w-5 h-5" />
        {urgentCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
            {urgentCount > 99 ? '99+' : urgentCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-[22rem] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden flex flex-col"
          style={{ maxHeight: '80vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
              {urgentCount > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {urgentCount} need action
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {visibleItems.length > 0 && (
                <button
                  onClick={dismissAll}
                  title="Dismiss all"
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  All
                </button>
              )}
              <button
                onClick={() => fetchAll()}
                title="Refresh"
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          {availableTabs.length > 2 && (
            <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto scrollbar-none flex-shrink-0">
              {availableTabs.map(tab => {
                const cfg = CATEGORIES[tab];
                const count = tab === 'all'
                  ? visibleItems.length
                  : visibleItems.filter(i => i.category === tab).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab === 'all' ? 'All' : cfg?.label}
                    <span className={`text-[10px] font-bold px-1 rounded-full ${
                      activeTab === tab ? 'bg-white/20 text-white' : 'bg-white text-gray-500'
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : error && items.length === 0 ? (
              <div className="text-center py-10">
                <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-3">Could not load notifications</p>
                <button onClick={fetchAll} className="text-xs text-blue-600 hover:underline">Retry</button>
              </div>
            ) : tabItems.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Nothing to review</p>
              </div>
            ) : (
              <ul>
                {tabItems.map((item) => {
                  const cfg      = CATEGORIES[item.category];
                  const Icon     = cfg?.icon || Bell;
                  const isUrgent = actionable.includes(item.category);

                  return (
                    <li
                      key={item.id}
                      className="group flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer bg-white"
                      onClick={() => { if (cfg?.href) window.location.href = `/#${cfg.href}`; setIsOpen(false); }}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${cfg?.bg || 'bg-gray-100'}`}>
                        <Icon className={`w-4 h-4 ${cfg?.color || 'text-gray-500'}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {isUrgent && (
                              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mb-1 ${cfg?.badge}`}>
                                {cfg?.label}
                              </span>
                            )}
                            <p className="text-sm font-medium text-gray-800 leading-snug capitalize truncate">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{item.subtitle}</p>
                            )}
                          </div>
                          <button
                            onClick={(e) => dismiss(item.id, e)}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 text-gray-400 transition-opacity"
                            title="Dismiss"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-300" />
                          <span className="text-[11px] text-gray-400">{timeAgo(item.time)}</span>
                          {isUrgent && <span className={`w-1.5 h-1.5 rounded-full ${cfg?.dot}`} />}
                        </div>
                      </div>

                      {cfg?.href && (
                        <ChevronRight className="flex-shrink-0 w-4 h-4 text-gray-300 group-hover:text-gray-500 mt-2 transition-colors" />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {visibleItems.length > 0 && (
            <div className="flex-shrink-0 border-t border-gray-100 px-4 py-2.5 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-400">{visibleItems.length} notification{visibleItems.length !== 1 ? 's' : ''}</span>
              <a href="/#/admin/activities" className="text-xs text-blue-600 hover:underline font-medium" onClick={() => setIsOpen(false)}>
                View all activity →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminNotificationBell;