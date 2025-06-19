
import { ConversationMemory, BehavioralPattern, SessionMessage } from './types';

export class BehavioralTracker {
  updateBehavioralPatterns(memory: ConversationMemory, message: SessionMessage): void {
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
}
