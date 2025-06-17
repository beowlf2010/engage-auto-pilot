
import { supabase } from "@/integrations/supabase/client";

export const updateInventoryStatusFromDeals = async (stockNumbers: string[]) => {
  if (stockNumbers.length === 0) return;

  console.log('Marking vehicles as sold based on financial data for stock numbers:', stockNumbers);

  try {
    // Mark inventory as sold only when deals are found - this is the correct way
    const { error } = await supabase
      .from('inventory')
      .update({ 
        status: 'sold',
        sold_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('stock_number', stockNumbers)
      .neq('status', 'sold'); // Only update if not already sold

    if (error) {
      console.error('Error updating inventory status from deals:', error);
      throw error;
    }

    console.log(`Successfully marked ${stockNumbers.length} vehicles as sold based on financial data`);
  } catch (error) {
    console.error('Failed to sync inventory with deals:', error);
    throw error;
  }
};

export const checkAndSyncInventoryStatus = async () => {
  try {
    // Get all stock numbers from recent deals (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentDeals, error: dealsError } = await supabase
      .from('deals')
      .select('stock_number')
      .gte('upload_date', thirtyDaysAgo.toISOString().split('T')[0])
      .not('stock_number', 'is', null);

    if (dealsError) throw dealsError;

    if (recentDeals && recentDeals.length > 0) {
      const stockNumbers = [...new Set(recentDeals.map(deal => deal.stock_number).filter(Boolean))];
      await updateInventoryStatusFromDeals(stockNumbers);
    }
  } catch (error) {
    console.error('Error in inventory-deal sync:', error);
  }
};
