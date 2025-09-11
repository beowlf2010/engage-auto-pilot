
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    console.log('🔧 [FINN AI] Checking OpenAI API key...');
    
    // Get OpenAI API key and dealership context from settings table
    const { data: openAIKeySetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'OPENAI_API_KEY')
      .maybeSingle();

    // Get dealership context for proper identification
    const { data: dealershipContext } = await supabase
      .rpc('get_dealership_context');

    if (!openAIKeySetting?.value) {
      console.error('❌ [FINN AI] OpenAI API key not configured in settings');
      return new Response(JSON.stringify({
        error: 'OpenAI API key not configured in settings',
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIApiKey = openAIKeySetting.value;
    console.log('✅ [FINN AI] OpenAI API key found');

    const {
      leadId,
      leadName,
      messageBody,
      latestCustomerMessage,
      conversationHistory: rawConversationHistory,
      vehicleInterest,
      leadSource,
      leadSourceData,
      sourceStrategy
    } = await req.json();

    // Ensure conversationHistory is a string
    const conversationHistory = typeof rawConversationHistory === 'string' ? rawConversationHistory : String(rawConversationHistory || '');

    // Fetch lead data including geographical info and check if this is initial contact
    const { data: leadGeoData } = await supabase
      .from('leads')
      .select('address, city, state, postal_code')
      .eq('id', leadId)
      .maybeSingle();

    // Check if this is an initial contact by looking at conversation history
    const { data: existingConversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', leadId)
      .eq('direction', 'out')
      .limit(1);

    const isInitialContact = !existingConversations || existingConversations.length === 0;

    console.log('📍 [FINN AI] Lead location:', {
      city: leadGeoData?.city,
      state: leadGeoData?.state,
      hasAddress: !!leadGeoData?.address
    });

    console.log('🤖 [FINN AI] Processing request for lead:', leadId);
    console.log('🤖 [FINN AI] Customer message:', messageBody?.substring(0, 100));
    console.log('📊 [FINN AI] Lead source context:', {
      source: leadSource,
      category: leadSourceData?.sourceCategory,
      urgency: leadSourceData?.urgencyLevel,
      style: leadSourceData?.communicationStyle,
      conversion: leadSourceData?.conversionProbability
    });

    // Simple intent analysis
    const customerMessage = messageBody || latestCustomerMessage || '';
    const intentAnalysis = {
      primaryIntent: customerMessage.toLowerCase().includes('price') ? 'pricing_inquiry' : 
                    customerMessage.toLowerCase().includes('appointment') ? 'appointment_request' :
                    customerMessage.toLowerCase().includes('test drive') ? 'test_drive_request' : 'general_inquiry',
      confidence: 0.8,
      responseStrategy: 'helpful',
      customerContext: {
        mentionedTopics: []
      }
    };

    console.log('🎯 [FINN AI] Intent analysis:', {
      primary: intentAnalysis.primaryIntent,
      confidence: intentAnalysis.confidence,
      strategy: intentAnalysis.responseStrategy
    });

    // Simple conversation pattern analysis
    const conversationPattern = {
      hasRepetitiveGreeting: false,
      isEstablishedConversation: (conversationHistory || '').length > 100,
      customerMessageCount: (conversationHistory || '').split('Customer:').length - 1,
      salesMessageCount: (conversationHistory || '').split('Sales:').length - 1
    };

    // Get conversation memory
    const { data: conversationMemory } = await supabase
      .from('ai_conversation_context')
      .select('*')
      .eq('lead_id', leadId)
      .maybeSingle();

    // Build contextual prompts with proper dealership identification
    const dealershipName = dealershipContext?.DEALERSHIP_NAME || 'our dealership';
    const salespersonName = dealershipContext?.DEFAULT_SALESPERSON_NAME || 'a sales representative';
    const dealershipLocation = dealershipContext?.DEALERSHIP_LOCATION || 'our location';
    const dealershipPhone = dealershipContext?.DEALERSHIP_PHONE || 'our dealership';

    // Build source-specific context
    const sourceContext = getSourceSpecificContext(leadSourceData, sourceStrategy);
    
    let systemPrompt = '';

    if (isInitialContact) {
      // For initial contact, use warm introduction style with source-specific approach
      systemPrompt = `You are ${salespersonName}, a ${sourceContext.tonalAdjustments} car sales professional at ${dealershipName} in ${dealershipLocation}.

This is your FIRST contact with this customer who came from: ${leadSource || 'direct inquiry'}

${sourceContext.systemPromptAdditions}

Communication approach for this lead source:
${sourceContext.communicationGuidelines}

Initial contact guidelines:
- Use ${sourceContext.tonalAdjustments} tone
- ${sourceContext.urgencyModifiers}
- Reference their interest in ${vehicleInterest || 'finding the right vehicle'}
- Keep it under 160 characters for SMS
- Focus on: ${sourceContext.conversionFocusAreas.slice(0, 2).join(', ')}

Customer location: ${leadGeoData?.city || 'Unknown'}, ${leadGeoData?.state || 'Unknown'}
Customer interest: ${vehicleInterest || 'General inquiry'}
Source urgency level: ${leadSourceData?.urgencyLevel || 'medium'}
Expected response style: ${leadSourceData?.communicationStyle || 'professional'}`;
    } else {
      // For follow-up messages, maintain source-appropriate approach
      systemPrompt = `You are ${salespersonName} from ${dealershipName} in ${dealershipLocation}.

Continuing conversation with customer from: ${leadSource || 'direct inquiry'}

${sourceContext.systemPromptAdditions}

Communication approach:
${sourceContext.communicationGuidelines}

Conversation guidelines:
- Maintain ${sourceContext.tonalAdjustments} tone
- ${sourceContext.urgencyModifiers}
- Keep responses under 160 characters for SMS
- Focus on ${vehicleInterest || 'helping them find the right vehicle'}
- Key focus areas: ${sourceContext.conversionFocusAreas.slice(0, 3).join(', ')}

Customer location: ${leadGeoData?.city || 'Unknown'}, ${leadGeoData?.state || 'Unknown'}
Customer interest: ${vehicleInterest || 'General inquiry'}
Source conversion probability: ${leadSourceData?.conversionProbability || 0.5}`;
    }

    let userPrompt = '';

    if (isInitialContact) {
      userPrompt = `Customer message: "${customerMessage}"

This is your first outreach to this customer from ${leadSource}. ${vehicleInterest ? `They've shown interest in: ${vehicleInterest}` : 'They are a new lead.'}

Use this source-appropriate response pattern: ${sourceContext.responsePatterns[0] || 'Professional greeting'}

Respond with an introduction that:
- Follows the ${leadSourceData?.communicationStyle || 'professional'} style for ${leadSourceData?.sourceCategory || 'general'} leads
- Uses appropriate ${sourceContext.tonalAdjustments}
- Acknowledges their ${leadSourceData?.urgencyLevel || 'medium'} urgency level
- Stays under 160 characters`;
    } else {
      const responsePattern = sourceContext.responsePatterns[1] || sourceContext.responsePatterns[0] || 'Helpful response';
      
      userPrompt = `Customer message: "${customerMessage}"

Previous conversation context: ${conversationHistory ? conversationHistory.slice(-500) : 'No previous conversation'}

This customer came from ${leadSource} (${leadSourceData?.sourceCategory || 'general'} source).

Use this response pattern: ${responsePattern}

Respond as ${salespersonName} with:
- ${sourceContext.tonalAdjustments} tone
- Focus on: ${sourceContext.conversionFocusAreas[0] || 'helping the customer'}
- ${sourceContext.urgencyModifiers}
- Under 160 characters`;
    }

    console.log('📝 [FINN AI] Contact type:', isInitialContact ? 'Initial' : 'Follow-up');
    console.log('📝 [FINN AI] Dealership context:', { dealershipName, salespersonName, dealershipLocation });
    console.log('📝 [FINN AI] Generated system prompt length:', systemPrompt.length);
    console.log('📝 [FINN AI] Generated user prompt length:', userPrompt.length);

    // Call OpenAI with enhanced prompts
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
        max_tokens: 300,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ [FINN AI] OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedMessage = data.choices[0].message.content;

    console.log('✅ [FINN AI] Generated response:', generatedMessage?.substring(0, 100));

    // Update conversation context
    await updateConversationContext(supabase, leadId, {
      lastInteractionType: intentAnalysis.primaryIntent,
      keyTopics: intentAnalysis.customerContext.mentionedTopics || [],
      conversationSummary: `Customer ${intentAnalysis.primaryIntent} about ${vehicleInterest}`,
      responseStyle: intentAnalysis.responseStrategy,
      contextScore: intentAnalysis.confidence
    });

    // Store AI conversation note
    await supabase
      .from('ai_conversation_notes')
      .insert({
        lead_id: leadId,
        note_type: 'ai_response_generated',
        note_content: `AI Response (${intentAnalysis.primaryIntent}): ${generatedMessage?.substring(0, 200)}...`,
        vehicles_discussed: vehicleInterest ? [vehicleInterest] : []
      });

    return new Response(JSON.stringify({
      message: generatedMessage,
      intent: intentAnalysis.primaryIntent,
      confidence: intentAnalysis.confidence,
      strategy: intentAnalysis.responseStrategy,
      conversationPattern,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [FINN AI] Error in intelligent-conversation-ai:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to generate AI response',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Source-specific context helper
function getSourceSpecificContext(leadSourceData: any, sourceStrategy: any) {
  const defaultStrategy = {
    systemPromptAdditions: 'This lead requires professional, helpful service.',
    communicationGuidelines: 'Be professional and responsive to their needs.',
    responsePatterns: [
      'Thank you for your interest! How can I help you today?',
      'I appreciate you reaching out. Let me assist you with that.',
      'Thanks for contacting us about your vehicle needs.'
    ],
    tonalAdjustments: 'professional and helpful',
    urgencyModifiers: 'Respond promptly and professionally.',
    conversionFocusAreas: ['professional service', 'helpful information', 'next steps']
  };

  if (!sourceStrategy || !leadSourceData) {
    return defaultStrategy;
  }

  // Map source categories to specific communication approaches
  const sourceEnhancements: Record<string, any> = {
    high_intent_digital: {
      systemPromptAdditions: `This lead came from a high-intent platform (${leadSourceData.source}) where they actively searched for vehicles. They expect professional, knowledgeable responses with specific details and quick action. Conversion probability: ${Math.round((leadSourceData.conversionProbability || 0.85) * 100)}% - treat as hot lead.`,
      communicationGuidelines: 'Be direct and professional. Provide specific details quickly. Focus on availability and next steps. Assume they are comparison shopping.',
      responsePatterns: sourceStrategy.responseTemplates ? Object.values(sourceStrategy.responseTemplates) : defaultStrategy.responsePatterns,
      tonalAdjustments: 'professional, confident, solution-focused',
      urgencyModifiers: 'Create appropriate urgency about inventory and pricing without being pushy.',
      conversionFocusAreas: ['immediate scheduling', 'specific vehicle details', 'competitive advantages']
    },
    value_focused: {
      systemPromptAdditions: `This lead came from value-focused platforms where price and value matter most. They want to understand total ownership value. Conversion probability: ${Math.round((leadSourceData.conversionProbability || 0.75) * 100)}%.`,
      communicationGuidelines: 'Emphasize total value proposition. Be patient with comparisons. Highlight long-term savings. Build trust through transparency.',
      responsePatterns: sourceStrategy.responseTemplates ? Object.values(sourceStrategy.responseTemplates) : defaultStrategy.responsePatterns,
      tonalAdjustments: 'consultative, patient, educational',
      urgencyModifiers: 'Gentle urgency around good deals, but respect their research process.',
      conversionFocusAreas: ['total value demonstration', 'cost comparisons', 'trust building']
    },
    credit_ready: {
      systemPromptAdditions: `This lead has financing pre-approval or came through credit process. They are ready to buy and expect quick service. Conversion probability: ${Math.round((leadSourceData.conversionProbability || 0.90) * 100)}% - highest priority.`,
      communicationGuidelines: 'Acknowledge financing status immediately. Focus on vehicle selection within approval. Expedite process respectfully.',
      responsePatterns: sourceStrategy.responseTemplates ? Object.values(sourceStrategy.responseTemplates) : defaultStrategy.responsePatterns,
      tonalAdjustments: 'professional, respectful, action-oriented',
      urgencyModifiers: 'Strong urgency due to financing timeline and readiness to purchase.',
      conversionFocusAreas: ['immediate vehicle selection', 'same-day appointments', 'closing preparation']
    },
    social_discovery: {
      systemPromptAdditions: `This lead discovered us through social media and may be early in their journey. They need gentle nurturing rather than aggressive sales tactics. Conversion probability: ${Math.round((leadSourceData.conversionProbability || 0.45) * 100)}%.`,
      communicationGuidelines: 'Keep tone casual and friendly. Focus on lifestyle and experience. Avoid high-pressure tactics. Build relationship first.',
      responsePatterns: sourceStrategy.responseTemplates ? Object.values(sourceStrategy.responseTemplates) : defaultStrategy.responsePatterns,
      tonalAdjustments: 'casual, friendly, approachable',
      urgencyModifiers: 'Very gentle urgency. Focus on opportunity rather than pressure.',
      conversionFocusAreas: ['relationship building', 'lifestyle alignment', 'easy engagement']
    },
    referral_based: {
      systemPromptAdditions: `This lead came through referral and has pre-existing trust but expects special treatment. Conversion probability: ${Math.round((leadSourceData.conversionProbability || 0.70) * 100)}%.`,
      communicationGuidelines: 'Acknowledge the referral immediately. Emphasize family/friend treatment. Highlight referral benefits.',
      responsePatterns: sourceStrategy.responseTemplates ? Object.values(sourceStrategy.responseTemplates) : defaultStrategy.responsePatterns,
      tonalAdjustments: 'warm, appreciative, family-oriented',
      urgencyModifiers: 'Respectful urgency based on honoring the referral relationship.',
      conversionFocusAreas: ['referral appreciation', 'exceeding expectations', 'relationship leverage']
    }
  };

  const category = leadSourceData.sourceCategory || 'unknown';
  return sourceEnhancements[category] || defaultStrategy;
}

async function updateConversationContext(supabase: any, leadId: string, context: any) {
  try {
    await supabase
      .from('ai_conversation_context')
      .upsert({
        lead_id: leadId,
        ...context,
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('❌ [FINN AI] Error updating conversation context:', error);
  }
}
