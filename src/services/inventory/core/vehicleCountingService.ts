
import { supabase } from '@/integrations/supabase/client';

export interface VehicleCounts {
  totalVehicles: number;
  regularNewTotal: number;
  regularNewAvailable: number;
  usedTotal: number;
  usedAvailable: number;
  usedSold: number;
  soldVehicles: number;
}

export const getVehicleCounts = async (): Promise<VehicleCounts> => {
  // Get total count
  const { count: totalVehicles } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true });

  // Get regular new vehicles (not GM Global orders)
  const { count: regularNewTotal } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('condition', 'new')
    .or('source_report.is.null,source_report.neq.orders_all');

  const { count: regularNewAvailable } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('condition', 'new')
    .eq('status', 'available')
    .or('source_report.is.null,source_report.neq.orders_all');

  // Get used vehicles
  const { count: usedTotal } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('condition', 'used');

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
