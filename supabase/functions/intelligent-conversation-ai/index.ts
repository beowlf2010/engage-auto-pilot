
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
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
    console.log('🔧 [FINN AI] Checking OpenAI API key...');
    if (!openAIApiKey) {
      console.error('❌ [FINN AI] OpenAI API key not configured');
      return new Response(JSON.stringify({
        error: 'OpenAI API key not configured',
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('✅ [FINN AI] OpenAI API key found');

    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const {
      leadId,
      leadName,
      messageBody,
      latestCustomerMessage,
      conversationHistory,
      vehicleInterest,
      leadSource
    } = await req.json();

    // Fetch lead geographical data for location-aware responses
    const { data: leadGeoData } = await supabase
      .from('leads')
      .select('address, city, state, postal_code')
      .eq('id', leadId)
      .maybeSingle();

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

    // Build simple contextual prompts
    const systemPrompt = `You are Finn, a friendly and helpful car sales assistant. You work for a car dealership.

Key guidelines:
- Be conversational and helpful
- Keep responses under 160 characters for SMS
- Focus on ${vehicleInterest || 'helping the customer find the right vehicle'}
- Be professional but friendly
- Ask one question to move the conversation forward

Customer location: ${leadGeoData?.city || 'Unknown'}, ${leadGeoData?.state || 'Unknown'}
Customer interest: ${vehicleInterest || 'General inquiry'}`;

    const userPrompt = `Customer message: "${customerMessage}"

Previous conversation context: ${conversationHistory ? conversationHistory.slice(-500) : 'No previous conversation'}

Please respond as Finn with a helpful, brief message (under 160 characters).`;

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
