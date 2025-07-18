
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    console.log('🔧 [FINN AI] Checking OpenAI API key...');
    
    // Get OpenAI API key and dealership context from settings table
    const { data: openAIKeySetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'OPENAI_API_KEY')
      .maybeSingle();

    // Get dealership context for proper identification
    const { data: dealershipContext } = await supabase
      .rpc('get_dealership_context');

    if (!openAIKeySetting?.value) {
      console.error('❌ [FINN AI] OpenAI API key not configured in settings');
      return new Response(JSON.stringify({
        error: 'OpenAI API key not configured in settings',
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIApiKey = openAIKeySetting.value;
    console.log('✅ [FINN AI] OpenAI API key found');

    const {
      leadId,
      leadName,
      messageBody,
      latestCustomerMessage,
      conversationHistory: rawConversationHistory,
      vehicleInterest,
      leadSource
    } = await req.json();

    // Ensure conversationHistory is a string
    const conversationHistory = typeof rawConversationHistory === 'string' ? rawConversationHistory : String(rawConversationHistory || '');

    // Fetch lead data including geographical info and check if this is initial contact
    const { data: leadGeoData } = await supabase
      .from('leads')
      .select('address, city, state, postal_code')
      .eq('id', leadId)
      .maybeSingle();

    // Check if this is an initial contact by looking at conversation history
    const { data: existingConversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', leadId)
      .eq('direction', 'out')
      .limit(1);

    const isInitialContact = !existingConversations || existingConversations.length === 0;

    console.log('📍 [FINN AI] Lead location:', {
      city: leadGeoData?.city,
      state: leadGeoData?.state,
      hasAddress: !!leadGeoData?.address
    });

    console.log('🤖 [FINN AI] Processing request for lead:', leadId);
    console.log('🤖 [FINN AI] Customer message:', messageBody?.substring(0, 100));

    // Simple intent analysis
    const customerMessage = messageBody || latestCustomerMessage || '';
    const intentAnalysis = {
      primaryIntent: customerMessage.toLowerCase().includes('price') ? 'pricing_inquiry' : 
                    customerMessage.toLowerCase().includes('appointment') ? 'appointment_request' :
                    customerMessage.toLowerCase().includes('test drive') ? 'test_drive_request' : 'general_inquiry',
      confidence: 0.8,
      responseStrategy: 'helpful',
      customerContext: {
        mentionedTopics: []
      }
    };

    console.log('🎯 [FINN AI] Intent analysis:', {
      primary: intentAnalysis.primaryIntent,
      confidence: intentAnalysis.confidence,
      strategy: intentAnalysis.responseStrategy
    });

    // Simple conversation pattern analysis
    const conversationPattern = {
      hasRepetitiveGreeting: false,
      isEstablishedConversation: (conversationHistory || '').length > 100,
      customerMessageCount: (conversationHistory || '').split('Customer:').length - 1,
      salesMessageCount: (conversationHistory || '').split('Sales:').length - 1
    };

    // Get conversation memory
    const { data: conversationMemory } = await supabase
      .from('ai_conversation_context')
      .select('*')
      .eq('lead_id', leadId)
      .maybeSingle();

    // Build contextual prompts with proper dealership identification
    const dealershipName = dealershipContext?.DEALERSHIP_NAME || 'our dealership';
    const salespersonName = dealershipContext?.DEFAULT_SALESPERSON_NAME || 'a sales representative';
    const dealershipLocation = dealershipContext?.DEALERSHIP_LOCATION || 'our location';
    const dealershipPhone = dealershipContext?.DEALERSHIP_PHONE || 'our dealership';

    let systemPrompt = '';

    if (isInitialContact) {
      // For initial contact, use warm introduction style
      systemPrompt = `You are ${salespersonName}, a friendly car sales professional at ${dealershipName} in ${dealershipLocation}.

This is your FIRST contact with this customer, so introduce yourself professionally:
- Start with a brief, warm introduction
- Mention you're from ${dealershipName}
- Reference their interest in ${vehicleInterest || 'finding the right vehicle'}
- Keep it under 160 characters for SMS
- Be helpful and inviting
- Ask one relevant question to start the conversation

Customer location: ${leadGeoData?.city || 'Unknown'}, ${leadGeoData?.state || 'Unknown'}
Customer interest: ${vehicleInterest || 'General inquiry'}`;
    } else {
      // For follow-up messages, maintain professional identity
      systemPrompt = `You are ${salespersonName} from ${dealershipName} in ${dealershipLocation}.

You're continuing an existing conversation with this customer:
- Be conversational and helpful
- Keep responses under 160 characters for SMS
- Focus on ${vehicleInterest || 'helping them find the right vehicle'}
- Be professional but friendly
- Ask one question to move the conversation forward

Customer location: ${leadGeoData?.city || 'Unknown'}, ${leadGeoData?.state || 'Unknown'}
Customer interest: ${vehicleInterest || 'General inquiry'}`;
    }

    let userPrompt = '';

    if (isInitialContact) {
      userPrompt = `Customer message: "${customerMessage}"

This is your first outreach to this customer. ${vehicleInterest ? `They've shown interest in: ${vehicleInterest}` : 'They are a new lead.'}

Respond with a warm, professional introduction that:
- Identifies you as ${salespersonName} from ${dealershipName}
- Acknowledges their interest
- Invites them to connect
- Stays under 160 characters`;
    } else {
      userPrompt = `Customer message: "${customerMessage}"

Previous conversation context: ${conversationHistory ? conversationHistory.slice(-500) : 'No previous conversation'}

Please respond as ${salespersonName} with a helpful, brief message (under 160 characters).`;
    }

    console.log('📝 [FINN AI] Contact type:', isInitialContact ? 'Initial' : 'Follow-up');
    console.log('📝 [FINN AI] Dealership context:', { dealershipName, salespersonName, dealershipLocation });
    console.log('📝 [FINN AI] Generated system prompt length:', systemPrompt.length);
    console.log('📝 [FINN AI] Generated user prompt length:', userPrompt.length);

    // Call OpenAI with enhanced prompts
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
        max_tokens: 300,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ [FINN AI] OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedMessage = data.choices[0].message.content;

    console.log('✅ [FINN AI] Generated response:', generatedMessage?.substring(0, 100));

    // Update conversation context
    await updateConversationContext(supabase, leadId, {
      lastInteractionType: intentAnalysis.primaryIntent,
      keyTopics: intentAnalysis.customerContext.mentionedTopics || [],
      conversationSummary: `Customer ${intentAnalysis.primaryIntent} about ${vehicleInterest}`,
      responseStyle: intentAnalysis.responseStrategy,
      contextScore: intentAnalysis.confidence
    });

    // Store AI conversation note
    await supabase
      .from('ai_conversation_notes')
      .insert({
        lead_id: leadId,
        note_type: 'ai_response_generated',
        note_content: `AI Response (${intentAnalysis.primaryIntent}): ${generatedMessage?.substring(0, 200)}...`,
        vehicles_discussed: vehicleInterest ? [vehicleInterest] : []
      });

    return new Response(JSON.stringify({
      message: generatedMessage,
      intent: intentAnalysis.primaryIntent,
      confidence: intentAnalysis.confidence,
      strategy: intentAnalysis.responseStrategy,
      conversationPattern,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [FINN AI] Error in intelligent-conversation-ai:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to generate AI response',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function updateConversationContext(supabase: any, leadId: string, context: any) {
  try {
    await supabase
      .from('ai_conversation_context')
      .upsert({
        lead_id: leadId,
        ...context,
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('❌ [FINN AI] Error updating conversation context:', error);
  }
}
