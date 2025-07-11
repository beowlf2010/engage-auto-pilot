
import { supabase } from '@/integrations/supabase/client';
import { unifiedAIResponseEngine, MessageContext } from '@/services/unifiedAIResponseEngine';
import { intelligentAutoApproval } from '@/services/intelligentAutoApproval';
import { aiAutomationCoordinator } from '@/services/aiAutomationCoordinator';
import { automatedWorkflowEngine } from '@/services/automatedWorkflowEngine';

interface IntelligenceContext {
  leadId: string;
  leadName: string;
  vehicleInterest: string;
  conversationHistory: string[];
  leadSource?: string;
}

export class AIIntelligenceHub {
  private static instance: AIIntelligenceHub;
  private processingQueue = new Map<string, boolean>();

  static getInstance(): AIIntelligenceHub {
    if (!AIIntelligenceHub.instance) {
      AIIntelligenceHub.instance = new AIIntelligenceHub();
    }
    return AIIntelligenceHub.instance;
  }

  async initializeIntelligenceServices() {
    console.log('🧠 [AI HUB] Initializing intelligence services...');
    
    // Start the advanced AI automation system
    await aiAutomationCoordinator.startAutomation();
    
    // Start the automated workflow engine
    await automatedWorkflowEngine.startEngine();
    
    console.log('✅ [AI HUB] Intelligence services initialized with workflow automation');
  }

  async getIntelligenceInsights() {
    const systemStatus = await aiAutomationCoordinator.getSystemStatus();
    
    return {
      totalInsights: systemStatus.performance.total_interactions || 0,
      activePatterns: systemStatus.queueStats.pending || 0,
      learningEfficiency: systemStatus.queueStats.autoApprovalRate / 100 || 0,
      confidenceScore: systemStatus.performance.average_confidence_score / 100 || 0
    };
  }

  async processIntelligenceFeedback(leadId: string, responseId: string, feedback: any) {
    console.log('📊 [AI HUB] Processing intelligence feedback:', { leadId, responseId, feedback });
    // Mock processing
    return { success: true };
  }

  async generateIntelligentResponse(context: IntelligenceContext): Promise<string | null> {
    if (this.processingQueue.get(context.leadId)) {
      console.log('🚫 [AI HUB] Already processing for lead:', context.leadId);
      return null;
    }

    this.processingQueue.set(context.leadId, true);

    try {
      console.log('🧠 [AI HUB] Generating intelligent response for:', context.leadId);

      const messageContext: MessageContext = {
        leadId: context.leadId,
        leadName: context.leadName,
        latestMessage: context.conversationHistory[context.conversationHistory.length - 1] || '',
        conversationHistory: context.conversationHistory,
        vehicleInterest: context.vehicleInterest
      };

      const response = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (response?.message) {
        console.log('✅ [AI HUB] Generated intelligent response');
        return response.message;
      }

      console.log('❌ [AI HUB] Failed to generate response');
      return null;

    } catch (error) {
      console.error('❌ [AI HUB] Error generating intelligent response:', error);
      return null;
    } finally {
      this.processingQueue.delete(context.leadId);
    }
  }

  async analyzeConversationIntelligence(
    leadId: string, 
    conversationHistory: string[]
  ): Promise<{
    urgencyLevel: 'low' | 'medium' | 'high';
    intentSignals: string[];
    recommendedActions: string[];
    confidence: number;
  }> {
    try {
      console.log('🔍 [AI HUB] Analyzing conversation intelligence for:', leadId);

      const messageContext: MessageContext = {
        leadId,
        leadName: 'Lead',
        latestMessage: conversationHistory[conversationHistory.length - 1] || '',
        conversationHistory,
        vehicleInterest: ''
      };

      const response = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      const confidence = response?.confidence || 0.5;
      
      return {
        urgencyLevel: confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low',
        intentSignals: ['general_inquiry'],
        recommendedActions: ['respond_promptly'],
        confidence
      };

    } catch (error) {
      console.error('❌ [AI HUB] Error analyzing conversation:', error);
      return {
        urgencyLevel: 'low',
        intentSignals: [],
        recommendedActions: [],
        confidence: 0
      };
    }
  }

  async generateContextualFollowUp(
    leadId: string,
    leadName: string,
    vehicleInterest: string,
    lastInteraction: string,
    daysSinceLastContact: number
  ): Promise<string | null> {
    try {
      console.log('📅 [AI HUB] Generating contextual follow-up for:', leadId);

      const messageContext: MessageContext = {
        leadId,
        leadName,
        latestMessage: lastInteraction,
        conversationHistory: [`Previous interaction: ${lastInteraction}`],
        vehicleInterest
      };

      const response = await unifiedAIResponseEngine.generateResponse(messageContext);
      
      if (response?.message) {
        return response.message;
      }

      return null;
    } catch (error) {
      console.error('❌ [AI HUB] Error generating follow-up:', error);
      return null;
    }
  }

  getProcessingStatus(): { [leadId: string]: boolean } {
    return Object.fromEntries(this.processingQueue);
  }
}

export const aiIntelligenceHub = AIIntelligenceHub.getInstance();
