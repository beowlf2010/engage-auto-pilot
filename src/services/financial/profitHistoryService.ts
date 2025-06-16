
import { supabase } from "@/integrations/supabase/client";

export interface ProfitHistoryRecord {
  id: string;
  deal_id: string;
  stock_number?: string;
  snapshot_date: string;
  gross_profit?: number;
  fi_profit?: number;
  total_profit?: number;
  pack_adjustment_applied: number;
  change_type: string;
  upload_history_id?: string;
  created_at: string;
}

export interface ProfitChangesSummary {
  totalDealsWithChanges: number;
  totalGrossChange: number;
  totalFiChange: number;
  totalProfitChange: number;
  changesDetected: ProfitHistoryRecord[];
}

export const getProfitChangesForPeriod = async (
  startDate: string,
  endDate: string
): Promise<ProfitHistoryRecord[]> => {
  const { data, error } = await supabase
    .from('deal_profit_history')
    .select('*')
    .gte('snapshot_date', startDate)
    .lte('snapshot_date', endDate)
    .order('snapshot_date', { ascending: false });

  if (error) {
    console.error('Error fetching profit changes:', error);
    throw error;
  }

  return data || [];
};

export const getProfitHistoryForDeal = async (
  dealId: string
): Promise<ProfitHistoryRecord[]> => {
  const { data, error } = await supabase
    .from('deal_profit_history')
    .select('*')
    .eq('deal_id', dealId)
    .order('snapshot_date', { ascending: false });

  if (error) {
    console.error('Error fetching deal profit history:', error);
    throw error;
  }

  return data || [];
};

export const createInitialProfitSnapshot = async (
  dealId: string,
  stockNumber: string,
  grossProfit: number,
  fiProfit: number,
  totalProfit: number,
  uploadHistoryId: string
) => {
  const { error } = await supabase
    .from('deal_profit_history')
    .insert({
      deal_id: dealId,
      stock_number: stockNumber,
      gross_profit: grossProfit,
      fi_profit: fiProfit,
      total_profit: totalProfit,
      change_type: 'initial',
      upload_history_id: uploadHistoryId
    });

  if (error) {
    console.error('Error creating initial profit snapshot:', error);
    throw error;
  }
};

export const calculateProfitChangesSummary = (
  history: ProfitHistoryRecord[]
): ProfitChangesSummary => {
  const changesDetected = history.filter(record => record.change_type !== 'initial');
  
  // Group by stock_number to get the latest change for each deal
  const latestChanges = new Map<string, ProfitHistoryRecord>();
  
  changesDetected.forEach(record => {
    if (record.stock_number) {
      const existing = latestChanges.get(record.stock_number);
      if (!existing || new Date(record.snapshot_date) > new Date(existing.snapshot_date)) {
        latestChanges.set(record.stock_number, record);
      }
    }
  });

  const uniqueChanges = Array.from(latestChanges.values());
  
  return {
    totalDealsWithChanges: uniqueChanges.length,
    totalGrossChange: uniqueChanges.reduce((sum, record) => sum + (record.gross_profit || 0), 0),
    totalFiChange: uniqueChanges.reduce((sum, record) => sum + (record.fi_profit || 0), 0),
    totalProfitChange: uniqueChanges.reduce((sum, record) => sum + (record.total_profit || 0), 0),
    changesDetected: uniqueChanges
  };
};
