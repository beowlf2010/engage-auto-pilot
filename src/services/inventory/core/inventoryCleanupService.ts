
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const getLatestUploads = async (count: number = 2) => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('upload_history_id, created_at')
      .not('upload_history_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    // Get unique upload history IDs from today first, then recent ones
    const today = new Date().toISOString().split('T')[0];
    const uniqueUploadIds = [];
    const seenIds = new Set();
    
    // Prioritize today's uploads
    for (const row of data || []) {
      const uploadDate = row.created_at.split('T')[0];
      if (row.upload_history_id && !seenIds.has(row.upload_history_id) && uploadDate === today) {
        seenIds.add(row.upload_history_id);
        uniqueUploadIds.push(row.upload_history_id);
      }
    }
    
    // If we don't have enough from today, add recent ones
    if (uniqueUploadIds.length < count) {
      for (const row of data || []) {
        if (row.upload_history_id && !seenIds.has(row.upload_history_id)) {
          seenIds.add(row.upload_history_id);
          uniqueUploadIds.push(row.upload_history_id);
          
          if (uniqueUploadIds.length >= count) break;
        }
      }
    }

    return uniqueUploadIds;
  } catch (error) {
    console.error('Error getting latest uploads:', error);
    return [];
  }
};

export const cleanupInventoryData = async () => {
  try {
    console.log('Starting enhanced inventory cleanup to maintain current inventory...');
    
    // Get today's uploads first, then fall back to recent ones
    const recentUploadIds = await getLatestUploads(2);
    
    if (recentUploadIds.length === 0) {
      console.log('No recent uploads found, skipping cleanup');
      return { success: true, message: 'No recent uploads found' };
    }

    console.log('Recent upload IDs to keep:', recentUploadIds);

    // Get vehicles that should be kept (from recent uploads)
    const { data: vehiclesToKeep, error: keepError } = await supabase
      .from('inventory')
      .select('id')
      .in('upload_history_id', recentUploadIds);

    if (keepError) throw keepError;

    const keepIds = vehiclesToKeep.map(v => v.id);
    console.log(`Found ${keepIds.length} vehicles to keep from recent uploads`);

    // Get vehicles that should be marked as sold, excluding GM Global orders
    const { data: vehiclesToUpdate, error: fetchError } = await supabase
      .from('inventory')
      .select('id, stock_number, make, model, year, source_report, gm_order_number')
      .eq('status', 'available')
      .neq('source_report', 'orders_all') // Don't mark GM Global orders as sold
      .limit(500);

    if (fetchError) throw fetchError;

    // Filter out vehicles that should be kept
    const vehiclesToMarkSold = vehiclesToUpdate.filter(v => !keepIds.includes(v.id));
    
    if (vehiclesToMarkSold.length === 0) {
      console.log('No vehicles need to be marked as sold - inventory is current');
      return { success: true, message: 'Inventory is already current' };
    }

    console.log(`Marking ${vehiclesToMarkSold.length} outdated vehicles as sold`);

    // Update in smaller batches
    const batchSize = 100;
    let totalUpdated = 0;

    for (let i = 0; i < vehiclesToMarkSold.length; i += batchSize) {
      const batch = vehiclesToMarkSold.slice(i, i + batchSize);
      const batchIds = batch.map(v => v.id);

      const { data: updated, error: updateError } = await supabase
        .from('inventory')
        .update({
          status: 'sold',
          sold_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', batchIds)
        .select('id');

      if (updateError) {
        console.error('Error updating batch:', updateError);
        continue;
      }

      totalUpdated += updated?.length || 0;
      console.log(`Updated batch ${Math.floor(i/batchSize) + 1}, ${updated?.length} vehicles marked as sold`);
    }

    console.log(`Enhanced cleanup completed. Current inventory maintained, ${totalUpdated} outdated vehicles marked as sold`);
    
    return {
      success: true,
      message: `Inventory is now current: ${totalUpdated} outdated vehicles marked as sold`,
      totalProcessed: totalUpdated
    };

  } catch (error) {
    console.error('Enhanced cleanup error:', error);
    throw error;
  }
};

export const performInventoryCleanup = async () => {
  try {
    const result = await cleanupInventoryData();
    
    if (result.totalProcessed && result.totalProcessed > 0) {
      toast({
        title: "Inventory Updated",
        description: result.message,
      });
    }
    
    return result;
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
