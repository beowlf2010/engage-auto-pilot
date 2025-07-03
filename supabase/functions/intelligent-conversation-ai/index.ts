
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced Intent Recognition with multi-intent support
const analyzeCustomerIntent = (message: string) => {
  const text = message.toLowerCase().trim();
  
  // Check for identity questions FIRST (highest priority)
  if (/\b(who are you|who is you|who am i talking to|who is this|what is your name|your name)\b/i.test(text)) {
    const secondary = detectSecondaryIntent(text);
    return {
      primary: 'identity_question',
      secondary,
      confidence: 0.95,
      isMultiIntent: !!secondary,
      isFinancingRelated: false
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

  // Check for objections
  if (/\b(not interested|not ready|think about it|too expensive)\b/i.test(text)) {
    return {
      primary: 'objection',
      confidence: 0.8,
      isFinancingRelated: text.includes('expensive') || text.includes('cost'),
      isMultiIntent: false
    };
  }

  return {
    primary: 'general_inquiry',
    confidence: 0.5,
    isFinancingRelated: false,
    isMultiIntent: false
  };
};

// Detect secondary intents in mixed questions
const detectSecondaryIntent = (text: string) => {
  if (/\b(price|cost|payment|pricing)\b/i.test(text)) return 'price_inquiry';
  if (/\b(available|in stock|availability)\b/i.test(text)) return 'availability_inquiry';
  if (/\b(schedule|appointment|visit)\b/i.test(text)) return 'appointment_request';
  if (/\b(trade|exchange)\b/i.test(text)) return 'trade_inquiry';
  if (/\b(finance|loan|financing)\b/i.test(text)) return 'financing_inquiry';
  return null;
};

// Professional Response Templates with composite response support
const getResponseTemplate = (intent: any, leadName: string, customerMessage: string, vehicleInterest?: string) => {
  // Handle composite responses for mixed questions
  if (intent.primary === 'identity_question' && intent.secondary) {
    if (intent.secondary === 'price_inquiry') {
      const vehicleContext = vehicleInterest && vehicleInterest !== 'finding the right vehicle for your needs' 
        ? ` on ${vehicleInterest}` 
        : '';
      
      return `Hi ${leadName}! I'm your sales consultant here at the dealership. I'd be happy to help you with pricing information${vehicleContext}. To give you the most accurate pricing, could you let me know which vehicle you're interested in? I want to make sure I get you the right details.`;
    }
    
    const secondaryActions = {
      availability_inquiry: 'and check our current inventory for you',
      appointment_request: 'and schedule a time for you to visit',
      trade_inquiry: 'and discuss your trade-in options',
      financing_inquiry: 'and explore financing options that work for you'
    };
    
    const secondaryAction = secondaryActions[intent.secondary as keyof typeof secondaryActions] || 'and answer any questions you have';
    return `Hi ${leadName}! I'm your sales consultant here at the dealership. I'd be happy to introduce myself properly ${secondaryAction}. What would be most helpful for you today?`;
  }
  
  const templates = {
    identity_question: `Hi ${leadName}! I'm your sales consultant here at the dealership. I'd be happy to help you with any questions you have about our vehicles. What would you like to know?`,
    
    price_inquiry: `Hi ${leadName}! I'd be happy to discuss pricing with you. To give you the most accurate information, could you let me know which vehicle you're interested in? I want to make sure I get you the right details.`,
    
    financing_saving_up: `I completely understand, ${leadName} - saving up shows you're being smart about this decision. When you're ready, we'll have financing options that can help minimize your upfront costs. What timeline are you thinking?`,
    
    financing_down_payment: `Great question about the down payment, ${leadName}! We have several programs that can help - some as low as $0 down for qualified buyers. Would you like me to check what options might work for your situation?`,
    
    financing_monthly_payment: `Let's find a payment that fits your budget comfortably, ${leadName}. What monthly range were you hoping to stay within? We have flexible terms that might surprise you.`,
    
    financing_budget_constraint: `I appreciate you sharing your budget considerations, ${leadName}. Let's work together to find something that fits both your needs and your financial comfort zone. What's most important to you in a vehicle?`,
    
    financing_credit_concern: `We work with customers of all credit situations, ${leadName}. Let me connect you with our finance team to explore your options - you might be surprised what we can do.`,
    
    buying_signal: `That's great to hear, ${leadName}! Let's get you moving forward. When would be a good time to finalize everything? I can have all the paperwork ready.`,
    
    objection: `I understand, ${leadName}. What would need to change for this to feel like the right time? I'm here to help when you're ready.`,
    
    general_inquiry: `Hi ${leadName}! I'd be happy to help you with that. What specific details would be most helpful for your decision?`
  };

  return templates[intent.primary as keyof typeof templates] || templates.general_inquiry;
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
