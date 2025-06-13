
import { supabase } from '@/integrations/supabase/client';

export interface MarketTrend {
  make: string;
  model: string;
  avgPrice: number;
  priceChange: number;
  demandLevel: 'high' | 'medium' | 'low';
  daysOnMarket: number;
  competitivePosition: 'below' | 'market' | 'above';
}

// Get market trends for a specific vehicle type
export const getMarketTrends = async (make: string, model?: string): Promise<MarketTrend | null> => {
  try {
    // Get recent inventory data for trend analysis
    const { data: recentInventory } = await supabase
      .from('inventory')
      .select('make, model, price, status, days_in_inventory, created_at')
      .ilike('make', `%${make}%`)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
      .order('created_at', { ascending: false });

    if (!recentInventory || recentInventory.length === 0) return null;

    // Filter by model if specified
    let relevantVehicles = recentInventory;
    if (model) {
      relevantVehicles = recentInventory.filter(v => 
        v.model.toLowerCase().includes(model.toLowerCase())
      );
    }

    if (relevantVehicles.length === 0) return null;

    // Calculate market metrics
    const avgPrice = relevantVehicles.reduce((sum, v) => sum + (v.price || 0), 0) / relevantVehicles.length;
    const soldVehicles = relevantVehicles.filter(v => v.status === 'sold');
    const soldPercentage = soldVehicles.length / relevantVehicles.length;
    const avgDaysOnMarket = relevantVehicles
      .filter(v => v.days_in_inventory)
      .reduce((sum, v) => sum + v.days_in_inventory, 0) / relevantVehicles.length;

    // Determine demand level
    let demandLevel: 'high' | 'medium' | 'low' = 'medium';
    if (soldPercentage > 0.6 && avgDaysOnMarket < 30) demandLevel = 'high';
    else if (soldPercentage < 0.3 || avgDaysOnMarket > 60) demandLevel = 'low';

    // Calculate price trends (compare last 30 days vs previous 30 days)
    const recent30Days = relevantVehicles.filter(v => 
      new Date(v.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    const previous30Days = relevantVehicles.filter(v => {
      const date = new Date(v.created_at);
      return date <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) &&
             date > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    });

    const recentAvgPrice = recent30Days.length > 0 ? 
      recent30Days.reduce((sum, v) => sum + (v.price || 0), 0) / recent30Days.length : avgPrice;
    const previousAvgPrice = previous30Days.length > 0 ? 
      previous30Days.reduce((sum, v) => sum + (v.price || 0), 0) / previous30Days.length : avgPrice;

    const priceChange = recentAvgPrice - previousAvgPrice;

    return {
      make,
      model: model || 'All Models',
      avgPrice,
      priceChange,
      demandLevel,
      daysOnMarket: avgDaysOnMarket,
      competitivePosition: 'market' // Could be enhanced with external data
    };
  } catch (error) {
    console.error('Error getting market trends:', error);
    return null;
  }
};
