
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface MarketIntelligence {
  id: string;
  analysisDate: string;
  marketSegment: string;
  demandTrend: 'increasing' | 'stable' | 'decreasing';
  priceTrend: 'increasing' | 'stable' | 'decreasing';
  inventoryLevels: 'low' | 'normal' | 'high';
  competitivePressure: 'low' | 'moderate' | 'high';
  seasonalFactor: number;
  economicIndicators: Record<string, any>;
  recommendations: string[];
  dataSources: string[];
  createdAt: string;
}

export interface CompetitiveAnalysis {
  id: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear?: number;
  ourPrice?: number;
  competitorAvgPrice?: number;
  competitorCount: number;
  pricePosition: 'below' | 'market' | 'above';
  marketShareEstimate: number;
  competitiveAdvantages: string[];
  analysisDate: string;
  createdAt: string;
  updatedAt: string;
}

const parseJsonObject = (jsonValue: Json | null | undefined): Record<string, any> => {
  if (typeof jsonValue === 'object' && jsonValue !== null) return jsonValue as Record<string, any>;
  return {};
};

const parseJsonArray = (jsonValue: Json[] | null | undefined): string[] => {
  if (!jsonValue || !Array.isArray(jsonValue)) return [];
  return jsonValue.filter((item): item is string => typeof item === 'string');
};

const isValidTrend = (trend: string): trend is 'increasing' | 'stable' | 'decreasing' => {
  return ['increasing', 'stable', 'decreasing'].includes(trend);
};

const isValidLevel = (level: string): level is 'low' | 'normal' | 'high' => {
  return ['low', 'normal', 'high'].includes(level);
};

const isValidPressure = (pressure: string): pressure is 'low' | 'moderate' | 'high' => {
  return ['low', 'moderate', 'high'].includes(pressure);
};

const isValidPricePosition = (position: string): position is 'below' | 'market' | 'above' => {
  return ['below', 'market', 'above'].includes(position);
};

// Generate comprehensive market intelligence analysis
export const generateMarketIntelligence = async (marketSegment?: string): Promise<MarketIntelligence | null> => {
  try {
    console.log('Generating market intelligence for segment:', marketSegment);

    // Get current inventory data
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select('*')
      .eq('status', 'available');

    // Get recent sales data
    const { data: recentSales, error: salesError } = await supabase
      .from('deals')
      .select('*')
      .gte('upload_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    // Get lead data for demand analysis
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (inventoryError || salesError || leadsError) {
      console.error('Error fetching market data:', inventoryError || salesError || leadsError);
      return null;
    }

    // Use AI to analyze market conditions
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('analyze-conversation', {
      body: {
        action: 'market_intelligence',
        marketSegment: marketSegment || 'general',
        inventory: inventory || [],
        recentSales: recentSales || [],
        leads: leads || []
      }
    });

    if (aiError || !aiResponse?.marketAnalysis) {
      console.error('Error generating market intelligence:', aiError);
      return null;
    }

    const {
      demandTrend,
      priceTrend,
      inventoryLevels,
      competitivePressure,
      seasonalFactor,
      economicIndicators,
      recommendations,
      dataSources
    } = aiResponse.marketAnalysis;

    // Store market intelligence in database
    const { data: intelligenceData, error: intelligenceError } = await supabase
      .from('market_intelligence')
      .insert({
        analysis_date: new Date().toISOString().split('T')[0],
        market_segment: marketSegment || 'general',
        demand_trend: isValidTrend(demandTrend) ? demandTrend : 'stable',
        price_trend: isValidTrend(priceTrend) ? priceTrend : 'stable',
        inventory_levels: isValidLevel(inventoryLevels) ? inventoryLevels : 'normal',
        competitive_pressure: isValidPressure(competitivePressure) ? competitivePressure : 'moderate',
        seasonal_factor: seasonalFactor || 1.0,
        economic_indicators: economicIndicators || {},
        recommendations: recommendations || [],
        data_sources: dataSources || []
      })
      .select()
      .single();

    if (intelligenceError) {
      console.error('Error storing market intelligence:', intelligenceError);
      return null;
    }

    return {
      id: intelligenceData.id,
      analysisDate: intelligenceData.analysis_date,
      marketSegment: intelligenceData.market_segment,
      demandTrend: isValidTrend(intelligenceData.demand_trend) ? intelligenceData.demand_trend : 'stable',
      priceTrend: isValidTrend(intelligenceData.price_trend) ? intelligenceData.price_trend : 'stable',
      inventoryLevels: isValidLevel(intelligenceData.inventory_levels) ? intelligenceData.inventory_levels : 'normal',
      competitivePressure: isValidPressure(intelligenceData.competitive_pressure) ? intelligenceData.competitive_pressure : 'moderate',
      seasonalFactor: intelligenceData.seasonal_factor,
      economicIndicators: parseJsonObject(intelligenceData.economic_indicators),
      recommendations: parseJsonArray(intelligenceData.recommendations as Json[]),
      dataSources: parseJsonArray(intelligenceData.data_sources as Json[]),
      createdAt: intelligenceData.created_at
    };
  } catch (error) {
    console.error('Error in generateMarketIntelligence:', error);
    return null;
  }
};

// Perform competitive analysis for vehicles
export const performCompetitiveAnalysis = async (): Promise<CompetitiveAnalysis[]> => {
  try {
    console.log('Performing competitive analysis');

    // Get current inventory for analysis
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select('*')
      .eq('status', 'available')
      .not('price', 'is', null);

    if (inventoryError || !inventory) {
      console.error('Error fetching inventory for competitive analysis:', inventoryError);
      return [];
    }

    const analyses: CompetitiveAnalysis[] = [];

    // Group inventory by make/model/year for analysis
    const groupedInventory = inventory.reduce((acc, item) => {
      const key = `${item.make}-${item.model}-${item.year}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    for (const [key, vehicles] of Object.entries(groupedInventory)) {
      const vehicle = vehicles[0]; // Representative vehicle
      const avgPrice = vehicles.reduce((sum, v) => sum + (v.price || 0), 0) / vehicles.length;

      // Use AI to analyze competitive positioning
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('analyze-conversation', {
        body: {
          action: 'competitive_analysis',
          vehicle: {
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            avgPrice
          },
          inventoryCount: vehicles.length
        }
      });

      if (!aiError && aiResponse?.competitiveAnalysis) {
        const {
          competitorAvgPrice,
          competitorCount,
          pricePosition,
          marketShareEstimate,
          competitiveAdvantages
        } = aiResponse.competitiveAnalysis;

        const validatedPricePosition = isValidPricePosition(pricePosition) ? pricePosition : 'market';

        // Store competitive analysis
        const { data: analysisData, error: analysisError } = await supabase
          .from('competitive_analysis')
          .upsert({
            vehicle_make: vehicle.make,
            vehicle_model: vehicle.model,
            vehicle_year: vehicle.year,
            our_price: avgPrice,
            competitor_avg_price: competitorAvgPrice,
            competitor_count: competitorCount || 0,
            price_position: validatedPricePosition,
            market_share_estimate: marketShareEstimate || 0,
            competitive_advantages: competitiveAdvantages || [],
            analysis_date: new Date().toISOString().split('T')[0]
          }, {
            onConflict: 'vehicle_make,vehicle_model,vehicle_year,analysis_date'
          })
          .select()
          .single();

        if (!analysisError && analysisData) {
          analyses.push({
            id: analysisData.id,
            vehicleMake: analysisData.vehicle_make,
            vehicleModel: analysisData.vehicle_model,
            vehicleYear: analysisData.vehicle_year,
            ourPrice: analysisData.our_price,
            competitorAvgPrice: analysisData.competitor_avg_price,
            competitorCount: analysisData.competitor_count,
            pricePosition: validatedPricePosition,
            marketShareEstimate: analysisData.market_share_estimate,
            competitiveAdvantages: parseJsonArray(analysisData.competitive_advantages as Json[]),
            analysisDate: analysisData.analysis_date,
            createdAt: analysisData.created_at,
            updatedAt: analysisData.updated_at
          });
        }
      }
    }

    return analyses;
  } catch (error) {
    console.error('Error performing competitive analysis:', error);
    return [];
  }
};

// Get market intelligence data
export const getMarketIntelligence = async (segment?: string): Promise<MarketIntelligence[]> => {
  try {
    let query = supabase
      .from('market_intelligence')
      .select('*')
      .order('analysis_date', { ascending: false })
      .limit(30);

    if (segment) {
      query = query.eq('market_segment', segment);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map(item => ({
      id: item.id,
      analysisDate: item.analysis_date,
      marketSegment: item.market_segment,
      demandTrend: isValidTrend(item.demand_trend) ? item.demand_trend : 'stable',
      priceTrend: isValidTrend(item.price_trend) ? item.price_trend : 'stable',
      inventoryLevels: isValidLevel(item.inventory_levels) ? item.inventory_levels : 'normal',
      competitivePressure: isValidPressure(item.competitive_pressure) ? item.competitive_pressure : 'moderate',
      seasonalFactor: item.seasonal_factor,
      economicIndicators: parseJsonObject(item.economic_indicators),
      recommendations: parseJsonArray(item.recommendations as Json[]),
      dataSources: parseJsonArray(item.data_sources as Json[]),
      createdAt: item.created_at
    }));
  } catch (error) {
    console.error('Error getting market intelligence:', error);
    return [];
  }
};

// Get competitive analysis data
export const getCompetitiveAnalysis = async (make?: string, model?: string): Promise<CompetitiveAnalysis[]> => {
  try {
    let query = supabase
      .from('competitive_analysis')
      .select('*')
      .order('analysis_date', { ascending: false });

    if (make) {
      query = query.eq('vehicle_make', make);
    }
    if (model) {
      query = query.eq('vehicle_model', model);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map(item => ({
      id: item.id,
      vehicleMake: item.vehicle_make,
      vehicleModel: item.vehicle_model,
      vehicleYear: item.vehicle_year,
      ourPrice: item.our_price,
      competitorAvgPrice: item.competitor_avg_price,
      competitorCount: item.competitor_count,
      pricePosition: isValidPricePosition(item.price_position) ? item.price_position : 'market',
      marketShareEstimate: item.market_share_estimate,
      competitiveAdvantages: parseJsonArray(item.competitive_advantages as Json[]),
      analysisDate: item.analysis_date,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  } catch (error) {
    console.error('Error getting competitive analysis:', error);
    return [];
  }
};

// Generate market insights dashboard data
export const getMarketInsightsDashboard = async () => {
  try {
    const [intelligence, competitive, inventory] = await Promise.all([
      getMarketIntelligence(),
      getCompetitiveAnalysis(),
      supabase.from('inventory').select('*').eq('status', 'available')
    ]);

    const currentIntelligence = intelligence[0];
    const totalInventory = inventory.data?.length || 0;
    const avgPrice = inventory.data?.reduce((sum, item) => sum + (item.price || 0), 0) / totalInventory || 0;

    const competitivePositioning = competitive.reduce((acc, item) => {
      acc[item.pricePosition] = (acc[item.pricePosition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      currentTrends: {
        demandTrend: currentIntelligence?.demandTrend || 'stable',
        priceTrend: currentIntelligence?.priceTrend || 'stable',
        inventoryLevels: currentIntelligence?.inventoryLevels || 'normal',
        competitivePressure: currentIntelligence?.competitivePressure || 'moderate'
      },
      marketMetrics: {
        totalInventory,
        avgPrice,
        seasonalFactor: currentIntelligence?.seasonalFactor || 1.0
      },
      competitivePositioning,
      recommendations: currentIntelligence?.recommendations || [],
      lastUpdated: currentIntelligence?.analysisDate || new Date().toISOString().split('T')[0]
    };
  } catch (error) {
    console.error('Error getting market insights dashboard:', error);
    return null;
  }
};
