
import { MessageAnalysis } from './types';

export class MessageAnalyzer {
  async analyzeMessage(content: string): Promise<MessageAnalysis> {
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
}
