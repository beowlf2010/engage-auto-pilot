
import { supabase } from '@/integrations/supabase/client';

export interface ConversationContext {
  leadId: string;
  leadName: string;
  vehicleInterest: string;
  messages: Array<{
    id: string;
    body: string;
    direction: 'in' | 'out';
    sentAt: string;
    aiGenerated?: boolean;
  }>;
  leadInfo?: {
    phone: string;
    status: string;
    lastReplyAt?: string;
  };
}

export interface AIResponse {
  message: string;
  confidence: number;
  reasoning: string;
}

// Clean and validate vehicle interest data
const cleanVehicleInterest = (vehicleInterest: string): string => {
  if (!vehicleInterest) return '';
  
  // Remove malformed quotes and clean up the string
  return vehicleInterest
    .replace(/"/g, '') // Remove all quotes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

// Check if we have matching inventory for the vehicle interest
const checkInventoryAvailability = async (vehicleInterest: string) => {
  try {
    const cleanInterest = cleanVehicleInterest(vehicleInterest);
    if (!cleanInterest) return { hasInventory: false, matchingVehicles: [] };

    // Extract make/model from vehicle interest
    const words = cleanInterest.toLowerCase().split(' ');
    let make = '';
    let model = '';
    
    // Common vehicle makes to check for
    const knownMakes = ['tesla', 'ford', 'chevrolet', 'honda', 'toyota', 'bmw', 'mercedes', 'audi', 'nissan', 'hyundai'];
    
    for (const word of words) {
      if (knownMakes.includes(word)) {
        make = word;
        break;
      }
    }

    if (make) {
      const { data: inventory } = await supabase
        .from('inventory')
        .select('id, make, model, year, price')
        .eq('status', 'available')
        .ilike('make', `%${make}%`)
        .limit(5);

      return {
        hasInventory: inventory && inventory.length > 0,
        matchingVehicles: inventory || [],
        searchedMake: make
      };
    }

    return { hasInventory: false, matchingVehicles: [], searchedMake: make };
  } catch (error) {
    console.error('Error checking inventory:', error);
    return { hasInventory: false, matchingVehicles: [] };
  }
};

export const generateIntelligentResponse = async (context: ConversationContext): Promise<AIResponse | null> => {
  try {
    console.log('🤖 Generating intelligent AI response for lead:', context.leadId);

    // Clean the vehicle interest data
    const cleanedVehicleInterest = cleanVehicleInterest(context.vehicleInterest);
    
    // Get recent conversation history (last 10 messages)
    const recentMessages = context.messages
      .slice(-10)
      .map(msg => `${msg.direction === 'in' ? 'Customer' : 'Sales'}: ${msg.body}`)
      .join('\n');

    // Get the last customer message to understand what they're asking
    const lastCustomerMessage = context.messages
      .filter(msg => msg.direction === 'in')
      .slice(-1)[0];

    if (!lastCustomerMessage) {
      console.log('❌ No customer message found to respond to');
      return null;
    }

    // Check if we've already responded to this message
    const messagesAfterCustomer = context.messages.filter(msg => 
      new Date(msg.sentAt) > new Date(lastCustomerMessage.sentAt) && msg.direction === 'out'
    );

    if (messagesAfterCustomer.length > 0) {
      console.log('✅ Already responded to latest customer message');
      return null;
    }

    // Check inventory availability for the customer's interest
    const inventoryCheck = await checkInventoryAvailability(cleanedVehicleInterest);
    
    // Get available inventory for alternatives
    const { data: availableInventory } = await supabase
      .from('inventory')
      .select('make, model, year, price')
      .eq('status', 'available')
      .limit(10);

    const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
      body: {
        leadName: context.leadName,
        vehicleInterest: cleanedVehicleInterest,
        lastCustomerMessage: lastCustomerMessage.body,
        conversationHistory: recentMessages,
        leadInfo: context.leadInfo,
        conversationLength: context.messages.length,
        inventoryStatus: {
          hasRequestedVehicle: inventoryCheck.hasInventory,
          requestedMake: inventoryCheck.searchedMake,
          matchingVehicles: inventoryCheck.matchingVehicles,
          availableAlternatives: availableInventory || []
        }
      }
    });

    if (error) {
      console.error('❌ Error from intelligent AI function:', error);
      return null;
    }

    if (!data?.message) {
      console.error('❌ No message returned from AI function');
      return null;
    }

    console.log('✅ Generated intelligent response:', data.message);
    
    return {
      message: data.message,
      confidence: data.confidence || 0.8,
      reasoning: data.reasoning || 'AI analysis of conversation context with inventory validation'
    };

  } catch (error) {
    console.error('❌ Error generating intelligent response:', error);
    return null;
  }
};

export const shouldGenerateResponse = (context: ConversationContext): boolean => {
  // Only generate if there's a recent customer message we haven't responded to
  const lastCustomerMessage = context.messages
    .filter(msg => msg.direction === 'in')
    .slice(-1)[0];

  if (!lastCustomerMessage) return false;

  // Check if we've already responded
  const messagesAfterCustomer = context.messages.filter(msg => 
    new Date(msg.sentAt) > new Date(lastCustomerMessage.sentAt) && msg.direction === 'out'
  );

  return messagesAfterCustomer.length === 0;
};
