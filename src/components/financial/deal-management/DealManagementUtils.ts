
import { Deal, SummaryTotals } from "./DealManagementTypes";

export const getVehicleType = (stockNumber?: string): 'new' | 'used' => {
  if (!stockNumber) return 'used';
  const firstChar = stockNumber.trim().toUpperCase().charAt(0);
  return firstChar === 'C' ? 'new' : 'used';
};

export const isUsedVehicle = (stockNumber?: string): boolean => {
  if (!stockNumber) return true;
  const firstChar = stockNumber.trim().toUpperCase().charAt(0);
  // Used vehicles: B prefix (used) and X prefix (trade-ins) get pack adjustment
  // New vehicles: C prefix (new) do not get pack adjustment
  return firstChar !== 'C';
};

export const hasProfitChanges = (deal: Deal) => {
  return deal.original_gross_profit !== undefined && 
         (deal.gross_profit !== deal.original_gross_profit || 
          deal.fi_profit !== deal.original_fi_profit);
};

export const getAdjustedGrossProfit = (deal: Deal, packAdjustment: number) => {
  const baseGross = deal.gross_profit || 0;
  // Only apply pack adjustment to used vehicles (B and X prefixes)
  return isUsedVehicle(deal.stock_number) ? baseGross + packAdjustment : baseGross;
};

export const filterDeals = (
  deals: Deal[], 
  searchTerm: string, 
  filterType: string, 
  showProfitChanges: boolean
) => {
  return deals.filter(deal => {
    const matchesSearch = !searchTerm || 
      deal.stock_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.year_model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === "all" || deal.deal_type === filterType;
    const matchesProfitFilter = !showProfitChanges || hasProfitChanges(deal);
    
    return matchesSearch && matchesFilter && matchesProfitFilter;
  });
};

export const calculateSummaryTotals = (filteredDeals: Deal[], packAdjustment: number): SummaryTotals => {
  console.log(`Calculating summary for ${filteredDeals.length} filtered deals with pack adjustment: ${packAdjustment}`);
  
  const totals = {
    newRetail: { units: 0, gross: 0, fi: 0, total: 0 },
    usedRetail: { units: 0, gross: 0, fi: 0, total: 0 },
    totalRetail: { units: 0, gross: 0, fi: 0, total: 0 },
    dealerTrade: { units: 0, gross: 0, fi: 0, total: 0 },
    wholesale: { units: 0, gross: 0, fi: 0, total: 0 }
  };

  filteredDeals.forEach(deal => {
    const vehicleType = getVehicleType(deal.stock_number);
    const dealType = deal.deal_type || 'retail';
    const baseGross = deal.gross_profit || 0;
    const packAdj = isUsedVehicle(deal.stock_number) ? packAdjustment : 0;
    const adjustedGross = baseGross + packAdj;
    const fiProfit = deal.fi_profit || 0;
    const totalProfit = adjustedGross + fiProfit;

    console.log(`Deal ${deal.stock_number}: type=${dealType}, vehicle=${vehicleType}, gross=${baseGross}, pack=${packAdj}, fi=${fiProfit}, total=${totalProfit}`);

    if (dealType === 'retail') {
      if (vehicleType === 'new') {
        totals.newRetail.units++;
        totals.newRetail.gross += adjustedGross;
        totals.newRetail.fi += fiProfit;
        totals.newRetail.total += totalProfit;
      } else {
        totals.usedRetail.units++;
        totals.usedRetail.gross += adjustedGross;
        totals.usedRetail.fi += fiProfit;
        totals.usedRetail.total += totalProfit;
      }
    } else if (dealType === 'dealer_trade') {
      totals.dealerTrade.units++;
      totals.dealerTrade.gross += adjustedGross;
      totals.dealerTrade.fi += fiProfit;
      totals.dealerTrade.total += totalProfit;
    } else if (dealType === 'wholesale') {
      totals.wholesale.units++;
      totals.wholesale.gross += adjustedGross;
      totals.wholesale.fi += fiProfit;
      totals.wholesale.total += totalProfit;
    }
  });

  // Calculate total retail (new + used retail combined)
  totals.totalRetail.units = totals.newRetail.units + totals.usedRetail.units;
  totals.totalRetail.gross = totals.newRetail.gross + totals.usedRetail.gross;
  totals.totalRetail.fi = totals.newRetail.fi + totals.usedRetail.fi;
  totals.totalRetail.total = totals.newRetail.total + totals.usedRetail.total;

  console.log('Summary totals calculated:', totals);
  return totals;
};

export const formatCurrency = (value?: number) => {
  if (!value && value !== 0) return "$0";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};
