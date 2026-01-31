// src/data/mockData.js

export const mockPests = [
  {
    id: 1,
    name: 'Brown Planthopper',
    scientific_name: 'Nilaparvata lugens',
    crop_affected: 'rice',
    description: 'A serious rice pest that feeds on plant sap, causing hopper burn and transmitting viruses.',
    symptoms: 'Yellowing and wilting of leaves, stunted growth, hopper burn appearance on leaves.',
    control_methods: 'Use resistant varieties, apply insecticides (imidacloprid, buprofezin), maintain proper water management, introduce natural predators.',
    prevention: 'Monitor fields regularly, avoid excessive nitrogen fertilizer, maintain balanced ecosystem with natural predators.',
    image_url: 'https://example.com/brown-planthopper.jpg'
  },
  {
    id: 2,
    name: 'Fall Armyworm',
    scientific_name: 'Spodoptera frugiperda',
    crop_affected: 'corn',
    description: 'A destructive moth larva that feeds on corn leaves, stalks, and ears.',
    symptoms: 'Irregular holes in leaves, sawdust-like frass near whorl, damaged tassels and ears.',
    control_methods: 'Early morning hand-picking, apply Bt-based biopesticides, use chemical insecticides (chlorantraniliprole, emamectin benzoate).',
    prevention: 'Crop rotation, remove crop residues, use pheromone traps, plant early maturing varieties.',
    image_url: 'https://example.com/fall-armyworm.jpg'
  },
  {
    id: 3,
    name: 'Rice Stem Borer',
    scientific_name: 'Scirpophaga incertulas',
    crop_affected: 'rice',
    description: 'A major rice pest that bores into rice stems causing deadhearts and whiteheads.',
    symptoms: 'Deadhearts in vegetative stage, whiteheads in reproductive stage, hollow stems.',
    control_methods: 'Apply granular insecticides (cartap, fipronil), use light traps, remove affected plants.',
    prevention: 'Use resistant varieties, proper timing of planting, remove stubbles after harvest, maintain field sanitation.',
    image_url: 'https://example.com/rice-stem-borer.jpg'
  }
];

export const mockDetections = [
  {
    id: 1,
    pest_name: 'Brown Planthopper',
    crop_type: 'rice',
    severity: 'high',
    confidence: 0.92,
    detected_at: new Date().toISOString(),
    latitude: 15.2047,
    longitude: 120.5947,
    address: 'Magalang, Pampanga',
    image: null
  },
  {
    id: 2,
    pest_name: 'Fall Armyworm',
    crop_type: 'corn',
    severity: 'critical',
    confidence: 0.88,
    detected_at: new Date(Date.now() - 86400000).toISOString(),
    latitude: 15.2147,
    longitude: 120.6047,
    address: 'Magalang, Pampanga',
    image: null
  }
];

export const mockFarms = [
  {
    id: 1,
    name: 'Rice Field A',
    lat: 15.2047,
    lng: 120.5947,
    size: 5,
    crop_type: 'Rice',
    is_verified: true,
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Corn Field B',
    lat: 15.2147,
    lng: 120.6047,
    size: 3,
    crop_type: 'Corn',
    is_verified: true,
    created_at: new Date().toISOString()
  }
];

export const mockStats = {
  total_detections: 15,
  by_severity: {
    low: 4,
    medium: 6,
    high: 3,
    critical: 2
  },
  by_crop: {
    rice: 8,
    corn: 7
  },
  by_pest: [
    { pest_name: 'Brown Planthopper', count: 5 },
    { pest_name: 'Fall Armyworm', count: 4 },
    { pest_name: 'Rice Stem Borer', count: 3 }
  ]
};  

