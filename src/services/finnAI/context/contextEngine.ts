
import { ConversationMemory, SessionMessage } from './types';
import { MessageAnalyzer } from './messageAnalyzer';
import { BehavioralTracker } from './behavioralTracker';
import { EmotionalProcessor } from './emotionalProcessor';
import { ProfileManager } from './profileManager';
import { MemoryStore } from './memoryStore';

class EnhancedContextEngine {
  private memoryCache = new Map<string, ConversationMemory>();
  private messageAnalyzer = new MessageAnalyzer();
  private behavioralTracker = new BehavioralTracker();
  private emotionalProcessor = new EmotionalProcessor();
  private profileManager = new ProfileManager();
  private memoryStore = new MemoryStore();

  async getConversationMemory(leadId: string): Promise<ConversationMemory> {
    if (this.memoryCache.has(leadId)) {
      return this.memoryCache.get(leadId)!;
    }

    const memory = await this.memoryStore.loadMemoryFromDatabase(leadId);
    this.memoryCache.set(leadId, memory);
    return memory;
  }

  async processMessage(
    leadId: string,
    messageContent: string,
    direction: 'in' | 'out',
    sessionId?: string
  ): Promise<void> {
    const memory = await this.getConversationMemory(leadId);
    const currentSession = sessionId || this.generateSessionId();

    const analysis = await this.messageAnalyzer.analyzeMessage(messageContent);
    
    const sessionMessage: SessionMessage = {
      id: `msg_${Date.now()}`,
      content: messageContent,
      direction,
      timestamp: new Date(),
      sentiment: analysis.sentiment,
      intent: analysis.intent,
      emotionalTone: analysis.emotionalTone
    };

    let session = memory.conversationHistory.find(s => s.sessionId === currentSession);
    if (!session) {
      session = {
        sessionId: currentSession,
        startTime: new Date(),
        messages: [],
        sentiment: 'neutral',
        topics: []
      };
      memory.conversationHistory.push(session);
    }

    session.messages.push(sessionMessage);
    session.topics = [...new Set([...session.topics, ...analysis.topics])];
    session.sentiment = this.calculateSessionSentiment(session.messages);

    if (direction === 'in') {
      this.behavioralTracker.updateBehavioralPatterns(memory, sessionMessage);
    }

    memory.emotionalContext = this.emotionalProcessor.updateEmotionalContext(memory.emotionalContext, sessionMessage);
    this.profileManager.updateCustomerProfile(memory.customerProfile, sessionMessage, analysis);

    await this.memoryStore.saveMemoryToDatabase(memory);
    this.memoryCache.set(leadId, memory);
  }

  async getContextualInsights(leadId: string): Promise<{
    communicationStyle: string;
    emotionalState: string;
    recentPatterns: string[];
    recommendedTone: string;
    urgencyLevel: string;
  }> {
    const memory = await this.getConversationMemory(leadId);
    
    const recentPatterns = memory.behavioralPatterns
      .filter(p => p.confidence > 0.5)
      .map(p => p.pattern);

    let recommendedTone = 'professional';
    if (memory.emotionalContext.currentMood === 'excited') recommendedTone = 'enthusiastic';
    else if (memory.emotionalContext.currentMood === 'frustrated') recommendedTone = 'empathetic';
    else if (memory.customerProfile.communicationStyle === 'casual') recommendedTone = 'friendly';

    return {
      communicationStyle: memory.customerProfile.communicationStyle,
      emotionalState: memory.emotionalContext.currentMood,
      recentPatterns,
      recommendedTone,
      urgencyLevel: memory.customerProfile.urgencyLevel
    };
  }

  private calculateSessionSentiment(messages: SessionMessage[]): 'positive' | 'neutral' | 'negative' {
    const avgSentiment = messages.reduce((sum, msg) => sum + msg.sentiment, 0) / messages.length;
    if (avgSentiment > 0.2) return 'positive';
    if (avgSentiment < -0.2) return 'negative';
    return 'neutral';
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const enhancedContextEngine = new EnhancedContextEngine();
