
import { supabase } from '@/integrations/supabase/client';

// DEPRECATED: This service is being phased out in favor of the intelligent conversation AI
// It generated basic template messages but has been replaced by context-aware responses

export const generateEnhancedAIMessage = async (leadId: string): Promise<string | null> => {
  console.log('🚫 generateEnhancedAIMessage deprecated - using intelligent conversation AI instead');
  
  // Return null to prevent generic message generation
  // The centralizedAIService with intelligent conversation AI will handle responses
  return null;
};

export const scheduleEnhancedAIMessages = async (leadId: string): Promise<void> => {
  console.log('🚫 scheduleEnhancedAIMessages deprecated - using intelligent conversation AI instead');
  
  // No longer scheduling basic template messages
  // The intelligent system handles scheduling contextual responses
};

export const resumePausedSequences = async (): Promise<void> => {
  console.log('🚫 resumePausedSequences deprecated');
  // No longer managing basic sequence resumption
};

export const trackLeadResponse = async (leadId: string, responseTime: Date): Promise<void> => {
  try {
    console.log(`📊 Tracking lead response for lead ${leadId}`);
    
    // Still track responses for analytics, but don't trigger old AI logic
    await supabase
      .from('leads')
      .update({
        last_response_at: responseTime.toISOString(),
        pending_human_response: true,
        ai_sequence_paused: true,
        ai_pause_reason: 'customer_responded'
      })
      .eq('id', leadId);

    console.log(`✅ Tracked response for lead ${leadId}`);
  } catch (error) {
    console.error('Error tracking lead response:', error);
  }
};

export const getAIAnalyticsDashboard = async () => {
  try {
    // Get basic AI stats
    const { data: leads } = await supabase
      .from('leads')
      .select('ai_messages_sent, created_at')
      .eq('ai_opt_in', true);

    const { data: conversations } = await supabase
      .from('conversations')
      .select('direction, created_at')
      .eq('ai_generated', true);

    const { data: responses } = await supabase
      .from('conversations')
      .select('lead_id, direction')
      .eq('direction', 'in');

    const totalMessagesSent = conversations?.length || 0;
    const totalResponses = responses?.length || 0;
    const overallResponseRate = totalMessagesSent > 0 ? totalResponses / totalMessagesSent : 0;
    const averageMessagesPerLead = leads?.length > 0 ? 
      (leads.reduce((sum, lead) => sum + (lead.ai_messages_sent || 0), 0) / leads.length) : 0;

    return {
      totalMessagesSent,
      totalResponses,
      overallResponseRate,
      averageMessagesPerLead
    };
  } catch (error) {
    console.error('Error fetching AI analytics:', error);
    return {
      totalMessagesSent: 0,
      totalResponses: 0,
      overallResponseRate: 0,
      averageMessagesPerLead: 0
    };
  }
};
