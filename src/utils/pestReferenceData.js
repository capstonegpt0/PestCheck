// Pest Reference Images and Data - UPDATED WITH WORKING URLS
// File: src/utils/pestReferenceData.js
// 
// IMPORTANT: These are placeholder images. Replace with actual pest images!
// See REFERENCE_IMAGES_FIX.md for instructions on adding real images

export const PEST_REFERENCE_DATA = {
  // ==================== RICE PESTS ====================
  
  'stem-borer': {
    id: 'stem-borer',
    name: 'Stem Borer',
    scientificName: 'Scirpophaga incertulas',
    crop: 'Rice',
    referenceImages: [
      {
        url: 'https://images.unsplash.com/photo-1593460375559-c9c5d9f45793?w=400&h=300&fit=crop',
        stage: 'adult',
        description: 'Adult moth - yellowish-white with brown markings'
      }
    ],
    damageImage: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=300&fit=crop',
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
        url: 'https://images.unsplash.com/photo-1503777119540-ce54b422baff?w=400&h=300&fit=crop',
        stage: 'adult',
        description: 'Small fly with shiny metallic appearance'
      }
    ],
    damageImage: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=300&fit=crop',
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
        url: 'https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?w=400&h=300&fit=crop',
        stage: 'adult',
        description: 'Moth with brown wings and wavy white/cream patterns'
      }
    ],
    damageImage: 'https://images.unsplash.com/photo-1592921870583-25f1e2f0c40a?w=400&h=300&fit=crop',
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
        url: 'https://images.unsplash.com/photo-1516486392848-8b67ef89f113?w=400&h=300&fit=crop',
        stage: 'adult',
        description: 'Long slender bug, brown to reddish-brown'
      }
    ],
    damageImage: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=400&h=300&fit=crop',
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
        url: 'https://images.unsplash.com/photo-1535083783855-76ae62b2914e?w=400&h=300&fit=crop',
        stage: 'adult',
        description: 'Bright green body with distinctive black markings'
      }
    ],
    damageImage: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=300&fit=crop',
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
        url: 'https://images.unsplash.com/photo-1602250988341-d0ae1368b5f2?w=400&h=300&fit=crop',
        stage: 'adult',
        description: 'Small brown insect with transparent wings'
      }
    ],
    damageImage: 'https://images.unsplash.com/photo-1516486392848-8b67ef89f113?w=400&h=300&fit=crop',
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
        url: 'https://images.unsplash.com/photo-1534550055-3705ceec7f67?w=400&h=300&fit=crop',
        stage: 'adult',
        description: 'Adult moth - brown with mottled patterns'
      },
      {
        url: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=400&h=300&fit=crop',
        stage: 'larva',
        description: 'Larva/caterpillar - green to brown with stripes'
      }
    ],
    damageImage: 'https://images.unsplash.com/photo-1593460375559-c9c5d9f45793?w=400&h=300&fit=crop',
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

  'asian-corn-borer': {
    id: 'asian-corn-borer',
    name: 'Asian Corn Borer',
    scientificName: 'Ostrinia furnacalis',
    crop: 'Corn',
    referenceImages: [
      {
        url: 'https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?w=400&h=300&fit=crop',
        stage: 'adult',
        description: 'Adult moth - yellowish-brown with wavy patterns'
      },
      {
        url: 'https://images.unsplash.com/photo-1595147389795-37094173bfd8?w=400&h=300&fit=crop',
        stage: 'larva',
        description: 'Larva inside corn stalk - pinkish-white with brown head'
      }
    ],
    damageImage: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=300&fit=crop',
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
  },

  // ==================== FALL ARMYWORM (Added for testing) ====================
  'fall-armyworm': {
    id: 'fall-armyworm',
    name: 'Fall Armyworm',
    scientificName: 'Spodoptera frugiperda',
    crop: 'Corn',
    referenceImages: [
      {
        url: 'https://images.unsplash.com/photo-1534550055-3705ceec7f67?w=400&h=300&fit=crop',
        stage: 'adult',
        description: 'Adult moth - brown with mottled patterns'
      },
      {
        url: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=400&h=300&fit=crop',
        stage: 'larva',
        description: 'Caterpillar with distinctive markings'
      }
    ],
    damageImage: 'https://images.unsplash.com/photo-1593460375559-c9c5d9f45793?w=400&h=300&fit=crop',
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
 * Get pest data by ID with flexible matching
 * Handles various name formats: "Stem Borer", "stem-borer", "stem borer", "stemborer"
 */
export const getPestById = (pestId) => {
  if (!pestId) return null;
  
  console.log('🔍 Looking for pest:', pestId);
  
  // Normalize the input ID
  const normalizedInput = normalizePestName(pestId);
  console.log('🔍 Normalized input:', normalizedInput);
  
  // Try exact match on ID first
  const directMatch = PEST_REFERENCE_DATA[pestId.toLowerCase().trim()];
  if (directMatch) {
    console.log('✅ Direct match found:', directMatch.name);
    return directMatch;
  }
  
  // Try to find by normalized name matching
  const pestEntry = Object.values(PEST_REFERENCE_DATA).find(pest => {
    const normalizedPestName = normalizePestName(pest.name);
    const normalizedPestId = normalizePestName(pest.id);
    const normalizedScientificName = normalizePestName(pest.scientificName);
    
    const isMatch = normalizedPestName === normalizedInput ||
                   normalizedPestId === normalizedInput ||
                   normalizedScientificName === normalizedInput;
    
    if (isMatch) {
      console.log('✅ Match found:', pest.name);
    }
    
    return isMatch;
  });
  
  if (!pestEntry) {
    console.log('❌ No match found for:', pestId);
    console.log('Available pests:', Object.keys(PEST_REFERENCE_DATA));
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