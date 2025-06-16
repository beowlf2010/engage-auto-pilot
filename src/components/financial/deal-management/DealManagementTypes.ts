
export interface Deal {
  id: string;
  stock_number?: string;
  buyer_name?: string;
  year_model?: string;
  deal_type?: string;
  deal_type_locked?: boolean;
  sale_amount?: number;
  cost_amount?: number;
  gross_profit?: number;
  fi_profit?: number;
  total_profit?: number;
  upload_date: string;
  age?: number;
  original_gross_profit?: number;
  original_fi_profit?: number;
  original_total_profit?: number;
}

export interface DealManagementProps {
  user: {
    id: string;
    role: string;
  };
  packAdjustment?: number;
  packAdjustmentEnabled?: boolean;
  setPackAdjustmentEnabled?: (enabled: boolean) => void;
  localPackAdjustment?: number;
  setLocalPackAdjustment?: (adjustment: number) => void;
}
