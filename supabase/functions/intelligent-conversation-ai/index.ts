
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildSystemPrompt, buildUserPrompt } from './promptBuilder.ts';
import { analyzeConversationPattern } from './conversationAnalysis.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { 
      leadName, 
      vehicleInterest, 
      lastCustomerMessage, 
      conversationHistory, 
      leadInfo,
      conversationLength,
      inventoryStatus 
    } = await req.json();

    console.log(`🤖 Processing intelligent AI request for: ${leadName}`);
    console.log(`🚗 Vehicle interest: ${vehicleInterest}`);
    console.log(`💬 Last message: ${lastCustomerMessage}`);

    // Build system and user prompts using the new modules
    const { systemPrompt, requestedCategory } = buildSystemPrompt(
      leadName,
      vehicleInterest,
      conversationLength,
      conversationHistory,
      inventoryStatus
    );

    const conversationPattern = analyzeConversationPattern(conversationHistory || '');
    const userPrompt = buildUserPrompt(
      lastCustomerMessage,
      conversationHistory,
      requestedCategory,
      conversationPattern
    );

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
        max_tokens: 150,
      }),
    });

    const aiResponse = await response.json();
    const generatedMessage = aiResponse.choices[0].message.content;

    console.log(`✅ Generated intelligent response: ${generatedMessage}`);

    return new Response(JSON.stringify({ 
      message: generatedMessage,
      confidence: 0.9,
      reasoning: `Context-aware response for ${requestedCategory.category} vehicle inquiry (${requestedCategory.condition}) with honest inventory assessment${requestedCategory.isTesla ? ' (Tesla new/used logic applied)' : ''}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in intelligent conversation AI:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
