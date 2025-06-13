
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

  console.log('=== FINAL SUMMARY ===');
  console.log(`Total vehicles in database: ${allInventory?.length || 0}`);
  console.log(`Duplicates found: ${duplicateVins.length} VINs, ${duplicateStocks.length} Stock Numbers`);
  console.log(`Upload batches: ${Object.keys(uploadGroups).length}`);
  console.log('Check the detailed logs above to identify which vehicles should be removed.');
};
