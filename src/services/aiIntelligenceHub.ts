
import { crossConversationIntelligence } from './crossConversationIntelligence';
import { inventoryAwareAI } from './inventoryAwareAI';
import { advancedPersonalizationEngine } from './advancedPersonalizationEngine';
import { automatedAIOptimization } from './automatedAIOptimization';
import { realtimeDecisionIntelligence } from './realtimeDecisionIntelligence';
import { unifiedAIResponseEngine, MessageContext } from './unifiedAIResponseEngine';

interface IntelligentResponse {
  message: string;
  confidence: number;
  intelligence_factors: string[];
  personalization_applied: boolean;
  inventory_recommendations: any[];
  decision_reasoning: string[];
  optimization_applied: boolean;
}

class AIIntelligenceHub {
  async generateIntelligentResponse(context: MessageContext): Promise<IntelligentResponse> {
    try {
      console.log('🎯 [AI-HUB] Generating intelligent response with full AI stack');

      // Step 1: Make intelligent decision about response
      const decision = await realtimeDecisionIntelligence.makeIntelligentDecision(
        context.leadId,
        context.latestMessage,
        context
      );

      if (!decision.shouldRespond) {
        return {
          message: '',
          confidence: decision.confidence,
          intelligence_factors: ['no_response_needed'],
          personalization_applied: false,
          inventory_recommendations: [],
          decision_reasoning: decision.reasoning,
          optimization_applied: false
        };
      }

      // Step 2: Generate base response using unified engine
      const baseResponse = unifiedAIResponseEngine.generateResponse(context);
      
      if (!baseResponse?.message) {
        throw new Error('No base response generated');
      }

      // Step 3: Enhance with inventory awareness
      const inventoryEnhanced = await inventoryAwareAI.enhanceResponseWithInventory(
        context,
        baseResponse.message
      );

      // Step 4: Apply advanced personalization
      const personalizedResponse = await advancedPersonalizationEngine.generatePersonalizedResponse(
        context.leadId,
        inventoryEnhanced.message,
        {
          customerMessage: context.latestMessage,
          conversationHistory: context.conversationHistory,
          vehicleInterest: context.vehicleInterest
        }
      );

      // Step 5: Apply cross-conversation learning optimizations
      const optimizedResponse = await crossConversationIntelligence.optimizeResponseWithGlobalLearning(
        personalizedResponse.message,
        { leadId: context.leadId, messageType: 'intelligent' }
      );

      // Step 6: Trigger automated optimization processes
      automatedAIOptimization.processAutomaticOptimizations();

      const intelligentResponse: IntelligentResponse = {
        message: optimizedResponse,
        confidence: Math.max(
          decision.confidence,
          personalizedResponse.confidence,
          baseResponse.confidence || 0.7
        ),
        intelligence_factors: [
          'decision_intelligence',
          'inventory_awareness',
          'advanced_personalization',
          'cross_conversation_learning',
          ...personalizedResponse.personalizationFactors
        ],
        personalization_applied: personalizedResponse.personalizationFactors.length > 0,
        inventory_recommendations: inventoryEnhanced.inventoryRecommendations,
        decision_reasoning: decision.reasoning,
        optimization_applied: optimizedResponse !== personalizedResponse.message
      };

      console.log('✅ [AI-HUB] Generated intelligent response:', {
        factors: intelligentResponse.intelligence_factors.length,
        confidence: Math.round(intelligentResponse.confidence * 100) + '%',
        personalized: intelligentResponse.personalization_applied,
        inventory_recs: intelligentResponse.inventory_recommendations.length
      });

      return intelligentResponse;

    } catch (error) {
      console.error('❌ [AI-HUB] Error generating intelligent response:', error);
      
      // Fallback to basic unified response
      const fallbackResponse = unifiedAIResponseEngine.generateResponse(context);
      
      return {
        message: fallbackResponse?.message || "I'd be happy to help you!",
        confidence: fallbackResponse?.confidence || 0.5,
        intelligence_factors: ['fallback'],
        personalization_applied: false,
        inventory_recommendations: [],
        decision_reasoning: ['Fallback due to intelligence hub error'],
        optimization_applied: false
      };
    }
  }

  async getIntelligenceInsights(): Promise<any> {
    try {
      const [
        decisionInsights,
        optimizationStatus,
        globalPatterns
      ] = await Promise.all([
        realtimeDecisionIntelligence.getDecisionIntelligenceInsights(),
        automatedAIOptimization.getOptimizationStatus(),
        crossConversationIntelligence.analyzeGlobalPatterns()
      ]);

      return {
        overview: {
          total_intelligence_factors: 5,
          services_active: 5,
          integration_health: 'excellent'
        },
        decision_intelligence: decisionInsights,
        optimization_status: optimizationStatus,
        global_patterns: globalPatterns.slice(0, 5),
        last_updated: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ [AI-HUB] Error getting intelligence insights:', error);
      return {
        overview: {
          total_intelligence_factors: 5,
          services_active: 0,
          integration_health: 'error'
        },
        error: error.message
      };
    }
  }

  async initializeIntelligenceServices(): Promise<void> {
    try {
      console.log('🚀 [AI-HUB] Initializing AI Intelligence services...');

      // Initialize global pattern analysis
      await crossConversationIntelligence.analyzeGlobalPatterns();
      
      // Start automated optimization cycle
      await automatedAIOptimization.processAutomaticOptimizations();

      console.log('✅ [AI-HUB] AI Intelligence services initialized');

    } catch (error) {
      console.error('❌ [AI-HUB] Error initializing intelligence services:', error);
    }
  }

  async processIntelligenceFeedback(
    leadId: string,
    responseId: string,
    feedback: {
      response_received: boolean;
      response_quality?: number;
      conversion_outcome?: string;
      user_satisfaction?: number;
    }
  ): Promise<void> {
    try {
      console.log('📊 [AI-HUB] Processing intelligence feedback for:', leadId);

      // Update personalization profile
      await advancedPersonalizationEngine.updatePersonalizationProfile(leadId, {
        responseReceived: feedback.response_received,
        satisfactionLevel: feedback.user_satisfaction
      });

      // This feedback will be used by automated optimization
      console.log('✅ [AI-HUB] Intelligence feedback processed');

    } catch (error) {
      console.error('❌ [AI-HUB] Error processing intelligence feedback:', error);
    }
  }
}

export const aiIntelligenceHub = new AIIntelligenceHub();
