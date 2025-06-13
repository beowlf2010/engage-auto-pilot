import { supabase } from "@/integrations/supabase/client";
import { DealRecord, FinancialSummary } from "./dms/types";

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

    // Use upsert with the unique constraint on (stock_number, upload_date)
    const { data: insertedDeals, error: insertError } = await supabase
      .from('deals')
      .upsert(dealRecords, {
        onConflict: 'stock_number,upload_date',
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

    // For profit snapshot, use the most common deal date from the actual valid deals
    const dateGroups = validDeals.reduce((acc, deal) => {
      const date = deal.saleDate!; // We know it's valid
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Use the most frequent date from the actual deals, or fall back to report date
    const snapshotDate = Object.keys(dateGroups).length > 0 
      ? Object.keys(dateGroups).reduce((a, b) => dateGroups[a] > dateGroups[b] ? a : b)
      : reportDate || new Date().toISOString().split('T')[0];

    console.log(`Using snapshot date: ${snapshotDate} (from ${Object.keys(dateGroups).length} unique deal dates)`);
    console.log('Date distribution:', dateGroups);

    // Categorize deals for profit snapshot using validDeals (not all deals)
    const retailDeals = validDeals.filter(d => (d.dealType || 'retail') === 'retail');
    const dealerTradeDeals = validDeals.filter(d => d.dealType === 'dealer_trade');
    const wholesaleDeals = validDeals.filter(d => d.dealType === 'wholesale');
    
    // Separate new vs used based on stock number classification
    const getVehicleType = (stockNumber?: string): 'new' | 'used' => {
      if (!stockNumber) return 'used';
      const firstChar = stockNumber.trim().toUpperCase().charAt(0);
      return firstChar === 'C' ? 'new' : 'used';
    };
    
    const newDeals = retailDeals.filter(d => getVehicleType(d.stockNumber) === 'new');
    const usedDeals = retailDeals.filter(d => getVehicleType(d.stockNumber) === 'used');

    const summaryData = {
      snapshot_date: snapshotDate,
      total_units: validDeals.length, // Use valid deal count, not original summary
      total_sales: validDeals.reduce((sum, deal) => sum + (deal.saleAmount || 0), 0),
      total_gross: validDeals.reduce((sum, deal) => sum + (deal.grossProfit || 0), 0),
      total_fi_profit: validDeals.reduce((sum, deal) => sum + (deal.fiProfit || 0), 0),
      total_profit: validDeals.reduce((sum, deal) => sum + (deal.totalProfit || 0), 0),
      new_units: newDeals.length,
      new_gross: newDeals.reduce((sum, deal) => sum + (deal.grossProfit || 0), 0),
      used_units: usedDeals.length,
      used_gross: usedDeals.reduce((sum, deal) => sum + (deal.grossProfit || 0), 0),
      retail_units: retailDeals.length,
      retail_gross: retailDeals.reduce((sum, deal) => sum + (deal.grossProfit || 0), 0),
      dealer_trade_units: dealerTradeDeals.length,
      dealer_trade_gross: dealerTradeDeals.reduce((sum, deal) => sum + (deal.grossProfit || 0), 0),
      wholesale_units: wholesaleDeals.length,
      wholesale_gross: wholesaleDeals.reduce((sum, deal) => sum + (deal.grossProfit || 0), 0),
      upload_history_id: uploadHistoryId
    };

    console.log('Summary data for snapshot (calculated from valid deals):', summaryData);

    // Use the expanded profit snapshot function
    const { data: snapshotResult, error: snapshotError } = await supabase
      .rpc('upsert_expanded_profit_snapshot', {
        p_date: snapshotDate,
        p_retail_units: summaryData.retail_units,
        p_retail_gross: summaryData.retail_gross,
        p_dealer_trade_units: summaryData.dealer_trade_units,
        p_dealer_trade_gross: summaryData.dealer_trade_gross,
        p_wholesale_units: summaryData.wholesale_units,
        p_wholesale_gross: summaryData.wholesale_gross,
        p_new_units: summaryData.new_units,
        p_new_gross: summaryData.new_gross,
        p_used_units: summaryData.used_units,
        p_used_gross: summaryData.used_gross,
        p_total_units: summaryData.total_units,
        p_total_sales: summaryData.total_sales,
        p_total_gross: summaryData.total_gross,
        p_total_fi_profit: summaryData.total_fi_profit,
        p_total_profit: summaryData.total_profit,
        p_upload_history_id: uploadHistoryId
      });

    if (snapshotError) {
      console.error('Profit snapshot error:', snapshotError);
      throw new Error(`Failed to create profit snapshot: ${snapshotError.message}`);
    }

    console.log('Profit snapshot upserted with ID:', snapshotResult);

    return {
      insertedDeals: insertedCount,
      summary: summaryData,
      reportDate: snapshotDate,
      totalExtracted: deals.length,
      validDeals: validDeals.length,
      skippedDeals: deals.length - validDeals.length
    };

  } catch (error) {
    console.error('Financial data insertion failed:', error);
    throw error;
  }
};

export const updateDealType = async (dealId: string, newType: 'retail' | 'dealer_trade' | 'wholesale') => {
  const { error } = await supabase
    .from('deals')
    .update({ deal_type: newType })
    .eq('id', dealId);

  if (error) {
    throw new Error(`Failed to update deal type: ${error.message}`);
  }
};

export const getMonthlyRetailSummary = async () => {
  const { data, error } = await supabase
    .from('v_monthly_retail_summary')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching monthly retail summary:', error);
    return {
      new_units_mtd: 0,
      new_gross_mtd: 0,
      used_units_mtd: 0,
      used_gross_mtd: 0,
      total_units_mtd: 0,
      total_profit_mtd: 0
    };
  }

  return {
    new_units_mtd: data?.new_units_mtd || 0,
    new_gross_mtd: data?.new_gross_mtd || 0,
    used_units_mtd: data?.used_units_mtd || 0,
    used_gross_mtd: data?.used_gross_mtd || 0,
    total_units_mtd: data?.total_units_mtd || 0,
    total_profit_mtd: data?.total_profit_mtd || 0
  };
};
