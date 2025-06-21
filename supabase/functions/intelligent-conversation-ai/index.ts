import { serve } from '@supabase/functions-js'

import { analyzeCustomerIntent, generateAnswerGuidance } from './enhancedIntentAnalysis.ts';
import { buildEnhancedPrompt } from './promptBuilder.ts';
import { detectEnhancedObjectionSignals } from './enhancedObjectionDetection.ts';

const openAIApiKey = process.env.OPENAI_API_KEY

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  try {
    const { 
      leadName,
      vehicleInterest,
      lastCustomerMessage,
      conversationHistory,
      inventoryStatus,
      isInitialContact = false
    } = await req.json();

    console.log(`🤖 [ENHANCED AI] Processing message for ${leadName}: "${lastCustomerMessage}"`);

    // ENHANCED: Analyze customer intent with pricing awareness
    const customerIntent = analyzeCustomerIntent(conversationHistory || '', lastCustomerMessage);
    console.log(`🎯 [ENHANCED AI] Detected intent:`, customerIntent);

    // ENHANCED: Check for pricing concerns immediately
    const pricingConcerns = customerIntent.hasPricingConcerns;
    if (pricingConcerns) {
      console.log(`💰 [ENHANCED AI] PRICING CONCERN DETECTED - Priority handling`);
    }

    // Generate answer guidance with enhanced pricing support
    const answerGuidance = generateAnswerGuidance(customerIntent, inventoryStatus);

    // ENHANCED: Build prompt with pricing concern prioritization
    const prompt = buildEnhancedPrompt(
      leadName,
      vehicleInterest,
      lastCustomerMessage,
      conversationHistory,
      customerIntent,
      answerGuidance,
      inventoryStatus,
      isInitialContact
    );

    console.log(`📝 [ENHANCED AI] Generated prompt length: ${prompt.length}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: pricingConcerns ? 300 : 200, // More tokens for pricing concerns
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0].message.content;

    console.log(`✅ [ENHANCED AI] Generated response: ${aiMessage}`);

    return new Response(JSON.stringify({
      message: aiMessage,
      confidence: pricingConcerns ? 0.95 : 0.85, // Higher confidence for pricing responses
      reasoning: pricingConcerns ? 'Enhanced pricing concern handling' : 'Enhanced AI with objection detection',
      customerIntent,
      answerGuidance,
      hasPricingConcerns: pricingConcerns
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [ENHANCED AI] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      message: null 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
