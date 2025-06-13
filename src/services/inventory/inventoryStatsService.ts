
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
    console.log('=== INVENTORY STATS CALCULATION ===');
    
    // Get total count
    const { count: totalVehicles } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true });
    console.log('Total vehicles in database:', totalVehicles);

    // Get available vehicles - regular inventory (not GM Global orders)
    const { count: regularAvailable } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available')
      .or('source_report.is.null,source_report.neq.orders_all');
    console.log('Regular available vehicles:', regularAvailable);

    // Get GM Global available orders (status 5000-5999 range)
    const { data: gmGlobalData } = await supabase
      .from('inventory')
      .select('status')
      .eq('source_report', 'orders_all');
    
    let gmGlobalAvailable = 0;
    let gmGlobalInProduction = 0;
    
    if (gmGlobalData) {
      console.log('GM Global vehicles by status:');
      gmGlobalData.forEach(vehicle => {
        const statusNum = parseInt(vehicle.status);
        if (statusNum >= 5000 && statusNum <= 5999) {
          gmGlobalAvailable++;
        } else if (statusNum >= 2500 && statusNum <= 4999) {
          gmGlobalInProduction++;
        }
        // Log status distribution for debugging
        const statusRange = Math.floor(statusNum / 1000) * 1000;
        console.log(`Status ${vehicle.status} (${statusRange}s range)`);
      });
    }
    
    console.log('GM Global available (5000-5999):', gmGlobalAvailable);
    console.log('GM Global in production/transit (2500-4999):', gmGlobalInProduction);

    // Get sold vehicles
    const { count: soldVehicles } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sold');
    console.log('Sold vehicles:', soldVehicles);

    // Get pricing data for truly available vehicles only
    const { data: pricingData } = await supabase
      .from('inventory')
      .select('price, days_in_inventory, status, source_report')
      .or('and(status.eq.available,or(source_report.is.null,source_report.neq.orders_all)),and(source_report.eq.orders_all,status.gte.5000,status.lte.5999)')
      .not('price', 'is', null);

    console.log('Pricing data count:', pricingData?.length || 0);

    const validPrices = pricingData?.filter(item => item.price && item.price > 0) || [];
    const totalValue = validPrices.reduce((sum, item) => sum + item.price, 0);
    const averagePrice = validPrices.length > 0 ? totalValue / validPrices.length : 0;

    const validDays = pricingData?.filter(item => item.days_in_inventory !== null) || [];
    const averageDaysInStock = validDays.length > 0 
      ? validDays.reduce((sum, item) => sum + (item.days_in_inventory || 0), 0) / validDays.length 
      : 0;

    const totalAvailable = (regularAvailable || 0) + gmGlobalAvailable;
    console.log('FINAL COUNTS:');
    console.log('- Regular available:', regularAvailable || 0);
    console.log('- GM Global available:', gmGlobalAvailable);
    console.log('- Total available:', totalAvailable);
    console.log('- In production/transit:', gmGlobalInProduction);

    return {
      totalVehicles: totalVehicles || 0,
      availableVehicles: totalAvailable,
      inProductionTransit: gmGlobalInProduction,
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
    const statusNum = parseInt(vehicle.status);
    return statusNum >= 5000 && statusNum <= 5999;
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
