
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { analyzeConversationalContext, generateConversationalResponse } from './conversationalAwareness.ts'
import { analyzeConversationMemory, generateConversationGuidance } from './conversationMemory.ts'
import { buildEnhancedSystemPrompt, buildEnhancedUserPrompt } from './enhancedPromptBuilder.ts'

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
    
    console.log('🤖 Processing ENHANCED conversation-aware message for', leadName + ':', `"${messageBody}"`);
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

    // CRITICAL: Use enhanced conversation memory system to prevent re-introductions
    const conversationMemory = analyzeConversationMemory(conversationHistory || '');
    console.log('🧠 CRITICAL Conversation memory analysis:', {
      hasIntroduced: conversationMemory.hasIntroduced,
      isEstablishedConversation: conversationMemory.isEstablishedConversation,
      lastSalesMessageType: conversationMemory.lastSalesMessageType,
      introductionCount: conversationMemory.introductionCount,
      hasRepetitiveIntroductions: conversationMemory.hasRepetitiveIntroductions,
      discussedTopics: conversationMemory.discussedTopics
    });

    // ENHANCED: Detect conversation repair needs (customer confusion)
    const confusionSignals = /\b(who is this|who are you|i don't know you|do i know you|have we talked)\b/i;
    const customerNeedsRepair = confusionSignals.test(messageBody) && conversationMemory.hasIntroduced;
    
    if (customerNeedsRepair) {
      console.log('🔧 CONVERSATION REPAIR: Customer seems confused despite previous introduction');
    }

    // CRITICAL: Restrict simple conversational response to only genuine handoffs
    const conversationalContext = analyzeConversationalContext(messageBody);
    console.log('🗣️ Conversational context:', conversationalContext);

    // ENHANCED: Only use simple response for very specific handoff scenarios, not confusion
    const isGenuineHandoff = conversationalContext.warrantsAcknowledgment && 
                            conversationalContext.responseType === 'handoff' && 
                            !customerNeedsRepair;

    if (isGenuineHandoff) {
      console.log('🤝 Genuine handoff detected, using simple acknowledgment');
      const response = generateConversationalResponse(conversationalContext, leadName);
      
      return new Response(
        JSON.stringify({ success: true, response }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // CRITICAL: All other responses MUST go through conversation-aware system
    console.log('🤖 Using ENHANCED conversation-aware prompt system');

    // Mock inventory and business hours for the enhanced system
    const inventoryStatus = {
      hasActualInventory: true,
      validatedCount: 15,
      warning: null
    };

    const businessHours = {
      isOpen: true,
      hours: { start: '8:00 AM', end: '6:00 PM' }
    };

    // CRITICAL: Generate conversation guidance that enforces conversation state
    const conversationGuidance = generateConversationGuidance(conversationMemory, inventoryStatus, businessHours);
    console.log('📋 CRITICAL Conversation guidance:', conversationGuidance);

    // ENHANCED: Ensure conversation memory controls prompt generation
    const conversationLength = conversationHistory ? conversationHistory.split('\n').length : 0;
    const promptData = buildEnhancedSystemPrompt(
      leadName,
      vehicleInterest || '',
      conversationLength,
      conversationHistory || '',
      inventoryStatus,
      businessHours,
      conversationGuidance,
      messageBody
    );

    const userPrompt = buildEnhancedUserPrompt(
      messageBody,
      conversationHistory || '',
      null, // requestedCategory
      { isEstablishedConversation: conversationMemory.isEstablishedConversation },
      conversationMemory,
      conversationGuidance,
      promptData.customerIntent,
      promptData.answerGuidance,
      promptData.appointmentIntent,
      promptData.tradeIntent
    );

    console.log('📝 Using conversation-aware system prompt with anti-introduction safeguards');

    // CRITICAL: Log conversation state for debugging
    if (conversationMemory.hasIntroduced) {
      console.log('🚨 REMINDER: Customer has been introduced to Finn. DO NOT re-introduce.');
    }
    if (conversationMemory.hasRepetitiveIntroductions) {
      console.log('🔥 WARNING: Multiple introductions detected in history. System must prevent further re-introductions.');
    }

    // Generate response using conversation-aware system
    const response = await generateEnhancedResponse(
      promptData.systemPrompt,
      userPrompt,
      leadSource,
      leadSourceData
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

async function generateEnhancedResponse(
  systemPrompt: string,
  userPrompt: string,
  leadSource?: string, 
  leadSourceData?: any
) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Add source-specific instructions to the system prompt
  let enhancedSystemPrompt = systemPrompt;
  if (leadSource && leadSourceData) {
    enhancedSystemPrompt += `\n\nSOURCE-SPECIFIC GUIDANCE: ${getSourceSpecificInstructions(leadSourceData?.sourceCategory)}`;
  }

  console.log('🚀 Generating response with conversation-aware anti-introduction system');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: enhancedSystemPrompt },
        { role: 'user', content: userPrompt }
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
