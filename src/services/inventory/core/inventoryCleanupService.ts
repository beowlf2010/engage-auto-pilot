
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CleanupSummary {
  totalProcessed: number;
  gmGlobalMarkedSold: number;
  newMarkedSold: number;
  usedMarkedSold: number;
  latestUploads: {
    gmGlobal: string | null;
    new: string | null;
    used: string | null;
  };
}

export const getLatestUploads = async (): Promise<CleanupSummary['latestUploads']> => {
  // Get latest GM Global upload
  const { data: latestGMGlobal } = await supabase
    .from('upload_history')
    .select('id')
    .eq('upload_type', 'inventory')
    .eq('inventory_condition', 'new')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Get latest Used upload
  const { data: latestUsed } = await supabase
    .from('upload_history')
    .select('id')
    .eq('upload_type', 'inventory')
    .eq('inventory_condition', 'used')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Get latest New upload (non-GM Global)
  const { data: latestNew } = await supabase
    .from('upload_history')
    .select('id')
    .eq('upload_type', 'inventory')
    .eq('inventory_condition', 'new')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    gmGlobal: latestGMGlobal?.id || null,
    new: latestNew?.id || null,
    used: latestUsed?.id || null,
  };
};

export const cleanupInventoryData = async (): Promise<CleanupSummary> => {
  try {
    console.log('Starting inventory cleanup process...');
    
    const latestUploads = await getLatestUploads();
    console.log('Latest uploads identified:', latestUploads);

    let totalProcessed = 0;
    let gmGlobalMarkedSold = 0;
    let newMarkedSold = 0;
    let usedMarkedSold = 0;

    // Mark old GM Global orders as sold (not from latest upload)
    if (latestUploads.gmGlobal) {
      const { data: oldGMGlobal, error: gmError } = await supabase
        .from('inventory')
        .update({
          status: 'sold',
          sold_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('source_report', 'orders_all')
        .neq('upload_history_id', latestUploads.gmGlobal)
        .neq('status', 'sold')
        .select('id');

      if (gmError) throw gmError;
      gmGlobalMarkedSold = oldGMGlobal?.length || 0;
      totalProcessed += gmGlobalMarkedSold;
      console.log(`Marked ${gmGlobalMarkedSold} old GM Global orders as sold`);
    }

    // Mark old New vehicles as sold (not from latest upload, excluding GM Global)
    if (latestUploads.new) {
      const { data: oldNew, error: newError } = await supabase
        .from('inventory')
        .update({
          status: 'sold',
          sold_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('condition', 'new')
        .or('source_report.is.null,source_report.neq.orders_all')
        .neq('upload_history_id', latestUploads.new)
        .neq('status', 'sold')
        .select('id');

      if (newError) throw newError;
      newMarkedSold = oldNew?.length || 0;
      totalProcessed += newMarkedSold;
      console.log(`Marked ${newMarkedSold} old New vehicles as sold`);
    }

    // Mark old Used vehicles as sold (not from latest upload)
    if (latestUploads.used) {
      const { data: oldUsed, error: usedError } = await supabase
        .from('inventory')
        .update({
          status: 'sold',
          sold_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('condition', 'used')
        .neq('upload_history_id', latestUploads.used)
        .neq('status', 'sold')
        .select('id');

      if (usedError) throw usedError;
      usedMarkedSold = oldUsed?.length || 0;
      totalProcessed += usedMarkedSold;
      console.log(`Marked ${usedMarkedSold} old Used vehicles as sold`);
    }

    console.log(`Cleanup completed. Total processed: ${totalProcessed}`);

    return {
      totalProcessed,
      gmGlobalMarkedSold,
      newMarkedSold,
      usedMarkedSold,
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
      description: `Processed ${summary.totalProcessed} vehicles: ${summary.gmGlobalMarkedSold} GM Global, ${summary.newMarkedSold} New, ${summary.usedMarkedSold} Used marked as sold`,
    });

    // Refresh the page to show updated counts
    window.location.reload();
  } catch (error) {
    console.error('Cleanup failed:', error);
    toast({
      title: "Cleanup Failed",
      description: "Failed to clean up inventory data. Please try again.",
      variant: "destructive"
    });
  }
};
