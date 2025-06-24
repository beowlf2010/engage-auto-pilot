import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedIntelligentResponse, shouldGenerateResponse } from './intelligentConversationAI';

class BackgroundAIProcessor {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  start(profileId: string) {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🤖 [BACKGROUND AI] Starting background AI processor (PREVIEW MODE - reduced frequency)');

    // Process every 3 minutes instead of 30 seconds to reduce load
    this.intervalId = setInterval(() => {
      this.processLeadsForPreviews(profileId);
    }, 180000); // 3 minutes
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🤖 [BACKGROUND AI] Stopped background AI processor');
  }

  private async processLeadsForPreviews(profileId: string) {
    try {
      console.log('🤖 [BACKGROUND AI] Checking for leads needing AI response previews');

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
        .limit(3); // Reduced limit for less load

      if (!leadsNeedingResponse || leadsNeedingResponse.length === 0) {
        return;
      }

      for (const lead of leadsNeedingResponse) {
        await this.generatePreviewForLead(lead, profileId);
        // Longer delay between processing to reduce load
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

    } catch (error) {
      console.error('❌ [BACKGROUND AI] Error in background preview processing:', error);
    }
  }

  private async generatePreviewForLead(lead: any, profileId: string) {
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

      // Generate AI response PREVIEW (don't send)
      const aiResponse = await generateEnhancedIntelligentResponse(context);
      
      if (!aiResponse?.message) {
        return;
      }

      console.log(`🤖 [BACKGROUND AI] Generated preview for ${lead.first_name}:`, aiResponse.message);
      
      // In a real implementation, this would trigger a notification or update the UI
      // For now, we just log that a preview is ready

    } catch (error) {
      console.error(`❌ [BACKGROUND AI] Error generating preview for lead ${lead.id}:`, error);
    }
  }
}

export const backgroundAIProcessor = new BackgroundAIProcessor();
