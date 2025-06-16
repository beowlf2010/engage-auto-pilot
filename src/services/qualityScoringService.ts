
import { supabase } from '@/integrations/supabase/client';

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

// Generate quality score for a conversation
export const generateQualityScore = async (conversationId: string, leadId: string): Promise<ConversationQualityScore | null> => {
  try {
    console.log('Generating quality score for conversation:', conversationId);

    // Get all messages in the conversation
    const { data: messages, error: messagesError } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (messagesError || !messages || messages.length === 0) {
      console.error('Error fetching messages for quality scoring:', messagesError);
      return null;
    }

    // Get sentiment data for the conversation
    const { data: sentiments } = await supabase
      .from('message_sentiment')
      .select('*')
      .in('conversation_id', messages.map(m => m.id))
      .order('created_at', { ascending: true });

    // Use AI to analyze conversation quality
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('analyze-conversation', {
      body: {
        action: 'quality_score',
        messages: messages.map(msg => ({
          id: msg.id,
          direction: msg.direction,
          body: msg.body,
          sentAt: msg.sent_at
        })),
        sentiments: sentiments || []
      }
    });

    if (aiError || !aiResponse) {
      console.error('Error getting AI quality analysis:', aiError);
      return null;
    }

    // Calculate individual scores
    const responseTimeScore = calculateResponseTimeScore(messages);
    const sentimentProgressionScore = calculateSentimentProgressionScore(sentiments || []);
    const professionalismScore = aiResponse.professionalismScore || 5.0;
    const engagementScore = aiResponse.engagementScore || 5.0;
    const closeAttemptScore = aiResponse.closeAttemptScore || 5.0;

    // Calculate overall score (weighted average)
    const overallScore = (
      responseTimeScore * 0.15 +
      sentimentProgressionScore * 0.25 +
      professionalismScore * 0.25 +
      engagementScore * 0.20 +
      closeAttemptScore * 0.15
    );

    const qualityData = {
      conversation_id: conversationId,
      lead_id: leadId,
      salesperson_id: null, // Will be populated if we have salesperson assignment
      overall_score: Math.round(overallScore * 100) / 100,
      response_time_score: Math.round(responseTimeScore * 100) / 100,
      sentiment_progression_score: Math.round(sentimentProgressionScore * 100) / 100,
      professionalism_score: Math.round(professionalismScore * 100) / 100,
      engagement_score: Math.round(engagementScore * 100) / 100,
      close_attempt_score: Math.round(closeAttemptScore * 100) / 100,
      quality_factors: aiResponse.qualityFactors || [],
      improvement_areas: aiResponse.improvementAreas || []
    };

    const { data: qualityScore, error: qualityError } = await supabase
      .from('conversation_quality_scores')
      .upsert(qualityData, { onConflict: 'conversation_id' })
      .select()
      .single();

    if (qualityError) {
      console.error('Error storing quality score:', qualityError);
      return null;
    }

    return {
      id: qualityScore.id,
      conversationId: qualityScore.conversation_id,
      leadId: qualityScore.lead_id,
      salespersonId: qualityScore.salesperson_id,
      overallScore: qualityScore.overall_score,
      responseTimeScore: qualityScore.response_time_score,
      sentimentProgressionScore: qualityScore.sentiment_progression_score,
      professionalismScore: qualityScore.professionalism_score,
      engagementScore: qualityScore.engagement_score,
      closeAttemptScore: qualityScore.close_attempt_score,
      qualityFactors: Array.isArray(qualityScore.quality_factors) ? qualityScore.quality_factors : [],
      improvementAreas: Array.isArray(qualityScore.improvement_areas) ? qualityScore.improvement_areas : [],
      createdAt: qualityScore.created_at,
      updatedAt: qualityScore.updated_at
    };
  } catch (error) {
    console.error('Error generating quality score:', error);
    return null;
  }
};

// Calculate response time score based on message timing
const calculateResponseTimeScore = (messages: any[]): number => {
  if (messages.length < 2) return 5.0; // Default score for single message

  const outboundMessages = messages.filter(m => m.direction === 'out');
  const inboundMessages = messages.filter(m => m.direction === 'in');

  if (outboundMessages.length === 0 || inboundMessages.length === 0) return 5.0;

  let totalResponseTime = 0;
  let responseCount = 0;

  for (let i = 0; i < inboundMessages.length; i++) {
    const inboundMsg = inboundMessages[i];
    const nextOutbound = outboundMessages.find(out => 
      new Date(out.sent_at) > new Date(inboundMsg.sent_at)
    );

    if (nextOutbound) {
      const responseTime = new Date(nextOutbound.sent_at).getTime() - new Date(inboundMsg.sent_at).getTime();
      const responseHours = responseTime / (1000 * 60 * 60);
      totalResponseTime += responseHours;
      responseCount++;
    }
  }

  if (responseCount === 0) return 5.0;

  const avgResponseTime = totalResponseTime / responseCount;
  
  // Score based on average response time (hours)
  if (avgResponseTime <= 1) return 10.0;      // Excellent: within 1 hour
  if (avgResponseTime <= 4) return 8.0;       // Good: within 4 hours
  if (avgResponseTime <= 24) return 6.0;      // Average: within 24 hours
  if (avgResponseTime <= 48) return 4.0;      // Below average: within 48 hours
  return 2.0;                                  // Poor: over 48 hours
};

// Calculate sentiment progression score
const calculateSentimentProgressionScore = (sentiments: any[]): number => {
  if (sentiments.length < 2) return 5.0;

  const sentimentValues = sentiments.map(s => s.sentiment_score);
  const firstSentiment = sentimentValues[0];
  const lastSentiment = sentimentValues[sentimentValues.length - 1];
  
  const improvement = lastSentiment - firstSentiment;
  
  // Score based on sentiment improvement
  if (improvement >= 0.5) return 10.0;         // Excellent improvement
  if (improvement >= 0.2) return 8.0;          // Good improvement
  if (improvement >= -0.1) return 6.0;         // Stable sentiment
  if (improvement >= -0.3) return 4.0;         // Slight decline
  return 2.0;                                  // Significant decline
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
      qualityFactors: Array.isArray(item.quality_factors) ? item.quality_factors : [],
      improvementAreas: Array.isArray(item.improvement_areas) ? item.improvement_areas : [],
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  } catch (error) {
    console.error('Error getting quality scores:', error);
    return [];
  }
};
