
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
      leadId,
      leadName, 
      vehicleInterest, 
      lastCustomerMessage, 
      conversationHistory, 
      leadInfo,
      conversationLength,
      inventoryStatus,
      context = {}
    } = await req.json();

    console.log(`🤖 Processing ENHANCED intelligent AI request with STRICT inventory validation for: ${leadName}`);
    console.log(`🚗 Vehicle interest: ${vehicleInterest}`);
    console.log(`💬 Last message: ${lastCustomerMessage}`);
    console.log(`📦 Strict mode:`, context.strictInventoryMode || false);

    // ENHANCED validation pipeline with lead-specific context
    const [inventoryValidation, businessHours, conversationMemory] = await Promise.all([
      validateInventoryAccuracy(vehicleInterest || '', leadId),
      getBusinessHoursStatus(),
      Promise.resolve(analyzeConversationMemory(conversationHistory || ''))
    ]);

    console.log('📊 STRICT Inventory validation:', {
      hasInventory: inventoryValidation.hasRealInventory,
      validatedCount: inventoryValidation.validatedCount,
      totalChecked: inventoryValidation.totalChecked,
      strictMode: inventoryValidation.strictMode,
      warning: inventoryValidation.warning || 'none'
    });
    
    console.log('🕒 Business hours:', businessHours.isOpen ? 'OPEN' : 'CLOSED');
    console.log('🧠 Conversation memory:', conversationMemory.conversationLength, 'messages');

    // Generate context-aware guidance with STRICT inventory rules
    const conversationGuidance = generateConversationGuidance(conversationMemory, inventoryValidation, businessHours);

    // Enhanced inventory status with STRICT validation results
    const enhancedInventoryStatus = {
      ...inventoryStatus,
      hasActualInventory: inventoryValidation.hasRealInventory,
      actualVehicles: inventoryValidation.actualVehicles,
      validatedCount: inventoryValidation.validatedCount,
      inventoryWarning: inventoryValidation.warning,
      realInventoryCount: inventoryValidation.actualVehicles.length,
      strictMode: true, // Always use strict mode
      mustNotClaim: !inventoryValidation.hasRealInventory // Flag to prevent claims
    };

    // Build enhanced prompts with STRICT inventory awareness
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
    console.log('🚗 Trade intent detected:', tradeIntent?.hasTradeIntent ? 'YES' : 'NO');
    console.log('⚠️ Inventory safety mode:', !inventoryValidation.hasRealInventory ? 'ACTIVE' : 'NORMAL');

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

    console.log(`✅ Generated ENHANCED response with STRICT inventory validation: ${generatedMessage}`);

    return new Response(JSON.stringify({ 
      message: generatedMessage,
      confidence: 0.95,
      reasoning: `ENHANCED context-aware response with STRICT inventory validation (${inventoryValidation.validatedCount} verified vehicles), appointment detection (${appointmentIntent?.hasAppointmentIntent ? 'Intent detected' : 'No intent'}), trade detection (${tradeIntent?.hasTradeIntent ? 'Intent detected' : 'No intent'}), business hours (${businessHours.isOpen ? 'open' : 'closed'}), and conversation memory (${conversationMemory.conversationLength} messages) for ${requestedCategory.category} vehicle inquiry`,
      appointmentIntent: appointmentIntent || null,
      tradeIntent: tradeIntent || null,
      inventoryValidation: {
        hasRealInventory: inventoryValidation.hasRealInventory,
        validatedCount: inventoryValidation.validatedCount,
        strictMode: true
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in ENHANCED intelligent conversation AI with STRICT inventory validation:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
