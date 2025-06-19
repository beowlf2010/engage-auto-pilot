
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

export interface MessageAnalysis {
  sentiment: number;
  intent: string;
  emotionalTone: string;
  topics: string[];
}
