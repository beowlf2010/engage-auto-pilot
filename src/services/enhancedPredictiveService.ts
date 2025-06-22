
import { ConversationListItem, MessageData } from '@/types/conversation';
import { supabase } from '@/integrations/supabase/client';

export interface PredictionResult {
  leadId: string;
  predictionScore: number;
  shouldPreload: boolean;
  factors: string[];
  priority: 'urgent' | 'high' | 'normal' | 'low';
  estimatedOpenTime?: Date;
}

class EnhancedPredictiveService {
  private searchIndex = new Map<string, ConversationListItem>();
  private accessPatterns = new Map<string, { lastAccess: Date; frequency: number }>();
  private predictions: PredictionResult[] = [];

  async predictConversationsToPreload(
    conversations: ConversationListItem[],
    currentTime: Date,
    context?: { searchQuery?: string }
  ): Promise<PredictionResult[]> {
    console.log('🧠 [ENHANCED PREDICTIVE] Generating ML predictions for', conversations.length, 'conversations');

    const predictions: PredictionResult[] = [];

    for (const conv of conversations) {
      let score = 0;
      const factors: string[] = [];

      // Unread messages factor (highest priority)
      if (conv.unreadCount > 0) {
        score += conv.unreadCount * 0.4;
        factors.push(`${conv.unreadCount} unread`);
      }

      // Recent activity factor
      const hoursSinceLastMessage = (currentTime.getTime() - new Date(conv.lastMessageTime).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastMessage < 24) {
        score += Math.max(0, 0.3 - (hoursSinceLastMessage / 24) * 0.3);
        factors.push('recent activity');
      }

      // Response pattern factor
      if (conv.lastMessageDirection === 'in') {
        score += 0.25;
        factors.push('awaiting response');
      }

      // Access pattern factor
      const pattern = this.accessPatterns.get(conv.leadId);
      if (pattern) {
        const daysSinceAccess = (currentTime.getTime() - pattern.lastAccess.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceAccess < 1) {
          score += pattern.frequency * 0.1;
          factors.push('frequent access');
        }
      }

      // Search relevance factor
      if (context?.searchQuery) {
        const query = context.searchQuery.toLowerCase();
        if (conv.leadName.toLowerCase().includes(query) || 
            conv.vehicleInterest?.toLowerCase().includes(query)) {
          score += 0.2;
          factors.push('search match');
        }
      }

      // Determine priority and preload decision
      let priority: 'urgent' | 'high' | 'normal' | 'low' = 'low';
      let shouldPreload = false;

      if (score >= 0.7) {
        priority = 'urgent';
        shouldPreload = true;
      } else if (score >= 0.5) {
        priority = 'high';
        shouldPreload = true;
      } else if (score >= 0.3) {
        priority = 'normal';
        shouldPreload = conv.unreadCount > 0;
      }

      predictions.push({
        leadId: conv.leadId,
        predictionScore: score,
        shouldPreload,
        factors,
        priority,
        estimatedOpenTime: shouldPreload ? new Date(currentTime.getTime() + (score * 60000)) : undefined
      });
    }

    // Sort by prediction score
    predictions.sort((a, b) => b.predictionScore - a.predictionScore);
    
    this.predictions = predictions;
    console.log(`📊 [ENHANCED PREDICTIVE] Generated ${predictions.filter(p => p.shouldPreload).length} preload predictions`);
    
    return predictions;
  }

  async loadMessagesFromDatabase(leadId: string): Promise<MessageData[]> {
    const { data: messages, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true });

    if (error) throw error;

    return messages?.map(msg => ({
      id: msg.id,
      leadId: msg.lead_id,
      direction: msg.direction as 'in' | 'out',
      body: msg.body,
      sentAt: msg.sent_at,
      readAt: msg.read_at,
      aiGenerated: msg.ai_generated || false,
      smsStatus: msg.sms_status || 'sent',
      smsError: msg.sms_error
    })) || [];
  }

  updateSearchIndex(conversations: ConversationListItem[]) {
    this.searchIndex.clear();
    conversations.forEach(conv => {
      this.searchIndex.set(conv.leadId, conv);
    });
  }

  searchConversations(query: string, limit = 10): ConversationListItem[] {
    const results: ConversationListItem[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [, conv] of this.searchIndex) {
      if (conv.leadName.toLowerCase().includes(lowerQuery) ||
          conv.vehicleInterest?.toLowerCase().includes(lowerQuery) ||
          conv.primaryPhone.includes(lowerQuery)) {
        results.push(conv);
      }
      
      if (results.length >= limit) break;
    }

    return results;
  }

  trackConversationAccess(leadId: string, conversationId: string, timeSpent?: number, context?: any) {
    const pattern = this.accessPatterns.get(leadId) || { lastAccess: new Date(), frequency: 0 };
    pattern.lastAccess = new Date();
    pattern.frequency += 1;
    this.accessPatterns.set(leadId, pattern);
  }

  getPredictionInsights() {
    const totalPredictions = this.predictions.length;
    const preloadPredictions = this.predictions.filter(p => p.shouldPreload);
    
    return {
      totalPredictions,
      preloadPredictions: preloadPredictions.length,
      avgScore: totalPredictions > 0 ? this.predictions.reduce((sum, p) => sum + p.predictionScore, 0) / totalPredictions : 0,
      priorityDistribution: {
        urgent: this.predictions.filter(p => p.priority === 'urgent').length,
        high: this.predictions.filter(p => p.priority === 'high').length,
        normal: this.predictions.filter(p => p.priority === 'normal').length,
        low: this.predictions.filter(p => p.priority === 'low').length
      }
    };
  }
}

export const enhancedPredictiveService = new EnhancedPredictiveService();
