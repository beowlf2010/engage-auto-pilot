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
  customerIntent?: any;
  answerGuidance?: any;
}

// Enhanced conversational awareness detection
const analyzeConversationalSignals = (message: string): boolean => {
  const text = message.toLowerCase();
  
  // Handoff and introduction patterns
  const conversationalPatterns = [
    /\b(will be handling|handling it|taking over|working with)\b/,
    /\b(don't know if you know|meet|this is|here is)\s+\w+\b/,
    /\b(letting you know|wanted to tell you|heads up|update)\b/,
    /\b(by the way|also|additionally|just so you know)\b/,
    /\b(transferred to|passed to|new contact|new person)\b/,
    /\b(process|procedure|next steps|moving forward)\b/
  ];
  
  return conversationalPatterns.some(pattern => pattern.test(text));
};

// Clean and validate vehicle interest data
const cleanVehicleInterest = (vehicleInterest: string): string => {
  if (!vehicleInterest) return '';
  
  // Remove malformed quotes and clean up the string
  return vehicleInterest
    .replace(/"/g, '') // Remove all quotes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

// Enhanced vehicle categorization with strict inventory validation
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

// Enhanced inventory availability check with strict validation
const checkInventoryAvailability = async (vehicleInterest: string) => {
  try {
    const cleanInterest = cleanVehicleInterest(vehicleInterest);
    if (!cleanInterest) return { hasInventory: false, matchingVehicles: [], requestedCategory: null };

    const requestedCategory = categorizeVehicle(cleanInterest);
    
    console.log('🔍 STRICT inventory check for:', cleanInterest, 'Category:', requestedCategory.category);
    
    // Get ALL available inventory first for strict validation
    const { data: allInventory, error } = await supabase
      .from('inventory')
      .select('id, make, model, year, price, fuel_type, condition, status')
      .eq('status', 'available');

    if (error) {
      console.error('❌ Error checking inventory:', error);
      return { hasInventory: false, matchingVehicles: [], requestedCategory };
    }

    console.log(`📊 Total available inventory: ${allInventory?.length || 0} vehicles`);
    
    if (!allInventory || allInventory.length === 0) {
      console.log('⚠️ NO INVENTORY AVAILABLE AT ALL');
      return { 
        hasInventory: false, 
        matchingVehicles: [], 
        requestedCategory,
        warning: 'no_inventory_available'
      };
    }

    // Strict EV/Hybrid filtering - only actual electric/hybrid vehicles
    if (requestedCategory.isEV) {
      const evInventory = allInventory.filter(vehicle => {
        const fuelType = (vehicle.fuel_type || '').toLowerCase();
        const make = (vehicle.make || '').toLowerCase();
        
        return fuelType.includes('electric') || 
               fuelType.includes('hybrid') || 
               fuelType.includes('plug') ||
               make.includes('tesla');
      });

      console.log(`⚡ Found ${evInventory.length} actual electric/hybrid vehicles`);
      
      if (evInventory.length === 0) {
        console.log('❌ NO ELECTRIC VEHICLES IN INVENTORY - DO NOT CLAIM TO HAVE BOLT OR EQUINOX EV');
        return {
          hasInventory: false,
          matchingVehicles: [],
          requestedCategory,
          warning: 'no_evs_available'
        };
      }

      return {
        hasInventory: true,
        matchingVehicles: evInventory.slice(0, 5),
        requestedCategory,
        actualEVCount: evInventory.length
      };
    }

    // Extract make/model from vehicle interest for non-EV searches
    const words = cleanInterest.toLowerCase().split(' ');
    let make = '';
    
    const knownMakes = ['tesla', 'ford', 'chevrolet', 'chevy', 'honda', 'toyota', 'bmw', 'mercedes', 'audi', 'nissan', 'hyundai', 'lexus', 'cadillac'];
    
    for (const word of words) {
      if (knownMakes.includes(word)) {
        make = word === 'chevy' ? 'chevrolet' : word;
        break;
      }
    }

    if (make) {
      const makeInventory = allInventory.filter(vehicle => 
        (vehicle.make || '').toLowerCase().includes(make)
      );

      console.log(`🚗 Found ${makeInventory.length} ${make} vehicles`);

      // For Tesla, apply condition filtering
      if (make === 'tesla' && requestedCategory.condition !== 'unknown') {
        const conditionFiltered = makeInventory.filter(vehicle => 
          (vehicle.condition || '').toLowerCase() === requestedCategory.condition
        );
        
        return {
          hasInventory: conditionFiltered.length > 0,
          matchingVehicles: conditionFiltered.slice(0, 5),
          searchedMake: make,
          requestedCategory
        };
      }

      return {
        hasInventory: makeInventory.length > 0,
        matchingVehicles: makeInventory.slice(0, 5),
        searchedMake: make,
        requestedCategory
      };
    }

    // General inventory fallback
    return { 
      hasInventory: true, 
      matchingVehicles: allInventory.slice(0, 10), 
      searchedMake: '',
      requestedCategory 
    };

  } catch (error) {
    console.error('❌ Error in strict inventory check:', error);
    return { hasInventory: false, matchingVehicles: [], requestedCategory: null, warning: 'inventory_check_failed' };
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

export const generateEnhancedIntelligentResponse = async (context: ConversationContext): Promise<AIResponse | null> => {
  try {
    console.log('🤖 Generating CONVERSATIONALLY-AWARE intelligent AI response for lead:', context.leadId);

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

    // Enhanced check: also respond to conversational messages that warrant acknowledgment
    const hasConversationalSignals = analyzeConversationalSignals(lastCustomerMessage.body);
    console.log('🗣️ [CONVERSATIONAL AWARENESS] Message has conversational signals:', hasConversationalSignals);

    const { data, error } = await supabase.functions.invoke('intelligent-conversation-ai', {
      body: {
        leadId: context.leadId,
        leadName: context.leadName,
        messageBody: lastCustomerMessage.body,
        conversationHistory: recentMessages,
        leadInfo: context.leadInfo,
        conversationLength: context.messages.length,
        hasConversationalSignals,
        salespersonName: 'Finn',
        dealershipName: 'Jason Pilger Chevrolet'
      }
    });

    if (error) {
      console.error('❌ Error from conversationally-aware AI function:', error);
      return null;
    }

    if (!data?.response) {
      console.error('❌ No response returned from AI function');
      return null;
    }

    console.log('✅ Generated CONVERSATIONALLY-AWARE response:', data.response);
    
    return {
      message: data.response,
      confidence: data.confidence || 0.8,
      reasoning: 'Enhanced conversationally-aware AI with handoff and informational message detection',
      customerIntent: data.customerIntent || null,
      answerGuidance: data.answerGuidance || null
    };

  } catch (error) {
    console.error('❌ Error generating conversationally-aware response:', error);
    return null;
  }
};

export const shouldGenerateResponse = (context: ConversationContext): boolean => {
  // Get the last customer message
  const lastCustomerMessage = context.messages
    .filter(msg => msg.direction === 'in')
    .slice(-1)[0];

  if (!lastCustomerMessage) return false;

  // Check if we've already responded
  const messagesAfterCustomer = context.messages.filter(msg => 
    new Date(msg.sentAt) > new Date(lastCustomerMessage.sentAt) && msg.direction === 'out'
  );

  if (messagesAfterCustomer.length > 0) return false;

  // Enhanced logic: also respond to conversational messages
  const hasConversationalSignals = analyzeConversationalSignals(lastCustomerMessage.body);
  
  // Traditional direct questions or new conversational awareness
  const hasDirectQuestion = /\?/.test(lastCustomerMessage.body) || 
    /\b(what|how|when|where|why|can you|could you|would you|do you|are you|is there)\b/i.test(lastCustomerMessage.body);

  console.log('🤔 [SHOULD GENERATE] Direct question:', hasDirectQuestion, 'Conversational signals:', hasConversationalSignals);
  
  return hasDirectQuestion || hasConversationalSignals;
};
