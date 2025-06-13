
import { getMarketTrends, MarketTrend } from './marketTrendsService';

export interface MarketInsight {
  message: string;
  urgency: 'low' | 'medium' | 'high';
  context: string;
}

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
