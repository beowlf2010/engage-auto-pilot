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

    // --- Duplicate VIN Cleanup ---
    // Get all NON-sold inventory grouped by VIN
    const { data: dupes, error: dupesError } = await supabase
      .from('inventory')
      .select('id, vin, created_at, updated_at, status')
      .neq('status', 'sold')
      .not('vin', 'is', null);

    if (dupesError) {
      console.error('Error fetching inventory for VIN deduplication:', dupesError);
      throw dupesError;
    }

    // Identify VINs with more than one non-sold record
    const vinMap: Record<string, { id: string; created_at: string; updated_at: string; status: string }[]> = {};
    dupes?.forEach((row) => {
      if (!vinMap[row.vin]) vinMap[row.vin] = [];
      vinMap[row.vin].push(row);
    });

    let toMarkSold: string[] = [];
    Object.entries(vinMap).forEach(([vin, records]) => {
      if (records.length > 1) {
        // Sort so we keep the latest (by updated_at, then created_at)
        const sorted = [...records].sort((a, b) =>
          new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
        );
        // Keep the most recent, mark others as sold
        const markSold = sorted.slice(1).map((r) => r.id);
        toMarkSold.push(...markSold);
      }
    });

    if (toMarkSold.length > 0) {
      console.log(`Marking ${toMarkSold.length} duplicate VIN records as sold`);
      const { error: updateDupesError } = await supabase
        .from('inventory')
        .update({
          status: 'sold',
          sold_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', toMarkSold);
      if (updateDupesError) {
        console.error('Error marking duplicate VINs as sold:', updateDupesError);
        throw updateDupesError;
      }
    } else {
      console.log('No duplicate VIN groups needing cleanup.');
    }

    // --- Proceed with existing cleanup logic (keep only recent upload vehicles) ---
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
        totalProcessed: toMarkSold.length,
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
        totalProcessed: toMarkSold.length,
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

    const totalProcessed = (updatedVehicles?.length || 0) + toMarkSold.length;
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
