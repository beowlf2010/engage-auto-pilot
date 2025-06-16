
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, messages, message, leadContext } = await req.json();

    if (action === 'summarize') {
      return await handleSummarization(messages);
    } else if (action === 'sentiment') {
      return await handleSentimentAnalysis(message);
    } else if (action === 'suggestions') {
      return await handleResponseSuggestions(messages, leadContext);
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in analyze-conversation function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleSummarization(messages: any[]) {
  const conversationText = messages.map(msg => 
    `${msg.direction === 'in' ? 'Customer' : 'Salesperson'}: ${msg.body}`
  ).join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that summarizes sales conversations. 
          Create a concise summary and extract key points. Format your response as JSON with:
          - summary: A 2-3 sentence summary of the conversation
          - keyPoints: An array of important discussion points, concerns, or next steps`
        },
        {
          role: 'user',
          content: `Summarize this sales conversation:\n\n${conversationText}`
        }
      ],
      temperature: 0.3
    }),
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    const parsed = JSON.parse(content);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch {
    // Fallback if JSON parsing fails
    return new Response(JSON.stringify({
      summary: content,
      keyPoints: []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleSentimentAnalysis(message: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI that analyzes sentiment in customer messages. 
          Respond with JSON containing:
          - sentimentScore: number between -1.0 (very negative) and 1.0 (very positive)
          - sentimentLabel: "positive", "negative", or "neutral"
          - confidenceScore: number between 0.0 and 1.0
          - emotions: array of detected emotions like ["frustrated", "interested", "excited"]`
        },
        {
          role: 'user',
          content: `Analyze the sentiment of this customer message: "${message}"`
        }
      ],
      temperature: 0.1
    }),
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    const parsed = JSON.parse(content);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch {
    // Fallback sentiment analysis
    return new Response(JSON.stringify({
      sentimentScore: 0.0,
      sentimentLabel: 'neutral',
      confidenceScore: 0.5,
      emotions: []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleResponseSuggestions(messages: any[], leadContext: any) {
  const conversationText = messages.map(msg => 
    `${msg.direction === 'in' ? 'Customer' : 'Salesperson'}: ${msg.body}`
  ).join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant helping car salespeople craft effective responses.
          Based on the conversation and lead context, suggest 3-5 appropriate response options.
          Format as JSON with suggestions array containing:
          - text: the suggested response message
          - contextType: category like "greeting", "follow_up", "pricing", "scheduling", "objection_handling"
          - confidence: score from 0.0 to 1.0`
        },
        {
          role: 'user',
          content: `Lead: ${leadContext.firstName}, interested in ${leadContext.vehicleInterest}, status: ${leadContext.status}

Recent conversation:
${conversationText}

Suggest appropriate responses for the salesperson.`
        }
      ],
      temperature: 0.7
    }),
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    const parsed = JSON.parse(content);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch {
    // Fallback suggestions
    return new Response(JSON.stringify({
      suggestions: [
        {
          text: "Thanks for your message! I'd be happy to help you with more information.",
          contextType: "follow_up",
          confidence: 0.8
        }
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
