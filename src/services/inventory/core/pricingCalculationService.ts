
import { supabase } from '@/integrations/supabase/client';

export interface PricingStats {
  averagePrice: number;
  totalValue: number;
  averageDaysInStock: number;
}

export const getNewVehiclePricing = async (): Promise<PricingStats> => {
  const { data: newPricingData } = await supabase
    .from('inventory')
    .select('price, days_in_inventory')
    .eq('condition', 'new')
    .or('and(status.eq.available,or(source_report.is.null,source_report.neq.orders_all)),and(source_report.eq.orders_all,status.eq.6000),and(source_report.eq.orders_all,status.gte.5000,status.lte.5999)')
    .not('price', 'is', null);

  const validPrices = newPricingData?.filter(item => item.price && item.price > 0) || [];
  const totalValue = validPrices.reduce((sum, item) => sum + item.price, 0);
  const averagePrice = validPrices.length > 0 ? totalValue / validPrices.length : 0;

  const validDays = newPricingData?.filter(item => item.days_in_inventory !== null) || [];
  const averageDaysInStock = validDays.length > 0 
    ? validDays.reduce((sum, item) => sum + (item.days_in_inventory || 0), 0) / validDays.length 
    : 0;

  return {
    averagePrice,
    totalValue,
    averageDaysInStock: Math.round(averageDaysInStock),
  };
};

export const getUsedVehiclePricing = async (): Promise<PricingStats> => {
  const { data: usedPricingData } = await supabase
    .from('inventory')
    .select('price, days_in_inventory')
    .eq('condition', 'used')
    .eq('status', 'available')
    .not('price', 'is', null);

  const validPrices = usedPricingData?.filter(item => item.price && item.price > 0) || [];
  const totalValue = validPrices.reduce((sum, item) => sum + item.price, 0);
  const averagePrice = validPrices.length > 0 ? totalValue / validPrices.length : 0;

  const validDays = usedPricingData?.filter(item => item.days_in_inventory !== null) || [];
  const averageDaysInStock = validDays.length > 0 
    ? validDays.reduce((sum, item) => sum + (item.days_in_inventory || 0), 0) / validDays.length 
    : 0;

  return {
    averagePrice,
    totalValue,
    averageDaysInStock: Math.round(averageDaysInStock),
  };
};

export const getCombinedPricing = (newStats: PricingStats, usedStats: PricingStats): PricingStats => {
  const totalValue = newStats.totalValue + usedStats.totalValue;
  const totalCount = (newStats.totalValue > 0 ? 1 : 0) + (usedStats.totalValue > 0 ? 1 : 0);
  
  // Weighted average for price and days
  const newWeight = newStats.totalValue / totalValue || 0;
  const usedWeight = usedStats.totalValue / totalValue || 0;
  
  return {
    averagePrice: (newStats.averagePrice * newWeight) + (usedStats.averagePrice * usedWeight),
    totalValue,
    averageDaysInStock: Math.round((newStats.averageDaysInStock * newWeight) + (usedStats.averageDaysInStock * usedWeight)),
  };
};
