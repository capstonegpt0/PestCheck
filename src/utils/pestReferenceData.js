// Pest Reference Images and Data
// File: frontend/src/utils/pestReferenceData.js
// 
// IMPORTANT: Update BACKEND_URL to match your deployed backend
// Local: http://localhost:8000
// Production: https://pestcheck-backend.onrender.com (or your actual URL)

const BACKEND_URL = 'https://pestcheck-backend.onrender.com'; // ⚠️ UPDATE THIS!

export const PEST_REFERENCE_DATA = {
  // ==================== RICE PESTS ====================
  
  'stem-borer': {
    id: 'stem-borer',
    name: 'Stem Borer',
    scientificName: 'Scirpophaga incertulas',
    crop: 'Rice',
    referenceImages: [
      {
        url: `${BACKEND_URL}/static/pests/stemborer.jpg`,
        stage: 'adult',
        description: 'Adult moth - yellowish-white with brown markings'
      }
    ],
    damageImage: `${BACKEND_URL}/static/damage/stemborerdamage.jpg`,
    identificationTips: [
      'Yellowish-white moth with triangular shape',
      'Dark spots and streaks on forewings',
      'Wingspan about 20-30mm',
      'Look for "deadheart" in young plants',
      'Check for "whitehead" in mature plants'
    ],
    symptoms: 'Deadhearts in vegetative stage, whiteheads in reproductive stage, hollow stems with boring holes',
    controlMethods: 'Apply granular insecticides (cartap, fipronil), use light traps, remove affected plants, biological control with Trichogramma',
    prevention: 'Use resistant varieties, proper planting timing, remove stubbles after harvest, maintain field sanitation'
  },

  'whorl-maggot': {
    id: 'whorl-maggot',
    name: 'Whorl Maggot',
    scientificName: 'Hydrellia philippina',
    crop: 'Rice',
    referenceImages: [
      {
        url: `${BACKEND_URL}/static/pests/whorlmaggot.jpg`,
        stage: 'adult',
        description: 'Small fly with shiny metallic appearance'
      }
    ],
    damageImage: `${BACKEND_URL}/static/damage/whorlmaggotdamage.jpg`,
    identificationTips: [
      'Very small fly (2-3mm)',
      'Shiny black or metallic green/blue color',
      'Fast-flying, difficult to catch',
      'Larvae create transparent patches on leaves',
      'Most active during wet season'
    ],
    symptoms: 'Transparent patches on young leaves, stunted growth, yellowing of central whorl leaves',
    controlMethods: 'Use resistant varieties, apply carbofuran granules, spray contact insecticides early morning',
    prevention: 'Avoid over-fertilization with nitrogen, maintain proper water management, use certified seeds'
  },

  'leaf-folder': {
    id: 'leaf-folder',
    name: 'Leaf Folder',
    scientificName: 'Cnaphalocrocis medinalis',
    crop: 'Rice',
    referenceImages: [
      {
        url: `${BACKEND_URL}/static/pests/leaffolder.jpg`,
        stage: 'adult',
        description: 'Moth with brown wings and wavy white/cream patterns'
      }
    ],
    damageImage: `${BACKEND_URL}/static/damage/leaffolderdamage.jpg`,
    identificationTips: [
      'Brown moth with distinctive wavy patterns',
      'White or cream colored lines across wings',
      'Wingspan 15-20mm',
      'Larvae fold leaves into tubes',
      'Green larvae with brown head'
    ],
    symptoms: 'Longitudinally folded leaves, white longitudinal streaks on leaves, reduced photosynthesis',
    controlMethods: 'Manual removal of folded leaves, spray with chlorantraniliprole or flubendiamide, use light traps',
    prevention: 'Avoid excessive nitrogen, balanced fertilization, use resistant varieties, maintain field sanitation'
  },

  'rice-bug': {
    id: 'rice-bug',
    name: 'Rice Bug',
    scientificName: 'Leptocorisa oratorius',
    crop: 'Rice',
    referenceImages: [
      {
        url: `${BACKEND_URL}/static/pests/ricebug.jpg`,
        stage: 'adult',
        description: 'Long slender bug, brown to reddish-brown'
      }
    ],
    damageImage: `${BACKEND_URL}/static/damage/ricebugdamage.jpg`,
    identificationTips: [
      'Long slender body (15-20mm)',
      'Brown to reddish-brown color',
      'Very long antennae (longer than body)',
      'Narrow head',
      'Feeds on developing grains causing discoloration'
    ],
    symptoms: 'Discolored or empty grains, "buggy" grains with dark spots, reduced grain weight, unfilled grains',
    controlMethods: 'Spray with malathion or fenitrothion during milk to dough stage, hand collection in small fields',
    prevention: 'Synchronous planting in area, remove weedy grasses around fields, use pheromone traps'
  },

  'green-leafhopper': {
    id: 'green-leafhopper',
    name: 'Green Leafhopper',
    scientificName: 'Nephotettix virescens',
    crop: 'Rice',
    referenceImages: [
      {
        url: `${BACKEND_URL}/static/pests/greenleafhopper.jpg`,
        stage: 'adult',
        description: 'Bright green body with distinctive black markings'
      }
    ],
    damageImage: `${BACKEND_URL}/static/damage/greenleafhopperdamage.jpg`,
    identificationTips: [
      'Bright green color',
      'Black markings on head and thorax',
      'Very small (3-4mm)',
      'Wedge-shaped body',
      'Jumps quickly when disturbed'
    ],
    symptoms: 'Yellowing and stunting (tungro disease), hopper burn, reduced tillering, orange-yellow discoloration',
    controlMethods: 'Use resistant varieties, apply imidacloprid or thiamethoxam, spray neem-based products',
    prevention: 'Remove weeds and volunteer rice plants, use virus-free seeds, avoid excessive nitrogen'
  },

  'brown-planthopper': {
    id: 'brown-planthopper',
    name: 'Brown Planthopper',
    scientificName: 'Nilaparvata lugens',
    crop: 'Rice',
    referenceImages: [
      {
        url: `${BACKEND_URL}/static/pests/brownplanthopper.jpg`,
        stage: 'adult',
        description: 'Small brown insect with transparent wings'
      }
    ],
    damageImage: `${BACKEND_URL}/static/damage/planthopperdamage.jpg`,
    identificationTips: [
      'Small brown insect (3-4mm)',
      'Transparent wings held roof-like over body',
      'Pale brown to dark brown color',
      'Forms colonies at base of plants',
      'Causes "hopper burn"'
    ],
    symptoms: 'Yellowing and drying of plants (hopper burn), stunted growth, reduced tillering, plant death in severe cases',
    controlMethods: 'Use resistant varieties, apply buprofezin or pymetrozine, reduce nitrogen, encourage natural enemies',
    prevention: 'Balanced fertilization, alternate wetting and drying, use resistant varieties, field sanitation'
  },

  // ==================== CORN PESTS ====================

  'armyworm': {
    id: 'armyworm',
    name: 'Armyworm',
    scientificName: 'Spodoptera frugiperda',
    crop: 'Corn',
    referenceImages: [
      {
        url: `${BACKEND_URL}/static/pests/armywormoth.jpg`,
        stage: 'adult',
        description: 'Adult moth - brown with mottled patterns'
      },
      {
        url: `${BACKEND_URL}/static/pests/armyworm.jpg`,
        stage: 'larva',
        description: 'Larva/caterpillar - green to brown with stripes'
      }
    ],
    damageImage: `${BACKEND_URL}/static/damage/armywormdamage.jpg`,
    identificationTips: [
      'Larvae have distinctive inverted "Y" on head',
      'Four dark spots forming square on last segment',
      'Green to brown color with stripes',
      'Feeds in whorl during day',
      'Adult moth is mottled brown-gray'
    ],
    symptoms: 'Ragged holes in leaves, sawdust-like frass in whorl, damaged tassels and ears, skeletonized leaves',
    controlMethods: 'Early detection and hand-picking, Bt-based biopesticides, chlorantraniliprole, emamectin benzoate',
    prevention: 'Early planting, crop rotation, remove crop residues, use pheromone traps, intercropping'
  },

  'fall-armyworm': {
    id: 'fall-armyworm',
    name: 'Fall Armyworm',
    scientificName: 'Spodoptera frugiperda',
    crop: 'Corn',
    referenceImages: [
      {
        url: `${BACKEND_URL}/static/pests/armywormoth.jpg`,
        stage: 'adult',
        description: 'Adult moth - brown with mottled patterns'
      },
      {
        url: `${BACKEND_URL}/static/pests/armyworm.jpg`,
        stage: 'larva',
        description: 'Caterpillar with distinctive Y marking on head'
      }
    ],
    damageImage: `${BACKEND_URL}/static/damage/armywormdamage.jpg`,
    identificationTips: [
      'Larvae have distinctive inverted "Y" on head',
      'Four dark spots forming square on last segment',
      'Green to brown color with longitudinal stripes',
      'Feeds in whorl during day',
      'Can cause severe defoliation'
    ],
    symptoms: 'Ragged holes in leaves, sawdust-like frass in whorl, damaged tassels and ears, window-pane feeding on young leaves',
    controlMethods: 'Early detection crucial, Bt-based biopesticides, spinosad, chlorantraniliprole, emamectin benzoate',
    prevention: 'Monitor regularly, early planting, crop rotation, remove crop residues, use pheromone traps, intercropping with non-host crops'
  },

  'asian-corn-borer': {
    id: 'asian-corn-borer',
    name: 'Asian Corn Borer',
    scientificName: 'Ostrinia furnacalis',
    crop: 'Corn',
    referenceImages: [
      {
        url: `${BACKEND_URL}/static/pests/cornborermoth.jpg`,
        stage: 'adult',
        description: 'Adult moth - yellowish-brown with wavy patterns'
      },
      {
        url: `${BACKEND_URL}/static/pests/cornborerlarvae.jpg`,
        stage: 'larva',
        description: 'Larva inside corn stalk - pinkish-white with brown head'
      }
    ],
    damageImage: `${BACKEND_URL}/static/damage/cornborerlarvaedamage.jpg`,
    identificationTips: [
      'Larvae are pinkish-white with brown head',
      'Multiple small black spots on body segments',
      'Creates tunnels in stalks and ears',
      'Sawdust-like frass at entry holes',
      'Adult moth has zigzag patterns on wings'
    ],
    symptoms: 'Shot-hole appearance on leaves, entry holes in stalks, broken tassels, damaged kernels, lodging',
    controlMethods: 'Bt corn varieties, apply granular insecticides in whorl (carbofuran), trichogramma wasps',
    prevention: 'Plant Bt corn, destroy crop residues, proper crop rotation, remove volunteer corn, early planting'
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Normalize pest name for matching
 * Converts to lowercase, removes spaces/hyphens/underscores
 */
const normalizePestName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s\-_]+/g, ''); // Remove spaces, hyphens, underscores
};

/**
 * Get pest data by ID with SUPER flexible matching
 * Handles: "Fall Armyworm", "fall-armyworm", "fallarmyworm", "armyworm", "Armyworm"
 */
export const getPestById = (pestId) => {
  if (!pestId) {
    console.log('❌ getPestById: No pest ID provided');
    return null;
  }
  
  console.log('🔍 getPestById: Looking for pest:', pestId);
  
  // Normalize the input ID
  const normalizedInput = normalizePestName(pestId);
  console.log('🔍 getPestById: Normalized input:', normalizedInput);
  
  // Try exact match on ID first (case-insensitive)
  const exactKey = Object.keys(PEST_REFERENCE_DATA).find(
    key => key.toLowerCase() === pestId.toLowerCase().trim()
  );
  if (exactKey) {
    const match = PEST_REFERENCE_DATA[exactKey];
    console.log('✅ getPestById: Exact key match found:', match.name);
    console.log('📷 Reference images:', match.referenceImages);
    console.log('🌾 Damage image:', match.damageImage);
    return match;
  }
  
  // Try to find by normalized name matching
  const pestEntry = Object.values(PEST_REFERENCE_DATA).find(pest => {
    const normalizedPestName = normalizePestName(pest.name);
    const normalizedPestId = normalizePestName(pest.id);
    const normalizedScientificName = normalizePestName(pest.scientificName);
    
    // Also check if input contains the pest name or vice versa
    const inputContainsPestName = normalizedInput.includes(normalizedPestName);
    const pestNameContainsInput = normalizedPestName.includes(normalizedInput);
    
    const isMatch = normalizedPestName === normalizedInput ||
                   normalizedPestId === normalizedInput ||
                   normalizedScientificName === normalizedInput ||
                   inputContainsPestName ||
                   pestNameContainsInput;
    
    if (isMatch) {
      console.log('✅ getPestById: Flexible match found:', pest.name, {
        normalizedPestName,
        normalizedInput,
        matchType: normalizedPestName === normalizedInput ? 'exact' :
                   inputContainsPestName ? 'contains' : 'partial'
      });
      console.log('📷 Reference images:', pest.referenceImages);
      console.log('🌾 Damage image:', pest.damageImage);
    }
    
    return isMatch;
  });
  
  if (!pestEntry) {
    console.log('❌ getPestById: No match found for:', pestId);
    console.log('📋 Available pest IDs:', Object.keys(PEST_REFERENCE_DATA));
    console.log('📋 Available pest names:', Object.values(PEST_REFERENCE_DATA).map(p => p.name));
  }
  
  return pestEntry || null;
};

/**
 * Get all pests for a specific crop
 */
export const getPestsByCrop = (crop) => {
  if (!crop) return Object.values(PEST_REFERENCE_DATA);
  
  const normalizedCrop = crop.toLowerCase();
  return Object.values(PEST_REFERENCE_DATA).filter(
    pest => pest.crop.toLowerCase() === normalizedCrop
  );
};

/**
 * Search pests by query string
 */
export const searchPests = (query) => {
  if (!query || query.trim() === '') {
    return Object.values(PEST_REFERENCE_DATA);
  }
  
  const normalizedQuery = query.toLowerCase().trim();
  return Object.values(PEST_REFERENCE_DATA).filter(pest =>
    pest.name.toLowerCase().includes(normalizedQuery) ||
    pest.scientificName.toLowerCase().includes(normalizedQuery) ||
    pest.symptoms.toLowerCase().includes(normalizedQuery)
  );
};

/**
 * Get all pest names (useful for debugging)
 */
export const getAllPestNames = () => {
  return Object.values(PEST_REFERENCE_DATA).map(pest => ({
    id: pest.id,
    name: pest.name,
    scientificName: pest.scientificName
  }));
};

export default PEST_REFERENCE_DATA;