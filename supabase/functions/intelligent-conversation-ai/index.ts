
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { analyzeEnhancedCustomerIntent } from './enhancedIntentAnalysis.ts';
import { detectEnhancedObjectionSignals, generateEnhancedObjectionResponse } from './enhancedObjectionDetection.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      messageBody,  // NEW: Direct customer message
      latestCustomerMessage,  // NEW: Alternative parameter name
      isInitialContact,
      salespersonName = 'Finn',
      dealershipName = 'Jason Pilger Chevrolet'
    } = await req.json();

    console.log('🤖 Enhanced AI processing for lead:', leadId, leadName);
    
    // Get the actual customer message - prioritize direct parameters over parsing
    let customerMessage = messageBody || latestCustomerMessage;
    
    // If no direct message provided, try to extract from conversation history
    if (!customerMessage && conversationHistory) {
      console.log('📝 Extracting customer message from conversation history');
      const messages = conversationHistory.split('\n').filter((line: string) => line.trim());
      const lastCustomerLine = messages
        .filter((line: string) => line.toLowerCase().includes('customer:'))
        .pop();
      
      if (lastCustomerLine) {
        customerMessage = lastCustomerLine.replace(/^customer:\s*/i, '').trim();
      }
    }

    console.log('📝 Processing customer message:', customerMessage);

    if (!customerMessage) {
      console.log('⚠️ No customer message found to process');
      return new Response(JSON.stringify({
        error: 'No customer message provided for analysis'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced intent analysis with the actual customer message
    const intentAnalysis = analyzeEnhancedCustomerIntent(
      customerMessage,
      conversationHistory || '',
      vehicleInterest || '',
      leadName || ''
    );

    console.log('🎯 Intent analysis result:', {
      primaryIntent: intentAnalysis.primaryIntent,
      confidence: intentAnalysis.confidence,
      strategy: intentAnalysis.responseStrategy,
      customerMessage: customerMessage.substring(0, 100) + '...',
      hasObjections: intentAnalysis.objectionSignals?.length || 0
    });

    // If competitor purchase is detected, return graceful exit response immediately
    if (intentAnalysis.primaryIntent === 'competitor_purchase') {
      console.log('🏆 Competitor purchase detected - generating congratulatory response');
      
      const response = intentAnalysis.suggestedResponse || 
        `Congratulations on your new vehicle, ${leadName || 'there'}! I'm sure you'll love it. Thank you for considering us during your search. If you ever need service, parts, or have friends or family looking for their next vehicle, please don't hesitate to reach out. We'd love to help in the future!`;

      return new Response(JSON.stringify({
        message: response,
        confidence: intentAnalysis.confidence,
        reasoning: 'Customer has purchased from competitor - providing graceful, congratulatory exit response',
        intentAnalysis: {
          strategy: 'congratulate_competitor_purchase',
          primaryIntent: 'competitor_purchase',
          urgencyLevel: 'low'
        },
        customerIntent: {
          type: 'competitor_purchase',
          confidence: intentAnalysis.confidence
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for other objections that need special handling
    if (intentAnalysis.objectionSignals && intentAnalysis.objectionSignals.length > 0) {
      console.log('🛡️ Objection detected:', intentAnalysis.objectionSignals[0].type);
      
      const objectionResponse = generateEnhancedObjectionResponse(
        intentAnalysis.objectionSignals,
        customerMessage,
        vehicleInterest || '',
        leadName || ''
      );

      if (objectionResponse) {
        return new Response(JSON.stringify({
          message: objectionResponse,
          confidence: intentAnalysis.objectionSignals[0].confidence,
          reasoning: `Addressing ${intentAnalysis.objectionSignals[0].type} objection with specialized response`,
          intentAnalysis: {
            strategy: intentAnalysis.objectionSignals[0].suggestedResponse,
            primaryIntent: intentAnalysis.primaryIntent,
            urgencyLevel: intentAnalysis.customerContext.urgencyLevel
          },
          customerIntent: {
            type: intentAnalysis.objectionSignals[0].type,
            confidence: intentAnalysis.objectionSignals[0].confidence
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Use enhanced contextual response if available
    if (intentAnalysis.suggestedResponse) {
      console.log('💡 Using enhanced contextual response');
      
      return new Response(JSON.stringify({
        message: intentAnalysis.suggestedResponse,
        confidence: intentAnalysis.confidence,
        reasoning: `Enhanced contextual response for ${intentAnalysis.primaryIntent} based on: "${customerMessage.substring(0, 50)}..."`,
        intentAnalysis: {
          strategy: intentAnalysis.responseStrategy,
          primaryIntent: intentAnalysis.primaryIntent,
          urgencyLevel: intentAnalysis.customerContext.urgencyLevel
        },
        customerIntent: {
          type: intentAnalysis.primaryIntent,
          confidence: intentAnalysis.confidence
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced OpenAI fallback with better context
    console.log('🤖 Using enhanced OpenAI generation with customer message context');
    
    const prompt = `You are Finn, a professional and helpful automotive sales consultant at ${dealershipName}. 

Customer: ${leadName || 'Customer'}
Vehicle Interest: ${vehicleInterest || 'Not specified'}
Customer's Latest Message: "${customerMessage}"

Context from conversation:
${conversationHistory || 'This is the beginning of the conversation.'}

IMPORTANT INSTRUCTIONS:
- Respond directly to what the customer just said: "${customerMessage}"
- Be professional, helpful, and build rapport
- Don't be overly enthusiastic or pushy
- Focus on understanding their needs and being genuinely helpful
- If they ask about pricing, acknowledge that and offer to help with pricing information
- If they want to schedule something, respond appropriately to their scheduling request
- Match their communication style (formal vs. casual)
- Don't assume they're excited or ready to buy unless they indicate that

Generate a natural, conversational response that directly addresses their message.`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are Finn, a professional automotive sales consultant who focuses on building rapport and being genuinely helpful rather than pushy. Always respond directly to what the customer is saying.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const aiData = await openAIResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || 'I\'d be happy to help! What questions do you have?';

    console.log('✅ Generated contextual OpenAI response:', aiMessage.substring(0, 100) + '...');

    return new Response(JSON.stringify({
      message: aiMessage,
      confidence: 0.8,
      reasoning: `Professional OpenAI response directly addressing: "${customerMessage.substring(0, 50)}..."`,
      intentAnalysis: {
        strategy: intentAnalysis.responseStrategy,
        primaryIntent: intentAnalysis.primaryIntent,
        urgencyLevel: intentAnalysis.customerContext.urgencyLevel
      },
      customerIntent: {
        type: 'contextual_response',
        confidence: 0.8
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in intelligent conversation AI:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to generate AI response',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
