
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const getLatestUploads = async (count: number = 2) => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('upload_history_id, created_at')
      .not('upload_history_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000); // Get more records to find unique upload IDs

    if (error) throw error;

    // Get unique upload history IDs
    const uniqueUploadIds = [];
    const seenIds = new Set();
    
    for (const row of data || []) {
      if (row.upload_history_id && !seenIds.has(row.upload_history_id)) {
        seenIds.add(row.upload_history_id);
        uniqueUploadIds.push(row.upload_history_id);
        
        if (uniqueUploadIds.length >= count) break;
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
    console.log('Starting inventory cleanup...');
    
    // Get the 2 most recent upload IDs
    const recentUploadIds = await getLatestUploads(2);
    
    if (recentUploadIds.length === 0) {
      console.log('No recent uploads found, skipping cleanup');
      return { success: true, message: 'No recent uploads found' };
    }

    console.log('Recent upload IDs:', recentUploadIds);

    // Instead of using a complex filter, we'll do this in smaller batches
    // First, get all inventory IDs that should be kept (from recent uploads)
    const { data: vehiclesToKeep, error: keepError } = await supabase
      .from('inventory')
      .select('id')
      .in('upload_history_id', recentUploadIds);

    if (keepError) throw keepError;

    const keepIds = vehiclesToKeep.map(v => v.id);
    console.log(`Found ${keepIds.length} vehicles to keep from recent uploads`);

    // Get vehicles that should be marked as sold (not in recent uploads and currently available)
    const { data: vehiclesToUpdate, error: fetchError } = await supabase
      .from('inventory')
      .select('id, stock_number, make, model, year')
      .eq('status', 'available')
      .limit(500); // Process in batches to avoid large queries

    if (fetchError) throw fetchError;

    // Filter out vehicles that should be kept
    const vehiclesToMarkSold = vehiclesToUpdate.filter(v => !keepIds.includes(v.id));
    
    if (vehiclesToMarkSold.length === 0) {
      console.log('No vehicles need to be marked as sold');
      return { success: true, message: 'No cleanup needed' };
    }

    console.log(`Marking ${vehiclesToMarkSold.length} vehicles as sold`);

    // Update in smaller batches to avoid query size limits
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

    console.log(`Cleanup completed. Total vehicles marked as sold: ${totalUpdated}`);
    
    return {
      success: true,
      message: `Cleanup completed: ${totalUpdated} vehicles marked as sold`,
      totalProcessed: totalUpdated
    };

  } catch (error) {
    console.error('Cleanup error:', error);
    throw error;
  }
};

export const performInventoryCleanup = async () => {
  try {
    const result = await cleanupInventoryData();
    
    toast({
      title: "Cleanup Complete",
      description: result.message,
    });
    
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
