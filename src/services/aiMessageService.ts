import { supabase } from '@/integrations/supabase/client';
import { getLeadMemory } from './aiMemoryService';
import { findMatchingInventory } from './inventoryService';
import { addDisclaimersToMessage, detectsPricing } from './pricingDisclaimerService';

export interface AIMessageTemplate {
  stage: string;
  template: string;
  delayHours: number;
}

const AI_MESSAGE_TEMPLATES: AIMessageTemplate[] = [
  {
    stage: 'initial',
    template: `Hi {firstName}! I'm Finn from the dealership. I see you're interested in {vehicleInterest}. {inventoryMessage} Would you like to schedule a time to see it?`,
    delayHours: 0
  },
  {
    stage: 'follow_up_1',
    template: `Hi {firstName}, just wanted to follow up on {vehicleInterest}. {inventoryMessage} {availabilityMessage} Any questions I can help with?`,
    delayHours: 24
  },
  {
    stage: 'follow_up_2',
    template: `Hey {firstName}! {inventoryMessage} {pricingMessage} Would you like to come in for a test drive this week?`,
    delayHours: 72
  },
  {
    stage: 'follow_up_3',
    template: `Hi {firstName}, {memoryMessage} {inventoryMessage} We're here to help when you're ready!`,
    delayHours: 168
  }
];

const generateInventoryMessage = async (leadId: string, vehicleInterest: string) => {
  try {
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
      inventoryMessage: "We have several vehicles that might interest you.",
      availabilityMessage: "Let me know what you're looking for!",
      pricingMessage: "",
      context: { isInventoryRelated: false }
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

    // Generate inventory-specific content with unknown filtering
    const inventoryData = await generateInventoryMessage(leadId, lead.vehicle_interest);

    // Replace template variables
    let message = template.template
      .replace(/{firstName}/g, lead.first_name)
      .replace(/{lastName}/g, lead.last_name)
      .replace(/{vehicleInterest}/g, lead.vehicle_interest)
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

export const scheduleNextAIMessage = async (leadId: string): Promise<void> => {
  try {
    // Get current stage
    const { data: lead, error } = await supabase
      .from('leads')
      .select('ai_stage')
      .eq('id', leadId)
      .single();

    if (error || !lead) return;

    const currentStage = lead.ai_stage || 'initial';
    const currentIndex = AI_MESSAGE_TEMPLATES.findIndex(t => t.stage === currentStage);
    
    // Move to next stage
    if (currentIndex < AI_MESSAGE_TEMPLATES.length - 1) {
      const nextTemplate = AI_MESSAGE_TEMPLATES[currentIndex + 1];
      const nextSendTime = new Date();
      nextSendTime.setHours(nextSendTime.getHours() + nextTemplate.delayHours);

      await supabase
        .from('leads')
        .update({
          ai_stage: nextTemplate.stage,
          next_ai_send_at: nextSendTime.toISOString()
        })
        .eq('id', leadId);
    } else {
      // No more messages, clear schedule
      await supabase
        .from('leads')
        .update({
          next_ai_send_at: null
        })
        .eq('id', leadId);
    }
  } catch (error) {
    console.error('Error scheduling next AI message:', error);
  }
};
