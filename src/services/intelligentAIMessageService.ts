import { supabase } from '@/integrations/supabase/client';
import { enhancedConversationAI } from './enhancedConversationAI';

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

// Enhanced version that uses the new appointment-aware AI
export const generateIntelligentAIMessage = async (request: AIMessageRequest): Promise<string | null> => {
  try {
    console.log(`🤖 [INTELLIGENT AI MSG] Generating message via ENHANCED function for lead ${request.leadId}`);

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
    const lastCustomerMessage = conversationHistory.filter(msg => msg.direction === 'in').slice(-1)[0]?.body || '';

    console.log(`🎯 [INTELLIGENT AI MSG] Lead: ${lead.first_name} ${lead.last_name}, Initial contact: ${isInitialContact}`);

    // Use enhanced conversation AI that includes appointment intent detection
    const enhancedResponse = await enhancedConversationAI.generateEnhancedResponse({
      leadId: request.leadId,
      leadName: `${lead.first_name} ${lead.last_name}`,
      vehicleInterest: lead.vehicle_interest || '',
      lastCustomerMessage: lastCustomerMessage,
      conversationHistory: conversationHistory.map(msg => `${msg.direction === 'in' ? 'Customer' : 'You'}: ${msg.body}`).join('\n') || '',
      isInitialContact: isInitialContact
    });

    if (!enhancedResponse || !enhancedResponse.message) {
      console.error('❌ [INTELLIGENT AI MSG] No message returned from enhanced function');
      return null;
    }

    if (enhancedResponse.includesAppointmentLink) {
      console.log('📅 [INTELLIGENT AI MSG] Response includes appointment booking link');
    }

    console.log(`✅ [INTELLIGENT AI MSG] Generated message via enhanced function: ${enhancedResponse.message}`);
    return enhancedResponse.message;

  } catch (error) {
    console.error('❌ [INTELLIGENT AI MSG] Error generating message via enhanced function:', error);
    return null;
  }
};

// Check if a lead should receive a message (quality controls)
export const shouldSendMessage = async (leadId: string): Promise<boolean> => {
  try {
    // Check if lead is opted in
    const { data: lead } = await supabase
      .from('leads')
      .select('ai_opt_in, ai_sequence_paused, do_not_call, first_name, last_name')
      .eq('id', leadId)
      .single();

    if (!lead || !lead.ai_opt_in || lead.ai_sequence_paused || lead.do_not_call) {
      return false;
    }

    // Check daily message limit (max 2 per day)
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

    // Check minimum interval (2 hours between messages)
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

    // Check business hours (9 AM - 6 PM)
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
