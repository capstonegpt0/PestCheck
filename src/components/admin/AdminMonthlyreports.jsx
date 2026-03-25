import React, { useState, useEffect, useRef } from 'react';
import { Printer, FileDown, Calendar, Filter, RefreshCw, ChevronDown } from 'lucide-react';
import AdminNavigation from './AdminNavigation';
import api from '../../utils/api';

// ─── helpers ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth(); // 0-indexed

const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

function safeNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function fmt(v, decimals = 2) {
  const n = safeNum(v);
  if (n === null) return '';
  return n % 1 === 0 ? String(n) : n.toFixed(decimals);
}

function fmtPct(v) {
  const n = safeNum(v);
  if (n === null) return '';
  // values stored as 0.xx  → convert to %
  const pct = n > 1 ? n : n * 100;
  return pct.toFixed(1) + '%';
}

// ─── data aggregation ───────────────────────────────────────────────────────

function groupByMunicipality(detections) {
  const map = {};
  detections.forEach(d => {
    const muni = d.municipality || d.address?.split(',')[0]?.trim() || 'Unknown';
    if (!map[muni]) map[muni] = [];
    map[muni].push(d);
  });
  return map;
}

// ─── Print styles ────────────────────────────────────────────────────────────

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #monthly-report-printable, #monthly-report-printable * { visibility: visible !important; }
  #monthly-report-printable { position: absolute; inset: 0; padding: 16px; }
  .no-print { display: none !important; }
  table { page-break-inside: auto; }
  tr    { page-break-inside: avoid; page-break-after: auto; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
}
`;

// ─── component ───────────────────────────────────────────────────────────────

const AdminMonthlyReport = ({ user, onLogout }) => {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear,  setSelectedYear]  = useState(currentYear);
  const [detections,    setDetections]    = useState([]);
  const [farms,         setFarms]         = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [generated,     setGenerated]     = useState(false);
  const printRef = useRef(null);

  // ── fetch data ──────────────────────────────────────────────────────────────

  const fetchReportData = async () => {
    setLoading(true);
    setGenerated(false);
    try {
      const [detRes, farmRes] = await Promise.all([
        api.get('/admin/detections/?page_size=1000'),
        api.get('/admin/farms/'),
      ]);

      const allDetections = Array.isArray(detRes.data)
        ? detRes.data
        : (detRes.data.results || []);

      const allFarms = Array.isArray(farmRes.data)
        ? farmRes.data
        : (farmRes.data.results || []);

      // filter to selected month & year
      const filtered = allDetections.filter(d => {
        const date = new Date(d.detected_at || d.reported_at);
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
      });

      setDetections(filtered);
      setFarms(allFarms);
      setGenerated(true);
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── print ───────────────────────────────────────────────────────────────────

  const handlePrint = () => window.print();

  // ── derived data ─────────────────────────────────────────────────────────────

  const reportDate = `${MONTHS[selectedMonth]} ${selectedYear}`;

  // Build rows: group detections by farm municipality → barangay
  const farmById = Object.fromEntries(farms.map(f => [f.id, f]));

  // Each detection row in the report
  const buildRows = () => {
    // annotate with farm info
    const annotated = detections.map(d => {
      const farm = farmById[d.farm_id] || null;
      return {
        ...d,
        farmName:     farm?.name || '',
        municipality: farm
          ? farm.name // simplify: use farm name as municipality proxy
          : (d.address?.split(',')[0]?.trim() || 'Unknown'),
        barangay:     farm?.name || d.address || '',
        cropType:     d.crop_type || '',
        growthStage:  d.description || '',
        pest:         d.pest_name || d.pest || '',
        naturalEnemies: '',
        areaPlanted:  safeNum(null),   // not in detection model
        areaAffected: safeNum(null),   // not in detection model
        pctInfest:    d.confidence ? (d.confidence * 100).toFixed(1) + '%' : '',
        areaTreated:  '',
        areaUntreated:'',
        remarks:      d.severity ? `Severity: ${d.severity}` : '',
        farmers:      '',
      };
    });

    // group by municipality
    const byMuni = {};
    annotated.forEach(r => {
      if (!byMuni[r.municipality]) byMuni[r.municipality] = [];
      byMuni[r.municipality].push(r);
    });

    return byMuni;
  };

  const byMuni = generated ? buildRows() : {};
  const muniKeys = Object.keys(byMuni);

  // summary stats
  const totalFarmers   = [...new Set(detections.map(d => d.user_id))].length;
  const totalDetections = detections.length;
  const cropBreakdown  = detections.reduce((acc, d) => {
    const c = (d.crop_type || 'Unknown').toLowerCase();
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const pestBreakdown  = detections.reduce((acc, d) => {
    const p = d.pest_name || d.pest || 'Unknown';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});
  const top5Pests = Object.entries(pestBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const sevBreakdown = detections.reduce((acc, d) => {
    const s = d.severity || 'unknown';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{PRINT_CSS}</style>
      <AdminNavigation user={user} onLogout={onLogout} />

      {/* ── controls ── */}
      <div className="max-w-7xl mx-auto px-4 py-6 no-print">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Monthly Pest Monitoring Report</h1>
          <div className="flex gap-2">
            {generated && (
              <button
                onClick={handlePrint}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={selectedMonth}
                onChange={e => { setSelectedMonth(Number(e.target.value)); setGenerated(false); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={e => { setSelectedYear(Number(e.target.value)); setGenerated(false); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button
              onClick={fetchReportData}
              disabled={loading}
              className="flex items-center px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
            >
              {loading
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
                : <><Calendar className="w-4 h-4 mr-2" /> Generate Report</>
              }
            </button>
          </div>
        </div>

        {/* summary cards */}
        {generated && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Detections', value: totalDetections, color: 'blue' },
              { label: 'Unique Reporters', value: totalFarmers,   color: 'green' },
              { label: 'Municipalities',   value: muniKeys.length, color: 'purple' },
              { label: 'Pest Types',       value: Object.keys(pestBreakdown).length, color: 'amber' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`bg-white rounded-lg shadow p-4 border-l-4 border-${color}-500`}>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── printable report ── */}
      {generated && (
        <div
          id="monthly-report-printable"
          ref={printRef}
          className="max-w-7xl mx-auto px-4 pb-12"
          style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}
        >
          {/* Official header */}
          <div className="text-center mb-4">
            <p className="font-semibold text-sm">Republic of the Philippines</p>
            <p className="text-sm">Province of Pampanga</p>
            <p className="font-bold text-sm">OFFICE OF THE PROVINCIAL AGRICULTURIST</p>
            <p className="text-sm">Capitol Compound, Sto. Niño, City of San Fernando</p>
          </div>

          <div className="text-center mb-1">
            <p className="font-bold text-base uppercase">
              Pest Monitoring on Rice, Corn, Cassava &amp; High Value Crops
            </p>
            <p className="text-sm">as of {reportDate}</p>
          </div>

          <div className="mb-3">
            <p className="text-sm font-semibold">Province: PAMPANGA</p>
          </div>

          {/* Main data table */}
          <table
            style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}
            border="1"
          >
            <thead>
              <tr style={{ background: '#d9e1f2', fontWeight: 'bold', textAlign: 'center' }}>
                {[
                  'Municipality', 'Barangay', 'No. of Farmers\nAffected',
                  'Latitude', 'Longitude', 'Growth Stage', 'Crops', 'Pest',
                  'Natural Enemies', 'Area Planted\n(ha)', 'Area Affected\n(ha)',
                  '% Infestation /\nInfection', 'Area Treated\n(ha)', 'Area Untreated\n(ha)', 'Remarks',
                ].map(h => (
                  <th
                    key={h}
                    style={{
                      border: '1px solid #999',
                      padding: '4px 3px',
                      whiteSpace: 'pre-line',
                      verticalAlign: 'middle',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {muniKeys.length === 0 ? (
                <tr>
                  <td colSpan={15} style={{ textAlign: 'center', padding: '12px', color: '#888' }}>
                    No detections recorded for {reportDate}.
                  </td>
                </tr>
              ) : (
                muniKeys.map((muni, mi) => {
                  const rows = byMuni[muni];
                  return rows.map((row, ri) => (
                    <tr key={`${mi}-${ri}`} style={{ background: ri % 2 === 0 ? '#fff' : '#f7f9ff' }}>
                      {ri === 0 ? (
                        <td
                          rowSpan={rows.length}
                          style={{
                            border: '1px solid #bbb',
                            padding: '3px 4px',
                            fontWeight: 'bold',
                            verticalAlign: 'top',
                          }}
                        >
                          {mi + 1}. {muni}
                        </td>
                      ) : null}
                      <td style={{ border: '1px solid #bbb', padding: '3px 4px' }}>{row.barangay}</td>
                      <td style={{ border: '1px solid #bbb', padding: '3px 4px', textAlign: 'center' }}>{row.farmers}</td>
                      <td style={{ border: '1px solid #bbb', padding: '3px 4px', textAlign: 'center' }}>{''}</td>
                      <td style={{ border: '1px solid #bbb', padding: '3px 4px', textAlign: 'center' }}>{''}</td>
                      <td style={{ border: '1px solid #bbb', padding: '3px 4px' }}>{row.growthStage}</td>
                      <td style={{ border: '1px solid #bbb', padding: '3px 4px' }}>{row.cropType}</td>
                      <td style={{ border: '1px solid #bbb', padding: '3px 4px' }}>{row.pest}</td>
                      <td style={{ border: '1px solid #bbb', padding: '3px 4px', textAlign: 'center' }}>{row.naturalEnemies}</td>
                      <td style={{ border: '1px solid #bbb', padding: '3px 4px', textAlign: 'center' }}>{row.areaPlanted ?? ''}</td>
                      <td style={{ border: '1px solid #bbb', padding: '3px 4px', textAlign: 'center' }}>{row.areaAffected ?? ''}</td>
                      <td style={{ border: '1px solid #bbb', padding: '3px 4px', textAlign: 'center' }}>{row.pctInfest}</td>
                      <td style={{ border: '1px solid #bbb', padding: '3px 4px', textAlign: 'center' }}>{row.areaTreated}</td>
                      <td style={{ border: '1px solid #bbb', padding: '3px 4px', textAlign: 'center' }}>{row.areaUntreated}</td>
                      <td style={{ border: '1px solid #bbb', padding: '3px 4px' }}>{row.remarks}</td>
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>

          {/* ── Summary section ── */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Crop breakdown */}
            <div>
              <p className="font-bold text-sm mb-2 border-b border-gray-400 pb-1">
                Summary by Crop Type
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }} border="1">
                <thead>
                  <tr style={{ background: '#e2efda' }}>
                    <th style={{ border: '1px solid #999', padding: '3px 6px', textAlign: 'left' }}>Crop</th>
                    <th style={{ border: '1px solid #999', padding: '3px 6px', textAlign: 'center' }}># Detections</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(cropBreakdown).sort((a,b) => b[1]-a[1]).map(([crop, cnt]) => (
                    <tr key={crop}>
                      <td style={{ border: '1px solid #bbb', padding: '3px 6px', textTransform: 'capitalize' }}>{crop}</td>
                      <td style={{ border: '1px solid #bbb', padding: '3px 6px', textAlign: 'center' }}>{cnt}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 'bold', background: '#f5f5f5' }}>
                    <td style={{ border: '1px solid #bbb', padding: '3px 6px' }}>TOTAL</td>
                    <td style={{ border: '1px solid #bbb', padding: '3px 6px', textAlign: 'center' }}>{totalDetections}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Top pests */}
            <div>
              <p className="font-bold text-sm mb-2 border-b border-gray-400 pb-1">
                Top Pest Incidences
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }} border="1">
                <thead>
                  <tr style={{ background: '#fce4d6' }}>
                    <th style={{ border: '1px solid #999', padding: '3px 6px', textAlign: 'left' }}>Pest</th>
                    <th style={{ border: '1px solid #999', padding: '3px 6px', textAlign: 'center' }}># Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {top5Pests.map(([pest, cnt]) => (
                    <tr key={pest}>
                      <td style={{ border: '1px solid #bbb', padding: '3px 6px' }}>{pest}</td>
                      <td style={{ border: '1px solid #bbb', padding: '3px 6px', textAlign: 'center' }}>{cnt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Severity breakdown */}
            <div>
              <p className="font-bold text-sm mb-2 border-b border-gray-400 pb-1">
                Severity Distribution
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }} border="1">
                <thead>
                  <tr style={{ background: '#fff2cc' }}>
                    <th style={{ border: '1px solid #999', padding: '3px 6px', textAlign: 'left' }}>Severity</th>
                    <th style={{ border: '1px solid #999', padding: '3px 6px', textAlign: 'center' }}># Cases</th>
                  </tr>
                </thead>
                <tbody>
                  {['low','medium','high','critical'].map(sev => (
                    <tr key={sev}>
                      <td style={{ border: '1px solid #bbb', padding: '3px 6px', textTransform: 'capitalize' }}>{sev}</td>
                      <td style={{ border: '1px solid #bbb', padding: '3px 6px', textAlign: 'center' }}>{sevBreakdown[sev] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature block */}
          <div className="mt-12 grid grid-cols-2 gap-16">
            <div className="text-center">
              <div style={{ borderTop: '1px solid #333', paddingTop: '4px', marginTop: '40px' }}>
                <p className="font-bold text-sm">Prepared by:</p>
                <p className="text-xs mt-1">Agricultural Technologist</p>
              </div>
            </div>
            <div className="text-center">
              <div style={{ borderTop: '1px solid #333', paddingTop: '4px', marginTop: '40px' }}>
                <p className="font-bold text-sm">Noted by:</p>
                <p className="text-xs mt-1">Provincial Agriculturist</p>
              </div>
            </div>
          </div>

          {/* Page footer */}
          <div className="mt-6 text-center text-xs text-gray-400">
            Generated from PestCheck System — {reportDate} — Province of Pampanga
          </div>
        </div>
      )}

      {/* empty state */}
      {!generated && !loading && (
        <div className="max-w-7xl mx-auto px-4 pb-12 text-center py-20 text-gray-400 no-print">
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Select a month and year, then click <strong>Generate Report</strong>.</p>
        </div>
      )}
    </div>
  );
};

export default AdminMonthlyReport;