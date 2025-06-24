
// AI Service Guard - Prevents multiple AI services from conflicting
class AIServiceGuard {
  private static instance: AIServiceGuard;
  private activeResponseRequests = new Map<string, string>(); // leadId -> serviceId
  private responseHistory = new Map<string, Date>(); // leadId -> lastResponseTime

  static getInstance(): AIServiceGuard {
    if (!AIServiceGuard.instance) {
      AIServiceGuard.instance = new AIServiceGuard();
    }
    return AIServiceGuard.instance;
  }

  // Check if a service can generate a response for a lead
  canGenerateResponse(leadId: string, serviceId: string): boolean {
    const existingService = this.activeResponseRequests.get(leadId);
    
    // If another service is already processing this lead, deny
    if (existingService && existingService !== serviceId) {
      console.log(`🚫 [AI GUARD] Service ${serviceId} blocked - ${existingService} is already processing lead ${leadId}`);
      return false;
    }

    // Check if we recently generated a response (prevent spam)
    const lastResponse = this.responseHistory.get(leadId);
    if (lastResponse && Date.now() - lastResponse.getTime() < 30000) { // 30 second cooldown
      console.log(`🚫 [AI GUARD] Service ${serviceId} blocked - too soon after last response for lead ${leadId}`);
      return false;
    }

    return true;
  }

  // Register that a service is generating a response
  registerResponseGeneration(leadId: string, serviceId: string): void {
    this.activeResponseRequests.set(leadId, serviceId);
    console.log(`✅ [AI GUARD] Service ${serviceId} registered for lead ${leadId}`);
  }

  // Mark response as completed
  completeResponse(leadId: string, serviceId: string): void {
    this.activeResponseRequests.delete(leadId);
    this.responseHistory.set(leadId, new Date());
    console.log(`✅ [AI GUARD] Response completed by ${serviceId} for lead ${leadId}`);
  }

  // Get current status for debugging
  getStatus(): {
    activeRequests: number;
    recentResponses: number;
  } {
    return {
      activeRequests: this.activeResponseRequests.size,
      recentResponses: this.responseHistory.size
    };
  }

  // Cleanup old entries
  cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    for (const [leadId, timestamp] of this.responseHistory.entries()) {
      if (timestamp.getTime() < oneHourAgo) {
        this.responseHistory.delete(leadId);
      }
    }
    
    console.log('🧹 [AI GUARD] Cleaned up old response history');
  }
}

export const aiServiceGuard = AIServiceGuard.getInstance();

// Service IDs for tracking
export const AI_SERVICE_IDS = {
  CONSOLIDATED: 'consolidated-ai',
  LEGACY_SCHEDULER: 'legacy-scheduler', // Should be blocked
  INTELLIGENT: 'intelligent-ai' // Should be blocked for direct use
} as const;
