import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const { systemCheck } = await req.json();

    console.log('🔍 AI System Test Started');
    const results = {
      databaseConnection: false,
      openAIConnection: false,
      aiGeneration: false,
      leadProcessing: false,
      emergencyControls: false,
      automationStatus: false
    };

    // Test 1: Database Connection
    try {
      const { data, error } = await supabase.from('leads').select('count').limit(1);
      results.databaseConnection = !error;
      console.log('✅ Database connection:', results.databaseConnection);
    } catch (error) {
      console.error('❌ Database test failed:', error);
    }

    // Test 2: OpenAI Connection
    if (openAIApiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'System test - respond with OK' }],
            max_tokens: 10
          }),
        });

        if (response.ok) {
          results.openAIConnection = true;
          results.aiGeneration = true;
          console.log('✅ OpenAI connection and generation test passed');
        }
      } catch (error) {
        console.error('❌ OpenAI test failed:', error);
      }
    }

    // Test 3: Lead Processing
    try {
      const { data, error } = await supabase.from('ai_lead_scores').select('*').limit(1);
      results.leadProcessing = !error;
      console.log('✅ Lead processing test:', results.leadProcessing);
    } catch (error) {
      console.error('❌ Lead processing test failed:', error);
    }

    // Test 4: Emergency Controls
    try {
      const { data, error } = await supabase.from('ai_emergency_settings').select('*').limit(1);
      results.emergencyControls = !error;
      console.log('✅ Emergency controls test:', results.emergencyControls);
    } catch (error) {
      console.error('❌ Emergency controls test failed:', error);
    }

    // Test 5: Automation Status
    try {
      const { data, error } = await supabase.from('ai_automation_control').select('*').limit(1);
      results.automationStatus = !error;
      console.log('✅ Automation status test:', results.automationStatus);
    } catch (error) {
      console.error('❌ Automation status test failed:', error);
    }

    const allPassed = Object.values(results).every(test => test === true);
    
    console.log('🎯 AI System Test Results:', results);
    console.log('🚀 Overall Status:', allPassed ? 'PASS' : 'FAIL');

    return new Response(
      JSON.stringify({
        success: allPassed,
        results,
        message: allPassed ? 'All AI systems operational' : 'Some AI systems failed tests',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 ERROR in trigger-ai-test function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});