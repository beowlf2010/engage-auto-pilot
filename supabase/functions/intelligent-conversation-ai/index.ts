
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Import our enhanced modules
import { analyzeEnhancedCustomerIntent } from './enhancedIntentAnalysis.ts';
import { buildContextualPrompt } from './contextualPrompts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      leadId,
      leadName,
      vehicleInterest,
      conversationHistory,
      leadInfo,
      conversationLength = 0,
      inventoryStatus,
      isInitialContact = false,
      salespersonName = 'Finn',
      dealershipName = 'Jason Pilger Chevrolet',
      dataQuality,
      context
    } = await req.json();

    console.log(`🤖 [ENHANCED AI] Processing message for ${leadName} about ${vehicleInterest}`);

    // Get the last customer message for analysis
    const conversationLines = conversationHistory.split('\n').filter(line => line.trim());
    const customerMessages = conversationLines.filter(line => line.startsWith('Customer:'));
    const lastCustomerMessage = customerMessages[customerMessages.length - 1]?.replace('Customer:', '').trim() || '';

    if (!lastCustomerMessage) {
      console.log('❌ [ENHANCED AI] No customer message found to respond to');
      return new Response(
        JSON.stringify({ 
          message: null,
          confidence: 0,
          reasoning: 'No customer message to respond to'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📝 [ENHANCED AI] Analyzing customer message: "${lastCustomerMessage}"`);

    // Perform enhanced intent analysis
    const intentAnalysis = analyzeEnhancedCustomerIntent(
      lastCustomerMessage,
      conversationHistory,
      vehicleInterest,
      leadName
    );

    console.log(`🧠 [ENHANCED AI] Intent analysis:`, {
      intent: intentAnalysis.primaryIntent,
      confidence: intentAnalysis.confidence,
      strategy: intentAnalysis.responseStrategy,
      vehicle: intentAnalysis.customerContext.mentionedVehicle,
      tone: intentAnalysis.customerContext.emotionalTone
    });

    // Check if we should generate a response
    if (intentAnalysis.confidence < 0.3) {
      console.log('⚠️ [ENHANCED AI] Low confidence intent analysis, using fallback');
    }

    // Build contextual prompts
    const { systemPrompt, userPrompt } = buildContextualPrompt(
      leadName,
      vehicleInterest,
      lastCustomerMessage,
      conversationHistory,
      intentAnalysis,
      context
    );

    console.log(`🎯 [ENHANCED AI] Using strategy: ${intentAnalysis.responseStrategy}`);

    // Generate AI response with enhanced context
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
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content?.trim();

    if (!aiMessage) {
      console.log('❌ [ENHANCED AI] No response generated from OpenAI');
      return new Response(
        JSON.stringify({
          message: null,
          confidence: 0,
          reasoning: 'No response generated'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [ENHANCED AI] Generated enhanced response: "${aiMessage}"`);

    return new Response(
      JSON.stringify({
        message: aiMessage,
        confidence: Math.min(0.95, intentAnalysis.confidence + 0.1),
        reasoning: `Enhanced contextual response - Intent: ${intentAnalysis.primaryIntent}, Strategy: ${intentAnalysis.responseStrategy}`,
        intentAnalysis: {
          intent: intentAnalysis.primaryIntent,
          confidence: intentAnalysis.confidence,
          strategy: intentAnalysis.responseStrategy,
          mentionedVehicle: intentAnalysis.customerContext.mentionedVehicle
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [ENHANCED AI] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: null,
        confidence: 0
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
