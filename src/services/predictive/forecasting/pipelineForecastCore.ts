
import { supabase } from '@/integrations/supabase/client';

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

const isValidConfidenceLevel = (level: string): level is 'low' | 'medium' | 'high' => {
  return ['low', 'medium', 'high'].includes(level);
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
