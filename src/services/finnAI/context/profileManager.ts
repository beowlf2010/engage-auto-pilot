import { CustomerProfile, SessionMessage, ResponsePattern, MessageAnalysis } from './types';

export class ProfileManager {
  updateCustomerProfile(profile: CustomerProfile, message: SessionMessage, analysis: MessageAnalysis): void {
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

  createDefaultProfile(leadId: string): CustomerProfile {
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
}
