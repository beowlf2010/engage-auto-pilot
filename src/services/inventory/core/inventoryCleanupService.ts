
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CleanupSummary {
  totalProcessed: number;
  gmGlobalMarkedSold: number;
  regularInventoryMarkedSold: number;
  latestUploads: {
    mostRecentUploads: string[];
    gmGlobalUpload: string | null;
  };
}

export const getLatestUploads = async (): Promise<CleanupSummary['latestUploads']> => {
  // Get the 3 most recent upload_history_id values from inventory
  // This handles mixed uploads better than filtering by condition
  const { data: recentUploads } = await supabase
    .from('inventory')
    .select('upload_history_id')
    .not('upload_history_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1000); // Get enough to find recent unique uploads

  if (!recentUploads) {
    return { mostRecentUploads: [], gmGlobalUpload: null };
  }

  // Get unique upload_history_ids and take the most recent ones
  const uniqueUploads = [...new Set(recentUploads.map(r => r.upload_history_id))];
  const mostRecentUploads = uniqueUploads.slice(0, 3); // Keep vehicles from 3 most recent uploads

  // Find the most recent GM Global upload specifically
  const { data: gmGlobalUpload } = await supabase
    .from('inventory')
    .select('upload_history_id')
    .eq('source_report', 'orders_all')
    .not('upload_history_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    mostRecentUploads,
    gmGlobalUpload: gmGlobalUpload?.upload_history_id || null,
  };
};

const buildNotInQuery = (query: any, fieldName: string, excludeValues: string[]) => {
  // Since Supabase doesn't support .not('field', 'in', array), 
  // we'll chain multiple .neq() conditions for each value to exclude
  let modifiedQuery = query;
  
  for (const value of excludeValues) {
    modifiedQuery = modifiedQuery.neq(fieldName, value);
  }
  
  return modifiedQuery;
};

export const cleanupInventoryData = async (): Promise<CleanupSummary> => {
  try {
    console.log('Starting inventory cleanup process...');
    
    const latestUploads = await getLatestUploads();
    console.log('Latest uploads identified:', latestUploads);

    let totalProcessed = 0;
    let gmGlobalMarkedSold = 0;
    let regularInventoryMarkedSold = 0;

    // Validate we have upload IDs before proceeding
    if (latestUploads.mostRecentUploads.length === 0) {
      console.warn('No recent uploads found to base cleanup on');
      throw new Error('No recent upload history found to determine which vehicles to keep');
    }

    // Mark old GM Global orders as sold (not from latest GM Global upload)
    if (latestUploads.gmGlobalUpload) {
      const { data: oldGMGlobal, error: gmError } = await supabase
        .from('inventory')
        .update({
          status: 'sold',
          sold_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('source_report', 'orders_all')
        .neq('upload_history_id', latestUploads.gmGlobalUpload)
        .neq('status', 'sold')
        .select('id');

      if (gmError) {
        console.error('Error marking old GM Global as sold:', gmError);
        throw gmError;
      }

      gmGlobalMarkedSold = oldGMGlobal?.length || 0;
      totalProcessed += gmGlobalMarkedSold;
      console.log(`Marked ${gmGlobalMarkedSold} old GM Global orders as sold`);
    }

    // Mark regular inventory (non-GM Global) as sold if not from recent uploads
    // Build query with multiple .neq() conditions instead of unsupported .not('in')
    let regularQuery = supabase
      .from('inventory')
      .update({
        status: 'sold',
        sold_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .not('source_report', 'eq', 'orders_all')
      .neq('status', 'sold');

    // Chain multiple .neq() conditions for each upload_history_id to exclude
    regularQuery = buildNotInQuery(regularQuery, 'upload_history_id', latestUploads.mostRecentUploads);

    const { data: oldRegular, error: regularError } = await regularQuery.select('id');

    if (regularError) {
      console.error('Error marking old regular inventory as sold:', regularError);
      throw regularError;
    }

    regularInventoryMarkedSold = oldRegular?.length || 0;
    totalProcessed += regularInventoryMarkedSold;
    console.log(`Marked ${regularInventoryMarkedSold} old regular inventory vehicles as sold`);

    console.log(`Cleanup completed. Total processed: ${totalProcessed}`);

    return {
      totalProcessed,
      gmGlobalMarkedSold,
      regularInventoryMarkedSold,
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
      description: `Processed ${summary.totalProcessed} vehicles: ${summary.gmGlobalMarkedSold} GM Global, ${summary.regularInventoryMarkedSold} Regular inventory marked as sold`,
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
