
import { supabase } from '@/integrations/supabase/client';
import { 
  trackVehicleMention, 
  updateLeadVehicleInterest, 
  addAIConversationNote,
  extractVehicleFromText 
} from './vehicleMention';

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
  customerIntent?: any;
  answerGuidance?: any;
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

// Enhanced inventory check with honest validation - NO FALSE CLAIMS
const enhancedInventoryCheck = async (vehicleInterest: string) => {
  try {
    const cleanInterest = vehicleInterest.replace(/"/g, '').replace(/\s+/g, ' ').trim();
    if (!cleanInterest) return { hasInventory: false, matchingVehicles: [], requestedCategory: null };

    console.log('🔍 STRICT Enhanced inventory check for:', cleanInterest);
    
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
      console.log('⚠️ NO INVENTORY AVAILABLE - MUST BE HONEST');
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
      
      // Find exact matches first - BE STRICT
      let matches = allInventory.filter(vehicle => {
        const makeMatch = (vehicle.make || '').toLowerCase() === requestedVehicle.make.toLowerCase();
        const modelMatch = (vehicle.model || '').toLowerCase().includes(requestedVehicle.model.toLowerCase());
        const yearMatch = !requestedVehicle.year || vehicle.year === requestedVehicle.year;
        
        return makeMatch && modelMatch && yearMatch;
      });

      console.log(`🔍 Found ${matches.length} EXACT matches for ${requestedVehicle.fullText}`);

      // If no exact matches, try broader search but still be strict
      if (matches.length === 0) {
        matches = allInventory.filter(vehicle => {
          const makeMatch = (vehicle.make || '').toLowerCase() === requestedVehicle.make.toLowerCase();
          return makeMatch;
        });
        console.log(`🔍 Found ${matches.length} MAKE matches for ${requestedVehicle.make}`);
      }

      // CRITICAL: Only return true if we have ACTUAL matches
      return {
        hasInventory: matches.length > 0,
        matchingVehicles: matches.slice(0, 5),
        requestedCategory: requestedVehicle,
        searchedVehicle: requestedVehicle.fullText,
        actualCount: matches.length
      };
    }

    // Fallback to general search - but be honest about what we have
    console.log(`📦 Fallback: ${allInventory.length} total vehicles available`);
    return { 
      hasInventory: true, 
      matchingVehicles: allInventory.slice(0, 10), 
      requestedCategory: null,
      actualCount: allInventory.length
    };

  } catch (error) {
    console.error('❌ Error in STRICT enhanced inventory check:', error);
    return { hasInventory: false, matchingVehicles: [], requestedCategory: null };
  }
};

// Generate enhanced AI response with QUESTION-FIRST priority and HONEST inventory
export const generateEnhancedIntelligentResponse = async (
  context: EnhancedConversationContext
): Promise<EnhancedAIResponse | null> => {
  try {
    console.log('🤖 Generating QUESTION-FIRST enhanced intelligent AI response for lead:', context.leadId);

    // Get recent conversation history
    const recentMessages = context.messages
      .slice(-10)
      .map(msg => `${msg.direction === 'in' ? 'Customer' : 'Sales'}: ${msg.body}`)
      .join('\n');

    // Get the last customer message - THIS IS CRITICAL TO ANSWER
    const lastCustomerMessage = context.messages
      .filter(msg => msg.direction === 'in')
      .slice(-1)[0];

    if (!lastCustomerMessage) {
      console.log('❌ No customer message found to respond to');
      return null;
    }

    console.log('📝 Customer message to address:', lastCustomerMessage.body);

    // Check if customer is asking about inventory availability
    const isInventoryQuestion = /\b(see|available|online|have|stock|inventory|find|look|show|get)\b/i.test(lastCustomerMessage.body);
    console.log('❓ Is inventory question:', isInventoryQuestion);

    // Process vehicle mentions from customer message
    const vehiclesMentioned = await processCustomerVehicleMentions(
      context.leadId,
      lastCustomerMessage.id,
      lastCustomerMessage.body
    );

    // STRICT inventory checking - NO FALSE CLAIMS
    const inventoryCheck = await enhancedInventoryCheck(context.vehicleInterest);
    console.log('📦 Inventory check result:', {
      hasInventory: inventoryCheck.hasInventory,
      actualCount: inventoryCheck.actualCount || 0,
      matchingVehicles: inventoryCheck.matchingVehicles?.length || 0
    });
    
    // Track AI response with inventory information
    if (inventoryCheck.hasInventory && inventoryCheck.matchingVehicles.length > 0) {
      await trackVehicleMention(
        context.leadId,
        lastCustomerMessage.id,
        inventoryCheck.searchedVehicle || context.vehicleInterest,
        'showed_inventory',
        `AI showed ${inventoryCheck.matchingVehicles.length} ACTUAL matching vehicles`,
        true
      );
    } else if (inventoryCheck.searchedVehicle) {
      await trackVehicleMention(
        context.leadId,
        lastCustomerMessage.id,
        inventoryCheck.searchedVehicle,
        'no_inventory',
        'AI honestly confirmed no matching inventory available',
        false
      );
    }

    // Generate AI response using edge function with QUESTION-FIRST priority
    const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
      body: {
        leadId: context.leadId,
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
          searchedVehicle: inventoryCheck.searchedVehicle,
          hasActualInventory: inventoryCheck.hasInventory,
          actualVehicles: inventoryCheck.matchingVehicles || [],
          validatedCount: inventoryCheck.matchingVehicles?.length || 0,
          inventoryWarning: inventoryCheck.warning,
          realInventoryCount: inventoryCheck.matchingVehicles?.length || 0,
          strictMode: true,
          mustNotClaim: !inventoryCheck.hasInventory,
          isInventoryQuestion: isInventoryQuestion
        },
        context: {
          questionFirst: true,
          answerCustomerQuestion: true,
          inventoryHonesty: true
        }
      }
    });

    if (error) {
      console.error('❌ Error from QUESTION-FIRST enhanced AI function:', error);
      return null;
    }

    if (!data?.message) {
      console.error('❌ No message returned from AI function');
      return null;
    }

    // Add conversation note about the AI response - FIX: Use correct note type
    await addAIConversationNote(
      context.leadId,
      lastCustomerMessage.id,
      inventoryCheck.hasInventory ? 'vehicle_shown' : 'inventory_discussion',
      `QUESTION-FIRST AI Response: ${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}`,
      inventoryCheck.matchingVehicles || []
    );

    console.log('✅ Generated QUESTION-FIRST enhanced intelligent response with honest inventory');
    
    return {
      message: data.message,
      confidence: data.confidence || 0.8,
      reasoning: data.reasoning || 'QUESTION-FIRST Enhanced AI with vehicle tracking and HONEST inventory awareness',
      vehiclesMentioned: vehiclesMentioned.map(v => v.fullText),
      inventoryShown: inventoryCheck.matchingVehicles,
      followUpScheduled: false,
      customerIntent: data.customerIntent || null,
      answerGuidance: data.answerGuidance || null
    };

  } catch (error) {
    console.error('❌ Error generating QUESTION-FIRST enhanced intelligent response:', error);
    return null;
  }
};
