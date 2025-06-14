
interface LeadContext {
  firstName: string;
  lastName: string;
  vehicleInterest: string;
  phoneNumber: string;
  aiStage: string;
  messagesSent: number;
  lastResponse?: string;
  lastResponseTime?: string;
  conversationHistory: Array<{
    body: string;
    direction: 'in' | 'out';
    sentAt: string;
    aiGenerated: boolean;
  }>;
}

export const getMessageQualityScore = (message: string, leadContext: LeadContext | null) => {
  let score = 100;
  if (message.length < 50) score -= 20;
  if (message.length > 160) score -= 15;
  if (!message.includes(leadContext?.firstName || '')) score -= 10;
  if (!message.toLowerCase().includes('call') && !message.toLowerCase().includes('visit')) score -= 10;
  return Math.max(score, 0);
};

export const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};
