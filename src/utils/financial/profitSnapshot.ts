
import { supabase } from "@/integrations/supabase/client";
import { DealRecord } from "../dms/types";

export const createProfitSnapshot = async (
  validDeals: DealRecord[],
  uploadHistoryId: string,
  reportDate?: string
) => {
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
    summary: summaryData,
    reportDate: snapshotDate,
    snapshotId: snapshotResult
  };
};
