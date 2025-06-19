
import { supabase } from '@/integrations/supabase/client';
import { ConversationMemory, CustomerProfile, EmotionalContext, ConversationSession, BehavioralPattern } from './types';

export class MemoryStore {
  async loadMemoryFromDatabase(leadId: string): Promise<ConversationMemory> {
    try {
      const { data: memories } = await supabase
        .from('conversation_memory')
        .select('*')
        .eq('lead_id', leadId)
        .order('updated_at', { ascending: false });

      if (memories && memories.length > 0) {
        const enhancedMemory = memories.find(m => m.current_session_id) || memories[0];
        
        return {
          leadId,
          sessionId: enhancedMemory.current_session_id || this.generateSessionId(),
          conversationHistory: this.parseConversationHistory(enhancedMemory.conversation_history),
          customerProfile: this.parseCustomerProfile(enhancedMemory.customer_profile) || this.createDefaultProfile(leadId),
          behavioralPatterns: this.parseBehavioralPatterns(enhancedMemory.behavioral_patterns),
          emotionalContext: this.parseEmotionalContext(enhancedMemory.emotional_context) || this.createDefaultEmotionalContext(),
          lastUpdated: new Date(enhancedMemory.updated_at)
        };
      }
    } catch (error) {
      console.log('Creating new conversation memory for lead:', leadId);
    }

    return {
      leadId,
      sessionId: this.generateSessionId(),
      conversationHistory: [],
      customerProfile: this.createDefaultProfile(leadId),
      behavioralPatterns: [],
      emotionalContext: this.createDefaultEmotionalContext(),
      lastUpdated: new Date()
    };
  }

  async saveMemoryToDatabase(memory: ConversationMemory): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversation_memory')
        .upsert({
          lead_id: memory.leadId,
          memory_type: 'enhanced_context',
          content: JSON.stringify({
            sessionId: memory.sessionId,
            conversationHistory: memory.conversationHistory,
            customerProfile: memory.customerProfile,
            behavioralPatterns: memory.behavioralPatterns,
            emotionalContext: memory.emotionalContext
          }),
          current_session_id: memory.sessionId,
          conversation_history: memory.conversationHistory,
          customer_profile: memory.customerProfile,
          behavioral_patterns: memory.behavioralPatterns,
          emotional_context: memory.emotionalContext,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving conversation memory:', error);
      }
    } catch (error) {
      console.error('Error saving conversation memory:', error);
    }
  }

  private parseConversationHistory(data: any): ConversationSession[] {
    if (!data || !Array.isArray(data)) return [];
    
    return data.filter(this.isConversationSession);
  }

  private parseBehavioralPatterns(data: any): BehavioralPattern[] {
    if (!data || !Array.isArray(data)) return [];
    
    return data.filter(this.isBehavioralPattern);
  }

  private parseCustomerProfile(data: any): CustomerProfile | null {
    if (!data || typeof data !== 'object') return null;
    
    if (this.isCustomerProfile(data)) {
      return data;
    }
    
    return null;
  }

  private parseEmotionalContext(data: any): EmotionalContext | null {
    if (!data || typeof data !== 'object') return null;
    
    if (this.isEmotionalContext(data)) {
      return data;
    }
    
    return null;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isConversationSession(data: any): data is ConversationSession {
    return data && 
           typeof data === 'object' && 
           typeof data.sessionId === 'string' &&
           Array.isArray(data.messages);
  }

  private isBehavioralPattern(data: any): data is BehavioralPattern {
    return data && 
           typeof data === 'object' && 
           typeof data.patternType === 'string' &&
           typeof data.pattern === 'string';
  }

  private isCustomerProfile(data: any): data is CustomerProfile {
    return data && 
           typeof data === 'object' && 
           typeof data.leadId === 'string';
  }

  private isEmotionalContext(data: any): data is EmotionalContext {
    return data && 
           typeof data === 'object' && 
           typeof data.currentMood === 'string';
  }

  private createDefaultProfile(leadId: string): CustomerProfile {
    return {
      leadId,
      communicationStyle: 'casual',
      preferredTimes: [],
      responsePatterns: [],
      interests: [],
      painPoints: [],
      decisionFactors: [],
      urgencyLevel: 'medium'
    };
  }

  private createDefaultEmotionalContext(): EmotionalContext {
    return {
      currentMood: 'curious',
      stressLevel: 0.3,
      engagement: 0.5,
      satisfaction: 0.5,
      lastAnalysis: new Date()
    };
  }
}
