import React, { useState, useEffect } from 'react';
import { Search, Book, Image as ImageIcon, Info, Bug } from 'lucide-react';
import Navigation from './Navigation';
import api from '../utils/api';
import { PEST_REFERENCE_DATA, getPestsByCrop, searchPests } from '../utils/pestReferenceData';

const PestDetailModal = ({ pest, onClose }) => {
 if (!pest) return null;

 // Get reference data if available
 const referenceData = PEST_REFERENCE_DATA[pest.id] || PEST_REFERENCE_DATA[pest.name?.toLowerCase().replace(/\s+/g, '-')];

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
 X
 </button>
 </div>

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

 <div className="bg-green-50 border border-green-200 rounded-lg p-4">
 <h3 className="text-xl font-semibold text-green-800 mb-2">Prevention</h3>
 <p className="text-gray-700">{pest.prevention || referenceData?.prevention}</p>
 </div>
 </div>

 <button
 onClick={onClose}
 className="mt-6 w-full bg-primary text-white py-3 rounded-lg hover:bg-green-600 transition-colors font-semibold"
 >
 Close
 </button>
 </div>
 </div>
 </div>
 );
};

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
 // Ensure response.data is an array
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

 // Sample pest data fallback - Extended to match PEST_REFERENCE_DATA
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
 className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
 />
 </div>

 <div className="flex-shrink-0 flex space-x-2">
 <button
 onClick={() => setCropFilter('all')}
 className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
 cropFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
 }`}
 >
 All
 </button>
 <button
 onClick={() => setCropFilter('rice')}
 className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
 cropFilter === 'rice' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
 }`}
 >
 Rice
 </button>
 <button
 onClick={() => setCropFilter('corn')}
 className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
 cropFilter === 'corn' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
 }`}
 >
 Corn
 </button>
 </div>
 </div>
 </div>

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
 <div className="hidden w-full h-full items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
 <Bug className="w-16 h-16 text-green-300" />
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
 <span className="ml-1"></span>
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