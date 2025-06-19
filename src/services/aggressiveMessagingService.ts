
import { supabase } from '@/integrations/supabase/client';
import { sendMessage } from './messagesService';

export interface AggressiveScheduleConfig {
  day: number;
  messagesPerDay: number;
  messageTimes: string[]; // Times in Central Time (e.g., "09:00", "13:00", "17:00")
  messageStrategy: string;
}

// 14-day aggressive messaging schedule
export const AGGRESSIVE_SCHEDULE: AggressiveScheduleConfig[] = [
  // Week 1 - High Intensity (3 messages per day)
  { day: 1, messagesPerDay: 3, messageTimes: ["09:00", "13:00", "17:00"], messageStrategy: "features_benefits" },
  { day: 2, messagesPerDay: 3, messageTimes: ["09:00", "13:00", "17:00"], messageStrategy: "features_benefits" },
  { day: 3, messagesPerDay: 3, messageTimes: ["09:00", "13:00", "17:00"], messageStrategy: "features_benefits" },
  { day: 4, messagesPerDay: 3, messageTimes: ["09:00", "13:00", "17:00"], messageStrategy: "urgency_scarcity" },
  { day: 5, messagesPerDay: 3, messageTimes: ["09:00", "13:00", "17:00"], messageStrategy: "urgency_scarcity" },
  { day: 6, messagesPerDay: 3, messageTimes: ["09:00", "13:00", "17:00"], messageStrategy: "urgency_scarcity" },
  { day: 7, messagesPerDay: 3, messageTimes: ["09:00", "13:00", "17:00"], messageStrategy: "incentives_deals" },
  
  // Week 2 - Moderate Intensity (2 messages per day)
  { day: 8, messagesPerDay: 2, messageTimes: ["10:00", "16:00"], messageStrategy: "incentives_deals" },
  { day: 9, messagesPerDay: 2, messageTimes: ["10:00", "16:00"], messageStrategy: "incentives_deals" },
  { day: 10, messagesPerDay: 2, messageTimes: ["10:00", "16:00"], messageStrategy: "final_push" },
  { day: 11, messagesPerDay: 2, messageTimes: ["10:00", "16:00"], messageStrategy: "final_push" },
  { day: 12, messagesPerDay: 2, messageTimes: ["10:00", "16:00"], messageStrategy: "final_push" },
  { day: 13, messagesPerDay: 2, messageTimes: ["10:00", "16:00"], messageStrategy: "gentle_followup" },
  { day: 14, messagesPerDay: 2, messageTimes: ["10:00", "16:00"], messageStrategy: "gentle_followup" }
];

export const AGGRESSIVE_MESSAGE_TEMPLATES = {
  features_benefits: [
    "Hi {firstName}! That {vehicleInterest} has some amazing features - heated seats, backup camera, and spacious 3rd row seating perfect for families. What questions can I answer?",
    "Hey {firstName}! The {vehicleInterest} gets great gas mileage and has excellent safety ratings. Would you like to know more about the warranty options?",
    "{firstName}, this {vehicleInterest} has premium leather interior and all-wheel drive - perfect for any weather. When would be a good time to take a look?"
  ],
  urgency_scarcity: [
    "Hi {firstName}! We've had 3 people ask about this {vehicleInterest} today. These don't last long! Want to secure it with a quick visit?",
    "{firstName}, this {vehicleInterest} is priced to move fast. Similar ones in the area are going for $2000+ more. Interested in seeing it today?",
    "Hey {firstName}! Only a few {vehicleInterest} models left on the lot. This one won't be here much longer. Can we schedule a quick test drive?"
  ],
  incentives_deals: [
    "Hi {firstName}! Great news - we have special financing available on the {vehicleInterest} this week. As low as 2.9% APR for qualified buyers!",
    "{firstName}, we can work with your budget on this {vehicleInterest}. Trade-ins welcome and we handle all the paperwork. What's your timeline?",
    "Hey {firstName}! End of month special - extra $1000 off the {vehicleInterest} if you come in this week. Interested?"
  ],
  final_push: [
    "Hi {firstName}! Last chance on this {vehicleInterest} - we have a buyer coming tomorrow morning. Don't miss out! Can you stop by today?",
    "{firstName}, this might be your final opportunity on the {vehicleInterest}. We can have everything ready for a quick purchase. Available this evening?",
    "Hey {firstName}! Final call on the {vehicleInterest} - it's been flagged for wholesale if it doesn't sell by Friday. Want to save it?"
  ],
  gentle_followup: [
    "Hi {firstName}, hope you found what you were looking for! If you're still interested in the {vehicleInterest}, we're here to help.",
    "{firstName}, just checking in - did you end up finding a vehicle elsewhere? The {vehicleInterest} is still available if you changed your mind."
  ]
};

export const startAggressiveSequence = async (leadId: string, profile: any) => {
  try {
    console.log(`🔥 Starting aggressive messaging sequence for lead ${leadId}`);
    
    // Update lead to aggressive sequence
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        ai_stage: 'aggressive_unresponsive',
        ai_sequence_paused: false,
        next_ai_send_at: getNextMessageTime(1, 0), // Day 1, first message
        ai_messages_sent: 0
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error starting aggressive sequence:', updateError);
      return false;
    }

    // Schedule all messages for the sequence
    await scheduleAggressiveMessages(leadId);
    
    console.log(`✅ Aggressive sequence started for lead ${leadId}`);
    return true;
    
  } catch (error) {
    console.error('Error starting aggressive sequence:', error);
    return false;
  }
};

export const scheduleAggressiveMessages = async (leadId: string) => {
  try {
    // Clear existing scheduled messages using explicit typing
    const { error: deleteError } = await supabase
      .from('aggressive_message_schedule' as any)
      .delete()
      .eq('lead_id', leadId);

    if (deleteError) {
      console.error('Error clearing existing schedules:', deleteError);
    }

    const scheduleEntries = [];
    
    for (const dayConfig of AGGRESSIVE_SCHEDULE) {
      for (let messageIndex = 0; messageIndex < dayConfig.messagesPerDay; messageIndex++) {
        const scheduledTime = getNextMessageTime(dayConfig.day, messageIndex);
        
        scheduleEntries.push({
          lead_id: leadId,
          day: dayConfig.day,
          message_index: messageIndex,
          scheduled_at: scheduledTime,
          message_strategy: dayConfig.messageStrategy,
          is_sent: false
        });
      }
    }

    const { error } = await (supabase as any)
      .from('aggressive_message_schedule')
      .insert(scheduleEntries);

    if (error) {
      console.error('Error scheduling aggressive messages:', error);
    } else {
      console.log(`📅 Scheduled ${scheduleEntries.length} aggressive messages for lead ${leadId}`);
    }
    
  } catch (error) {
    console.error('Error in scheduleAggressiveMessages:', error);
  }
};

export const getNextMessageTime = (day: number, messageIndex: number): string => {
  const config = AGGRESSIVE_SCHEDULE.find(s => s.day === day);
  if (!config) return new Date().toISOString();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + (day - 1));
  
  const timeString = config.messageTimes[messageIndex] || config.messageTimes[0];
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Convert Central Time to UTC (Central is UTC-6 in standard time, UTC-5 in daylight)
  const centralOffset = 6; // Assume standard time for now
  const utcHours = (hours + centralOffset) % 24;
  
  startDate.setHours(utcHours, minutes, 0, 0);
  
  return startDate.toISOString();
};

export const processAggressiveMessages = async (profile: any) => {
  try {
    const now = new Date().toISOString();
    
    // Get messages due to be sent using explicit typing
    const { data: dueMessages, error } = await (supabase as any)
      .from('aggressive_message_schedule')
      .select(`
        *,
        leads!inner(
          id,
          first_name,
          last_name,
          vehicle_interest,
          ai_sequence_paused,
          ai_messages_sent
        )
      `)
      .eq('is_sent', false)
      .lte('scheduled_at', now)
      .eq('leads.ai_sequence_paused', false)
      .limit(50);

    if (error) {
      console.error('Error fetching due aggressive messages:', error);
      return;
    }

    if (!dueMessages || dueMessages.length === 0) {
      console.log('🔥 No aggressive messages due');
      return;
    }

    console.log(`🔥 Processing ${dueMessages.length} aggressive messages`);

    for (const messageSchedule of dueMessages) {
      try {
        const lead = messageSchedule.leads;
        
        // Check if lead has replied (if so, pause aggressive sequence)
        const { data: recentMessages } = await supabase
          .from('conversations')
          .select('direction, sent_at')
          .eq('lead_id', lead.id)
          .eq('direction', 'in')
          .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (recentMessages && recentMessages.length > 0) {
          console.log(`⏸️ Lead ${lead.id} replied - pausing aggressive sequence`);
          
          // Pause aggressive sequence
          await supabase
            .from('leads')
            .update({
              ai_sequence_paused: true,
              ai_stage: 'responded_during_aggressive'
            })
            .eq('id', lead.id);
            
          continue;
        }

        // Generate message based on strategy
        const messageTemplates = AGGRESSIVE_MESSAGE_TEMPLATES[messageSchedule.message_strategy as keyof typeof AGGRESSIVE_MESSAGE_TEMPLATES] || AGGRESSIVE_MESSAGE_TEMPLATES.features_benefits;
        const templateIndex = messageSchedule.message_index % messageTemplates.length;
        let message = messageTemplates[templateIndex];

        // Replace placeholders
        message = message
          .replace(/{firstName}/g, lead.first_name || 'there')
          .replace(/{vehicleInterest}/g, lead.vehicle_interest || 'vehicle');

        // Send the message
        console.log(`🔥 Sending aggressive message to ${lead.first_name}: ${message}`);
        await sendMessage(lead.id, message, profile, true);

        // Mark as sent
        await (supabase as any)
          .from('aggressive_message_schedule')
          .update({ is_sent: true, sent_at: new Date().toISOString() })
          .eq('id', messageSchedule.id);

        // Update lead message count
        await supabase
          .from('leads')
          .update({ 
            ai_messages_sent: (lead.ai_messages_sent || 0) + 1 
          })
          .eq('id', lead.id);

        console.log(`✅ Sent aggressive message ${messageSchedule.day}-${messageSchedule.message_index + 1} to ${lead.first_name}`);
        
        // Delay between messages
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Error sending aggressive message:`, error);
      }
    }
    
  } catch (error) {
    console.error('Error processing aggressive messages:', error);
  }
};

export const pauseAggressiveSequence = async (leadId: string, reason: string) => {
  try {
    await supabase
      .from('leads')
      .update({
        ai_sequence_paused: true,
        ai_pause_reason: reason,
        ai_stage: 'aggressive_paused'
      })
      .eq('id', leadId);

    console.log(`⏸️ Paused aggressive sequence for lead ${leadId}: ${reason}`);
    return true;
  } catch (error) {
    console.error('Error pausing aggressive sequence:', error);
    return false;
  }
};
