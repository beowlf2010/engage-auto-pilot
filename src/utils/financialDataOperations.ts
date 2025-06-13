import { supabase } from "@/integrations/supabase/client";
import { DealRecord, FinancialSummary } from "./dms/types";

export const insertFinancialData = async (
  deals: DealRecord[],
  summary: FinancialSummary,
  uploadHistoryId: string,
  reportDate?: string
) => {
  console.log('=== FINANCIAL DATA INSERTION ===');
  console.log(`Inserting ${deals.length} deals`);
  console.log('Sample deal dates:', deals.slice(0, 5).map(d => ({ stock: d.stockNumber, date: d.saleDate })));
  
  try {
    // Map deals to database format - use individual deal dates
    const dealRecords = deals.map(deal => {
      const dealDate = deal.saleDate || new Date().toISOString().split('T')[0];
      console.log(`Processing deal ${deal.stockNumber}: saleDate=${deal.saleDate}, using=${dealDate}`);
      
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
        deal_type: deal.dealType === 'new' ? 'new' : 'retail',
        upload_history_id: uploadHistoryId,
        original_gross_profit: deal.grossProfit || null,
        original_fi_profit: deal.fiProfit || null,
        original_total_profit: deal.totalProfit || null,
        first_reported_date: dealDate // Store the individual deal date here too
      };
    });

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

    console.log(`Successfully upserted ${insertedDeals?.length || 0} deals`);

    // For profit snapshot, use the most common deal date from the actual deals
    const dateGroups = deals.reduce((acc, deal) => {
      const date = deal.saleDate || new Date().toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Use the most frequent date from the actual deals, or fall back to report date
    const snapshotDate = Object.keys(dateGroups).length > 0 
      ? Object.keys(dateGroups).reduce((a, b) => dateGroups[a] > dateGroups[b] ? a : b)
      : reportDate || new Date().toISOString().split('T')[0];

    console.log(`Using snapshot date: ${snapshotDate} (from ${Object.keys(dateGroups).length} unique deal dates)`);
    console.log('Date distribution:', dateGroups);

    const retailDeals = deals.filter(d => d.dealType !== 'new');
    const newDeals = deals.filter(d => d.dealType === 'new');

    const summaryData = {
      snapshot_date: snapshotDate,
      total_units: deals.length, // Use actual deal count, not summary.totalUnits
      total_sales: summary.totalSales,
      total_gross: summary.totalGross,
      total_fi_profit: summary.totalFiProfit,
      total_profit: summary.totalProfit,
      new_units: newDeals.length,
      new_gross: newDeals.reduce((sum, deal) => sum + (deal.grossProfit || 0), 0),
      used_units: retailDeals.length,
      used_gross: retailDeals.reduce((sum, deal) => sum + (deal.grossProfit || 0), 0),
      retail_units: summary.retailUnits,
      retail_gross: summary.retailGross,
      dealer_trade_units: summary.dealerTradeUnits,
      dealer_trade_gross: summary.dealerTradeGross,
      wholesale_units: summary.wholesaleUnits,
      wholesale_gross: summary.wholesaleGross,
      upload_history_id: uploadHistoryId
    };

    console.log('Summary data for snapshot:', summaryData);

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
      insertedDeals: insertedDeals?.length || 0,
      summary: summaryData,
      reportDate: snapshotDate
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
