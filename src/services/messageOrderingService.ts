
import { supabase } from '@/integrations/supabase/client';

export interface OrderedMessage {
  id: string;
  leadId: string;
  body: string;
  direction: 'in' | 'out';
  sentAt: string;
  aiGenerated: boolean;
  smsStatus?: string;
  readAt?: string;
}

export class MessageOrderingService {
  async getOrderedMessages(leadId: string): Promise<OrderedMessage[]> {
    try {
      console.log('📋 [ORDERING] Loading ordered messages for lead:', leadId);

      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id, lead_id, body, direction, sent_at, ai_generated, sms_status, read_at')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true }); // Chronological order

      if (error) {
        console.error('❌ [ORDERING] Error loading messages:', error);
        return [];
      }

      if (!conversations || conversations.length === 0) {
        console.log('📝 [ORDERING] No messages found for lead:', leadId);
        return [];
      }

      const orderedMessages: OrderedMessage[] = conversations.map(conv => ({
        id: conv.id,
        leadId: conv.lead_id,
        body: conv.body,
        direction: conv.direction as 'in' | 'out',
        sentAt: conv.sent_at,
        aiGenerated: conv.ai_generated || false,
        smsStatus: conv.sms_status,
        readAt: conv.read_at
      }));

      console.log('✅ [ORDERING] Loaded and ordered messages:', {
        count: orderedMessages.length,
        latestMessage: orderedMessages[orderedMessages.length - 1]?.body?.substring(0, 50) + '...',
        latestTime: orderedMessages[orderedMessages.length - 1]?.sentAt
      });

      return orderedMessages;

    } catch (error) {
      console.error('❌ [ORDERING] Error in message ordering:', error);
      return [];
    }
  }

  async markMessagesAsRead(leadId: string): Promise<void> {
    try {
      console.log('👁️ [ORDERING] Marking messages as read for lead:', leadId);

      const { error } = await supabase
        .from('conversations')
        .update({ read_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .eq('direction', 'in')
        .is('read_at', null);

      if (error) {
        console.error('❌ [ORDERING] Error marking messages as read:', error);
      } else {
        console.log('✅ [ORDERING] Messages marked as read');
      }
    } catch (error) {
      console.error('❌ [ORDERING] Error in mark as read:', error);
    }
  }

  // Get the latest customer message specifically
  getLatestCustomerMessage(messages: OrderedMessage[]): OrderedMessage | null {
    const customerMessages = messages.filter(m => m.direction === 'in');
    return customerMessages.length > 0 ? customerMessages[customerMessages.length - 1] : null;
  }

  // Check if we need an AI response (customer sent latest message)
  needsAIResponse(messages: OrderedMessage[]): boolean {
    if (messages.length === 0) return false;
    
    const latestMessage = messages[messages.length - 1];
    return latestMessage.direction === 'in' && !latestMessage.aiGenerated;
  }
}

export const messageOrderingService = new MessageOrderingService();
