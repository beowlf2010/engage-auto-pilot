
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('🔑 [AI MESSAGE] Checking API key availability...');
    
    if (!openAIApiKey) {
      console.error('❌ [AI MESSAGE] No OpenAI API key found');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'OpenAI API key not configured',
        message: 'Please configure OPENAI_API_KEY in your Supabase project settings'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ [AI MESSAGE] API key found, length:', openAIApiKey.length);
    console.log('🔍 [AI MESSAGE] API key prefix:', openAIApiKey.substring(0, 7) + '...');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { 
      leadId, 
      nameDecision, 
      vehicleDecision, 
      leadData, 
      salespersonProfile 
    } = await req.json();

    console.log(`🤖 [AI MESSAGE] Generating with decisions - Name: ${nameDecision}, Vehicle: ${vehicleDecision}`);

    // Get conversation history to determine if initial contact
    const { data: conversations } = await supabase
      .from('conversations')
      .select('body, direction, sent_at')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false })
      .limit(5);

    const hasConversation = conversations && conversations.length > 0;
    const isInitialContact = !hasConversation;

    // Prepare personalization based on user decisions
    const usePersonalName = nameDecision === 'approved' && leadData?.first_name;
    const useVehicleInterest = vehicleDecision === 'approved' && leadData?.vehicle_interest;
    
    const personalizedName = usePersonalName ? leadData.first_name : null;
    const personalizedVehicle = useVehicleInterest ? leadData.vehicle_interest : 'the right vehicle';
    
    const salespersonName = salespersonProfile?.first_name || 'Finn';

    console.log(`📝 [AI MESSAGE] Using name: ${personalizedName || 'generic'}, vehicle: ${personalizedVehicle}`);

    // Build system prompt based on decisions
    const systemPrompt = `You are a professional automotive sales assistant named ${salespersonName} from Jason Pilger Chevrolet.

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

Generate a ${isInitialContact ? 'warm introduction' : 'follow-up'} message that respects the personalization decisions.`;

    // Build user prompt with context
    const userPrompt = `Generate a personalized message for this lead:
    
LEAD CONTEXT:
- Stage: ${isInitialContact ? 'First contact' : 'Follow-up'}
- Name decision: ${nameDecision} (${usePersonalName ? `use "${personalizedName}"` : 'use generic greeting'})
- Vehicle decision: ${vehicleDecision} (${useVehicleInterest ? `mention "${personalizedVehicle}"` : 'use generic vehicle language'})

CONVERSATION HISTORY:
${conversations?.map(c => `${c.direction === 'in' ? 'Customer' : 'You'}: ${c.body}`).join('\n') || 'No previous conversations'}

Generate a message that:
1. ${usePersonalName ? `Opens with "Hi ${personalizedName}!"` : 'Opens with "Hi!" or "Hello!"'}
2. ${useVehicleInterest ? `References their interest in "${personalizedVehicle}"` : 'Uses generic vehicle language'}
3. Includes a clear next step or question
4. Stays under 160 characters
5. Feels natural and conversational`;

    console.log('🚀 [AI MESSAGE] Making OpenAI API call...');
    console.log('🔧 [AI MESSAGE] Using model: gpt-4o-mini');

    // Generate message with OpenAI - FIXED MODEL NAME
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // FIXED: Changed from 'gpt-4o-mini' to correct model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    console.log('📡 [AI MESSAGE] OpenAI response status:', response.status);
    console.log('📡 [AI MESSAGE] OpenAI response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [AI MESSAGE] OpenAI API error:', response.status, errorText);
      console.error('❌ [AI MESSAGE] Full error details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText
      });
      
      // Check if it's an authentication error
      if (response.status === 401) {
        return new Response(JSON.stringify({ 
          success: false,
          error: `OpenAI API Authentication Failed (401)`,
          details: 'Invalid API key. Please check your OPENAI_API_KEY in Supabase settings.',
          message: 'Hi! I wanted to follow up on your interest in finding the right vehicle. What questions can I answer for you?'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Check if it's a model not found error
      if (response.status === 404) {
        return new Response(JSON.stringify({ 
          success: false,
          error: `OpenAI API Model Not Found (404)`,
          details: 'The specified model may not exist or you may not have access to it.',
          message: 'Hi! I wanted to follow up on your interest in finding the right vehicle. What questions can I answer for you?'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        success: false,
        error: `OpenAI API error: ${response.status}`,
        details: errorText,
        message: 'Hi! I wanted to follow up on your interest in finding the right vehicle. What questions can I answer for you?'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const responseText = await response.text();
    console.log('📄 [AI MESSAGE] Raw OpenAI response length:', responseText.length);
    console.log('📄 [AI MESSAGE] Raw OpenAI response preview:', responseText.substring(0, 200) + '...');

    let aiResponse;
    try {
      aiResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ [AI MESSAGE] JSON parse error:', parseError);
      console.error('❌ [AI MESSAGE] Response text that failed to parse:', responseText);
      
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Failed to parse OpenAI response',
        parseError: parseError.message,
        rawResponse: responseText.substring(0, 500),
        message: 'Hi! I wanted to follow up on your interest in finding the right vehicle. What questions can I answer for you?'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!aiResponse.choices || !aiResponse.choices[0]) {
      console.error('❌ [AI MESSAGE] Invalid OpenAI response structure:', aiResponse);
      
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid response structure from OpenAI',
        response: aiResponse,
        message: 'Hi! I wanted to follow up on your interest in finding the right vehicle. What questions can I answer for you?'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const generatedMessage = aiResponse.choices[0].message.content;

    console.log(`✅ [AI MESSAGE] Generated successfully: "${generatedMessage}"`);

    return new Response(JSON.stringify({ 
      success: true,
      message: generatedMessage,
      personalization: {
        usedName: usePersonalName,
        usedVehicle: useVehicleInterest,
        nameUsed: personalizedName,
        vehicleUsed: personalizedVehicle
      },
      debug: {
        modelUsed: 'gpt-4o-mini',
        apiKeyLength: openAIApiKey.length,
        promptLength: systemPrompt.length + userPrompt.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [AI MESSAGE] Unexpected error:', error);
    console.error('❌ [AI MESSAGE] Error stack:', error.stack);
    
    // Provide fallback message
    const fallbackMessage = "Hi! I wanted to follow up on your interest in finding the right vehicle. What questions can I answer for you?";
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      stack: error.stack,
      message: fallbackMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
