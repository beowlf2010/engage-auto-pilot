
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface SalesForecast {
  id: string;
  forecastDate: string;
  forecastPeriod: 'weekly' | 'monthly' | 'quarterly';
  predictedUnits: number;
  predictedRevenue: number;
  confidenceScore: number;
  forecastFactors: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LeadConversionPrediction {
  id: string;
  leadId: string;
  conversionProbability: number;
  predictedCloseDate?: string;
  predictedSaleAmount?: number;
  predictionFactors: string[];
  temperatureScore: number;
  lastCalculatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineForecast {
  id: string;
  salespersonId?: string;
  forecastMonth: string;
  predictedCloses: number;
  predictedRevenue: number;
  weightedPipeline: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

const parseJsonArray = (jsonValue: Json[] | null | undefined): string[] => {
  if (!jsonValue || !Array.isArray(jsonValue)) return [];
  return jsonValue.filter((item): item is string => typeof item === 'string');
};

const isValidConfidenceLevel = (level: string): level is 'low' | 'medium' | 'high' => {
  return ['low', 'medium', 'high'].includes(level);
};

const isValidForecastPeriod = (period: string): period is 'weekly' | 'monthly' | 'quarterly' => {
  return ['weekly', 'monthly', 'quarterly'].includes(period);
};

// Generate sales forecast using historical data and AI analysis
export const generateSalesForecast = async (period: 'weekly' | 'monthly' | 'quarterly' = 'monthly'): Promise<SalesForecast | null> => {
  try {
    console.log('Generating sales forecast for period:', period);

    // Get historical sales data
    const { data: historicalData, error: historyError } = await supabase
      .from('deals')
      .select('*')
      .gte('upload_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .order('upload_date', { ascending: false });

    // Get current pipeline data
    const { data: pipelineData, error: pipelineError } = await supabase
      .from('leads')
      .select('*')
      .in('status', ['qualified', 'contacted', 'negotiating']);

    if (historyError || pipelineError) {
      console.error('Error fetching data for forecast:', historyError || pipelineError);
      return null;
    }

    // Use AI to analyze patterns and generate forecast
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('analyze-conversation', {
      body: {
        action: 'sales_forecast',
        period,
        historicalData: historicalData || [],
        pipelineData: pipelineData || []
      }
    });

    if (aiError || !aiResponse?.forecast) {
      console.error('Error generating AI forecast:', aiError);
      return null;
    }

    const { predictedUnits, predictedRevenue, confidenceScore, factors } = aiResponse.forecast;

    // Store forecast in database
    const { data: forecastData, error: forecastError } = await supabase
      .from('sales_forecasts')
      .insert({
        forecast_date: new Date().toISOString().split('T')[0],
        forecast_period: period,
        predicted_units: predictedUnits,
        predicted_revenue: predictedRevenue,
        confidence_score: confidenceScore,
        forecast_factors: factors || []
      })
      .select()
      .single();

    if (forecastError) {
      console.error('Error storing forecast:', forecastError);
      return null;
    }

    return {
      id: forecastData.id,
      forecastDate: forecastData.forecast_date,
      forecastPeriod: isValidForecastPeriod(forecastData.forecast_period) ? forecastData.forecast_period : 'monthly',
      predictedUnits: forecastData.predicted_units,
      predictedRevenue: forecastData.predicted_revenue,
      confidenceScore: forecastData.confidence_score,
      forecastFactors: parseJsonArray(forecastData.forecast_factors as Json[]),
      createdAt: forecastData.created_at,
      updatedAt: forecastData.updated_at
    };
  } catch (error) {
    console.error('Error in generateSalesForecast:', error);
    return null;
  }
};

// Calculate lead conversion predictions
export const calculateLeadConversionPredictions = async (leadIds?: string[]): Promise<LeadConversionPrediction[]> => {
  try {
    let query = supabase.from('leads').select('*');
    
    if (leadIds && leadIds.length > 0) {
      query = query.in('id', leadIds);
    } else {
      query = query.in('status', ['new', 'contacted', 'qualified', 'negotiating']);
    }

    const { data: leads, error: leadsError } = await query;

    if (leadsError || !leads) {
      console.error('Error fetching leads:', leadsError);
      return [];
    }

    const predictions: LeadConversionPrediction[] = [];

    for (const lead of leads) {
      // Calculate temperature score using database function
      const { data: temperatureData } = await supabase.rpc('calculate_lead_temperature', {
        p_lead_id: lead.id
      });

      const temperatureScore = temperatureData || 0;

      // Get conversation data for AI analysis
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', lead.id)
        .order('sent_at', { ascending: false })
        .limit(20);

      // Use AI to predict conversion probability
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('analyze-conversation', {
        body: {
          action: 'conversion_prediction',
          lead,
          conversations: conversations || [],
          temperatureScore
        }
      });

      if (!aiError && aiResponse?.prediction) {
        const { conversionProbability, predictedCloseDate, predictedSaleAmount, factors } = aiResponse.prediction;

        // Store prediction in database
        const { data: predictionData, error: predictionError } = await supabase
          .from('lead_conversion_predictions')
          .upsert({
            lead_id: lead.id,
            conversion_probability: conversionProbability,
            predicted_close_date: predictedCloseDate,
            predicted_sale_amount: predictedSaleAmount,
            prediction_factors: factors || [],
            temperature_score: temperatureScore,
            last_calculated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (!predictionError && predictionData) {
          predictions.push({
            id: predictionData.id,
            leadId: predictionData.lead_id,
            conversionProbability: predictionData.conversion_probability,
            predictedCloseDate: predictionData.predicted_close_date,
            predictedSaleAmount: predictionData.predicted_sale_amount,
            predictionFactors: parseJsonArray(predictionData.prediction_factors as Json[]),
            temperatureScore: predictionData.temperature_score,
            lastCalculatedAt: predictionData.last_calculated_at,
            createdAt: predictionData.created_at,
            updatedAt: predictionData.updated_at
          });
        }

        // Update lead with prediction data
        await supabase
          .from('leads')
          .update({
            conversion_probability: conversionProbability,
            temperature_score: temperatureScore,
            predicted_close_date: predictedCloseDate,
            last_prediction_update: new Date().toISOString()
          })
          .eq('id', lead.id);
      }
    }

    return predictions;
  } catch (error) {
    console.error('Error calculating lead conversion predictions:', error);
    return [];
  }
};

// Generate pipeline forecast for salesperson
export const generatePipelineForecast = async (salespersonId?: string): Promise<PipelineForecast[]> => {
  try {
    // Get lead data for the salesperson or all leads
    let query = supabase
      .from('leads')
      .select('*')
      .in('status', ['qualified', 'contacted', 'negotiating']);

    if (salespersonId) {
      query = query.eq('salesperson_id', salespersonId);
    }

    const { data: leads, error: leadsError } = await query;

    if (leadsError || !leads) {
      console.error('Error fetching leads for pipeline forecast:', leadsError);
      return [];
    }

    // Get existing predictions
    const { data: predictions } = await supabase
      .from('lead_conversion_predictions')
      .select('*')
      .in('lead_id', leads.map(l => l.id));

    // Group by salesperson and calculate forecasts
    const salespeople = salespersonId ? [salespersonId] : [...new Set(leads.map(l => l.salesperson_id).filter(Boolean))];
    const forecasts: PipelineForecast[] = [];

    for (const spId of salespeople) {
      const spLeads = leads.filter(l => l.salesperson_id === spId);
      const spPredictions = predictions?.filter(p => spLeads.some(l => l.id === p.lead_id)) || [];

      const totalWeightedPipeline = spPredictions.reduce((sum, p) => 
        sum + (p.conversion_probability * (p.predicted_sale_amount || 0)), 0
      );

      const predictedCloses = spPredictions.filter(p => p.conversion_probability > 0.5).length;
      const predictedRevenue = spPredictions
        .filter(p => p.conversion_probability > 0.5)
        .reduce((sum, p) => sum + (p.predicted_sale_amount || 0), 0);

      const confidenceLevel = spPredictions.length > 5 ? 'high' : spPredictions.length > 2 ? 'medium' : 'low';

      const { data: forecastData, error: forecastError } = await supabase
        .from('pipeline_forecasts')
        .upsert({
          salesperson_id: spId || null,
          forecast_month: new Date().toISOString().split('T')[0],
          predicted_closes: predictedCloses,
          predicted_revenue: predictedRevenue,
          weighted_pipeline: totalWeightedPipeline,
          confidence_level: confidenceLevel
        })
        .select()
        .single();

      if (!forecastError && forecastData) {
        forecasts.push({
          id: forecastData.id,
          salespersonId: forecastData.salesperson_id,
          forecastMonth: forecastData.forecast_month,
          predictedCloses: forecastData.predicted_closes,
          predictedRevenue: forecastData.predicted_revenue,
          weightedPipeline: forecastData.weighted_pipeline,
          confidenceLevel: isValidConfidenceLevel(forecastData.confidence_level) ? forecastData.confidence_level : 'medium',
          createdAt: forecastData.created_at,
          updatedAt: forecastData.updated_at
        });
      }
    }

    return forecasts;
  } catch (error) {
    console.error('Error generating pipeline forecast:', error);
    return [];
  }
};

// Get sales forecasts
export const getSalesForecasts = async (period?: 'weekly' | 'monthly' | 'quarterly'): Promise<SalesForecast[]> => {
  try {
    let query = supabase
      .from('sales_forecasts')
      .select('*')
      .order('forecast_date', { ascending: false })
      .limit(20);

    if (period) {
      query = query.eq('forecast_period', period);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map(item => ({
      id: item.id,
      forecastDate: item.forecast_date,
      forecastPeriod: isValidForecastPeriod(item.forecast_period) ? item.forecast_period : 'monthly',
      predictedUnits: item.predicted_units,
      predictedRevenue: item.predicted_revenue,
      confidenceScore: item.confidence_score,
      forecastFactors: parseJsonArray(item.forecast_factors as Json[]),
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  } catch (error) {
    console.error('Error getting sales forecasts:', error);
    return [];
  }
};

// Get lead conversion predictions
export const getLeadConversionPredictions = async (leadId?: string): Promise<LeadConversionPrediction[]> => {
  try {
    let query = supabase
      .from('lead_conversion_predictions')
      .select('*')
      .order('conversion_probability', { ascending: false });

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map(item => ({
      id: item.id,
      leadId: item.lead_id,
      conversionProbability: item.conversion_probability,
      predictedCloseDate: item.predicted_close_date,
      predictedSaleAmount: item.predicted_sale_amount,
      predictionFactors: parseJsonArray(item.prediction_factors as Json[]),
      temperatureScore: item.temperature_score,
      lastCalculatedAt: item.last_calculated_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  } catch (error) {
    console.error('Error getting lead conversion predictions:', error);
    return [];
  }
};
