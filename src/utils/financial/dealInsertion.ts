
import { supabase } from "@/integrations/supabase/client";
import { DealRecord, FinancialSummary } from "../dms/types";

export const insertFinancialData = async (
  deals: DealRecord[],
  summary: FinancialSummary,
  uploadHistoryId: string,
  reportDate?: string
) => {
  console.log('=== FINANCIAL DATA INSERTION ===');
  console.log(`Starting with ${deals.length} extracted deals`);
  
  // Filter out deals with invalid data BEFORE processing
  const validDeals = deals.filter(deal => {
    if (!deal.saleDate) {
      console.warn(`Skipping deal ${deal.stockNumber}: No valid sale date`);
      return false;
    }
    if (!deal.stockNumber && (deal.grossProfit === undefined || deal.grossProfit === null)) {
      console.warn(`Skipping deal: No stock number and no gross profit`);
      return false;
    }
    return true;
  });
  
  console.log(`After filtering: ${validDeals.length} valid deals (${deals.length - validDeals.length} skipped due to missing data)`);
  
  if (validDeals.length === 0) {
    throw new Error('No valid deals found after filtering. Check date parsing and required fields.');
  }
  
  try {
    // Map deals to database format - use individual deal dates and ensure correct deal_type
    const dealRecords = validDeals.map(deal => {
      const dealDate = deal.saleDate!; // We know it's valid from filtering above
      console.log(`Processing deal ${deal.stockNumber}: saleDate=${deal.saleDate}, dealType=${deal.dealType}`);
      
      return {
        upload_date: dealDate, // Use individual deal date as upload_date for database storage
        stock_number: deal.stockNumber || null,
        age: deal.age || null,
        year_model: deal.yearModel || null,
        buyer_name: deal.buyerName || null,
        sale_amount: deal.saleAmount || null,
        cost_amount: deal.costAmount || null,
        gross_profit: deal.grossProfit || null,
        fi_profit: deal.fiProfit || null,
        total_profit: deal.totalProfit || null,
        deal_type: deal.dealType || 'retail', // Ensure valid deal_type
        upload_history_id: uploadHistoryId,
        original_gross_profit: deal.grossProfit || null,
        original_fi_profit: deal.fiProfit || null,
        original_total_profit: deal.totalProfit || null,
        first_reported_date: dealDate // Store the individual deal date here too
      };
    });

    console.log(`Prepared ${dealRecords.length} deal records for insertion`);
    console.log('Sample deal record to insert:', dealRecords[0]);

    // Use upsert with the unique constraint on stock_number only
    const { data: insertedDeals, error: insertError } = await supabase
      .from('deals')
      .upsert(dealRecords, {
        onConflict: 'stock_number',
        ignoreDuplicates: false
      })
      .select();

    if (insertError) {
      console.error('Deal insertion error:', insertError);
      throw new Error(`Failed to insert deals: ${insertError.message}`);
    }

    const insertedCount = insertedDeals?.length || 0;
    console.log(`Successfully upserted ${insertedCount} deals`);
    
    if (insertedCount !== dealRecords.length) {
      console.warn(`Warning: Tried to insert ${dealRecords.length} deals but only ${insertedCount} were successful`);
    }

    return {
      insertedCount,
      validDeals,
      dealRecords: dealRecords.length,
      totalExtracted: deals.length,
      skippedDeals: deals.length - validDeals.length
    };

  } catch (error) {
    console.error('Financial data insertion failed:', error);
    throw error;
  }
};
