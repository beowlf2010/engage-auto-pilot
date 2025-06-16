
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

const parseJsonArray = (jsonValue: Json[] | null | undefined): string[] => {
  if (!jsonValue || !Array.isArray(jsonValue)) return [];
  return jsonValue.filter((item): item is string => typeof item === 'string');
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
