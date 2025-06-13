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
    console.log('=== INVENTORY DEBUGGING - DETAILED VEHICLE LIST ===');
    
    // Get ALL inventory records with key identifying information
    const { data: allInventory, error: allError } = await supabase
      .from('inventory')
      .select('id, condition, status, source_report, make, model, year, vin, stock_number, created_at, upload_history_id')
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('Error fetching all inventory:', allError);
      throw allError;
    }
    
    console.log('=== COMPLETE VEHICLE INVENTORY LIST ===');
    console.log('Total records found:', allInventory?.length || 0);
    
    // Group by upload_history_id to see different uploads
    const uploadGroups: Record<string, any[]> = {};
    const noUploadId: any[] = [];
    
    allInventory?.forEach(vehicle => {
      if (vehicle.upload_history_id) {
        const uploadId = vehicle.upload_history_id;
        if (!uploadGroups[uploadId]) {
          uploadGroups[uploadId] = [];
        }
        uploadGroups[uploadId].push(vehicle);
      } else {
        noUploadId.push(vehicle);
      }
    });
    
    console.log('=== VEHICLES BY UPLOAD BATCH ===');
    Object.entries(uploadGroups).forEach(([uploadId, vehicles]) => {
      console.log(`Upload ID ${uploadId.substring(0, 8)}... : ${vehicles.length} vehicles`);
      console.log('Sample vehicles from this upload:');
      vehicles.slice(0, 3).forEach(v => {
        console.log(`  - ${v.year} ${v.make} ${v.model} | Stock: ${v.stock_number} | VIN: ${v.vin?.substring(0, 8)}... | Status: ${v.status} | Condition: ${v.condition}`);
      });
    });
    
    if (noUploadId.length > 0) {
      console.log(`Vehicles with NO upload_history_id: ${noUploadId.length}`);
      noUploadId.slice(0, 5).forEach(v => {
        console.log(`  - ${v.year} ${v.make} ${v.model} | Stock: ${v.stock_number} | Created: ${v.created_at}`);
      });
    }
    
    // Check for potential duplicates by VIN or Stock Number
    console.log('=== POTENTIAL DUPLICATE CHECK ===');
    const vinCounts: Record<string, number> = {};
    const stockCounts: Record<string, number> = {};
    
    allInventory?.forEach(vehicle => {
      if (vehicle.vin) {
        vinCounts[vehicle.vin] = (vinCounts[vehicle.vin] || 0) + 1;
      }
      if (vehicle.stock_number) {
        stockCounts[vehicle.stock_number] = (stockCounts[vehicle.stock_number] || 0) + 1;
      }
    });
    
    const duplicateVins = Object.entries(vinCounts).filter(([_, count]) => count > 1);
    const duplicateStocks = Object.entries(stockCounts).filter(([_, count]) => count > 1);
    
    if (duplicateVins.length > 0) {
      console.log('DUPLICATE VINs found:');
      duplicateVins.forEach(([vin, count]) => {
        console.log(`  VIN ${vin} appears ${count} times`);
        const duplicates = allInventory?.filter(v => v.vin === vin) || [];
        duplicates.forEach(d => {
          console.log(`    - ID: ${d.id} | Stock: ${d.stock_number} | Status: ${d.status} | Upload: ${d.upload_history_id?.substring(0, 8)}...`);
        });
      });
    }
    
    if (duplicateStocks.length > 0) {
      console.log('DUPLICATE Stock Numbers found:');
      duplicateStocks.forEach(([stock, count]) => {
        console.log(`  Stock ${stock} appears ${count} times`);
        const duplicates = allInventory?.filter(v => v.stock_number === stock) || [];
        duplicates.forEach(d => {
          console.log(`    - ID: ${d.id} | VIN: ${d.vin} | Status: ${d.status} | Upload: ${d.upload_history_id?.substring(0, 8)}...`);
        });
      });
    }

    // Continue with the existing stats calculation but log key findings
    console.log('=== CONTINUING WITH STATS CALCULATION ===');
    
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
    
    console.log('=== FINAL SUMMARY ===');
    console.log(`Total vehicles in database: ${totalVehicles}`);
    console.log(`Duplicates found: ${duplicateVins.length} VINs, ${duplicateStocks.length} Stock Numbers`);
    console.log(`Upload batches: ${Object.keys(uploadGroups).length}`);
    console.log('Check the detailed logs above to identify which vehicles should be removed.');

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
