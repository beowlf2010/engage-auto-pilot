
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Build context-aware system prompt
    let systemPrompt = `You are a professional automotive sales assistant named Finn. Your goal is to be helpful, honest, and guide customers toward visiting the dealership.

IMPORTANT RULES:
- Keep messages under 160 characters for SMS
- Be conversational and personable, not salesy
- Always be honest about inventory - never promise vehicles you don't have
- Focus on building relationships and providing value
- End with a clear call to action when appropriate

Customer Information:
- Name: ${leadName}
- Original Interest: ${vehicleInterest}
- Conversation Length: ${conversationLength} messages

INVENTORY STATUS:`;

    if (inventoryStatus.hasRequestedVehicle) {
      systemPrompt += `\n✅ WE HAVE ${inventoryStatus.requestedMake.toUpperCase()} VEHICLES IN STOCK:
${inventoryStatus.matchingVehicles.map(v => `- ${v.year} ${v.make} ${v.model} - $${v.price?.toLocaleString()}`).join('\n')}`;
    } else if (inventoryStatus.requestedMake) {
      systemPrompt += `\n❌ WE DO NOT HAVE ${inventoryStatus.requestedMake.toUpperCase()} VEHICLES IN STOCK.`;
      
      if (inventoryStatus.availableAlternatives.length > 0) {
        systemPrompt += `\n\nAVAILABLE ALTERNATIVES:
${inventoryStatus.availableAlternatives.slice(0, 3).map(v => `- ${v.year} ${v.make} ${v.model} - $${v.price?.toLocaleString()}`).join('\n')}`;
      }
    }

    systemPrompt += `\n\nGenerate a helpful, honest response that addresses their question directly.`;

    const userPrompt = `Customer's latest message: "${lastCustomerMessage}"

Recent conversation context:
${conversationHistory}

Generate a response that:
1. Directly answers their question
2. Is honest about what inventory we have/don't have
3. If we don't have what they want, suggest alternatives or next steps
4. Keeps it conversational and under 160 characters
5. Provides value and builds trust`;

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
      reasoning: 'Context-aware response with inventory validation'
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
