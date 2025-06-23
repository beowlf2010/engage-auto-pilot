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
    const { 
      leadId, 
      leadName, 
      messageBody, 
      conversationHistory, 
      hasConversationalSignals,
      leadSource,
      leadSourceData,
      vehicleInterest
    } = await req.json()
    
    console.log('🤖 Processing source-aware message for', leadName + ':', `"${messageBody}"`);
    console.log('📍 Lead source:', leadSource, 'Category:', leadSourceData?.sourceCategory);
    
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

    // CHANGED: Remove the restrictive question-only check
    // Previous code blocked non-question messages, now we attempt to respond to ALL messages
    console.log('🤖 Attempting to generate response for any customer message');

    // Generate source-aware response using OpenAI
    const response = await generateSourceAwareResponse(
      leadName, 
      messageBody, 
      leadSource, 
      leadSourceData, 
      vehicleInterest,
      conversationHistory
    );
    
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

async function generateSourceAwareResponse(
  leadName: string, 
  message: string, 
  leadSource?: string, 
  leadSourceData?: any,
  vehicleInterest?: string,
  conversationHistory?: string
) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Generate source-aware prompt
  let prompt = `You are Finn, a helpful AI assistant for Jason Pilger Chevrolet in Atmore, AL.

Customer: ${leadName}
Vehicle Interest: ${vehicleInterest || 'Not specified'}
Message: "${message}"`;

  // Add source-specific context if available
  if (leadSource && leadSourceData) {
    const sourceContext = getSourceContext(leadSourceData);
    prompt += `\n\nLEAD SOURCE CONTEXT:
Source: ${leadSource}
Category: ${leadSourceData.sourceCategory}
${sourceContext}`;
  }

  // Add conversation history if available
  if (conversationHistory) {
    prompt += `\n\nRecent conversation:\n${conversationHistory}`;
  }

  // ENHANCED: Updated prompt to handle all message types, not just questions
  prompt += `\n\nRespond helpfully and professionally in under 160 characters. Even if the customer isn't asking a direct question, acknowledge their message and provide value. ${getSourceSpecificInstructions(leadSourceData?.sourceCategory)}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful automotive sales assistant who responds to every customer message with care and professionalism, even if they are not asking questions.' },
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
  return data.choices[0]?.message?.content?.trim() || 'I appreciate you reaching out. Please call us at (251) 368-4053 and we can help you with whatever you need!';
}

function getSourceContext(leadSourceData: any): string {
  if (!leadSourceData) return '';
  
  return `Priority: ${leadSourceData.urgencyLevel}
Communication Style: ${leadSourceData.communicationStyle}
Expected Response Time: ${leadSourceData.expectedResponseTime} hours
Conversion Probability: ${Math.round(leadSourceData.conversionProbability * 100)}%`;
}

function getSourceSpecificInstructions(sourceCategory?: string): string {
  const instructions: Record<string, string> = {
    'high_intent_digital': 'Be direct about availability and competitive pricing. This customer is actively shopping.',
    'value_focused': 'Focus on value proposition and cost savings. Address pricing concerns upfront.',
    'credit_ready': 'Emphasize financing solutions and payment options. Be reassuring about approval.',
    'direct_inquiry': 'Provide personalized attention and detailed information. Build the relationship.',
    'social_discovery': 'Keep it friendly and low-pressure. Make the process seem easy and approachable.',
    'referral_based': 'Acknowledge the referral and provide VIP treatment. Live up to the recommendation.',
    'service_related': 'Appreciate their loyalty and leverage the existing relationship.',
  };
  
  return instructions[sourceCategory || ''] || 'Adapt your response based on customer needs.';
}
