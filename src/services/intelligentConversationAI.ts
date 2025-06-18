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

// Enhanced vehicle categorization with new/used awareness
const categorizeVehicle = (vehicleText: string) => {
  const text = vehicleText.toLowerCase();
  
  // Determine if this is likely a new or used inquiry
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  const currentYear = new Date().getFullYear();
  const isUsedByYear = yearMatch && parseInt(yearMatch[0]) < currentYear;
  const hasUsedKeywords = /\b(used|pre-owned|certified|pre owned)\b/i.test(text);
  const hasNewKeywords = /\b(new|brand new|latest|2024|2025)\b/i.test(text);
  
  // Determine condition
  let condition = 'unknown';
  if (hasUsedKeywords || isUsedByYear) {
    condition = 'used';
  } else if (hasNewKeywords || (!yearMatch && !hasUsedKeywords)) {
    condition = 'new'; // Default to new if no clear indicators
  }
  
  // Electric/Hybrid classification
  const evIndicators = ['tesla', 'electric', 'ev', 'hybrid', 'plug-in', 'bolt', 'leaf', 'prius', 'model'];
  const isEV = evIndicators.some(indicator => text.includes(indicator));
  
  // Luxury classification
  const luxuryBrands = ['tesla', 'bmw', 'mercedes', 'audi', 'lexus', 'cadillac', 'lincoln', 'genesis', 'porsche'];
  const isLuxury = luxuryBrands.some(brand => text.includes(brand));
  
  // Tesla specific
  const isTesla = text.includes('tesla');
  
  // Price tier estimation
  let estimatedPriceRange = { min: 0, max: 200000 };
  if (isTesla) {
    estimatedPriceRange = condition === 'used' ? { min: 15000, max: 80000 } : { min: 35000, max: 120000 };
  } else if (isLuxury) {
    estimatedPriceRange = { min: 30000, max: 100000 };
  }
  
  return {
    isEV,
    isLuxury,
    isTesla,
    condition,
    estimatedPriceRange,
    category: isTesla ? 'tesla' : isEV ? 'electric' : isLuxury ? 'luxury' : 'standard'
  };
};

// Enhanced inventory availability check with Tesla new/used logic
const checkInventoryAvailability = async (vehicleInterest: string) => {
  try {
    const cleanInterest = cleanVehicleInterest(vehicleInterest);
    if (!cleanInterest) return { hasInventory: false, matchingVehicles: [], requestedCategory: null };

    const requestedCategory = categorizeVehicle(cleanInterest);
    
    // Extract make/model from vehicle interest
    const words = cleanInterest.toLowerCase().split(' ');
    let make = '';
    
    // Common vehicle makes to check for
    const knownMakes = ['tesla', 'ford', 'chevrolet', 'honda', 'toyota', 'bmw', 'mercedes', 'audi', 'nissan', 'hyundai', 'lexus', 'cadillac'];
    
    for (const word of words) {
      if (knownMakes.includes(word)) {
        make = word;
        break;
      }
    }

    if (make) {
      let query = supabase
        .from('inventory')
        .select('id, make, model, year, price, fuel_type, condition')
        .eq('status', 'available')
        .ilike('make', `%${make}%`);

      // For Tesla, filter by condition if we know it
      if (make === 'tesla' && requestedCategory.condition !== 'unknown') {
        query = query.eq('condition', requestedCategory.condition);
      }

      const { data: inventory } = await query.limit(5);

      return {
        hasInventory: inventory && inventory.length > 0,
        matchingVehicles: inventory || [],
        searchedMake: make,
        requestedCategory
      };
    }

    return { 
      hasInventory: false, 
      matchingVehicles: [], 
      searchedMake: make,
      requestedCategory 
    };
  } catch (error) {
    console.error('Error checking inventory:', error);
    return { hasInventory: false, matchingVehicles: [], requestedCategory: null };
  }
};

// Enhanced alternative finding with Tesla awareness
const findCategoryRelevantAlternatives = async (requestedCategory: any) => {
  try {
    let query = supabase
      .from('inventory')
      .select('make, model, year, price, fuel_type, condition')
      .eq('status', 'available');

    // If looking for Tesla, find alternatives based on condition
    if (requestedCategory?.isTesla) {
      if (requestedCategory.condition === 'used') {
        // For used Tesla seekers, show luxury/EV alternatives
        const { data: alternatives } = await query
          .or('fuel_type.eq.Electric,fuel_type.eq.Hybrid,make.ilike.%bmw%,make.ilike.%mercedes%,make.ilike.%audi%,make.ilike.%lexus%')
          .eq('condition', 'used')
          .limit(5);
        
        if (alternatives && alternatives.length > 0) {
          return alternatives;
        }
      } else if (requestedCategory.condition === 'new') {
        // For new Tesla seekers, show new EVs/luxury alternatives
        const { data: alternatives } = await query
          .or('fuel_type.eq.Electric,fuel_type.eq.Hybrid')
          .eq('condition', 'new')
          .limit(5);
        
        if (alternatives && alternatives.length > 0) {
          return alternatives;
        }
      }
    }

    // If looking for EVs, prioritize electric vehicles
    if (requestedCategory?.isEV) {
      const { data: evInventory } = await query
        .or('fuel_type.eq.Electric,fuel_type.eq.Hybrid,make.ilike.%tesla%')
        .limit(5);
      
      if (evInventory && evInventory.length > 0) {
        return evInventory;
      }
    }

    // If looking for luxury, filter by price range and luxury brands
    if (requestedCategory?.isLuxury) {
      const { data: luxuryInventory } = await query
        .gte('price', 30000)
        .or('make.ilike.%bmw%,make.ilike.%mercedes%,make.ilike.%audi%,make.ilike.%lexus%,make.ilike.%cadillac%')
        .limit(5);
      
      if (luxuryInventory && luxuryInventory.length > 0) {
        return luxuryInventory;
      }
    }

    // Fallback to general inventory
    const { data: generalInventory } = await query.limit(10);
    return generalInventory || [];
  } catch (error) {
    console.error('Error finding alternatives:', error);
    return [];
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

    // Enhanced inventory checking with category awareness
    const inventoryCheck = await checkInventoryAvailability(cleanedVehicleInterest);
    
    // Get category-relevant alternatives
    const availableAlternatives = inventoryCheck.requestedCategory ? 
      await findCategoryRelevantAlternatives(inventoryCheck.requestedCategory) :
      [];

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
          availableAlternatives: availableAlternatives,
          requestedCategory: inventoryCheck.requestedCategory
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
      reasoning: data.reasoning || 'Enhanced AI analysis with Tesla new/used awareness and category-aware inventory matching'
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
