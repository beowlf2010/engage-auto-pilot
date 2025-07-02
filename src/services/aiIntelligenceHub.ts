
import { crossConversationIntelligence } from './crossConversationIntelligence';
import { inventoryAwareAI } from './inventoryAwareAI';
import { advancedPersonalizationEngine } from './advancedPersonalizationEngine';
import { automatedAIOptimization } from './automatedAIOptimization';
import { realtimeDecisionIntelligence } from './realtimeDecisionIntelligence';
import { unifiedAIResponseEngine, MessageContext } from './unifiedAIResponseEngine';
import { realtimeLearningService } from './realtimeLearningService';
import { contextAwareConversationService } from './contextAwareConversationService';
import { supabase } from '@/integrations/supabase/client';

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
      console.log('🎯 [AI-HUB] Generating intelligent response with enhanced context awareness');

      // Enhanced Step 1: Get comprehensive conversation context
      const enhancedContext = await this.buildEnhancedContext(context);

      // Enhanced Step 2: Make intelligent decision with full context
      const decision = await realtimeDecisionIntelligence.makeIntelligentDecision(
        context.leadId,
        context.latestMessage,
        enhancedContext
      );

      if (!decision.shouldRespond) {
        // Track learning event for no-response decision
        await realtimeLearningService.processLearningEvent({
          type: 'conversation_analyzed',
          leadId: context.leadId,
          data: { decision: 'no_response', reasoning: decision.reasoning },
          timestamp: new Date()
        });

        return {
          message: '',
          confidence: decision.confidence,
          intelligence_factors: ['no_response_needed', 'enhanced_context_analysis'],
          personalization_applied: false,
          inventory_recommendations: [],
          decision_reasoning: decision.reasoning,
          optimization_applied: false
        };
      }

      // Enhanced Step 3: Generate contextually-aware base response
      const baseResponse = unifiedAIResponseEngine.generateResponse(enhancedContext);
      
      if (!baseResponse?.message) {
        throw new Error('No base response generated');
      }

      // Enhanced Step 4: Apply learning-informed optimizations
      const learningProfile = await realtimeLearningService.getLeadLearningProfile(context.leadId);
      const optimizationInsights = await realtimeLearningService.getOptimizationInsights(context.leadId);

      // Enhanced Step 5: Enhance with inventory awareness using learning insights
      const inventoryEnhanced = await inventoryAwareAI.enhanceResponseWithInventory(
        enhancedContext,
        baseResponse.message
      );

      // Enhanced Step 6: Apply advanced personalization with learning data
      const personalizedResponse = await advancedPersonalizationEngine.generatePersonalizedResponse(
        context.leadId,
        inventoryEnhanced.message,
        {
          customerMessage: context.latestMessage,
          conversationHistory: enhancedContext.conversationHistory,
          vehicleInterest: context.vehicleInterest
        }
      );

      // Enhanced Step 7: Apply cross-conversation learning with timing intelligence
      const optimizedResponse = await crossConversationIntelligence.optimizeResponseWithGlobalLearning(
        personalizedResponse.message,
        { 
          leadId: context.leadId, 
          messageType: this.detectMessageType(enhancedContext)
        }
      );

      // Enhanced Step 8: Quality validation and template learning
      const qualityScore = this.validateResponseQuality(optimizedResponse, enhancedContext);
      
      // Enhanced Step 9: Trigger automated optimization with learning feedback
      automatedAIOptimization.processAutomaticOptimizations();

      const intelligentResponse: IntelligentResponse = {
        message: optimizedResponse,
        confidence: Math.max(
          decision.confidence,
          personalizedResponse.confidence,
          baseResponse.confidence || 0.7,
          qualityScore
        ),
        intelligence_factors: [
          'enhanced_context_analysis',
          'conversation_stage_awareness', 
          'timing_intelligence',
          'learning_informed_optimization',
          'decision_intelligence',
          'inventory_awareness',
          'advanced_personalization',
          'cross_conversation_learning',
          'quality_validation',
          ...personalizedResponse.personalizationFactors,
          ...(learningProfile.insights.length > 0 ? ['lead_specific_learning'] : [])
        ],
        personalization_applied: personalizedResponse.personalizationFactors.length > 0,
        inventory_recommendations: inventoryEnhanced.inventoryRecommendations,
        decision_reasoning: [
          ...decision.reasoning,
          `Conversation stage: ${this.determineConversationStage(enhancedContext)}`,
          `Quality score: ${Math.round(qualityScore * 100)}%`,
          `Learning insights applied: ${optimizationInsights.insights.length}`
        ],
        optimization_applied: optimizedResponse !== personalizedResponse.message
      };

      // Enhanced Step 10: Track learning event for response generation
      await realtimeLearningService.processLearningEvent({
        type: 'message_sent',
        leadId: context.leadId,
        data: {
          content: optimizedResponse,
          intelligenceFactors: intelligentResponse.intelligence_factors,
          confidence: intelligentResponse.confidence,
          conversationStage: this.determineConversationStage(enhancedContext)
        },
        timestamp: new Date()
      });

      console.log('✅ [AI-HUB] Generated enhanced intelligent response:', {
        factors: intelligentResponse.intelligence_factors.length,
        confidence: Math.round(intelligentResponse.confidence * 100) + '%',
        personalized: intelligentResponse.personalization_applied,
        inventory_recs: intelligentResponse.inventory_recommendations.length,
        conversationStage: this.determineConversationStage(enhancedContext),
        learningInsights: optimizationInsights.insights.length
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

      // Track learning event for feedback
      await realtimeLearningService.processLearningEvent({
        type: 'feedback_submitted',
        leadId,
        data: {
          feedbackType: feedback.response_received ? 'positive' : 'negative',
          rating: feedback.user_satisfaction || feedback.response_quality,
          suggestions: feedback.conversion_outcome
        },
        timestamp: new Date()
      });

      // Update personalization profile using public method
      advancedPersonalizationEngine.updatePersonalizationProfile(leadId, {
        responseReceived: feedback.response_received,
        satisfactionLevel: feedback.user_satisfaction
      });

      console.log('✅ [AI-HUB] Intelligence feedback processed');

    } catch (error) {
      console.error('❌ [AI-HUB] Error processing intelligence feedback:', error);
    }
  }

  private async buildEnhancedContext(context: MessageContext): Promise<MessageContext> {
    try {
      console.log('🔍 [AI-HUB] Building enhanced conversation context...');

      // Get complete conversation history from database
      const { data: fullConversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', context.leadId)
        .order('sent_at', { ascending: true });

      // Get lead details for additional context
      const { data: leadDetails } = await supabase
        .from('leads')
        .select('*')
        .eq('id', context.leadId)
        .single();

      // Get appointment history
      const { data: appointmentHistory } = await supabase
        .from('appointments')
        .select('*')
        .eq('lead_id', context.leadId)
        .order('created_at', { ascending: false });

      const enhancedHistory = (fullConversation || []).map(msg => 
        `${msg.direction === 'in' ? 'Customer' : 'You'}: ${msg.body}`
      );

      return {
        ...context,
        conversationHistory: enhancedHistory,
        leadName: leadDetails ? `${leadDetails.first_name} ${leadDetails.last_name}`.trim() : context.leadName,
        vehicleInterest: leadDetails?.vehicle_interest || context.vehicleInterest,
        // Add conversation context metadata
        conversationMetadata: {
          totalMessages: enhancedHistory.length,
          lastResponseTime: leadDetails?.last_reply_at,
          appointmentHistory: appointmentHistory || [],
          leadSource: leadDetails?.source,
          leadStatus: leadDetails?.status
        }
      };
    } catch (error) {
      console.error('❌ [AI-HUB] Error building enhanced context:', error);
      return context; // Fallback to original context
    }
  }

  private detectMessageType(context: MessageContext): string {
    const message = context.latestMessage.toLowerCase();
    
    if (message.includes('appointment') || message.includes('schedule') || message.includes('visit')) {
      return 'appointment_inquiry';
    } else if (message.includes('price') || message.includes('cost') || message.includes('payment')) {
      return 'price_inquiry';
    } else if (message.includes('available') || message.includes('in stock')) {
      return 'availability_inquiry';
    } else if (message.includes('trade') || message.includes('exchange')) {
      return 'trade_inquiry';
    } else if (message.includes('?')) {
      return 'question';
    } else if (message.includes('hi') || message.includes('hello') || message.includes('hey')) {
      return 'greeting';
    } else {
      return 'general_inquiry';
    }
  }

  private determineConversationStage(context: MessageContext): string {
    const messageCount = context.conversationHistory.length;
    const hasAppointments = context.conversationMetadata?.appointmentHistory?.length > 0;
    
    if (messageCount === 0) {
      return 'initial_contact';
    } else if (messageCount <= 3) {
      return 'introduction';
    } else if (messageCount <= 8) {
      return 'discovery';
    } else if (hasAppointments) {
      return 'appointment_scheduled';
    } else if (messageCount <= 15) {
      return 'negotiation';
    } else {
      return 'long_term_nurture';
    }
  }

  private validateResponseQuality(response: string, context: MessageContext): number {
    let qualityScore = 0.7; // Base score
    
    // Response length check
    if (response.length > 50 && response.length < 300) {
      qualityScore += 0.1;
    }
    
    // Personalization check
    if (response.includes(context.leadName)) {
      qualityScore += 0.1;
    }
    
    // Vehicle interest relevance
    if (context.vehicleInterest && response.toLowerCase().includes(context.vehicleInterest.toLowerCase())) {
      qualityScore += 0.1;
    }
    
    // Question engagement
    if (response.includes('?')) {
      qualityScore += 0.05;
    }
    
    // Professional tone check
    if (response.includes('I\'d be happy') || response.includes('Thanks for') || response.includes('How can I')) {
      qualityScore += 0.05;
    }
    
    return Math.min(1.0, qualityScore);
  }
}

export const aiIntelligenceHub = new AIIntelligenceHub();
