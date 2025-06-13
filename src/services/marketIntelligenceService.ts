
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

export interface MarketInsight {
  message: string;
  urgency: 'low' | 'medium' | 'high';
  context: string;
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

// Generate market-based insights for messaging
export const generateMarketInsights = async (vehicleInterest: string): Promise<MarketInsight[]> => {
  try {
    const insights: MarketInsight[] = [];
    
    // Parse vehicle interest
    const words = vehicleInterest.toLowerCase().split(' ');
    const potentialMakes = ['toyota', 'honda', 'ford', 'chevrolet', 'nissan', 'bmw', 'mercedes', 'audi'];
    const make = words.find(word => potentialMakes.includes(word)) || words[0];

    if (!make) return [];

    const trends = await getMarketTrends(make);
    if (!trends) return [];

    // Generate insights based on trends
    if (trends.demandLevel === 'high') {
      insights.push({
        message: `${trends.make} vehicles are in high demand right now`,
        urgency: 'high',
        context: `${Math.round((1 - trends.daysOnMarket / 60) * 100)}% faster than average sales`
      });
    }

    if (trends.priceChange > 500) {
      insights.push({
        message: `${trends.make} prices have increased recently`,
        urgency: 'medium',
        context: `Average increase of $${Math.round(trends.priceChange)} this month`
      });
    } else if (trends.priceChange < -500) {
      insights.push({
        message: `Great timing - ${trends.make} prices have dropped`,
        urgency: 'high',
        context: `Average savings of $${Math.round(Math.abs(trends.priceChange))} this month`
      });
    }

    if (trends.daysOnMarket < 20) {
      insights.push({
        message: `${trends.make} vehicles are selling quickly`,
        urgency: 'high',
        context: `Average ${Math.round(trends.daysOnMarket)} days on market`
      });
    }

    // Seasonal insights
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) { // Spring car buying season
      insights.push({
        message: "Spring is prime car buying season",
        urgency: 'medium',
        context: "Best selection and financing deals available now"
      });
    } else if (month >= 9 && month <= 10) { // Fall clearance
      insights.push({
        message: "Year-end clearance pricing in effect",
        urgency: 'high',
        context: "Dealers making room for new model year inventory"
      });
    }

    return insights.slice(0, 2); // Limit to top 2 insights
  } catch (error) {
    console.error('Error generating market insights:', error);
    return [];
  }
};

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

// Generate urgency messaging based on market conditions
export const generateUrgencyMessage = async (leadId: string): Promise<string | null> => {
  try {
    // Get lead's vehicle interest
    const { data: lead } = await supabase
      .from('leads')
      .select('vehicle_interest')
      .eq('id', leadId)
      .single();

    if (!lead?.vehicle_interest) return null;

    const insights = await generateMarketInsights(lead.vehicle_interest);
    const highUrgencyInsight = insights.find(i => i.urgency === 'high');

    if (highUrgencyInsight) {
      return `${highUrgencyInsight.message} - ${highUrgencyInsight.context}`;
    }

    // Check for inventory-specific urgency using function call
    const { data: matchingVehicles } = await supabase.rpc('find_matching_inventory', { 
      p_lead_id: leadId 
    });
    
    if (matchingVehicles && matchingVehicles.length > 0) {
      const topMatch = matchingVehicles[0];
      
      // Get vehicle details for urgency calculation
      const { data: vehicle } = await supabase
        .from('inventory')
        .select('created_at, days_in_inventory')
        .eq('id', topMatch.inventory_id)
        .single();

      if (vehicle && vehicle.days_in_inventory > 45) {
        return `The ${topMatch.year} ${topMatch.make} ${topMatch.model} has been here ${vehicle.days_in_inventory} days - great opportunity!`;
      }
    }

    return null;
  } catch (error) {
    console.error('Error generating urgency message:', error);
    return null;
  }
};

// Get seasonal campaign messages
export const getSeasonalMessage = (): string | null => {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();

  // Holiday and seasonal messaging
  if (month === 11 && day >= 20) { // Late December
    return "Year-end pricing won't last long";
  } else if (month === 0) { // January
    return "New year, new car? Start fresh with great deals";
  } else if (month === 2 || month === 3) { // March-April (Spring)
    return "Spring into a new vehicle with fresh inventory";
  } else if (month === 4 && day >= 15) { // Mid-May (graduation season)
    return "Graduation season specials available";
  } else if (month >= 5 && month <= 7) { // Summer
    return "Perfect weather for test drives";
  } else if (month === 8 || month === 9) { // Fall
    return "Fall into savings before winter arrives";
  } else if (month === 10) { // November (Black Friday season)
    return "Black Friday deals extended to our lot";
  }

  return null;
};
