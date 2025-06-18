
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
      conversationLength 
    } = await req.json();

    console.log('🤖 Processing intelligent AI request for:', leadName);

    // Build context-aware system prompt
    const systemPrompt = `You are Finn, an intelligent automotive sales AI assistant. You help customers who are interested in purchasing vehicles.

IMPORTANT GUIDELINES:
- Always be helpful, professional, and conversational
- Address the customer's specific question or concern directly
- Keep responses under 160 characters for SMS compatibility
- Be personable and use the customer's name when appropriate
- Focus on being helpful rather than pushy
- If asked about technical details, pricing, or availability, acknowledge the question and suggest speaking with a human expert
- Never make up specific prices, availability, or technical details
- Always aim to move the conversation toward a dealership visit or phone call

CUSTOMER CONTEXT:
- Name: ${leadName}
- Vehicle Interest: ${vehicleInterest}
- Conversation Length: ${conversationLength} messages
- Status: ${leadInfo?.status || 'Active prospect'}

CONVERSATION HISTORY:
${conversationHistory}

CUSTOMER'S LATEST MESSAGE: "${lastCustomerMessage}"

Generate a helpful, contextual response that directly addresses what the customer asked or said. Be natural and conversational.`;

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
          { role: 'user', content: `Please respond to the customer's message: "${lastCustomerMessage}"` }
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    const aiResponse = await response.json();
    
    if (!aiResponse.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const message = aiResponse.choices[0].message.content.trim();
    
    // Simple quality check
    if (message.length > 160) {
      console.warn('⚠️ Generated message too long, truncating');
    }

    console.log('✅ Generated intelligent response:', message);

    return new Response(JSON.stringify({
      message: message.slice(0, 160), // Ensure SMS compatibility
      confidence: 0.8,
      reasoning: 'AI analysis of conversation context and customer inquiry'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in intelligent conversation AI:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      message: null 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
