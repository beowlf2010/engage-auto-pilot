import { supabase } from '@/integrations/supabase/client';
import { unifiedAIResponseEngine, MessageContext, UnifiedAIResponse } from './unifiedAIResponseEngine';
import { contextAwareConversationService } from './contextAwareConversationService';
import type { ConversationListItem } from '@/hooks/conversation/conversationTypes';

interface AIInsight {
  type: 'buying_signal' | 'urgency' | 'sentiment' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface ConversationAIMetrics {
  confidence: number;
  urgencyLevel: 'low' | 'medium' | 'high';
  buyingSignals: string[];
  nextBestAction: string;
  responseStrategy: string;
  sentimentScore: number;
  engagementScore: number;
}

class SmartInboxAIService {
  async generateConversationInsights(conversation: ConversationListItem): Promise<AIInsight[]> {
    try {
      console.log('🧠 [SMART-INBOX-AI] Generating insights for conversation:', conversation.leadId);

      const insights: AIInsight[] = [];

      // Analyze buying signals
      const buyingSignals = this.detectBuyingSignals(conversation.lastMessage, conversation.vehicleInterest);
      if (buyingSignals.length > 0) {
        insights.push({
          type: 'buying_signal',
          title: 'Strong Buying Signals Detected',
          description: `Customer showing interest: ${buyingSignals.join(', ')}`,
          confidence: 0.85,
          actionable: true,
          priority: 'high'
        });
      }

      // Analyze urgency
      const urgencyAnalysis = this.analyzeUrgency(conversation);
      if (urgencyAnalysis.level !== 'low') {
        insights.push({
          type: 'urgency',
          title: `${urgencyAnalysis.level.charAt(0).toUpperCase() + urgencyAnalysis.level.slice(1)} Urgency Detected`,
          description: urgencyAnalysis.reason,
          confidence: urgencyAnalysis.confidence,
          actionable: true,
          priority: urgencyAnalysis.level === 'high' ? 'high' : 'medium'
        });
      }

      // Sentiment analysis
      const sentiment = this.analyzeSentiment(conversation.lastMessage);
      if (sentiment.needsAttention) {
        insights.push({
          type: 'sentiment',
          title: 'Sentiment Alert',
          description: sentiment.description,
          confidence: sentiment.confidence,
          actionable: true,
          priority: sentiment.severity
        });
      }

      // Next best action recommendation
      const recommendation = await this.generateActionRecommendation(conversation);
      insights.push({
        type: 'recommendation',
        title: 'AI Recommendation',
        description: recommendation.action,
        confidence: recommendation.confidence,
        actionable: true,
        priority: 'medium'
      });

      console.log(`✅ [SMART-INBOX-AI] Generated ${insights.length} insights for conversation ${conversation.leadId}`);
      return insights;

    } catch (error) {
      console.error('❌ [SMART-INBOX-AI] Error generating insights:', error);
      return [];
    }
  }

  async getConversationAIMetrics(conversation: ConversationListItem): Promise<ConversationAIMetrics> {
    try {
      console.log('📊 [SMART-INBOX-AI] Calculating AI metrics for conversation:', conversation.leadId);

      // Get conversation history
      const { data: messages } = await supabase
        .from('conversations')
        .select('body, direction, sent_at')
        .eq('lead_id', conversation.leadId)
        .order('sent_at', { ascending: true })
        .limit(20);

      const conversationHistory = messages?.map(m => `${m.direction === 'in' ? 'Customer' : 'You'}: ${m.body}`) || [];
      
      // Analyze conversation flow
      const flowAnalysis = await contextAwareConversationService.analyzeConversationFlow(
        conversation.leadId,
        conversationHistory,
        { vehicleInterest: conversation.vehicleInterest }
      );

      // Generate AI response to get strategy insights
      const messageContext: MessageContext = {
        leadId: conversation.leadId,
        leadName: conversation.leadName || 'Customer',
        latestMessage: conversation.lastMessage || '',
        conversationHistory,
        vehicleInterest: conversation.vehicleInterest || '',
        conversationMetadata: {
          totalMessages: conversationHistory.length,
          lastResponseTime: conversation.lastMessageDate?.toISOString(),
          appointmentHistory: [],
          leadSource: 'unknown',
          leadStatus: conversation.status
        }
      };

      const aiResponse = unifiedAIResponseEngine.generateResponse(messageContext);

      // Calculate metrics
      const buyingSignals = this.detectBuyingSignals(conversation.lastMessage, conversation.vehicleInterest);
      const urgencyAnalysis = this.analyzeUrgency(conversation);
      const sentiment = this.analyzeSentiment(conversation.lastMessage);

      const metrics: ConversationAIMetrics = {
        confidence: aiResponse.confidence,
        urgencyLevel: urgencyAnalysis.level,
        buyingSignals,
        nextBestAction: flowAnalysis.next_best_action,
        responseStrategy: aiResponse.responseStrategy,
        sentimentScore: sentiment.score,
        engagementScore: flowAnalysis.engagement_level
      };

      console.log('✅ [SMART-INBOX-AI] Calculated AI metrics:', {
        confidence: Math.round(metrics.confidence * 100) + '%',
        urgency: metrics.urgencyLevel,
        engagement: Math.round(metrics.engagementScore * 100) + '%',
        buyingSignals: metrics.buyingSignals.length
      });

      return metrics;

    } catch (error) {
      console.error('❌ [SMART-INBOX-AI] Error calculating metrics:', error);
      return {
        confidence: 0.5,
        urgencyLevel: 'medium',
        buyingSignals: [],
        nextBestAction: 'continue_conversation',
        responseStrategy: 'consultative',
        sentimentScore: 0.5,
        engagementScore: 0.5
      };
    }
  }

  async generateSmartResponse(conversation: ConversationListItem): Promise<UnifiedAIResponse> {
    try {
      console.log('🤖 [SMART-INBOX-AI] Generating smart response for conversation:', conversation.leadId);

      // Get recent conversation history
      const { data: messages } = await supabase
        .from('conversations')
        .select('body, direction, sent_at')
        .eq('lead_id', conversation.leadId)
        .order('sent_at', { ascending: true })
        .limit(10);

      const conversationHistory = messages?.map(m => `${m.direction === 'in' ? 'Customer' : 'You'}: ${m.body}`) || [];

      const messageContext: MessageContext = {
        leadId: conversation.leadId,
        leadName: conversation.leadName || 'Customer',
        latestMessage: conversation.lastMessage || '',
        conversationHistory,
        vehicleInterest: conversation.vehicleInterest || '',
        conversationMetadata: {
          totalMessages: conversationHistory.length,
          lastResponseTime: conversation.lastMessageDate?.toISOString(),
          appointmentHistory: [],
          leadSource: 'unknown',
          leadStatus: conversation.status
        }
      };

      const response = unifiedAIResponseEngine.generateResponse(messageContext);

      console.log(`✅ [SMART-INBOX-AI] Generated ${response.responseType} response with ${Math.round(response.confidence * 100)}% confidence`);
      return response;

    } catch (error) {
      console.error('❌ [SMART-INBOX-AI] Error generating smart response:', error);
      return {
        message: "Thanks for your message. I'll get back to you shortly with more information.",
        confidence: 0.5,
        responseType: 'general',
        intent: { primary: 'general_inquiry' },
        responseStrategy: 'fallback',
        reasoning: ['Fallback response due to processing error']
      };
    }
  }

  async prioritizeConversations(conversations: ConversationListItem[]): Promise<ConversationListItem[]> {
    try {
      console.log('⚡ [SMART-INBOX-AI] Prioritizing conversations with AI scoring');

      const scoredConversations = await Promise.all(
        conversations.map(async (conversation) => {
          const metrics = await this.getConversationAIMetrics(conversation);
          
          // Calculate priority score
          let priorityScore = 0;
          
          // Urgency weight
          if (metrics.urgencyLevel === 'high') priorityScore += 40;
          else if (metrics.urgencyLevel === 'medium') priorityScore += 20;
          
          // Buying signals weight
          priorityScore += metrics.buyingSignals.length * 15;
          
          // Engagement weight
          priorityScore += metrics.engagementScore * 25;
          
          // Unread messages weight
          priorityScore += (conversation.unreadCount || 0) * 5;
          
          // Recent activity weight
          const hoursSinceLastMessage = conversation.lastMessageDate ? 
            (Date.now() - conversation.lastMessageDate.getTime()) / (1000 * 60 * 60) : 48;
          if (hoursSinceLastMessage < 1) priorityScore += 20;
          else if (hoursSinceLastMessage < 4) priorityScore += 10;
          else if (hoursSinceLastMessage > 24) priorityScore -= 10;

          return {
            ...conversation,
            aiPriorityScore: Math.min(100, Math.max(0, priorityScore)),
            aiMetrics: metrics
          };
        })
      );

      // Sort by priority score
      const prioritized = scoredConversations.sort((a, b) => 
        (b.aiPriorityScore || 0) - (a.aiPriorityScore || 0)
      );

      console.log(`✅ [SMART-INBOX-AI] Prioritized ${prioritized.length} conversations`);
      return prioritized;

    } catch (error) {
      console.error('❌ [SMART-INBOX-AI] Error prioritizing conversations:', error);
      return conversations;
    }
  }

  private detectBuyingSignals(message: string, vehicleInterest?: string): string[] {
    if (!message) return [];

    const signals: string[] = [];
    const lowerMessage = message.toLowerCase();

    // Price inquiries
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('payment')) {
      signals.push('Price Inquiry');
    }

    // Scheduling intent
    if (lowerMessage.includes('schedule') || lowerMessage.includes('appointment') || lowerMessage.includes('visit') || lowerMessage.includes('see it')) {
      signals.push('Scheduling Interest');
    }

    // Availability checks
    if (lowerMessage.includes('available') || lowerMessage.includes('in stock') || lowerMessage.includes('still have')) {
      signals.push('Availability Check');
    }

    // Financing interest
    if (lowerMessage.includes('finance') || lowerMessage.includes('loan') || lowerMessage.includes('credit')) {
      signals.push('Financing Interest');
    }

    // Trade-in mentions
    if (lowerMessage.includes('trade') || lowerMessage.includes('exchange')) {
      signals.push('Trade-In Interest');
    }

    // Urgency indicators
    if (lowerMessage.includes('soon') || lowerMessage.includes('quickly') || lowerMessage.includes('asap')) {
      signals.push('Urgency Expressed');
    }

    return signals;
  }

  private analyzeUrgency(conversation: ConversationListItem): { 
    level: 'low' | 'medium' | 'high', 
    reason: string, 
    confidence: number 
  } {
    let urgencyScore = 0;
    let reasons: string[] = [];

    // Check unread count
    const unreadCount = conversation.unreadCount || 0;
    if (unreadCount > 3) {
      urgencyScore += 30;
      reasons.push(`${unreadCount} unread messages`);
    } else if (unreadCount > 1) {
      urgencyScore += 15;
      reasons.push('Multiple unread messages');
    }

    // Check time since last message
    const hoursSinceLastMessage = conversation.lastMessageDate ? 
      (Date.now() - conversation.lastMessageDate.getTime()) / (1000 * 60 * 60) : 48;

    if (hoursSinceLastMessage < 1) {
      urgencyScore += 25;
      reasons.push('Very recent activity');
    } else if (hoursSinceLastMessage > 24) {
      urgencyScore -= 10;
      reasons.push('Delayed response needed');
    }

    // Check message content for urgency
    const message = conversation.lastMessage?.toLowerCase() || '';
    if (message.includes('urgent') || message.includes('asap') || message.includes('quickly')) {
      urgencyScore += 40;
      reasons.push('Urgent language detected');
    }

    // Determine urgency level
    let level: 'low' | 'medium' | 'high' = 'low';
    if (urgencyScore >= 50) level = 'high';
    else if (urgencyScore >= 25) level = 'medium';

    return {
      level,
      reason: reasons.length > 0 ? reasons.join(', ') : 'Standard follow-up timing',
      confidence: Math.min(0.95, Math.max(0.3, urgencyScore / 100))
    };
  }

  private analyzeSentiment(message: string): {
    score: number,
    needsAttention: boolean,
    description: string,
    confidence: number,
    severity: 'low' | 'medium' | 'high'
  } {
    if (!message) {
      return { score: 0.5, needsAttention: false, description: 'Neutral', confidence: 0.5, severity: 'low' };
    }

    const lowerMessage = message.toLowerCase();
    let sentimentScore = 0.5; // Neutral baseline

    // Positive indicators
    const positiveWords = ['great', 'excellent', 'perfect', 'love', 'interested', 'excited', 'good', 'thanks'];
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    sentimentScore += positiveCount * 0.1;

    // Negative indicators
    const negativeWords = ['disappointed', 'frustrated', 'annoyed', 'upset', 'angry', 'terrible', 'awful', 'hate'];
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
    sentimentScore -= negativeCount * 0.2;

    // Concern indicators
    const concernWords = ['concern', 'worried', 'issue', 'problem', 'but', 'however'];
    const concernCount = concernWords.filter(word => lowerMessage.includes(word)).length;
    sentimentScore -= concernCount * 0.1;

    // Enthusiasm indicators
    if (lowerMessage.includes('!') || lowerMessage.includes('wow') || lowerMessage.includes('amazing')) {
      sentimentScore += 0.15;
    }

    // Normalize score
    sentimentScore = Math.min(1, Math.max(0, sentimentScore));

    const needsAttention = sentimentScore < 0.3 || negativeCount > 0;
    let description = 'Neutral sentiment';
    let severity: 'low' | 'medium' | 'high' = 'low';

    if (sentimentScore >= 0.7) {
      description = 'Positive sentiment detected';
    } else if (sentimentScore <= 0.3) {
      description = 'Negative sentiment - requires attention';
      severity = negativeCount > 1 ? 'high' : 'medium';
    } else if (concernCount > 0) {
      description = 'Customer has concerns - needs addressing';
      severity = 'medium';
    }

    return {
      score: sentimentScore,
      needsAttention,
      description,
      confidence: 0.75,
      severity
    };
  }

  private async generateActionRecommendation(conversation: ConversationListItem): Promise<{
    action: string,
    confidence: number
  }> {
    const buyingSignals = this.detectBuyingSignals(conversation.lastMessage, conversation.vehicleInterest);
    const urgencyAnalysis = this.analyzeUrgency(conversation);
    const unreadCount = conversation.unreadCount || 0;

    if (buyingSignals.includes('Scheduling Interest')) {
      return { action: 'Schedule a test drive or appointment', confidence: 0.9 };
    }

    if (buyingSignals.includes('Price Inquiry')) {
      return { action: 'Provide pricing and financing options', confidence: 0.85 };
    }

    if (urgencyAnalysis.level === 'high') {
      return { action: 'Respond immediately - high urgency detected', confidence: 0.8 };
    }

    if (unreadCount > 2) {
      return { action: 'Prioritize response - multiple messages waiting', confidence: 0.75 };
    }

    if (buyingSignals.length > 0) {
      return { action: 'Follow up on buying signals and provide more information', confidence: 0.7 };
    }

    return { action: 'Continue building rapport and identifying needs', confidence: 0.6 };
  }
}

export const smartInboxAIService = new SmartInboxAIService();