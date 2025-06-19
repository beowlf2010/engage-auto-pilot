
import { EmotionalContext, SessionMessage } from './types';

export class EmotionalProcessor {
  updateEmotionalContext(current: EmotionalContext, message: SessionMessage): EmotionalContext {
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
}
