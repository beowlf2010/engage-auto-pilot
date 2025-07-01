import { supabase } from '@/integrations/supabase/client';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';

// Process incoming messages for AI analysis and potential response
export const processIncomingMessage = async (
  leadId: string, 
  conversationId: string, 
  messageBody: string
): Promise<void> => {
  try {
    console.log(`📥 Processing incoming message for lead ${leadId}: "${messageBody}"`);
    
    // Check if this message contains a question that needs answering
    const isQuestion = containsQuestion(messageBody);
    const isInventoryQuestion = containsInventoryQuestion(messageBody);
    
    if (isQuestion || isInventoryQuestion) {
      console.log(`❓ Question detected in message: ${isInventoryQuestion ? 'INVENTORY' : 'GENERAL'}`);
      
      // Mark this as needing urgent attention
      await markQuestionForAttention(leadId, conversationId, messageBody, isInventoryQuestion);
      
      // Check if AI should auto-respond using unified system
      const shouldRespond = await shouldGenerateResponse(leadId);
      if (shouldRespond) {
        console.log(`🤖 Auto-generating response for question: "${messageBody}"`);
        
        // Generate and potentially send auto-response using unified AI
        const aiResponse = await generateResponse(leadId);
        if (aiResponse) {
          console.log(`✅ AI generated response: "${aiResponse}"`);
        }
      }
    }
    
    // Update lead's last interaction
    await updateLeadInteraction(leadId, messageBody);
    
  } catch (error) {
    console.error('Error processing incoming message:', error);
  }
};

const shouldGenerateResponse = async (leadId: string): Promise<boolean> => {
  try {
    const { data: messages } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false })
      .limit(5);

    if (!messages || messages.length === 0) return false;

    const lastCustomerMessage = messages.find(msg => msg.direction === 'in');
    if (!lastCustomerMessage) return false;

    const responseAfter = messages.find(msg => 
      msg.direction === 'out' && 
      new Date(msg.sent_at) > new Date(lastCustomerMessage.sent_at)
    );

    return !responseAfter;
  } catch (error) {
    console.error('Error checking if response needed:', error);
    return false;
  }
};

const generateResponse = async (leadId: string): Promise<string | null> => {
  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('first_name, last_name, vehicle_interest')
      .eq('id', leadId)
      .single();

    if (!lead) return null;

    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true })
      .limit(10);

    if (!conversations || conversations.length === 0) return null;

    const lastCustomerMessage = conversations
      .filter(msg => msg.direction === 'in')
      .slice(-1)[0];

    if (!lastCustomerMessage) return null;

    const messageContext: MessageContext = {
      leadId,
      leadName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'there',
      latestMessage: lastCustomerMessage.body,
      conversationHistory: conversations.map(c => c.body),
      vehicleInterest: lead.vehicle_interest || ''
    };

    const response = unifiedAIResponseEngine.generateResponse(messageContext);
    return response?.message || null;
  } catch (error) {
    console.error('Error generating response:', error);
    return null;
  }
};

// Detect if message contains a question
const containsQuestion = (message: string): boolean => {
  const questionIndicators = [
    '?',
    /\b(what|how|when|where|why|can you|could you|would you|do you|are you|is there)\b/i,
    /\b(tell me|let me know|i want to know|i need to know)\b/i
  ];
  
  return questionIndicators.some(indicator => {
    if (typeof indicator === 'string') {
      return message.includes(indicator);
    }
    return indicator.test(message);
  });
};

// Detect inventory-specific questions
const containsInventoryQuestion = (message: string): boolean => {
  const inventoryKeywords = [
    /\b(see|available|online|have|stock|inventory|find|look|show|get|any|don't see|can't find|where)\b/i,
    /\b(2026|2025|2024|model|make|car|vehicle|truck|suv)\b/i,
    /\b(price|cost|how much)\b/i
  ];
  
  return inventoryKeywords.some(pattern => pattern.test(message));
};

// Mark question for attention
const markQuestionForAttention = async (
  leadId: string, 
  conversationId: string, 
  messageBody: string, 
  isInventoryQuestion: boolean
): Promise<void> => {
  try {
    // Add to AI conversation notes for tracking
    const { error } = await supabase
      .from('ai_conversation_notes')
      .insert({
        lead_id: leadId,
        conversation_id: conversationId,
        note_type: isInventoryQuestion ? 'vehicle_shown' : 'inventory_discussion',
        note_content: `Customer question detected: "${messageBody.substring(0, 200)}${messageBody.length > 200 ? '...' : ''}"`,
        vehicles_discussed: []
      });
    
    if (error) {
      console.error('Error marking question for attention:', error);
    }
  } catch (error) {
    console.error('Error in markQuestionForAttention:', error);
  }
};

// Update lead interaction timestamp
const updateLeadInteraction = async (leadId: string, messageBody: string): Promise<void> => {
  try {
    await supabase
      .from('leads')
      .update({ 
        last_reply_at: new Date().toISOString(),
        // Reset AI takeover if customer responds
        pending_human_response: false
      })
      .eq('id', leadId);
  } catch (error) {
    console.error('Error updating lead interaction:', error);
  }
};

// Auto-process messages when they're received
export const setupMessageProcessor = () => {
  console.log('🔧 Setting up enhanced message processor');
  
  // Listen for new incoming messages
  const channel = supabase
    .channel('message-processor')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations',
        filter: 'direction=eq.in'
      },
      async (payload) => {
        const message = payload.new as any;
        console.log('📨 New incoming message detected:', message.id);
        
        await processIncomingMessage(
          message.lead_id,
          message.id,
          message.body
        );
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
