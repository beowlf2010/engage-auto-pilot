
import { supabase } from '@/integrations/supabase/client';
import { 
  trackVehicleMention, 
  updateLeadVehicleInterest, 
  addAIConversationNote,
  extractVehicleFromText 
} from './vehicleMentionService';

export interface EnhancedConversationContext {
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

export interface EnhancedAIResponse {
  message: string;
  confidence: number;
  reasoning: string;
  vehiclesMentioned?: string[];
  inventoryShown?: any[];
  followUpScheduled?: boolean;
}

// Process customer message for vehicle mentions and update lead data
export const processCustomerVehicleMentions = async (
  leadId: string,
  conversationId: string,
  messageContent: string
) => {
  try {
    const vehicleExtracts = extractVehicleFromText(messageContent);
    
    for (const vehicle of vehicleExtracts) {
      // Track the mention
      await trackVehicleMention(
        leadId,
        conversationId,
        vehicle.fullText,
        'inquiry',
        `Customer mentioned: ${vehicle.fullText}`,
        false
      );
      
      // Update lead's primary vehicle interest with the most recent mention
      await updateLeadVehicleInterest(
        leadId,
        vehicle.fullText,
        vehicle.year,
        vehicle.make,
        vehicle.model
      );
      
      console.log(`📝 Tracked vehicle mention: ${vehicle.fullText} for lead ${leadId}`);
    }
    
    return vehicleExtracts;
  } catch (error) {
    console.error('Error processing customer vehicle mentions:', error);
    return [];
  }
};

// Enhanced inventory check with detailed tracking
const enhancedInventoryCheck = async (vehicleInterest: string) => {
  try {
    const cleanInterest = vehicleInterest.replace(/"/g, '').replace(/\s+/g, ' ').trim();
    if (!cleanInterest) return { hasInventory: false, matchingVehicles: [], requestedCategory: null };

    console.log('🔍 Enhanced inventory check for:', cleanInterest);
    
    // Get ALL available inventory first
    const { data: allInventory, error } = await supabase
      .from('inventory')
      .select('id, make, model, year, price, fuel_type, condition, status, stock_number, vin')
      .eq('status', 'available');

    if (error) {
      console.error('❌ Error checking inventory:', error);
      return { hasInventory: false, matchingVehicles: [], requestedCategory: null };
    }

    if (!allInventory || allInventory.length === 0) {
      return { 
        hasInventory: false, 
        matchingVehicles: [], 
        requestedCategory: null,
        warning: 'no_inventory_available'
      };
    }

    // Extract vehicle details from interest
    const extracted = extractVehicleFromText(cleanInterest);
    
    if (extracted.length > 0) {
      const requestedVehicle = extracted[0];
      
      // Find exact matches first
      let matches = allInventory.filter(vehicle => {
        const makeMatch = (vehicle.make || '').toLowerCase() === requestedVehicle.make.toLowerCase();
        const modelMatch = (vehicle.model || '').toLowerCase().includes(requestedVehicle.model.toLowerCase());
        const yearMatch = !requestedVehicle.year || vehicle.year === requestedVehicle.year;
        
        return makeMatch && modelMatch && yearMatch;
      });

      // If no exact matches, try broader search
      if (matches.length === 0) {
        matches = allInventory.filter(vehicle => {
          const makeMatch = (vehicle.make || '').toLowerCase() === requestedVehicle.make.toLowerCase();
          return makeMatch;
        });
      }

      return {
        hasInventory: matches.length > 0,
        matchingVehicles: matches.slice(0, 5),
        requestedCategory: requestedVehicle,
        searchedVehicle: requestedVehicle.fullText
      };
    }

    // Fallback to general search
    return { 
      hasInventory: true, 
      matchingVehicles: allInventory.slice(0, 10), 
      requestedCategory: null 
    };

  } catch (error) {
    console.error('❌ Error in enhanced inventory check:', error);
    return { hasInventory: false, matchingVehicles: [], requestedCategory: null };
  }
};

// Generate enhanced AI response with vehicle tracking
export const generateEnhancedIntelligentResponse = async (
  context: EnhancedConversationContext
): Promise<EnhancedAIResponse | null> => {
  try {
    console.log('🤖 Generating enhanced intelligent AI response for lead:', context.leadId);

    // Get recent conversation history
    const recentMessages = context.messages
      .slice(-10)
      .map(msg => `${msg.direction === 'in' ? 'Customer' : 'Sales'}: ${msg.body}`)
      .join('\n');

    // Get the last customer message
    const lastCustomerMessage = context.messages
      .filter(msg => msg.direction === 'in')
      .slice(-1)[0];

    if (!lastCustomerMessage) {
      console.log('❌ No customer message found to respond to');
      return null;
    }

    // Process vehicle mentions from customer message
    const vehiclesMentioned = await processCustomerVehicleMentions(
      context.leadId,
      lastCustomerMessage.id,
      lastCustomerMessage.body
    );

    // Enhanced inventory checking
    const inventoryCheck = await enhancedInventoryCheck(context.vehicleInterest);
    
    // Track AI response with inventory information
    if (inventoryCheck.hasInventory && inventoryCheck.matchingVehicles.length > 0) {
      await trackVehicleMention(
        context.leadId,
        lastCustomerMessage.id,
        inventoryCheck.searchedVehicle || context.vehicleInterest,
        'showed_inventory',
        `AI showed ${inventoryCheck.matchingVehicles.length} matching vehicles`,
        true
      );
    } else if (inventoryCheck.searchedVehicle) {
      await trackVehicleMention(
        context.leadId,
        lastCustomerMessage.id,
        inventoryCheck.searchedVehicle,
        'no_inventory',
        'AI confirmed no matching inventory available',
        false
      );
    }

    // Generate AI response using edge function
    const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
      body: {
        leadName: context.leadName,
        vehicleInterest: context.vehicleInterest,
        lastCustomerMessage: lastCustomerMessage.body,
        conversationHistory: recentMessages,
        leadInfo: context.leadInfo,
        conversationLength: context.messages.length,
        inventoryStatus: {
          hasRequestedVehicle: inventoryCheck.hasInventory,
          matchingVehicles: inventoryCheck.matchingVehicles,
          requestedCategory: inventoryCheck.requestedCategory,
          searchedVehicle: inventoryCheck.searchedVehicle
        }
      }
    });

    if (error) {
      console.error('❌ Error from enhanced AI function:', error);
      return null;
    }

    if (!data?.message) {
      console.error('❌ No message returned from AI function');
      return null;
    }

    // Add conversation note about the AI response
    await addAIConversationNote(
      context.leadId,
      lastCustomerMessage.id,
      inventoryCheck.hasInventory ? 'vehicle_shown' : 'inventory_discussion',
      `AI Response: ${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}`,
      inventoryCheck.matchingVehicles || []
    );

    console.log('✅ Generated enhanced intelligent response with tracking');
    
    return {
      message: data.message,
      confidence: data.confidence || 0.8,
      reasoning: data.reasoning || 'Enhanced AI with vehicle tracking and inventory awareness',
      vehiclesMentioned: vehiclesMentioned.map(v => v.fullText),
      inventoryShown: inventoryCheck.matchingVehicles,
      followUpScheduled: false
    };

  } catch (error) {
    console.error('❌ Error generating enhanced intelligent response:', error);
    return null;
  }
};
