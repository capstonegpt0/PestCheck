import React, { useState, useEffect, useMemo } from 'react';
import { Search, Book, Image as ImageIcon, Info, Bug, Calendar, ChevronDown, ChevronUp, Sun, CloudRain, Droplets, Wind } from 'lucide-react';
import Navigation from './Navigation';
import api from '../utils/api';
import { PEST_REFERENCE_DATA, getPestsByCrop, searchPests } from '../utils/pestReferenceData';

// ==================== SEASONAL PEST DATA ====================
// Based on Philippine tropical climate (Magalang, Pampanga region):
//   Dry Season: November â€“ May  (Amihan / cool dry â†’ hot dry)
//   Wet Season: June â€“ October  (Habagat / monsoon rains)
//
// Each pest has monthly activity levels (0â€“5) reflecting real infestation patterns.
// Sources: PhilRice, DA-BAR, IRRI pest calendars for Central Luzon.

const PEST_SEASONAL_DATA = {
  'stem-borer': {
    id: 'stem-borer',
    name: 'Stem Borer',
    crop: 'Rice',
    // Peaks during wet-season crop (Julâ€“Sep) and late dry-season crop (Marâ€“Apr)
    monthly: [2, 2, 3, 4, 3, 3, 4, 5, 5, 4, 3, 2],
    peakMonths: ['July', 'August', 'September'],
    season: 'Wet Season',
    note: 'Most active during wet-season rice crop. Moth flights increase with humidity and rainfall.',
  },
  'whorl-maggot': {
    id: 'whorl-maggot',
    name: 'Whorl Maggot',
    crop: 'Rice',
    // Active early in wet season when seedlings are young
    monthly: [1, 1, 2, 2, 2, 3, 5, 5, 4, 3, 2, 1],
    peakMonths: ['July', 'August'],
    season: 'Wet Season',
    note: 'Attacks young rice seedlings. Most damaging during early wet-season transplanting.',
  },
  'leaf-folder': {
    id: 'leaf-folder',
    name: 'Leaf Folder',
    crop: 'Rice',
    // Present year-round, peaks during wet season
    monthly: [2, 2, 3, 3, 3, 4, 5, 5, 4, 4, 3, 2],
    peakMonths: ['July', 'August'],
    season: 'Wet Season',
    note: 'Thrives in humid, cloudy conditions. Excessive nitrogen fertilization increases damage.',
  },
  'rice-bug': {
    id: 'rice-bug',
    name: 'Rice Bug',
    crop: 'Rice',
    // Active during grain-filling stages (both seasons)
    monthly: [1, 2, 3, 4, 3, 2, 2, 3, 4, 5, 4, 2],
    peakMonths: ['October', 'September', 'April'],
    season: 'Late Wet / Dry',
    note: 'Feeds on developing grains. Peak populations coincide with flowering and grain-filling.',
  },
  'green-leafhopper': {
    id: 'green-leafhopper',
    name: 'Green Leafhopper',
    crop: 'Rice',
    // Year-round vector, peaks in wet season
    monthly: [2, 2, 3, 3, 3, 4, 5, 5, 5, 4, 3, 2],
    peakMonths: ['July', 'August', 'September'],
    season: 'Wet Season',
    note: 'Primary tungro virus vector. Monitor heavily during wet-season crop establishment.',
  },
  'brown-planthopper': {
    id: 'brown-planthopper',
    name: 'Brown Planthopper',
    crop: 'Rice',
    // Builds up midâ€“late wet season, can outbreak
    monthly: [1, 1, 2, 2, 2, 3, 4, 5, 5, 5, 3, 2],
    peakMonths: ['August', 'September', 'October'],
    season: 'Wet Season',
    note: 'Hopper burn outbreaks during wet season. Avoid broad-spectrum insecticides that kill natural enemies.',
  },
  'armyworm': {
    id: 'armyworm',
    name: 'Armyworm',
    crop: 'Corn',
    // Year-round in tropics, spikes at start of wet season
    monthly: [3, 3, 3, 4, 4, 5, 5, 5, 4, 4, 3, 3],
    peakMonths: ['June', 'July', 'August'],
    season: 'Wet Season',
    note: 'Fall armyworm is present year-round in the Philippines but peaks with early wet-season corn planting.',
  },
  'fall-armyworm': {
    id: 'fall-armyworm',
    name: 'Fall Armyworm',
    crop: 'Corn',
    monthly: [3, 3, 3, 4, 4, 5, 5, 5, 4, 4, 3, 3],
    peakMonths: ['June', 'July', 'August'],
    season: 'Wet Season',
    note: 'Invasive pest present year-round. Highest damage to newly planted wet-season corn.',
  },
  'asian-corn-borer': {
    id: 'asian-corn-borer',
    name: 'Asian Corn Borer',
    crop: 'Corn',
    // Peaks during both planting seasons
    monthly: [2, 3, 4, 4, 3, 3, 4, 5, 5, 4, 3, 2],
    peakMonths: ['August', 'September', 'March', 'April'],
    season: 'Wet & Dry',
    note: 'Active during both cropping seasons. Larvae bore into stalks 3â€“4 weeks after planting.',
  },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Get activity level color
const getActivityColor = (level) => {
  switch (level) {
    case 0: return 'bg-gray-100 text-gray-400';
    case 1: return 'bg-green-100 text-green-700';
    case 2: return 'bg-yellow-100 text-yellow-700';
    case 3: return 'bg-orange-200 text-orange-800';
    case 4: return 'bg-orange-400 text-white';
    case 5: return 'bg-red-500 text-white';
    default: return 'bg-gray-100 text-gray-400';
  }
};

const getActivityLabel = (level) => {
  switch (level) {
    case 0: return 'None';
    case 1: return 'Low';
    case 2: return 'Mild';
    case 3: return 'Moderate';
    case 4: return 'High';
    case 5: return 'Peak';
    default: return 'None';
  }
};

// ==================== SEASONAL WINDOW COMPONENT ====================
const SeasonalPestWindow = ({ cropFilter }) => {
  const [expanded, setExpanded] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState('all');

  const currentMonth = new Date().getMonth(); // 0-indexed

  // Determine the current Philippine season
  const currentSeasonLabel = (currentMonth >= 5 && currentMonth <= 9) ? 'Wet Season (Habagat)' : 'Dry Season (Amihan)';

  // Filter pests by crop
  const filteredPests = useMemo(() => {
    let pests = Object.values(PEST_SEASONAL_DATA);

    if (cropFilter && cropFilter !== 'all') {
      pests = pests.filter(p => p.crop.toLowerCase() === cropFilter.toLowerCase());
    }

    // Remove duplicate fall-armyworm if armyworm is present (they're the same species)
    const seen = new Set();
    pests = pests.filter(p => {
      const key = p.name === 'Fall Armyworm' ? 'armyworm-group' : p.id;
      if (key === 'armyworm-group' && seen.has('armyworm-group')) return false;
      // Keep armyworm, skip fall-armyworm duplicate
      if (p.id === 'fall-armyworm' && pests.some(pp => pp.id === 'armyworm')) return false;
      seen.add(key);
      return true;
    });

    // Sort by current month activity (highest first)
    pests.sort((a, b) => b.monthly[currentMonth] - a.monthly[currentMonth]);

    return pests;
  }, [cropFilter, currentMonth]);

  // Find the most active pest right now
  const topPestNow = filteredPests.length > 0 ? filteredPests[0] : null;

  return (
    <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-gray-800">Seasonal Pest Activity</h2>
            <p className="text-sm text-gray-500">
              {currentSeasonLabel} â€” {FULL_MONTHS[currentMonth]} {new Date().getFullYear()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {topPestNow && (
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
              Top threat: {topPestNow.name}
            </span>
          )}
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          {/* Season indicator bar */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-center space-x-1 text-xs text-gray-500 mb-3">
              <div className="flex items-center space-x-1">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Dry Season (Novâ€“May)</span>
              </div>
              <span className="mx-2">|</span>
              <div className="flex items-center space-x-1">
                <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                <span>Wet Season (Junâ€“Oct)</span>
              </div>
            </div>

            {/* Season background bar */}
            <div className="flex rounded-lg overflow-hidden h-2 mb-4">
              {MONTHS.map((m, i) => {
                const isWet = i >= 5 && i <= 9;
                const isCurrent = i === currentMonth;
                return (
                  <div
                    key={m}
                    className={`flex-1 relative ${isWet ? 'bg-blue-200' : 'bg-amber-200'} ${isCurrent ? 'ring-2 ring-green-500 ring-offset-1 z-10 rounded' : ''}`}
                    title={`${FULL_MONTHS[i]} â€” ${isWet ? 'Wet' : 'Dry'} Season`}
                  />
                );
              })}
            </div>

            {/* Month labels */}
            <div className="flex mb-1">
              {MONTHS.map((m, i) => (
                <div
                  key={m}
                  className={`flex-1 text-center text-xs ${i === currentMonth ? 'font-bold text-green-700' : 'text-gray-400'}`}
                >
                  {m}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="px-5 pb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">Activity:</span>
            {[1, 2, 3, 4, 5].map(level => (
              <span key={level} className={`inline-flex items-center px-2 py-0.5 rounded ${getActivityColor(level)} text-xs font-medium`}>
                {getActivityLabel(level)}
              </span>
            ))}
          </div>

          {/* Pest rows */}
          <div className="px-5 pb-5 space-y-2">
            {filteredPests.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                No pest data available for this filter.
              </div>
            ) : (
              filteredPests.map((pest) => (
                <PestSeasonRow key={pest.id} pest={pest} currentMonth={currentMonth} />
              ))
            )}
          </div>

          {/* Current alert */}
          {topPestNow && topPestNow.monthly[currentMonth] >= 4 && (
            <div className="mx-5 mb-5 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Bug className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-red-800">
                    High Activity Alert â€” {FULL_MONTHS[currentMonth]}
                  </h4>
                  <p className="text-sm text-red-700 mt-1">
                    <strong>{topPestNow.name}</strong> ({topPestNow.crop}) is currently at <strong>{getActivityLabel(topPestNow.monthly[currentMonth]).toLowerCase()}</strong> activity.{' '}
                    {topPestNow.note}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Individual pest row in the seasonal chart
const PestSeasonRow = ({ pest, currentMonth }) => {
  const [showNote, setShowNote] = useState(false);

  return (
    <div className="group">
      <div className="flex items-center space-x-3">
        {/* Pest name + crop badge */}
        <div className="w-36 sm:w-44 flex-shrink-0">
          <button
            onClick={() => setShowNote(!showNote)}
            className="text-left w-full hover:bg-gray-50 rounded px-1 py-0.5 -mx-1 transition-colors"
          >
            <p className="text-sm font-medium text-gray-800 truncate">{pest.name}</p>
            <p className="text-xs text-gray-400">{pest.crop}</p>
          </button>
        </div>

        {/* Monthly activity cells */}
        <div className="flex flex-1 gap-0.5">
          {pest.monthly.map((level, i) => {
            const isCurrent = i === currentMonth;
            return (
              <div
                key={i}
                className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-semibold transition-all
                  ${getActivityColor(level)}
                  ${isCurrent ? 'ring-2 ring-green-500 ring-offset-1 scale-105 z-10' : ''}
                `}
                title={`${FULL_MONTHS[i]}: ${getActivityLabel(level)} activity (${level}/5)`}
              >
                <span className="hidden sm:inline">{level}</span>
              </div>
            );
          })}
        </div>

        {/* Peak season badge */}
        <div className="hidden md:block w-24 flex-shrink-0 text-right">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            pest.season.includes('Wet') ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {pest.season}
          </span>
        </div>
      </div>

      {/* Expandable note */}
      {showNote && pest.note && (
        <div className="ml-0 sm:ml-44 mt-1 mb-2 pl-4 border-l-2 border-orange-300">
          <p className="text-xs text-gray-600 italic">{pest.note}</p>
          <p className="text-xs text-gray-400 mt-1">
            Peak months: {pest.peakMonths.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
};

// ==================== PEST DETAIL MODAL ====================
const PestDetailModal = ({ pest, onClose }) => {
  if (!pest) return null;

  const referenceData = PEST_REFERENCE_DATA[pest.id] || PEST_REFERENCE_DATA[pest.name?.toLowerCase().replace(/\s+/g, '-')];
  const seasonalData = PEST_SEASONAL_DATA[pest.id] || PEST_SEASONAL_DATA[pest.name?.toLowerCase().replace(/\s+/g, '-')];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">{pest.name}</h2>
              <p className="text-lg text-gray-600 italic">{pest.scientific_name}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                {pest.crop_affected}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none">
              Ã—
            </button>
          </div>

          {/* Seasonal Activity Mini-Chart inside detail modal */}
          {seasonalData && (
            <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <Calendar className="w-5 h-5 text-amber-600 mr-2" />
                <h3 className="text-lg font-semibold text-amber-800">Seasonal Activity</h3>
                <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                  seasonalData.season.includes('Wet') ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  Peak: {seasonalData.season}
                </span>
              </div>
              <div className="flex gap-1 mb-2">
                {seasonalData.monthly.map((level, i) => {
                  const isCurrent = i === new Date().getMonth();
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded flex flex-col items-center py-1 transition-all
                        ${getActivityColor(level)}
                        ${isCurrent ? 'ring-2 ring-green-500 ring-offset-1' : ''}
                      `}
                      title={`${FULL_MONTHS[i]}: ${getActivityLabel(level)}`}
                    >
                      <span className="text-xs font-bold">{level}</span>
                      <span className="text-[10px] mt-0.5 opacity-75">{MONTHS[i]}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-amber-700 mt-2 italic">{seasonalData.note}</p>
              <p className="text-xs text-gray-500 mt-1">Peak months: {seasonalData.peakMonths.join(', ')}</p>
            </div>
          )}

          {/* Reference Images Section */}
          {referenceData?.referenceImages && referenceData.referenceImages.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <ImageIcon className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-800">Reference Images</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {referenceData.referenceImages.map((img, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <div className="aspect-video bg-gray-200 flex items-center justify-center">
                      <img 
                        src={img.url} 
                        alt={`${pest.name} - ${img.stage}`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden flex-col items-center justify-center p-4 text-gray-500">
                        <Bug className="w-16 h-16 mb-2" />
                        <p className="text-sm">Image not available</p>
                      </div>
                    </div>
                    <div className="p-3 bg-white">
                      <p className="text-sm font-semibold text-gray-700 capitalize">{img.stage}</p>
                      <p className="text-xs text-gray-600">{img.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Damage Image Section */}
          {referenceData?.damageImage && (
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <ImageIcon className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-800">Typical Damage Pattern</h3>
              </div>
              <div className="border-2 border-red-400 rounded-lg overflow-hidden bg-gray-50">
                <div className="aspect-video bg-gray-200 flex items-center justify-center">
                  <img 
                    src={referenceData.damageImage} 
                    alt={`Damage caused by ${pest.name}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden flex-col items-center justify-center p-4 text-gray-500">
                    <Bug className="w-16 h-16 mb-2" />
                    <p className="text-sm">Damage image not available</p>
                  </div>
                </div>
                <div className="p-3 bg-white">
                  <p className="text-sm font-semibold text-red-700">Typical damage symptoms caused by {pest.name}</p>
                  <p className="text-xs text-gray-600">Use this reference to identify pest damage in the field</p>
                </div>
              </div>
            </div>
          )}

          {/* Identification Tips */}
          {referenceData?.identificationTips && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Info className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-blue-800">Identification Tips</h3>
              </div>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {referenceData.identificationTips.map((tip, idx) => (
                  <li key={idx} className="text-sm">{tip}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Description</h3>
              <p className="text-gray-700">{pest.description}</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Symptoms</h3>
              <p className="text-gray-700">{pest.symptoms || referenceData?.symptoms}</p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-xl font-semibold text-orange-800 mb-2">Control Methods</h3>
              <p className="text-gray-700">{pest.control_methods || referenceData?.controlMethods}</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-xl font-semibold text-yellow-800 mb-2">Prevention</h3>
              <p className="text-gray-700">{pest.prevention || referenceData?.prevention}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full bg-primary text-gray-900 py-3 rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
const PestLibrary = ({ user, onLogout }) => {
  const [pests, setPests] = useState([]);
  const [filteredPests, setFilteredPests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPest, setSelectedPest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cropFilter, setCropFilter] = useState('all');

  useEffect(() => {
    fetchPests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterPests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, pests, cropFilter]);

  const fetchPests = async () => {
    try {
      const response = await api.get('/pests/');
      const data = Array.isArray(response.data) ? response.data : [];
      setPests(data);
      setFilteredPests(data);
    } catch (error) {
      console.error('Error fetching pests:', error);
      setPests([]);
      setFilteredPests([]);
    } finally {
      setLoading(false);
    }
  };

  const filterPests = () => {
    let filtered = pests.slice();

    if (cropFilter && cropFilter !== 'all') {
      const cf = cropFilter.toLowerCase();
      filtered = filtered.filter((pest) => {
        const cropAffected = (pest.crop_affected || '').toLowerCase();
        return cropAffected.includes(cf) || cropAffected === cf;
      });
    }

    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((pest) => {
        const name = (pest.name || '').toLowerCase();
        const sci = (pest.scientific_name || '').toLowerCase();
        return name.includes(q) || sci.includes(q);
      });
    }

    setFilteredPests(filtered);
  };

  // Sample pest data fallback
  const samplePests = [
    // Rice Pests
    {
      id: 'stem-borer',
      name: 'Stem Borer',
      scientific_name: 'Scirpophaga incertulas',
      crop_affected: 'Rice',
      description: 'A major rice pest that bores into rice stems causing deadhearts and whiteheads.',
      symptoms: 'Deadhearts in vegetative stage, whiteheads in reproductive stage, hollow stems with boring holes',
      control_methods: 'Apply granular insecticides (cartap, fipronil), use light traps, remove affected plants, biological control with Trichogramma',
      prevention: 'Use resistant varieties, proper planting timing, remove stubbles after harvest, maintain field sanitation'
    },
    {
      id: 'whorl-maggot',
      name: 'Whorl Maggot',
      scientific_name: 'Hydrellia philippina',
      crop_affected: 'Rice',
      description: 'A small fly pest whose larvae create transparent patches on young rice leaves.',
      symptoms: 'Transparent patches on young leaves, stunted growth, yellowing of central whorl leaves',
      control_methods: 'Use resistant varieties, apply carbofuran granules, spray contact insecticides early morning',
      prevention: 'Avoid over-fertilization with nitrogen, maintain proper water management, use certified seeds'
    },
    {
      id: 'leaf-folder',
      name: 'Leaf Folder',
      scientific_name: 'Cnaphalocrocis medinalis',
      crop_affected: 'Rice',
      description: 'A moth whose larvae fold rice leaves longitudinally, creating tube-like structures.',
      symptoms: 'Longitudinally folded leaves, white longitudinal streaks on leaves, reduced photosynthesis',
      control_methods: 'Manual removal of folded leaves, spray with chlorantraniliprole or flubendiamide, use light traps',
      prevention: 'Avoid excessive nitrogen, balanced fertilization, use resistant varieties, maintain field sanitation'
    },
    {
      id: 'rice-bug',
      name: 'Rice Bug',
      scientific_name: 'Leptocorisa oratorius',
      crop_affected: 'Rice',
      description: 'A long slender bug that feeds on developing rice grains causing discoloration.',
      symptoms: 'Discolored or empty grains, "buggy" grains with dark spots, reduced grain weight, unfilled grains',
      control_methods: 'Spray with malathion or fenitrothion during milk to dough stage, hand collection in small fields',
      prevention: 'Synchronous planting in area, remove weedy grasses around fields, use pheromone traps'
    },
    {
      id: 'green-leafhopper',
      name: 'Green Leafhopper',
      scientific_name: 'Nephotettix virescens',
      crop_affected: 'Rice',
      description: 'A small bright green insect that transmits tungro virus to rice plants.',
      symptoms: 'Yellowing and stunting (tungro disease), hopper burn, reduced tillering, orange-yellow discoloration',
      control_methods: 'Use resistant varieties, apply imidacloprid or thiamethoxam, spray neem-based products',
      prevention: 'Remove weeds and volunteer rice plants, use virus-free seeds, avoid excessive nitrogen'
    },
    {
      id: 'brown-planthopper',
      name: 'Brown Planthopper',
      scientific_name: 'Nilaparvata lugens',
      crop_affected: 'Rice',
      description: 'A serious rice pest that feeds on plant sap, causing hopper burn and transmitting viruses.',
      symptoms: 'Yellowing and drying of plants (hopper burn), stunted growth, reduced tillering, plant death in severe cases',
      control_methods: 'Use resistant varieties, apply buprofezin or pymetrozine, reduce nitrogen, encourage natural enemies',
      prevention: 'Balanced fertilization, alternate wetting and drying, use resistant varieties, field sanitation'
    },
    // Corn Pests
    {
      id: 'armyworm',
      name: 'Armyworm',
      scientific_name: 'Spodoptera frugiperda',
      crop_affected: 'Corn',
      description: 'A destructive moth larva that feeds on corn leaves, stalks, and ears.',
      symptoms: 'Ragged holes in leaves, sawdust-like frass in whorl, damaged tassels and ears, skeletonized leaves',
      control_methods: 'Early detection and hand-picking, Bt-based biopesticides, chlorantraniliprole, emamectin benzoate',
      prevention: 'Early planting, crop rotation, remove crop residues, use pheromone traps, intercropping'
    },
    {
      id: 'asian-corn-borer',
      name: 'Asian Corn Borer',
      scientific_name: 'Ostrinia furnacalis',
      crop_affected: 'Corn',
      description: 'A lepidopteran pest that tunnels into corn stalks and ears.',
      symptoms: 'Shot-hole appearance on leaves, entry holes in stalks, broken tassels, damaged kernels, lodging',
      control_methods: 'Bt corn varieties, apply granular insecticides in whorl (carbofuran), trichogramma wasps',
      prevention: 'Plant Bt corn, destroy crop residues, proper crop rotation, remove volunteer corn, early planting'
    }
  ];

  const displayPests = filteredPests.length > 0 ? filteredPests : 
    (cropFilter === 'all' ? samplePests : 
      samplePests.filter(p => p.crop_affected.toLowerCase() === cropFilter.toLowerCase()))
    .filter(p => {
      if (!searchQuery || searchQuery.trim() === '') return true;
      const q = searchQuery.toLowerCase();
      const name = (p.name || '').toLowerCase();
      const sci = (p.scientific_name || '').toLowerCase();
      return name.includes(q) || sci.includes(q);
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Pest Library</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 items-center">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search pests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
            </div>

            <div className="flex-shrink-0 flex space-x-2">
              <button
                onClick={() => setCropFilter('all')}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  cropFilter === 'all' ? 'bg-primary text-gray-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setCropFilter('rice')}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  cropFilter === 'rice' ? 'bg-primary text-gray-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Rice
              </button>
              <button
                onClick={() => setCropFilter('corn')}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  cropFilter === 'corn' ? 'bg-primary text-gray-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Corn
              </button>
            </div>
          </div>
        </div>

        {/* Seasonal Pest Activity Window */}
        <SeasonalPestWindow cropFilter={cropFilter} />

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Loading pest library...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayPests.map((pest) => {
              const referenceData = PEST_REFERENCE_DATA[pest.id] || PEST_REFERENCE_DATA[pest.name?.toLowerCase().replace(/\s+/g, '-')];
              const thumbnailUrl = referenceData?.referenceImages?.[0]?.url;
              
              return (
                <div
                  key={pest.id}
                  onClick={() => setSelectedPest(pest)}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                >
                  {/* Pest Image */}
                  {thumbnailUrl && (
                    <div className="h-48 bg-gray-100 overflow-hidden">
                      <img 
                        src={thumbnailUrl} 
                        alt={pest.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden w-full h-full items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-100">
                        <Bug className="w-16 h-16 text-yellow-300" />
                      </div>
                    </div>
                  )}
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      {!thumbnailUrl && <Book className="w-8 h-8 text-primary flex-shrink-0" />}
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full ml-auto">
                        {pest.crop_affected}
                      </span>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{pest.name}</h3>
                    <p className="text-sm text-gray-600 italic mb-3">{pest.scientific_name}</p>
                    <p className="text-gray-700 line-clamp-3">{pest.description}</p>

                    <button className="mt-4 text-primary font-semibold hover:underline flex items-center">
                      Learn More 
                      <span className="ml-1">â†’</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pest Detail Modal */}
        {selectedPest && <PestDetailModal pest={selectedPest} onClose={() => setSelectedPest(null)} />}
      </div>
    </div>
  );
};

export default PestLibrary;