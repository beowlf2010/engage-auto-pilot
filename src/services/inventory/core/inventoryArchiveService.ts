
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const archiveOldSoldVehicles = async () => {
  try {
    console.log('Starting archive process for old sold vehicles...');
    
    // Find vehicles that have been sold for more than 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    const { data: oldSoldVehicles, error: fetchError } = await supabase
      .from('inventory')
      .select('id, stock_number, vin, make, model, year, sold_at')
      .eq('status', 'sold')
      .lt('sold_at', cutoffDate.toISOString());

    if (fetchError) throw fetchError;

    if (!oldSoldVehicles || oldSoldVehicles.length === 0) {
      toast({
        title: "No old sold vehicles to archive",
        description: "All sold vehicles are recent (within 90 days).",
      });
      return 0;
    }

    console.log(`Found ${oldSoldVehicles.length} old sold vehicles to archive`);

    // Instead of deleting, we could mark them as archived
    // For now, let's just provide a cleanup option
    const { error: archiveError } = await supabase
      .from('inventory')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .in('id', oldSoldVehicles.map(v => v.id));

    if (archiveError) throw archiveError;

    toast({
      title: "Vehicles archived successfully",
      description: `Archived ${oldSoldVehicles.length} old sold vehicles (sold >90 days ago). This will improve count accuracy.`,
    });

    return oldSoldVehicles.length;

  } catch (error) {
    console.error('Error archiving old vehicles:', error);
    toast({
      title: "Error archiving vehicles",
      description: error instanceof Error ? error.message : "Failed to archive old vehicles",
      variant: "destructive"
    });
    throw error;
  }
};

export const cleanupInflatedCounts = async () => {
  try {
    console.log('=== INVENTORY COUNT CLEANUP ===');
    
    // Get count of sold vehicles that are inflating the numbers
    const { count: soldCount } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sold');

    // Get count of truly active vehicles
    const { count: availableCount } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available');

    const { count: gmGlobalCount } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true })
      .eq('source_report', 'orders_all')
      .neq('status', 'sold');

    const actualActiveCount = (availableCount || 0) + (gmGlobalCount || 0);

    console.log('Count analysis:', {
      soldVehicles: soldCount,
      availableVehicles: availableCount,
      gmGlobalOrders: gmGlobalCount,
      actualActiveTotal: actualActiveCount
    });

    toast({
      title: "Count Analysis Complete",
      description: `Found ${actualActiveCount} active vehicles (${availableCount} available + ${gmGlobalCount} GM Global). ${soldCount} sold vehicles excluded from active count.`,
    });

    return {
      soldCount: soldCount || 0,
      activeCount: actualActiveCount,
      availableCount: availableCount || 0,
      gmGlobalCount: gmGlobalCount || 0
    };

  } catch (error) {
    console.error('Error analyzing counts:', error);
    toast({
      title: "Error analyzing counts",
      description: error instanceof Error ? error.message : "Failed to analyze inventory counts",
      variant: "destructive"
    });
    throw error;
  }
};
