import { supabase } from '@/integrations/supabase/client';
import { validateVehicleInterest, validateAndUpdateLeadVehicleInterest } from './vehicleInterestValidator';
import { queueMessageForApproval } from './aiMessageApprovalService';
import { generateEnhancedIntelligentResponse } from './intelligentConversationAI';

export interface ImprovedAIMessageRequest {
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
  requireApproval?: boolean;
}

export interface ImprovedAIMessageResponse {
  message: string;
  generated: boolean;
  queuedForApproval: boolean;
  error?: string;
}

// Improved version with vehicle interest validation and approval queue
export const generateImprovedIntelligentAIMessage = async (
  request: ImprovedAIMessageRequest
): Promise<ImprovedAIMessageResponse> => {
  try {
    console.log(`🤖 [IMPROVED AI MSG] Generating message for lead ${request.leadId}`);

    const validationSuccess = await validateAndUpdateLeadVehicleInterest(request.leadId);
    if (!validationSuccess) {
      return {
        message: '',
        generated: false,
        queuedForApproval: false,
        error: 'Failed to validate vehicle interest data'
      };
    }

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        vehicle_interest,
        created_at,
        ai_messages_sent,
        message_intensity
      `)
      .eq('id', request.leadId)
      .single();

    if (leadError || !lead) {
      console.error('❌ [IMPROVED AI MSG] Lead not found:', leadError);
      return {
        message: '',
        generated: false,
        queuedForApproval: false,
        error: 'Lead not found'
      };
    }

    const validation = validateVehicleInterest(lead.vehicle_interest);
    if (!validation.isValid) {
      console.error('❌ [IMPROVED AI MSG] Invalid vehicle interest after validation');
      return {
        message: '',
        generated: false,
        queuedForApproval: false,
        error: 'Invalid vehicle interest data'
      };
    }

    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', request.leadId)
      .order('sent_at', { ascending: true });

    if (convError) {
      console.error('❌ [IMPROVED AI MSG] Error loading conversations:', convError);
      return {
        message: '',
        generated: false,
        queuedForApproval: false,
        error: 'Failed to load conversation history'
      };
    }

    const conversationHistory = conversations || [];
    const isInitialContact = conversationHistory.length === 0;

    console.log(`🎯 [IMPROVED AI MSG] Lead: ${lead.first_name} ${lead.last_name}, Vehicle: ${validation.sanitizedInterest}`);

    const enhancedResponse = await generateEnhancedIntelligentResponse({
      leadId: request.leadId,
      leadName: `${lead.first_name} ${lead.last_name}`,
      vehicleInterest: validation.sanitizedInterest,
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

    if (!enhancedResponse || !enhancedResponse.message) {
      console.error('❌ [IMPROVED AI MSG] No message returned from enhanced AI');
      return {
        message: '',
        generated: false,
        queuedForApproval: false,
        error: 'Failed to generate message'
      };
    }

    const messagesSent = lead.ai_messages_sent || 0;
    const isHighRisk = messagesSent === 0 || lead.message_intensity === 'super_aggressive';
    const requiresApproval = request.requireApproval !== false && isHighRisk;

    if (requiresApproval) {
      console.log(`📋 [IMPROVED AI MSG] Queueing message for approval (high risk)`);
      
      const urgencyLevel = lead.message_intensity === 'super_aggressive' ? 'high' : 'normal';
      const scheduledSendAt = new Date(Date.now() + (isInitialContact ? 0 : 2 * 60 * 60 * 1000));

      const queuedMessage = await queueMessageForApproval({
        leadId: request.leadId,
        messageContent: enhancedResponse.message,
        messageStage: request.stage || 'follow_up',
        urgencyLevel: urgencyLevel,
        scheduledSendAt: scheduledSendAt,
        autoApprove: false
      });

      if (!queuedMessage) {
        console.error('❌ [IMPROVED AI MSG] Failed to queue message for approval');
        return {
          message: '',
          generated: false,
          queuedForApproval: false,
          error: 'Failed to queue message for approval'
        };
      }

      console.log(`✅ [IMPROVED AI MSG] Message queued for approval: ${queuedMessage.id}`);
      return {
        message: enhancedResponse.message,
        generated: true,
        queuedForApproval: true
      };
    } else {
      console.log(`✅ [IMPROVED AI MSG] Message approved for immediate sending: ${enhancedResponse.message}`);
      return {
        message: enhancedResponse.message,
        generated: true,
        queuedForApproval: false
      };
    }

  } catch (error) {
    console.error('❌ [IMPROVED AI MSG] Error generating message:', error);
    return {
      message: '',
      generated: false,
      queuedForApproval: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Check if a lead should receive a message (enhanced quality controls)
export const shouldSendImprovedMessage = async (leadId: string): Promise<boolean> => {
  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('ai_opt_in, ai_sequence_paused, do_not_call, first_name, last_name, vehicle_interest, ai_enabled_at')
      .eq('id', leadId)
      .single();

    if (!lead || !lead.ai_opt_in || lead.ai_sequence_paused || lead.do_not_call) {
      return false;
    }

    const validation = validateVehicleInterest(lead.vehicle_interest);
    if (!validation.isValid) {
      console.log(`❌ [IMPROVED AI MSG] Lead ${leadId} has invalid vehicle interest, skipping`);
      return false;
    }

    if (!lead.ai_enabled_at) {
      console.log(`⚠️ [IMPROVED AI MSG] Lead ${leadId} missing ai_enabled_at, updating...`);
      await supabase
        .from('leads')
        .update({ ai_enabled_at: new Date().toISOString() })
        .eq('id', leadId);
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
    if (hour < 8 || hour >= 19) {
      console.log(`Outside business hours for lead ${leadId}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking if should send improved message:', error);
    return false;
  }
};
