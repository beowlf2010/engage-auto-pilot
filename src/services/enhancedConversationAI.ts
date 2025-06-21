
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedAIRequest {
  leadId: string;
  leadName: string;
  vehicleInterest: string;
  lastCustomerMessage: string;
  conversationHistory: string;
  isInitialContact: boolean;
  behavioralData?: any;
  inventoryContext?: any;
}

export interface EnhancedAIResponse {
  message: string;
  confidence: number;
  qualityScore: number;
  reasoning: string;
  suggestedFollowUpTime?: Date;
  messageType: 'greeting' | 'follow_up' | 'inventory_mention' | 'appointment_request' | 'closing';
}

class EnhancedConversationAI {
  // Generate enhanced AI response with quality scoring
  async generateEnhancedResponse(request: EnhancedAIRequest): Promise<EnhancedAIResponse | null> {
    try {
      console.log(`🤖 [ENHANCED AI] Generating enhanced response for lead ${request.leadId}`);

      // Analyze conversation context
      const contextAnalysis = this.analyzeConversationContext(request);
      
      // Get personalization data
      const personalization = await this.getPersonalizationData(request.leadId);
      
      // Generate message using unified AI with enhanced context
      const aiResponse = await this.callUnifiedAI({
        ...request,
        contextAnalysis,
        personalization
      });

      if (!aiResponse) {
        return null;
      }

      // Score message quality
      const qualityScore = this.calculateMessageQuality(aiResponse, contextAnalysis);
      
      // Determine message type
      const messageType = this.classifyMessageType(aiResponse, contextAnalysis);
      
      // Suggest optimal follow-up timing
      const suggestedFollowUpTime = this.calculateOptimalFollowUpTime(
        request.leadId, 
        messageType, 
        personalization
      );

      return {
        message: aiResponse,
        confidence: contextAnalysis.confidence,
        qualityScore,
        reasoning: `Enhanced AI with context analysis: ${contextAnalysis.stage}, quality: ${qualityScore}/100`,
        suggestedFollowUpTime,
        messageType
      };

    } catch (error) {
      console.error('❌ [ENHANCED AI] Error generating enhanced response:', error);
      return null;
    }
  }

  // Analyze conversation context for better understanding
  private analyzeConversationContext(request: EnhancedAIRequest) {
    const { conversationHistory, lastCustomerMessage, isInitialContact } = request;
    
    // Analyze conversation stage
    let stage = 'initial';
    if (!isInitialContact) {
      if (conversationHistory.includes('appointment') || conversationHistory.includes('visit')) {
        stage = 'appointment_discussion';
      } else if (conversationHistory.includes('price') || conversationHistory.includes('cost')) {
        stage = 'pricing_discussion';
      } else if (lastCustomerMessage.length > 0) {
        stage = 'active_conversation';
      } else {
        stage = 'follow_up';
      }
    }

    // Detect customer intent signals
    const buyingSignals = this.detectBuyingSignals(lastCustomerMessage, conversationHistory);
    const objectionSignals = this.detectObjectionSignals(lastCustomerMessage);
    const urgencySignals = this.detectUrgencySignals(lastCustomerMessage);

    // Calculate confidence based on context
    let confidence = 0.7; // Base confidence
    if (buyingSignals.length > 0) confidence += 0.2;
    if (objectionSignals.length > 0) confidence += 0.1; // Objections need careful handling
    if (urgencySignals.length > 0) confidence += 0.1;

    return {
      stage,
      buyingSignals,
      objectionSignals,
      urgencySignals,
      confidence: Math.min(confidence, 1.0),
      conversationLength: conversationHistory.split('\n').length,
      lastMessageLength: lastCustomerMessage.length
    };
  }

  // Detect buying signals in customer messages
  private detectBuyingSignals(message: string, history: string): string[] {
    const signals: string[] = [];
    const buyingKeywords = [
      'interested', 'when can', 'available', 'price', 'financing', 'trade',
      'schedule', 'appointment', 'visit', 'come in', 'test drive',
      'ready to buy', 'want to purchase', 'looking to get', 'need a car'
    ];

    const text = (message + ' ' + history).toLowerCase();
    buyingKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        signals.push(keyword);
      }
    });

    return signals;
  }

  // Detect objection signals
  private detectObjectionSignals(message: string): string[] {
    const signals: string[] = [];
    const objectionKeywords = [
      'too expensive', 'too much', 'budget', 'can\'t afford',
      'not sure', 'thinking about it', 'need to discuss',
      'other options', 'shopping around', 'not ready'
    ];

    const text = message.toLowerCase();
    objectionKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        signals.push(keyword);
      }
    });

    return signals;
  }

  // Detect urgency signals
  private detectUrgencySignals(message: string): string[] {
    const signals: string[] = [];
    const urgencyKeywords = [
      'soon', 'asap', 'quickly', 'urgent', 'need today',
      'this week', 'right away', 'immediately'
    ];

    const text = message.toLowerCase();
    urgencyKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        signals.push(keyword);
      }
    });

    return signals;
  }

  // Get personalization data for the lead
  private async getPersonalizationData(leadId: string) {
    try {
      // Get lead personality data
      const { data: personality } = await supabase
        .from('lead_personalities')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      // Get communication patterns
      const { data: patterns } = await supabase
        .from('lead_communication_patterns')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      // Get recent conversation data
      const { data: recentMessages } = await supabase
        .from('conversations')
        .select('direction, sent_at, body')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(10);

      return {
        personality,
        patterns,
        recentMessages: recentMessages || [],
        preferredTone: personality?.communication_style || 'professional',
        responseSpeed: personality?.decision_speed || 'moderate'
      };
    } catch (error) {
      console.error('Error getting personalization data:', error);
      return {};
    }
  }

  // Call unified AI with enhanced context
  private async callUnifiedAI(request: any): Promise<string | null> {
    try {
      // For now, use a simplified approach - in production, this would call the enhanced edge function
      const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
        body: {
          leadId: request.leadId,
          leadName: request.leadName,
          vehicleInterest: request.vehicleInterest,
          lastCustomerMessage: request.lastCustomerMessage,
          conversationHistory: request.conversationHistory,
          isInitialContact: request.isInitialContact,
          enhancedContext: {
            stage: request.contextAnalysis?.stage,
            buyingSignals: request.contextAnalysis?.buyingSignals,
            objectionSignals: request.contextAnalysis?.objectionSignals,
            personalization: request.personalization
          }
        }
      });

      if (error) {
        console.error('Error calling unified AI:', error);
        return null;
      }

      return data?.message || null;
    } catch (error) {
      console.error('Error in callUnifiedAI:', error);
      return null;
    }
  }

  // Calculate message quality score (0-100)
  private calculateMessageQuality(message: string, context: any): number {
    let score = 50; // Base score

    // Length optimization (SMS-friendly)
    if (message.length <= 160) score += 15;
    else if (message.length <= 200) score += 10;
    else score -= 5;

    // Personalization bonus
    if (message.includes('Hi ') || message.includes('Hello ')) score += 10;

    // Context relevance
    if (context.buyingSignals.length > 0) {
      // Message should address buying signals
      const addressesBuyingSignals = context.buyingSignals.some((signal: string) => 
        message.toLowerCase().includes(signal.toLowerCase())
      );
      if (addressesBuyingSignals) score += 15;
    }

    // Professional tone check
    if (!message.includes('!!!!') && !message.toLowerCase().includes('urgent')) score += 5;

    // Clear call-to-action
    if (message.includes('?') || message.includes('call') || message.includes('visit')) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  // Classify message type for analytics
  private classifyMessageType(message: string, context: any): 'greeting' | 'follow_up' | 'inventory_mention' | 'appointment_request' | 'closing' {
    const text = message.toLowerCase();
    
    if (context.stage === 'initial') return 'greeting';
    if (text.includes('appointment') || text.includes('visit') || text.includes('come in')) return 'appointment_request';
    if (text.includes('available') || text.includes('inventory') || text.includes('vehicle')) return 'inventory_mention';
    if (text.includes('deal') || text.includes('price') || text.includes('financing')) return 'closing';
    
    return 'follow_up';
  }

  // Calculate optimal follow-up timing
  private calculateOptimalFollowUpTime(leadId: string, messageType: string, personalization: any): Date {
    const now = new Date();
    let hoursToAdd = 24; // Default 24 hours

    // Adjust based on message type
    switch (messageType) {
      case 'greeting':
        hoursToAdd = 4; // Quick follow-up for initial contact
        break;
      case 'appointment_request':
        hoursToAdd = 2; // Quick follow-up for appointment interest
        break;
      case 'inventory_mention':
        hoursToAdd = 6; // Medium follow-up for inventory interest
        break;
      case 'closing':
        hoursToAdd = 1; // Very quick follow-up for closing attempts
        break;
      default:
        hoursToAdd = 24;
    }

    // Adjust based on lead personality
    if (personalization.responseSpeed === 'fast') {
      hoursToAdd *= 0.5; // Faster follow-up for quick decision makers
    } else if (personalization.responseSpeed === 'slow') {
      hoursToAdd *= 2; // Slower follow-up for careful decision makers
    }

    // Ensure business hours
    const followUpTime = new Date(now.getTime() + (hoursToAdd * 60 * 60 * 1000));
    return this.adjustForBusinessHours(followUpTime);
  }

  // Adjust time to fall within business hours
  private adjustForBusinessHours(date: Date): Date {
    const hour = date.getHours();
    const day = date.getDay();

    // If weekend, move to Monday
    if (day === 0) { // Sunday
      date.setDate(date.getDate() + 1);
      date.setHours(9, 0, 0, 0);
    } else if (day === 6) { // Saturday
      date.setDate(date.getDate() + 2);
      date.setHours(9, 0, 0, 0);
    }

    // If outside business hours (8 AM - 7 PM), adjust
    if (hour < 8) {
      date.setHours(9, 0, 0, 0);
    } else if (hour >= 19) {
      date.setDate(date.getDate() + 1);
      date.setHours(9, 0, 0, 0);
    }

    return date;
  }
}

export const enhancedConversationAI = new EnhancedConversationAI();
