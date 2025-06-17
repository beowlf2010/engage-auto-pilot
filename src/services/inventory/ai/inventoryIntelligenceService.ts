
import { supabase } from '@/integrations/supabase/client';

export interface VehicleIntelligence {
  id: string;
  hotnessScore: number;
  predictedDaysToSell: number;
  priceRecommendation: 'increase' | 'decrease' | 'maintain';
  marketPosition: 'hot' | 'warm' | 'cold';
  actionRecommendations: string[];
  competitiveAnalysis: {
    avgMarketPrice: number;
    pricePosition: 'below' | 'at' | 'above';
    marketDemand: 'high' | 'medium' | 'low';
  };
  riskFactors: string[];
}

export interface InventoryInsight {
  type: 'opportunity' | 'warning' | 'trend';
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  affectedVehicles: number;
  actionRequired: boolean;
}

// Calculate AI-powered vehicle hotness score
export const calculateVehicleHotness = async (vehicleId: string): Promise<VehicleIntelligence | null> => {
  try {
    const { data: vehicle } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', vehicleId)
      .eq('status', 'available')
      .single();

    if (!vehicle) return null;

    // Get lead interests for this vehicle
    const { data: interests } = await supabase
      .from('lead_inventory_interests')
      .select('*')
      .eq('inventory_id', vehicleId);

    // Get similar vehicles for comparison
    const { data: similarVehicles } = await supabase
      .from('inventory')
      .select('*')
      .eq('make', vehicle.make)
      .eq('model', vehicle.model)
      .eq('year', vehicle.year)
      .eq('status', 'available');

    // Use AI to analyze vehicle intelligence
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('analyze-conversation', {
      body: {
        action: 'vehicle_intelligence_analysis',
        vehicle,
        leadInterests: interests || [],
        similarVehicles: similarVehicles || [],
        marketData: {
          daysInInventory: vehicle.days_in_inventory,
          price: vehicle.price,
          avgMarketPrice: similarVehicles?.reduce((sum, v) => sum + (v.price || 0), 0) / (similarVehicles?.length || 1),
          totalSimilarVehicles: similarVehicles?.length || 0
        }
      }
    });

    if (aiError || !aiResponse?.vehicleIntelligence) {
      // Fallback to basic scoring
      return calculateBasicHotnessScore(vehicle, interests || [], similarVehicles || []);
    }

    return aiResponse.vehicleIntelligence;
  } catch (error) {
    console.error('Error calculating vehicle hotness:', error);
    return null;
  }
};

// Fallback basic scoring when AI is unavailable
const calculateBasicHotnessScore = (vehicle: any, interests: any[], similarVehicles: any[]): VehicleIntelligence => {
  let hotnessScore = 50; // Base score
  
  // Age factor
  const daysInInventory = vehicle.days_in_inventory || 0;
  if (daysInInventory < 30) hotnessScore += 20;
  else if (daysInInventory < 60) hotnessScore += 10;
  else if (daysInInventory > 90) hotnessScore -= 30;
  
  // Interest factor
  const interestCount = interests.length;
  hotnessScore += Math.min(interestCount * 5, 25);
  
  // Price competitiveness
  const avgPrice = similarVehicles.reduce((sum, v) => sum + (v.price || 0), 0) / (similarVehicles.length || 1);
  const priceRatio = (vehicle.price || 0) / avgPrice;
  if (priceRatio < 0.95) hotnessScore += 15; // Below market
  else if (priceRatio > 1.05) hotnessScore -= 15; // Above market
  
  // Clamp score between 0-100
  hotnessScore = Math.max(0, Math.min(100, hotnessScore));
  
  const predictedDaysToSell = Math.max(1, 120 - hotnessScore);
  
  return {
    id: vehicle.id,
    hotnessScore,
    predictedDaysToSell,
    priceRecommendation: priceRatio > 1.05 ? 'decrease' : priceRatio < 0.95 ? 'increase' : 'maintain',
    marketPosition: hotnessScore > 70 ? 'hot' : hotnessScore > 40 ? 'warm' : 'cold',
    actionRecommendations: generateActionRecommendations(hotnessScore, daysInInventory, priceRatio),
    competitiveAnalysis: {
      avgMarketPrice: avgPrice,
      pricePosition: priceRatio > 1.05 ? 'above' : priceRatio < 0.95 ? 'below' : 'at',
      marketDemand: hotnessScore > 60 ? 'high' : hotnessScore > 30 ? 'medium' : 'low'
    },
    riskFactors: generateRiskFactors(daysInInventory, priceRatio, hotnessScore)
  };
};

const generateActionRecommendations = (hotnessScore: number, daysInInventory: number, priceRatio: number): string[] => {
  const recommendations: string[] = [];
  
  if (hotnessScore < 30) {
    recommendations.push('Consider price reduction');
    recommendations.push('Enhanced marketing placement');
  }
  
  if (daysInInventory > 60) {
    recommendations.push('Move to prime lot location');
    recommendations.push('Consider dealer trade or wholesale');
  }
  
  if (priceRatio > 1.1) {
    recommendations.push('Price is significantly above market');
  }
  
  if (hotnessScore > 80) {
    recommendations.push('High demand - consider price increase');
    recommendations.push('Perfect for showroom display');
  }
  
  return recommendations;
};

const generateRiskFactors = (daysInInventory: number, priceRatio: number, hotnessScore: number): string[] => {
  const risks: string[] = [];
  
  if (daysInInventory > 90) risks.push('Aged inventory risk');
  if (priceRatio > 1.15) risks.push('Overpriced vs market');
  if (hotnessScore < 20) risks.push('Low market demand');
  
  return risks;
};

// Generate inventory insights for dashboard
export const generateInventoryInsights = async (): Promise<InventoryInsight[]> => {
  try {
    const insights: InventoryInsight[] = [];
    
    // Get aged inventory
    const { data: agedInventory } = await supabase
      .from('inventory')
      .select('*')
      .eq('status', 'available')
      .gt('days_in_inventory', 90);
    
    if (agedInventory && agedInventory.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Aged Inventory Alert',
        description: `${agedInventory.length} vehicles have been in inventory for over 90 days`,
        urgency: 'high',
        affectedVehicles: agedInventory.length,
        actionRequired: true
      });
    }
    
    // Get high-interest vehicles
    const { data: highInterestVehicles } = await supabase
      .from('inventory')
      .select(`
        *,
        lead_inventory_interests(count)
      `)
      .eq('status', 'available')
      .gte('days_in_inventory', 1);
    
    const hotVehicles = highInterestVehicles?.filter(v => 
      v.lead_inventory_interests && v.lead_inventory_interests.length > 3
    ) || [];
    
    if (hotVehicles.length > 0) {
      insights.push({
        type: 'opportunity',
        title: 'High Demand Vehicles',
        description: `${hotVehicles.length} vehicles showing high customer interest`,
        urgency: 'medium',
        affectedVehicles: hotVehicles.length,
        actionRequired: false
      });
    }
    
    // Market trend analysis
    const { data: recentSales } = await supabase
      .from('inventory')
      .select('make, model, days_in_inventory')
      .eq('status', 'sold')
      .gte('sold_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    if (recentSales && recentSales.length > 0) {
      const avgDaysToSell = recentSales.reduce((sum, v) => sum + (v.days_in_inventory || 0), 0) / recentSales.length;
      
      insights.push({
        type: 'trend',
        title: 'Market Velocity Trend',
        description: `Average time to sell: ${Math.round(avgDaysToSell)} days (last 30 days)`,
        urgency: 'low',
        affectedVehicles: recentSales.length,
        actionRequired: false
      });
    }
    
    return insights;
  } catch (error) {
    console.error('Error generating inventory insights:', error);
    return [];
  }
};

// Batch calculate hotness scores for multiple vehicles
export const batchCalculateHotness = async (vehicleIds: string[]): Promise<Record<string, VehicleIntelligence>> => {
  const results: Record<string, VehicleIntelligence> = {};
  
  // Process in batches of 10 to avoid overwhelming the system
  const batchSize = 10;
  for (let i = 0; i < vehicleIds.length; i += batchSize) {
    const batch = vehicleIds.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(id => calculateVehicleHotness(id))
    );
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        results[batch[index]] = result.value;
      }
    });
  }
  
  return results;
};
