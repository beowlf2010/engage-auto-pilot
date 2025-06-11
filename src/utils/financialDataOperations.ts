
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
    // First, check for existing deals this month to handle profit change tracking
    const existingDealsMap = new Map();
    if (deals.length > 0) {
      const stockNumbers = deals.map(deal => deal.stockNumber).filter(Boolean);
      if (stockNumbers.length > 0) {
        const { data: existingDeals } = await supabase
          .from('deals')
          .select('stock_number, original_gross_profit, original_fi_profit, original_total_profit, first_reported_date')
          .in('stock_number', stockNumbers)
          .gte('upload_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
        
        if (existingDeals) {
          existingDeals.forEach(deal => {
            existingDealsMap.set(deal.stock_number, deal);
          });
        }
      }
    }

    // Prepare deals for insertion with proper deal classification and profit tracking
    const dealsToInsert = deals.map(deal => {
      const existingDeal = existingDealsMap.get(deal.stockNumber);
      const isNewDeal = !existingDeal;
      
      // Map the parsed deal type (new/used from DMS) to database deal_type (retail as default)
      // All deals default to 'retail' unless manually changed later
      const dealType = 'retail';
      
      return {
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
        deal_type: dealType,
        upload_history_id: uploadHistoryId,
        // Profit change tracking: set original values only for new deals
        original_gross_profit: isNewDeal ? deal.grossProfit : existingDeal.original_gross_profit,
        original_fi_profit: isNewDeal ? deal.fiProfit : existingDeal.original_fi_profit,
        original_total_profit: isNewDeal ? deal.totalProfit : existingDeal.original_total_profit,
        first_reported_date: isNewDeal ? uploadDate : existingDeal.first_reported_date
      };
    });

    const { data: insertedDeals, error: dealsError } = await supabase
      .from('deals')
      .upsert(dealsToInsert, { 
        onConflict: 'stock_number,upload_date',
        ignoreDuplicates: false 
      })
      .select();

    if (dealsError) {
      console.error('Error inserting deals:', dealsError);
      throw dealsError;
    }

    console.log(`Processed ${insertedDeals?.length} deals`);

    // Upsert profit snapshot using the expanded function
    const { data: snapshotId, error: snapshotError } = await supabase
      .rpc('upsert_expanded_profit_snapshot', {
        p_date: uploadDate,
        p_retail_units: summary.retailUnits,
        p_retail_gross: summary.retailGross,
        p_dealer_trade_units: summary.dealerTradeUnits,
        p_dealer_trade_gross: summary.dealerTradeGross,
        p_wholesale_units: summary.wholesaleUnits,
        p_wholesale_gross: summary.wholesaleGross,
        p_new_units: summary.newUnits,
        p_new_gross: summary.newGross,
        p_used_units: summary.usedUnits,
        p_used_gross: summary.usedGross,
        p_total_units: summary.totalUnits,
        p_total_sales: summary.totalSales,
        p_total_gross: summary.totalGross,
        p_total_fi_profit: summary.totalFiProfit,
        p_total_profit: summary.totalProfit,
        p_upload_history_id: uploadHistoryId,
        p_pack_adjustment_used: 0
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

export const getMonthlyRetailSummary = async (packAdjustment: number = 0) => {
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
    const baseData = data || {
      new_units_mtd: 0,
      new_gross_mtd: 0,
      used_units_mtd: 0,
      used_gross_mtd: 0,
      total_units_mtd: 0,
      total_profit_mtd: 0
    };

    // Apply pack adjustment to used gross (ADDING, not subtracting)
    const packAdjustmentTotal = packAdjustment * (baseData.used_units_mtd || 0);
    const adjustedUsedGross = (baseData.used_gross_mtd || 0) + packAdjustmentTotal;
    const adjustedTotalProfit = (baseData.total_profit_mtd || 0) + packAdjustmentTotal;

    return {
      ...baseData,
      used_gross_mtd: adjustedUsedGross,
      total_profit_mtd: adjustedTotalProfit
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

export const updateDealType = async (dealId: string, dealType: 'retail' | 'dealer_trade' | 'wholesale') => {
  const { error } = await supabase
    .from('deals')
    .update({ deal_type: dealType })
    .eq('id', dealId);

  if (error) {
    console.error('Error updating deal type:', error);
    throw error;
  }
};

export const getDeals = async (limit: number = 100, offset: number = 0) => {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .order('upload_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching deals:', error);
    throw error;
  }

  return data || [];
};

export const getDealsByType = async (dealType: 'retail' | 'dealer_trade' | 'wholesale') => {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('deal_type', dealType)
    .order('upload_date', { ascending: false });

  if (error) {
    console.error('Error fetching deals by type:', error);
    throw error;
  }

  return data || [];
};
