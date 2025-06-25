
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
      isInitialContact,
      salespersonName = 'Finn',
      dealershipName = 'Jason Pilger Chevrolet'
    } = await req.json();

    console.log('🤖 Enhanced AI processing for lead:', leadId, leadName);

    // Get the latest customer message from conversation history
    const messages = conversationHistory.split('\n').filter((line: string) => line.trim());
    const lastCustomerMessage = messages
      .filter((line: string) => line.toLowerCase().includes('customer:'))
      .pop()?.replace(/^customer:\s*/i, '') || '';

    console.log('📝 Latest customer message:', lastCustomerMessage);

    // Enhanced intent analysis with objection detection
    const intentAnalysis = analyzeEnhancedCustomerIntent(
      lastCustomerMessage,
      conversationHistory,
      vehicleInterest,
      leadName
    );

    console.log('🎯 Intent analysis result:', {
      primaryIntent: intentAnalysis.primaryIntent,
      confidence: intentAnalysis.confidence,
      strategy: intentAnalysis.responseStrategy,
      hasObjections: intentAnalysis.objectionSignals?.length || 0
    });

    // If competitor purchase is detected, return graceful exit response immediately
    if (intentAnalysis.primaryIntent === 'competitor_purchase') {
      console.log('🏆 Competitor purchase detected - generating congratulatory response');
      
      const response = intentAnalysis.suggestedResponse || 
        `Congratulations on your new vehicle, ${leadName}! I'm sure you'll love it. Thank you for considering us during your search. If you ever need service, parts, or have friends or family looking for their next vehicle, please don't hesitate to reach out. We'd love to help in the future!`;

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
        lastCustomerMessage,
        vehicleInterest,
        leadName
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

    // Fall back to regular AI response generation if no specific objections detected
    if (intentAnalysis.suggestedResponse) {
      console.log('💡 Using enhanced contextual response');
      
      return new Response(JSON.stringify({
        message: intentAnalysis.suggestedResponse,
        confidence: intentAnalysis.confidence,
        reasoning: `Enhanced contextual response for ${intentAnalysis.primaryIntent}`,
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

    // Fallback to OpenAI if no enhanced response available
    console.log('🤖 Falling back to OpenAI generation');
    
    const prompt = `You are Finn, a helpful car salesperson at ${dealershipName}. 
    
Customer: ${leadName}
Vehicle Interest: ${vehicleInterest}
Latest Message: "${lastCustomerMessage}"

Conversation Context:
${conversationHistory}

Generate a helpful, conversational response. Keep it natural and engaging. Focus on understanding their needs and building rapport.`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are Finn, a friendly and knowledgeable car salesperson at Jason Pilger Chevrolet.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const aiData = await openAIResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || 'I\'d be happy to help! What questions do you have?';

    return new Response(JSON.stringify({
      message: aiMessage,
      confidence: 0.7,
      reasoning: 'OpenAI fallback response',
      intentAnalysis: {
        strategy: intentAnalysis.responseStrategy,
        primaryIntent: intentAnalysis.primaryIntent,
        urgencyLevel: intentAnalysis.customerContext.urgencyLevel
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
