import React, { useState, useEffect } from 'react';
import {
  MapContainer, TileLayer, Circle, Popup, Marker, GeoJSON
} from 'react-leaflet';
import {
  Filter, Activity, RefreshCw, Bug, MapPin, AlertTriangle,
  TrendingUp, Info, Eye, ChevronDown, ChevronUp
} from 'lucide-react';
import AdminNavigation from './AdminNavigation';
import api from '../../utils/api';
import L from 'leaflet';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ── Magalang bounds & mask ───────────────────────────────────────────────────
const CENTER       = [15.2139, 120.6619];
const MAP_BOUNDS   = [[15.16, 120.60], [15.27, 120.72]];
const MAGALANG_MASK = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]],
      [[120.60, 15.16], [120.72, 15.16], [120.72, 15.27], [120.60, 15.27], [120.60, 15.16]]
    ]
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const severityColor = (s) => ({
  critical: '#7f1d1d',
  high:     '#ef4444',
  medium:   '#f97316',
  low:      '#fbbf24',
}[s] ?? '#fbbf24');

const severityRadius = (s) => ({
  critical: 300,
  high:     200,
  medium:   150,
  low:      100,
}[s] ?? 100);

const severityBadge = (s) => ({
  critical: 'bg-red-900 text-white',
  high:     'bg-red-500 text-white',
  medium:   'bg-orange-400 text-white',
  low:      'bg-yellow-400 text-gray-900',
}[s] ?? 'bg-gray-300 text-gray-700');

const createFarmIcon = (farmName) =>
  L.divIcon({
    className: '',
    html: `
      <div style="text-align:center">
        <div style="background:#fff;padding:2px 7px;border-radius:4px;
          box-shadow:0 2px 4px rgba(0,0,0,.2);font-size:11px;font-weight:600;
          white-space:nowrap;margin-bottom:3px;border:2px solid #10b981;
          color:#047857;max-width:140px;overflow:hidden;text-overflow:ellipsis">
          ${farmName}
        </div>
        <div style="width:28px;height:28px;margin:0 auto;
          background-image:url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMTBiOTgxIj48cGF0aCBkPSJNMTIgMkw0IDhWMjBIMjBWOEwxMiAyWk0xOCAxOEg2VjlMMTIgNC41TDE4IDlWMThaTTggMTBIMTBWMTZIOFYxMFpNMTQgMTBIMTZWMTZIMTRWMTBaIi8+PC9zdmc+');
          background-size:contain;background-repeat:no-repeat"></div>
      </div>`,
    iconSize: [140, 58],
    iconAnchor: [70, 58],
    popupAnchor: [0, -58]
  });

// ── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = 'text-gray-800', icon: Icon, iconColor }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
    {Icon && <Icon className={`w-9 h-9 opacity-75 ${iconColor ?? 'text-gray-400'}`} />}
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────
const AdminHeatMap = ({ user, onLogout }) => {
  const [detections, setDetections]       = useState([]);
  const [farms, setFarms]                 = useState([]);
  const [days, setDays]                   = useState(30);
  const [loading, setLoading]             = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [pestFilter, setPestFilter]       = useState('all');
  const [showUnverified, setShowUnverified] = useState(true);
  const [listOpen, setListOpen]           = useState(true);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [dRes, fRes] = await Promise.all([
        api.get(`/detections/heatmap_data/?days=${days}`),
        api.get('/farms/'),
      ]);

      const rawD = Array.isArray(dRes.data) ? dRes.data : (dRes.data.results ?? []);
      const rawF = Array.isArray(fRes.data) ? fRes.data : (fRes.data.results ?? []);

      const validD = rawD.filter(d => {
        const lat = d.lat ?? d.latitude;
        const lng = d.lng ?? d.longitude;
        if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) return false;
        d.latitude  = parseFloat(lat);
        d.longitude = parseFloat(lng);
        d.lat       = d.latitude;
        d.lng       = d.longitude;
        return true;
      });

      const validF = rawF.filter(f =>
        f.lat != null && f.lng != null &&
        !isNaN(parseFloat(f.lat)) && !isNaN(parseFloat(f.lng))
      );

      setDetections(validD);
      setFarms(validF);
    } catch (err) {
      console.error('AdminHeatMap fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [days]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const uniquePests = [...new Set(detections.map(d => d.pest).filter(Boolean))].sort();

  const filtered = detections.filter(d => {
    if (severityFilter !== 'all' && d.severity !== severityFilter) return false;
    if (pestFilter !== 'all' && d.pest !== pestFilter) return false;
    if (!showUnverified && d.user_is_verified === false) return false;
    return true;
  });

  const verifiedDetections   = filtered.filter(d => d.user_is_verified !== false);
  const unverifiedDetections = filtered.filter(d => d.user_is_verified === false);

  const stats = {
    total:    filtered.length,
    critical: filtered.filter(d => d.severity === 'critical').length,
    high:     filtered.filter(d => d.severity === 'high').length,
    farms:    farms.length,
  };

  // group same farm+pest to avoid stacking identical circles
  const groupedCircles = (() => {
    const map = {};
    verifiedDetections.forEach(d => {
      const key = `${d.farm_id ?? 'nofarm'}_${d.pest}`;
      if (!map[key]) map[key] = { ...d, count: 1 };
      else           map[key].count++;
    });
    return Object.values(map);
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={user} onLogout={onLogout} />

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Eye className="w-6 h-6 text-green-600" />
              Pest Activity Map
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Read-only monitoring — filter and observe infestation patterns across Magalang
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Detections"   value={stats.total}    sub={`Last ${days} days`}       icon={Bug}           iconColor="text-green-500" />
          <StatCard label="Critical Alerts"     value={stats.critical} sub="Requires immediate action" icon={AlertTriangle}  iconColor="text-red-500"   color="text-red-700" />
          <StatCard label="High Severity"       value={stats.high}     sub="Monitor closely"           icon={TrendingUp}     iconColor="text-orange-500" color="text-orange-700" />
          <StatCard label="Registered Farms"    value={stats.farms}    sub="In Magalang area"          icon={MapPin}         iconColor="text-blue-500" />
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />

          {/* Time range */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Period:</span>
            <select
              value={days}
              onChange={e => setDays(parseInt(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-green-400 focus:border-transparent"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          {/* Severity */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Severity:</span>
            <div className="flex gap-1">
              {['all', 'critical', 'high', 'medium', 'low'].map(s => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                    severityFilter === s
                      ? s === 'all'
                        ? 'bg-gray-700 text-white'
                        : `${severityBadge(s)}`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Pest type */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Pest:</span>
            <select
              value={pestFilter}
              onChange={e => setPestFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-green-400 focus:border-transparent max-w-[180px]"
            >
              <option value="all">All Pests</option>
              {uniquePests.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Unverified toggle */}
          <label className="flex items-center gap-2 ml-auto cursor-pointer select-none">
            <span className="text-xs text-gray-500 font-medium">Show unverified</span>
            <div
              className={`relative w-9 h-5 rounded-full transition-colors ${showUnverified ? 'bg-green-500' : 'bg-gray-300'}`}
              onClick={() => setShowUnverified(v => !v)}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showUnverified ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </label>

          {/* Active filter chip */}
          {(severityFilter !== 'all' || pestFilter !== 'all') && (
            <button
              onClick={() => { setSeverityFilter('all'); setPestFilter('all'); }}
              className="text-xs text-red-600 hover:text-red-800 font-medium underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 items-center bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2.5">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Legend:</span>
          {[
            { label: 'Critical', color: '#7f1d1d' },
            { label: 'High',     color: '#ef4444' },
            { label: 'Medium',   color: '#f97316' },
            { label: 'Low',      color: '#fbbf24' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border border-white/50 shadow" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-3">
            <div className="w-3 h-3 rounded-full bg-gray-400 border border-white/50 shadow" />
            <span className="text-xs text-gray-500 italic">Unverified user</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-xs text-gray-600">Farm marker</span>
          </div>
          <span className="ml-auto text-xs text-gray-400">
            Showing <strong className="text-gray-700">{filtered.length}</strong> detection{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: 520 }}>
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-500">
              <Activity className="w-8 h-8 animate-spin text-green-500" />
              <span className="text-sm">Loading map data…</span>
            </div>
          ) : (
            <MapContainer
              center={CENTER}
              zoom={14}
              minZoom={12}
              maxZoom={19}
              style={{ height: '100%', width: '100%' }}
              attributionControl={false}
              maxBounds={MAP_BOUNDS}
              maxBoundsViscosity={1.0}
            >
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles © Esri"
              />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                opacity={0.7}
              />
              <GeoJSON
                data={MAGALANG_MASK}
                style={{ fillColor: '#e5e7eb', fillOpacity: 1, color: '#9ca3af', weight: 2 }}
              />

              {/* Farm markers */}
              {farms
                .filter(f => !isNaN(parseFloat(f.lat)) && !isNaN(parseFloat(f.lng)))
                .map(f => (
                  <Marker
                    key={f.id}
                    position={[parseFloat(f.lat), parseFloat(f.lng)]}
                    icon={createFarmIcon(f.name ?? 'Farm')}
                  >
                    <Popup maxWidth={280}>
                      <div className="p-2 space-y-1">
                        <p className="font-bold text-base border-b pb-1 mb-1">{f.name}</p>
                        <p className="text-sm text-gray-600">Owner: {f.user_name}</p>
                        <p className="text-sm">{f.crop_type} — {f.size} ha</p>
                        <p className="text-sm font-medium mt-1">
                          Active infestations:{' '}
                          <span className="text-red-600">
                            {detections.filter(d => d.farm_id === f.id && d.active !== false).length}
                          </span>
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

              {/* Verified detection circles */}
              {groupedCircles.map((d, i) => (
                <Circle
                  key={`v-${i}`}
                  center={[d.lat, d.lng]}
                  radius={severityRadius(d.severity)}
                  pathOptions={{
                    fillColor:    severityColor(d.severity),
                    fillOpacity:  0.32,
                    color:        severityColor(d.severity),
                    weight:       2,
                  }}
                >
                  <Popup>
                    <div className="p-2 space-y-1 min-w-[180px]">
                      <p className="font-bold text-base">{d.pest}</p>
                      <p className="text-sm">
                        Severity:{' '}
                        <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${severityBadge(d.severity)}`}>
                          {d.severity}
                        </span>
                      </p>
                      {d.count > 1 && (
                        <p className="text-xs text-blue-600 font-medium">{d.count} reports merged</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Reported by: {d.user_name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(d.reported_at ?? d.detected_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Popup>
                </Circle>
              ))}

              {/* Unverified markers */}
              {unverifiedDetections.map((d, i) => {
                const icon = L.divIcon({
                  className: '',
                  html: `<div style="width:14px;height:14px;background:#9ca3af;border:2px solid #6b7280;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
                  iconSize: [14, 14],
                  iconAnchor: [7, 7],
                });
                return (
                  <Marker key={`u-${i}`} position={[d.lat, d.lng]} icon={icon}>
                    <Popup>
                      <div className="p-2 space-y-1 min-w-[180px]">
                        <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-1">
                          <p className="text-xs font-bold text-amber-800">⚠ Unverified User</p>
                        </div>
                        <p className="font-semibold text-gray-700">{d.pest}</p>
                        <p className="text-xs text-gray-500">Severity: {d.severity}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(d.reported_at ?? d.detected_at).toLocaleDateString()}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </div>

        {/* Detection list — collapsible */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setListOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <span className="font-semibold text-gray-800 flex items-center gap-2">
              <Bug className="w-4 h-4 text-green-600" />
              Active Infestations
              <span className="ml-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                {filtered.length}
              </span>
            </span>
            {listOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {listOpen && (
            <div className="border-t border-gray-100">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <Bug className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No detections match your current filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['#', 'Pest', 'Severity', 'Farm', 'Reported by', 'Verified', 'Date'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.slice(0, 200).map((d, i) => {
                        const farmName = farms.find(f => f.id === d.farm_id)?.name ?? '—';
                        return (
                          <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">#{d.id}</td>
                            <td className="px-4 py-2.5 font-medium text-gray-900">{d.pest}</td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${severityBadge(d.severity)}`}>
                                {d.severity}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-600">{farmName}</td>
                            <td className="px-4 py-2.5 text-gray-600">{d.user_name ?? '—'}</td>
                            <td className="px-4 py-2.5">
                              {d.user_is_verified === false ? (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                  ⚠ Unverified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                                  ✓ Verified
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-gray-400 text-xs">
                              {new Date(d.reported_at ?? d.detected_at).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filtered.length > 200 && (
                    <p className="text-center text-xs text-gray-400 py-3">
                      Showing first 200 of {filtered.length} — use filters to narrow down.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Farm infestation summary */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-600" />
            Farm Infestation Summary
          </h2>
          {farms.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No farms registered.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {farms.map(f => {
                const count = filtered.filter(d => d.farm_id === f.id).length;
                const maxSev = (() => {
                  const ds = filtered.filter(d => d.farm_id === f.id);
                  const order = { critical: 4, high: 3, medium: 2, low: 1 };
                  return ds.reduce((acc, d) => (order[d.severity] > (order[acc] ?? 0) ? d.severity : acc), null);
                })();
                return (
                  <div
                    key={f.id}
                    className={`rounded-lg border px-3 py-2.5 ${
                      count === 0
                        ? 'border-gray-100 bg-gray-50'
                        : maxSev === 'critical' ? 'border-red-200 bg-red-50'
                        : maxSev === 'high'     ? 'border-orange-200 bg-orange-50'
                        : maxSev === 'medium'   ? 'border-yellow-200 bg-yellow-50'
                        : 'border-green-200 bg-green-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-800 truncate">{f.name}</p>
                    <p className="text-xs text-gray-500">{f.user_name} · {f.crop_type}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-lg font-bold text-gray-700">{count}</span>
                      <span className="text-xs text-gray-500">detection{count !== 1 ? 's' : ''}</span>
                      {maxSev && (
                        <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full font-semibold ${severityBadge(maxSev)}`}>
                          {maxSev}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminHeatMap;