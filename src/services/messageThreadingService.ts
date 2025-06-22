
interface MessageThread {
  threadId: string;
  leadId: string;
  subject: string;
  participants: string[];
  messageCount: number;
  lastMessageAt: Date;
  firstMessageAt: Date;
  threadType: 'conversation' | 'follow_up' | 'appointment' | 'vehicle_inquiry';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'resolved' | 'archived';
  messages: ThreadMessage[];
  summary?: string;
  tags: string[];
  relatedThreads: string[];
}

interface ThreadMessage {
  messageId: string;
  content: string;
  direction: 'in' | 'out';
  timestamp: Date;
  aiGenerated: boolean;
  threadPosition: number;
  referencedMessages: string[];
  sentiment?: string;
  intent?: string;
}

interface ThreadDetectionResult {
  threadId: string;
  confidence: number;
  reason: string;
  suggestedSubject: string;
}

class MessageThreadingService {
  private threads = new Map<string, MessageThread>();
  private messageToThread = new Map<string, string>();
  private threadAnalytics = {
    totalThreads: 0,
    avgThreadLength: 0,
    activeThreads: 0,
    threadTypes: new Map<string, number>()
  };

  // Analyze and create threads from messages
  analyzeAndCreateThreads(messages: any[], leadId: string) {
    console.log('🧵 [THREADING SERVICE] Analyzing messages for threading, leadId:', leadId);
    
    // Sort messages by timestamp
    const sortedMessages = messages.sort((a, b) => 
      new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    );

    // Group messages into potential threads
    const threadGroups = this.groupMessagesByThread(sortedMessages, leadId);
    
    // Create thread objects
    threadGroups.forEach(group => {
      const thread = this.createThreadFromMessages(group, leadId);
      this.threads.set(thread.threadId, thread);
      
      // Map messages to thread
      group.forEach(msg => {
        this.messageToThread.set(msg.id, thread.threadId);
      });
    });

    console.log(`✅ [THREADING SERVICE] Created ${threadGroups.length} threads for lead ${leadId}`);
    this.updateAnalytics();
  }

  // Group messages into logical threads
  private groupMessagesByThread(messages: any[], leadId: string): any[][] {
    const groups: any[][] = [];
    let currentGroup: any[] = [];
    
    messages.forEach((message, index) => {
      const prevMessage = messages[index - 1];
      
      // Start new thread if:
      // 1. First message
      // 2. Large time gap (>4 hours)
      // 3. Topic change detected
      // 4. Different conversation context
      
      if (
        index === 0 ||
        this.shouldStartNewThread(message, prevMessage, currentGroup)
      ) {
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
        }
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }

  private shouldStartNewThread(message: any, prevMessage: any, currentGroup: any[]): boolean {
    // Time gap threshold (4 hours)
    const timeDiff = new Date(message.sentAt).getTime() - new Date(prevMessage.sentAt).getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff > 4) {
      return true;
    }
    
    // Topic change detection
    if (this.detectTopicChange(message, currentGroup)) {
      return true;
    }
    
    // Conversation restart patterns
    if (this.detectConversationRestart(message, prevMessage)) {
      return true;
    }
    
    return false;
  }

  private detectTopicChange(message: any, currentGroup: any[]): boolean {
    if (currentGroup.length === 0) return false;
    
    // Simple keyword-based topic detection
    const vehicleKeywords = ['car', 'vehicle', 'price', 'financing', 'trade', 'lease'];
    const appointmentKeywords = ['appointment', 'schedule', 'meet', 'visit', 'when'];
    const serviceKeywords = ['service', 'repair', 'maintenance', 'warranty'];
    
    const messageKeywords = this.extractKeywords(message.body);
    const groupKeywords = this.extractKeywordsFromGroup(currentGroup);
    
    // Check if current message has significantly different keywords
    const overlap = this.calculateKeywordOverlap(messageKeywords, groupKeywords);
    
    return overlap < 0.3; // Less than 30% keyword overlap suggests topic change
  }

  private detectConversationRestart(message: any, prevMessage: any): boolean {
    // Patterns that suggest conversation restart
    const restartPatterns = [
      /^(hi|hello|hey)/i,
      /^(good morning|good afternoon|good evening)/i,
      /^(thanks for|thank you for)/i,
      /^(i was wondering|i wanted to)/i
    ];
    
    return restartPatterns.some(pattern => pattern.test(message.body.trim()));
  }

  private createThreadFromMessages(messages: any[], leadId: string): MessageThread {
    const threadId = this.generateThreadId(leadId, messages[0].id);
    const subject = this.generateThreadSubject(messages);
    const threadType = this.detectThreadType(messages);
    const priority = this.calculateThreadPriority(messages);
    
    const threadMessages: ThreadMessage[] = messages.map((msg, index) => ({
      messageId: msg.id,
      content: msg.body,
      direction: msg.direction,
      timestamp: new Date(msg.sentAt),
      aiGenerated: msg.aiGenerated || false,
      threadPosition: index,
      referencedMessages: this.findReferencedMessages(msg, messages.slice(0, index)),
      sentiment: this.detectSentiment(msg.body),
      intent: this.detectIntent(msg.body)
    }));

    return {
      threadId,
      leadId,
      subject,
      participants: [leadId], // Could be expanded for multi-participant threads
      messageCount: messages.length,
      lastMessageAt: new Date(messages[messages.length - 1].sentAt),
      firstMessageAt: new Date(messages[0].sentAt),
      threadType,
      priority,
      status: this.determineThreadStatus(messages),
      messages: threadMessages,
      summary: this.generateThreadSummary(threadMessages),
      tags: this.generateThreadTags(messages),
      relatedThreads: [] // To be populated by relationship analysis
    };
  }

  private generateThreadSubject(messages: any[]): string {
    // Extract subject from first message or common themes
    const firstMessage = messages[0];
    const content = firstMessage.body.toLowerCase();
    
    // Vehicle-related subjects
    if (content.includes('price') || content.includes('cost')) {
      return 'Pricing Inquiry';
    }
    if (content.includes('appointment') || content.includes('schedule')) {
      return 'Appointment Scheduling';
    }
    if (content.includes('trade') || content.includes('trade-in')) {
      return 'Trade-in Discussion';
    }
    if (content.includes('financing') || content.includes('loan')) {
      return 'Financing Discussion';
    }
    if (content.includes('inventory') || content.includes('available')) {
      return 'Inventory Inquiry';
    }
    
    // Generic subject based on direction
    if (firstMessage.direction === 'in') {
      return 'Customer Inquiry';
    } else {
      return 'Sales Follow-up';
    }
  }

  private detectThreadType(messages: any[]): MessageThread['threadType'] {
    const allContent = messages.map(m => m.body.toLowerCase()).join(' ');
    
    if (allContent.includes('appointment') || allContent.includes('schedule')) {
      return 'appointment';
    }
    if (allContent.includes('vehicle') || allContent.includes('car') || allContent.includes('price')) {
      return 'vehicle_inquiry';
    }
    if (messages.some(m => !m.aiGenerated && m.direction === 'out')) {
      return 'follow_up';
    }
    
    return 'conversation';
  }

  private calculateThreadPriority(messages: any[]): MessageThread['priority'] {
    // Calculate based on response time, customer engagement, keywords
    const latestMessage = messages[messages.length - 1];
    const timeSinceLastMessage = Date.now() - new Date(latestMessage.sentAt).getTime();
    const hoursOld = timeSinceLastMessage / (1000 * 60 * 60);
    
    // Check for urgent keywords
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'emergency', 'problem'];
    const hasUrgentKeywords = messages.some(m => 
      urgentKeywords.some(keyword => m.body.toLowerCase().includes(keyword))
    );
    
    if (hasUrgentKeywords) return 'urgent';
    if (hoursOld < 2) return 'high';
    if (hoursOld < 24) return 'medium';
    return 'low';
  }

  private determineThreadStatus(messages: any[]): MessageThread['status'] {
    const latestMessage = messages[messages.length - 1];
    const timeSinceLastMessage = Date.now() - new Date(latestMessage.sentAt).getTime();
    const daysOld = timeSinceLastMessage / (1000 * 60 * 60 * 24);
    
    if (daysOld > 7) return 'archived';
    if (latestMessage.direction === 'in') return 'active';
    
    // Check for resolution indicators
    const resolutionKeywords = ['thanks', 'resolved', 'perfect', 'great', 'appointment set'];
    if (resolutionKeywords.some(keyword => 
      latestMessage.body.toLowerCase().includes(keyword)
    )) {
      return 'resolved';
    }
    
    return 'active';
  }

  private extractKeywords(text: string): string[] {
    const keywords = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
    
    return [...new Set(keywords)];
  }

  private extractKeywordsFromGroup(messages: any[]): string[] {
    const allKeywords = messages.flatMap(msg => this.extractKeywords(msg.body));
    return [...new Set(allKeywords)];
  }

  private calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'oil', 'sit', 'way', 'yes'];
    return stopWords.includes(word);
  }

  private findReferencedMessages(message: any, previousMessages: any[]): string[] {
    // Simple reference detection - could be enhanced with ML
    const references: string[] = [];
    const content = message.body.toLowerCase();
    
    // Look for patterns like "as mentioned", "like you said", etc.
    if (content.includes('mentioned') || content.includes('said') || content.includes('discussed')) {
      // Find the most recent message from the other party
      const recentOpposite = previousMessages
        .filter(m => m.direction !== message.direction)
        .slice(-1)[0];
      
      if (recentOpposite) {
        references.push(recentOpposite.id);
      }
    }
    
    return references;
  }

  private detectSentiment(content: string): string {
    // Simple rule-based sentiment detection
    const positive = ['great', 'good', 'excellent', 'perfect', 'thanks', 'happy', 'love'];
    const negative = ['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'problem'];
    
    const lowerContent = content.toLowerCase();
    const positiveScore = positive.filter(word => lowerContent.includes(word)).length;
    const negativeScore = negative.filter(word => lowerContent.includes(word)).length;
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  private detectIntent(content: string): string {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('price') || lowerContent.includes('cost')) return 'pricing_inquiry';
    if (lowerContent.includes('appointment') || lowerContent.includes('schedule')) return 'appointment_request';
    if (lowerContent.includes('trade') || lowerContent.includes('trade-in')) return 'trade_inquiry';
    if (lowerContent.includes('financing') || lowerContent.includes('loan')) return 'financing_inquiry';
    if (lowerContent.includes('available') || lowerContent.includes('inventory')) return 'availability_check';
    
    return 'general_inquiry';
  }

  private generateThreadSummary(messages: ThreadMessage[]): string {
    if (messages.length === 0) return '';
    
    const intents = messages.map(m => m.intent).filter(Boolean);
    const sentiments = messages.map(m => m.sentiment).filter(Boolean);
    
    const dominantIntent = this.getMostFrequent(intents);
    const overallSentiment = this.getMostFrequent(sentiments);
    
    return `${dominantIntent ? dominantIntent.replace('_', ' ') : 'General discussion'} (${messages.length} messages, ${overallSentiment} sentiment)`;
  }

  private generateThreadTags(messages: any[]): string[] {
    const tags = new Set<string>();
    const allContent = messages.map(m => m.body.toLowerCase()).join(' ');
    
    // Auto-generate tags based on content
    if (allContent.includes('price') || allContent.includes('cost')) tags.add('pricing');
    if (allContent.includes('appointment')) tags.add('appointment');
    if (allContent.includes('trade')) tags.add('trade-in');
    if (allContent.includes('financing')) tags.add('financing');
    if (allContent.includes('urgent')) tags.add('urgent');
    
    return Array.from(tags);
  }

  private getMostFrequent(items: string[]): string {
    if (items.length === 0) return '';
    
    const frequency = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)[0][0];
  }

  private generateThreadId(leadId: string, firstMessageId: string): string {
    return `thread_${leadId}_${firstMessageId}`;
  }

  private updateAnalytics() {
    this.threadAnalytics.totalThreads = this.threads.size;
    this.threadAnalytics.activeThreads = Array.from(this.threads.values())
      .filter(t => t.status === 'active').length;
    
    // Calculate average thread length
    const totalMessages = Array.from(this.threads.values())
      .reduce((sum, thread) => sum + thread.messageCount, 0);
    this.threadAnalytics.avgThreadLength = totalMessages / this.threads.size || 0;
    
    // Update thread types
    this.threadAnalytics.threadTypes.clear();
    Array.from(this.threads.values()).forEach(thread => {
      const current = this.threadAnalytics.threadTypes.get(thread.threadType) || 0;
      this.threadAnalytics.threadTypes.set(thread.threadType, current + 1);
    });
  }

  // Public API methods
  getThreadsForLead(leadId: string): MessageThread[] {
    return Array.from(this.threads.values())
      .filter(thread => thread.leadId === leadId)
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  getThreadById(threadId: string): MessageThread | undefined {
    return this.threads.get(threadId);
  }

  getThreadForMessage(messageId: string): MessageThread | undefined {
    const threadId = this.messageToThread.get(messageId);
    return threadId ? this.threads.get(threadId) : undefined;
  }

  searchThreads(query: string): MessageThread[] {
    const normalizedQuery = query.toLowerCase();
    
    return Array.from(this.threads.values()).filter(thread => 
      thread.subject.toLowerCase().includes(normalizedQuery) ||
      thread.summary?.toLowerCase().includes(normalizedQuery) ||
      thread.tags.some(tag => tag.includes(normalizedQuery)) ||
      thread.messages.some(msg => msg.content.toLowerCase().includes(normalizedQuery))
    );
  }

  getAnalytics() {
    return {
      ...this.threadAnalytics,
      threadTypesArray: Array.from(this.threadAnalytics.threadTypes.entries())
    };
  }
}

export const messageThreadingService = new MessageThreadingService();
