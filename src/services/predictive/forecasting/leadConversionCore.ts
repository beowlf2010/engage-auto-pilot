
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

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

const parseJsonArray = (jsonValue: Json[] | null | undefined): string[] => {
  if (!jsonValue || !Array.isArray(jsonValue)) return [];
  return jsonValue.filter((item): item is string => typeof item === 'string');
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
