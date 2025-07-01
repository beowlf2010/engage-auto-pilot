import { supabase } from '@/integrations/supabase/client';
import { emailService } from './emailService';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';

export interface EmailSequenceStage {
  stage: string;
  delay_hours: number;
  template_category: string;
  urgency_level: 'low' | 'medium' | 'high';
}

export interface FinnEmailConfig {
  leadId: string;
  emailOptIn: boolean;
  currentStage?: string;
  sequencePaused?: boolean;
  lastEmailSent?: string;
}

// Email sequence stages coordinated with SMS
const EMAIL_SEQUENCE_STAGES: EmailSequenceStage[] = [
  { stage: 'welcome_email', delay_hours: 2, template_category: 'welcome', urgency_level: 'low' },
  { stage: 'vehicle_info', delay_hours: 24, template_category: 'vehicle_showcase', urgency_level: 'medium' },
  { stage: 'financing_info', delay_hours: 48, template_category: 'financing', urgency_level: 'medium' },
  { stage: 'testimonial_social_proof', delay_hours: 96, template_category: 'testimonials', urgency_level: 'low' },
  { stage: 'urgency_follow_up', delay_hours: 168, template_category: 'urgency', urgency_level: 'high' },
  { stage: 'final_offer', delay_hours: 336, template_category: 'final_offer', urgency_level: 'high' }
];

class FinnEmailService {
  // Toggle email automation for a lead
  async toggleEmailAutomation(leadId: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          email_opt_in: enabled,
          email_sequence_stage: enabled ? 'welcome_email' : null,
          email_sequence_paused: !enabled,
          next_email_send_at: enabled ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() : null
        })
        .eq('id', leadId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error toggling email automation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Determine if email or SMS should be used for next communication
  async chooseOptimalChannel(leadId: string): Promise<'email' | 'sms' | 'both'> {
    try {
      // Get lead engagement data
      const { data: lead } = await supabase
        .from('leads')
        .select(`
          *,
          email_conversations!inner(email_status, opened_at, direction),
          conversations!inner(direction, ai_generated)
        `)
        .eq('id', leadId)
        .single();

      if (!lead) return 'sms';

      // Calculate email engagement score
      const emailConversations = lead.email_conversations || [];
      const smsConversations = lead.conversations || [];
      
      const emailOpenRate = this.calculateEmailOpenRate(emailConversations);
      const smsResponseRate = this.calculateSMSResponseRate(smsConversations);
      
      // Decision logic
      if (emailOpenRate > 50 && smsResponseRate < 20) return 'email';
      if (smsResponseRate > 30 && emailOpenRate < 20) return 'sms';
      if (emailOpenRate > 30 && smsResponseRate > 30) return 'both';
      
      // Default based on lead preferences or behavior
      const timeOfDay = new Date().getHours();
      return timeOfDay >= 9 && timeOfDay <= 17 ? 'email' : 'sms';
    } catch (error) {
      console.error('Error choosing optimal channel:', error);
      return 'sms'; // Default fallback
    }
  }

  private calculateEmailOpenRate(emails: any[]): number {
    const sentEmails = emails.filter(e => e.direction === 'out');
    const openedEmails = emails.filter(e => e.opened_at);
    return sentEmails.length > 0 ? (openedEmails.length / sentEmails.length) * 100 : 0;
  }

  private calculateSMSResponseRate(conversations: any[]): number {
    const aiMessages = conversations.filter(c => c.ai_generated && c.direction === 'out');
    const responses = conversations.filter(c => c.direction === 'in');
    return aiMessages.length > 0 ? (responses.length / aiMessages.length) * 100 : 0;
  }

  // Generate smart email subject line based on context
  async generateSmartSubjectLine(leadId: string, stage: string): Promise<string> {
    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('first_name, vehicle_interest')
        .eq('id', leadId)
        .single();

      if (!lead) return 'Following up on your inquiry';

      // Use unified AI to generate contextual subject line
      const messageContext: MessageContext = {
        leadId,
        leadName: lead.first_name || 'there',
        latestMessage: `Generate email subject for ${stage}`,
        conversationHistory: [],
        vehicleInterest: lead.vehicle_interest || ''
      };

      const aiResponse = unifiedAIResponseEngine.generateResponse(messageContext);
      
      return aiResponse?.message || this.getFallbackSubjectLine(stage, lead.first_name);
    } catch (error) {
      console.error('Error generating smart subject line:', error);
      return 'Following up on your inquiry';
    }
  }

  private getFallbackSubjectLine(stage: string, firstName: string): string {
    const subjects = {
      welcome_email: `Welcome ${firstName}! Let's find your perfect vehicle`,
      vehicle_info: `${firstName}, check out these vehicles we think you'll love`,
      financing_info: `${firstName}, get pre-approved in minutes`,
      testimonial_social_proof: `See what other customers are saying, ${firstName}`,
      urgency_follow_up: `${firstName}, don't miss out on these deals`,
      final_offer: `Last chance, ${firstName} - special offer expires soon`
    };
    return subjects[stage as keyof typeof subjects] || `Following up, ${firstName}`;
  }

  // Process email responses for sentiment and intent
  async analyzeEmailResponse(emailConversationId: string, emailBody: string): Promise<void> {
    try {
      // Extract intent and sentiment from email response
      const analysis = await this.extractEmailInsights(emailBody);
      
      // Store analysis in conversation memory
      await supabase
        .from('email_conversation_analysis')
        .upsert({
          email_conversation_id: emailConversationId,
          sentiment: analysis.sentiment,
          intent: analysis.intent,
          key_phrases: analysis.keyPhrases,
          urgency_level: analysis.urgencyLevel,
          analyzed_at: new Date().toISOString()
        });

      // Update lead based on response analysis
      if (analysis.intent.includes('scheduling') || analysis.intent.includes('appointment')) {
        await this.pauseSequenceForHumanIntervention(emailConversationId);
      }
    } catch (error) {
      console.error('Error analyzing email response:', error);
    }
  }

  private async extractEmailInsights(emailBody: string) {
    // Simple keyword-based analysis (could be enhanced with AI)
    const text = emailBody.toLowerCase();
    
    let sentiment = 'neutral';
    if (text.includes('interested') || text.includes('yes') || text.includes('perfect')) sentiment = 'positive';
    if (text.includes('not interested') || text.includes('no thanks') || text.includes('stop')) sentiment = 'negative';

    const intent = [];
    if (text.includes('schedule') || text.includes('appointment') || text.includes('visit')) intent.push('scheduling');
    if (text.includes('price') || text.includes('cost') || text.includes('payment')) intent.push('pricing');
    if (text.includes('financing') || text.includes('loan') || text.includes('credit')) intent.push('financing');

    const urgencyLevel = text.includes('urgent') || text.includes('asap') || text.includes('soon') ? 'high' : 'medium';

    return {
      sentiment,
      intent,
      keyPhrases: this.extractKeyPhrases(emailBody),
      urgencyLevel
    };
  }

  private extractKeyPhrases(text: string): string[] {
    // Simple phrase extraction
    const phrases = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('test drive')) phrases.push('test drive');
    if (lowerText.includes('trade in')) phrases.push('trade in');
    if (lowerText.includes('financing')) phrases.push('financing');
    if (lowerText.includes('warranty')) phrases.push('warranty');
    
    return phrases;
  }

  private async pauseSequenceForHumanIntervention(emailConversationId: string): Promise<void> {
    // Get lead ID from email conversation
    const { data: emailConv } = await supabase
      .from('email_conversations')
      .select('lead_id')
      .eq('id', emailConversationId)
      .single();

    if (emailConv) {
      await supabase
        .from('leads')
        .update({
          email_sequence_paused: true,
          ai_sequence_paused: true,
          ai_pause_reason: 'email_response_requires_attention'
        })
        .eq('id', emailConv.lead_id);
    }
  }

  // Schedule next email in sequence
  async scheduleNextEmail(leadId: string): Promise<void> {
    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('email_sequence_stage, email_opt_in')
        .eq('id', leadId)
        .single();

      if (!lead?.email_opt_in) return;

      const currentStage = lead.email_sequence_stage;
      const currentStageIndex = EMAIL_SEQUENCE_STAGES.findIndex(s => s.stage === currentStage);
      const nextStageIndex = currentStageIndex + 1;

      if (nextStageIndex < EMAIL_SEQUENCE_STAGES.length) {
        const nextStage = EMAIL_SEQUENCE_STAGES[nextStageIndex];
        const nextSendTime = new Date(Date.now() + nextStage.delay_hours * 60 * 60 * 1000);

        await supabase
          .from('leads')
          .update({
            email_sequence_stage: nextStage.stage,
            next_email_send_at: nextSendTime.toISOString()
          })
          .eq('id', leadId);
      }
    } catch (error) {
      console.error('Error scheduling next email:', error);
    }
  }

  // Get email automation status for a lead
  async getEmailAutomationStatus(leadId: string) {
    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('email_opt_in, email_sequence_stage, email_sequence_paused, next_email_send_at')
        .eq('id', leadId)
        .single();

      return {
        enabled: lead?.email_opt_in || false,
        currentStage: lead?.email_sequence_stage,
        paused: lead?.email_sequence_paused || false,
        nextEmailAt: lead?.next_email_send_at
      };
    } catch (error) {
      console.error('Error getting email automation status:', error);
      return { enabled: false, paused: true, currentStage: null, nextEmailAt: null };
    }
  }
}

export const finnEmailService = new FinnEmailService();
