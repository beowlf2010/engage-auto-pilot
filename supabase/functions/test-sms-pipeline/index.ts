import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 [SMS-PIPELINE-TEST] Starting comprehensive SMS pipeline test...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Check Twilio credentials in database
    console.log('📋 [TEST 1] Checking Twilio credentials in database...');
    const { data: settings, error: settingsError } = await supabaseClient
      .from('settings')
      .select('key, value')
      .in('key', ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER']);

    const credentialsTest = {
      name: 'Twilio Credentials Check',
      passed: false,
      details: {}
    };

    if (settingsError) {
      credentialsTest.details = { error: settingsError.message };
    } else {
      const creds = {};
      settings?.forEach(s => {
        creds[s.key] = s.value ? 'configured' : 'missing';
      });
      credentialsTest.details = creds;
      credentialsTest.passed = settings?.length === 3 && settings.every(s => s.value);
    }
    testResults.tests.push(credentialsTest);

    // Test 2: Check lead data availability
    console.log('📋 [TEST 2] Checking lead data for automation...');
    const { data: testLead, error: leadError } = await supabaseClient
      .from('leads')
      .select(`
        id,
        first_name,
        ai_opt_in,
        ai_sequence_paused,
        phone_numbers (
          number,
          is_primary
        )
      `)
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .limit(1)
      .single();

    const leadTest = {
      name: 'Lead Data Availability',
      passed: false,
      details: {}
    };

    if (leadError) {
      leadTest.details = { error: leadError.message };
    } else if (!testLead) {
      leadTest.details = { error: 'No AI-enabled leads found' };
    } else {
      const phoneNumbers = Array.isArray(testLead.phone_numbers) ? testLead.phone_numbers : [];
      const hasPhone = phoneNumbers.length > 0 && phoneNumbers[0]?.number;
      leadTest.passed = hasPhone;
      leadTest.details = {
        leadId: testLead.id,
        hasPhoneNumber: hasPhone,
        phoneNumber: hasPhone ? phoneNumbers[0].number : 'none'
      };
    }
    testResults.tests.push(leadTest);

    // Test 3: Enhanced SMS system check using test-sms function
    const smsSystemTest = {
      name: 'SMS System Check (Enhanced)',
      passed: false,
      details: {}
    };

    if (credentialsTest.passed) {
      console.log('📋 [TEST 3] Testing SMS system with enhanced validation...');
      try {
        const testPayload = {
          systemCheck: true,
          testMode: true
        };

        const { data: smsResult, error: smsError } = await supabaseClient.functions.invoke('test-sms', {
          body: testPayload
        });

        if (smsError) {
          smsSystemTest.details = { 
            error: smsError.message,
            type: 'function_invocation_error'
          };
        } else {
          // Handle both success and success-with-warning cases
          smsSystemTest.passed = smsResult?.success === true;
          smsSystemTest.details = {
            success: smsResult?.success,
            warning: smsResult?.warning || false,
            message: smsResult?.message,
            error: smsResult?.error,
            troubleshooting: smsResult?.troubleshooting,
            credentialsStatus: smsResult?.credentialsStatus,
            twilioAccountName: smsResult?.twilioAccountName,
            twilioPhoneNumber: smsResult?.twilioPhoneNumber,
            networkError: smsResult?.networkError
          };
        }
      } catch (testError) {
        smsSystemTest.details = {
          error: testError.message,
          type: 'test_exception'
        };
      }
    } else {
      smsSystemTest.details = { 
        skipped: true, 
        reason: 'Prerequisites failed - credentials missing from database' 
      };
    }
    testResults.tests.push(smsSystemTest);

    // Test 4: Attempt to call send-sms function (if we have test data and system check passed)
    const smsTest = {
      name: 'SMS Function Call Test',
      passed: false,
      details: {}
    };

    if (credentialsTest.passed && leadTest.passed && smsSystemTest.passed) {
      console.log('📋 [TEST 4] Testing SMS function with real data...');
      try {
        const smsPayload = {
          to: leadTest.details.phoneNumber,
          body: 'TEST MESSAGE: SMS pipeline verification - please ignore',
          conversationId: null
        };

        const { data: smsResult, error: smsError } = await supabaseClient.functions.invoke('send-sms', {
          body: smsPayload
        });

        if (smsError) {
          smsTest.details = { 
            error: smsError.message,
            type: 'function_invocation_error'
          };
        } else {
          smsTest.passed = smsResult?.success === true;
          smsTest.details = {
            success: smsResult?.success,
            error: smsResult?.error,
            messageSid: smsResult?.messageSid,
            credentialsSource: smsResult?.credentialsSource
          };
        }
      } catch (testError) {
        smsTest.details = {
          error: testError.message,
          type: 'test_exception'
        };
      }
    } else {
      smsTest.details = { 
        skipped: true, 
        reason: 'Prerequisites failed - credentials, lead data missing, or system check failed' 
      };
    }
    testResults.tests.push(smsTest);

    // Test 5: Check suppression list impact
    console.log('📋 [TEST 5] Checking suppression list...');
    const { data: suppressedCount } = await supabaseClient
      .from('compliance_suppression_list')
      .select('id', { count: 'exact' })
      .eq('type', 'sms');

    const suppressionTest = {
      name: 'Suppression List Check',
      passed: true,
      details: {
        suppressedNumbers: suppressedCount || 0,
        message: suppressedCount > 0 ? 'Some numbers are suppressed - this may reduce automation success rate' : 'No suppressed numbers'
      }
    };
    testResults.tests.push(suppressionTest);

    // Test 6: Check ai_emergency_settings
    console.log('📋 [TEST 6] Checking AI emergency settings...');
    const { data: emergencySettings } = await supabaseClient
      .from('ai_emergency_settings')
      .select('ai_disabled, disable_reason')
      .limit(1)
      .single();

    const emergencyTest = {
      name: 'AI Emergency Settings Check',
      passed: !emergencySettings?.ai_disabled,
      details: {
        aiDisabled: emergencySettings?.ai_disabled || false,
        disableReason: emergencySettings?.disable_reason || 'none'
      }
    };
    testResults.tests.push(emergencyTest);

    // Summary with enhanced analysis
    const allTestsPassed = testResults.tests.every(t => t.passed);
    const criticalTests = testResults.tests.filter(t => t.name.includes('Credentials') || t.name.includes('Emergency'));
    const criticalTestsPassed = criticalTests.every(t => t.passed);
    const hasWarnings = testResults.tests.some(t => t.details?.warning);
    
    const summary = {
      overall: allTestsPassed ? 'PASS' : (criticalTestsPassed ? 'PASS_WITH_WARNINGS' : 'FAIL'),
      totalTests: testResults.tests.length,
      passed: testResults.tests.filter(t => t.passed).length,
      failed: testResults.tests.filter(t => !t.passed).length,
      warnings: testResults.tests.filter(t => t.details?.warning).length,
      recommendation: allTestsPassed 
        ? 'SMS pipeline is healthy - AI automation should work correctly'
        : criticalTestsPassed 
          ? 'SMS pipeline has warnings but should work - monitor for issues'
          : 'Critical issues detected - AI automation will likely fail until these are resolved',
      healthStatus: allTestsPassed ? 'healthy' : (criticalTestsPassed ? 'degraded' : 'unhealthy')
    };

    console.log('🧪 [SMS-PIPELINE-TEST] Test completed:', summary);

    return new Response(JSON.stringify({
      success: true,
      summary,
      testResults,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [SMS-PIPELINE-TEST] Test failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});