// Store configuration for CARTSMASH client-side Stores section
// This file contains all supported store chains and their integration details

export const STORE_CHAINS = {
  // Albertsons Family (Safeway)
  SAFEWAY: {
    id: 'safeway',
    name: 'Safeway',
    displayName: 'Safeway',
    parent: 'Albertsons Companies',
    type: 'grocery',
    status: 'planned',
    features: {
      digitalOrdering: true,
      curbsidePickup: true,
      delivery: true,
      mobileApp: true,
      loyaltyProgram: true
    },
    integration: {
      apiAvailable: true,
      authMethod: 'oauth',
      capabilities: ['cart', 'products', 'stores', 'pricing']
    },
    branding: {
      primaryColor: '#E31837',
      logo: '/assets/logos/safeway.png',
      icon: '🛒'
    },
    regions: ['California', 'Nevada', 'Oregon', 'Washington', 'Alaska', 'Hawaii', 'Arizona', 'Colorado', 'Wyoming', 'Montana', 'Idaho', 'Utah', 'Nebraska', 'South Dakota', 'Texas', 'Maryland', 'Virginia', 'Delaware', 'Pennsylvania', 'New Jersey']
  },

  SAFEWAY_RAPID: {
    id: 'safeway-rapid',
    name: 'Safeway Rapid',
    displayName: 'Safeway Rapid',
    parent: 'Albertsons Companies',
    type: 'grocery',
    status: 'planned',
    features: {
      digitalOrdering: true,
      curbsidePickup: true,
      delivery: true,
      mobileApp: true,
      loyaltyProgram: true,
      rapidService: true
    },
    integration: {
      apiAvailable: true,
      authMethod: 'oauth',
      capabilities: ['cart', 'products', 'stores', 'pricing'],
      sharedSystem: 'safeway'
    },
    branding: {
      primaryColor: '#E31837',
      logo: '/assets/logos/safeway-rapid.png',
      icon: '⚡'
    },
    regions: ['California', 'Nevada', 'Washington']
  },

  // Kroger Family Stores
  KROGER: {
    id: 'kroger',
    name: 'Kroger',
    displayName: 'Kroger',
    parent: 'The Kroger Co.',
    type: 'grocery',
    status: 'active',
    features: {
      digitalOrdering: true,
      curbsidePickup: true,
      delivery: true,
      mobileApp: true,
      loyaltyProgram: true
    },
    integration: {
      apiAvailable: true,
      authMethod: 'oauth',
      capabilities: ['cart', 'products', 'stores', 'pricing', 'orders']
    },
    branding: {
      primaryColor: '#004C91',
      logo: '/assets/logos/kroger.png',
      icon: '🏪'
    },
    regions: ['Nationwide']
  },

  FOODMAXX: {
    id: 'foodmaxx',
    name: 'FoodMaxx',
    displayName: 'FoodMaxx',
    parent: 'The Kroger Co.',
    type: 'grocery',
    status: 'planned',
    features: {
      digitalOrdering: true,
      curbsidePickup: true,
      delivery: true,
      mobileApp: true,
      loyaltyProgram: true
    },
    integration: {
      apiAvailable: true,
      authMethod: 'oauth',
      capabilities: ['cart', 'products', 'stores', 'pricing'],
      sharedSystem: 'kroger'
    },
    branding: {
      primaryColor: '#FF6600',
      logo: '/assets/logos/foodmaxx.png',
      icon: '🛒'
    },
    regions: ['California', 'Nevada']
  },

  FOOD_4_LESS: {
    id: 'food-4-less',
    name: 'Food 4 Less',
    displayName: 'Food 4 Less',
    parent: 'The Kroger Co.',
    type: 'grocery',
    status: 'planned',
    features: {
      digitalOrdering: true,
      curbsidePickup: true,
      delivery: true,
      mobileApp: true,
      loyaltyProgram: true
    },
    integration: {
      apiAvailable: true,
      authMethod: 'oauth',
      capabilities: ['cart', 'products', 'stores', 'pricing'],
      sharedSystem: 'kroger'
    },
    branding: {
      primaryColor: '#FF0000',
      logo: '/assets/logos/food4less.png',
      icon: '💰'
    },
    regions: ['California', 'Illinois', 'Indiana', 'Nevada']
  },

  FOODSCO: {
    id: 'foodsco',
    name: 'FoodsCo',
    displayName: 'FoodsCo',
    parent: 'The Kroger Co.',
    type: 'grocery',
    status: 'planned',
    features: {
      digitalOrdering: true,
      curbsidePickup: true,
      delivery: true,
      mobileApp: true,
      loyaltyProgram: true
    },
    integration: {
      apiAvailable: true,
      authMethod: 'oauth',
      capabilities: ['cart', 'products', 'stores', 'pricing'],
      sharedSystem: 'kroger'
    },
    branding: {
      primaryColor: '#0066CC',
      logo: '/assets/logos/foodsco.png',
      icon: '🏪'
    },
    regions: ['California', 'Nevada']
  },

  FOODSCO_DELIVERY: {
    id: 'foodsco-delivery',
    name: 'FoodsCo Delivery Now',
    displayName: 'FoodsCo Delivery Now',
    parent: 'The Kroger Co.',
    type: 'grocery',
    status: 'planned',
    features: {
      digitalOrdering: true,
      curbsidePickup: false,
      delivery: true,
      mobileApp: true,
      loyaltyProgram: true,
      rapidDelivery: true
    },
    integration: {
      apiAvailable: true,
      authMethod: 'oauth',
      capabilities: ['cart', 'products', 'stores', 'pricing'],
      sharedSystem: 'kroger'
    },
    branding: {
      primaryColor: '#0066CC',
      logo: '/assets/logos/foodsco-delivery.png',
      icon: '🚚'
    },
    regions: ['California', 'Nevada']
  },

  FOODMAXX_EXPRESS: {
    id: 'foodmaxx-express',
    name: 'FoodMaxx Express',
    displayName: 'FoodMaxx Express',
    parent: 'The Kroger Co.',
    type: 'grocery',
    status: 'planned',
    features: {
      digitalOrdering: true,
      curbsidePickup: true,
      delivery: true,
      mobileApp: true,
      loyaltyProgram: true,
      expressService: true
    },
    integration: {
      apiAvailable: true,
      authMethod: 'oauth',
      capabilities: ['cart', 'products', 'stores', 'pricing'],
      sharedSystem: 'kroger'
    },
    branding: {
      primaryColor: '#FF6600',
      logo: '/assets/logos/foodmaxx-express.png',
      icon: '⚡'
    },
    regions: ['California', 'Nevada']
  },

  // Raley's Family
  RALEYS: {
    id: 'raleys',
    name: 'Raley\'s',
    displayName: 'Raley\'s',
    parent: 'Raley\'s Supermarkets',
    type: 'grocery',
    status: 'planned',
    features: {
      digitalOrdering: true,
      curbsidePickup: true,
      delivery: true,
      mobileApp: true,
      loyaltyProgram: true
    },
    integration: {
      apiAvailable: true,
      authMethod: 'oauth',
      capabilities: ['cart', 'products', 'stores', 'pricing']
    },
    branding: {
      primaryColor: '#00A651',
      logo: '/assets/logos/raleys.png',
      icon: '🌟'
    },
    regions: ['California', 'Nevada']
  },

  RALEYS_EXPRESS: {
    id: 'raleys-express',
    name: 'Raley\'s Express',
    displayName: 'Raley\'s Express',
    parent: 'Raley\'s Supermarkets',
    type: 'grocery',
    status: 'planned',
    features: {
      digitalOrdering: true,
      curbsidePickup: true,
      delivery: true,
      mobileApp: true,
      loyaltyProgram: true,
      expressService: true
    },
    integration: {
      apiAvailable: true,
      authMethod: 'oauth',
      capabilities: ['cart', 'products', 'stores', 'pricing'],
      sharedSystem: 'raleys'
    },
    branding: {
      primaryColor: '#00A651',
      logo: '/assets/logos/raleys-express.png',
      icon: '⚡'
    },
    regions: ['California', 'Nevada']
  },

  RALEYS_ONE: {
    id: 'raleys-one',
    name: 'Raley\'s O-N-E Market',
    displayName: 'Raley\'s O-N-E Market',
    parent: 'Raley\'s Supermarkets',
    type: 'grocery',
    status: 'planned',
    features: {
      digitalOrdering: true,
      curbsidePickup: true,
      delivery: true,
      mobileApp: true,
      loyaltyProgram: true,
      organicFocus: true
    },
    integration: {
      apiAvailable: true,
      authMethod: 'oauth',
      capabilities: ['cart', 'products', 'stores', 'pricing'],
      sharedSystem: 'raleys'
    },
    branding: {
      primaryColor: '#00A651',
      logo: '/assets/logos/raleys-one.png',
      icon: '🌱'
    },
    regions: ['California', 'Nevada']
  },

  // Sprouts Family
  SPROUTS: {
    id: 'sprouts',
    name: 'Sprouts Farmers Market',
    displayName: 'Sprouts Farmers Market',
    parent: 'Sprouts Farmers Market, Inc.',
    type: 'grocery',
    status: 'planned',
    features: {
      digitalOrdering: true,
      curbsidePickup: true,
      delivery: true,
      mobileApp: true,
      loyaltyProgram: true,
      organicFocus: true
    },
    integration: {
      apiAvailable: true,
      authMethod: 'oauth',
      capabilities: ['cart', 'products', 'stores', 'pricing']
    },
    branding: {
      primaryColor: '#8BC53F',
      logo: '/assets/logos/sprouts.png',
      icon: '🌱'
    },
    regions: ['Arizona', 'California', 'Colorado', 'Delaware', 'Florida', 'Georgia', 'Kansas', 'Louisiana', 'Maryland', 'Missouri', 'Nevada', 'New Jersey', 'New Mexico', 'North Carolina', 'Oklahoma', 'Pennsylvania', 'South Carolina', 'Tennessee', 'Texas', 'Utah', 'Virginia', 'Washington']
  },

  SPROUTS_EXPRESS: {
    id: 'sprouts-express',
    name: 'Sprouts Express',
    displayName: 'Sprouts Express',
    parent: 'Sprouts Farmers Market, Inc.',
    type: 'grocery',
    status: 'planned',
    features: {
      digitalOrdering: true,
      curbsidePickup: true,
      delivery: true,
      mobileApp: true,
      loyaltyProgram: true,
      organicFocus: true,
      expressService: true
    },
    integration: {
      apiAvailable: true,
      authMethod: 'oauth',
      capabilities: ['cart', 'products', 'stores', 'pricing'],
      sharedSystem: 'sprouts'
    },
    branding: {
      primaryColor: '#8BC53F',
      logo: '/assets/logos/sprouts-express.png',
      icon: '⚡'
    },
    regions: ['Arizona', 'California', 'Colorado', 'Texas']
  },

  // Smart & Final
  SMART_FINAL: {
    id: 'smart-final',
    name: 'Smart & Final',
    displayName: 'Smart & Final',
    parent: 'Smart & Final Stores, Inc.',
    type: 'grocery',
    status: 'planned',
    features: {
      digitalOrdering: true,
      curbsidePickup: true,
      delivery: true,
      mobileApp: true,
      loyaltyProgram: true,
      bulkShopping: true
    },
    integration: {
      apiAvailable: true,
      authMethod: 'oauth',
      capabilities: ['cart', 'products', 'stores', 'pricing']
    },
    branding: {
      primaryColor: '#FF6900',
      logo: '/assets/logos/smartfinal.png',
      icon: '🛒'
    },
    regions: ['California', 'Nevada', 'Arizona']
  }
};

// Store groups for easier management
export const STORE_GROUPS = {
  kroger_family: {
    name: 'Kroger Family',
    stores: ['kroger', 'foodmaxx', 'food-4-less', 'foodsco', 'foodsco-delivery', 'foodmaxx-express'],
    sharedIntegration: true,
    primaryStore: 'kroger'
  },
  safeway_family: {
    name: 'Safeway/Albertsons',
    stores: ['safeway', 'safeway-rapid'],
    sharedIntegration: true,
    primaryStore: 'safeway'
  },
  raleys_family: {
    name: 'Raley\'s Family',
    stores: ['raleys', 'raleys-express', 'raleys-one'],
    sharedIntegration: true,
    primaryStore: 'raleys'
  },
  sprouts_family: {
    name: 'Sprouts Family',
    stores: ['sprouts', 'sprouts-express'],
    sharedIntegration: true,
    primaryStore: 'sprouts'
  },
  independent: {
    name: 'Independent Stores',
    stores: ['smart-final'],
    sharedIntegration: false
  }
};

// Helper functions for store management
export const getStoreById = (id) => {
  return STORE_CHAINS[id.toUpperCase().replace('-', '_')];
};

export const getStoresByRegion = (region) => {
  return Object.values(STORE_CHAINS).filter(store => 
    store.regions.includes(region)
  );
};

export const getActiveStores = () => {
  return Object.values(STORE_CHAINS).filter(store => 
    store.status === 'active'
  );
};

export const getPlannedStores = () => {
  return Object.values(STORE_CHAINS).filter(store => 
    store.status === 'planned'
  );
};

export const getStoresByParent = (parent) => {
  return Object.values(STORE_CHAINS).filter(store => 
    store.parent === parent
  );
};

export const getStoresWithFeature = (feature) => {
  return Object.values(STORE_CHAINS).filter(store => 
    store.features[feature] === true
  );
};

// Store status definitions
export const STORE_STATUS = {
  active: {
    label: 'Active',
    color: '#10b981',
    description: 'Fully integrated and available'
  },
  planned: {
    label: 'Coming Soon',
    color: '#f59e0b',
    description: 'Integration planned for future release'
  },
  testing: {
    label: 'In Testing',
    color: '#3b82f6',
    description: 'Currently in development and testing'
  },
  maintenance: {
    label: 'Maintenance',
    color: '#6b7280',
    description: 'Temporarily unavailable for maintenance'
  }
};

export default STORE_CHAINS;