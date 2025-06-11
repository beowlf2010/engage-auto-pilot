
// Re-export all functionality from the focused modules
export type { InventoryItem, InventoryFilters } from './inventory/inventoryQueries';
export type { PricingDisclaimer } from './inventory/pricingService';

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
