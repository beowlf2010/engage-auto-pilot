
// Re-export all functionality from the focused modules
export type { InventoryItem, InventoryFilters } from './inventory/inventoryQueries';
export type { PricingDisclaimer } from './inventory/pricingService';
export type { InventoryStats } from './inventory/inventoryStatsService';

export { 
  getInventory, 
  findMatchingInventory, 
  getRPOAnalytics 
} from './inventory/inventoryQueries';

export { 
  getPricingDisclaimers 
} from './inventory/pricingService';

export { 
  addInventoryInterest, 
  updateInventoryLeadsCount 
} from './inventory/leadInteractionService';

export { 
  markMissingVehiclesSold, 
  syncInventoryData 
} from './inventory/inventorySync';

export { 
  getInventoryStats,
  isVehicleAvailable,
  getVehicleStatusDisplay
} from './inventory/inventoryStatsService';

// Export cleanup functionality
export { 
  performInventoryCleanup,
  cleanupInventoryData,
  getLatestUploads
} from './inventory/core/inventoryCleanupService';

// Export current inventory service for AI with safety validation
export { 
  getCurrentInventoryForAI,
  getInventoryStats as getCurrentInventoryStats
} from './inventory/core/currentInventoryService';
export type { CurrentInventoryFilters } from './inventory/core/currentInventoryService';

// Export GM model code utilities for customer safety
export { 
  translateGMModelCode, 
  extractModelFromGMData, 
  isCustomerReadyModel,
  getCustomerSafeVehicleDescription
} from './inventory/gmModelCodeLookupService';

// Export enhanced vehicle formatting with safety validation
export { 
  formatVehicleTitle,
  getVehicleDescription,
  formatPrice,
  getDataCompletenessScore
} from './inventory/vehicleFormattingService';
