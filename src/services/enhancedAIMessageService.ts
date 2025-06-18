import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const generateEnhancedAIMessage = async (leadId: string): Promise<string | null> => {
  try {
    console.log('🤖 Starting AI message generation for lead:', leadId);
    
    // Check if it's within business hours (9 AM - 6 PM)
    const now = new Date();
    const hour = now.getHours();
    const isBusinessHours = hour >= 9 && hour <= 18;
    
    if (!isBusinessHours) {
      console.log('⏰ Outside business hours, but proceeding with generation');
    }

    // Get lead information first
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !leadData) {
      console.error('❌ Error fetching lead data:', leadError);
      toast({
        title: "Error",
        description: "Could not fetch lead information",
        variant: "destructive"
      });
      return null;
    }

    console.log('📋 Lead data retrieved:', {
      name: `${leadData.first_name} ${leadData.last_name}`,
      vehicle: leadData.vehicle_interest,
      aiOptIn: leadData.ai_opt_in
    });

    // Call the AI generation function
    const { data, error } = await supabase.functions.invoke('generate-ai-message', {
      body: {
        leadId: leadId,
        stage: 'manual_generation',
        context: {
          trigger_type: 'manual',
          business_hours: isBusinessHours,
          timestamp: new Date().toISOString()
        }
      }
    });

    if (error) {
      console.error('❌ Edge function error:', error);
      toast({
        title: "AI Generation Failed",
        description: error.message || "Failed to generate AI message",
        variant: "destructive"
      });
      return null;
    }

    if (!data || !data.message) {
      console.error('❌ No message returned from AI function');
      toast({
        title: "No Message Generated",
        description: "AI service returned empty response",
        variant: "destructive"
      });
      return null;
    }

    console.log('✅ AI message generated successfully:', data.message.substring(0, 50) + '...');
    
    toast({
      title: "AI Message Generated",
      description: "Message is ready for review and sending",
    });

    return data.message;

  } catch (error) {
    console.error('💥 Unexpected error in AI generation:', error);
    toast({
      title: "Generation Error",
      description: error instanceof Error ? error.message : "Unexpected error occurred",
      variant: "destructive"
    });
    return null;
  }
};

export const getAIAnalyticsDashboard = async () => {
  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('ai_generated', true);

    if (error) throw error;

    const { data: responses, error: responsesError } = await supabase
      .from('conversations')
      .select('*')
      .eq('direction', 'in');

    if (responsesError) throw responsesError;

    const totalMessagesSent = conversations?.length || 0;
    const totalResponses = responses?.length || 0;
    const overallResponseRate = totalMessagesSent > 0 ? totalResponses / totalMessagesSent : 0;
    const averageMessagesPerLead = totalMessagesSent > 0 ? totalMessagesSent / new Set(conversations?.map(c => c.lead_id)).size : 0;

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

export const trackLeadResponse = async (leadId: string, responseData: any) => {
  try {
    await supabase
      .from('leads')
      .update({ 
        last_reply_at: new Date().toISOString(),
        ai_sequence_paused: true 
      })
      .eq('id', leadId);
  } catch (error) {
    console.error('Error tracking lead response:', error);
  }
};

export const scheduleEnhancedAIMessages = async (leadId?: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-automation', {
      body: leadId ? { leadId } : {}
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error scheduling AI messages:', error);
    return null;
  }
};

export const resumePausedSequences = async () => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .update({ ai_sequence_paused: false })
      .eq('ai_sequence_paused', true)
      .lt('ai_resume_at', new Date().toISOString());
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error resuming paused sequences:', error);
    return null;
  }
};
