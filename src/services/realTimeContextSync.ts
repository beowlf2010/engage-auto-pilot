
import { supabase } from '@/integrations/supabase/client';
import { enhancedContextEngine } from './finnAI/context/contextEngine';
import { customerJourneyTracker } from './finnAI/customerJourneyTracker';
import { contextualAIAssistant } from './contextualAIAssistant';

export interface ContextSyncEvent {
  leadId: string;
  eventType: 'message_received' | 'message_sent' | 'ai_analysis' | 'journey_update';
  eventData: any;
  timestamp: Date;
}

class RealTimeContextSyncService {
  private activeSubscriptions = new Map<string, any>();

  async startContextSync(leadId: string): Promise<void> {
    console.log('🔄 Starting real-time context sync for lead:', leadId);

    // Subscribe to conversation changes
    const conversationChannel = supabase
      .channel(`context-sync-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `lead_id=eq.${leadId}`
        },
        async (payload) => {
          await this.handleNewMessage(leadId, payload.new as any);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_memory',
          filter: `lead_id=eq.${leadId}`
        },
        async (payload) => {
          await this.handleMemoryUpdate(leadId, payload.new as any);
        }
      )
      .subscribe();

    this.activeSubscriptions.set(leadId, conversationChannel);
  }

  async stopContextSync(leadId: string): Promise<void> {
    console.log('⏹️ Stopping context sync for lead:', leadId);
    
    const subscription = this.activeSubscriptions.get(leadId);
    if (subscription) {
      await supabase.removeChannel(subscription);
      this.activeSubscriptions.delete(leadId);
    }
  }

  private async handleNewMessage(leadId: string, message: any): Promise<void> {
    try {
      console.log('📨 Syncing new message context for lead:', leadId);

      // Process message through context engine
      await enhancedContextEngine.processMessage(
        leadId,
        message.body,
        message.direction,
        message.id
      );

      // Track touchpoint in customer journey
      await customerJourneyTracker.trackTouchpoint(
        leadId,
        message.direction === 'in' ? 'customer_message' : 'agent_message',
        'sms',
        {
          messageId: message.id,
          content: message.body,
          aiGenerated: message.ai_generated
        },
        this.detectMessageOutcome(message.body)
      );

      // Trigger AI analysis for incoming messages
      if (message.direction === 'in') {
        await this.triggerContextualAnalysis(leadId, message.body);
      }

      // Broadcast context update
      await this.broadcastContextUpdate(leadId, {
        eventType: message.direction === 'in' ? 'message_received' : 'message_sent',
        eventData: {
          messageId: message.id,
          messageBody: message.body,
          aiGenerated: message.ai_generated
        },
        timestamp: new Date(message.sent_at)
      });

    } catch (error) {
      console.error('❌ Error handling new message context sync:', error);
    }
  }

  private async handleMemoryUpdate(leadId: string, memoryData: any): Promise<void> {
    try {
      console.log('🧠 Syncing memory update for lead:', leadId);

      // Update customer journey based on memory changes
      if (memoryData.memory_type === 'behavioral_pattern') {
        await customerJourneyTracker.trackTouchpoint(
          leadId,
          'behavior_update',
          'system',
          {
            pattern: memoryData.content,
            confidence: memoryData.confidence
          },
          'neutral'
        );
      }

      // Broadcast memory update
      await this.broadcastContextUpdate(leadId, {
        eventType: 'journey_update',
        eventData: {
          memoryType: memoryData.memory_type,
          content: memoryData.content,
          confidence: memoryData.confidence
        },
        timestamp: new Date(memoryData.updated_at)
      });

    } catch (error) {
      console.error('❌ Error handling memory update sync:', error);
    }
  }

  private async triggerContextualAnalysis(leadId: string, messageBody: string): Promise<void> {
    try {
      // Get recent conversation history
      const { data: recentMessages } = await supabase
        .from('conversations')
        .select('body, direction, sent_at')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(10);

      if (recentMessages) {
        const conversationHistory = recentMessages
          .reverse()
          .map(m => `${m.direction === 'in' ? 'Customer' : 'Agent'}: ${m.body}`)
          .join('\n');

        // Analyze conversation context
        const insights = await contextualAIAssistant.analyzeConversationContext(
          leadId,
          conversationHistory,
          messageBody
        );

        // Broadcast AI analysis results
        await this.broadcastContextUpdate(leadId, {
          eventType: 'ai_analysis',
          eventData: {
            insights,
            messageAnalyzed: messageBody
          },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('❌ Error triggering contextual analysis:', error);
    }
  }

  private async broadcastContextUpdate(leadId: string, event: ContextSyncEvent): Promise<void> {
    try {
      // Store context update in database for persistence
      await supabase
        .from('ai_conversation_context')
        .upsert({
          lead_id: leadId,
          last_interaction_type: event.eventType,
          context_score: this.calculateContextScore(event),
          updated_at: new Date().toISOString()
        });

      // Broadcast to all connected clients
      const broadcastChannel = supabase.channel(`context-updates-${leadId}`);
      await broadcastChannel.send({
        type: 'broadcast',
        event: 'context_update',
        payload: event
      });

      console.log('📡 Broadcasted context update for lead:', leadId);
    } catch (error) {
      console.error('❌ Error broadcasting context update:', error);
    }
  }

  private detectMessageOutcome(messageBody: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['yes', 'interested', 'great', 'good', 'thanks', 'thank you'];
    const negativeWords = ['no', 'not interested', 'stop', 'unsubscribe', 'cancel'];
    
    const lowerBody = messageBody.toLowerCase();
    
    if (positiveWords.some(word => lowerBody.includes(word))) {
      return 'positive';
    }
    
    if (negativeWords.some(word => lowerBody.includes(word))) {
      return 'negative';
    }
    
    return 'neutral';
  }

  private calculateContextScore(event: ContextSyncEvent): number {
    // Simple scoring based on event type and content
    switch (event.eventType) {
      case 'message_received':
        return event.eventData.messageBody?.length > 20 ? 85 : 70;
      case 'message_sent':
        return event.eventData.aiGenerated ? 75 : 80;
      case 'ai_analysis':
        return event.eventData.insights?.leadTemperature || 60;
      case 'journey_update':
        return event.eventData.confidence * 100 || 70;
      default:
        return 60;
    }
  }

  async getContextSyncStatus(leadId: string): Promise<{
    isActive: boolean;
    lastSync: Date | null;
    contextScore: number;
  }> {
    const isActive = this.activeSubscriptions.has(leadId);
    
    const { data: contextData } = await supabase
      .from('ai_conversation_context')
      .select('updated_at, context_score')
      .eq('lead_id', leadId)
      .single();

    return {
      isActive,
      lastSync: contextData?.updated_at ? new Date(contextData.updated_at) : null,
      contextScore: contextData?.context_score || 0
    };
  }
}

export const realTimeContextSync = new RealTimeContextSyncService();
