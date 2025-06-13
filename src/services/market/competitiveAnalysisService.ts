
import { supabase } from '@/integrations/supabase/client';

// Get competitive analysis for messaging
export const getCompetitiveContext = async (vehicleId: string): Promise<string> => {
  try {
    const { data: vehicle } = await supabase
      .from('inventory')
      .select('make, model, year, price')
      .eq('id', vehicleId)
      .single();

    if (!vehicle) return '';

    // Find similar vehicles in the market
    const { data: competitors } = await supabase
      .from('inventory')
      .select('price')
      .eq('make', vehicle.make)
      .eq('model', vehicle.model)
      .eq('year', vehicle.year)
      .eq('status', 'available')
      .neq('id', vehicleId);

    if (!competitors || competitors.length === 0) return '';

    const competitorPrices = competitors.map(c => c.price).filter(p => p > 0);
    if (competitorPrices.length === 0) return '';

    const avgCompetitorPrice = competitorPrices.reduce((sum, price) => sum + price, 0) / competitorPrices.length;
    const priceDifference = (vehicle.price || 0) - avgCompetitorPrice;

    if (priceDifference < -1000) {
      return `Priced $${Math.abs(Math.round(priceDifference)).toLocaleString()} below similar vehicles`;
    } else if (priceDifference > 1000) {
      return `Premium features justify the $${Math.round(priceDifference).toLocaleString()} difference`;
    } else {
      return `Competitively priced with similar vehicles`;
    }
  } catch (error) {
    console.error('Error getting competitive context:', error);
    return '';
  }
};
