// UNIFIED AI SERVICE - COMPLIANCE INTEGRATED VERSION
// This service now uses consolidatedSendMessage for TCPA compliance
// All messages go through proper suppression, rate limiting, and consent checks

import { supabase } from '@/integrations/supabase/client';
import { aiServiceGuard, AI_SERVICE_IDS } from './aiServiceGuard';
import { aiEmergencyService } from './aiEmergencyService';
import { unifiedAIResponseEngine, MessageContext } from './unifiedAIResponseEngine';
import { consolidatedSendMessage, validateProfile } from './consolidatedMessagesService';

class UnifiedAIService {
  private processedMessages = new Set<string>();
  private isProcessing = false;
  private readonly serviceId = AI_SERVICE_IDS.CONSOLIDATED;

  async shouldGenerateResponse(leadId: string): Promise<boolean> {
    try {
      // Check emergency shutdown first
      const canProceed = await aiEmergencyService.checkBeforeAIAction('generate_response');
      if (!canProceed) {
        console.log('🚫 [UNIFIED AI] Blocked by emergency shutdown');
        return false;
      }

      // Check if lead is opted in for AI
      const { data: lead, error } = await supabase
        .from('leads')
        .select('ai_opt_in, status, next_ai_send_at')
        .eq('id', leadId)
        .single();

      if (error || !lead) {
        console.warn(`⚠️ [UNIFIED AI] Lead not found: ${leadId}`);
        return false;
      }

      if (!lead.ai_opt_in) {
        console.log(`🚫 [UNIFIED AI] Lead ${leadId} not opted in for AI`);
        return false;
      }

      if (lead.status === 'lost' || lead.status === 'closed') {
        console.log(`🚫 [UNIFIED AI] Lead ${leadId} is ${lead.status}, skipping`);
        return false;
      }

      // Check if it's time to send (if scheduled)
      if (lead.next_ai_send_at) {
        const sendTime = new Date(lead.next_ai_send_at);
        const now = new Date();
        if (sendTime > now) {
          console.log(`⏰ [UNIFIED AI] Lead ${leadId} scheduled for later: ${sendTime}`);
          return false;
        }
      }

      // Check if we already processed this lead recently
      if (this.processedMessages.has(leadId)) {
        console.log(`🔄 [UNIFIED AI] Lead ${leadId} already processed recently`);
        return false;
      }

      // Check service guard
      if (!aiServiceGuard.canGenerateResponse(leadId, this.serviceId)) {
        console.log(`🚫 [UNIFIED AI] Service guard blocked lead ${leadId}`);
        return false;
      }

      console.log(`✅ [UNIFIED AI] Lead ${leadId} ready for AI response`);
      return true;

    } catch (error) {
      console.error('❌ [UNIFIED AI] Error checking if should generate response:', error);
      return false;
    }
  }

  async generateResponse(leadId: string): Promise<string | null> {
    try {
      console.log(`🤖 [UNIFIED AI] Generating response for lead: ${leadId}`);

      // Get lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('first_name, last_name, vehicle_interest, salesperson_id')
        .eq('id', leadId)
        .single();

      if (leadError || !lead) {
        console.error(`❌ [UNIFIED AI] Failed to fetch lead ${leadId}:`, leadError);
        return null;
      }

      // Get conversation history
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('body, direction, sent_at')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(10);

      if (convError) {
        console.warn(`⚠️ [UNIFIED AI] Failed to fetch conversations for ${leadId}:`, convError);
      }

      // Build context
      const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'there';
      const conversationHistory = conversations?.map(c => 
        `${c.direction === 'in' ? 'Customer' : 'Sales'}: ${c.body}`
      ) || [];

      const latestMessage = conversations?.find(c => c.direction === 'in')?.body || '';

      const context: MessageContext = {
        leadId,
        leadName,
        latestMessage,
        conversationHistory,
        vehicleInterest: lead.vehicle_interest || 'a vehicle'
      };

      // Generate AI response
      const aiResponse = await unifiedAIResponseEngine.generateResponse(context);
      if (!aiResponse) {
        console.error(`❌ [UNIFIED AI] Failed to generate AI response for ${leadId}`);
        return null;
      }

      // Validate response quality
      const validation = unifiedAIResponseEngine.validateResponseQuality(aiResponse.message);
      if (!validation.isValid) {
        console.error(`❌ [UNIFIED AI] Invalid response quality for ${leadId}:`, validation.issues);
        return null;
      }

      console.log(`✅ [UNIFIED AI] Generated response for ${leadId}: ${aiResponse.message.substring(0, 50)}...`);
      return aiResponse.message;

    } catch (error) {
      console.error(`❌ [UNIFIED AI] Error generating response for ${leadId}:`, error);
      return null;
    }
  }

  async processAllPendingResponses(profile: any): Promise<void> {
    if (this.isProcessing) {
      console.log('🔄 [UNIFIED AI] Already processing, skipping...');
      return;
    }

    try {
      this.isProcessing = true;
      console.log('🚀 [UNIFIED AI] Starting AI processing cycle...');

      // Validate profile
      const profileValidation = validateProfile(profile);
      if (!profileValidation.isValid) {
        console.error('❌ [UNIFIED AI] Invalid profile:', profileValidation.error);
        return;
      }

      const profileId = profileValidation.profileId!;

      // Get leads ready for AI processing
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name')
        .eq('ai_opt_in', true)
        .in('status', ['new', 'engaged', 'warm'])
        .or(`next_ai_send_at.is.null,next_ai_send_at.lte.${new Date().toISOString()}`)
        .limit(20); // Process max 20 leads per cycle

      if (error) {
        console.error('❌ [UNIFIED AI] Failed to fetch leads:', error);
        return;
      }

      if (!leads || leads.length === 0) {
        console.log('ℹ️ [UNIFIED AI] No leads ready for processing');
        return;
      }

      console.log(`📋 [UNIFIED AI] Processing ${leads.length} leads...`);

      let processed = 0;
      let sent = 0;
      let errors = 0;

      for (const lead of leads) {
        try {
          // Check if should generate response
          const shouldGenerate = await this.shouldGenerateResponse(lead.id);
          if (!shouldGenerate) {
            continue;
          }

          // Generate AI response
          const responseMessage = await this.generateResponse(lead.id);
          if (!responseMessage) {
            errors++;
            continue;
          }

          // Send message through compliance service
          console.log(`📤 [UNIFIED AI] Sending AI message to ${lead.first_name} ${lead.last_name}`);
          const result = await consolidatedSendMessage({
            leadId: lead.id,
            messageBody: responseMessage,
            profileId,
            isAIGenerated: true
          });

          if (result.success) {
            sent++;
            console.log(`✅ [UNIFIED AI] Successfully sent AI message to lead ${lead.id}`);
            
            // Mark as processed and schedule next
            this.processedMessages.add(lead.id);
            
            // Schedule next AI message (24 hours from now)
            await supabase
              .from('leads')
              .update({ 
                next_ai_send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                ai_stage: 'scheduled'
              })
              .eq('id', lead.id);

          } else {
            errors++;
            console.error(`❌ [UNIFIED AI] Failed to send message to lead ${lead.id}:`, result.error);
          }

          processed++;

          // Small delay between messages to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          errors++;
          console.error(`❌ [UNIFIED AI] Error processing lead ${lead.id}:`, error);
        }
      }

      console.log(`✅ [UNIFIED AI] Processing complete: ${processed} processed, ${sent} sent, ${errors} errors`);

    } catch (error) {
      console.error('❌ [UNIFIED AI] Critical error in processing:', error);
    } finally {
      this.isProcessing = false;
      
      // Clear processed messages after 1 hour
      setTimeout(() => {
        this.processedMessages.clear();
      }, 60 * 60 * 1000);
    }
  }

  cleanupProcessedMessages(): void {
    this.processedMessages.clear();
  }

  getServiceStatus(): {
    processedCount: number;
    isProcessing: boolean;
  } {
    return {
      processedCount: this.processedMessages.size,
      isProcessing: this.isProcessing
    };
  }
}

export const unifiedAI = new UnifiedAIService();

/*
COMPLIANCE INTEGRATION COMPLETE:
✅ All AI responses now route through consolidatedSendMessage
✅ Suppression list checks enforced before sending
✅ Rate limiting properly implemented
✅ Consent verification integrated
✅ Emergency shutdown system integrated
✅ Proper audit trail for all AI-generated messages
✅ Service guard to prevent duplicate processing

STATUS: COMPLIANT AI SERVICE RESTORED WITH FULL SAFETY CONTROLS
*/