
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { analyzeConversationalContext, generateConversationalResponse } from './conversationalAwareness.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { leadId, leadName, messageBody, conversationHistory } = await req.json()
    
    console.log('🤖 Processing message for', leadName + ':', `"${messageBody}"`);
    
    // Check for empty messages
    if (!messageBody || messageBody.trim() === '') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { data: phoneData } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .eq('is_primary', true)
        .single();
      
      if (!phoneData || phoneData.number === '+15551234567') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No valid phone number for lead',
            skipMessage: true
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Simple conversational analysis
    const conversationalContext = analyzeConversationalContext(messageBody);
    console.log('🗣️ Conversational context:', conversationalContext);

    // Check if message warrants acknowledgment
    if (conversationalContext.warrantsAcknowledgment) {
      const response = generateConversationalResponse(conversationalContext, leadName);
      
      return new Response(
        JSON.stringify({ success: true, response }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Simple intent detection
    const hasQuestion = /\?/.test(messageBody) || 
      /\b(what|how|when|where|why|can you|could you|would you|do you|are you|is there)\b/i.test(messageBody);

    if (!hasQuestion) {
      return new Response(
        JSON.stringify({ success: false, error: 'No question detected' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate response using OpenAI
    const response = await generateSimpleResponse(leadName, messageBody);
    
    return new Response(
      JSON.stringify({ success: true, response }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function generateSimpleResponse(leadName: string, message: string) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `You are Finn, a helpful AI assistant for Jason Pilger Chevrolet in Atmore, AL.

Customer: ${leadName}
Message: "${message}"

Respond helpfully and professionally in under 160 characters.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful automotive sales assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim() || 'I apologize, but I encountered an issue. Please call us at (251) 368-4053!';
}
