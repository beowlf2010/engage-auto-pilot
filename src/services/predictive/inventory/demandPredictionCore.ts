
import { supabase } from '@/integrations/supabase/client';

export interface InventoryDemandPrediction {
  id: string;
  inventoryId: string;
  demandScore: number;
  predictedDaysToSell?: number;
  seasonalFactor: number;
  marketDemandLevel: 'low' | 'medium' | 'high';
  priceCompetitiveness: 'below' | 'market' | 'above';
  predictionAccuracy: number;
  lastCalculatedAt: string;
  createdAt: string;
  updatedAt: string;
}

const isValidMarketDemandLevel = (level: string): level is 'low' | 'medium' | 'high' => {
  return ['low', 'medium', 'high'].includes(level);
};

const isValidPriceCompetitiveness = (comp: string): comp is 'below' | 'market' | 'above' => {
  return ['below', 'market', 'above'].includes(comp);
};

// Calculate inventory demand predictions
export const calculateInventoryDemandPredictions = async (inventoryIds?: string[]): Promise<InventoryDemandPrediction[]> => {
  try {
    console.log('Calculating inventory demand predictions');

    // Get inventory data
    let query = supabase
      .from('inventory')
      .select('*')
      .eq('status', 'available');

    if (inventoryIds && inventoryIds.length > 0) {
      query = query.in('id', inventoryIds);
    }

    const { data: inventory, error: inventoryError } = await query;

    if (inventoryError || !inventory) {
      console.error('Error fetching inventory:', inventoryError);
      return [];
    }

    // Update velocity tracking first
    await supabase.rpc('update_inventory_velocity_tracking');

    const predictions: InventoryDemandPrediction[] = [];

    for (const item of inventory) {
      // Get velocity data for this vehicle type
      const { data: velocityData } = await supabase
        .from('vehicle_velocity_tracking')
        .select('*')
        .eq('make', item.make)
        .eq('model', item.model)
        .eq('year', item.year)
        .maybeSingle();

      // Get lead interest data
      const { data: leadInterests } = await supabase
        .from('lead_inventory_interests')
        .select('*')
        .eq('inventory_id', item.id);

      // Use AI to analyze demand factors
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('analyze-conversation', {
        body: {
          action: 'inventory_demand_prediction',
          inventory: item,
          velocityData: velocityData || null,
          leadInterests: leadInterests || [],
          marketData: {
            avgDaysInInventory: item.days_in_inventory,
            price: item.price,
            mileage: item.mileage,
            year: item.year
          }
        }
      });

      if (!aiError && aiResponse?.demandPrediction) {
        const { 
          demandScore, 
          predictedDaysToSell, 
          seasonalFactor, 
          marketDemandLevel, 
          priceCompetitiveness,
          predictionAccuracy 
        } = aiResponse.demandPrediction;

        const validatedMarketDemand = isValidMarketDemandLevel(marketDemandLevel) ? marketDemandLevel : 'medium';
        const validatedPriceComp = isValidPriceCompetitiveness(priceCompetitiveness) ? priceCompetitiveness : 'market';

        // Store prediction in database
        const { data: predictionData, error: predictionError } = await supabase
          .from('inventory_demand_predictions')
          .upsert({
            inventory_id: item.id,
            demand_score: demandScore,
            predicted_days_to_sell: predictedDaysToSell,
            seasonal_factor: seasonalFactor,
            market_demand_level: validatedMarketDemand,
            price_competitiveness: validatedPriceComp,
            prediction_accuracy: predictionAccuracy,
            last_calculated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (!predictionError && predictionData) {
          predictions.push({
            id: predictionData.id,
            inventoryId: predictionData.inventory_id,
            demandScore: predictionData.demand_score,
            predictedDaysToSell: predictionData.predicted_days_to_sell,
            seasonalFactor: predictionData.seasonal_factor,
            marketDemandLevel: validatedMarketDemand,
            priceCompetitiveness: validatedPriceComp,
            predictionAccuracy: predictionData.prediction_accuracy,
            lastCalculatedAt: predictionData.last_calculated_at,
            createdAt: predictionData.created_at,
            updatedAt: predictionData.updated_at
          });
        }

        // Update inventory with prediction data
        await supabase
          .from('inventory')
          .update({
            demand_score: demandScore,
            predicted_sale_date: predictedDaysToSell ? 
              new Date(Date.now() + predictedDaysToSell * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
            velocity_category: demandScore > 70 ? 'fast' : demandScore > 40 ? 'normal' : 'slow',
            price_competitiveness: validatedPriceComp
          })
          .eq('id', item.id);
      }
    }

    return predictions;
  } catch (error) {
    console.error('Error calculating inventory demand predictions:', error);
    return [];
  }
};

// Get inventory demand predictions
export const getInventoryDemandPredictions = async (inventoryId?: string): Promise<InventoryDemandPrediction[]> => {
  try {
    let query = supabase
      .from('inventory_demand_predictions')
      .select('*')
      .order('demand_score', { ascending: false });

    if (inventoryId) {
      query = query.eq('inventory_id', inventoryId);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map(item => ({
      id: item.id,
      inventoryId: item.inventory_id,
      demandScore: item.demand_score,
      predictedDaysToSell: item.predicted_days_to_sell,
      seasonalFactor: item.seasonal_factor,
      marketDemandLevel: isValidMarketDemandLevel(item.market_demand_level) ? item.market_demand_level : 'medium',
      priceCompetitiveness: isValidPriceCompetitiveness(item.price_competitiveness) ? item.price_competitiveness : 'market',
      predictionAccuracy: item.prediction_accuracy,
      lastCalculatedAt: item.last_calculated_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  } catch (error) {
    console.error('Error getting inventory demand predictions:', error);
    return [];
  }
};
