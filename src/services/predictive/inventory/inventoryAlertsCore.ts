
import { supabase } from '@/integrations/supabase/client';

// Generate inventory alerts for slow-moving or high-demand vehicles
export const generateInventoryAlerts = async (): Promise<{ slowMoving: any[], highDemand: any[], priceAdjustments: any[] }> => {
  try {
    // Get predictions and inventory data
    const { data: predictions } = await supabase
      .from('inventory_demand_predictions')
      .select(`
        *,
        inventory:inventory_id (
          id, vin, make, model, year, price, days_in_inventory
        )
      `)
      .gte('last_calculated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!predictions) return { slowMoving: [], highDemand: [], priceAdjustments: [] };

    const slowMoving = predictions
      .filter(p => p.demand_score < 30 && p.inventory?.days_in_inventory > 60)
      .map(p => ({
        ...p.inventory,
        demandScore: p.demand_score,
        predictedDaysToSell: p.predicted_days_to_sell,
        recommendations: ['Consider price reduction', 'Enhanced marketing', 'Trade appraisal']
      }));

    const highDemand = predictions
      .filter(p => p.demand_score > 80)
      .map(p => ({
        ...p.inventory,
        demandScore: p.demand_score,
        predictedDaysToSell: p.predicted_days_to_sell,
        recommendations: ['Potential price increase', 'Priority placement', 'Cross-sell opportunity']
      }));

    const priceAdjustments = predictions
      .filter(p => p.price_competitiveness !== 'market')
      .map(p => ({
        ...p.inventory,
        priceCompetitiveness: p.price_competitiveness,
        recommendations: p.price_competitiveness === 'above' 
          ? ['Consider price reduction', 'Market analysis needed']
          : ['Opportunity for price increase', 'Verify condition/features']
      }));

    return { slowMoving, highDemand, priceAdjustments };
  } catch (error) {
    console.error('Error generating inventory alerts:', error);
    return { slowMoving: [], highDemand: [], priceAdjustments: [] };
  }
};
