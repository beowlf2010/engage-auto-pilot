import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { uploadSessionService } from "../uploadSessionService";
import { shouldSkipCleanup } from "../uploadValidationService";

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

    const todayUploads = new Set<string>();
    const yesterdayUploads = new Set<string>();

    for (const row of data || []) {
      const uploadDate = row.created_at.split('T')[0];
      if (uploadDate === today && row.upload_history_id) {
        todayUploads.add(row.upload_history_id);
      } else if (uploadDate === yesterday && row.upload_history_id) {
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
    console.log('🔧 Restoring recently uploaded used inventory to available status...');
    
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

    const uploadIds = recentUploads.map(u => u.id) as string[];
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
      .eq('condition', 'used') // Only restore used vehicles
      .neq('source_report', 'orders_all') // Don't touch GM Global orders
      .select('id, stock_number, make, model, year');

    if (restoreError) throw restoreError;

    const restoredCount = restoredVehicles?.length || 0;
    console.log(`✅ Successfully restored ${restoredCount} used vehicles to available status`);
    
    return { restored: restoredCount, vehicles: restoredVehicles };
  } catch (error) {
    console.error('Error restoring recent used inventory:', error);
    throw error;
  }
};

export const validateUploadBeforeCleanup = async (uploadIds: string[]) => {
  try {
    console.log('🔍 Enhanced validation before cleanup...');
    
    if (!uploadIds || uploadIds.length === 0) {
      console.warn('⚠️ No upload IDs provided for validation');
      return { isValid: false, reason: 'No upload IDs provided' };
    }

    // Use the new enhanced validation service
    const validationResult = await shouldSkipCleanup(uploadIds);
    
    if (validationResult.skip) {
      console.error('🚨 Cleanup blocked:', validationResult.reason);
      return { 
        isValid: false, 
        reason: validationResult.reason || 'Upload validation failed'
      };
    }

    return { isValid: true, reason: 'All uploads validated successfully' };
  } catch (error) {
    console.error('Error validating uploads:', error);
    return { isValid: false, reason: 'Error during validation' };
  }
};

export const cleanupInventoryData = async () => {
  try {
    console.log('🧹 Starting enhanced inventory cleanup with automatic validation...');
    
    // Check if cleanup should be skipped due to active upload session
    if (uploadSessionService.shouldSkipAutoCleanup()) {
      console.log('📁 [UPLOAD SESSION] Skipping cleanup - upload session is active');
      return { success: true, message: 'Cleanup skipped - upload session active' };
    }
    
    // Get today's uploads that have ACTUAL vehicles in the inventory table
    const { data: todayValidUploads, error: todayError } = await supabase
      .from('upload_history')
      .select(`
        id,
        original_filename,
        successful_imports,
        created_at
      `)
      .gte('created_at', new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')
      .order('created_at', { ascending: false });

    if (todayError) throw todayError;

    if (!todayValidUploads || todayValidUploads.length === 0) {
      console.log('No uploads from today found, skipping cleanup');
      return { success: true, message: 'No uploads from today found' };
    }

    // Filter for uploads that actually have vehicles in the inventory table
    const validTodayUploadIds: string[] = [];
    for (const upload of todayValidUploads) {
      const { data: vehicleCount } = await supabase
        .from('inventory')
        .select('id', { count: 'exact' })
        .eq('upload_history_id', upload.id);
      
      if ((vehicleCount?.length || 0) > 0) {
        validTodayUploadIds.push(upload.id);
        console.log(`✅ Upload ${upload.original_filename} has ${vehicleCount?.length} actual vehicles`);
      } else {
        console.warn(`⚠️ Upload ${upload.original_filename} reported ${upload.successful_imports} successes but has 0 actual vehicles - skipping`);
      }
    }

    if (validTodayUploadIds.length === 0) {
      console.log('No valid uploads from today found (uploads exist but no vehicles were actually inserted)');
      return { success: false, message: 'Upload insertion failure detected - no vehicles actually stored' };
    }

    // Get yesterday's uploads for comparison
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: yesterdayUploads, error: yesterdayError } = await supabase
      .from('upload_history')
      .select('id')
      .gte('created_at', yesterday + 'T00:00:00.000Z')
      .lt('created_at', yesterday + 'T23:59:59.999Z');

    if (yesterdayError) throw yesterdayError;

    const yesterdayUploadIds = yesterdayUploads?.map(u => u.id) || [];

    console.log('✅ Enhanced validation passed - proceeding with cleanup');
    console.log('Valid today upload IDs:', validTodayUploadIds);
    console.log('Yesterday upload IDs:', yesterdayUploadIds);

    // Get vehicles that are in today's uploads (these should stay available)
    const { data: todayVehicles, error: todayVehicleError } = await supabase
      .from('inventory')
      .select('id, vin, stock_number')
      .in('upload_history_id', validTodayUploadIds);

    if (todayVehicleError) throw todayVehicleError;

    console.log(`Found ${todayVehicles?.length || 0} vehicles in today's uploads`);

    // If we have yesterday's uploads, find vehicles that were available yesterday but not in today's upload
    let vehiclesToMarkSold = [];
    
    if (yesterdayUploadIds.length > 0) {
      const { data: yesterdayVehicles, error: yesterdayVehicleError } = await supabase
        .from('inventory')
        .select('id, vin, stock_number, make, model, year, source_report, condition')
        .in('upload_history_id', yesterdayUploadIds)
        .eq('status', 'available')
        .neq('source_report', 'orders_all'); // Don't mark GM Global orders as sold

      if (yesterdayVehicleError) throw yesterdayVehicleError;

      console.log(`Found ${yesterdayVehicles?.length || 0} available vehicles from yesterday`);

      if (yesterdayVehicles && yesterdayVehicles.length > 0 && todayVehicles && todayVehicles.length > 0) {
        // Create sets for efficient comparison
        const todayVINs = new Set<string>();
        const todayStockNumbers = new Set<string>();

        todayVehicles.forEach(vehicle => {
          if (vehicle.vin && typeof vehicle.vin === 'string') {
            todayVINs.add(vehicle.vin);
          }
          if (vehicle.stock_number && typeof vehicle.stock_number === 'string') {
            todayStockNumbers.add(vehicle.stock_number);
          }
        });

        // Find vehicles from yesterday that are not in today's upload
        vehiclesToMarkSold = yesterdayVehicles.filter(vehicle => {
          const hasVIN = vehicle.vin && todayVINs.has(vehicle.vin);
          const hasStock = vehicle.stock_number && todayStockNumbers.has(vehicle.stock_number);
          const notFound = !hasVIN && !hasStock;
          
          // Enhanced safety: Don't mark used vehicles as sold if they're from recent uploads
          if (notFound && vehicle.condition === 'used') {
            console.log(`⚠️ Enhanced protection: Skipping used vehicle ${vehicle.make} ${vehicle.model} (${vehicle.stock_number}) - preventing incorrect used inventory cleanup`);
            return false;
          }
          
          return notFound;
        });

        console.log(`Found ${vehiclesToMarkSold.length} vehicles from yesterday that are missing from today's upload`);
      }
    } else {
      console.log('No yesterday uploads found, skipping sold marking');
    }

    if (vehiclesToMarkSold.length === 0) {
      console.log('✅ No vehicles need to be marked as sold - inventory is current');
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
      console.log(`✅ Updated batch ${Math.floor(i/batchSize) + 1}, ${updated?.length} vehicles marked as sold`);
    }

    console.log(`🎉 Enhanced "Today vs Yesterday" cleanup completed. ${totalUpdated} vehicles marked as sold`);
    
    return {
      success: true,
      message: `Enhanced inventory update: ${totalUpdated} vehicles from yesterday marked as sold (validated upload success)`,
      totalProcessed: totalUpdated,
      todayUploads: validTodayUploadIds.length,
      yesterdayUploadIds: yesterdayUploadIds.length
    };

  } catch (error) {
    console.error('Enhanced "Today vs Yesterday" cleanup error:', error);
    throw error;
  }
};

export const performInventoryCleanup = async () => {
  try {
    console.log('🚀 Starting enhanced inventory cleanup with validation...');
    
    // First, restore any recently uploaded used inventory that was incorrectly marked as sold
    const restoreResult = await restoreRecentUsedInventory();
    
    // Then run the enhanced "today vs yesterday" cleanup logic with validation
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
    console.error('Enhanced cleanup failed:', error);
    
    toast({
      title: "Cleanup Failed", 
      description: "There was an error during enhanced cleanup. Check console for details.",
      variant: "destructive"
    });
    
    throw error;
  }
};

// Keep the old function name for backward compatibility
export const getLatestUploads = getTodayAndYesterdayUploads;
