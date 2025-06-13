
import { DealRecord, FinancialSummary } from './types';

export const calculateSummaryFromDeals = (deals: DealRecord[]): FinancialSummary => {
  const summary: FinancialSummary = {
    totalUnits: deals.length,
    totalSales: 0,
    totalGross: 0,
    totalFiProfit: 0,
    totalProfit: 0,
    newUnits: 0,
    newGross: 0,
    usedUnits: 0,
    usedGross: 0,
    retailUnits: deals.length, // Default all to retail initially
    retailGross: 0,
    dealerTradeUnits: 0,
    dealerTradeGross: 0,
    wholesaleUnits: 0,
    wholesaleGross: 0
  };

  for (const deal of deals) {
    summary.totalSales += deal.saleAmount || 0;
    summary.totalGross += deal.grossProfit || 0;
    summary.totalFiProfit += deal.fiProfit || 0;
    summary.totalProfit += deal.totalProfit || 0;
    summary.retailGross += deal.grossProfit || 0; // Default all to retail

    if (deal.dealType === 'new') {
      summary.newUnits++;
      summary.newGross += deal.grossProfit || 0;
    } else {
      summary.usedUnits++;
      summary.usedGross += deal.grossProfit || 0;
    }
  }

  console.log('Calculated summary totals:', summary);
  return summary;
};
