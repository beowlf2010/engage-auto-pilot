import { supabase } from '@/integrations/supabase/client';

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
    regularNew: number;
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
    console.log('=== DETAILED INVENTORY DEBUGGING ===');
    
    // Get ALL inventory records with detailed breakdown
    const { data: allInventory, error: allError } = await supabase
      .from('inventory')
      .select('id, condition, status, source_report, make, model, year, vin, stock_number');
    
    if (allError) {
      console.error('Error fetching all inventory:', allError);
      throw allError;
    }
    
    console.log('=== RAW INVENTORY BREAKDOWN ===');
    console.log('Total records in database:', allInventory?.length || 0);
    
    // Detailed breakdown by condition
    const newRecords = allInventory?.filter(v => v.condition === 'new') || [];
    const usedRecords = allInventory?.filter(v => v.condition === 'used') || [];
    const otherConditions = allInventory?.filter(v => v.condition !== 'new' && v.condition !== 'used') || [];
    
    console.log('By condition:');
    console.log('- NEW condition:', newRecords.length);
    console.log('- USED condition:', usedRecords.length);
    console.log('- OTHER conditions:', otherConditions.length, otherConditions.map(v => v.condition));
    
    // Breakdown of NEW vehicles by source
    const gmGlobalRecords = newRecords.filter(v => v.source_report === 'orders_all');
    const regularNewRecords = newRecords.filter(v => v.source_report !== 'orders_all');
    
    console.log('NEW vehicles breakdown:');
    console.log('- GM Global (orders_all):', gmGlobalRecords.length);
    console.log('- Regular New (not orders_all):', regularNewRecords.length);
    
    // Detailed GM Global status breakdown
    console.log('GM Global status breakdown:');
    const gmStatusBreakdown: Record<string, number> = {};
    gmGlobalRecords.forEach(vehicle => {
      const status = vehicle.status || 'unknown';
      gmStatusBreakdown[status] = (gmStatusBreakdown[status] || 0) + 1;
    });
    
    Object.entries(gmStatusBreakdown).forEach(([status, count]) => {
      console.log(`- Status "${status}": ${count} vehicles`);
    });
    
    // Regular new status breakdown
    console.log('Regular NEW status breakdown:');
    const regularNewStatusBreakdown: Record<string, number> = {};
    regularNewRecords.forEach(vehicle => {
      const status = vehicle.status || 'unknown';
      regularNewStatusBreakdown[status] = (regularNewStatusBreakdown[status] || 0) + 1;
    });
    
    Object.entries(regularNewStatusBreakdown).forEach(([status, count]) => {
      console.log(`- Status "${status}": ${count} vehicles`);
    });
    
    // Used vehicles status breakdown
    console.log('USED vehicles status breakdown:');
    const usedStatusBreakdown: Record<string, number> = {};
    usedRecords.forEach(vehicle => {
      const status = vehicle.status || 'unknown';
      usedStatusBreakdown[status] = (usedStatusBreakdown[status] || 0) + 1;
    });
    
    Object.entries(usedStatusBreakdown).forEach(([status, count]) => {
      console.log(`- Status "${status}": ${count} vehicles`);
    });
    
    // Now get the actual counts using the original queries for comparison
    console.log('=== ORIGINAL QUERY RESULTS COMPARISON ===');
    
    // Get total count
    const { count: totalVehicles } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true });
    console.log('Total vehicles (count query):', totalVehicles);
    console.log('Total vehicles (actual data):', allInventory?.length);
    console.log('COUNT vs DATA MATCH:', totalVehicles === allInventory?.length);

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

    console.log('Regular new vehicles - Query Total:', regularNewTotal, 'vs Data:', regularNewRecords.length);
    console.log('Regular new available - Query:', regularNewAvailable);

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

    console.log('Used vehicles - Query Total:', usedTotal, 'vs Data:', usedRecords.length);
    console.log('Used available - Query:', usedAvailable);
    console.log('Used sold - Query:', usedSold);

    // Get GM Global orders and categorize by Current Event ranges
    const { data: gmGlobalData } = await supabase
      .from('inventory')
      .select('status')
      .eq('source_report', 'orders_all');
    
    console.log('GM Global query count:', gmGlobalData?.length, 'vs Data:', gmGlobalRecords.length);
    
    let gmGlobalAvailable = 0;
    let gmGlobalInProduction = 0;
    let gmGlobalInTransit = 0;
    let gmGlobalPlaced = 0;
    
    if (gmGlobalData) {
      console.log('GM Global vehicles by Current Event status:');
      gmGlobalData.forEach(vehicle => {
        const statusNum = parseInt(vehicle.status);
        
        if (statusNum === 6000) {
          gmGlobalAvailable++;
          console.log(`Status ${vehicle.status}: CTP/Available`);
        } else if (statusNum >= 5000 && statusNum <= 5999) {
          gmGlobalAvailable++;
          console.log(`Status ${vehicle.status}: Available for delivery`);
        } else if (statusNum >= 3800 && statusNum <= 4999) {
          gmGlobalInTransit++;
          console.log(`Status ${vehicle.status}: In transit`);
        } else if (statusNum >= 2500 && statusNum <= 3799) {
          gmGlobalInProduction++;
          console.log(`Status ${vehicle.status}: In production`);
        } else if (statusNum >= 2000 && statusNum <= 2499) {
          gmGlobalPlaced++;
          console.log(`Status ${vehicle.status}: Placed/waiting`);
        } else {
          console.log(`Status ${vehicle.status}: Unknown range - NOT COUNTED IN ANY CATEGORY`);
        }
      });
    }
    
    console.log('=== FINAL COUNT CALCULATIONS ===');
    console.log('GM Global categorization:');
    console.log('- Available (6000 + 5000-5999):', gmGlobalAvailable);
    console.log('- In transit (3800-4999):', gmGlobalInTransit);
    console.log('- In production (2500-3799):', gmGlobalInProduction);
    console.log('- Placed/waiting (2000-2499):', gmGlobalPlaced);
    console.log('- GM Global TOTAL:', gmGlobalAvailable + gmGlobalInTransit + gmGlobalInProduction + gmGlobalPlaced);

    // Get sold vehicles
    const { count: soldVehicles } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sold');

    // Get pricing data for new vehicles
    const { data: newPricingData } = await supabase
      .from('inventory')
      .select('price, days_in_inventory')
      .eq('condition', 'new')
      .or('and(status.eq.available,or(source_report.is.null,source_report.neq.orders_all)),and(source_report.eq.orders_all,status.eq.6000),and(source_report.eq.orders_all,status.gte.5000,status.lte.5999)')
      .not('price', 'is', null);

    const newValidPrices = newPricingData?.filter(item => item.price && item.price > 0) || [];
    const newTotalValue = newValidPrices.reduce((sum, item) => sum + item.price, 0);
    const newAveragePrice = newValidPrices.length > 0 ? newTotalValue / newValidPrices.length : 0;

    const newValidDays = newPricingData?.filter(item => item.days_in_inventory !== null) || [];
    const newAverageDaysInStock = newValidDays.length > 0 
      ? newValidDays.reduce((sum, item) => sum + (item.days_in_inventory || 0), 0) / newValidDays.length 
      : 0;

    // Get pricing data for used vehicles
    const { data: usedPricingData } = await supabase
      .from('inventory')
      .select('price, days_in_inventory')
      .eq('condition', 'used')
      .eq('status', 'available')
      .not('price', 'is', null);

    const usedValidPrices = usedPricingData?.filter(item => item.price && item.price > 0) || [];
    const usedTotalValue = usedValidPrices.reduce((sum, item) => sum + item.price, 0);
    const usedAveragePrice = usedValidPrices.length > 0 ? usedTotalValue / usedValidPrices.length : 0;

    const usedValidDays = usedPricingData?.filter(item => item.days_in_inventory !== null) || [];
    const usedAverageDaysInStock = usedValidDays.length > 0 
      ? usedValidDays.reduce((sum, item) => sum + (item.days_in_inventory || 0), 0) / usedValidDays.length 
      : 0;

    // Calculate totals
    const totalNewAvailable = (regularNewAvailable || 0) + gmGlobalAvailable;
    const totalNewVehicles = (regularNewTotal || 0) + (gmGlobalData?.length || 0);
    const totalAvailable = totalNewAvailable + (usedAvailable || 0);
    const totalInProductionTransit = gmGlobalInProduction + gmGlobalInTransit + gmGlobalPlaced;

    // Overall pricing (legacy compatibility)
    const allValidPrices = [...newValidPrices, ...usedValidPrices];
    const overallTotalValue = allValidPrices.reduce((sum, item) => sum + item.price, 0);
    const overallAveragePrice = allValidPrices.length > 0 ? overallTotalValue / allValidPrices.length : 0;

    const allValidDays = [...newValidDays, ...usedValidDays];
    const overallAverageDaysInStock = allValidDays.length > 0 
      ? allValidDays.reduce((sum, item) => sum + (item.days_in_inventory || 0), 0) / allValidDays.length 
      : 0;
    
    console.log('FINAL ENHANCED COUNTS VERIFICATION:');
    console.log('- New vehicles total (calculated):', totalNewVehicles);
    console.log('  - Regular new total:', regularNewTotal);
    console.log('  - GM Global total:', gmGlobalData?.length || 0);
    console.log('- New vehicles available (calculated):', totalNewAvailable);
    console.log('  - Regular new available:', regularNewAvailable);
    console.log('  - GM Global available:', gmGlobalAvailable);
    console.log('- Used vehicles total:', usedTotal || 0);
    console.log('- Used vehicles available:', usedAvailable || 0);
    console.log('- GRAND TOTAL (calculated):', totalNewVehicles + (usedTotal || 0));
    console.log('- GRAND TOTAL (query):', totalVehicles);

    return {
      totalVehicles: totalVehicles || 0,
      newVehicles: {
        total: totalNewVehicles,
        available: totalNewAvailable,
        gmGlobalByStatus: {
          available: gmGlobalAvailable,
          inTransit: gmGlobalInTransit,
          inProduction: gmGlobalInProduction,
          placed: gmGlobalPlaced,
        },
        regularNew: regularNewAvailable || 0,
      },
      usedVehicles: {
        total: usedTotal || 0,
        available: usedAvailable || 0,
        sold: usedSold || 0,
      },
      // Legacy fields
      availableVehicles: totalAvailable,
      inProductionTransit: totalInProductionTransit,
      soldVehicles: soldVehicles || 0,
      averagePrice: overallAveragePrice,
      totalValue: overallTotalValue,
      averageDaysInStock: Math.round(overallAverageDaysInStock),
      // New separate pricing
      newVehicleStats: {
        averagePrice: newAveragePrice,
        totalValue: newTotalValue,
        averageDaysInStock: Math.round(newAverageDaysInStock),
      },
      usedVehicleStats: {
        averagePrice: usedAveragePrice,
        totalValue: usedTotalValue,
        averageDaysInStock: Math.round(usedAverageDaysInStock),
      },
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
