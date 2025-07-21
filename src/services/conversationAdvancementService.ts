
import { supabase } from '@/integrations/supabase/client';
import { aiEmergencyService } from './aiEmergencyService';

interface AdvancementStrategy {
  messageType: string;
  urgency: 'low' | 'medium' | 'high';
  template: string;
  reasoning: string;
}

interface AdvancementResult {
  success: boolean;
  strategy?: AdvancementStrategy;
  error?: string;
  aiDisabled?: boolean;
}

class ConversationAdvancementService {
  private async getLeadConversationContext(leadId: string) {
    try {
      // Get lead info and recent conversations
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(10);

      return { lead, conversations };
    } catch (error) {
      console.error('❌ Error getting lead context:', error);
      return { lead: null, conversations: [] };
    }
  }

  async advanceConversation(leadId: string): Promise<AdvancementResult> {
    try {
      // Check if AI is disabled first
      const canProceed = await aiEmergencyService.checkBeforeAIAction('conversation_advancement');
      if (!canProceed) {
        return {
          success: false,
          error: 'AI system is currently disabled',
          aiDisabled: true
        };
      }

      console.log(`🚀 [CONVERSATION ADVANCEMENT] Starting advancement for lead: ${leadId}`);

      const { lead, conversations } = await this.getLeadConversationContext(leadId);

      if (!lead) {
        return {
          success: false,
          error: 'Lead not found'
        };
      }

      // Analyze conversation to determine next strategy
      const strategy = this.analyzeConversationForStrategy(lead, conversations || []);

      console.log(`📊 [CONVERSATION ADVANCEMENT] Strategy determined:`, strategy);

      return {
        success: true,
        strategy
      };
    } catch (error) {
      console.error('❌ [CONVERSATION ADVANCEMENT] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private analyzeConversationForStrategy(lead: any, conversations: any[]): AdvancementStrategy {
    const lastConversation = conversations[0];
    const timeSinceLastMessage = lastConversation 
      ? Math.floor((Date.now() - new Date(lastConversation.sent_at).getTime()) / (1000 * 60 * 60))
      : 999;

    // Simple strategy based on time and lead status
    if (timeSinceLastMessage < 6) {
      return {
        messageType: 'quick_followup',
        urgency: 'low',
        template: `Hi ${lead.first_name}! Just wanted to follow up on your interest in the ${lead.vehicle_interest}. Any questions I can help with?`,
        reasoning: 'Recent conversation, gentle follow-up'
      };
    } else if (timeSinceLastMessage < 24) {
      return {
        messageType: 'value_add',
        urgency: 'medium',
        template: `Hi ${lead.first_name}! I wanted to share some great features of the ${lead.vehicle_interest} that might interest you. Would you like to know more about financing options?`,
        reasoning: 'Day-old conversation, add value'
      };
    } else if (timeSinceLastMessage < 72) {
      return {
        messageType: 'urgency_creator',
        urgency: 'medium',
        template: `Hi ${lead.first_name}! I noticed you were interested in the ${lead.vehicle_interest}. These are popular right now - would you like to schedule a time to see it?`,
        reasoning: 'Multi-day gap, create urgency'
      };
    } else {
      return {
        messageType: 'reengagement',
        urgency: 'high',
        template: `Hi ${lead.first_name}! I wanted to check in about your ${lead.vehicle_interest} search. Are you still looking, or has your situation changed?`,
        reasoning: 'Long gap, re-engagement needed'
      };
    }
  }

  async sendAdvancementMessage(leadId: string, strategy: AdvancementStrategy): Promise<boolean> {
    try {
      // Double-check AI is still enabled
      const canProceed = await aiEmergencyService.checkBeforeAIAction('send_advancement_message');
      if (!canProceed) {
        console.log('🚫 [CONVERSATION ADVANCEMENT] AI disabled, cannot send message');
        return false;
      }

      console.log(`📤 [CONVERSATION ADVANCEMENT] Sending message for lead: ${leadId}`);

      // Get AI system profile ID
      let aiProfileId = '00000000-0000-0000-0000-000000000000';

      // Check if AI profile exists, create if needed
      const { data: aiProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', aiProfileId)
        .maybeSingle();

      if (!aiProfile) {
        console.log('🤖 [CONVERSATION ADVANCEMENT] Creating AI system profile...');
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: aiProfileId,
            email: 'ai-system@autovantage.com',
            first_name: 'AI',
            last_name: 'System',
            role: 'system'
          });

        if (profileError && !profileError.message.includes('duplicate')) {
          console.error('❌ Failed to create AI profile:', profileError);
          aiProfileId = '00000000-0000-0000-0000-000000000001'; // Fallback ID
        }
      }

      // Get lead's phone number for SMS
      const { data: phoneNumbers } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .eq('is_primary', true)
        .limit(1);

      if (!phoneNumbers || phoneNumbers.length === 0) {
        console.error('❌ [CONVERSATION ADVANCEMENT] No phone number found for lead');
        return false;
      }

      const phoneNumber = phoneNumbers[0].number;

      // Send SMS using the edge function
      const { error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneNumber,
          message: strategy.template,
          leadId: leadId,
          profileId: aiProfileId,
          isAIGenerated: true
        }
      });

      if (smsError) {
        console.error('❌ [CONVERSATION ADVANCEMENT] SMS send failed:', smsError);
        return false;
      }

      console.log('✅ [CONVERSATION ADVANCEMENT] Message sent successfully');
      return true;
    } catch (error) {
      console.error('❌ [CONVERSATION ADVANCEMENT] Error sending message:', error);
      return false;
    }
  }

  // Helper method to check if a lead needs advancement
  async checkIfLeadNeedsAdvancement(leadId: string): Promise<boolean> {
    try {
      const { conversations } = await this.getLeadConversationContext(leadId);
      
      if (!conversations || conversations.length === 0) {
        return false; // No conversations to advance
      }

      const lastMessage = conversations[0];
      const timeSinceLastMessage = Math.floor(
        (Date.now() - new Date(lastMessage.sent_at).getTime()) / (1000 * 60 * 60)
      );

      // Need advancement if last message was incoming and it's been more than 2 hours
      return lastMessage.direction === 'in' && timeSinceLastMessage >= 2;
    } catch (error) {
      console.error('❌ Error checking advancement need:', error);
      return false;
    }
  }
}

export const conversationAdvancementService = new ConversationAdvancementService();
