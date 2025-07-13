// COMPLIANCE EMERGENCY: unifiedAIService DISABLED
// This service was generating AI responses without using consolidatedSendMessage
// It bypassed critical compliance checks including suppression list, rate limiting, and consent
// ALL FUNCTIONALITY DISABLED TO PREVENT TCPA VIOLATIONS

import { supabase } from '@/integrations/supabase/client';
import { aiServiceGuard, AI_SERVICE_IDS } from './aiServiceGuard';

class UnifiedAIService {
  private processedMessages = new Set<string>();
  private isProcessing = false;
  private readonly serviceId = AI_SERVICE_IDS.CONSOLIDATED;

  async shouldGenerateResponse(leadId: string): Promise<boolean> {
    console.log('🚫 [UNIFIED AI] EMERGENCY SHUTDOWN - Service disabled for compliance');
    return false; // EMERGENCY SHUTDOWN - Always return false
  }

  async generateResponse(leadId: string): Promise<string | null> {
    console.log('🚫 [UNIFIED AI] EMERGENCY SHUTDOWN - Service disabled for compliance');
    return null; // EMERGENCY SHUTDOWN - Never generate responses
  }

  async processAllPendingResponses(profile: any): Promise<void> {
    console.log('🚫 [UNIFIED AI] EMERGENCY SHUTDOWN - All AI processing disabled for compliance');
    return; // EMERGENCY SHUTDOWN - No processing
  }

  cleanupProcessedMessages(): void {
    this.processedMessages.clear();
  }

  getServiceStatus(): {
    processedCount: number;
    isProcessing: boolean;
  } {
    return {
      processedCount: 0,
      isProcessing: false
    };
  }
}

export const unifiedAI = new UnifiedAIService();

/*
COMPLIANCE VIOLATION ANALYSIS:
- This service generated AI responses without using consolidatedSendMessage
- Bypassed suppression list checks
- Bypassed rate limiting enforcement  
- Bypassed consent verification
- Could send messages to previously suppressed numbers
- Major TCPA compliance risk

REMEDIATION REQUIRED:
- All AI message generation MUST route through consolidatedSendMessage
- Implement proper compliance checks before any message sending
- Add audit trail for all AI-generated messages
- Ensure suppression list is always checked

STATUS: EMERGENCY SHUTDOWN COMPLETE
*/