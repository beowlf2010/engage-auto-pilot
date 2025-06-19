import { supabase } from '@/integrations/supabase/client';

export interface ConversationMemory {
  leadId: string;
  sessionId: string;
  conversationHistory: ConversationSession[];
  customerProfile: CustomerProfile;
  behavioralPatterns: BehavioralPattern[];
  emotionalContext: EmotionalContext;
  lastUpdated: Date;
}

export interface ConversationSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  messages: SessionMessage[];
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
  outcome?: 'conversion' | 'follow_up' | 'abandoned';
}

export interface SessionMessage {
  id: string;
  content: string;
  direction: 'in' | 'out';
  timestamp: Date;
  sentiment: number; // -1 to 1
  intent: string;
  emotionalTone: string;
}

export interface CustomerProfile {
  leadId: string;
  communicationStyle: 'formal' | 'casual' | 'technical' | 'direct';
  preferredTimes: number[];
  responsePatterns: ResponsePattern[];
  interests: string[];
  painPoints: string[];
  decisionFactors: string[];
  urgencyLevel: 'low' | 'medium' | 'high';
}

export interface BehavioralPattern {
  patternType: 'response_time' | 'question_frequency' | 'engagement_level' | 'decision_stage';
  pattern: string;
  confidence: number;
  firstObserved: Date;
  lastObserved: Date;
  frequency: number;
}

export interface EmotionalContext {
  currentMood: 'excited' | 'frustrated' | 'curious' | 'hesitant' | 'confident';
  stressLevel: number; // 0-1
  engagement: number; // 0-1
  satisfaction: number; // 0-1
  lastAnalysis: Date;
}

export interface ResponsePattern {
  timeToRespond: number; // minutes
  messageLength: number;
  questionCount: number;
  timestamp: Date;
}

// Type guard functions
const isConversationSessionArray = (data: any): data is ConversationSession[] => {
  return Array.isArray(data);
};

const isCustomerProfile = (data: any): data is CustomerProfile => {
  return data && typeof data === 'object';
};

const isBehavioralPatternArray = (data: any): data is BehavioralPattern[] => {
  return Array.isArray(data);
};

const isEmotionalContext = (data: any): data is EmotionalContext => {
  return data && typeof data === 'object';
};

class EnhancedContextEngine {
  private memoryCache = new Map<string, ConversationMemory>();

  // Initialize or retrieve conversation memory for a lead
  async getConversationMemory(leadId: string): Promise<ConversationMemory> {
    // Check cache first
    if (this.memoryCache.has(leadId)) {
      return this.memoryCache.get(leadId)!;
    }

    // Load from database
    const memory = await this.loadMemoryFromDatabase(leadId);
    this.memoryCache.set(leadId, memory);
    return memory;
  }

  // Process new message and update context
  async processMessage(
    leadId: string,
    messageContent: string,
    direction: 'in' | 'out',
    sessionId?: string
  ): Promise<void> {
    const memory = await this.getConversationMemory(leadId);
    const currentSession = sessionId || this.generateSessionId();

    // Analyze message sentiment and intent
    const analysis = await this.analyzeMessage(messageContent);
    
    // Create session message
    const sessionMessage: SessionMessage = {
      id: `msg_${Date.now()}`,
      content: messageContent,
      direction,
      timestamp: new Date(),
      sentiment: analysis.sentiment,
      intent: analysis.intent,
      emotionalTone: analysis.emotionalTone
    };

    // Update or create session
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

    // Update behavioral patterns
    if (direction === 'in') {
      await this.updateBehavioralPatterns(memory, sessionMessage);
    }

    // Update emotional context
    memory.emotionalContext = await this.updateEmotionalContext(memory, sessionMessage);

    // Update customer profile
    await this.updateCustomerProfile(memory, sessionMessage, analysis);

    // Save to database and cache
    await this.saveMemoryToDatabase(memory);
    this.memoryCache.set(leadId, memory);
  }

  // Analyze message for sentiment, intent, and emotional tone
  private async analyzeMessage(content: string): Promise<{
    sentiment: number;
    intent: string;
    emotionalTone: string;
    topics: string[];
  }> {
    // Simple sentiment analysis (would use AI service in production)
    const positiveWords = ['great', 'love', 'excellent', 'perfect', 'amazing', 'interested', 'yes'];
    const negativeWords = ['bad', 'hate', 'terrible', 'awful', 'no', 'not interested', 'cancel'];
    
    const words = content.toLowerCase().split(' ');
    const positiveCount = words.filter(w => positiveWords.includes(w)).length;
    const negativeCount = words.filter(w => negativeWords.includes(w)).length;
    
    const sentiment = positiveCount > negativeCount ? 0.7 : 
                     negativeCount > positiveCount ? -0.7 : 0;

    // Intent detection
    let intent = 'general';
    if (content.includes('?')) intent = 'question';
    if (content.toLowerCase().includes('price')) intent = 'pricing_inquiry';
    if (content.toLowerCase().includes('schedule') || content.toLowerCase().includes('appointment')) intent = 'scheduling';
    if (content.toLowerCase().includes('buy') || content.toLowerCase().includes('purchase')) intent = 'purchase_intent';

    // Emotional tone
    let emotionalTone = 'neutral';
    if (positiveCount > 0) emotionalTone = 'positive';
    if (negativeCount > 0) emotionalTone = 'negative';
    if (content.includes('!')) emotionalTone = 'excited';
    if (content.includes('?') && words.length > 10) emotionalTone = 'curious';

    // Topic extraction
    const vehicleWords = ['car', 'truck', 'suv', 'sedan', 'honda', 'toyota', 'ford', 'tesla'];
    const topics = words.filter(w => vehicleWords.includes(w));

    return { sentiment, intent, emotionalTone, topics };
  }

  // Update behavioral patterns based on message
  private async updateBehavioralPatterns(
    memory: ConversationMemory,
    message: SessionMessage
  ): Promise<void> {
    // Response time pattern
    const lastOutgoingMessage = memory.conversationHistory
      .flatMap(s => s.messages)
      .filter(m => m.direction === 'out')
      .slice(-1)[0];

    if (lastOutgoingMessage) {
      const responseTime = (message.timestamp.getTime() - lastOutgoingMessage.timestamp.getTime()) / (1000 * 60);
      
      let responsePattern = memory.behavioralPatterns.find(p => p.patternType === 'response_time');
      if (!responsePattern) {
        responsePattern = {
          patternType: 'response_time',
          pattern: `avg_${responseTime.toFixed(0)}_minutes`,
          confidence: 0.1,
          firstObserved: new Date(),
          lastObserved: new Date(),
          frequency: 1
        };
        memory.behavioralPatterns.push(responsePattern);
      } else {
        responsePattern.lastObserved = new Date();
        responsePattern.frequency++;
        responsePattern.confidence = Math.min(1, responsePattern.confidence + 0.1);
      }
    }

    // Question frequency pattern
    if (message.content.includes('?')) {
      let questionPattern = memory.behavioralPatterns.find(p => p.patternType === 'question_frequency');
      if (!questionPattern) {
        questionPattern = {
          patternType: 'question_frequency',
          pattern: 'high_question_frequency',
          confidence: 0.2,
          firstObserved: new Date(),
          lastObserved: new Date(),
          frequency: 1
        };
        memory.behavioralPatterns.push(questionPattern);
      } else {
        questionPattern.frequency++;
        questionPattern.lastObserved = new Date();
        questionPattern.confidence = Math.min(1, questionPattern.confidence + 0.1);
      }
    }
  }

  // Update emotional context
  private async updateEmotionalContext(
    memory: ConversationMemory,
    message: SessionMessage
  ): Promise<EmotionalContext> {
    const current = memory.emotionalContext;
    
    // Update mood based on sentiment and tone
    let currentMood: EmotionalContext['currentMood'] = 'curious';
    if (message.sentiment > 0.5) currentMood = 'excited';
    else if (message.sentiment < -0.5) currentMood = 'frustrated';
    else if (message.emotionalTone === 'curious') currentMood = 'curious';
    else if (message.intent === 'purchase_intent') currentMood = 'confident';

    // Update engagement based on message length and frequency
    const engagement = Math.min(1, message.content.length / 100 + (current.engagement || 0.5));
    
    return {
      currentMood,
      stressLevel: message.sentiment < -0.3 ? 0.7 : 0.3,
      engagement,
      satisfaction: (current.satisfaction || 0.5) + (message.sentiment * 0.1),
      lastAnalysis: new Date()
    };
  }

  // Update customer profile
  private async updateCustomerProfile(
    memory: ConversationMemory,
    message: SessionMessage,
    analysis: any
  ): Promise<void> {
    const profile = memory.customerProfile;
    
    // Update communication style
    if (message.content.length > 100) {
      profile.communicationStyle = 'technical';
    } else if (message.content.includes('please') || message.content.includes('thank you')) {
      profile.communicationStyle = 'formal';
    } else {
      profile.communicationStyle = 'casual';
    }

    // Add to interests if vehicle mentioned
    analysis.topics.forEach((topic: string) => {
      if (!profile.interests.includes(topic)) {
        profile.interests.push(topic);
      }
    });

    // Update response patterns
    const responsePattern: ResponsePattern = {
      timeToRespond: 0, // Will be calculated from actual response times
      messageLength: message.content.length,
      questionCount: (message.content.match(/\?/g) || []).length,
      timestamp: new Date()
    };
    
    profile.responsePatterns.push(responsePattern);
    
    // Keep only last 20 patterns
    if (profile.responsePatterns.length > 20) {
      profile.responsePatterns = profile.responsePatterns.slice(-20);
    }
  }

  // Calculate session sentiment
  private calculateSessionSentiment(messages: SessionMessage[]): 'positive' | 'neutral' | 'negative' {
    const avgSentiment = messages.reduce((sum, msg) => sum + msg.sentiment, 0) / messages.length;
    if (avgSentiment > 0.2) return 'positive';
    if (avgSentiment < -0.2) return 'negative';
    return 'neutral';
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Load memory from database - working with existing conversation_memory table
  private async loadMemoryFromDatabase(leadId: string): Promise<ConversationMemory> {
    try {
      // Query the updated conversation_memory table
      const { data: memories } = await supabase
        .from('conversation_memory')
        .select('*')
        .eq('lead_id', leadId)
        .order('updated_at', { ascending: false });

      if (memories && memories.length > 0) {
        // Find the enhanced memory record or use the first available
        const enhancedMemory = memories.find(m => m.current_session_id) || memories[0];
        
        return {
          leadId,
          sessionId: enhancedMemory.current_session_id || this.generateSessionId(),
          conversationHistory: isConversationSessionArray(enhancedMemory.conversation_history) 
            ? enhancedMemory.conversation_history 
            : [],
          customerProfile: isCustomerProfile(enhancedMemory.customer_profile) 
            ? enhancedMemory.customer_profile 
            : this.createDefaultProfile(leadId),
          behavioralPatterns: isBehavioralPatternArray(enhancedMemory.behavioral_patterns) 
            ? enhancedMemory.behavioral_patterns 
            : [],
          emotionalContext: isEmotionalContext(enhancedMemory.emotional_context) 
            ? enhancedMemory.emotional_context 
            : this.createDefaultEmotionalContext(),
          lastUpdated: new Date(enhancedMemory.updated_at)
        };
      }
    } catch (error) {
      console.log('Creating new conversation memory for lead:', leadId);
    }

    // Create new memory if none exists
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

  // Save memory to database - working with existing conversation_memory table structure
  private async saveMemoryToDatabase(memory: ConversationMemory): Promise<void> {
    try {
      // Save to the enhanced conversation_memory table
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

  // Create default customer profile
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

  // Create default emotional context
  private createDefaultEmotionalContext(): EmotionalContext {
    return {
      currentMood: 'curious',
      stressLevel: 0.3,
      engagement: 0.5,
      satisfaction: 0.5,
      lastAnalysis: new Date()
    };
  }

  // Get contextual insights for AI response generation
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
}

export const enhancedContextEngine = new EnhancedContextEngine();
