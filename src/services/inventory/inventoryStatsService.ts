
import { getVehicleCounts } from './core/vehicleCountingService';
import { getGMGlobalOrderCounts } from './core/gmGlobalService';
import { getNewVehiclePricing, getUsedVehiclePricing, getCombinedPricing } from './core/pricingCalculationService';
import { logDetailedInventoryBreakdown } from './core/inventoryDebugService';

export interface InventoryStats {
  totalVehicles: number;
  // New vehicle stats
  newVehicles: {
    total: number;
    available: number;
    gmGlobalByStatus: {
      available: number; // 6000 + 5000-5999
      inTransit: number; // 3800-4999
      inProduction: number; // 2500-3799
      placed: number; // 2000-2499
    };
    regularNew: number; // Should always be 0 now
  };
  // Used vehicle stats
  usedVehicles: {
    total: number;
    available: number;
    sold: number;
  };
  // Legacy fields for backward compatibility
  availableVehicles: number;
  inProductionTransit: number;
  soldVehicles: number;
  averagePrice: number;
  totalValue: number;
  averageDaysInStock: number;
  // New separate pricing
  newVehicleStats: {
    averagePrice: number;
    totalValue: number;
    averageDaysInStock: number;
  };
  usedVehicleStats: {
    averagePrice: number;
    totalValue: number;
    averageDaysInStock: number;
  };
}

export const getInventoryStats = async (): Promise<InventoryStats> => {
  try {
    // Log detailed breakdown for debugging
    await logDetailedInventoryBreakdown();

    // Get vehicle counts (now corrected to avoid double counting)
    const vehicleCounts = await getVehicleCounts();

    // Get GM Global order counts
    const { gmGlobalData, gmGlobalByStatus } = await getGMGlobalOrderCounts();

    // Get pricing data
    const newVehicleStats = await getNewVehiclePricing();
    const usedVehicleStats = await getUsedVehiclePricing();
    const overallStats = getCombinedPricing(newVehicleStats, usedVehicleStats);

    // CORRECTED: All new vehicles are GM Global orders, no double counting
    const totalNewVehicles = gmGlobalData.length; // This is the correct count
    const totalNewAvailable = gmGlobalByStatus.available;
    const totalAvailable = totalNewAvailable + vehicleCounts.usedAvailable;
    const totalInProductionTransit = gmGlobalByStatus.inProduction + gmGlobalByStatus.inTransit + gmGlobalByStatus.placed;

    console.log('=== CORRECTED INVENTORY STATS ===');
    console.log('Total GM Global orders (all new vehicles):', totalNewVehicles);
    console.log('Total available new vehicles:', totalNewAvailable);
    console.log('Total available used vehicles:', vehicleCounts.usedAvailable);
    console.log('CORRECTED total vehicles:', vehicleCounts.totalVehicles);

    return {
      totalVehicles: vehicleCounts.totalVehicles, // This is now correct
      newVehicles: {
        total: totalNewVehicles,
        available: totalNewAvailable,
        gmGlobalByStatus,
        regularNew: 0, // Always 0 since all new vehicles are GM Global
      },
      usedVehicles: {
        total: vehicleCounts.usedTotal,
        available: vehicleCounts.usedAvailable,
        sold: vehicleCounts.usedSold,
      },
      // Legacy fields
      availableVehicles: totalAvailable,
      inProductionTransit: totalInProductionTransit,
      soldVehicles: vehicleCounts.soldVehicles,
      averagePrice: overallStats.averagePrice,
      totalValue: overallStats.totalValue,
      averageDaysInStock: overallStats.averageDaysInStock,
      // New separate pricing
      newVehicleStats,
      usedVehicleStats,
    };
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return {
      totalVehicles: 0,
      newVehicles: {
        total: 0,
        available: 0,
        gmGlobalByStatus: {
          available: 0,
          inTransit: 0,
          inProduction: 0,
          placed: 0,
        },
        regularNew: 0,
      },
      usedVehicles: {
        total: 0,
        available: 0,
        sold: 0,
      },
      availableVehicles: 0,
      inProductionTransit: 0,
      soldVehicles: 0,
      averagePrice: 0,
      totalValue: 0,
      averageDaysInStock: 0,
      newVehicleStats: {
        averagePrice: 0,
        totalValue: 0,
        averageDaysInStock: 0,
      },
      usedVehicleStats: {
        averagePrice: 0,
        totalValue: 0,
        averageDaysInStock: 0,
      },
    };
  }
};

// Re-export utility functions for backward compatibility
export { isVehicleAvailable, getVehicleStatusDisplay } from './core/vehicleStatusService';
