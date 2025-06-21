
import { MessageQuality } from '../types/messagePreviewTypes';

export const getMessageQuality = (msg: string, leadName: string, vehicleInterest: string, error: string, conversationHistory: any[]): MessageQuality => {
  if (!msg || msg.includes('Error') || msg.includes('Unable') || error) {
    return { score: 0, color: 'text-red-600' };
  }
  
  // Simple quality heuristics
  const hasPersonalization = msg.toLowerCase().includes(leadName.split(' ')[0].toLowerCase());
  const hasVehicle = msg.toLowerCase().includes(vehicleInterest.toLowerCase());
  const goodLength = msg.length > 50 && msg.length < 300;
  const hasCall2Action = /\?|call|visit|appointment|interested|available/i.test(msg);
  const hasFinnIntro = msg.toLowerCase().includes('finn') && conversationHistory.filter(msg => msg.direction === 'in').length === 0;
  const hasJasonPilger = msg.toLowerCase().includes('jason pilger chevrolet');
  
  let score = 5;
  if (hasPersonalization) score += 1;
  if (hasVehicle) score += 1;
  if (goodLength) score += 1;
  if (hasCall2Action) score += 2;
  if (hasFinnIntro) score += 1;
  if (hasJasonPilger) score += 1;
  
  if (score >= 9) return { score, color: 'text-green-600' };
  if (score >= 7) return { score, color: 'text-yellow-600' };
  return { score, color: 'text-red-600' };
};

export const getDisplayMessage = (message: string): string => {
  return message.length > 150 ? `${message.substring(0, 150)}...` : message;
};
