
import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedIntelligentResponse, shouldGenerateResponse } from './intelligentConversationAI';
import { consolidatedSendMessage } from './consolidatedMessagesService';

class BackgroundAIProcessor {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  start(profileId: string) {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🤖 [BACKGROUND AI] Starting background AI processor');

    // Process every 30 seconds
    this.intervalId = setInterval(() => {
      this.processLeadsNeedingAI(profileId);
    }, 30000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🤖 [BACKGROUND AI] Stopped background AI processor');
  }

  private async processLeadsNeedingAI(profileId: string) {
    try {
      console.log('🤖 [BACKGROUND AI] Checking for leads needing AI responses');

      // Find leads with recent inbound messages that haven't been responded to
      const { data: leadsNeedingResponse } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          vehicle_interest,
          conversations!inner(
            id,
            direction,
            sent_at,
            ai_generated
          )
        `)
        .eq('ai_opt_in', true)
        .eq('conversations.direction', 'in')
        .gte('conversations.sent_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .limit(10);

      if (!leadsNeedingResponse || leadsNeedingResponse.length === 0) {
        return;
      }

      for (const lead of leadsNeedingResponse) {
        await this.processLeadForAI(lead, profileId);
        // Small delay between processing
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error('❌ [BACKGROUND AI] Error in background processing:', error);
    }
  }

  private async processLeadForAI(lead: any, profileId: string) {
    try {
      // Get full conversation history
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', lead.id)
        .order('sent_at', { ascending: true })
        .limit(20);

      if (!conversations) return;

      // Create context for AI
      const context = {
        leadId: lead.id,
        leadName: `${lead.first_name} ${lead.last_name}`,
        vehicleInterest: lead.vehicle_interest || '',
        messages: conversations.map(msg => ({
          id: msg.id,
          body: msg.body,
          direction: msg.direction as 'in' | 'out',
          sentAt: msg.sent_at,
          aiGenerated: msg.ai_generated
        })),
        leadInfo: {
          phone: '',
          status: 'active'
        }
      };

      // Check if we should generate a response
      if (!shouldGenerateResponse(context)) {
        return;
      }

      // Generate AI response
      const aiResponse = await generateEnhancedIntelligentResponse(context);
      
      if (!aiResponse?.message) {
        return;
      }

      console.log(`🤖 [BACKGROUND AI] Generated response for ${lead.first_name}:`, aiResponse.message);

      // Send the AI response
      const result = await consolidatedSendMessage({
        leadId: lead.id,
        messageBody: aiResponse.message,
        profileId,
        isAIGenerated: true
      });

      if (result.success) {
        console.log(`✅ [BACKGROUND AI] Sent AI response to ${lead.first_name}`);
      }

    } catch (error) {
      console.error(`❌ [BACKGROUND AI] Error processing lead ${lead.id}:`, error);
    }
  }
}

export const backgroundAIProcessor = new BackgroundAIProcessor();
