import { supabase } from "@/integrations/supabase/client";
import { updateInventoryStatusFromDeals } from "@/utils/inventoryDealSync";

export const updateDealType = async (dealId: string, newType: 'retail' | 'dealer_trade' | 'wholesale') => {
  const { error } = await supabase
    .from('deals')
    .update({ deal_type: newType })
    .eq('id', dealId);

  if (error) {
    throw new Error(`Failed to update deal type: ${error.message}`);
  }
};

export const insertDealsInBatches = async (
  deals: any[],
  uploadHistoryId: string,
  batchSize: number = 1000
): Promise<{ successCount: number; errorCount: number; errors: string[] }> => {
  console.log(`Processing ${deals.length} deals in batches of ${batchSize}`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  const processedStockNumbers: string[] = [];

  for (let i = 0; i < deals.length; i += batchSize) {
    const batch = deals.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(deals.length / batchSize)}`);
    
    try {
      const { data, error } = await supabase
        .from('deals')
        .insert(batch)
        .select('stock_number');

      if (error) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error);
        errorCount += batch.length;
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        successCount += batch.length;
        console.log(`Batch ${Math.floor(i / batchSize) + 1} completed successfully`);
        
        // Collect stock numbers for inventory sync
        if (data) {
          const stockNumbers = data.map(deal => deal.stock_number).filter(Boolean);
          processedStockNumbers.push(...stockNumbers);
        }
      }
    } catch (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} exception:`, error);
      errorCount += batch.length;
      errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Sync inventory status after successful deal insertion
  if (processedStockNumbers.length > 0) {
    try {
      console.log('Syncing inventory status with new deals...');
      await updateInventoryStatusFromDeals([...new Set(processedStockNumbers)]);
    } catch (syncError) {
      console.warn('Failed to sync inventory status:', syncError);
      // Don't fail the whole operation if sync fails
    }
  }

  return { successCount, errorCount, errors };
};
