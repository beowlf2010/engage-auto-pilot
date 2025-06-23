
import { LeadProcess } from '@/types/leadProcess';

// Predefined process templates for different aggression levels
export const predefinedProcesses: Omit<LeadProcess, 'id' | 'createdAt' | 'updatedAt' | 'performanceMetrics'>[] = [
  {
    name: 'Gentle Nurture Process',
    description: 'Soft, relationship-building approach with longer intervals between messages',
    aggressionLevel: 'gentle',
    isActive: true,
    messageSequence: [
      {
        id: '1',
        sequenceNumber: 1,
        delayHours: 0, // Immediate
        messageTemplate: 'Hi {firstName}! Thanks for your interest in {vehicleInterest}. I\'m {agentName} and I\'m here to help you find exactly what you\'re looking for. What\'s most important to you in your next vehicle?',
        tone: 'friendly',
        channel: 'sms'
      },
      {
        id: '2',
        sequenceNumber: 2,
        delayHours: 48, // 2 days later
        messageTemplate: 'Hi {firstName}! I hope you\'re having a great week. Just checking in about the {vehicleInterest}. Do you have any questions I can help with?',
        tone: 'friendly',
        channel: 'sms'
      },
      {
        id: '3',
        sequenceNumber: 3,
        delayHours: 168, // 1 week later
        messageTemplate: 'Hi {firstName}! I wanted to follow up on your interest in {vehicleInterest}. We have some great options available. Would you like to schedule a time to take a look?',
        tone: 'professional',
        channel: 'sms'
      }
    ],
    escalationRules: [
      {
        id: '1',
        triggerType: 'no_response',
        triggerValue: 336, // 2 weeks
        action: 'escalate_process',
        targetProcessId: 'moderate-process'
      }
    ],
    successCriteria: {
      responseRate: 25,
      appointmentRate: 15,
      conversionRate: 5,
      maxDaysToConversion: 30
    }
  },
  {
    name: 'Moderate Engagement Process',
    description: 'Balanced approach with regular follow-ups and value-driven messaging',
    aggressionLevel: 'moderate',
    isActive: true,
    messageSequence: [
      {
        id: '1',
        sequenceNumber: 1,
        delayHours: 0,
        messageTemplate: 'Hi {firstName}! I\'m {agentName} with {dealership}. I saw you\'re interested in {vehicleInterest} and I\'d love to help you explore your options. What features are most important to you?',
        tone: 'professional',
        channel: 'sms'
      },
      {
        id: '2',
        sequenceNumber: 2,
        delayHours: 24, // 1 day later
        messageTemplate: 'Hi {firstName}! Just wanted to follow up on the {vehicleInterest}. We have several great options that might interest you. When would be a good time to chat?',
        tone: 'professional',
        channel: 'sms'
      },
      {
        id: '3',
        sequenceNumber: 3,
        delayHours: 72, // 3 days later
        messageTemplate: 'Hi {firstName}! I don\'t want you to miss out on the perfect {vehicleInterest}. Our inventory moves fast. Can we schedule a quick 15-minute call to discuss your needs?',
        tone: 'urgent',
        channel: 'sms'
      },
      {
        id: '4',
        sequenceNumber: 4,
        delayHours: 168, // 1 week later
        messageTemplate: 'Hi {firstName}! We just got some new {vehicleInterest} models in. I\'d hate for you to miss the perfect match. Are you still looking?',
        tone: 'professional',
        channel: 'sms'
      }
    ],
    escalationRules: [
      {
        id: '1',
        triggerType: 'no_response',
        triggerValue: 240, // 10 days
        action: 'escalate_process',
        targetProcessId: 'aggressive-process'
      }
    ],
    successCriteria: {
      responseRate: 35,
      appointmentRate: 20,
      conversionRate: 8,
      maxDaysToConversion: 21
    }
  },
  {
    name: 'Aggressive Sales Process',
    description: 'High-frequency, urgency-driven messaging to create immediate action',
    aggressionLevel: 'aggressive',
    isActive: true,
    messageSequence: [
      {
        id: '1',
        sequenceNumber: 1,
        delayHours: 0,
        messageTemplate: 'Hi {firstName}! I\'m {agentName} and I see you\'re interested in {vehicleInterest}. We have limited inventory and I don\'t want you to miss out. When can you come take a look?',
        tone: 'urgent',
        channel: 'sms'
      },
      {
        id: '2',
        sequenceNumber: 2,
        delayHours: 4, // 4 hours later
        messageTemplate: 'Hi {firstName}! The {vehicleInterest} you were looking at is getting a lot of attention today. I can hold it for you, but I need to know soon. Are you available to see it?',
        tone: 'urgent',
        channel: 'sms'
      },
      {
        id: '3',
        sequenceNumber: 3,
        delayHours: 24, // 1 day later
        messageTemplate: 'Hi {firstName}! Just a heads up - the {vehicleInterest} you loved is being looked at by another customer. Are you still interested? Let me know ASAP!',
        tone: 'urgent',
        channel: 'sms'
      },
      {
        id: '4',
        sequenceNumber: 4,
        delayHours: 48, // 2 days later
        messageTemplate: 'Hi {firstName}! Final call on the {vehicleInterest}! We have special financing available this week. This could be your last chance to get this deal. Call me!',
        tone: 'urgent',
        channel: 'sms'
      }
    ],
    escalationRules: [
      {
        id: '1',
        triggerType: 'no_response',
        triggerValue: 120, // 5 days
        action: 'assign_human',
      }
    ],
    successCriteria: {
      responseRate: 45,
      appointmentRate: 30,
      conversionRate: 12,
      maxDaysToConversion: 14
    }
  },
  {
    name: 'Super Aggressive Closing Process',
    description: 'Maximum pressure with frequent touchpoints and strong closing language',
    aggressionLevel: 'super_aggressive',
    isActive: true,
    messageSequence: [
      {
        id: '1',
        sequenceNumber: 1,
        delayHours: 0,
        messageTemplate: 'Hi {firstName}! I\'m {agentName} and I NEED to talk to you about the {vehicleInterest} RIGHT NOW. We have a buyer coming in 2 hours. Call me immediately!',
        tone: 'urgent',
        channel: 'sms'
      },
      {
        id: '2',
        sequenceNumber: 2,
        delayHours: 2, // 2 hours later
        messageTemplate: 'Hi {firstName}! URGENT: The {vehicleInterest} is about to be sold! I can still save it for you but you need to respond in the next 30 minutes. This is your last chance!',
        tone: 'urgent',
        channel: 'sms'
      },
      {
        id: '3',
        sequenceNumber: 3,
        delayHours: 12, // 12 hours later
        messageTemplate: 'Hi {firstName}! I fought to keep the {vehicleInterest} available for you. My manager is asking questions. If you\'re serious, you need to come in TODAY. Can you be here in 2 hours?',
        tone: 'urgent',
        channel: 'sms'
      },
      {
        id: '4',
        sequenceNumber: 4,
        delayHours: 24, // 1 day later
        messageTemplate: 'Hi {firstName}! This is it - the {vehicleInterest} goes to auction tomorrow if you don\'t take it. I can give you the best price we\'ve ever offered. Last chance!',
        tone: 'urgent',
        channel: 'sms'
      }
    ],
    escalationRules: [
      {
        id: '1',
        triggerType: 'no_response',
        triggerValue: 72, // 3 days
        action: 'pause_automation'
      }
    ],
    successCriteria: {
      responseRate: 60,
      appointmentRate: 40,
      conversionRate: 18,
      maxDaysToConversion: 7
    }
  }
];

export const initializePredefinedProcesses = async () => {
  const { leadProcessService } = await import('./leadProcessService');
  
  console.log('🚀 Initializing predefined lead processes...');
  
  for (const process of predefinedProcesses) {
    try {
      await leadProcessService.createLeadProcess({
        ...process,
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
      });
      
      console.log(`✅ Created process: ${process.name}`);
    } catch (error) {
      console.error(`❌ Error creating process ${process.name}:`, error);
    }
  }
};
