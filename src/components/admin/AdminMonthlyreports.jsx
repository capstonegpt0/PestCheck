import React, { useState } from 'react';
import { Calendar, RefreshCw, FileSpreadsheet } from 'lucide-react';
import AdminNavigation from './AdminNavigation';
import api from '../../utils/api';
import * as XLSX from 'xlsx';

// ─── constants ───────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth();
const YEARS        = Array.from({ length: 5 }, (_, i) => currentYear - i);

// ─── helpers ──────────────────────────────────────────────────────────────────

function severityLabel(d) {
  const map = { critical: 'Critical', high: 'High', medium: 'Moderate', low: 'Low' };
  if (d.severity && map[d.severity]) return map[d.severity];
  if (d.confidence) return (d.confidence * 100).toFixed(1) + '%';
  return '';
}

// ─── Excel export ─────────────────────────────────────────────────────────────

function exportToExcel(detections, farms, month, year) {
  const reportDate = `${MONTHS[month]} ${year}`;
  const sheetName  = `${MONTHS[month].slice(0, 3)} ${year}`;
  const farmById   = Object.fromEntries(farms.map(f => [f.id, f]));

  // Group detections by municipality
  const byMuni = {};
  detections.forEach(d => {
    const farm = farmById[d.farm_id] || null;
    const muni = farm
      ? (farm.user_name ? `${farm.user_name}'s Area` : farm.name)
      : (d.address ? d.address.split(',')[0].trim() : 'Unknown');
    if (!byMuni[muni]) byMuni[muni] = [];
    byMuni[muni].push({ ...d, _farm: farm, _muni: muni });
  });

  const muniKeys = Object.keys(byMuni);

  // ── Build array-of-arrays ──────────────────────────────────────────────────

  const aoa = [];

  // Header block (matches the official format)
  aoa.push(['Republic of the Philippines']);
  aoa.push(['Province of Pampanga']);
  aoa.push(['OFFICE OF THE MUNICIPAL AGRICULTURIST']);
  aoa.push(['Municipality of Magalang, Pampanga']);
  aoa.push([]);
  aoa.push(['PEST MONITORING ON RICE, CORN, CASSAVA & HIGH VALUE CROPS']);
  aoa.push([`as of ${reportDate}`]);
  aoa.push([]);
  aoa.push(['Municipality: MAGALANG, PAMPANGA']);

  // Column headers (row 10 → index 9)
  const COL_HEADERS = [
    'Municipality',
    'Barangay',
    'No. of Farmers Affected',
    'Latitude',
    'Longitude',
    'Growth Stage',
    'Crops',
    'Pest',
    'Natural Enemies',
    'Area Planted',
    'Area Affected',
    '% Infestation/ Infection',
    'Area Treated',
    'Area Untreated',
    'Remarks',
  ];
  aoa.push(COL_HEADERS);

  const HEADER_ROW_IDX = aoa.length; // next row (0-indexed) = first data row

  // Data rows
  muniKeys.forEach((muni, mi) => {
    const rows     = byMuni[muni];
    const startIdx = aoa.length;  // 0-indexed start of this municipality

    rows.forEach((d, ri) => {
      const farm = d._farm;
      const brgy = farm ? farm.name : (d.address || '');
      const crop = d.crop_type
        ? d.crop_type.charAt(0).toUpperCase() + d.crop_type.slice(1)
        : '';
      const pest = d.pest_name || d.pest || '';
      const sev  = severityLabel(d);
      const rmk  = d.severity ? `Severity: ${d.severity}` : '';

      aoa.push([
        ri === 0 ? `${mi + 1}. ${muni}` : null,
        brgy,
        null,   // No. of Farmers
        null,   // Latitude
        null,   // Longitude
        null,   // Growth Stage
        crop,
        pest,
        null,   // Natural Enemies
        null,   // Area Planted
        null,   // Area Affected
        sev,
        null,   // Area Treated
        null,   // Area Untreated
        rmk,
      ]);
    });

    // SUM row (Excel rows are 1-indexed: aoa index + 1)
    const sumStart  = startIdx + 1;        // Excel row of first data row of this muni
    const sumEnd    = aoa.length;           // Excel row of last data row
    aoa.push([
      null, null,
      `=SUM(C${sumStart}:C${sumEnd})`,
      null, null, null, null, null, null,
      `=SUM(J${sumStart}:J${sumEnd})`,
      `=SUM(K${sumStart}:K${sumEnd})`,
      null, null, null, null,
    ]);

    aoa.push([]); // blank separator
  });

  // ── Summary tables ────────────────────────────────────────────────────────

  aoa.push([]);
  aoa.push(['─── SUMMARY ───']);
  aoa.push([]);

  // By crop
  const cropMap = detections.reduce((a, d) => {
    const c = d.crop_type
      ? d.crop_type.charAt(0).toUpperCase() + d.crop_type.slice(1)
      : 'Unknown';
    a[c] = (a[c] || 0) + 1;
    return a;
  }, {});

  aoa.push(['Crop Type', 'No. of Detections']);
  Object.entries(cropMap).sort((a,b) => b[1]-a[1]).forEach(([c, n]) => aoa.push([c, n]));
  aoa.push(['TOTAL', detections.length]);

  aoa.push([]);

  // Top pests
  const pestMap = detections.reduce((a, d) => {
    const p = d.pest_name || d.pest || 'Unknown';
    a[p] = (a[p] || 0) + 1;
    return a;
  }, {});

  aoa.push(['Pest', 'No. of Reports']);
  Object.entries(pestMap).sort((a,b) => b[1]-a[1]).slice(0, 10).forEach(([p, n]) => aoa.push([p, n]));

  aoa.push([]);

  // Severity
  const sevMap = detections.reduce((a, d) => {
    const s = (d.severity || 'unknown').charAt(0).toUpperCase() + (d.severity || 'unknown').slice(1);
    a[s] = (a[s] || 0) + 1;
    return a;
  }, {});

  aoa.push(['Severity Level', 'No. of Cases']);
  ['Low','Medium','High','Critical'].forEach(s => aoa.push([s, sevMap[s] || 0]));

  aoa.push([]);
  aoa.push([`Generated from PestCheck System — ${reportDate} — Magalang Agriculture Office, Municipality of Magalang, Pampanga`]);

  // ── Create workbook ────────────────────────────────────────────────────────

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws['!cols'] = [
    { wch: 24 }, // A
    { wch: 22 }, // B
    { wch: 12 }, // C
    { wch: 12 }, // D
    { wch: 12 }, // E
    { wch: 18 }, // F
    { wch: 14 }, // G
    { wch: 26 }, // H
    { wch: 18 }, // I
    { wch: 12 }, // J
    { wch: 12 }, // K
    { wch: 14 }, // L
    { wch: 12 }, // M
    { wch: 13 }, // N
    { wch: 30 }, // O
  ];

  // Merges: title rows span A:O (columns 0-14)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 14 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 14 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 14 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 14 } },
    { s: { r: 8, c: 0 }, e: { r: 8, c: 14 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `Pest_Monitoring_Report_${MONTHS[month]}_${year}.xlsx`);
}

// ─── component ────────────────────────────────────────────────────────────────

const AdminMonthlyReport = ({ user, onLogout }) => {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear,  setSelectedYear]  = useState(currentYear);
  const [detections,    setDetections]    = useState([]);
  const [farms,         setFarms]         = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [generated,     setGenerated]     = useState(false);

  const fetchReportData = async () => {
    setLoading(true);
    setGenerated(false);
    try {
      const [detRes, farmRes] = await Promise.all([
        api.get('/admin/detections/?page_size=1000'),
        api.get('/admin/farms/'),
      ]);

      const allDet  = Array.isArray(detRes.data)  ? detRes.data  : (detRes.data.results  || []);
      const allFarm = Array.isArray(farmRes.data) ? farmRes.data : (farmRes.data.results || []);

      const filtered = allDet.filter(d => {
        const dt = new Date(d.detected_at || d.reported_at);
        return dt.getMonth() === selectedMonth && dt.getFullYear() === selectedYear;
      });

      setDetections(filtered);
      setFarms(allFarm);
      setGenerated(true);
    } catch (err) {
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── derived ───────────────────────────────────────────────────────────────

  const farmById = Object.fromEntries(farms.map(f => [f.id, f]));

  const byMuni = {};
  detections.forEach(d => {
    const farm = farmById[d.farm_id] || null;
    const muni = farm
      ? (farm.user_name ? `${farm.user_name}'s Area` : farm.name)
      : (d.address ? d.address.split(',')[0].trim() : 'Unknown');
    if (!byMuni[muni]) byMuni[muni] = [];
    byMuni[muni].push(d);
  });

  const muniKeys = Object.keys(byMuni);

  const cropMap = detections.reduce((a, d) => {
    const c = d.crop_type ? d.crop_type.charAt(0).toUpperCase() + d.crop_type.slice(1) : 'Unknown';
    a[c] = (a[c] || 0) + 1; return a;
  }, {});

  const pestMap = detections.reduce((a, d) => {
    const p = d.pest_name || d.pest || 'Unknown';
    a[p] = (a[p] || 0) + 1; return a;
  }, {});

  const sevMap = detections.reduce((a, d) => {
    const s = (d.severity || 'unknown').charAt(0).toUpperCase() + (d.severity || 'unknown').slice(1);
    a[s] = (a[s] || 0) + 1; return a;
  }, {});

  const reportDate = `${MONTHS[selectedMonth]} ${selectedYear}`;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={user} onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Monthly Pest Monitoring Report</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Generate and export the official monthly pest monitoring report as Excel
            </p>
          </div>
          {generated && (
            <button
              onClick={() => exportToExcel(detections, farms, selectedMonth, selectedYear)}
              className="flex items-center px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm shadow"
            >
              <FileSpreadsheet className="w-5 h-5 mr-2" />
              Download Excel (.xlsx)
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={selectedMonth}
                onChange={e => { setSelectedMonth(Number(e.target.value)); setGenerated(false); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
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
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                : <><Calendar className="w-4 h-4 mr-2" />Generate Report</>
              }
            </button>
          </div>
        </div>

        {generated && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Detections',  value: detections.length,                 color: 'blue'   },
                { label: 'Municipalities',     value: muniKeys.length,                   color: 'green'  },
                { label: 'Pest Types',         value: Object.keys(pestMap).length,       color: 'purple' },
                { label: 'Critical Cases',     value: sevMap['Critical'] || 0,           color: 'red'    },
              ].map(({ label, value, color }) => (
                <div key={label} className={`bg-white rounded-lg shadow p-4 border-l-4 border-${color}-500`}>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Preview table */}
            <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
              <div className="bg-blue-900 text-white px-6 py-4">
                <p className="text-xs uppercase tracking-widest opacity-70 mb-0.5">
                  Republic of the Philippines — Municipality of Magalang, Pampanga
                </p>
                <p className="font-bold">
                  PEST MONITORING ON RICE, CORN, CASSAVA &amp; HIGH VALUE CROPS
                </p>
                <p className="text-sm opacity-80">as of {reportDate}</p>
                <p className="text-xs opacity-60 mt-0.5">Office of the Municipal Agriculturist — Magalang Agriculture Office</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-blue-50 text-blue-900 text-center">
                      {[
                        'Municipality','Barangay','No. of Farmers\nAffected',
                        'Lat','Lng','Growth Stage','Crops','Pest',
                        'Natural Enemies','Area Planted','Area Affected',
                        '% Infestation','Area Treated','Area Untreated','Remarks'
                      ].map(h => (
                        <th key={h} className="border border-blue-200 px-2 py-2 font-semibold whitespace-pre-line">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detections.length === 0 ? (
                      <tr>
                        <td colSpan={15} className="text-center py-12 text-gray-400 italic">
                          No detections found for {reportDate}.
                        </td>
                      </tr>
                    ) : (
                      muniKeys.map((muni, mi) => {
                        const rows = byMuni[muni];
                        return rows.map((d, ri) => {
                          const farm = farmById[d.farm_id] || null;
                          const brgy = farm ? farm.name : (d.address || '—');
                          const crop = d.crop_type
                            ? d.crop_type.charAt(0).toUpperCase() + d.crop_type.slice(1)
                            : '';
                          const pest = d.pest_name || d.pest || '';
                          const sev  = severityLabel(d);
                          const rmk  = d.severity ? `Severity: ${d.severity}` : '';

                          return (
                            <tr key={`${mi}-${ri}`} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {ri === 0 ? (
                                <td rowSpan={rows.length} className="border border-gray-200 px-2 py-1.5 font-semibold align-top">
                                  {mi + 1}. {muni}
                                </td>
                              ) : null}
                              <td className="border border-gray-200 px-2 py-1.5">{brgy}</td>
                              <td className="border border-gray-200 px-2 py-1.5 text-center">—</td>
                              <td className="border border-gray-200 px-2 py-1.5 text-center">—</td>
                              <td className="border border-gray-200 px-2 py-1.5 text-center">—</td>
                              <td className="border border-gray-200 px-2 py-1.5">—</td>
                              <td className="border border-gray-200 px-2 py-1.5">{crop}</td>
                              <td className="border border-gray-200 px-2 py-1.5 font-medium text-red-700">{pest}</td>
                              <td className="border border-gray-200 px-2 py-1.5 text-center">—</td>
                              <td className="border border-gray-200 px-2 py-1.5 text-center">—</td>
                              <td className="border border-gray-200 px-2 py-1.5 text-center">—</td>
                              <td className="border border-gray-200 px-2 py-1.5 text-center">{sev}</td>
                              <td className="border border-gray-200 px-2 py-1.5 text-center">—</td>
                              <td className="border border-gray-200 px-2 py-1.5 text-center">—</td>
                              <td className="border border-gray-200 px-2 py-1.5 text-gray-600">{rmk}</td>
                            </tr>
                          );
                        });
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">By Crop Type</h3>
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-400"><th className="text-left pb-1">Crop</th><th className="text-right pb-1">#</th></tr></thead>
                  <tbody>
                    {Object.entries(cropMap).sort((a,b)=>b[1]-a[1]).map(([c,n]) => (
                      <tr key={c} className="border-t border-gray-100">
                        <td className="py-1">{c}</td>
                        <td className="py-1 text-right font-semibold">{n}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-300 font-bold">
                      <td className="pt-1">TOTAL</td>
                      <td className="pt-1 text-right">{detections.length}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">Top Pest Incidences</h3>
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-400"><th className="text-left pb-1">Pest</th><th className="text-right pb-1">#</th></tr></thead>
                  <tbody>
                    {Object.entries(pestMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([p,n]) => (
                      <tr key={p} className="border-t border-gray-100">
                        <td className="py-1">{p}</td>
                        <td className="py-1 text-right font-semibold">{n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">Severity Distribution</h3>
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-400"><th className="text-left pb-1">Severity</th><th className="text-right pb-1">#</th></tr></thead>
                  <tbody>
                    {['Low','Medium','High','Critical'].map(s => (
                      <tr key={s} className="border-t border-gray-100">
                        <td className={`py-1 font-medium ${
                          s==='Critical'?'text-red-700':s==='High'?'text-orange-600':s==='Medium'?'text-yellow-600':'text-green-600'
                        }`}>{s}</td>
                        <td className="py-1 text-right font-semibold">{sevMap[s] || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Download CTA */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-green-800">Report ready for export</p>
                <p className="text-sm text-green-700 mt-0.5">
                  File: <strong>Pest_Monitoring_Report_{MONTHS[selectedMonth]}_{selectedYear}.xlsx</strong>
                  &nbsp;— formatted to match the official Provincial Agriculturist spreadsheet.
                </p>
              </div>
              <button
                onClick={() => exportToExcel(detections, farms, selectedMonth, selectedYear)}
                className="flex items-center px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm shadow"
              >
                <FileSpreadsheet className="w-5 h-5 mr-2" />
                Download .xlsx
              </button>
            </div>
          </>
        )}

        {/* Empty state */}
        {!generated && !loading && (
          <div className="text-center py-24 text-gray-400">
            <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">
              Select a month and year, then click{' '}
              <strong className="text-gray-600">Generate Report</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMonthlyReport;