
import { supabase } from '@/integrations/supabase/client';

export interface InventoryStats {
  totalVehicles: number;
  availableVehicles: number;
  inProductionTransit: number;
  soldVehicles: number;
  averagePrice: number;
  totalValue: number;
  averageDaysInStock: number;
}

export const getInventoryStats = async (): Promise<InventoryStats> => {
  try {
    // Get total count
    const { count: totalVehicles } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true });

    // Get available vehicles - regular inventory
    const { count: regularAvailable } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available')
      .or('source_report.is.null,source_report.neq.orders_all');

    // Get available GM Global orders (status 5000 or available)
    const { count: gmGlobalAvailable } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true })
      .eq('source_report', 'orders_all')
      .in('status', ['5000', 'available']);

    // Get GM Global in production/transit
    const { count: inProductionTransit } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true })
      .eq('source_report', 'orders_all')
      .not('status', 'in', '(5000,available,sold)');

    // Get sold vehicles
    const { count: soldVehicles } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sold');

    // Get pricing data for available vehicles
    const { data: pricingData } = await supabase
      .from('inventory')
      .select('price, days_in_inventory')
      .or('status.eq.available,and(source_report.eq.orders_all,status.in.(5000,available))')
      .not('price', 'is', null);

    const validPrices = pricingData?.filter(item => item.price && item.price > 0) || [];
    const totalValue = validPrices.reduce((sum, item) => sum + item.price, 0);
    const averagePrice = validPrices.length > 0 ? totalValue / validPrices.length : 0;

    const validDays = pricingData?.filter(item => item.days_in_inventory !== null) || [];
    const averageDaysInStock = validDays.length > 0 
      ? validDays.reduce((sum, item) => sum + (item.days_in_inventory || 0), 0) / validDays.length 
      : 0;

    return {
      totalVehicles: totalVehicles || 0,
      availableVehicles: (regularAvailable || 0) + (gmGlobalAvailable || 0),
      inProductionTransit: inProductionTransit || 0,
      soldVehicles: soldVehicles || 0,
      averagePrice,
      totalValue,
      averageDaysInStock: Math.round(averageDaysInStock)
    };
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return {
      totalVehicles: 0,
      availableVehicles: 0,
      inProductionTransit: 0,
      soldVehicles: 0,
      averagePrice: 0,
      totalValue: 0,
      averageDaysInStock: 0
    };
  }
};

export const isVehicleAvailable = (vehicle: any): boolean => {
  if (vehicle.source_report === 'orders_all') {
    return ['5000', 'available'].includes(vehicle.status);
  }
  return vehicle.status === 'available';
};

export const getVehicleStatusDisplay = (vehicle: any) => {
  if (vehicle.source_report === 'orders_all') {
    switch (vehicle.status) {
      case '5000':
        return { label: 'Available', color: 'bg-green-100 text-green-800' };
      case '1000':
      case '2000':
        return { label: 'Being Built', color: 'bg-yellow-100 text-yellow-800' };
      case '3000':
      case '4000':
        return { label: 'In Transit', color: 'bg-blue-100 text-blue-800' };
      default:
        return { label: vehicle.status || 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  }
  
  switch (vehicle.status) {
    case 'available':
      return { label: 'Available', color: 'bg-green-100 text-green-800' };
    case 'sold':
      return { label: 'Sold', color: 'bg-blue-100 text-blue-800' };
    case 'pending':
      return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' };
    default:
      return { label: vehicle.status || 'Unknown', color: 'bg-gray-100 text-gray-800' };
  }
};
