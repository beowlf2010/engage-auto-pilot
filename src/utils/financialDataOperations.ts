
import { supabase } from '@/integrations/supabase/client';
import { DealRecord, FinancialSummary } from './dmsFileParser';

export const insertFinancialData = async (
  deals: DealRecord[],
  summary: FinancialSummary,
  uploadHistoryId: string,
  uploadDate: string
) => {
  console.log('=== INSERTING FINANCIAL DATA ===');
  
  try {
    // Insert individual deals
    const dealsToInsert = deals.map(deal => ({
      upload_date: uploadDate,
      stock_number: deal.stockNumber,
      age: deal.age,
      year_model: deal.yearModel,
      buyer_name: deal.buyerName,
      sale_amount: deal.saleAmount,
      cost_amount: deal.costAmount,
      gross_profit: deal.grossProfit,
      fi_profit: deal.fiProfit,
      total_profit: deal.totalProfit,
      deal_type: deal.dealType,
      upload_history_id: uploadHistoryId
    }));

    const { data: insertedDeals, error: dealsError } = await supabase
      .from('deals')
      .insert(dealsToInsert)
      .select();

    if (dealsError) {
      console.error('Error inserting deals:', dealsError);
      throw dealsError;
    }

    console.log(`Inserted ${insertedDeals?.length} deals`);

    // Upsert profit snapshot using the database function
    const { data: snapshotId, error: snapshotError } = await supabase
      .rpc('upsert_profit_snapshot', {
        p_date: uploadDate,
        p_total_units: summary.totalUnits,
        p_total_sales: summary.totalSales,
        p_total_gross: summary.totalGross,
        p_total_fi_profit: summary.totalFiProfit,
        p_total_profit: summary.totalProfit,
        p_new_units: summary.newUnits,
        p_new_gross: summary.newGross,
        p_used_units: summary.usedUnits,
        p_used_gross: summary.usedGross,
        p_upload_history_id: uploadHistoryId
      });

    if (snapshotError) {
      console.error('Error upserting profit snapshot:', snapshotError);
      throw snapshotError;
    }

    console.log('Profit snapshot upserted with ID:', snapshotId);

    return {
      insertedDeals: insertedDeals?.length || 0,
      snapshotId,
      summary
    };

  } catch (error) {
    console.error('Financial data insertion failed:', error);
    throw error;
  }
};

export const getMonthlyRetailSummary = async () => {
  try {
    const { data, error } = await supabase
      .from('v_monthly_retail_summary')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
      console.error('Error fetching monthly summary:', error);
      throw error;
    }

    // Return default values if no data found
    return data || {
      new_units_mtd: 0,
      new_gross_mtd: 0,
      used_units_mtd: 0,
      used_gross_mtd: 0,
      total_units_mtd: 0,
      total_profit_mtd: 0
    };
  } catch (error) {
    console.error('Error in getMonthlyRetailSummary:', error);
    // Return default values on any error
    return {
      new_units_mtd: 0,
      new_gross_mtd: 0,
      used_units_mtd: 0,
      used_gross_mtd: 0,
      total_units_mtd: 0,
      total_profit_mtd: 0
    };
  }
};
