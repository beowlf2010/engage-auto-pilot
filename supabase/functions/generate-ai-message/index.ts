
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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
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

    // Generate message with OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    const aiResponse = await response.json();
    
    if (!aiResponse.choices || !aiResponse.choices[0]) {
      throw new Error('Invalid response from OpenAI');
    }
    
    const generatedMessage = aiResponse.choices[0].message.content;

    console.log(`✅ [AI MESSAGE] Generated: "${generatedMessage}"`);

    return new Response(JSON.stringify({ 
      success: true,
      message: generatedMessage,
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
    console.error('❌ [AI MESSAGE] Error:', error);
    
    // Provide fallback message
    const fallbackMessage = "Hi! I wanted to follow up on your interest in finding the right vehicle. What questions can I answer for you?";
    
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
