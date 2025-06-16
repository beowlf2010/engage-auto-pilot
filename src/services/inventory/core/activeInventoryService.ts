
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
  console.log('Fetching active vehicle counts...');

  // Get total vehicles count (excluding sold)
  const { count: totalVehicles } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'sold');

  console.log('Total non-sold vehicles:', totalVehicles);

  // Get regular new vehicles (not GM Global orders)
  const { count: regularNewTotal } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('condition', 'new')
    .or('source_report.is.null,source_report.neq.orders_all');

  console.log('Regular new total:', regularNewTotal);

  const { count: regularNewAvailable } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('condition', 'new')
    .eq('status', 'available')
    .or('source_report.is.null,source_report.neq.orders_all');

  console.log('Regular new available:', regularNewAvailable);

  // Get used vehicles
  const { count: usedTotal } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('condition', 'used');

  console.log('Used total:', usedTotal);

  const { count: usedAvailable } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('condition', 'used')
    .eq('status', 'available');

  console.log('Used available:', usedAvailable);

  const { count: usedSold } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('condition', 'used')
    .eq('status', 'sold');

  console.log('Used sold:', usedSold);

  // Get sold vehicles
  const { count: soldVehicles } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sold');

  console.log('Total sold vehicles:', soldVehicles);

  const result = {
    totalVehicles: totalVehicles || 0,
    regularNewTotal: regularNewTotal || 0,
    regularNewAvailable: regularNewAvailable || 0,
    usedTotal: usedTotal || 0,
    usedAvailable: usedAvailable || 0,
    usedSold: usedSold || 0,
    soldVehicles: soldVehicles || 0,
  };

  console.log('Final vehicle counts:', result);
  return result;
};

export const getActiveGMGlobalOrderCounts = async () => {
  console.log('Fetching GM Global order counts...');
  
  const { data: gmGlobalData } = await supabase
    .from('inventory')
    .select('status')
    .eq('source_report', 'orders_all');
  
  console.log('GM Global data:', gmGlobalData?.length, 'records');
  
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

  const result = {
    gmGlobalData: gmGlobalData || [],
    gmGlobalByStatus: {
      available: gmGlobalAvailable,
      inTransit: gmGlobalInTransit,
      inProduction: gmGlobalInProduction,
      placed: gmGlobalPlaced,
    }
  };

  console.log('GM Global counts:', result);
  return result;
};
