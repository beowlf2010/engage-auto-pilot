
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
  console.log('=== ACTIVE VEHICLE COUNTING (FIXED) ===');
  
  // Count only truly available vehicles (not sold)
  const { count: totalAvailableVehicles } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'available');

  console.log('Total available vehicles:', totalAvailableVehicles);

  // Count GM Global orders (these have numeric status codes, not 'available')
  const { count: gmGlobalOrders } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('source_report', 'orders_all')
    .neq('status', 'sold');

  console.log('GM Global orders (not sold):', gmGlobalOrders);

  // Calculate actual total: available inventory + GM Global orders
  const actualTotalVehicles = (totalAvailableVehicles || 0) + (gmGlobalOrders || 0);
  console.log('Actual total active vehicles:', actualTotalVehicles);

  // Get regular new vehicles (not GM Global orders) - available only
  const { count: regularNewAvailable } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('condition', 'new')
    .eq('status', 'available')
    .or('source_report.is.null,source_report.neq.orders_all');

  console.log('Regular new available:', regularNewAvailable);

  // Get used vehicles - available only
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

  return {
    // This is the key fix: only count active inventory
    totalVehicles: actualTotalVehicles,
    regularNewTotal: (regularNewAvailable || 0) + (gmGlobalOrders || 0), // New available + GM Global
    regularNewAvailable: regularNewAvailable || 0,
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
