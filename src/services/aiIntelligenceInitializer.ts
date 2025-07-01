
import { aiIntelligenceHub } from './aiIntelligenceHub';

class AIIntelligenceInitializer {
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🎯 [AI-INITIALIZER] Already initialized');
      return;
    }

    if (this.initializationPromise) {
      console.log('🎯 [AI-INITIALIZER] Initialization in progress, waiting...');
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    await this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      console.log('🚀 [AI-INITIALIZER] Starting AI Intelligence Hub initialization...');
      
      // Initialize the AI Intelligence Hub services
      await aiIntelligenceHub.initializeIntelligenceServices();
      
      this.initialized = true;
      console.log('✅ [AI-INITIALIZER] AI Intelligence Hub fully initialized');
      
    } catch (error) {
      console.error('❌ [AI-INITIALIZER] Failed to initialize AI Intelligence Hub:', error);
      // Reset promise so retry is possible
      this.initializationPromise = null;
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async getIntelligenceInsights(): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    return aiIntelligenceHub.getIntelligenceInsights();
  }

  async generateIntelligentResponse(context: any): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    return aiIntelligenceHub.generateIntelligentResponse(context);
  }

  async processIntelligenceFeedback(leadId: string, responseId: string, feedback: any): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    return aiIntelligenceHub.processIntelligenceFeedback(leadId, responseId, feedback);
  }
}

export const aiIntelligenceInitializer = new AIIntelligenceInitializer();
