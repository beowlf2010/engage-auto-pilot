
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🤖 [ENHANCED AI] === AI CONVERSATION REQUEST ===');
    
    const { leadId, leadName, messageBody, conversationHistory } = await req.json()
    
    console.log('🤖 [ENHANCED AI] Processing message for', leadName + ':', `"${messageBody}"`);
    
    // Enhanced empty message detection
    const isEmpty = !messageBody || 
                   messageBody.trim() === '' || 
                   messageBody.trim() === 'null' || 
                   messageBody.trim() === 'undefined' ||
                   messageBody.length === 0;
    
    if (isEmpty) {
      console.log('⚠️ [ENHANCED AI] Empty message detected - checking lead status');
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      // Check if this lead has a valid phone number
      const { data: phoneData } = await supabase
        .from('phone_numbers')
        .select('number')
        .eq('lead_id', leadId)
        .eq('is_primary', true)
        .single();
      
      if (!phoneData || phoneData.number === '+15551234567') {
        console.log('❌ [ENHANCED AI] No valid phone number - skipping AI response');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No valid phone number for lead - AI response skipped',
            skipMessage: true
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Check recent conversation history to avoid loops
      const { data: recentMessages } = await supabase
        .from('conversations')
        .select('body, direction, created_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(3);
      
      const hasRecentGenericResponse = recentMessages?.some(msg => 
        msg.direction === 'out' && 
        msg.body.includes("message didn't come through") &&
        new Date().getTime() - new Date(msg.created_at).getTime() < 24 * 60 * 60 * 1000 // 24 hours
      );
      
      if (hasRecentGenericResponse) {
        console.log('🔄 [ENHANCED AI] Recent generic response detected - preventing loop');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Recent generic response exists - preventing loop',
            skipMessage: true
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Enhanced intent detection for better responses
    const intent = analyzeMessageIntent(messageBody, conversationHistory || []);
    console.log('🎯 [ENHANCED AI] Detected intent:', JSON.stringify(intent, null, 2));

    // Generate contextual response based on intent
    const response = await generateEnhancedResponse(leadName, messageBody, intent, conversationHistory);
    
    console.log('✅ [ENHANCED AI] Generated response:', response);

    return new Response(
      JSON.stringify({ success: true, response }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ [ENHANCED AI] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function analyzeMessageIntent(message: string, history: any[]) {
  const isDirectQuestion = /\?/.test(message) || 
    /\b(what|how|when|where|why|can you|could you|would you|do you|are you|is there)\b/i.test(message);
  
  const questionTypes = [];
  let questionTopic = null;
  
  if (/\b(price|cost|payment|finance|lease|monthly)\b/i.test(message)) {
    questionTypes.push('pricing');
    questionTopic = 'pricing';
  }
  
  if (/\b(available|inventory|stock|see|show|find|have)\b/i.test(message)) {
    questionTypes.push('inventory');
    questionTopic = 'availability';
  }
  
  if (/\b(visit|come|address|location|hours|directions)\b/i.test(message)) {
    questionTypes.push('location');
    questionTopic = 'dealership_info';
  }
  
  const showingFrustration = /\b(frustrated|annoyed|tired|enough|stop)\b/i.test(message);
  const requiresDirectAnswer = isDirectQuestion && questionTypes.length > 0;
  
  const primaryQuestionType = questionTypes[0] || 'general_inquiry';
  
  // Analyze conversation context
  const lastSalesMessage = history.filter(h => h.direction === 'out').slice(-1)[0]?.body || '';
  const customerMessageCount = history.filter(h => h.direction === 'in').length;
  const salesMessageCount = history.filter(h => h.direction === 'out').length;
  
  const conversationContext = {
    lastSalesMessage,
    customerMessageCount,
    salesMessageCount,
    hasBeenIgnored: customerMessageCount === 0 && salesMessageCount > 0,
    needsApology: showingFrustration,
    needsImmediateResponse: requiresDirectAnswer
  };
  
  return {
    isDirectQuestion,
    questionTypes,
    questionTopic,
    showingFrustration,
    requiresDirectAnswer,
    primaryQuestionType,
    towingAnalysis: {
      hasTowingRequest: false,
      equipmentMentioned: undefined,
      vehicleMentioned: undefined,
      isQuestionAboutTowing: false
    },
    hasObjections: false,
    detectedObjections: [],
    hasPricingConcerns: /\b(expensive|costly|budget|afford)\b/i.test(message),
    requiresUrgentResponse: showingFrustration || requiresDirectAnswer,
    vehicleNicknames: [],
    conversationContext
  };
}

async function generateEnhancedResponse(leadName: string, message: string, intent: any, history: any[]) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Enhanced prompt for better responses
  const prompt = `You are Finn, a friendly AI assistant for Jason Pilger Chevrolet in Atmore, AL. 

DEALERSHIP INFO:
- Location: 406 E Nashville Ave, Atmore, AL 36502
- Phone: (251) 368-4053
- Website: www.jasonpilgerchevrolet.com

CUSTOMER: ${leadName}
THEIR MESSAGE: "${message}"

CONVERSATION CONTEXT:
- Customer has sent ${intent.conversationContext.customerMessageCount} messages
- We've sent ${intent.conversationContext.salesMessageCount} messages
- Last sales message: "${intent.conversationContext.lastSalesMessage}"

INTENT ANALYSIS:
- Direct question: ${intent.isDirectQuestion}
- Question topic: ${intent.questionTopic || 'none'}
- Showing frustration: ${intent.showingFrustration}
- Needs immediate response: ${intent.requiresDirectAnswer}

RESPONSE GUIDELINES:
${message.trim() === '' ? 
  `- This appears to be an empty message or technical issue
  - Acknowledge this politely and offer help
  - Include dealership contact info
  - Ask what they're looking for specifically` :
  `- Address their specific question/concern directly
  - Be conversational and helpful
  - Include relevant dealership info when appropriate
  - Keep response under 160 characters if possible`
}

Generate a helpful, professional response:`;

  console.log('📝 [ENHANCED AI] Generated prompt length:', prompt.length);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful automotive sales assistant. Keep responses concise and professional.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim() || 'I apologize, but I encountered an issue generating a response. Please call us at (251) 368-4053 and we\'ll be happy to help!';
}
