
import { supabase } from '@/integrations/supabase/client';

export interface ActiveVehicleCounts {
  totalVehicles: number;
  regularNewTotal: number;
  regularNewAvailable: number;
  usedTotal: number;
  usedAvailable: number;
  usedSold: number;
  soldVehicles: number;
}

export const getActiveVehicleCounts = async (): Promise<ActiveVehicleCounts> => {
  console.log('=== FIXED ACTIVE VEHICLE COUNTING (NO DOUBLE COUNTING) ===');
  
  // Count ALL GM Global orders (these are ALL the new vehicles)
  const { count: gmGlobalOrders } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('source_report', 'orders_all')
    .neq('status', 'sold');

  console.log('GM Global orders (not sold) - THIS IS ALL NEW VEHICLES:', gmGlobalOrders);

  // Count used vehicles - available only
  const { count: usedAvailable } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('condition', 'used')
    .eq('status', 'available');

  console.log('Used available:', usedAvailable);

  // Count sold vehicles (for reference only)
  const { count: soldVehicles } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sold');

  console.log('Total sold vehicles (excluded from active count):', soldVehicles);

  const { count: usedSold } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('condition', 'used')
    .eq('status', 'sold');

  console.log('Used sold vehicles:', usedSold);

  // Calculate actual total: GM Global orders (all new) + available used vehicles
  const actualTotalVehicles = (gmGlobalOrders || 0) + (usedAvailable || 0);
  console.log('CORRECTED total active vehicles:', actualTotalVehicles);

  return {
    // Fixed: Only count active inventory, no double counting
    totalVehicles: actualTotalVehicles,
    // All new vehicles are GM Global orders - no separate "regular new"
    regularNewTotal: gmGlobalOrders || 0,
    regularNewAvailable: 0, // This should be 0 since all new are GM Global
    usedTotal: usedAvailable || 0, // Only available used vehicles
    usedAvailable: usedAvailable || 0,
    usedSold: usedSold || 0,
    soldVehicles: soldVehicles || 0, // For reference, but not included in total
  };
};

export const getActiveGMGlobalOrderCounts = async () => {
  console.log('Getting GM Global order counts...');
  
  const { data: gmGlobalData } = await supabase
    .from('inventory')
    .select('status')
    .eq('source_report', 'orders_all')
    .neq('status', 'sold'); // Only count non-sold GM Global orders
  
  let gmGlobalAvailable = 0;
  let gmGlobalInProduction = 0;
  let gmGlobalInTransit = 0;
  let gmGlobalPlaced = 0;
  
  if (gmGlobalData) {
    gmGlobalData.forEach(vehicle => {
      const statusNum = parseInt(vehicle.status);
      
      if (statusNum === 6000) {
        gmGlobalAvailable++;
      } else if (statusNum >= 5000 && statusNum <= 5999) {
        gmGlobalAvailable++;
      } else if (statusNum >= 3800 && statusNum <= 4999) {
        gmGlobalInTransit++;
      } else if (statusNum >= 2500 && statusNum <= 3799) {
        gmGlobalInProduction++;
      } else if (statusNum >= 2000 && statusNum <= 2499) {
        gmGlobalPlaced++;
      }
    });
  }

  console.log('GM Global breakdown:', {
    available: gmGlobalAvailable,
    inTransit: gmGlobalInTransit,
    inProduction: gmGlobalInProduction,
    placed: gmGlobalPlaced,
    total: gmGlobalData?.length || 0
  });

  return {
    gmGlobalData: gmGlobalData || [],
    gmGlobalByStatus: {
      available: gmGlobalAvailable,
      inTransit: gmGlobalInTransit,
      inProduction: gmGlobalInProduction,
      placed: gmGlobalPlaced,
    }
  };
};
