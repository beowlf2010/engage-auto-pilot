
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

const FALLBACK_MESSAGE = "I see you're still exploring options—happy to help you find the right fit!";

// Name formatting function (inline since we can't import from frontend utils)
const formatProperName = (name: string | null | undefined): string => {
  if (!name || typeof name !== 'string') {
    return 'there';
  }
  
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return 'there';
  }
  
  // Convert to proper case: first letter uppercase, rest lowercase
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const validateVehicleInterest = (vehicleInterest: string | null | undefined) => {
  // Check for null, undefined, or empty
  if (!vehicleInterest || typeof vehicleInterest !== 'string') {
    return {
      isValid: false,
      message: FALLBACK_MESSAGE,
      reason: 'Null or undefined value'
    };
  }

  // Check for empty or whitespace-only strings
  const trimmed = vehicleInterest.trim();
  if (trimmed.length === 0) {
    return {
      isValid: false,
      message: FALLBACK_MESSAGE,
      reason: 'Empty string'
    };
  }

  // Check against invalid patterns
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        message: FALLBACK_MESSAGE,
        reason: `Invalid pattern: ${pattern.source}`
      };
    }
  }

  return {
    isValid: true,
    message: `your interest in ${trimmed}`,
    reason: 'Valid vehicle interest'
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { leadId, leadData, nameDecision, vehicleDecision, originalDataQuality, messageType } = await req.json()

    console.log(`🤖 [AI MESSAGE] Generating message for lead ${leadId}, type: ${messageType}`);

    // Check user decisions first - they override AI validation
    let shouldUsePersonalName = true;
    let shouldUseSpecificVehicle = true;
    let vehicleMessage = '';
    let leadName = '';

    // Handle name decision
    if (nameDecision === 'denied') {
      shouldUsePersonalName = false;
      leadName = 'there';
      console.log(`👤 [AI MESSAGE] Name denied by user, using generic greeting`);
    } else {
      const rawName = leadData?.first_name;
      leadName = formatProperName(rawName);
      console.log(`👤 [AI MESSAGE] Name approved/auto: "${rawName}" → "${leadName}"`);
    }

    // Handle vehicle decision
    if (vehicleDecision === 'denied') {
      shouldUseSpecificVehicle = false;
      vehicleMessage = FALLBACK_MESSAGE;
      console.log(`🚗 [AI MESSAGE] Vehicle denied by user, using generic message`);
    } else {
      // Only run vehicle validation if user approved or no decision made
      const vehicleValidation = validateVehicleInterest(leadData?.vehicle_interest);
      shouldUseSpecificVehicle = vehicleValidation.isValid;
      vehicleMessage = vehicleValidation.message;
      console.log(`🚗 [AI MESSAGE] Vehicle validation:`, {
        isValid: vehicleValidation.isValid,
        reason: vehicleValidation.reason,
        originalValue: leadData?.vehicle_interest
      });
    }
    
    // Prepare the context for AI generation
    const aiContext = {
      leadName,
      vehicleMessage,
      messageType: messageType || 'initial_contact',
      nameDecision,
      vehicleDecision,
      shouldUsePersonalName,
      shouldUseSpecificVehicle
    };

    console.log(`📝 [AI MESSAGE] Context prepared:`, aiContext);

    // Generate message using OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create decision-based prompts
    let prompt = '';
    if (shouldUsePersonalName && shouldUseSpecificVehicle) {
      prompt = `Generate a warm, professional initial message for ${leadName} about ${vehicleMessage}. Keep it conversational and helpful, around 1-2 sentences. Include a question to engage them.`;
    } else if (shouldUsePersonalName && !shouldUseSpecificVehicle) {
      prompt = `Generate a warm, professional initial message for ${leadName}. Use this exact phrase: "${FALLBACK_MESSAGE}" and add a brief follow-up question to engage them about what they're looking for.`;
    } else if (!shouldUsePersonalName && shouldUseSpecificVehicle) {
      prompt = `Generate a warm, professional initial message using "Hello!" as greeting about ${vehicleMessage}. Keep it conversational and helpful, around 1-2 sentences. Include a question to engage them.`;
    } else {
      prompt = `Generate a warm, professional initial message using "Hello!" as greeting. Use this exact phrase: "${FALLBACK_MESSAGE}" and add a brief follow-up question to engage them about what they're looking for.`;
    }

    console.log(`🎯 [AI MESSAGE] Using ${shouldUsePersonalName ? 'personal' : 'generic'} name + ${shouldUseSpecificVehicle ? 'specific' : 'generic'} vehicle prompt`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are Finn, a helpful car dealership AI assistant. Generate warm, professional messages that sound natural and engaging.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    console.log(`📡 [AI MESSAGE] Response status for gpt-4-turbo-preview: ${response.status}`);

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📄 [AI MESSAGE] Response received for gpt-4-turbo-preview, length: ${JSON.stringify(data).length}`);
    
    const generatedMessage = data.choices[0]?.message?.content?.trim();

    if (!generatedMessage) {
      throw new Error('No message generated from OpenAI');
    }

    console.log(`✅ [AI MESSAGE] Successfully generated with gpt-4-turbo-preview: "${generatedMessage}"`);

    return new Response(
      JSON.stringify({ 
        message: generatedMessage,
        context: aiContext
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ [AI MESSAGE] Error:', error);
    
    // Return a fallback message if AI generation fails
    const fallbackMessage = `Hi! I'm Finn from the dealership. ${FALLBACK_MESSAGE} What can I help you with today?`;
    
    return new Response(
      JSON.stringify({ 
        message: fallbackMessage,
        error: error.message,
        isFallback: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Still return 200 with fallback message
      }
    )
  }
})
