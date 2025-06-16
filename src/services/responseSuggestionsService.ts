
import { supabase } from '@/integrations/supabase/client';

export interface ResponseSuggestion {
  id: string;
  leadId: string;
  suggestionText: string;
  contextType: string;
  confidenceScore: number;
  usageCount: number;
  successCount: number;
  createdAt: string;
}

// Generate response suggestions
export const generateResponseSuggestions = async (leadId: string): Promise<ResponseSuggestion[]> => {
  try {
    // Get recent messages and lead context
    const { data: messages, error: messagesError } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false })
      .limit(10);

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (messagesError || leadError || !messages || !lead) {
      console.error('Error fetching data:', messagesError || leadError);
      return [];
    }

    // Call AI service to generate suggestions
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('analyze-conversation', {
      body: {
        action: 'suggestions',
        messages: messages.map(msg => ({
          direction: msg.direction,
          body: msg.body,
          sentAt: msg.sent_at
        })),
        leadContext: {
          firstName: lead.first_name,
          vehicleInterest: lead.vehicle_interest,
          status: lead.status
        }
      }
    });

    if (aiError) {
      console.error('Error generating suggestions:', aiError);
      return [];
    }

    const suggestions = aiResponse.suggestions || [];

    // Store suggestions in database
    const suggestionPromises = suggestions.map(async (suggestion: any) => {
      const { data, error } = await supabase
        .from('response_suggestions')
        .insert({
          lead_id: leadId,
          suggestion_text: suggestion.text,
          context_type: suggestion.contextType,
          confidence_score: suggestion.confidence
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing suggestion:', error);
        return null;
      }

      return {
        id: data.id,
        leadId: data.lead_id,
        suggestionText: data.suggestion_text,
        contextType: data.context_type,
        confidenceScore: data.confidence_score,
        usageCount: data.usage_count,
        successCount: data.success_count,
        createdAt: data.created_at
      };
    });

    const results = await Promise.all(suggestionPromises);
    return results.filter(Boolean) as ResponseSuggestion[];
  } catch (error) {
    console.error('Error in generateResponseSuggestions:', error);
    return [];
  }
};
