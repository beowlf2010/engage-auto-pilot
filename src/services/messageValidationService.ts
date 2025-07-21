
import { supabase } from '@/integrations/supabase/client';

interface MessageValidationResult {
  leadId: string;
  expectedUnreadCount: number;
  actualUnreadCount: number;
  actualMessageCount: number;
  hasMismatch: boolean;
  messages: any[];
  lastMessage?: any;
  validationErrors: string[];
}

export class MessageValidationService {
  async validateConversationMessages(leadId: string): Promise<MessageValidationResult> {
    console.log(`🔍 [MESSAGE VALIDATION] Starting validation for lead: ${leadId}`);
    
    const validationErrors: string[] = [];
    
    try {
      // Get all conversations for this lead
      const { data: conversations, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (conversationsError) {
        console.error('❌ [MESSAGE VALIDATION] Error fetching conversations:', conversationsError);
        validationErrors.push(`Database error: ${conversationsError.message}`);
        return {
          leadId,
          expectedUnreadCount: 0,
          actualUnreadCount: 0,
          actualMessageCount: 0,
          hasMismatch: true,
          messages: [],
          validationErrors
        };
      }

      const messages = conversations || [];
      console.log(`📊 [MESSAGE VALIDATION] Found ${messages.length} total messages for lead ${leadId}`);

      // Count actual unread incoming messages
      const unreadIncoming = messages.filter(msg => 
        msg.direction === 'in' && !msg.read_at
      );
      
      const actualUnreadCount = unreadIncoming.length;
      console.log(`📊 [MESSAGE VALIDATION] Actual unread count: ${actualUnreadCount}`);

      // Get the last message for context
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      if (lastMessage) {
        console.log(`📨 [MESSAGE VALIDATION] Last message:`, {
          id: lastMessage.id,
          direction: lastMessage.direction,
          body: lastMessage.body?.substring(0, 50) + '...',
          sentAt: lastMessage.sent_at,
          readAt: lastMessage.read_at
        });
      }

      // Check for data consistency issues
      if (messages.some(msg => !msg.id)) {
        validationErrors.push('Found messages without IDs');
      }
      
      if (messages.some(msg => !msg.sent_at)) {
        validationErrors.push('Found messages without timestamps');
      }
      
      if (messages.some(msg => !msg.body || msg.body.trim() === '')) {
        validationErrors.push('Found messages with empty content');
      }

      // Log unread message details
      unreadIncoming.forEach((msg, index) => {
        console.log(`🔍 [MESSAGE VALIDATION] Unread message ${index + 1}:`, {
          id: msg.id,
          body: msg.body?.substring(0, 100) + '...',
          sentAt: msg.sent_at,
          bodyLength: msg.body?.length || 0
        });
      });

      return {
        leadId,
        expectedUnreadCount: actualUnreadCount, // We'll compare this with UI counts
        actualUnreadCount,
        actualMessageCount: messages.length,
        hasMismatch: false, // Will be determined by caller
        messages,
        lastMessage,
        validationErrors
      };

    } catch (error) {
      console.error('❌ [MESSAGE VALIDATION] Unexpected error:', error);
      validationErrors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        leadId,
        expectedUnreadCount: 0,
        actualUnreadCount: 0,
        actualMessageCount: 0,
        hasMismatch: true,
        messages: [],
        validationErrors
      };
    }
  }

  async debugMessageLoadingPipeline(leadId: string) {
    console.log(`🔧 [MESSAGE VALIDATION] Starting debug pipeline for lead: ${leadId}`);
    
    // Test multiple data fetching approaches
    const approaches = [
      'basic_fetch',
      'with_joins',
      'count_only',
      'recent_only'
    ];

    for (const approach of approaches) {
      try {
        console.log(`🔧 [MESSAGE VALIDATION] Testing approach: ${approach}`);
        
        let query = supabase.from('conversations');
        
        switch (approach) {
          case 'basic_fetch':
            query = query.select('*').eq('lead_id', leadId);
            break;
          case 'with_joins':
            query = query.select('*, leads(first_name, last_name)').eq('lead_id', leadId);
            break;
          case 'count_only':
            query = query.select('id', { count: 'exact' }).eq('lead_id', leadId);
            break;
          case 'recent_only':
            query = query.select('*').eq('lead_id', leadId).limit(10);
            break;
        }

        const { data, error, count } = await query;
        
        if (error) {
          console.error(`❌ [MESSAGE VALIDATION] ${approach} failed:`, error);
        } else {
          console.log(`✅ [MESSAGE VALIDATION] ${approach} succeeded:`, {
            dataLength: data?.length || 0,
            count,
            hasData: !!data
          });
        }
      } catch (err) {
        console.error(`❌ [MESSAGE VALIDATION] ${approach} exception:`, err);
      }
    }
  }
}

export const messageValidationService = new MessageValidationService();
