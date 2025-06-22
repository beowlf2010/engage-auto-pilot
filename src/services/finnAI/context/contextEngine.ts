
import { supabase } from '@/integrations/supabase/client';

export interface ContextualInsights {
  communicationStyle: 'formal' | 'casual' | 'technical';
  emotionalState: 'positive' | 'neutral' | 'frustrated' | 'excited';
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  preferences: any;
  patterns: any[];
}

class EnhancedContextEngine {
  async processMessage(leadId: string, message: string, direction: 'in' | 'out', messageId?: string): Promise<void> {
    try {
      console.log('🧠 Processing message through enhanced context engine');
      
      // Store message in conversation memory
      await this.updateConversationMemory(leadId, {
        messageId,
        content: message,
        direction,
        timestamp: new Date().toISOString(),
        analysis: this.analyzeMessage(message)
      });
      
    } catch (error) {
      console.error('❌ Error processing message in context engine:', error);
    }
  }

  async getContextualInsights(leadId: string): Promise<ContextualInsights> {
    try {
      // Get conversation memory
      const { data: memory } = await supabase
        .from('conversation_memory')
        .select('*')
        .eq('lead_id', leadId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (memory) {
        // Safe JSON access with type checking
        const customerProfile = this.safeJsonAccess(memory.customer_profile) || {};
        const emotionalContext = this.safeJsonAccess(memory.emotional_context) || {};
        const behavioralPatterns = this.safeJsonAccess(memory.behavioral_patterns) || {};

        return {
          communicationStyle: customerProfile.communicationStyle || 'casual',
          emotionalState: emotionalContext.currentState || 'neutral',
          urgencyLevel: behavioralPatterns.urgencyLevel || 'medium',
          preferences: customerProfile.preferences || {},
          patterns: Array.isArray(behavioralPatterns.patterns) ? behavioralPatterns.patterns : []
        };
      }

      // Return default insights
      return {
        communicationStyle: 'casual',
        emotionalState: 'neutral',
        urgencyLevel: 'medium',
        preferences: {},
        patterns: []
      };
    } catch (error) {
      console.error('❌ Error getting contextual insights:', error);
      return {
        communicationStyle: 'casual',
        emotionalState: 'neutral',
        urgencyLevel: 'medium',
        preferences: {},
        patterns: []
      };
    }
  }

  private safeJsonAccess(jsonData: any): any {
    try {
      if (typeof jsonData === 'string') {
        return JSON.parse(jsonData);
      }
      if (typeof jsonData === 'object' && jsonData !== null) {
        return jsonData;
      }
      return {};
    } catch (error) {
      console.warn('Failed to parse JSON data:', error);
      return {};
    }
  }

  private async updateConversationMemory(leadId: string, messageData: any): Promise<void> {
    try {
      const { data: existingMemory } = await supabase
        .from('conversation_memory')
        .select('*')
        .eq('lead_id', leadId)
        .single();

      if (existingMemory) {
        // Update existing memory
        const existingHistory = this.safeJsonAccess(existingMemory.conversation_history) || [];
        const updatedHistory = Array.isArray(existingHistory) ? [...existingHistory, messageData] : [messageData];
        
        await supabase
          .from('conversation_memory')
          .update({
            conversation_history: updatedHistory,
            updated_at: new Date().toISOString()
          })
          .eq('lead_id', leadId);
      } else {
        // Create new memory record
        await supabase
          .from('conversation_memory')
          .insert({
            lead_id: leadId,
            memory_type: 'conversation',
            content: 'Conversation memory initialized',
            conversation_history: [messageData],
            customer_profile: {},
            behavioral_patterns: {},
            emotional_context: {}
          });
      }
    } catch (error) {
      console.error('❌ Error updating conversation memory:', error);
    }
  }

  private analyzeMessage(message: string): any {
    return {
      length: message.length,
      sentiment: this.detectSentiment(message),
      urgency: this.detectUrgency(message),
      style: this.detectStyle(message)
    };
  }

  private detectSentiment(message: string): string {
    const positiveWords = ['great', 'love', 'excellent', 'perfect', 'amazing'];
    const negativeWords = ['bad', 'hate', 'terrible', 'awful', 'frustrated'];
    
    const lowerMessage = message.toLowerCase();
    
    if (positiveWords.some(word => lowerMessage.includes(word))) return 'positive';
    if (negativeWords.some(word => lowerMessage.includes(word))) return 'negative';
    return 'neutral';
  }

  private detectUrgency(message: string): string {
    const urgentWords = ['urgent', 'asap', 'immediately', 'now', 'emergency'];
    const lowerMessage = message.toLowerCase();
    
    if (urgentWords.some(word => lowerMessage.includes(word))) return 'high';
    if (message.includes('!') || message.includes('?')) return 'medium';
    return 'low';
  }

  private detectStyle(message: string): string {
    if (message.length > 100 && !message.includes("'")) return 'formal';
    if (message.includes('lol') || message.includes('haha')) return 'casual';
    return 'neutral';
  }
}

export const enhancedContextEngine = new EnhancedContextEngine();
