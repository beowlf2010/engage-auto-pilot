
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

    // Get GM Global orders and categorize by Current Event ranges
    const { data: gmGlobalData } = await supabase
      .from('inventory')
      .select('status')
      .eq('source_report', 'orders_all');
    
    let gmGlobalAvailable = 0;
    let gmGlobalInProduction = 0;
    let gmGlobalInTransit = 0;
    let gmGlobalPlaced = 0;
    
    if (gmGlobalData) {
      console.log('GM Global vehicles by Current Event status:');
      gmGlobalData.forEach(vehicle => {
        const statusNum = parseInt(vehicle.status);
        
        if (statusNum === 6000) {
          // 6000 → CTP (Customer Take Possession/Available)
          gmGlobalAvailable++;
          console.log(`Status ${vehicle.status}: CTP/Available`);
        } else if (statusNum >= 5000 && statusNum <= 5999) {
          // 5000-5999 → Available for delivery
          gmGlobalAvailable++;
          console.log(`Status ${vehicle.status}: Available for delivery`);
        } else if (statusNum >= 3800 && statusNum <= 4999) {
          // 3800-4999 → In transit
          gmGlobalInTransit++;
          console.log(`Status ${vehicle.status}: In transit`);
        } else if (statusNum >= 2500 && statusNum <= 3799) {
          // 2500-3800 → In production
          gmGlobalInProduction++;
          console.log(`Status ${vehicle.status}: In production`);
        } else if (statusNum >= 2000 && statusNum <= 2499) {
          // 2000-2499 → Placed but not accepted (waiting for production)
          gmGlobalPlaced++;
          console.log(`Status ${vehicle.status}: Placed/waiting`);
        } else {
          console.log(`Status ${vehicle.status}: Unknown range`);
        }
      });
    }
    
    console.log('GM Global categorization:');
    console.log('- Available (6000 + 5000-5999):', gmGlobalAvailable);
    console.log('- In transit (3800-4999):', gmGlobalInTransit);
    console.log('- In production (2500-3799):', gmGlobalInProduction);
    console.log('- Placed/waiting (2000-2499):', gmGlobalPlaced);

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
      .or('and(status.eq.available,or(source_report.is.null,source_report.neq.orders_all)),and(source_report.eq.orders_all,status.eq.6000),and(source_report.eq.orders_all,status.gte.5000,status.lte.5999)')
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
    const totalInProductionTransit = gmGlobalInProduction + gmGlobalInTransit + gmGlobalPlaced;
    
    console.log('FINAL COUNTS:');
    console.log('- Regular available:', regularAvailable || 0);
    console.log('- GM Global available:', gmGlobalAvailable);
    console.log('- Total available:', totalAvailable);
    console.log('- Total in production/transit/placed:', totalInProductionTransit);

    return {
      totalVehicles: totalVehicles || 0,
      availableVehicles: totalAvailable,
      inProductionTransit: totalInProductionTransit,
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
    // Available: 6000 (CTP) + 5000-5999 (Available for delivery)
    return statusNum === 6000 || (statusNum >= 5000 && statusNum <= 5999);
  }
  return vehicle.status === 'available';
};

export const getVehicleStatusDisplay = (vehicle: any) => {
  if (vehicle.source_report === 'orders_all') {
    const statusNum = parseInt(vehicle.status);
    
    if (statusNum === 6000) {
      return { label: 'CTP', color: 'bg-green-100 text-green-800' };
    } else if (statusNum >= 5000 && statusNum <= 5999) {
      return { label: 'Available', color: 'bg-green-100 text-green-800' };
    } else if (statusNum >= 3800 && statusNum <= 4999) {
      return { label: 'In Transit', color: 'bg-blue-100 text-blue-800' };
    } else if (statusNum >= 2500 && statusNum <= 3799) {
      return { label: 'In Production', color: 'bg-yellow-100 text-yellow-800' };
    } else if (statusNum >= 2000 && statusNum <= 2499) {
      return { label: 'Placed/Waiting', color: 'bg-orange-100 text-orange-800' };
    } else {
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
