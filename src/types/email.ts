
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
  variables: any; // Changed from string[] to any to match Json type from database
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  created_by: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  scheduled_at?: string;
  sent_at?: string;
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  created_at: string;
  updated_at: string;
}

export interface EmailConversation {
  id: string;
  lead_id: string;
  campaign_id?: string;
  template_id?: string;
  direction: 'in' | 'out';
  subject: string;
  body: string;
  sent_at: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  email_status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  email_error?: string;
  resend_message_id?: string;
  created_at: string;
  read_at?: string;
}

export interface EmailSettings {
  id: string;
  user_id: string;
  signature?: string;
  default_from_name?: string;
  default_from_email?: string;
  created_at: string;
  updated_at: string;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  leadId?: string;
  templateId?: string;
  campaignId?: string;
}
