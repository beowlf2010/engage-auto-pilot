
// DISABLED: This service is now handled by consolidatedRealtimeManager
// All AI message processing is integrated into the unified realtime system

export class RealtimeMessageProcessor {
  private isDisabled = true;

  async processNewCustomerMessage(): Promise<boolean> {
    console.log('🚫 [REALTIME MESSAGE PROCESSOR] This service is disabled - using consolidatedRealtimeManager instead');
    return false;
  }

  setupRealtimeListener(): () => void {
    console.log('🚫 [REALTIME MESSAGE PROCESSOR] This service is disabled - using consolidatedRealtimeManager instead');
    return () => {};
  }
}

export const realtimeMessageProcessor = new RealtimeMessageProcessor();
