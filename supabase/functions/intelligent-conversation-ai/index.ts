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
      salespersonName = 'Your sales representative',
      dealershipName = 'our dealership',
      context = {}
    } = await req.json();

    console.log(`🤖 Processing ${isInitialContact ? 'WARM INTRODUCTION' : 'ENHANCED'} intelligent AI request for: ${leadName}`);
    console.log(`🚗 Vehicle interest: ${vehicleInterest}`);
    console.log(`💬 Initial contact: ${isInitialContact}`);

    // Handle warm introduction for first contact
    if (isInitialContact) {
      console.log('🎯 Generating WARM INTRODUCTION message');
      
      const systemPrompt = buildWarmIntroductionPrompt(
        leadName,
        vehicleInterest,
        salespersonName,
        dealershipName
      );

      const userPrompt = buildWarmIntroductionUserPrompt(
        leadName,
        vehicleInterest,
        salespersonName
      );

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
          temperature: 0.8, // Higher temperature for more natural introductions
          max_tokens: 120, // Shorter for introductions
        }),
      });

      const aiResponse = await response.json();
      const generatedMessage = aiResponse.choices[0].message.content;

      console.log(`✅ Generated WARM INTRODUCTION: ${generatedMessage}`);

      return new Response(JSON.stringify({ 
        message: generatedMessage,
        confidence: 0.95,
        reasoning: `Warm introduction message for first contact with personalized greeting and ice-breaking approach`,
        messageType: 'warm_introduction'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ENHANCED validation pipeline with lead-specific context and question analysis
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

    // Build enhanced prompts with QUESTION-FIRST priority and STRICT inventory awareness
    const { 
      systemPrompt, 
      customerIntent, 
      answerGuidance, 
      appointmentIntent, 
      appointmentFollowUp, 
      tradeIntent, 
      tradeFollowUp, 
      requestedCategory 
    } = buildEnhancedSystemPrompt(
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
      customerIntent,
      answerGuidance,
      appointmentIntent,
      tradeIntent
    );

    console.log('🎯 Customer question detected:', customerIntent?.requiresDirectAnswer ? 'YES' : 'NO');
    console.log('❓ Question type:', customerIntent?.primaryQuestionType || 'none');
    console.log('🎯 Appointment intent detected:', appointmentIntent?.hasAppointmentIntent ? 'YES' : 'NO');
    console.log('🚗 Trade intent detected:', tradeIntent?.hasTradeIntent ? 'YES' : 'NO');
    console.log('⚠️ Inventory safety mode:', !inventoryValidation.hasRealInventory ? 'ACTIVE' : 'NORMAL');
    console.log('🔧 Conversation repair needed:', customerIntent?.conversationContext?.hasBeenIgnored ? 'YES' : 'NO');

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

    console.log(`✅ Generated QUESTION-FIRST response with STRICT inventory validation: ${generatedMessage}`);

    return new Response(JSON.stringify({ 
      message: generatedMessage,
      confidence: 0.95,
      reasoning: `QUESTION-FIRST response with enhanced intent analysis (${customerIntent?.requiresDirectAnswer ? 'Direct question detected' : 'No direct question'}), STRICT inventory validation (${inventoryValidation.validatedCount} verified vehicles), appointment detection (${appointmentIntent?.hasAppointmentIntent ? 'Intent detected' : 'No intent'}), trade detection (${tradeIntent?.hasTradeIntent ? 'Intent detected' : 'No intent'}), business hours (${businessHours.isOpen ? 'open' : 'closed'}), and conversation memory (${conversationMemory.conversationLength} messages) for ${requestedCategory.category} vehicle inquiry`,
      customerIntent: customerIntent || null,
      answerGuidance: answerGuidance || null,
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
    console.error('❌ Error in intelligent conversation AI:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
