
import { supabase } from '@/integrations/supabase/client';
import { getLatestUploads } from './inventoryCleanupService';

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
  // Get latest upload IDs for filtering
  const latestUploads = await getLatestUploads();
  
  // Count only vehicles from latest uploads or with status 'available'
  const activeFilter = (query: any) => {
    return query.or(`and(status.eq.available),and(status.neq.sold)`);
  };

  // Get total active vehicles count
  const { count: totalVehicles } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'sold');

  // Get regular new vehicles (not GM Global orders) - active only
  const { count: regularNewTotal } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('condition', 'new')
    .or('source_report.is.null,source_report.neq.orders_all')
    .neq('status', 'sold');

  const { count: regularNewAvailable } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('condition', 'new')
    .eq('status', 'available')
    .or('source_report.is.null,source_report.neq.orders_all');

  // Get used vehicles - active only
  const { count: usedTotal } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('condition', 'used')
    .neq('status', 'sold');

  const { count: usedAvailable } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('condition', 'used')
    .eq('status', 'available');

  const { count: usedSold } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('condition', 'used')
    .eq('status', 'sold');

  // Get sold vehicles
  const { count: soldVehicles } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sold');

  return {
    totalVehicles: totalVehicles || 0,
    regularNewTotal: regularNewTotal || 0,
    regularNewAvailable: regularNewAvailable || 0,
    usedTotal: usedTotal || 0,
    usedAvailable: usedAvailable || 0,
    usedSold: usedSold || 0,
    soldVehicles: soldVehicles || 0,
  };
};

export const getActiveGMGlobalOrderCounts = async () => {
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
