
import { leadProcessService } from './leadProcessService';
import { LeadProcess } from '@/types/leadProcess';

export const initializePostSaleProcesses = async (): Promise<void> => {
  const postSaleProcess: Omit<LeadProcess, 'id' | 'createdAt' | 'updatedAt'> = {
    name: 'Post-Sale Customer Follow-Up',
    description: 'Gentle follow-up process for sold customers focusing on satisfaction, service reminders, and referral requests',
    aggressionLevel: 'gentle',
    isActive: true,
    messageSequence: [
      {
        id: '1',
        sequenceNumber: 1,
        delayHours: 168, // 7 days
        messageTemplate: 'Hi {firstName}! Congratulations on your {vehicleInterest}! How are you enjoying it so far? If you have any questions, I\'m here to help.',
        tone: 'friendly',
        channel: 'sms'
      },
      {
        id: '2',
        sequenceNumber: 2,
        delayHours: 720, // 30 days
        messageTemplate: 'Hi {firstName}! Hope you\'re loving your {vehicleInterest}! Don\'t forget about your first service interval. Also, if you know anyone looking for a great vehicle experience, I\'d appreciate the referral!',
        tone: 'friendly',
        channel: 'sms'
      },
      {
        id: '3',
        sequenceNumber: 3,
        delayHours: 2160, // 90 days
        messageTemplate: 'Hi {firstName}! Just checking in - how\'s everything going with your {vehicleInterest}? If you\'ve had a great experience, would you mind leaving us a review or referring friends who might be looking?',
        tone: 'friendly',
        channel: 'sms'
      },
      {
        id: '4',
        sequenceNumber: 4,
        delayHours: 4320, // 180 days
        messageTemplate: 'Hi {firstName}! Hope you\'re still enjoying your {vehicleInterest}! Time for your next service check. Remember, I\'m always here if you or anyone you know needs help with vehicles.',
        tone: 'friendly',
        channel: 'sms'
      }
    ],
    escalationRules: [],
    successCriteria: {
      responseRate: 15,
      appointmentRate: 5,
      conversionRate: 10, // Referral conversion
      maxDaysToConversion: 180
    },
    performanceMetrics: {
      totalLeadsAssigned: 0,
      totalResponses: 0,
      totalAppointments: 0,
      totalConversions: 0,
      averageResponseTime: 0,
      averageTimeToConversion: 0,
      responseRate: 0,
      appointmentRate: 0,
      conversionRate: 0,
      costPerConversion: 0,
      lastUpdated: new Date().toISOString()
    }
  };

  try {
    await leadProcessService.createLeadProcess(postSaleProcess);
    console.log(`Created process: ${postSaleProcess.name}`);
  } catch (error) {
    console.error(`Error creating process ${postSaleProcess.name}:`, error);
  }
};
