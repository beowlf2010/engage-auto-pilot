
import { leadProcessService } from './leadProcessService';
import { LeadProcess } from '@/types/leadProcess';

export const initializePredefinedProcesses = async (): Promise<void> => {
  const predefinedProcesses: Omit<LeadProcess, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Gentle Follow-up',
      description: 'A gentle approach for leads who need nurturing with minimal pressure',
      aggressionLevel: 'gentle',
      isActive: true,
      messageSequence: [
        {
          id: '1',
          sequenceNumber: 1,
          delayHours: 24,
          messageTemplate: 'Hi {firstName}! Thanks for your interest in {vehicleInterest}. I wanted to follow up and see if you have any questions I can help answer.',
          tone: 'friendly',
          channel: 'sms'
        },
        {
          id: '2',
          sequenceNumber: 2,
          delayHours: 72,
          messageTemplate: 'Hi {firstName}, just checking in! I have some great options for {vehicleInterest} that I think you\'d love. Would you like me to send you some details?',
          tone: 'friendly',
          channel: 'sms'
        }
      ],
      escalationRules: [],
      successCriteria: {
        responseRate: 20,
        appointmentRate: 10,
        conversionRate: 5,
        maxDaysToConversion: 30
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
    },
    {
      name: 'Moderate Follow-up',
      description: 'Balanced approach with consistent follow-up and clear call-to-actions',
      aggressionLevel: 'moderate',
      isActive: true,
      messageSequence: [
        {
          id: '1',
          sequenceNumber: 1,
          delayHours: 12,
          messageTemplate: 'Hi {firstName}! I saw you were interested in {vehicleInterest}. I have a few great options available. When would be a good time for a quick call?',
          tone: 'professional',
          channel: 'sms'
        },
        {
          id: '2',
          sequenceNumber: 2,
          delayHours: 48,
          messageTemplate: 'Hi {firstName}, I wanted to follow up on {vehicleInterest}. I can save you time by showing you exactly what fits your needs. Are you available for a 10-minute call today?',
          tone: 'professional',
          channel: 'sms'
        }
      ],
      escalationRules: [],
      successCriteria: {
        responseRate: 30,
        appointmentRate: 15,
        conversionRate: 8,
        maxDaysToConversion: 21
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
    },
    {
      name: 'Aggressive Follow-up',
      description: 'High-frequency messaging for leads showing strong buying signals',
      aggressionLevel: 'aggressive',
      isActive: true,
      messageSequence: [
        {
          id: '1',
          sequenceNumber: 1,
          delayHours: 4,
          messageTemplate: 'Hi {firstName}! Thanks for your interest in {vehicleInterest}. I have exactly what you\'re looking for and it won\'t last long. Can we schedule a time to meet today?',
          tone: 'urgent',
          channel: 'sms'
        },
        {
          id: '2',
          sequenceNumber: 2,
          delayHours: 24,
          messageTemplate: '{firstName}, I don\'t want you to miss out on this {vehicleInterest}. I\'m holding it for you but need to know your interest level. Can you call me back today?',
          tone: 'urgent',
          channel: 'sms'
        }
      ],
      escalationRules: [],
      successCriteria: {
        responseRate: 40,
        appointmentRate: 25,
        conversionRate: 12,
        maxDaysToConversion: 14
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
    }
  ];

  // Create each predefined process
  for (const process of predefinedProcesses) {
    try {
      await leadProcessService.createLeadProcess(process);
      console.log(`Created process: ${process.name}`);
    } catch (error) {
      console.error(`Error creating process ${process.name}:`, error);
    }
  }
};
