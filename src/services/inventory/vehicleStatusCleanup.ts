
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const resetIncorrectlySoldVehicles = async () => {
  try {
    console.log('Resetting vehicles that were incorrectly marked as sold...');
    
    // Find vehicles marked as sold but don't have corresponding deals
    const { data: soldVehicles, error: fetchError } = await supabase
      .from('inventory')
      .select('id, stock_number, vin, status, sold_at')
      .eq('status', 'sold')
      .not('stock_number', 'is', null);

    if (fetchError) throw fetchError;

    if (!soldVehicles || soldVehicles.length === 0) {
      toast({
        title: "No sold vehicles found",
        description: "There are no vehicles currently marked as sold to check.",
      });
      return;
    }

    // Get deals for these stock numbers
    const stockNumbers = soldVehicles.map(v => v.stock_number).filter(Boolean);
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('stock_number')
      .in('stock_number', stockNumbers);

    if (dealsError) throw dealsError;

    const dealsStockNumbers = new Set(deals?.map(d => d.stock_number) || []);
    
    // Find vehicles marked as sold without corresponding deals
    const vehiclesToReset = soldVehicles.filter(vehicle => 
      !dealsStockNumbers.has(vehicle.stock_number)
    );

    if (vehiclesToReset.length === 0) {
      toast({
        title: "All sold vehicles are correct",
        description: "All vehicles marked as sold have corresponding financial deals.",
      });
      return;
    }

    console.log(`Found ${vehiclesToReset.length} vehicles to reset to available status`);

    // Reset these vehicles to available
    const { error: updateError } = await supabase
      .from('inventory')
      .update({
        status: 'available',
        sold_at: null,
        updated_at: new Date().toISOString()
      })
      .in('id', vehiclesToReset.map(v => v.id));

    if (updateError) throw updateError;

    toast({
      title: "Vehicle status corrected",
      description: `Reset ${vehiclesToReset.length} vehicles back to available status - they had no corresponding deals.`,
    });

    return vehiclesToReset.length;

  } catch (error) {
    console.error('Error resetting vehicle status:', error);
    toast({
      title: "Error resetting vehicles",
      description: error instanceof Error ? error.message : "Failed to reset vehicle status",
      variant: "destructive"
    });
    throw error;
  }
};
