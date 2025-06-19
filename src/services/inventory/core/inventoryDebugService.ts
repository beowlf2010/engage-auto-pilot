
import { supabase } from '@/integrations/supabase/client';

export const logDetailedInventoryBreakdown = async (): Promise<void> => {
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
  
  // Analyze NEW vehicle classification issues
  console.log('=== NEW VEHICLE CLASSIFICATION ANALYSIS ===');
  const newVehicles = allInventory?.filter(v => v.condition === 'new') || [];
  console.log('Total new vehicles:', newVehicles.length);
  
  // Check for misclassified new vehicles
  const newWithOrdersAll = newVehicles.filter(v => v.source_report === 'orders_all');
  const newWithoutOrdersAll = newVehicles.filter(v => v.source_report !== 'orders_all');
  
  console.log('New vehicles with source_report = "orders_all":', newWithOrdersAll.length);
  console.log('New vehicles WITHOUT source_report = "orders_all":', newWithoutOrdersAll.length);
  
  if (newWithoutOrdersAll.length > 0) {
    console.log('=== MISCLASSIFIED NEW VEHICLES (should be GM Global) ===');
    newWithoutOrdersAll.forEach(v => {
      console.log(`- ID: ${v.id} | Stock: ${v.stock_number} | Make: ${v.make} | Model: ${v.model} | Source: ${v.source_report} | Status: ${v.status}`);
    });
  }
  
  // Analyze status distribution for GM Global orders
  console.log('=== GM GLOBAL STATUS DISTRIBUTION ===');
  const gmGlobalOrders = allInventory?.filter(v => v.source_report === 'orders_all') || [];
  console.log('Total GM Global orders:', gmGlobalOrders.length);
  
  const statusCounts: Record<string, number> = {};
  gmGlobalOrders.forEach(v => {
    statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
  });
  
  console.log('Status distribution:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
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
    });
  }
  
  if (duplicateStocks.length > 0) {
    console.log('DUPLICATE Stock Numbers found:');
    duplicateStocks.forEach(([stock, count]) => {
      console.log(`  Stock ${stock} appears ${count} times`);
    });
  }

  console.log('=== FINAL SUMMARY ===');
  console.log(`Total vehicles in database: ${allInventory?.length || 0}`);
  console.log(`GM Global orders: ${gmGlobalOrders.length}`);
  console.log(`Misclassified new vehicles: ${newWithoutOrdersAll.length}`);
  console.log(`Duplicates found: ${duplicateVins.length} VINs, ${duplicateStocks.length} Stock Numbers`);
};
