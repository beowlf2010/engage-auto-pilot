
// Re-export everything from the core modules for backward compatibility
export type { 
  InventoryDemandPrediction
} from './inventory/demandPredictionCore';

export type { VehicleVelocityTracking } from './inventory/velocityTrackingCore';

// Demand prediction functions
export { 
  calculateInventoryDemandPredictions, 
  getInventoryDemandPredictions 
} from './inventory/demandPredictionCore';

// Velocity tracking functions
export { 
  getVehicleVelocityTracking 
} from './inventory/velocityTrackingCore';

// Inventory alerts functions
export { 
  generateInventoryAlerts 
} from './inventory/inventoryAlertsCore';
