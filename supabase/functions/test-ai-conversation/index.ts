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
    console.log('🔧 [TEST-AI-CONVERSATION] Starting direct test of intelligent-conversation-ai function...');

    // Check if OpenAI API key is configured
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('🔧 [TEST-AI-CONVERSATION] OpenAI API Key configured:', !!openaiKey);
    
    if (!openaiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'OPENAI_API_KEY not configured',
        details: 'The OpenAI API key is missing from Supabase secrets'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Test payload for AI conversation
    const testPayload = {
      leadId: "test-lead-id",
      leadInfo: {
        firstName: "Test",
        lastName: "User",
        vehicleInterest: "2024 Honda Civic"
      },
      conversationHistory: [],
      lastMessage: "Hello, I'm interested in learning more about your inventory",
      vehicleInterest: "2024 Honda Civic"
    };

    console.log('🔧 [TEST-AI-CONVERSATION] Calling intelligent-conversation-ai with test payload:', testPayload);

    const result = await supabase.functions.invoke('intelligent-conversation-ai', {
      body: testPayload
    });

    console.log('🔧 [TEST-AI-CONVERSATION] Function response:', {
      error: result.error,
      data: result.data,
      status: result.status
    });

    if (result.error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'AI function call failed',
        details: result.error,
        testPayload
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'AI conversation test completed successfully',
      result: result.data,
      testPayload
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [TEST-AI-CONVERSATION] Critical error:', error);
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