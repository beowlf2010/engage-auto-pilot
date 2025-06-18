
import { supabase } from '@/integrations/supabase/client';

export interface AppointmentIntent {
  hasAppointmentIntent: boolean;
  confidence: number;
  appointmentType: 'consultation' | 'test_drive' | 'viewing' | 'follow_up';
  urgency: 'low' | 'medium' | 'high';
  timePreferences: {
    dayPreferences: string[];
    timePreferences: string[];
    datePreferences: string[];
  };
  shouldSuggestScheduling: boolean;
  detectedAt: Date;
}

// Analyze appointment intent from conversation messages
export const analyzeAppointmentIntent = (messages: any[]): AppointmentIntent => {
  if (!messages || messages.length === 0) {
    return createEmptyIntent();
  }

  // Get the last customer message
  const lastCustomerMessage = messages
    .filter(msg => msg.direction === 'in')
    .slice(-1)[0];

  if (!lastCustomerMessage) {
    return createEmptyIntent();
  }

  const messageText = lastCustomerMessage.body.toLowerCase();
  const conversationText = messages
    .map(msg => `${msg.direction === 'in' ? 'Customer' : 'Sales'}: ${msg.body}`)
    .join('\n')
    .toLowerCase();

  // Appointment keywords and patterns with confidence scores
  const appointmentPatterns = [
    { keywords: ['schedule', 'appointment', 'book', 'set up', 'arrange'], confidence: 0.9, type: 'consultation' },
    { keywords: ['test drive', 'drive the car', 'try it out', 'take it for a spin'], confidence: 0.95, type: 'test_drive' },
    { keywords: ['come in', 'visit', 'stop by', 'drop by', 'see the car'], confidence: 0.8, type: 'viewing' },
    { keywords: ['when can i', 'what time', 'available', 'free time'], confidence: 0.85, type: 'consultation' },
    { keywords: ['talk to someone', 'speak with', 'meet with', 'consultation'], confidence: 0.8, type: 'consultation' },
    { keywords: ['ready to buy', 'want to purchase', 'make a decision'], confidence: 0.9, type: 'consultation' }
  ];

  let maxConfidence = 0;
  let detectedType: AppointmentIntent['appointmentType'] = 'consultation';

  // Check for appointment patterns
  for (const pattern of appointmentPatterns) {
    const matchCount = pattern.keywords.filter(keyword => 
      messageText.includes(keyword) || conversationText.includes(keyword)
    ).length;

    if (matchCount > 0) {
      const confidence = pattern.confidence * (matchCount / pattern.keywords.length);
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        detectedType = pattern.type as AppointmentIntent['appointmentType'];
      }
    }
  }

  // Determine urgency based on urgency keywords
  let urgency: AppointmentIntent['urgency'] = 'medium';
  if (/\b(urgent|asap|today|right now|immediately)\b/.test(messageText)) {
    urgency = 'high';
  } else if (/\b(next week|sometime|when convenient|no rush)\b/.test(messageText)) {
    urgency = 'low';
  }

  // Extract time preferences
  const timePreferences = extractTimePreferences(messageText);

  // Context boost - if discussing vehicles and showing interest
  const hasVehicleContext = /\b(car|vehicle|auto|price|features|interested)\b/.test(conversationText);
  if (hasVehicleContext && maxConfidence > 0.3) {
    maxConfidence = Math.min(1.0, maxConfidence + 0.2);
  }

  return {
    hasAppointmentIntent: maxConfidence >= 0.6,
    confidence: maxConfidence,
    appointmentType: detectedType,
    urgency,
    timePreferences,
    shouldSuggestScheduling: maxConfidence >= 0.7,
    detectedAt: new Date()
  };
};

// Extract time preferences from message
const extractTimePreferences = (messageText: string) => {
  const preferences = {
    dayPreferences: [] as string[],
    timePreferences: [] as string[],
    datePreferences: [] as string[]
  };

  // Day preferences
  const dayKeywords = {
    'monday': 'Monday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday',
    'thursday': 'Thursday', 'friday': 'Friday', 'saturday': 'Saturday',
    'sunday': 'Sunday', 'weekday': 'Weekday', 'weekend': 'Weekend'
  };

  Object.entries(dayKeywords).forEach(([key, value]) => {
    if (messageText.includes(key)) {
      preferences.dayPreferences.push(value);
    }
  });

  // Time preferences
  const timeKeywords = {
    'morning': 'Morning', 'afternoon': 'Afternoon', 'evening': 'Evening',
    'lunch': 'Lunch time', 'after work': 'After work', 'before work': 'Before work'
  };

  Object.entries(timeKeywords).forEach(([key, value]) => {
    if (messageText.includes(key)) {
      preferences.timePreferences.push(value);
    }
  });

  // Date preferences
  const dateKeywords = {
    'today': 'Today', 'tomorrow': 'Tomorrow',
    'this week': 'This week', 'next week': 'Next week'
  };

  Object.entries(dateKeywords).forEach(([key, value]) => {
    if (messageText.includes(key)) {
      preferences.datePreferences.push(value);
    }
  });

  return preferences;
};

// Create empty intent object
const createEmptyIntent = (): AppointmentIntent => ({
  hasAppointmentIntent: false,
  confidence: 0,
  appointmentType: 'consultation',
  urgency: 'medium',
  timePreferences: {
    dayPreferences: [],
    timePreferences: [],
    datePreferences: []
  },
  shouldSuggestScheduling: false,
  detectedAt: new Date()
});

// Store appointment intent detection for analytics
export const logAppointmentIntent = async (leadId: string, intent: AppointmentIntent, messageId: string) => {
  try {
    await supabase
      .from('lead_behavior_triggers')
      .insert({
        lead_id: leadId,
        trigger_type: 'appointment_intent',
        trigger_data: {
          confidence: intent.confidence,
          appointmentType: intent.appointmentType,
          urgency: intent.urgency,
          timePreferences: intent.timePreferences,
          messageId: messageId,
          detectedAt: intent.detectedAt.toISOString()
        },
        is_processed: false
      });
  } catch (error) {
    console.error('Error logging appointment intent:', error);
  }
};
