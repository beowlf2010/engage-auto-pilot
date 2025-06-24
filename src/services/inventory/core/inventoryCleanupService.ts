import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { uploadSessionService } from "../uploadSessionService";

export const getTodayAndYesterdayUploads = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('inventory')
      .select('upload_history_id, created_at')
      .not('upload_history_id', 'is', null)
      .gte('created_at', yesterday + 'T00:00:00.000Z')
      .lt('created_at', today + 'T23:59:59.999Z')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    const todayUploads = new Set();
    const yesterdayUploads = new Set();

    for (const row of data || []) {
      const uploadDate = row.created_at.split('T')[0];
      if (uploadDate === today) {
        todayUploads.add(row.upload_history_id);
      } else if (uploadDate === yesterday) {
        yesterdayUploads.add(row.upload_history_id);
      }
    }

    console.log(`Found ${todayUploads.size} uploads from today, ${yesterdayUploads.size} from yesterday`);
    
    return {
      todayUploadIds: Array.from(todayUploads),
      yesterdayUploadIds: Array.from(yesterdayUploads)
    };
  } catch (error) {
    console.error('Error getting today and yesterday uploads:', error);
    return { todayUploadIds: [], yesterdayUploadIds: [] };
  }
};

export const restoreRecentUsedInventory = async () => {
  try {
    console.log('Restoring recently uploaded used inventory to available status...');
    
    // Find vehicles from recent "Tommy Merch-Inv View" uploads that were incorrectly marked as sold
    const { data: recentUploads, error: uploadsError } = await supabase
      .from('upload_history')
      .select('id')
      .ilike('original_filename', '%Tommy Merch-Inv View%')
      .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()) // Last 3 days
      .order('created_at', { ascending: false });

    if (uploadsError) throw uploadsError;

    if (!recentUploads || recentUploads.length === 0) {
      console.log('No recent Tommy Merch-Inv View uploads found');
      return { restored: 0 };
    }

    const uploadIds = recentUploads.map(u => u.id);
    console.log('Found recent upload IDs:', uploadIds);

    // Restore vehicles from these uploads that are currently marked as sold
    const { data: restoredVehicles, error: restoreError } = await supabase
      .from('inventory')
      .update({
        status: 'available',
        sold_at: null,
        updated_at: new Date().toISOString()
      })
      .in('upload_history_id', uploadIds)
      .eq('status', 'sold')
      .neq('source_report', 'orders_all') // Don't touch GM Global orders
      .select('id, stock_number, make, model, year');

    if (restoreError) throw restoreError;

    const restoredCount = restoredVehicles?.length || 0;
    console.log(`Successfully restored ${restoredCount} used vehicles to available status`);
    
    return { restored: restoredCount, vehicles: restoredVehicles };
  } catch (error) {
    console.error('Error restoring recent used inventory:', error);
    throw error;
  }
};

export const cleanupInventoryData = async () => {
  try {
    console.log('Starting "today vs yesterday" inventory cleanup logic...');
    
    // Check if cleanup should be skipped due to active upload session
    if (uploadSessionService.shouldSkipAutoCleanup()) {
      console.log('📁 [UPLOAD SESSION] Skipping cleanup - upload session is active');
      return { success: true, message: 'Cleanup skipped - upload session active' };
    }
    
    // Get today's and yesterday's uploads
    const { todayUploadIds, yesterdayUploadIds } = await getTodayAndYesterdayUploads();
    
    if (todayUploadIds.length === 0) {
      console.log('No uploads from today found, skipping cleanup');
      return { success: true, message: 'No uploads from today found' };
    }

    console.log('Today upload IDs:', todayUploadIds);
    console.log('Yesterday upload IDs:', yesterdayUploadIds);

    // Get vehicles that are in today's uploads (these should stay available)
    const { data: todayVehicles, error: todayError } = await supabase
      .from('inventory')
      .select('id, vin, stock_number')
      .in('upload_history_id', todayUploadIds);

    if (todayError) throw todayError;

    console.log(`Found ${todayVehicles.length} vehicles in today's uploads`);

    // If we have yesterday's uploads, find vehicles that were available yesterday but not in today's upload
    let vehiclesToMarkSold = [];
    
    if (yesterdayUploadIds.length > 0) {
      const { data: yesterdayVehicles, error: yesterdayError } = await supabase
        .from('inventory')
        .select('id, vin, stock_number, make, model, year, source_report')
        .in('upload_history_id', yesterdayUploadIds)
        .eq('status', 'available')
        .neq('source_report', 'orders_all'); // Don't mark GM Global orders as sold

      if (yesterdayError) throw yesterdayError;

      console.log(`Found ${yesterdayVehicles.length} available vehicles from yesterday`);

      // Create sets for efficient comparison
      const todayVINs = new Set(todayVehicles.map(v => v.vin).filter(Boolean));
      const todayStockNumbers = new Set(todayVehicles.map(v => v.stock_number).filter(Boolean));

      // Find vehicles from yesterday that are not in today's upload
      vehiclesToMarkSold = yesterdayVehicles.filter(vehicle => {
        const hasVIN = vehicle.vin && todayVINs.has(vehicle.vin);
        const hasStock = vehicle.stock_number && todayStockNumbers.has(vehicle.stock_number);
        return !hasVIN && !hasStock; // Not found in today's upload
      });

      console.log(`Found ${vehiclesToMarkSold.length} vehicles from yesterday that are missing from today's upload`);
    } else {
      console.log('No yesterday uploads found, skipping sold marking');
    }

    if (vehiclesToMarkSold.length === 0) {
      console.log('No vehicles need to be marked as sold - inventory is current');
      return { success: true, message: 'Inventory is already current - no vehicles to mark as sold' };
    }

    // Mark vehicles as sold in batches
    const batchSize = 100;
    let totalUpdated = 0;

    for (let i = 0; i < vehiclesToMarkSold.length; i += batchSize) {
      const batch = vehiclesToMarkSold.slice(i, i + batchSize);
      const batchIds = batch.map(v => v.id);

      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}: marking ${batch.length} vehicles as sold`);
      console.log('Sample vehicles being marked sold:', batch.slice(0, 3).map(v => `${v.make} ${v.model} (${v.stock_number})`));

      const { data: updated, error: updateError } = await supabase
        .from('inventory')
        .update({
          status: 'sold',
          sold_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', batchIds)
        .select('id, make, model, stock_number');

      if (updateError) {
        console.error('Error updating batch:', updateError);
        continue;
      }

      totalUpdated += updated?.length || 0;
      console.log(`Updated batch ${Math.floor(i/batchSize) + 1}, ${updated?.length} vehicles marked as sold`);
    }

    console.log(`"Today vs Yesterday" cleanup completed. ${totalUpdated} vehicles marked as sold`);
    
    return {
      success: true,
      message: `Inventory updated: ${totalUpdated} vehicles from yesterday marked as sold (not in today's upload)`,
      totalProcessed: totalUpdated,
      todayUploads: todayUploadIds.length,
      yesterdayUploads: yesterdayUploadIds.length
    };

  } catch (error) {
    console.error('"Today vs Yesterday" cleanup error:', error);
    throw error;
  }
};

export const performInventoryCleanup = async () => {
  try {
    // First, restore any recently uploaded used inventory that was incorrectly marked as sold
    const restoreResult = await restoreRecentUsedInventory();
    
    // Then run the new "today vs yesterday" cleanup logic
    const cleanupResult = await cleanupInventoryData();
    
    if (restoreResult.restored > 0) {
      toast({
        title: "Inventory Restored & Updated",
        description: `Restored ${restoreResult.restored} recently uploaded vehicles. ${cleanupResult.message}`,
      });
    } else if (cleanupResult.totalProcessed && cleanupResult.totalProcessed > 0) {
      toast({
        title: "Inventory Updated",
        description: cleanupResult.message,
      });
    } else {
      toast({
        title: "Inventory Current",
        description: cleanupResult.message,
      });
    }
    
    return { ...cleanupResult, restored: restoreResult.restored };
  } catch (error) {
    console.error('Cleanup failed:', error);
    
    toast({
      title: "Cleanup Failed", 
      description: "There was an error during cleanup. Check console for details.",
      variant: "destructive"
    });
    
    throw error;
  }
};

// Keep the old function name for backward compatibility
export const getLatestUploads = getTodayAndYesterdayUploads;
