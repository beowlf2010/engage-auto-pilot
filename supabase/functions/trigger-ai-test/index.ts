import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔧 [TRIGGER-AI-TEST] Starting comprehensive AI system test...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Step 1: Test the AI conversation function directly
    console.log('🧪 [STEP 1] Testing intelligent-conversation-ai function...');
    
    const testPayload = {
      leadId: "test-lead-id",
      leadName: "John Smith",
      messageBody: "I'm interested in your Honda Civic inventory",
      latestCustomerMessage: "I'm interested in your Honda Civic inventory", 
      conversationHistory: "",
      vehicleInterest: "2024 Honda Civic",
      leadSource: "test"
    };

    const { data: aiResult, error: aiError } = await supabase.functions.invoke('intelligent-conversation-ai', {
      body: testPayload
    });

    console.log('🧪 [STEP 1] AI Function Result:', {
      success: aiResult?.success,
      hasMessage: !!aiResult?.message,
      messagePreview: aiResult?.message?.substring(0, 100),
      error: aiError?.message
    });

    // Step 2: Test with a real lead that has upcoming AI send time
    console.log('🧪 [STEP 2] Testing with real lead data...');
    
    const { data: testLead } = await supabase
      .from('leads')
      .select('id, first_name, last_name, vehicle_interest, phone_numbers(number, is_primary)')
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null)
      .order('next_ai_send_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    let realTestResult = null;
    if (testLead) {
      console.log('🧪 [STEP 2] Found test lead:', testLead.id, testLead.first_name);
      
      const realPayload = {
        leadId: testLead.id,
        leadName: `${testLead.first_name || ''} ${testLead.last_name || ''}`.trim(),
        messageBody: 'Follow-up message test',
        latestCustomerMessage: 'Follow-up message test',
        conversationHistory: "",
        vehicleInterest: testLead.vehicle_interest || 'vehicle inquiry',
        leadSource: 'ai_test'
      };

      const { data: realAiResult, error: realAiError } = await supabase.functions.invoke('intelligent-conversation-ai', {
        body: realPayload
      });

      realTestResult = {
        leadId: testLead.id,
        success: realAiResult?.success,
        hasMessage: !!realAiResult?.message,
        messagePreview: realAiResult?.message?.substring(0, 100),
        error: realAiError?.message
      };

      console.log('🧪 [STEP 2] Real Lead AI Result:', realTestResult);
    } else {
      console.log('🧪 [STEP 2] No eligible test leads found');
    }

    // Step 3: Trigger a manual automation run to test the full flow
    console.log('🧪 [STEP 3] Triggering manual automation run...');
    
    const { data: automationResult, error: automationError } = await supabase.functions.invoke('ai-automation', {
      body: {
        automated: false,
        source: 'ai_test_trigger',
        priority: 'high',
        testMode: true
      }
    });

    console.log('🧪 [STEP 3] Automation Result:', {
      success: automationResult?.success,
      processed: automationResult?.processed,
      error: automationError?.message
    });

    const results = {
      aiDirectTest: {
        success: aiResult?.success === true,
        hasMessage: !!aiResult?.message,
        messagePreview: aiResult?.message?.substring(0, 100),
        error: aiError?.message
      },
      realLeadTest: realTestResult,
      automationTest: {
        success: automationResult?.success === true,
        processed: automationResult?.processed,
        error: automationError?.message
      },
      summary: {
        openaiConfigured: !!Deno.env.get('OPENAI_API_KEY'),
        aiGenerationWorking: aiResult?.success === true && !!aiResult?.message,
        automationWorking: automationResult?.success === true
      }
    };

    console.log('🔧 [TRIGGER-AI-TEST] Final Results:', results);

    return new Response(JSON.stringify({
      success: true,
      message: 'AI system test completed',
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [TRIGGER-AI-TEST] Test failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})