

export interface DealRecord {
  age?: number;
  stockNumber?: string;
  yearModel?: string;
  buyerName?: string;
  saleAmount?: number;
  costAmount?: number;
  grossProfit?: number;
  fiProfit?: number;
  totalProfit?: number;
  dealType?: 'retail' | 'dealer_trade' | 'wholesale';
  vin?: string;
  vehicle?: string;
  tradeValue?: number;
  saleDate?: string | null; // Allow null to track parsing failures
}

export interface FinancialSummary {
  totalUnits: number;
  totalSales: number;
  totalGross: number;
  totalFiProfit: number;
  totalProfit: number;
  newUnits: number;
  newGross: number;
  usedUnits: number;
  usedGross: number;
  retailUnits: number;
  retailGross: number;
  dealerTradeUnits: number;
  dealerTradeGross: number;
  wholesaleUnits: number;
  wholesaleGross: number;
}

export interface DmsColumns {
  date?: string;
  age?: string;
  stockNumber?: string;
  vin6?: string;
  vehicle?: string;
  trade?: string;
  slp?: string; // SLP instead of Sale
  customer?: string;
  gross?: string;
  fi?: string;
  total?: string;
}

