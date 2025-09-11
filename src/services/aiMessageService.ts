import { supabase } from '@/integrations/supabase/client';
import { getLeadMemory } from './aiMemoryService';
import { findMatchingInventory } from './inventoryService';
import { addDisclaimersToMessage, detectsPricing } from './pricingDisclaimerService';
import { getBusinessHours, isWithinBusinessHours } from './businessHours';

export interface AIMessageTemplate {
  stage: string;
  template: string;
  delayHours: number;
  jitterMinutes?: number;
  priority: 'high' | 'medium' | 'low';
}

// Aggressive Cadence: 3 messages in 24h, 2 in next 24h, then daily
const AI_MESSAGE_TEMPLATES: AIMessageTemplate[] = [
  {
    stage: 'initial',
    template: `Hi {firstName}! I'm Finn from the dealership. I see you're interested in {vehicleInterest}. {inventoryMessage} Would you like to schedule a time to see it?`,
    delayHours: 0,
    jitterMinutes: 0,
    priority: 'high'
  },
  {
    stage: 'follow_up_1',
    template: `Hi {firstName}, just wanted to follow up on {vehicleInterest}. {inventoryMessage} {availabilityMessage} Any questions I can help with?`,
    delayHours: 7,
    jitterMinutes: 60,
    priority: 'high'
  },
  {
    stage: 'follow_up_2',
    template: `Hey {firstName}! {inventoryMessage} {pricingMessage} Would you like to come in for a test drive this week?`,
    delayHours: 18,
    jitterMinutes: 90,
    priority: 'high'
  },
  {
    stage: 'follow_up_3',
    template: `Hi {firstName}, hope you had a chance to think about {vehicleInterest}. {inventoryMessage} What questions can I answer for you?`,
    delayHours: 34,
    jitterMinutes: 90,
    priority: 'medium'
  },
  {
    stage: 'follow_up_4',
    template: `{firstName}, wanted to check in about {vehicleInterest}. {inventoryMessage} We're here when you're ready to move forward!`,
    delayHours: 46,
    jitterMinutes: 120,
    priority: 'medium'
  },
  {
    stage: 'follow_up_5',
    template: `Hi {firstName}! {memoryMessage} {inventoryMessage} Any updates on your vehicle search?`,
    delayHours: 72,
    jitterMinutes: 90,
    priority: 'low'
  },
  {
    stage: 'follow_up_6',
    template: `{firstName}, just wanted to touch base on {vehicleInterest}. {inventoryMessage} Let me know how I can help!`,
    delayHours: 96,
    jitterMinutes: 120,
    priority: 'low'
  },
  {
    stage: 'follow_up_7',
    template: `Hi {firstName}, {memoryMessage} Still thinking about {vehicleInterest}? {inventoryMessage} No pressure - here when you need us!`,
    delayHours: 120,
    jitterMinutes: 180,
    priority: 'low'
  },
  {
    stage: 'follow_up_8',
    template: `{firstName}, hope all is well! {inventoryMessage} Just checking if anything has changed with your vehicle needs?`,
    delayHours: 168,
    jitterMinutes: 240,
    priority: 'low'
  },
  {
    stage: 'follow_up_9',
    template: `Hi {firstName}! {memoryMessage} {inventoryMessage} Still here to help whenever you're ready to move forward.`,
    delayHours: 240,
    jitterMinutes: 360,
    priority: 'low'
  }
];

// Vehicle Interest Validation - inline implementation
const INVALID_PATTERNS = [
  /^not specified$/i,
  /^unknown$/i,
  /^n\/a$/i,
  /^na$/i,
  /^null$/i,
  /^undefined$/i,
  /^none$/i,
  /^test$/i,
  /^sample$/i,
  /^demo$/i,
  /^vehicle$/i,
  /^car$/i,
  /^auto$/i,
  /^automobile$/i,
  /^\s*-+\s*$/,
  /^\s*\.+\s*$/,
];

const validateVehicleInterest = (vehicleInterest: string | null | undefined) => {
  if (!vehicleInterest || typeof vehicleInterest !== 'string') {
    return { isValid: false, message: "I see you're still exploring options—happy to help you find the right fit!" };
  }

  const trimmed = vehicleInterest.trim();
  if (trimmed.length === 0) {
    return { isValid: false, message: "I see you're still exploring options—happy to help you find the right fit!" };
  }

  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isValid: false, message: "I see you're still exploring options—happy to help you find the right fit!" };
    }
  }

  return { isValid: true, message: trimmed };
};

const generateInventoryMessage = async (leadId: string, vehicleInterest: string) => {
  try {
    // Validate vehicle interest first
    const validation = validateVehicleInterest(vehicleInterest);
    
    if (!validation.isValid) {
      console.log(`🔍 [AI MESSAGE] Using fallback for invalid vehicle interest: ${vehicleInterest}`);
      return {
        inventoryMessage: validation.message,
        availabilityMessage: "What specific features are you looking for?",
        pricingMessage: "",
        context: { isInventoryRelated: false, usesFallback: true }
      };
    }

    const matchingInventory = await findMatchingInventory(leadId);
    
    // Filter out any vehicles with unknown make/model
    const validInventory = matchingInventory.filter(vehicle => {
      const hasValidMake = vehicle.make && 
        vehicle.make !== 'Unknown' && 
        !vehicle.make.toLowerCase().includes('unknown') &&
        vehicle.make.trim().length > 0;
        
      const hasValidModel = vehicle.model && 
        vehicle.model !== 'Unknown' && 
        !vehicle.model.toLowerCase().includes('unknown') &&
        vehicle.model.trim().length > 0;
        
      return hasValidMake && hasValidModel;
    });
    
    if (validInventory.length === 0) {
      return {
        inventoryMessage: "We have several vehicles that might interest you.",
        availabilityMessage: "Let me know what specific features you're looking for!",
        pricingMessage: "",
        context: { isInventoryRelated: false }
      };
    }

    const topMatch = validInventory[0];
    const price = topMatch.price ? `$${topMatch.price.toLocaleString()}` : '';
    
    let inventoryMessage = `I have a ${topMatch.year} ${topMatch.make} ${topMatch.model}`;
    if (price) {
      inventoryMessage += ` priced at ${price}`;
    }
    inventoryMessage += ` that matches what you're looking for.`;

    const availabilityMessage = validInventory.length > 1 
      ? `We also have ${validInventory.length - 1} other similar vehicles available.`
      : "This one is perfect for your needs!";

    const pricingMessage = price 
      ? `The ${topMatch.year} ${topMatch.make} ${topMatch.model} is priced at ${price}.`
      : "";

    return {
      inventoryMessage,
      availabilityMessage,
      pricingMessage,
      context: { 
        isInventoryRelated: true,
        mentionsFinancing: false,
        mentionsTradeIn: false,
        mentionsLease: false
      }
    };
  } catch (error) {
    console.error('Error generating inventory message:', error);
    return {
      inventoryMessage: "I see you're still exploring options—happy to help you find the right fit!",
      availabilityMessage: "Let me know what you're looking for!",
      pricingMessage: "",
      context: { isInventoryRelated: false, usesFallback: true }
    };
  }
};

export const generateAIMessage = async (leadId: string): Promise<string | null> => {
  try {
    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Error fetching lead:', leadError);
      return null;
    }

    // Get current AI stage
    const currentStage = lead.ai_stage || 'initial';
    
    // Find next stage
    const currentIndex = AI_MESSAGE_TEMPLATES.findIndex(t => t.stage === currentStage);
    if (currentIndex === -1 || currentIndex >= AI_MESSAGE_TEMPLATES.length - 1) {
      console.log('No more AI messages for this lead');
      return null;
    }

    const template = AI_MESSAGE_TEMPLATES[currentIndex];
    
    // Get lead memory for personalization
    const memory = await getLeadMemory(leadId);
    const memoryInsights = memory
      .filter(m => m.memory_type === 'preference')
      .slice(0, 2)
      .map(m => m.content)
      .join('. ');

    // Generate inventory-specific content with vehicle interest validation
    const inventoryData = await generateInventoryMessage(leadId, lead.vehicle_interest);

    // Replace template variables with validation
    const vehicleValidation = validateVehicleInterest(lead.vehicle_interest);
    const vehicleText = vehicleValidation.isValid ? vehicleValidation.message : vehicleValidation.message;

    let message = template.template
      .replace(/{firstName}/g, lead.first_name)
      .replace(/{lastName}/g, lead.last_name)
      .replace(/{vehicleInterest}/g, vehicleText)
      .replace(/{inventoryMessage}/g, inventoryData.inventoryMessage)
      .replace(/{availabilityMessage}/g, inventoryData.availabilityMessage)
      .replace(/{pricingMessage}/g, inventoryData.pricingMessage)
      .replace(/{memoryMessage}/g, memoryInsights || 'Hope you\'re doing well!');

    // Clean up any leftover placeholders
    message = message.replace(/{[^}]*}/g, '').replace(/\s+/g, ' ').trim();

    // Add pricing disclaimers if needed
    if (detectsPricing(message)) {
      message = await addDisclaimersToMessage(message, inventoryData.context);
    }

    console.log(`Generated AI message for ${lead.first_name}: ${message}`);
    return message;

  } catch (error) {
    console.error('Error generating AI message:', error);
    return null;
  }
};

// Smart timing with business hours and jitter
const generateSmartSendTime = async (delayHours: number, jitterMinutes: number = 90): Promise<Date> => {
  const businessHours = await getBusinessHours();
  const centralTimeZone = 'America/Chicago'; // Central Time
  
  // Calculate base send time
  const baseSendTime = new Date();
  baseSendTime.setHours(baseSendTime.getHours() + delayHours);
  
  // Apply random jitter (±30-90 minutes)
  const jitterMs = (Math.random() * jitterMinutes * 2 - jitterMinutes) * 60 * 1000;
  baseSendTime.setTime(baseSendTime.getTime() + jitterMs);
  
  // Convert to Central Time for business hours check
  const centralTime = new Date(baseSendTime.toLocaleString("en-US", { timeZone: centralTimeZone }));
  
  // Block Sundays (day 0)
  if (centralTime.getDay() === 0) {
    // Move to Monday
    baseSendTime.setDate(baseSendTime.getDate() + 1);
    baseSendTime.setHours(10, 0, 0, 0); // Start Monday at 10 AM
  }
  
  // Ensure within business hours (9 AM - 7 PM Central)
  if (!isWithinBusinessHours(baseSendTime, { 
    start: "09:00", 
    end: "19:00", 
    timezone: centralTimeZone 
  })) {
    const centralHour = new Date(baseSendTime.toLocaleString("en-US", { timeZone: centralTimeZone })).getHours();
    
    if (centralHour < 9) {
      // Too early, move to 9 AM
      baseSendTime.setHours(9, Math.floor(Math.random() * 60), 0, 0);
    } else if (centralHour >= 19) {
      // Too late, move to next business day 9 AM
      baseSendTime.setDate(baseSendTime.getDate() + 1);
      // Skip if next day is Sunday
      if (baseSendTime.getDay() === 0) {
        baseSendTime.setDate(baseSendTime.getDate() + 1);
      }
      baseSendTime.setHours(9, Math.floor(Math.random() * 60), 0, 0);
    }
  }
  
  return baseSendTime;
};

// Track message performance for learning
const trackMessagePerformance = async (
  leadId: string, 
  messageId: string | null,
  template: AIMessageTemplate, 
  messageContent: string, 
  scheduledTime: Date,
  actualTime: Date,
  jitterApplied: number
): Promise<void> => {
  try {
    const sentTime = new Date();
    const performanceData = {
      lead_id: leadId,
      message_id: messageId,
      template_stage: template.stage,
      template_content: messageContent,
      sent_at: sentTime.toISOString(),
      sent_hour: sentTime.getHours(),
      sent_day_of_week: sentTime.getDay(),
      jitter_applied_minutes: jitterApplied,
      original_scheduled_time: scheduledTime.toISOString(),
      actual_sent_time: actualTime.toISOString()
    };
    
    // Use type assertion since the types haven't been regenerated yet
    await (supabase.from('ai_message_performance') as any).insert(performanceData);
    
    console.log(`📊 [AI LEARNING] Tracked performance for ${template.stage} message to lead ${leadId}`);
  } catch (error) {
    console.error('❌ [AI LEARNING] Error tracking message performance:', error);
  }
};

export const scheduleNextAIMessage = async (leadId: string): Promise<void> => {
  try {
    // Get current stage
    const { data: lead, error } = await supabase
      .from('leads')
      .select('ai_stage, last_reply_at')
      .eq('id', leadId)
      .single();

    if (error || !lead) return;

    const currentStage = lead.ai_stage || 'initial';
    const currentIndex = AI_MESSAGE_TEMPLATES.findIndex(t => t.stage === currentStage);
    
    // Check if lead responded recently (pause if response in last 24h)
    if (lead.last_reply_at) {
      const lastReply = new Date(lead.last_reply_at);
      const hoursAgo = (Date.now() - lastReply.getTime()) / (1000 * 60 * 60);
      if (hoursAgo < 24) {
        console.log(`⏸️ [AI SCHEDULING] Pausing automation for lead ${leadId} - recent response ${hoursAgo.toFixed(1)}h ago`);
        return;
      }
    }
    
    // Move to next stage
    if (currentIndex < AI_MESSAGE_TEMPLATES.length - 1) {
      const nextTemplate = AI_MESSAGE_TEMPLATES[currentIndex + 1];
      
      // Generate smart send time with jitter and business hours
      const nextSendTime = await generateSmartSendTime(
        nextTemplate.delayHours, 
        nextTemplate.jitterMinutes
      );

      await supabase
        .from('leads')
        .update({
          ai_stage: nextTemplate.stage,
          next_ai_send_at: nextSendTime.toISOString()
        })
        .eq('id', leadId);
        
      console.log(`📅 [AI SCHEDULING] Scheduled ${nextTemplate.stage} for lead ${leadId} at ${nextSendTime.toLocaleString()}`);
    } else {
      // No more messages, clear schedule
      await supabase
        .from('leads')
        .update({
          next_ai_send_at: null
        })
        .eq('id', leadId);
        
      console.log(`✅ [AI SCHEDULING] Completed message sequence for lead ${leadId}`);
    }
  } catch (error) {
    console.error('Error scheduling next AI message:', error);
  }
};

// Export tracking function for use in message sending
export { trackMessagePerformance };
