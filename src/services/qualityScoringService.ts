
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface ConversationQualityScore {
  id: string;
  conversationId: string;
  leadId: string;
  salespersonId?: string;
  overallScore: number;
  responseTimeScore: number;
  sentimentProgressionScore: number;
  professionalismScore: number;
  engagementScore: number;
  closeAttemptScore: number;
  qualityFactors: string[];
  improvementAreas: string[];
  createdAt: string;
  updatedAt: string;
}

// Type guard for Json array to string array conversion
const parseJsonArray = (jsonValue: Json[] | null | undefined): string[] => {
  if (!jsonValue || !Array.isArray(jsonValue)) return [];
  return jsonValue.filter((item): item is string => typeof item === 'string');
};

// Generate quality score for a conversation
export const generateQualityScore = async (conversationId: string, leadId: string, salespersonId?: string): Promise<ConversationQualityScore | null> => {
  try {
    console.log('Generating quality score for conversation:', conversationId);

    // Get conversation messages
    const { data: messages, error: messagesError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .order('sent_at', { ascending: true });

    if (messagesError || !messages || messages.length === 0) {
      console.error('Error fetching messages for quality scoring:', messagesError);
      return null;
    }

    // Use AI to analyze conversation quality
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('analyze-conversation', {
      body: {
        action: 'quality_score',
        messages: messages.map(msg => ({
          direction: msg.direction,
          body: msg.body,
          sentAt: msg.sent_at
        })),
        conversationId,
        leadId,
        salespersonId
      }
    });

    if (aiError || !aiResponse?.qualityScore) {
      console.error('Error generating quality score:', aiError);
      return null;
    }

    const {
      overallScore,
      responseTimeScore,
      sentimentProgressionScore,
      professionalismScore,
      engagementScore,
      closeAttemptScore,
      qualityFactors,
      improvementAreas
    } = aiResponse.qualityScore;

    // Store quality score in database
    const { data: qualityData, error: qualityError } = await supabase
      .from('conversation_quality_scores')
      .insert({
        conversation_id: conversationId,
        lead_id: leadId,
        salesperson_id: salespersonId,
        overall_score: overallScore,
        response_time_score: responseTimeScore,
        sentiment_progression_score: sentimentProgressionScore,
        professionalism_score: professionalismScore,
        engagement_score: engagementScore,
        close_attempt_score: closeAttemptScore,
        quality_factors: qualityFactors || [],
        improvement_areas: improvementAreas || []
      })
      .select()
      .single();

    if (qualityError) {
      console.error('Error storing quality score:', qualityError);
      return null;
    }

    return {
      id: qualityData.id,
      conversationId: qualityData.conversation_id,
      leadId: qualityData.lead_id,
      salespersonId: qualityData.salesperson_id,
      overallScore: qualityData.overall_score,
      responseTimeScore: qualityData.response_time_score,
      sentimentProgressionScore: qualityData.sentiment_progression_score,
      professionalismScore: qualityData.professionalism_score,
      engagementScore: qualityData.engagement_score,
      closeAttemptScore: qualityData.close_attempt_score,
      qualityFactors: parseJsonArray(qualityData.quality_factors as Json[]),
      improvementAreas: parseJsonArray(qualityData.improvement_areas as Json[]),
      createdAt: qualityData.created_at,
      updatedAt: qualityData.updated_at
    };
  } catch (error) {
    console.error('Error in generateQualityScore:', error);
    return null;
  }
};

// Get quality scores for a lead
export const getQualityScores = async (leadId: string): Promise<ConversationQualityScore[]> => {
  try {
    const { data, error } = await supabase
      .from('conversation_quality_scores')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(item => ({
      id: item.id,
      conversationId: item.conversation_id,
      leadId: item.lead_id,
      salespersonId: item.salesperson_id,
      overallScore: item.overall_score,
      responseTimeScore: item.response_time_score,
      sentimentProgressionScore: item.sentiment_progression_score,
      professionalismScore: item.professionalism_score,
      engagementScore: item.engagement_score,
      closeAttemptScore: item.close_attempt_score,
      qualityFactors: parseJsonArray(item.quality_factors as Json[]),
      improvementAreas: parseJsonArray(item.improvement_areas as Json[]),
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  } catch (error) {
    console.error('Error getting quality scores:', error);
    return [];
  }
};

// Get quality scores for a salesperson
export const getSalespersonQualityScores = async (salespersonId: string): Promise<ConversationQualityScore[]> => {
  try {
    const { data, error } = await supabase
      .from('conversation_quality_scores')
      .select('*')
      .eq('salesperson_id', salespersonId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(item => ({
      id: item.id,
      conversationId: item.conversation_id,
      leadId: item.lead_id,
      salespersonId: item.salesperson_id,
      overallScore: item.overall_score,
      responseTimeScore: item.response_time_score,
      sentimentProgressionScore: item.sentiment_progression_score,
      professionalismScore: item.professionalism_score,
      engagementScore: item.engagement_score,
      closeAttemptScore: item.close_attempt_score,
      qualityFactors: parseJsonArray(item.quality_factors as Json[]),
      improvementAreas: parseJsonArray(item.improvement_areas as Json[]),
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  } catch (error) {
    console.error('Error getting salesperson quality scores:', error);
    return [];
  }
};
