import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedIntelligentResponse } from './intelligentConversationAI';

export interface AIMessageRequest {
  leadId: string;
  stage?: string;
  context?: {
    urgency_factor?: string;
    inventory_mentioned?: any[];
    behavioral_trigger?: string;
    availableInventory?: any[];
    inventoryCount?: number;
    strictInventoryMode?: boolean;
    vehicleInterest?: string;
  };
}

export interface AIMessageResponse {
  message: string;
  generated: boolean;
  error?: string;
}

// Simplified version that uses the unified intelligent conversation AI
export const generateIntelligentAIMessage = async (request: AIMessageRequest): Promise<string | null> => {
  try {
    console.log(`🤖 [INTELLIGENT AI MSG] Generating message for lead ${request.leadId}`);

    // Get lead details to provide proper context
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        vehicle_interest,
        created_at
      `)
      .eq('id', request.leadId)
      .single();

    if (leadError || !lead) {
      console.error('❌ [INTELLIGENT AI MSG] Lead not found:', leadError);
      return null;
    }

    // Get conversation history
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', request.leadId)
      .order('sent_at', { ascending: true });

    if (convError) {
      console.error('❌ [INTELLIGENT AI MSG] Error loading conversations:', convError);
      return null;
    }

    const conversationHistory = conversations || [];
    const isInitialContact = conversationHistory.length === 0;

    console.log(`🎯 [INTELLIGENT AI MSG] Lead: ${lead.first_name} ${lead.last_name}, Initial contact: ${isInitialContact}`);

    // Use simplified conversation AI
    const response = await generateEnhancedIntelligentResponse({
      leadId: request.leadId,
      leadName: `${lead.first_name} ${lead.last_name}`,
      vehicleInterest: lead.vehicle_interest || '',
      messages: conversationHistory.map(msg => ({
        id: msg.id,
        body: msg.body,
        direction: msg.direction,
        sentAt: msg.sent_at,
        aiGenerated: msg.ai_generated
      })),
      leadInfo: {
        phone: '',
        status: 'new'
      }
    });

    if (!response || !response.message) {
      console.error('❌ [INTELLIGENT AI MSG] No message returned');
      return null;
    }

    console.log(`✅ [INTELLIGENT AI MSG] Generated message: ${response.message}`);
    return response.message;

  } catch (error) {
    console.error('❌ [INTELLIGENT AI MSG] Error generating message:', error);
    return null;
  }
};

// Check if a lead should receive a message (quality controls)
export const shouldSendMessage = async (leadId: string): Promise<boolean> => {
  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('ai_opt_in, ai_sequence_paused, do_not_call, first_name, last_name')
      .eq('id', leadId)
      .single();

    if (!lead || !lead.ai_opt_in || lead.ai_sequence_paused || lead.do_not_call) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayMessages } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', leadId)
      .eq('direction', 'out')
      .eq('ai_generated', true)
      .gte('sent_at', today.toISOString());

    if (todayMessages && todayMessages.length >= 2) {
      console.log(`Daily message limit reached for lead ${leadId}`);
      return false;
    }

    const { data: lastMessage } = await supabase
      .from('conversations')
      .select('sent_at')
      .eq('lead_id', leadId)
      .eq('direction', 'out')
      .eq('ai_generated', true)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastMessage) {
      const lastMessageTime = new Date(lastMessage.sent_at);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      if (lastMessageTime > twoHoursAgo) {
        console.log(`Minimum interval not met for lead ${leadId}`);
        return false;
      }
    }

    const now = new Date();
    const hour = now.getHours();
    if (hour < 9 || hour >= 18) {
      console.log(`Outside business hours for lead ${leadId}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking if should send message:', error);
    return false;
  }
};

// Get message uniqueness stats for a lead
export const getMessageUniquenessStats = async (leadId: string) => {
  try {
    const { data: messageHistory } = await supabase
      .from('ai_message_history')
      .select('message_content, sent_at')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false });

    const { data: conversationContext } = await supabase
      .from('ai_conversation_context')
      .select('*')
      .eq('lead_id', leadId)
      .maybeSingle();

    return {
      totalMessages: messageHistory?.length || 0,
      recentMessages: messageHistory?.slice(0, 5) || [],
      conversationContext: conversationContext || null,
      lastMessageAt: messageHistory?.[0]?.sent_at || null
    };
  } catch (error) {
    console.error('Error getting message uniqueness stats:', error);
    return null;
  }
};
