// Pest Reference Images and Data
// File: src/utils/pestReferenceData.js

export const PEST_REFERENCE_DATA = {
  // ==================== RICE PESTS ====================
  
  'stem-borer': {
    id: 'stem-borer',
    name: 'Stem Borer',
    scientificName: 'Scirpophaga incertulas',
    crop: 'Rice',
    referenceImages: [
      {
        url: '/assets/pests/stemborer.jpg',
        stage: 'adult',
        description: 'Adult moth - yellowish-white with brown markings'
      }
    ],
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
        url: '/assets/pests/whorlmaggot.jpg',
        stage: 'adult',
        description: 'Small fly with shiny metallic appearance'
      }
    ],
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
        url: '/assets/pests/leaffolder.jpg',
        stage: 'adult',
        description: 'Moth with brown wings and wavy white/cream patterns'
      }
    ],
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
        url: '/assets/pests/ricebug.jpg',
        stage: 'adult',
        description: 'Long slender bug, brown to reddish-brown'
      }
    ],
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
        url: '/assets/pests/greenleafhopper.jpg',
        stage: 'adult',
        description: 'Bright green body with distinctive black markings'
      }
    ],
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
        url: '/assets/pests/brownplanthopper.jpg',
        stage: 'adult',
        description: 'Small brown insect with transparent wings'
      }
    ],
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

  'Armyworm': {
    id: 'Armyworm',
    name: 'Fall Armyworm',
    scientificName: 'Spodoptera frugiperda',
    crop: 'Corn',
    referenceImages: [
      {
        url: '/assets/pests/armywormoth.jpg',
        stage: 'adult',
        description: 'Adult moth - brown with mottled patterns'
      },
      {
        url: '/assets/pests/armyworm.jpg',
        stage: 'larva',
        description: 'Larva/caterpillar - green to brown with stripes'
      }
    ],
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

  'Asian-Corn-Borer': {
    id: 'Asian-Corn-Borer',
    name: 'Asian Corn Borer',
    scientificName: 'Ostrinia furnacalis',
    crop: 'Corn',
    referenceImages: [
      {
        url: '/assets/pests/cornborermoth.jpg',
        stage: 'adult',
        description: 'Adult moth - yellowish-brown with wavy patterns'
      },
      {
        url: '/assets/pests/cornborerlarvae.jpg',
        stage: 'larva',
        description: 'Larva inside corn stalk - pinkish-white with brown head'
      }
    ],
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

// Helper function to get pest data by ID
export const getPestById = (pestId) => {
  if (!pestId) return null;
  
  // Normalize pest ID (handle different formats)
  const normalizedId = pestId.toLowerCase().trim();
  
  // Direct match
  if (PEST_REFERENCE_DATA[normalizedId]) {
    return PEST_REFERENCE_DATA[normalizedId];
  }
  
  // Try to find by name match
  const pestEntry = Object.values(PEST_REFERENCE_DATA).find(pest => 
    pest.name.toLowerCase() === normalizedId ||
    pest.scientificName.toLowerCase() === normalizedId ||
    pest.id.toLowerCase() === normalizedId
  );
  
  return pestEntry || null;
};

// Helper function to get all pests for a crop
export const getPestsByCrop = (crop) => {
  if (!crop) return Object.values(PEST_REFERENCE_DATA);
  
  const normalizedCrop = crop.toLowerCase();
  return Object.values(PEST_REFERENCE_DATA).filter(
    pest => pest.crop.toLowerCase() === normalizedCrop
  );
};

// Helper function to search pests
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

export default PEST_REFERENCE_DATA;