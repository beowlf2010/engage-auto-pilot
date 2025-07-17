
import { supabase } from '@/integrations/supabase/client';

interface AIGuardResult {
  shouldRespond: boolean;
  reason: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface MessageContext {
  messageBody: string;
  leadId: string;
  conversationHistory: string[];
  timeSinceLastMessage: number;
  isQuestion: boolean;
  containsUrgentKeywords: boolean;
}

class OptimizedAIGuard {
  private urgentKeywords = [
    'urgent', 'asap', 'emergency', 'immediately', 'right now',
    'today', 'tonight', 'this morning', 'this afternoon',
    'appointment', 'test drive', 'ready to buy', 'financing',
    'price', 'payment', 'available', 'in stock'
  ];

  private questionIndicators = [
    '?', 'what', 'how', 'when', 'where', 'why', 'who',
    'can you', 'could you', 'would you', 'do you', 'are you',
    'is there', 'tell me', 'let me know', 'i want to know'
  ];

  private inventoryKeywords = [
    'available', 'stock', 'inventory', 'have', 'see', 'show',
    '2024', '2025', '2026', 'model', 'car', 'vehicle', 'truck', 'suv'
  ];

  async shouldAIRespond(leadId: string, messageBody: string): Promise<AIGuardResult> {
    try {
      console.log('🛡️ [AI GUARD] Evaluating message for AI response:', leadId);
      
      // Get conversation context
      const context = await this.buildMessageContext(leadId, messageBody);
      
      // Apply multiple filters to determine if AI should respond
      const filters = [
        this.checkRecentActivity(context),
        this.checkMessageType(context),
        this.checkUrgency(context),
        this.checkConversationFlow(context),
        this.checkAIOptInStatus(leadId)
      ];

      const filterResults = await Promise.all(filters);
      
      // Calculate overall score
      const scores = filterResults.map(r => r.confidence);
      const averageConfidence = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      // Determine if AI should respond
      const shouldRespond = filterResults.every(r => r.shouldRespond) && averageConfidence > 0.6;
      
      // Determine priority
      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'low';
      if (context.containsUrgentKeywords) priority = 'urgent';
      else if (context.isQuestion) priority = 'high';
      else if (averageConfidence > 0.8) priority = 'medium';

      const result: AIGuardResult = {
        shouldRespond,
        reason: this.buildReason(filterResults, context),
        confidence: averageConfidence,
        priority
      };

      console.log('🛡️ [AI GUARD] Decision:', result);
      return result;

    } catch (error) {
      console.error('❌ [AI GUARD] Error:', error);
      return {
        shouldRespond: false,
        reason: 'Error in AI guard evaluation',
        confidence: 0,
        priority: 'low'
      };
    }
  }

  private async buildMessageContext(leadId: string, messageBody: string): Promise<MessageContext> {
    // Get recent conversation history
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false })
      .limit(10);

    const conversationHistory = conversations?.map(c => c.body) || [];
    
    // Check if there's a recent outgoing message
    const lastOutgoingMessage = conversations?.find(c => c.direction === 'out');
    const timeSinceLastMessage = lastOutgoingMessage 
      ? Date.now() - new Date(lastOutgoingMessage.sent_at).getTime()
      : Infinity;

    const messageBodyLower = messageBody.toLowerCase();
    
    return {
      messageBody,
      leadId,
      conversationHistory,
      timeSinceLastMessage,
      isQuestion: this.questionIndicators.some(indicator => messageBodyLower.includes(indicator)),
      containsUrgentKeywords: this.urgentKeywords.some(keyword => messageBodyLower.includes(keyword))
    };
  }

  private checkRecentActivity(context: MessageContext): Promise<{ shouldRespond: boolean; confidence: number; reason: string }> {
    // Don't respond if we just sent a message recently (within 5 minutes)
    const recentThreshold = 5 * 60 * 1000; // 5 minutes
    
    if (context.timeSinceLastMessage < recentThreshold) {
      return Promise.resolve({
        shouldRespond: false,
        confidence: 0.9,
        reason: 'Recent outgoing message sent'
      });
    }

    return Promise.resolve({
      shouldRespond: true,
      confidence: 0.8,
      reason: 'No recent activity conflict'
    });
  }

  private checkMessageType(context: MessageContext): Promise<{ shouldRespond: boolean; confidence: number; reason: string }> {
    const messageBodyLower = context.messageBody.toLowerCase();
    
    // High priority for questions
    if (context.isQuestion) {
      return Promise.resolve({
        shouldRespond: true,
        confidence: 0.9,
        reason: 'Customer asked a question'
      });
    }

    // High priority for inventory inquiries
    if (this.inventoryKeywords.some(keyword => messageBodyLower.includes(keyword))) {
      return Promise.resolve({
        shouldRespond: true,
        confidence: 0.85,
        reason: 'Inventory-related inquiry'
      });
    }

    // Medium priority for general inquiries
    if (context.messageBody.length > 20) {
      return Promise.resolve({
        shouldRespond: true,
        confidence: 0.6,
        reason: 'Substantial message content'
      });
    }

    return Promise.resolve({
      shouldRespond: false,
      confidence: 0.3,
      reason: 'Low-priority message type'
    });
  }

  private checkUrgency(context: MessageContext): Promise<{ shouldRespond: boolean; confidence: number; reason: string }> {
    if (context.containsUrgentKeywords) {
      return Promise.resolve({
        shouldRespond: true,
        confidence: 0.95,
        reason: 'Urgent keywords detected'
      });
    }

    return Promise.resolve({
      shouldRespond: true,
      confidence: 0.5,
      reason: 'No urgency indicators'
    });
  }

  private checkConversationFlow(context: MessageContext): Promise<{ shouldRespond: boolean; confidence: number; reason: string }> {
    // Check if conversation is active (messages in last 24 hours)
    const hasRecentActivity = context.conversationHistory.length > 0;
    
    if (hasRecentActivity) {
      return Promise.resolve({
        shouldRespond: true,
        confidence: 0.7,
        reason: 'Active conversation thread'
      });
    }

    return Promise.resolve({
      shouldRespond: true,
      confidence: 0.4,
      reason: 'New or dormant conversation'
    });
  }

  private async checkAIOptInStatus(leadId: string): Promise<{ shouldRespond: boolean; confidence: number; reason: string }> {
    const { data: lead } = await supabase
      .from('leads')
      .select('ai_opt_in, status')
      .eq('id', leadId)
      .single();

    // Don't send AI messages to leads marked as lost, closed, or sold
    if (lead?.status && ['lost', 'closed', 'sold'].includes(lead.status.toLowerCase())) {
      return {
        shouldRespond: false,
        confidence: 1.0,
        reason: `Lead is marked as ${lead.status} - no further AI messaging needed`
      };
    }

    if (lead?.ai_opt_in === false) {
      return {
        shouldRespond: false,
        confidence: 1.0,
        reason: 'AI opt-out enabled for this lead'
      };
    }

    return {
      shouldRespond: true,
      confidence: 0.8,
      reason: 'AI responses enabled'
    };
  }

  private buildReason(filterResults: any[], context: MessageContext): string {
    const reasons = filterResults.map(r => r.reason).filter(r => r);
    
    if (context.isQuestion && context.containsUrgentKeywords) {
      return 'Urgent question requires immediate response';
    } else if (context.isQuestion) {
      return 'Customer question needs response';
    } else if (context.containsUrgentKeywords) {
      return 'Urgent message detected';
    }
    
    return reasons.join('; ');
  }
}

export const optimizedAIGuard = new OptimizedAIGuard();
