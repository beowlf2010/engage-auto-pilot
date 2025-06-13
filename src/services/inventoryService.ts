
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
