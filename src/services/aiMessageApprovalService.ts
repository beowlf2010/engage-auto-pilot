
import { supabase } from '@/integrations/supabase/client';

export interface ApprovalQueueMessage {
  id: string;
  lead_id: string;
  message_content: string;
  message_stage: string;
  urgency_level: 'low' | 'normal' | 'high';
  auto_approved: boolean;
  approved: boolean;
  approved_by?: string;
  approved_at?: string;
  rejected: boolean;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  scheduled_send_at: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QueueMessageRequest {
  leadId: string;
  messageContent: string;
  messageStage: string;
  urgencyLevel: 'low' | 'normal' | 'high';
  scheduledSendAt: Date;
  autoApprove?: boolean;
}

// Queue a message for approval
export const queueMessageForApproval = async (request: QueueMessageRequest): Promise<ApprovalQueueMessage | null> => {
  try {
    console.log(`📝 [APPROVAL QUEUE] Queueing message for lead ${request.leadId}`);

    const { data, error } = await supabase
      .from('ai_message_approval_queue')
      .insert({
        lead_id: request.leadId,
        message_content: request.messageContent,
        message_stage: request.messageStage,
        urgency_level: request.urgencyLevel,
        auto_approved: request.autoApprove || false,
        approved: request.autoApprove || false,
        scheduled_send_at: request.scheduledSendAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [APPROVAL QUEUE] Error queueing message:', error);
      return null;
    }

    console.log(`✅ [APPROVAL QUEUE] Message queued successfully: ${data.id}`);
    return data as ApprovalQueueMessage;
  } catch (error) {
    console.error('❌ [APPROVAL QUEUE] Error in queueMessageForApproval:', error);
    return null;
  }
};

// Get pending messages for approval
export const getPendingMessages = async (): Promise<ApprovalQueueMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('ai_message_approval_queue')
      .select(`
        *,
        leads!inner(first_name, last_name, vehicle_interest)
      `)
      .eq('approved', false)
      .eq('rejected', false)
      .is('sent_at', null)
      .order('urgency_level', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ [APPROVAL QUEUE] Error fetching pending messages:', error);
      return [];
    }

    return (data || []) as ApprovalQueueMessage[];
  } catch (error) {
    console.error('❌ [APPROVAL QUEUE] Error in getPendingMessages:', error);
    return [];
  }
};

// Approve a message
export const approveMessage = async (messageId: string, userId?: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ai_message_approval_queue')
      .update({
        approved: true,
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) {
      console.error('❌ [APPROVAL QUEUE] Error approving message:', error);
      return false;
    }

    console.log(`✅ [APPROVAL QUEUE] Message approved: ${messageId}`);
    return true;
  } catch (error) {
    console.error('❌ [APPROVAL QUEUE] Error in approveMessage:', error);
    return false;
  }
};

// Reject a message
export const rejectMessage = async (messageId: string, reason: string, userId?: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ai_message_approval_queue')
      .update({
        rejected: true,
        rejected_by: userId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) {
      console.error('❌ [APPROVAL QUEUE] Error rejecting message:', error);
      return false;
    }

    console.log(`✅ [APPROVAL QUEUE] Message rejected: ${messageId}`);
    return true;
  } catch (error) {
    console.error('❌ [APPROVAL QUEUE] Error in rejectMessage:', error);
    return false;
  }
};

// Get approved messages ready to send
export const getApprovedMessagesReadyToSend = async (): Promise<ApprovalQueueMessage[]> => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('ai_message_approval_queue')
      .select('*')
      .eq('approved', true)
      .eq('rejected', false)
      .is('sent_at', null)
      .lte('scheduled_send_at', now)
      .order('urgency_level', { ascending: false })
      .order('scheduled_send_at', { ascending: true });

    if (error) {
      console.error('❌ [APPROVAL QUEUE] Error fetching approved messages:', error);
      return [];
    }

    return (data || []) as ApprovalQueueMessage[];
  } catch (error) {
    console.error('❌ [APPROVAL QUEUE] Error in getApprovedMessagesReadyToSend:', error);
    return [];
  }
};

// Mark message as sent
export const markMessageAsSent = async (messageId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ai_message_approval_queue')
      .update({
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) {
      console.error('❌ [APPROVAL QUEUE] Error marking message as sent:', error);
      return false;
    }

    console.log(`✅ [APPROVAL QUEUE] Message marked as sent: ${messageId}`);
    return true;
  } catch (error) {
    console.error('❌ [APPROVAL QUEUE] Error in markMessageAsSent:', error);
    return false;
  }
};
