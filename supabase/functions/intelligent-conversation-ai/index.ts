
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced Intent Recognition with multi-intent and vehicle extraction support
const analyzeCustomerIntent = (message: string) => {
  const text = message.toLowerCase().trim();
  
  // Extract vehicle information
  const vehicleInfo = extractVehicleDetails(message);
  
  // Check for identity questions FIRST (highest priority for composite responses)
  if (/\b(who are you|who is you|who am i talking to|who is this|what is your name|your name)\b/i.test(text)) {
    const secondary = detectSecondaryIntent(text);
    const tertiary = detectTertiaryIntent(text, 'identity_question', secondary);
    return {
      primary: 'identity_question',
      secondary,
      tertiary,
      confidence: 0.95,
      isMultiIntent: !!(secondary || tertiary),
      isFinancingRelated: false,
      vehicleInfo
    };
  }
  
  // Check for transportation need intent SECOND (highest priority for practical customers)
  if (/\b(just need one to get me|need something to get|need reliable transportation|basic transportation|just need wheels|need a car to get to|need to get around|get me where)\b/i.test(text)) {
    return {
      primary: 'transportation_need',
      confidence: 0.95,
      isMultiIntent: false,
      isFinancingRelated: false,
      vehicleInfo
    };
  }
  
  // Check for browsing stage intent THIRD (high priority for customer experience)
  if (/\b(just looking|just browsing|shopping around|getting a feel|seeing what's out there|researching|comparing|looking around)\b/i.test(text)) {
    return {
      primary: 'browsing_stage',
      confidence: 0.95,
      isMultiIntent: false,
      isFinancingRelated: false,
      vehicleInfo
    };
  }
  
  // Financing patterns - consistent with unifiedAIResponseEngine
  const financingPatterns = [
    { pattern: /\b(down payment|downpayment|dp)\b/i, type: 'down_payment', confidence: 0.9 },
    { pattern: /\b(monthly payment|payments|monthly)\b/i, type: 'monthly_payment', confidence: 0.8 },
    { pattern: /\b(saving up|save up|saving money)\b/i, type: 'saving_up', confidence: 0.9 },
    { pattern: /\b(credit|financing|finance|loan)\b/i, type: 'credit_concern', confidence: 0.7 },
    { pattern: /\b(budget|afford|expensive|cost)\b/i, type: 'budget_constraint', confidence: 0.6 }
  ];

  // Check for financing signals
  for (const pattern of financingPatterns) {
    if (pattern.pattern.test(text)) {
      return {
        primary: `financing_${pattern.type}`,
        confidence: pattern.confidence,
        financingType: pattern.type,
        isFinancingRelated: true,
        isMultiIntent: false
      };
    }
  }

  // Check for price inquiries
  if (/\b(price|cost|payment|pricing)\b/i.test(text)) {
    return {
      primary: 'price_inquiry',
      confidence: 0.8,
      isFinancingRelated: false,
      isMultiIntent: false
    };
  }

  // Check for buying signals
  if (/\b(ready|purchase|buy|take it|let's do this)\b/i.test(text)) {
    return {
      primary: 'buying_signal',
      confidence: 0.9,
      isFinancingRelated: false,
      isMultiIntent: false
    };
  }

  // Enhanced objection detection with empathy patterns
  if (/\b(not interested|not ready|think about it|too expensive|can't afford|over budget|concerned about|worried about)\b/i.test(text)) {
    const objectionType = getObjectionType(text);
    return {
      primary: 'objection',
      objectionType,
      confidence: 0.8,
      isFinancingRelated: text.includes('expensive') || text.includes('cost') || text.includes('afford') || text.includes('budget'),
      isMultiIntent: false,
      vehicleInfo
    };
  }

  // Check for appointment scheduling
  if (/\b(schedule|appointment|meet|visit|come in|see|book|today|tomorrow|weekend)\b/i.test(text)) {
    const timeInfo = extractTimePreferences(text);
    return {
      primary: 'scheduling',
      timeInfo,
      confidence: 0.85,
      isFinancingRelated: false,
      isMultiIntent: false,
      vehicleInfo
    };
  }

  return {
    primary: 'general_inquiry',
    confidence: 0.5,
    isFinancingRelated: false,
    isMultiIntent: false,
    vehicleInfo
  };
};

// Enhanced vehicle extraction
const extractVehicleDetails = (text: string) => {
  const lowerText = text.toLowerCase();
  const makes = ['chevrolet', 'chevy', 'ford', 'gmc', 'honda', 'toyota', 'nissan'];
  const models = ['silverado', 'tahoe', 'f-150', 'civic', 'accord', 'camry', 'corolla'];
  const years = text.match(/\b(19|20)\d{2}\b/g);
  const colors = ['black', 'white', 'silver', 'red', 'blue', 'gray', 'grey'];
  
  let extractedVehicle = {};
  
  for (const make of makes) {
    if (lowerText.includes(make)) {
      extractedVehicle.make = make === 'chevy' ? 'chevrolet' : make;
      break;
    }
  }
  
  for (const model of models) {
    if (lowerText.includes(model)) {
      extractedVehicle.model = model;
      break;
    }
  }
  
  if (years && years.length > 0) {
    extractedVehicle.year = parseInt(years[0]);
  }
  
  for (const color of colors) {
    if (lowerText.includes(color)) {
      extractedVehicle.color = color;
      break;
    }
  }
  
  return Object.keys(extractedVehicle).length > 0 ? extractedVehicle : null;
};

// Detect secondary intents in mixed questions
const detectSecondaryIntent = (text: string) => {
  const patterns = [
    { pattern: /\b(price|cost|payment|pricing|how much)\b/i, intent: 'price_inquiry' },
    { pattern: /\b(available|in stock|availability|have)\b/i, intent: 'availability_inquiry' },
    { pattern: /\b(schedule|appointment|visit|meet)\b/i, intent: 'appointment_request' },
    { pattern: /\b(trade|exchange|trade-in)\b/i, intent: 'trade_inquiry' },
    { pattern: /\b(finance|loan|financing|credit)\b/i, intent: 'financing_inquiry' },
    { pattern: /\b(features|specs|options|equipment)\b/i, intent: 'feature_inquiry' },
    { pattern: /\b(test drive|drive|try)\b/i, intent: 'test_drive_request' }
  ];
  
  for (const { pattern, intent } of patterns) {
    if (pattern.test(text)) return intent;
  }
  return null;
};

// Detect tertiary intents for complex questions
const detectTertiaryIntent = (text: string, primary: string, secondary: string) => {
  const alreadyDetected = [primary, secondary].filter(Boolean);
  const patterns = [
    { pattern: /\b(when|what time|today|tomorrow|weekend)\b/i, intent: 'timing_inquiry' },
    { pattern: /\b(compare|versus|vs|difference|better)\b/i, intent: 'comparison_request' },
    { pattern: /\b(lease|leasing|rent)\b/i, intent: 'lease_inquiry' }
  ];
  
  for (const { pattern, intent } of patterns) {
    if (pattern.test(text) && !alreadyDetected.includes(intent)) {
      return intent;
    }
  }
  return null;
};

// Enhanced objection type detection
const getObjectionType = (text: string) => {
  if (/\b(too expensive|can't afford|over budget|too much money)\b/i.test(text)) return 'budget_objection';
  if (/\b(think about it|need time|not ready|maybe later)\b/i.test(text)) return 'consideration_pause';
  if (/\b(concerned about|worried about|problem with)\b/i.test(text)) return 'specific_concern';
  if (/\b(not interested|not looking|stop calling)\b/i.test(text)) return 'not_interested';
  return 'general_objection';
};

// Extract time preferences for scheduling
const extractTimePreferences = (text: string) => {
  const timePatterns = {
    morning: /\b(morning|am|before noon)\b/i,
    afternoon: /\b(afternoon|pm|after lunch)\b/i,
    evening: /\b(evening|after work|after 5)\b/i,
    today: /\b(today|right now|asap)\b/i,
    tomorrow: /\b(tomorrow|next day)\b/i,
    weekend: /\b(weekend|saturday|sunday)\b/i
  };
  
  const preferences = {};
  for (const [key, pattern] of Object.entries(timePatterns)) {
    if (pattern.test(text)) {
      preferences[key] = true;
    }
  }
  
  return Object.keys(preferences).length > 0 ? preferences : null;
};

// Enhanced Professional Response Templates with vehicle-specific context
const getResponseTemplate = (intent: any, leadName: string, customerMessage: string, vehicleInterest?: string) => {
  // Handle composite responses for mixed questions (2+ intents)
  if (intent.primary === 'identity_question' && intent.secondary) {
    if (intent.secondary === 'price_inquiry') {
      let vehicleContext = '';
      
      if (intent.vehicleInfo) {
        const vehicle = buildVehicleString(intent.vehicleInfo);
        vehicleContext = ` on the ${vehicle}`;
      } else if (vehicleInterest && vehicleInterest !== 'finding the right vehicle for your needs') {
        vehicleContext = ` on ${vehicleInterest}`;
      }
      
      // Handle tertiary intent
      let additionalAction = '';
      if (intent.tertiary === 'timing_inquiry') {
        additionalAction = ' and discuss timing that works for you';
      } else if (intent.tertiary === 'test_drive_request') {
        additionalAction = ' and arrange a test drive';
      }
      
      return `Hi ${leadName}! I'm your sales consultant here at the dealership. I'd be happy to help you with pricing information${vehicleContext}${additionalAction}. ${intent.vehicleInfo ? 'I can get you specific pricing details on that vehicle.' : 'To give you the most accurate pricing, could you let me know which vehicle you\'re most interested in?'}`;
    }
    
    const vehicleMention = intent.vehicleInfo ? ` for the ${buildVehicleString(intent.vehicleInfo)}` : '';
    
    const secondaryActions = {
      availability_inquiry: `and check our current inventory${vehicleMention} for you`,
      appointment_request: `and schedule a time for you to visit${vehicleMention ? ` and see the ${buildVehicleString(intent.vehicleInfo)}` : ''}`,
      trade_inquiry: 'and discuss your trade-in options',
      financing_inquiry: 'and explore financing options that work for you',
      feature_inquiry: `and go over the features${vehicleMention} you're interested in`,
      test_drive_request: `and arrange a test drive${vehicleMention}`
    };
    
    const secondaryAction = secondaryActions[intent.secondary as keyof typeof secondaryActions] || 'and answer any questions you have';
    
    // Add tertiary intent if present
    let tertiaryAction = '';
    if (intent.tertiary && intent.tertiary !== intent.secondary) {
      const tertiaryActions = {
        timing_inquiry: ', and find a time that works perfectly for your schedule',
        comparison_request: ', and help you compare your options',
        lease_inquiry: ', and discuss leasing options'
      };
      tertiaryAction = tertiaryActions[intent.tertiary as keyof typeof tertiaryActions] || '';
    }
    
    return `Hi ${leadName}! I'm your sales consultant here at the dealership. I'd be happy to introduce myself properly ${secondaryAction}${tertiaryAction}. What would be most helpful for you today?`;
  }
  
  // Enhanced templates with vehicle-specific context and objection handling
  const vehicleMention = intent.vehicleInfo ? ` regarding the ${buildVehicleString(intent.vehicleInfo)}` : '';
  
  const templates = {
    transportation_need: `Hi ${leadName}! I completely understand - you need reliable transportation to get where you need to go. Let's find you something practical and dependable that fits your budget. What type of daily driving do you do most - city commuting, highway, or a mix of both?`,
    
    browsing_stage: `Hi ${leadName}! That's perfectly fine - browsing is smart! No pressure at all. I'm here if you have any questions as you look around${vehicleMention ? ` about the ${buildVehicleString(intent.vehicleInfo)}` : ''}, or if you'd like me to share what's popular right now. Take your time!`,
    
    identity_question: `Hi ${leadName}! I'm your sales consultant here at the dealership. I'd be happy to help you with any questions you have about our vehicles${vehicleMention}. What would you like to know?`,
    
    price_inquiry: intent.vehicleInfo 
      ? `Hi ${leadName}! I'd be happy to discuss pricing on the ${buildVehicleString(intent.vehicleInfo)}. Let me get you the most current pricing and any available incentives.`
      : `Hi ${leadName}! I'd be happy to discuss pricing with you. To give you the most accurate information, could you let me know which vehicle you're interested in? I want to make sure I get you the right details.`,
    
    financing_saving_up: `I completely understand, ${leadName} - saving up shows you're being smart about this decision. When you're ready, we'll have financing options that can help minimize your upfront costs. What timeline are you thinking?`,
    
    financing_down_payment: `Great question about the down payment, ${leadName}! We have several programs that can help - some as low as $0 down for qualified buyers. Would you like me to check what options might work for your situation?`,
    
    financing_monthly_payment: `Let's find a payment that fits your budget comfortably, ${leadName}. What monthly range were you hoping to stay within? We have flexible terms that might surprise you.`,
    
    financing_budget_constraint: `I appreciate you sharing your budget considerations, ${leadName}. Let's work together to find something that fits both your needs and your financial comfort zone. What's most important to you in a vehicle?`,
    
    financing_credit_concern: `We work with customers of all credit situations, ${leadName}. Let me connect you with our finance team to explore your options - you might be surprised what we can do.`,
    
    buying_signal: `That's great to hear, ${leadName}! Let's get you moving forward. When would be a good time to finalize everything? I can have all the paperwork ready.`,
    
    // Enhanced objection handling with empathy
    objection: getObjectionResponse(intent, leadName, vehicleMention),
    
    // Scheduling with time preferences
    scheduling: getSchedulingResponse(intent, leadName, vehicleMention),
    
    general_inquiry: `Hi ${leadName}! I'd be happy to help you with any questions you might have about vehicles. What would be most helpful to know?`
  };

  return templates[intent.primary as keyof typeof templates] || templates.general_inquiry;
};

// Enhanced objection response generator
const getObjectionResponse = (intent: any, leadName: string, vehicleMention: string) => {
  const objectionResponses = {
    budget_objection: `I completely understand, ${leadName}. Budget is one of the most important factors in this decision${vehicleMention}. Let's explore some options that might work better for you - we have various financing programs and sometimes different vehicles that could meet your needs within your comfort zone. What would feel like a reasonable monthly payment for you?`,
    
    consideration_pause: `Absolutely, ${leadName} - this is a significant decision and you should take all the time you need${vehicleMention}. I respect that you want to think it through carefully. Is there any specific information or concerns I could help address while you're considering your options?`,
    
    specific_concern: `I appreciate you sharing your concerns, ${leadName}${vehicleMention}. Understanding what's weighing on your mind helps me provide better assistance. What specific aspects are you most concerned about?`,
    
    not_interested: `I understand, ${leadName}. I respect your position${vehicleMention}. If anything changes or you have questions in the future, please don't hesitate to reach out.`,
    
    general_objection: `I understand, ${leadName}${vehicleMention}. What would need to change for this to feel like the right fit for you? I'm here to help when you're ready.`
  };
  
  return objectionResponses[intent.objectionType as keyof typeof objectionResponses] || objectionResponses.general_objection;
};

// Enhanced scheduling response generator
const getSchedulingResponse = (intent: any, leadName: string, vehicleMention: string) => {
  let response = `Hi ${leadName}! I'd be happy to schedule a time for you to visit${vehicleMention}.`;
  
  if (intent.timeInfo) {
    if (intent.timeInfo.today) {
      response += ' Since you mentioned today, let me check our availability. What time works best for you?';
    } else if (intent.timeInfo.tomorrow) {
      response += ' Tomorrow works great! What time of day is most convenient?';
    } else if (intent.timeInfo.weekend) {
      response += ' Weekend appointments are popular! Would Saturday or Sunday work better?';
    } else if (intent.timeInfo.morning) {
      response += ' Morning appointments are perfect! What day works best for you?';
    } else if (intent.timeInfo.afternoon || intent.timeInfo.evening) {
      const period = intent.timeInfo.afternoon ? 'afternoon' : 'evening';
      response += ` ${period.charAt(0).toUpperCase() + period.slice(1)} works well! What day would you prefer?`;
    }
  } else {
    response += ' What day and time work best for your schedule?';
  }
  
  return response;
};

// Build vehicle string from extracted info
const buildVehicleString = (vehicleInfo: any) => {
  if (!vehicleInfo) return '';
  const parts = [
    vehicleInfo.year?.toString(),
    vehicleInfo.color,
    vehicleInfo.make,
    vehicleInfo.model
  ].filter(Boolean);
  return parts.join(' ');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, leadName, messageBody, latestCustomerMessage, conversationHistory, vehicleInterest } = await req.json();

    console.log('🤖 [INTELLIGENT-AI] Processing request for:', leadName);
    console.log('📨 [INTELLIGENT-AI] Customer message:', messageBody || latestCustomerMessage);

    // Use the most recent customer message
    const customerMessage = latestCustomerMessage || messageBody;
    
    if (!customerMessage) {
      console.log('❌ [INTELLIGENT-AI] No customer message provided');
      return new Response(
        JSON.stringify({ error: 'No customer message provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze the customer's intent from their latest message
    const intent = analyzeCustomerIntent(customerMessage);
    
    console.log('🧠 [INTELLIGENT-AI] Detected intent:', {
      primary: intent.primary,
      secondary: intent.secondary,
      confidence: intent.confidence,
      isMultiIntent: intent.isMultiIntent,
      isFinancingRelated: intent.isFinancingRelated
    });

    // Generate appropriate response using professional templates
    const responseMessage = getResponseTemplate(intent, leadName || 'there', customerMessage, vehicleInterest);

    // Validate response quality
    const hasPlaceholders = responseMessage.includes('{') || responseMessage.includes('[') || 
                           responseMessage.includes('undefined') || responseMessage.includes('null') ||
                           responseMessage.toLowerCase().includes('not specified');

    if (hasPlaceholders) {
      console.warn('⚠️ [INTELLIGENT-AI] Response contains placeholders, using fallback');
      const fallback = `Hi ${leadName || 'there'}! I understand your question about "${customerMessage.substring(0, 50)}..." Let me help you with that. What would be most helpful to know?`;
      
      return new Response(
        JSON.stringify({
          message: fallback,
          confidence: 0.7,
          reasoning: `Professional fallback response to avoid placeholders. Intent: ${intent.primary}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = {
      message: responseMessage,
      confidence: intent.confidence,
      reasoning: `Context-aware response to ${intent.primary} with ${intent.confidence * 100}% confidence. Directly addressed customer's latest message about ${intent.isFinancingRelated ? 'financing' : 'general inquiry'}.`,
      intent: intent.primary,
      isFinancingRelated: intent.isFinancingRelated,
      responseStrategy: intent.isFinancingRelated ? 'empathetic_financing' : 'professional_assistance'
    };

    console.log('✅ [INTELLIGENT-AI] Generated response:', response.message.substring(0, 100) + '...');

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [INTELLIGENT-AI] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
