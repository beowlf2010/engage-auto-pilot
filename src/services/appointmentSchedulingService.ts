interface TimePreference {
  period?: 'morning' | 'afternoon' | 'evening';
  dayOfWeek?: string;
  urgency: 'asap' | 'flexible' | 'specific';
  extractedText: string;
}

interface AppointmentType {
  type: 'test_drive' | 'financing' | 'service' | 'general_visit' | 'delivery';
  duration: number; // in minutes
  requirements: string[];
}

interface SchedulingIntent {
  hasSchedulingRequest: boolean;
  timePreference: TimePreference | null;
  appointmentType: AppointmentType;
  confidence: number;
  suggestedResponse: string;
}

class AppointmentSchedulingService {
  private timePatterns = [
    { pattern: /\b(this\s+)?(morning|am)\b/i, period: 'morning' as const, confidence: 0.8 },
    { pattern: /\b(this\s+)?(afternoon|pm)\b/i, period: 'afternoon' as const, confidence: 0.8 },
    { pattern: /\b(this\s+)?(evening|tonight)\b/i, period: 'evening' as const, confidence: 0.8 },
    { pattern: /\b(after\s+work|after\s+5)\b/i, period: 'evening' as const, confidence: 0.9 }
  ];

  private dayPatterns = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'today', 'tomorrow', 'this weekend', 'next week', 'this week'
  ];

  private urgencyPatterns = [
    { pattern: /\b(asap|urgent|today|right now|immediately)\b/i, urgency: 'asap' as const },
    { pattern: /\b(when convenient|whenever|flexible|any time)\b/i, urgency: 'flexible' as const },
    { pattern: /\b(specific time|exact time|prefer)\b/i, urgency: 'specific' as const }
  ];

  private appointmentTypePatterns = [
    { 
      pattern: /\b(test drive|drive|try out)\b/i, 
      type: 'test_drive' as const, 
      duration: 30, 
      requirements: ['Valid driver\'s license', 'Insurance verification'] 
    },
    { 
      pattern: /\b(financing|finance|loan|payment)\b/i, 
      type: 'financing' as const, 
      duration: 90, 
      requirements: ['Credit application', 'Income verification', 'Trade information if applicable'] 
    },
    { 
      pattern: /\b(service|maintenance|repair)\b/i, 
      type: 'service' as const, 
      duration: 60, 
      requirements: ['Vehicle information', 'Service history if available'] 
    },
    { 
      pattern: /\b(delivery|pickup|take possession)\b/i, 
      type: 'delivery' as const, 
      duration: 120, 
      requirements: ['Financing completion', 'Insurance proof', 'Registration documents'] 
    }
  ];

  analyzeSchedulingIntent(message: string): SchedulingIntent {
    const lowerMessage = message.toLowerCase();
    
    // Check if there's a scheduling request
    const schedulingKeywords = [
      'schedule', 'appointment', 'meet', 'visit', 'come in', 'see',
      'when are you', 'what time', 'available', 'open'
    ];
    
    const hasSchedulingRequest = schedulingKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );

    if (!hasSchedulingRequest) {
      return {
        hasSchedulingRequest: false,
        timePreference: null,
        appointmentType: {
          type: 'general_visit',
          duration: 60,
          requirements: []
        },
        confidence: 0,
        suggestedResponse: ''
      };
    }

    // Extract time preferences
    let timePreference: TimePreference | null = null;
    for (const { pattern, period, confidence } of this.timePatterns) {
      const match = message.match(pattern);
      if (match) {
        timePreference = {
          period,
          extractedText: match[0],
          urgency: 'flexible'
        };
        break;
      }
    }

    // Extract day preferences
    const dayOfWeek = this.dayPatterns.find(day => 
      lowerMessage.includes(day)
    );
    
    if (dayOfWeek && timePreference) {
      timePreference.dayOfWeek = dayOfWeek;
    } else if (dayOfWeek) {
      timePreference = {
        dayOfWeek,
        extractedText: dayOfWeek,
        urgency: 'flexible'
      };
    }

    // Extract urgency
    const urgencyMatch = this.urgencyPatterns.find(({ pattern }) => 
      pattern.test(lowerMessage)
    );
    if (urgencyMatch && timePreference) {
      timePreference.urgency = urgencyMatch.urgency;
    }

    // Determine appointment type
    let appointmentType: AppointmentType = {
      type: 'general_visit',
      duration: 60,
      requirements: []
    };

    for (const typePattern of this.appointmentTypePatterns) {
      if (typePattern.pattern.test(lowerMessage)) {
        appointmentType = {
          type: typePattern.type,
          duration: typePattern.duration,
          requirements: typePattern.requirements
        };
        break;
      }
    }

    const confidence = this.calculateConfidence(message, timePreference, appointmentType);
    const suggestedResponse = this.generateSchedulingResponse(timePreference, appointmentType);

    return {
      hasSchedulingRequest: true,
      timePreference,
      appointmentType,
      confidence,
      suggestedResponse
    };
  }

  private calculateConfidence(
    message: string, 
    timePreference: TimePreference | null, 
    appointmentType: AppointmentType
  ): number {
    let confidence = 0.6; // Base confidence for scheduling request

    if (timePreference) {
      confidence += 0.2;
      if (timePreference.dayOfWeek) confidence += 0.1;
      if (timePreference.period) confidence += 0.1;
    }

    if (appointmentType.type !== 'general_visit') {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private generateSchedulingResponse(
    timePreference: TimePreference | null, 
    appointmentType: AppointmentType
  ): string {
    const typeResponses = {
      test_drive: 'test drive',
      financing: 'financing discussion',
      service: 'service appointment',
      delivery: 'vehicle delivery',
      general_visit: 'visit'
    };

    const appointmentName = typeResponses[appointmentType.type];
    const duration = appointmentType.duration;

    let response = `I'd be happy to schedule a ${appointmentName} for you.`;

    if (duration > 60) {
      response += ` For ${appointmentName}, I recommend allowing ${duration} minutes.`;
    }

    if (timePreference) {
      if (timePreference.dayOfWeek && timePreference.period) {
        response += ` Would ${timePreference.dayOfWeek} ${timePreference.period} work for you?`;
      } else if (timePreference.dayOfWeek) {
        response += ` What time on ${timePreference.dayOfWeek} works best?`;
      } else if (timePreference.period) {
        response += ` Would ${timePreference.period} work for your schedule?`;
      }
    } else {
      response += ' What day and time work best for your schedule?';
    }

    if (appointmentType.requirements.length > 0) {
      response += ` Please bring ${appointmentType.requirements.join(', ')}.`;
    }

    return response;
  }

  getBusinessHoursResponse(): string {
    return "We're open Monday through Friday 8 AM to 8 PM, Saturday 8 AM to 7 PM, and Sunday 12 PM to 6 PM.";
  }

  formatTimeSlot(day: string, time: string): string {
    return `${this.capitalizeWords(day)} at ${time}`;
  }

  private capitalizeWords(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}

export const appointmentSchedulingService = new AppointmentSchedulingService();
export type { TimePreference, AppointmentType, SchedulingIntent };