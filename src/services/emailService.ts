import { supabase } from '@/integrations/supabase/client';
import { EmailTemplate, EmailCampaign, EmailConversation, EmailSettings, SendEmailRequest } from '@/types/email';

class EmailService {
  // Email Templates
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return (data || []) as EmailTemplate[];
  }

  async createEmailTemplate(template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<EmailTemplate> {
    const { data, error } = await supabase
      .from('email_templates')
      .insert(template)
      .select()
      .single();
    
    if (error) throw error;
    return data as EmailTemplate;
  }

  async updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const { data, error } = await supabase
      .from('email_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as EmailTemplate;
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('email_templates')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw error;
  }

  // Email Campaigns
  async getEmailCampaigns(): Promise<EmailCampaign[]> {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as EmailCampaign[];
  }

  async createEmailCampaign(campaign: Omit<EmailCampaign, 'id' | 'created_at' | 'updated_at' | 'total_recipients' | 'total_sent' | 'total_delivered' | 'total_opened' | 'total_clicked' | 'total_bounced'>): Promise<EmailCampaign> {
    const { data, error } = await supabase
      .from('email_campaigns')
      .insert(campaign)
      .select()
      .single();
    
    if (error) throw error;
    return data as EmailCampaign;
  }

  // Email Conversations
  async getEmailConversations(leadId: string): Promise<EmailConversation[]> {
    const { data, error } = await supabase
      .from('email_conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as EmailConversation[];
  }

  async createEmailConversation(conversation: Omit<EmailConversation, 'id' | 'created_at'>): Promise<EmailConversation> {
    const { data, error } = await supabase
      .from('email_conversations')
      .insert(conversation)
      .select()
      .single();
    
    if (error) throw error;
    return data as EmailConversation;
  }

  // Email Settings
  async getEmailSettings(): Promise<EmailSettings | null> {
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as EmailSettings | null;
  }

  async upsertEmailSettings(settings: Omit<EmailSettings, 'id' | 'created_at' | 'updated_at'>): Promise<EmailSettings> {
    const { data, error } = await supabase
      .from('email_settings')
      .upsert(settings, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) throw error;
    return data as EmailSettings;
  }

  // Send Email - enhanced to use user settings
  sendEmail = async (emailData: SendEmailRequest): Promise<{ success: boolean; messageId?: string }> => {
    try {
      // Get user email settings
      const emailSettings = await this.getEmailSettings();
      
      // Clean the email address - remove quotes if present
      const cleanEmail = emailData.to.replace(/^"|"$/g, '');
      
      // Construct the from field using user settings
      let fromAddress = emailData.from;
      if (!fromAddress && emailSettings) {
        if (emailSettings.default_from_name && emailSettings.default_from_email) {
          fromAddress = `${emailSettings.default_from_name} <${emailSettings.default_from_email}>`;
        } else if (emailSettings.default_from_email) {
          fromAddress = emailSettings.default_from_email;
        }
      }
      
      // Fallback to default if no settings configured
      if (!fromAddress) {
        fromAddress = "CRM <onboarding@resend.dev>";
      }
      
      // Add signature to HTML content if available
      let htmlContent = emailData.html;
      if (emailSettings?.signature) {
        const signatureHtml = emailSettings.signature.replace(/\n/g, '<br>');
        htmlContent += `<br><br>---<br>${signatureHtml}`;
      }
      
      const cleanedEmailData = {
        ...emailData,
        to: cleanEmail,
        from: fromAddress,
        html: htmlContent
      };

      // Send email via Resend
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: cleanedEmailData
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
        try {
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
        } catch (conversationError) {
          console.error('Error recording failed email conversation:', conversationError);
        }
      }
      
      throw error;
    }
  }

  // Template variable replacement
  replaceTemplateVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    });
    return result;
  }
}

// Export a singleton instance
export const emailService = new EmailService();
