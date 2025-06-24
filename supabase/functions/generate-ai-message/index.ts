import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Name formatting utility functions (copied from src/utils/nameFormatter.ts)
const capitalizeSegment = (segment: string): string => {
  if (!segment) return '';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
};

const formatNamePart = (part: string): string => {
  if (!part) return '';
  
  // Convert to lowercase first
  const lower = part.toLowerCase();
  
  // Handle hyphenated names (e.g., "mary-ann")
  if (lower.includes('-')) {
    return lower
      .split('-')
      .map(segment => capitalizeSegment(segment))
      .join('-');
  }
  
  // Handle apostrophe names (e.g., "o'connor")
  if (lower.includes("'")) {
    return lower
      .split("'")
      .map((segment, index) => {
        if (index === 0) return capitalizeSegment(segment);
        // Special handling for common patterns like O'Connor, McDonald
        if (segment.toLowerCase().startsWith('mc') || segment.toLowerCase().startsWith('mac')) {
          return capitalizeSegment(segment);
        }
        return capitalizeSegment(segment);
      })
      .join("'");
  }
  
  // Handle "Mc" and "Mac" prefixes
  if (lower.startsWith('mc') && lower.length > 2) {
    return 'Mc' + capitalizeSegment(lower.slice(2));
  }
  
  if (lower.startsWith('mac') && lower.length > 3) {
    return 'Mac' + capitalizeSegment(lower.slice(3));
  }
  
  // Standard capitalization
  return capitalizeSegment(lower);
};

const formatProperName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  
  // Trim whitespace
  const trimmed = name.trim();
  if (!trimmed) return '';
  
  // Split by spaces to handle multiple names
  return trimmed
    .split(' ')
    .map(part => formatNamePart(part))
    .join(' ');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🔑 [AI MESSAGE] Attempting to retrieve OpenAI API key...');
    
    // First try to get the API key from the database (where settings UI saves it)
    let openAIApiKey = null;
    
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'OPENAI_API_KEY')
        .single();

      if (settingsError) {
        console.log('📊 [AI MESSAGE] No API key found in database settings, checking environment...');
      } else if (settings?.value) {
        openAIApiKey = settings.value;
        console.log('✅ [AI MESSAGE] API key retrieved from database settings');
      }
    } catch (dbError) {
      console.log('⚠️ [AI MESSAGE] Database query failed, will try environment variables');
    }
    
    // Fallback to environment variable if not found in database
    if (!openAIApiKey) {
      openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      if (openAIApiKey) {
        console.log('✅ [AI MESSAGE] API key retrieved from environment variables');
      }
    }
    
    if (!openAIApiKey) {
      console.error('❌ [AI MESSAGE] No OpenAI API key found in database or environment');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'OpenAI API key not configured',
        message: 'Please configure OPENAI_API_KEY in your Settings page or Supabase project settings',
        fallback: 'Hi! I wanted to follow up on your interest in finding the right vehicle. What questions can I answer for you?'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate API key format
    if (!openAIApiKey.startsWith('sk-')) {
      console.error('❌ [AI MESSAGE] Invalid API key format - should start with sk-');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid OpenAI API key format',
        message: 'API key should start with "sk-". Please check your OPENAI_API_KEY in Settings.',
        fallback: 'Hi! I wanted to follow up on your interest in finding the right vehicle. What questions can I answer for you?'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ [AI MESSAGE] Valid API key found, length:', openAIApiKey.length);
    
    const { 
      leadId, 
      nameDecision, 
      vehicleDecision, 
      leadData, 
      salespersonProfile 
    } = await req.json();

    console.log(`🤖 [AI MESSAGE] Generating message for lead ${leadId}`);

    // Get conversation history to determine if initial contact
    const { data: conversations } = await supabase
      .from('conversations')
      .select('body, direction, sent_at')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false })
      .limit(5);

    const hasConversation = conversations && conversations.length > 0;
    const isInitialContact = !hasConversation;

    // Prepare personalization based on user decisions - FORMAT THE NAME!
    const usePersonalName = nameDecision === 'approved' && leadData?.first_name;
    const useVehicleInterest = vehicleDecision === 'approved' && leadData?.vehicle_interest;
    
    // Apply name formatting to normalize the name (BRADLEY -> Bradley, mcdonald -> McDonald, etc.)
    const personalizedName = usePersonalName ? formatProperName(leadData.first_name) : null;
    const personalizedVehicle = useVehicleInterest ? leadData.vehicle_interest : 'the right vehicle';
    
    // Always use "Finn the Internet Sales Specialist" branding
    const salespersonName = 'Finn the Internet Sales Specialist';

    console.log(`📝 [AI MESSAGE] Personalization - Name: ${personalizedName || 'generic'}, Vehicle: ${personalizedVehicle}`);

    // Build system prompt based on decisions - UPDATED WITH PROPER BRANDING
    const systemPrompt = `You are Finn the Internet Sales Specialist from Jason Pilger Chevrolet.

PERSONALIZATION RULES:
- Customer name: ${usePersonalName ? `Use "${personalizedName}" naturally` : 'Do NOT use any name - use generic greeting'}
- Vehicle interest: ${useVehicleInterest ? `Reference "${personalizedVehicle}" specifically` : 'Use generic "finding the right vehicle" language'}
- Message type: ${isInitialContact ? 'Initial outreach' : 'Follow-up message'}

IMPORTANT RULES:
- Keep messages under 160 characters for SMS
- Be conversational and professional, not pushy
- Always end with a clear call to action
- If no personal name approved, use "Hi!" or "Hello!" instead
- If no vehicle approved, use generic vehicle language
- ALWAYS introduce yourself as "Finn the Internet Sales Specialist" on initial contact

Generate a ${isInitialContact ? 'warm introduction' : 'follow-up'} message that respects the personalization decisions.`;

    // Build user prompt with context - UPDATED WITH INTRODUCTION REQUIREMENT
    const userPrompt = `Generate a personalized message for this lead:
    
LEAD CONTEXT:
- Stage: ${isInitialContact ? 'First contact' : 'Follow-up'}
- Name decision: ${nameDecision} (${usePersonalName ? `use "${personalizedName}"` : 'use generic greeting'})
- Vehicle decision: ${vehicleDecision} (${useVehicleInterest ? `mention "${personalizedVehicle}"` : 'use generic vehicle language'})

CONVERSATION HISTORY:
${conversations?.map(c => `${c.direction === 'in' ? 'Customer' : 'You'}: ${c.body}`).join('\n') || 'No previous conversations'}

Generate a message that:
1. ${isInitialContact ? 'MUST introduce yourself as "Finn the Internet Sales Specialist from Jason Pilger Chevrolet"' : 'Continue the existing conversation naturally'}
2. ${usePersonalName ? `Opens with "Hi ${personalizedName}!"` : 'Opens with "Hi!" or "Hello!"'}
3. ${useVehicleInterest ? `References their interest in "${personalizedVehicle}"` : 'Uses generic vehicle language'}
4. Includes a clear next step or question
5. Stays under 160 characters
6. Feels natural and conversational`;

    // List of models to try in order of preference
    const modelsToTry = [
      'gpt-4-turbo-preview',
      'gpt-4',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k'
    ];

    let lastError = null;
    let generatedMessage = null;

    // Try each model until one works
    for (const model of modelsToTry) {
      console.log(`🚀 [AI MESSAGE] Trying model: ${model}`);
      
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 200,
          }),
        });

        console.log(`📡 [AI MESSAGE] Response status for ${model}:`, response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ [AI MESSAGE] Model ${model} failed:`, response.status, errorText);
          lastError = { model, status: response.status, error: errorText };
          continue; // Try next model
        }

        const responseText = await response.text();
        console.log(`📄 [AI MESSAGE] Response received for ${model}, length:`, responseText.length);

        let aiResponse;
        try {
          aiResponse = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`❌ [AI MESSAGE] JSON parse error for ${model}:`, parseError);
          lastError = { model, error: 'JSON parse failed', response: responseText.substring(0, 200) };
          continue; // Try next model
        }
        
        if (!aiResponse.choices || !aiResponse.choices[0]) {
          console.error(`❌ [AI MESSAGE] Invalid response structure for ${model}:`, aiResponse);
          lastError = { model, error: 'Invalid response structure', response: aiResponse };
          continue; // Try next model
        }
        
        generatedMessage = aiResponse.choices[0].message.content;
        console.log(`✅ [AI MESSAGE] Successfully generated with ${model}: "${generatedMessage}"`);
        
        return new Response(JSON.stringify({ 
          success: true,
          message: generatedMessage,
          modelUsed: model,
          apiKeySource: openAIApiKey === Deno.env.get('OPENAI_API_KEY') ? 'environment' : 'database',
          personalization: {
            usedName: usePersonalName,
            usedVehicle: useVehicleInterest,
            nameUsed: personalizedName,
            vehicleUsed: personalizedVehicle
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        console.error(`❌ [AI MESSAGE] Unexpected error with ${model}:`, error);
        lastError = { model, error: error.message };
        continue; // Try next model
      }
    }

    // If all models failed, return the last error with fallback (USING FORMATTED NAME AND PROPER BRANDING)
    console.error('❌ [AI MESSAGE] All models failed. Last error:', lastError);
    
    const fallbackMessage = usePersonalName 
      ? `Hi ${personalizedName}! I'm Finn the Internet Sales Specialist with Jason Pilger Chevrolet. I'd love to help you find ${personalizedVehicle}. What questions can I answer?`
      : `Hi! I'm Finn the Internet Sales Specialist with Jason Pilger Chevrolet. I'd love to help you find the right vehicle. What questions can I answer?`;
    
    return new Response(JSON.stringify({ 
      success: false,
      error: 'All OpenAI models failed',
      lastError: lastError,
      message: fallbackMessage.length > 160 ? fallbackMessage.substring(0, 157) + '...' : fallbackMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [AI MESSAGE] Unexpected error:', error);
    
    // Provide fallback message with proper branding
    const fallbackMessage = "Hi! I'm Finn the Internet Sales Specialist with Jason Pilger Chevrolet. I wanted to follow up on your interest in finding the right vehicle. What questions can I answer for you?";
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      message: fallbackMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
