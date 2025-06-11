
import { supabase } from '@/integrations/supabase/client';
import { getLeadMemory } from './aiMemoryService';
import { findMatchingInventory } from './inventoryService';
import { addDisclaimersToMessage, detectsPricing } from './pricingDisclaimerService';

export interface AITemplate {
  id: string;
  stage: string;
  variant_name: string;
  template: string;
  response_rate: number;
  total_sent: number;
  total_responses: number;
}

export interface ScheduleConfig {
  stage_name: string;
  day_offset: number;
  messages_per_day: number;
  preferred_hours: number[];
  is_active: boolean;
}

export interface ResponsePattern {
  lead_id: string;
  best_response_hours: number[];
  best_response_days: number[];
  avg_response_time_hours: number;
  total_messages_sent: number;
  total_responses: number;
  preferred_content_types: string[];
  inventory_responsiveness: any;
}

export interface InventoryData {
  isInventoryRelated: boolean;
  mentionsFinancing?: boolean;
  mentionsTradeIn?: boolean;
  mentionsLease?: boolean;
}

// Get all active schedule configurations
export const getScheduleConfigs = async (): Promise<ScheduleConfig[]> => {
  const { data, error } = await supabase
    .from('ai_schedule_config')
    .select('*')
    .eq('is_active', true)
    .order('day_offset', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Get templates for a specific stage with performance data
export const getTemplatesForStage = async (stage: string): Promise<AITemplate[]> => {
  const { data, error } = await supabase
    .from('ai_message_templates')
    .select('*')
    .eq('stage', stage)
    .eq('is_active', true)
    .order('response_rate', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Select best performing template for a stage
export const selectBestTemplate = async (stage: string, leadId: string): Promise<AITemplate | null> => {
  const templates = await getTemplatesForStage(stage);
  if (templates.length === 0) return null;

  // Get lead's response patterns
  const { data: pattern } = await supabase
    .from('lead_response_patterns')
    .select('*')
    .eq('lead_id', leadId)
    .single();

  // If we have response pattern data, use it to select better templates
  if (pattern && pattern.preferred_content_types?.length > 0) {
    const preferredTemplate = templates.find(t => 
      pattern.preferred_content_types.includes(t.variant_name)
    );
    if (preferredTemplate) return preferredTemplate;
  }

  // Otherwise, use A/B testing logic - favor high performers but give others chances
  const totalSent = templates.reduce((sum, t) => sum + t.total_sent, 0);
  
  // If not enough data, rotate evenly
  if (totalSent < 100) {
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
  }

  // Weight by performance (80% best performers, 20% exploration)
  const rand = Math.random();
  if (rand < 0.8) {
    // Use top 2 performers
    return templates[Math.floor(Math.random() * Math.min(2, templates.length))];
  } else {
    // Explore other templates
    return templates[Math.floor(Math.random() * templates.length)];
  }
};

// Calculate optimal send time for a lead
export const calculateOptimalSendTime = async (leadId: string, stageHours: number[]): Promise<Date> => {
  const { data: pattern } = await supabase
    .from('lead_response_patterns')
    .select('best_response_hours')
    .eq('lead_id', leadId)
    .single();

  let preferredHours = stageHours;
  
  // Use lead's preferred hours if available
  if (pattern?.best_response_hours?.length > 0) {
    preferredHours = pattern.best_response_hours;
  }

  // Find the next available preferred hour
  const now = new Date();
  const currentHour = now.getHours();
  
  // Find next preferred hour today or tomorrow
  let targetHour = preferredHours.find(h => h > currentHour);
  let targetDate = new Date(now);
  
  if (!targetHour) {
    // Use first preferred hour tomorrow
    targetHour = preferredHours[0];
    targetDate.setDate(targetDate.getDate() + 1);
  }
  
  targetDate.setHours(targetHour, 0, 0, 0);
  return targetDate;
};

// Generate next scheduled messages for a lead
export const generateNextScheduledMessages = async (leadId: string): Promise<void> => {
  try {
    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) return;

    // Don't schedule if AI is paused or opted out
    if (lead.ai_sequence_paused || !lead.ai_opt_in) return;

    const scheduleConfigs = await getScheduleConfigs();
    const leadCreatedAt = new Date(lead.created_at);
    const now = new Date();
    const daysSinceCreated = Math.floor((now.getTime() - leadCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

    // Find applicable schedule configs for current day offset
    const applicableConfigs = scheduleConfigs.filter(config => {
      if (config.stage_name.startsWith('day_1')) {
        return daysSinceCreated === 0;
      } else if (config.stage_name.startsWith('week_1')) {
        return daysSinceCreated >= 1 && daysSinceCreated <= 7;
      } else if (config.stage_name.startsWith('week_2')) {
        return daysSinceCreated >= 8 && daysSinceCreated <= 14;
      } else if (config.stage_name.startsWith('month_2')) {
        return daysSinceCreated >= 15 && daysSinceCreated <= 45;
      } else if (config.stage_name.startsWith('month_3')) {
        return daysSinceCreated >= 46 && daysSinceCreated <= 90;
      }
      return false;
    });

    for (const config of applicableConfigs) {
      const sendTime = await calculateOptimalSendTime(leadId, config.preferred_hours);
      
      // Update lead's next AI send time with the earliest scheduled message
      await supabase
        .from('leads')
        .update({
          next_ai_send_at: sendTime.toISOString(),
          ai_stage: config.stage_name
        })
        .eq('id', leadId);
      
      break; // Only schedule the next immediate message
    }
  } catch (error) {
    console.error('Error generating scheduled messages:', error);
  }
};

// Track message analytics
export const trackMessageAnalytics = async (
  leadId: string,
  templateId: string,
  messageContent: string,
  stage: string,
  inventoryMentioned: any
): Promise<void> => {
  const now = new Date();
  
  await supabase
    .from('ai_message_analytics')
    .insert({
      lead_id: leadId,
      template_id: templateId,
      message_content: messageContent,
      message_stage: stage,
      day_of_week: now.getDay(),
      hour_of_day: now.getHours(),
      inventory_mentioned: inventoryMentioned
    });
};

// Update response patterns when a lead responds
export const updateResponsePatterns = async (leadId: string, responseTime: Date): Promise<void> => {
  try {
    const hour = responseTime.getHours();
    const dayOfWeek = responseTime.getDay();

    // Get existing pattern or create new one
    const { data: existing } = await supabase
      .from('lead_response_patterns')
      .select('*')
      .eq('lead_id', leadId)
      .single();

    if (existing) {
      // Update existing pattern
      const updatedHours = [...(existing.best_response_hours || []), hour];
      const updatedDays = [...(existing.best_response_days || []), dayOfWeek];
      
      // Keep only recent patterns (last 10 responses)
      const recentHours = updatedHours.slice(-10);
      const recentDays = updatedDays.slice(-10);

      await supabase
        .from('lead_response_patterns')
        .update({
          best_response_hours: recentHours,
          best_response_days: recentDays,
          total_responses: existing.total_responses + 1,
          last_response_at: responseTime.toISOString()
        })
        .eq('lead_id', leadId);
    } else {
      // Create new pattern
      await supabase
        .from('lead_response_patterns')
        .insert({
          lead_id: leadId,
          best_response_hours: [hour],
          best_response_days: [dayOfWeek],
          total_responses: 1,
          last_response_at: responseTime.toISOString()
        });
    }
  } catch (error) {
    console.error('Error updating response patterns:', error);
  }
};

// Update template performance
export const updateTemplatePerformance = async (templateId: string, gotResponse: boolean): Promise<void> => {
  const { data: template } = await supabase
    .from('ai_message_templates')
    .select('total_sent, total_responses')
    .eq('id', templateId)
    .single();

  if (template) {
    const newTotalSent = template.total_sent + 1;
    const newTotalResponses = template.total_responses + (gotResponse ? 1 : 0);
    const newResponseRate = newTotalSent > 0 ? newTotalResponses / newTotalSent : 0;

    await supabase
      .from('ai_message_templates')
      .update({
        total_sent: newTotalSent,
        total_responses: newTotalResponses,
        response_rate: newResponseRate
      })
      .eq('id', templateId);
  }
};

// Generate AI message with advanced features
export const generateAdvancedAIMessage = async (leadId: string): Promise<{ message: string; templateId: string } | null> => {
  try {
    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) return null;

    // Check if sequence is paused
    if (lead.ai_sequence_paused) return null;

    const currentStage = lead.ai_stage || 'day_1_morning';
    
    // Select best template for this stage
    const template = await selectBestTemplate(currentStage, leadId);
    if (!template) return null;

    // Get lead memory for personalization
    const memory = await getLeadMemory(leadId);
    const memoryInsights = memory
      .filter(m => m.memory_type === 'preference')
      .slice(0, 2)
      .map(m => m.content)
      .join('. ');

    // Generate inventory-specific content
    const matchingInventory = await findMatchingInventory(leadId);
    
    let inventoryMessage = "We have several vehicles that might interest you.";
    let availabilityMessage = "Let me know what you're looking for!";
    let pricingMessage = "";
    let inventoryData: InventoryData = { isInventoryRelated: false };

    if (matchingInventory.length > 0) {
      const topMatch = matchingInventory[0];
      const price = topMatch.price ? `$${topMatch.price.toLocaleString()}` : '';
      
      inventoryMessage = `I have a ${topMatch.year} ${topMatch.make} ${topMatch.model}`;
      if (price) inventoryMessage += ` priced at ${price}`;
      inventoryMessage += ` that matches what you're looking for.`;

      availabilityMessage = matchingInventory.length > 1 
        ? `We also have ${matchingInventory.length - 1} other similar vehicles available.`
        : "This one is perfect for your needs!";

      pricingMessage = price 
        ? `The ${topMatch.year} ${topMatch.make} ${topMatch.make} is priced at ${price}.`
        : "";

      inventoryData = { 
        isInventoryRelated: true,
        mentionsFinancing: template.template.toLowerCase().includes('financ'),
        mentionsTradeIn: template.template.toLowerCase().includes('trade'),
        mentionsLease: template.template.toLowerCase().includes('lease')
      };
    }

    // Replace template variables
    let message = template.template
      .replace(/{firstName}/g, lead.first_name)
      .replace(/{lastName}/g, lead.last_name)
      .replace(/{vehicleInterest}/g, lead.vehicle_interest)
      .replace(/{inventoryMessage}/g, inventoryMessage)
      .replace(/{availabilityMessage}/g, availabilityMessage)
      .replace(/{pricingMessage}/g, pricingMessage)
      .replace(/{memoryMessage}/g, memoryInsights || 'Hope you\'re doing well!');

    // Clean up any leftover placeholders
    message = message.replace(/{[^}]*}/g, '').replace(/\s+/g, ' ').trim();

    // Add pricing disclaimers if needed
    if (detectsPricing(message)) {
      message = await addDisclaimersToMessage(message, inventoryData);
    }

    // Track analytics
    await trackMessageAnalytics(leadId, template.id, message, currentStage, matchingInventory);

    return { message, templateId: template.id };

  } catch (error) {
    console.error('Error generating advanced AI message:', error);
    return null;
  }
};
