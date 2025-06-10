
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AIMessageTemplate {
  id: string;
  name: string;
  content: string;
  stage: string;
  delayHours: number;
}

export const defaultTemplates: AIMessageTemplate[] = [
  {
    id: 'initial',
    name: 'Initial Contact',
    content: "Hi {firstName}! Thanks for your interest in the {vehicleInterest}. I'd love to help you find the perfect vehicle. When would be a good time to chat?",
    stage: 'initial',
    delayHours: 0
  },
  {
    id: 'followup1',
    name: 'Follow-up 1',
    content: "Hi {firstName}, just wanted to follow up on your interest in the {vehicleInterest}. We have some great financing options available. Would you like to schedule a test drive?",
    stage: 'followup1',
    delayHours: 48
  },
  {
    id: 'followup2',
    name: 'Follow-up 2',
    content: "Hi {firstName}, I wanted to reach out one more time about the {vehicleInterest}. We're running some special promotions this month. Are you still interested in learning more?",
    stage: 'followup2',
    delayHours: 120
  }
];

export const generateAIMessage = async (leadId: string): Promise<string | null> => {
  try {
    // Get lead information
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        *,
        conversation_memory (
          content,
          memory_type,
          confidence
        ),
        conversations (
          body,
          direction,
          sent_at
        )
      `)
      .eq('id', leadId)
      .single();

    if (leadError) throw leadError;

    // Determine the appropriate message stage
    const conversations = lead.conversations || [];
    const aiMessages = conversations.filter(c => c.direction === 'out');
    const currentStage = lead.ai_stage || 'initial';
    
    let nextStage = currentStage;
    if (currentStage === 'initial' && aiMessages.length >= 1) {
      nextStage = 'followup1';
    } else if (currentStage === 'followup1' && aiMessages.length >= 2) {
      nextStage = 'followup2';
    } else if (currentStage === 'followup2' && aiMessages.length >= 3) {
      // Max follow-ups reached
      return null;
    }

    // Get the template for this stage
    const template = defaultTemplates.find(t => t.stage === nextStage);
    if (!template) return null;

    // Personalize the message
    let message = template.content
      .replace(/{firstName}/g, lead.first_name)
      .replace(/{lastName}/g, lead.last_name)
      .replace(/{vehicleInterest}/g, lead.vehicle_interest);

    // Add memory-based personalization if available
    const preferences = lead.conversation_memory?.filter(m => m.memory_type === 'preference') || [];
    if (preferences.length > 0) {
      const highConfidencePrefs = preferences.filter(p => p.confidence > 0.8);
      if (highConfidencePrefs.length > 0) {
        message += ` I noticed you mentioned ${highConfidencePrefs[0].content}.`;
      }
    }

    // Update lead's AI stage
    await supabase
      .from('leads')
      .update({ ai_stage: nextStage })
      .eq('id', leadId);

    return message;
  } catch (error) {
    console.error('Error generating AI message:', error);
    return null;
  }
};

export const scheduleNextAIMessage = async (leadId: string): Promise<void> => {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('ai_stage')
      .eq('id', leadId)
      .single();

    if (error) throw error;

    const currentStage = lead.ai_stage || 'initial';
    let nextTemplate: AIMessageTemplate | undefined;

    if (currentStage === 'initial') {
      nextTemplate = defaultTemplates.find(t => t.stage === 'followup1');
    } else if (currentStage === 'followup1') {
      nextTemplate = defaultTemplates.find(t => t.stage === 'followup2');
    }

    if (nextTemplate) {
      const nextSendTime = new Date(Date.now() + nextTemplate.delayHours * 60 * 60 * 1000);
      
      await supabase
        .from('leads')
        .update({ next_ai_send_at: nextSendTime.toISOString() })
        .eq('id', leadId);
    } else {
      // No more follow-ups, clear the schedule
      await supabase
        .from('leads')
        .update({ next_ai_send_at: null })
        .eq('id', leadId);
    }
  } catch (error) {
    console.error('Error scheduling next AI message:', error);
  }
};
