
import { supabase } from '@/integrations/supabase/client';
import { EmailTemplate, EmailCampaign, EmailConversation, EmailSettings, SendEmailRequest } from '@/types/email';

export const emailService = {
  // Email Templates
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return (data || []) as EmailTemplate[];
  },

  async createEmailTemplate(template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<EmailTemplate> {
    const { data, error } = await supabase
      .from('email_templates')
      .insert(template)
      .select()
      .single();
    
    if (error) throw error;
    return data as EmailTemplate;
  },

  async updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const { data, error } = await supabase
      .from('email_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as EmailTemplate;
  },

  async deleteEmailTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('email_templates')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw error;
  },

  // Email Campaigns
  async getEmailCampaigns(): Promise<EmailCampaign[]> {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as EmailCampaign[];
  },

  async createEmailCampaign(campaign: Omit<EmailCampaign, 'id' | 'created_at' | 'updated_at' | 'total_recipients' | 'total_sent' | 'total_delivered' | 'total_opened' | 'total_clicked' | 'total_bounced'>): Promise<EmailCampaign> {
    const { data, error } = await supabase
      .from('email_campaigns')
      .insert(campaign)
      .select()
      .single();
    
    if (error) throw error;
    return data as EmailCampaign;
  },

  // Email Conversations
  async getEmailConversations(leadId: string): Promise<EmailConversation[]> {
    const { data, error } = await supabase
      .from('email_conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as EmailConversation[];
  },

  async createEmailConversation(conversation: Omit<EmailConversation, 'id' | 'created_at'>): Promise<EmailConversation> {
    const { data, error } = await supabase
      .from('email_conversations')
      .insert(conversation)
      .select()
      .single();
    
    if (error) throw error;
    return data as EmailConversation;
  },

  // Email Settings
  async getEmailSettings(): Promise<EmailSettings | null> {
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as EmailSettings | null;
  },

  async upsertEmailSettings(settings: Omit<EmailSettings, 'id' | 'created_at' | 'updated_at'>): Promise<EmailSettings> {
    const { data, error } = await supabase
      .from('email_settings')
      .upsert(settings, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) throw error;
    return data as EmailSettings;
  },

  // Send Email
  async sendEmail(emailData: SendEmailRequest): Promise<{ success: boolean; messageId?: string }> {
    try {
      // Send email via Resend
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: emailData
      });

      if (error) throw error;

      // Record email conversation if leadId provided
      if (emailData.leadId) {
        await this.createEmailConversation({
          lead_id: emailData.leadId,
          template_id: emailData.templateId,
          campaign_id: emailData.campaignId,
          direction: 'out',
          subject: emailData.subject,
          body: emailData.html,
          sent_at: new Date().toISOString(),
          email_status: 'sent',
          resend_message_id: data.result?.id
        });
      }

      return { success: true, messageId: data.result?.id };
    } catch (error) {
      console.error('Error sending email:', error);
      
      // Record failed email if leadId provided
      if (emailData.leadId) {
        await this.createEmailConversation({
          lead_id: emailData.leadId,
          template_id: emailData.templateId,
          campaign_id: emailData.campaignId,
          direction: 'out',
          subject: emailData.subject,
          body: emailData.html,
          sent_at: new Date().toISOString(),
          email_status: 'failed',
          email_error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      throw error;
    }
  },

  // Template variable replacement
  replaceTemplateVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    });
    return result;
  }
};
