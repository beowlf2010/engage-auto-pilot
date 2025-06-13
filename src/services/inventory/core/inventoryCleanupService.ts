import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CleanupSummary {
  totalProcessed: number;
  latestUploads: {
    mostRecentUploads: string[];
  };
}

export const getLatestUploads = async (): Promise<CleanupSummary['latestUploads']> => {
  console.log('Getting latest upload batches...');
  
  // Get the most recent upload_history_id values (regardless of source_report)
  const { data: recentUploads } = await supabase
    .from('inventory')
    .select('upload_history_id')
    .not('upload_history_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500); // Get enough to find recent unique uploads

  if (!recentUploads) {
    console.warn('No upload history found');
    return { mostRecentUploads: [] };
  }

  // Get unique upload_history_ids and take the 2 most recent ones
  const uniqueUploads = [...new Set(recentUploads.map(r => r.upload_history_id))];
  const mostRecentUploads = uniqueUploads.slice(0, 2); // Keep vehicles from 2 most recent upload batches

  console.log('Most recent upload batches:', mostRecentUploads);
  return { mostRecentUploads };
};

export const cleanupInventoryData = async (): Promise<CleanupSummary> => {
  try {
    console.log('Starting inventory cleanup process...');
    
    const latestUploads = await getLatestUploads();
    console.log('Latest uploads identified:', latestUploads);

    if (latestUploads.mostRecentUploads.length === 0) {
      console.warn('No recent uploads found to base cleanup on');
      throw new Error('No recent upload history found to determine which vehicles to keep');
    }

    // Step 1: Get all vehicle IDs that should be KEPT (from recent uploads)
    const { data: vehiclesToKeep, error: keepError } = await supabase
      .from('inventory')
      .select('id')
      .in('upload_history_id', latestUploads.mostRecentUploads);

    if (keepError) {
      console.error('Error fetching vehicles to keep:', keepError);
      throw keepError;
    }

    console.log(`Found ${vehiclesToKeep?.length || 0} vehicles to keep from recent uploads`);

    if (!vehiclesToKeep || vehiclesToKeep.length === 0) {
      console.log('No vehicles found in recent uploads');
      return {
        totalProcessed: 0,
        latestUploads,
      };
    }

    // Step 2: Get all vehicles that should be marked as sold (NOT in the keep list and not already sold)
    const keepIds = vehiclesToKeep.map(v => v.id);
    
    const { data: vehiclesToUpdate, error: fetchError } = await supabase
      .from('inventory')
      .select('id, upload_history_id, status')
      .neq('status', 'sold')
      .not('id', 'in', keepIds);

    if (fetchError) {
      console.error('Error fetching vehicles to update:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${vehiclesToUpdate?.length || 0} vehicles to mark as sold`);

    if (!vehiclesToUpdate || vehiclesToUpdate.length === 0) {
      console.log('No vehicles need to be marked as sold');
      return {
        totalProcessed: 0,
        latestUploads,
      };
    }

    // Step 3: Mark old vehicles as sold using their IDs
    const vehicleIds = vehiclesToUpdate.map(v => v.id);
    
    const { data: updatedVehicles, error: updateError } = await supabase
      .from('inventory')
      .update({
        status: 'sold',
        sold_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', vehicleIds)
      .select('id');

    if (updateError) {
      console.error('Error marking vehicles as sold:', updateError);
      throw updateError;
    }

    const totalProcessed = updatedVehicles?.length || 0;
    console.log(`Cleanup completed. Total processed: ${totalProcessed}`);

    return {
      totalProcessed,
      latestUploads,
    };
  } catch (error) {
    console.error('Error during inventory cleanup:', error);
    throw error;
  }
};

export const performInventoryCleanup = async (): Promise<void> => {
  try {
    toast({
      title: "Cleanup Started",
      description: "Processing inventory data cleanup...",
    });

    const summary = await cleanupInventoryData();

    toast({
      title: "Cleanup Completed",
      description: `Processed ${summary.totalProcessed} vehicles and marked them as sold`,
    });

    // Refresh the page to show updated counts
    window.location.reload();
  } catch (error) {
    console.error('Cleanup failed:', error);
    toast({
      title: "Cleanup Failed",
      description: error instanceof Error ? error.message : "Failed to clean up inventory data. Please try again.",
      variant: "destructive"
    });
  }
};
