import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildEnhancedSystemPrompt, buildEnhancedUserPrompt } from './enhancedPromptBuilder.ts';
import { buildWarmIntroductionPrompt, buildWarmIntroductionUserPrompt } from './warmIntroductionPrompts.ts';
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
      isInitialContact = false,
      salespersonName = 'Finn', // Always default to Finn
      dealershipName = 'Jason Pilger Chevrolet', // Always default to Jason Pilger Chevrolet
      context = {},
      // Legacy support for old API calls
      stage,
      messageType
    } = await req.json();

    console.log(`🤖 UNIFIED AI: Processing request for ${leadName} - ${isInitialContact ? 'INITIAL CONTACT' : 'FOLLOW-UP'}`);
    console.log(`🏢 UNIFIED AI: Using dealership: ${dealershipName}`);
    console.log(`👤 UNIFIED AI: Using salesperson: ${salespersonName}`);
    console.log(`🚗 Vehicle interest: ${vehicleInterest}`);
    console.log(`💬 Message type: ${messageType || (isInitialContact ? 'warm_introduction' : 'follow_up')}`);

    // Auto-detect if this should be initial contact based on conversation length
    const actualIsInitialContact = isInitialContact || conversationLength === 0 || !conversationHistory || conversationHistory.trim() === '';
    
    if (actualIsInitialContact) {
      console.log(`🎯 UNIFIED AI: Generating WARM INTRODUCTION from ${salespersonName} at ${dealershipName}`);
      
      const systemPrompt = buildWarmIntroductionPrompt(
        leadName,
        vehicleInterest,
        salespersonName,
        dealershipName
      );

      const userPrompt = buildWarmIntroductionUserPrompt(
        leadName,
        vehicleInterest,
        salespersonName,
        dealershipName
      );

      console.log(`📝 UNIFIED AI: System prompt includes dealership: ${systemPrompt.includes(dealershipName)}`);
      console.log(`📝 UNIFIED AI: User prompt includes dealership: ${userPrompt.includes(dealershipName)}`);

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
          temperature: 0.8,
          max_tokens: 120,
        }),
      });

      const aiResponse = await response.json();
      const generatedMessage = aiResponse.choices[0].message.content;

      console.log(`✅ UNIFIED AI: Generated warm introduction: ${generatedMessage}`);

      return new Response(JSON.stringify({ 
        message: generatedMessage,
        confidence: 0.95,
        reasoning: `Unified AI warm introduction from ${salespersonName} at ${dealershipName} for first contact`,
        messageType: 'warm_introduction',
        isInitialContact: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle follow-up messages with enhanced AI
    console.log('🎯 UNIFIED AI: Generating ENHANCED FOLLOW-UP message');

    // Enhanced validation pipeline
    const [inventoryValidation, businessHours, conversationMemory] = await Promise.all([
      validateInventoryAccuracy(vehicleInterest || '', leadId),
      getBusinessHoursStatus(),
      Promise.resolve(analyzeConversationMemory(conversationHistory || ''))
    ]);

    console.log('📊 UNIFIED AI: Inventory validation:', {
      hasInventory: inventoryValidation.hasRealInventory,
      validatedCount: inventoryValidation.validatedCount
    });

    // Generate context-aware guidance
    const conversationGuidance = generateConversationGuidance(conversationMemory, inventoryValidation, businessHours);

    // Enhanced inventory status
    const enhancedInventoryStatus = {
      ...inventoryStatus,
      hasActualInventory: inventoryValidation.hasRealInventory,
      actualVehicles: inventoryValidation.actualVehicles,
      validatedCount: inventoryValidation.validatedCount,
      inventoryWarning: inventoryValidation.warning,
      realInventoryCount: inventoryValidation.actualVehicles.length,
      strictMode: true,
      mustNotClaim: !inventoryValidation.hasRealInventory
    };

    // Build enhanced prompts with refined conversation repair logic
    const { 
      systemPrompt, 
      customerIntent, 
      answerGuidance, 
      needsRepair,
      appointmentIntent, 
      appointmentFollowUp, 
      tradeIntent, 
      tradeFollowUp, 
      requestedCategory 
    } = buildEnhancedSystemPrompt(
      leadName,
      vehicleInterest,
      conversationLength || 0,
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
      { isEstablishedConversation: (conversationLength || 0) > 2 },
      conversationMemory,
      conversationGuidance,
      customerIntent,
      answerGuidance,
      appointmentIntent,
      tradeIntent
    );

    console.log('🎯 UNIFIED AI: Customer question detected:', customerIntent?.requiresDirectAnswer ? 'YES' : 'NO');
    console.log('🎯 UNIFIED AI: Needs conversation repair:', needsRepair ? 'YES' : 'NO');
    console.log('🎯 UNIFIED AI: Appointment intent:', appointmentIntent?.hasAppointmentIntent ? 'YES' : 'NO');

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

    console.log(`✅ UNIFIED AI: Generated follow-up response: ${generatedMessage}`);

    return new Response(JSON.stringify({ 
      message: generatedMessage,
      confidence: 0.95,
      reasoning: `Unified AI enhanced follow-up with refined conversation repair detection`,
      customerIntent: customerIntent || null,
      answerGuidance: answerGuidance || null,
      needsRepair: needsRepair,
      appointmentIntent: appointmentIntent || null,
      tradeIntent: tradeIntent || null,
      messageType: 'follow_up',
      isInitialContact: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ UNIFIED AI Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
