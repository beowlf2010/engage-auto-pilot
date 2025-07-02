import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  body: string;
  direction: 'in' | 'out';
  sent_at: string;
  ai_generated?: boolean;
}

interface ConversationData {
  leadId: string;
  leadName: string;
  vehicleInterest?: string;
  messages: Message[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { conversation, type = 'response' }: { 
      conversation: ConversationData;
      type?: 'response' | 'suggestions';
    } = await req.json();

    if (!conversation || !conversation.leadId) {
      throw new Error('Conversation data is required');
    }

    // Build conversation context
    const conversationContext = conversation.messages
      .map(msg => `${msg.direction === 'in' ? conversation.leadName : 'Sales Rep'}: ${msg.body}`)
      .join('\n');

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'suggestions') {
      systemPrompt = `You are an expert automotive sales assistant. Generate 3 helpful, contextual response suggestions for the sales representative.

Guidelines:
- Keep responses conversational and helpful
- Focus on moving the sale forward
- Ask relevant questions about their needs
- Suggest vehicle features that match their interest
- Be friendly but professional
- Keep each suggestion under 100 characters

Vehicle Interest: ${conversation.vehicleInterest || 'General inquiry'}
Customer Name: ${conversation.leadName}`;

      userPrompt = `Based on this conversation, suggest 3 response options:

${conversationContext}

Return ONLY a JSON array of 3 strings, nothing else.`;

    } else {
      systemPrompt = `You are a knowledgeable automotive sales representative helping customers find their perfect vehicle.

Key principles:
- Be helpful, friendly, and professional
- ALWAYS read the conversation context carefully
- If customer mentions timing issues (hold off, save up, not ready), be empathetic and understanding - DON'T push for immediate action
- If customer has budget concerns, acknowledge them respectfully
- Adapt your tone to match their situation (urgent vs casual vs hesitant)
- Ask clarifying questions to understand their needs
- Provide specific vehicle recommendations when appropriate
- Address any concerns they might have
- Keep responses conversational and natural
- Focus on building trust over pushing for immediate sales
- If they mention specific vehicles, provide relevant details and benefits

Customer: ${conversation.leadName}
Vehicle Interest: ${conversation.vehicleInterest || 'General inquiry'}`;

      userPrompt = `Please provide a helpful response to this conversation:

${conversationContext}

Generate a natural, helpful response that moves the conversation forward. Use only the customer's first name, not their full name.`;
    }

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
        temperature: type === 'suggestions' ? 0.8 : 0.7,
        max_tokens: type === 'suggestions' ? 300 : 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    let result;
    if (type === 'suggestions') {
      try {
        // Try to parse as JSON array
        const suggestions = JSON.parse(generatedText);
        if (Array.isArray(suggestions)) {
          result = { suggestions };
        } else {
          // Fallback: split by lines and clean up
          result = { 
            suggestions: generatedText
              .split('\n')
              .filter(line => line.trim())
              .slice(0, 3)
              .map(line => line.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim())
          };
        }
      } catch (e) {
        // Fallback: split by lines
        result = { 
          suggestions: generatedText
            .split('\n')
            .filter(line => line.trim())
            .slice(0, 3)
            .map(line => line.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim())
        };
      }
    } else {
      result = { response: generatedText };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-ai-response function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate AI response' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});