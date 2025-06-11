
export interface Deal {
  id: string;
  upload_date: string;
  stock_number?: string;
  year_model?: string;
  buyer_name?: string;
  gross_profit?: number;
  fi_profit?: number;
  total_profit?: number;
  deal_type?: string;
  original_gross_profit?: number;
  original_fi_profit?: number;
  original_total_profit?: number;
  first_reported_date?: string;
}

export interface DealManagementProps {
  user: {
    id: string;
    role: string;
  };
  packAdjustment?: number;
}

export interface SummaryTotals {
  newRetail: { units: number; gross: number; fi: number; total: number };
  usedRetail: { units: number; gross: number; fi: number; total: number };
  totalRetail: { units: number; gross: number; fi: number; total: number };
  dealerTrade: { units: number; gross: number; fi: number; total: number };
  wholesale: { units: number; gross: number; fi: number; total: number };
}
