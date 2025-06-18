
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildEnhancedSystemPrompt, buildEnhancedUserPrompt } from './enhancedPromptBuilder.ts';
import { validateInventoryAccuracy, getBusinessHoursStatus } from './inventoryValidation.ts';
import { analyzeConversationMemory, generateConversationGuidance } from './conversationMemory.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { 
      leadName, 
      vehicleInterest, 
      lastCustomerMessage, 
      conversationHistory, 
      leadInfo,
      conversationLength,
      inventoryStatus 
    } = await req.json();

    console.log(`🤖 Processing enhanced intelligent AI request with appointment and trade detection for: ${leadName}`);
    console.log(`🚗 Vehicle interest: ${vehicleInterest}`);
    console.log(`💬 Last message: ${lastCustomerMessage}`);

    // Enhanced validation pipeline
    const [inventoryValidation, businessHours, conversationMemory] = await Promise.all([
      validateInventoryAccuracy(vehicleInterest || ''),
      getBusinessHoursStatus(),
      Promise.resolve(analyzeConversationMemory(conversationHistory || ''))
    ]);

    console.log('📊 Inventory validation:', inventoryValidation.hasRealInventory ? 'PASS' : 'FAIL', inventoryValidation.warning || '');
    console.log('🕒 Business hours:', businessHours.isOpen ? 'OPEN' : 'CLOSED');
    console.log('🧠 Conversation memory:', conversationMemory.conversationLength, 'messages');

    // Generate context-aware guidance
    const conversationGuidance = generateConversationGuidance(conversationMemory, inventoryValidation, businessHours);

    // Enhanced inventory status with real validation
    const enhancedInventoryStatus = {
      ...inventoryStatus,
      hasActualInventory: inventoryValidation.hasRealInventory,
      actualVehicles: inventoryValidation.actualVehicles,
      inventoryWarning: inventoryValidation.warning,
      realInventoryCount: inventoryValidation.actualVehicles.length
    };

    // Build enhanced prompts with appointment and trade detection
    const { systemPrompt, appointmentIntent, appointmentFollowUp, tradeIntent, tradeFollowUp, requestedCategory } = buildEnhancedSystemPrompt(
      leadName,
      vehicleInterest,
      conversationLength,
      conversationHistory,
      enhancedInventoryStatus,
      businessHours,
      conversationGuidance,
      lastCustomerMessage
    );

    const userPrompt = buildEnhancedUserPrompt(
      lastCustomerMessage,
      conversationHistory,
      requestedCategory,
      { isEstablishedConversation: conversationLength > 2 },
      conversationMemory,
      conversationGuidance,
      appointmentIntent,
      tradeIntent
    );

    console.log('🎯 Appointment intent detected:', appointmentIntent?.hasAppointmentIntent ? 'YES' : 'NO');
    if (appointmentIntent?.hasAppointmentIntent) {
      console.log(`📅 Confidence: ${(appointmentIntent.confidence * 100).toFixed(0)}%, Type: ${appointmentIntent.suggestedAppointmentType}, Urgency: ${appointmentIntent.urgency}`);
    }

    console.log('🚗 Trade intent detected:', tradeIntent?.hasTradeIntent ? 'YES' : 'NO');
    if (tradeIntent?.hasTradeIntent) {
      console.log(`💰 Confidence: ${(tradeIntent.confidence * 100).toFixed(0)}%, Type: ${tradeIntent.tradeType}, Urgency: ${tradeIntent.urgency}`);
    }

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
        max_tokens: 150,
      }),
    });

    const aiResponse = await response.json();
    const generatedMessage = aiResponse.choices[0].message.content;

    console.log(`✅ Generated enhanced response with appointment and trade awareness: ${generatedMessage}`);

    return new Response(JSON.stringify({ 
      message: generatedMessage,
      confidence: 0.95,
      reasoning: `Enhanced context-aware response with appointment detection (${appointmentIntent?.hasAppointmentIntent ? 'Intent detected' : 'No intent'}), trade detection (${tradeIntent?.hasTradeIntent ? 'Intent detected' : 'No intent'}), inventory validation (${inventoryValidation.actualVehicles.length} actual vehicles), business hours (${businessHours.isOpen ? 'open' : 'closed'}), and conversation memory (${conversationMemory.conversationLength} messages) for ${requestedCategory.category} vehicle inquiry`,
      appointmentIntent: appointmentIntent || null,
      tradeIntent: tradeIntent || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in enhanced intelligent conversation AI with appointment and trade detection:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
