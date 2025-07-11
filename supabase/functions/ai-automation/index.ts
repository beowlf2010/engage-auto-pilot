
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Vehicle Interest Validation - inline implementation
const INVALID_PATTERNS = [
  /^not specified$/i,
  /^unknown$/i,
  /^n\/a$/i,
  /^na$/i,
  /^null$/i,
  /^undefined$/i,
  /^none$/i,
  /^test$/i,
  /^sample$/i,
  /^demo$/i,
  /^vehicle$/i,
  /^car$/i,
  /^auto$/i,
  /^automobile$/i,
  /^\s*-+\s*$/,
  /^\s*\.+\s*$/,
];

const FALLBACK_MESSAGE = "I see you're still exploring options—happy to help you find the right fit!";

// STEP 5: Direct Twilio fallback function
const attemptDirectTwilioFallback = async (smsPayload: any, supabaseClient: any) => {
  try {
    console.log('🔄 [FALLBACK] Attempting direct Twilio API call as fallback...');
    
    // Get Twilio credentials from database using the same method as send-sms function
    const { data: settings, error } = await supabaseClient
      .from('settings')
      .select('key, value')
      .in('key', ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER']);

    if (error) {
      console.error('❌ [FALLBACK] Database error fetching Twilio settings:', error);
      return { success: false, error: 'Failed to fetch Twilio settings from database' };
    }

    const settingsMap: Record<string, string> = {};
    settings?.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });

    const accountSid = settingsMap['TWILIO_ACCOUNT_SID'];
    const authToken = settingsMap['TWILIO_AUTH_TOKEN'];
    const phoneNumber = settingsMap['TWILIO_PHONE_NUMBER'];

    if (!accountSid || !authToken || !phoneNumber) {
      console.error('❌ [FALLBACK] Missing Twilio credentials in database');
      return { success: false, error: 'Missing Twilio credentials in database' };
    }

    console.log('✅ [FALLBACK] Got Twilio credentials from database');

    // Make direct Twilio API call
    const payload = new URLSearchParams({
      To: smsPayload.to,
      From: phoneNumber,
      Body: smsPayload.body
    });

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload
    });

    const result = await response.json();
    console.log('📡 [FALLBACK] Twilio API response:', { status: response.status, result });

    if (!response.ok) {
      console.error('❌ [FALLBACK] Twilio API error:', result);
      return { 
        success: false, 
        error: result.message || 'Twilio API error',
        twilioError: result 
      };
    }

    console.log('✅ [FALLBACK] Direct Twilio call successful:', result.sid);
    return {
      success: true,
      messageSid: result.sid,
      status: result.status || 'queued',
      conversationId: smsPayload.conversationId,
      credentialsSource: 'database_fallback',
      message: 'SMS sent successfully using direct Twilio fallback!'
    };

  } catch (error) {
    console.error('❌ [FALLBACK] Critical error in direct Twilio fallback:', error);
    return { 
      success: false, 
      error: `Fallback error: ${error.message}`,
      details: error 
    };
  }
};

// STEP 4: Test function-to-function communication
const testSMSFunctionCommunication = async (supabaseClient: any) => {
  try {
    console.log('🧪 [TEST] Testing function-to-function SMS communication...');
    
    const testPayload = {
      to: '+12345678900',
      body: 'Test message from AI automation function',
      conversationId: null
    };

    const { data: response, error } = await supabaseClient.functions.invoke('send-sms', {
      body: testPayload
    });

    console.log('🧪 [TEST] Function-to-function test result:', {
      hasError: !!error,
      responseSuccess: response?.success,
      error: error?.message || response?.error,
      messageSid: response?.messageSid
    });

    return {
      success: !error && response?.success,
      error: error?.message || response?.error,
      response
    };
  } catch (testError) {
    console.error('❌ [TEST] Error testing function-to-function communication:', testError);
    return {
      success: false,
      error: testError.message,
      details: testError
    };
  }
};

const validateVehicleInterest = (vehicleInterest: string | null | undefined) => {
  if (!vehicleInterest || typeof vehicleInterest !== 'string') {
    return { isValid: false, message: FALLBACK_MESSAGE };
  }

  const trimmed = vehicleInterest.trim();
  if (trimmed.length === 0) {
    return { isValid: false, message: FALLBACK_MESSAGE };
  }

  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isValid: false, message: FALLBACK_MESSAGE };
    }
  }

  return { isValid: true, message: `your interest in ${trimmed}` };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse request body early to check for test endpoints
  let requestData;
  try {
    const bodyText = await req.text();
    requestData = bodyText ? JSON.parse(bodyText) : {};
  } catch (parseError) {
    console.warn('⚠️ [AI-AUTOMATION] Invalid JSON in request, using defaults:', parseError);
    requestData = {};
  }

  // STEP 4: Special route for testing function-to-function communication
  if (requestData.test_endpoint === 'test-sms-communication') {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const testResult = await testSMSFunctionCommunication(supabaseClient);
    
    return new Response(JSON.stringify({
      message: 'Function-to-function SMS communication test',
      result: testResult,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let runId: string | null = null;
  const startTime = Date.now();

  try {
    // requestData already parsed above for test endpoint check
    const {
      automated = true,
      source = 'scheduled',
      priority = 'normal',
      enhanced = false
    } = requestData;

    console.log(`🤖 [AI-AUTOMATION] Starting AI automation, source: ${source}, priority: ${priority}, enhanced: ${enhanced}`);

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ [AI-AUTOMATION] Missing required environment variables');
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    console.log(`🔐 [AI-AUTOMATION] Environment check passed`);

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    // Create automation run record
    const { data: runRecord, error: runError } = await supabaseClient
      .from('ai_automation_runs')
      .insert({
        source,
        status: 'running',
        metadata: { priority, enhanced, automated }
      })
      .select()
      .single();

    if (runError) {
      console.error('❌ [AI-AUTOMATION] Error creating run record:', runError);
    } else {
      runId = runRecord.id;
      console.log(`📝 [AI-AUTOMATION] Created run record: ${runId}`);
    }

    // Use default settings instead of accessing non-existent table
    // TROUBLESHOOTING: Reduced batch size to 1 for easier debugging
    const batchSize = source === 'manual_test' ? 1 : 50;
    const maxConcurrentSends = source === 'manual_test' ? 1 : 5;
    const dailyMessageLimit = 8;
    const autoUnpauseStaleLeads = true;
    const stalePauseThresholdDays = 7;

    console.log(`⚙️ [AI-AUTOMATION] Using default settings: batchSize=${batchSize}, maxConcurrentSends=${maxConcurrentSends}, dailyMessageLimit=${dailyMessageLimit}`);

    // Auto-unpause stale leads
    if (autoUnpauseStaleLeads) {
      console.log('▶️ [AI-AUTOMATION] Auto-unpausing stale leads');
      
      // Manual unpause logic since we don't have the RPC function
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - stalePauseThresholdDays);

      const { data: unpausedLeads, error: unpauseError } = await supabaseClient
        .from('leads')
        .update({
          ai_sequence_paused: false,
          ai_pause_reason: null,
          next_ai_send_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
        })
        .eq('ai_sequence_paused', true)
        .lt('updated_at', staleDate.toISOString())
        .select('id');

      if (unpauseError) {
        console.error('❌ [AI-AUTOMATION] Error unpausing stale leads:', unpauseError);
      } else {
        console.log(`✅ [AI-AUTOMATION] Unpaused ${unpausedLeads?.length || 0} stale leads`);
      }
    }

    // Test database connection first
    try {
      const { data: testData, error: testError } = await supabaseClient
        .from('leads')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('❌ [AI-AUTOMATION] Database connection test failed:', testError);
        throw new Error(`Database connection failed: ${testError.message}`);
      }
      console.log(`✅ [AI-AUTOMATION] Database connection verified`);
    } catch (dbError) {
      console.error('❌ [AI-AUTOMATION] Database connection error:', dbError);
      throw dbError;
    }

    // Get leads ready for AI processing
    const now = new Date();
    console.log(`🕒 [AI-AUTOMATION] Current time: ${now.toISOString()}`);
    
    const { data: leads, error: leadsError } = await supabaseClient
      .from('leads')
      .select('id, first_name, vehicle_interest, ai_messages_sent, created_at, next_ai_send_at')
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null)
      .lte('next_ai_send_at', now.toISOString())
      .limit(batchSize);

    if (leadsError) {
      console.error('❌ [AI-AUTOMATION] Error fetching leads:', leadsError);
      throw new Error(`Failed to fetch leads: ${leadsError.message}`);
    }

    // Log detailed lead queue status
    const { data: queueStats } = await supabaseClient
      .from('leads')
      .select('id')
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null);

    const totalQueued = queueStats?.length || 0;
    console.log(`📊 [AI-AUTOMATION] Queue status: ${leads?.length || 0} ready to process, ${totalQueued} total queued`);

    if (!leads || leads.length === 0) {
      console.log('😴 [AI-AUTOMATION] No leads to process');
      return new Response(JSON.stringify({ 
        message: 'No leads to process',
        totalQueued,
        timestamp: now.toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`👉 [AI-AUTOMATION] Processing ${leads.length} leads`);
    
    // Log first few leads for debugging
    leads.slice(0, 3).forEach(lead => {
      console.log(`📋 [AI-AUTOMATION] Lead ${lead.id}: next_send=${lead.next_ai_send_at}, messages_sent=${lead.ai_messages_sent}`);
    });

    // Process leads in parallel with rate limiting
    let processedCount = 0;
    let successfulCount = 0;
    let failedCount = 0;

    const processLead = async (lead: any) => {
      try {
        processedCount++;

        // Check daily message limit
        if (lead.ai_messages_sent >= dailyMessageLimit) {
          console.log(`🛑 [AI-AUTOMATION] Daily message limit reached for lead ${lead.id}`);

          // Pause the lead
          const { error: pauseError } = await supabaseClient
            .from('leads')
            .update({
              ai_sequence_paused: true,
              ai_pause_reason: 'Daily message limit reached',
              next_ai_send_at: null
            })
            .eq('id', lead.id);

          if (pauseError) {
            console.error(`❌ [AI-AUTOMATION] Error pausing lead ${lead.id}:`, pauseError);
            failedCount++;
          } else {
            console.log(`⏸️ [AI-AUTOMATION] Paused lead ${lead.id} due to daily message limit`);
          }

          return;
        }

        // Generate message
        const gentleMessage = generateGentleMessage(lead.first_name, lead.vehicle_interest);

        // Get lead phone number first
        console.log(`📤 [AI-AUTOMATION] Preparing to send message to lead ${lead.id}`);
        
        const { data: leadWithPhone, error: phoneError } = await supabaseClient
          .from('leads')
          .select(`
            id,
            first_name,
            last_name,
            phone_numbers (
              number,
              is_primary
            )
          `)
          .eq('id', lead.id)
          .single();

        if (phoneError || !leadWithPhone) {
          console.error(`❌ [AI-AUTOMATION] Error fetching lead phone for ${lead.id}:`, phoneError);
          failedCount++;
          return;
        }

        // Get primary phone number with fallback
        const phoneNumbers = Array.isArray(leadWithPhone.phone_numbers) ? leadWithPhone.phone_numbers : [];
        const primaryPhone = phoneNumbers.find((p: any) => p.is_primary)?.number || 
                            phoneNumbers[0]?.number;

        if (!primaryPhone) {
          console.error(`❌ [AI-AUTOMATION] No phone number found for lead ${lead.id}`);
          failedCount++;
          return;
        }

        // Create conversation record first
        const conversationData = {
          lead_id: lead.id,
          body: gentleMessage,
          direction: 'out',
          sent_at: new Date().toISOString(),
          ai_generated: true,
          sms_status: 'pending'
        };

        const { data: conversation, error: conversationError } = await supabaseClient
          .from('conversations')
          .insert(conversationData)
          .select()
          .single();

        if (conversationError || !conversation) {
          console.error(`❌ [AI-AUTOMATION] Error creating conversation for lead ${lead.id}:`, conversationError);
          failedCount++;
          return;
        }

        console.log(`💾 [AI-AUTOMATION] Created conversation record ${conversation.id} for lead ${lead.id}`);
        
        try {
          // TROUBLESHOOTING: Enhanced logging before SMS function call
          const smsPayload = {
            to: primaryPhone,
            body: gentleMessage,
            conversationId: conversation.id
          };
          
          console.log(`🔧 [AI-AUTOMATION] DETAILED SMS PAYLOAD for lead ${lead.id}:`, {
            payload: smsPayload,
            phoneNumberLength: primaryPhone?.length,
            phoneNumberFormat: primaryPhone,
            messageLength: gentleMessage.length,
            conversationId: conversation.id,
            leadId: lead.id,
            timestamp: new Date().toISOString()
          });

          // TROUBLESHOOTING: Test direct function-to-function communication first
          console.log(`🧪 [AI-AUTOMATION] Testing send-sms function connectivity...`);
          
          // STEP 1: Use service role key for function-to-function authentication
          const functionClient = createClient(
            Deno.env.get('SUPABASE_URL')!, 
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
          );

          // STEP 2: Standardized payload format validation
          if (!smsPayload.to || !smsPayload.body) {
            throw new Error(`Invalid SMS payload: missing required fields - to: ${!!smsPayload.to}, body: ${!!smsPayload.body}`);
          }

          // STEP 3: Enhanced retry logic with exponential backoff
          let smsResponse = null;
          let smsError = null;
          let retryCount = 0;
          const maxRetries = 3;

          while (retryCount < maxRetries) {
            try {
              console.log(`🔄 [AI-AUTOMATION] SMS attempt ${retryCount + 1}/${maxRetries} for lead ${lead.id}`);
              
              const result = await functionClient.functions.invoke('send-sms', {
                body: smsPayload
              });
              
              smsResponse = result.data;
              smsError = result.error;
              
              // Break on success
              if (!smsError && smsResponse?.success) {
                break;
              }
              
              // Log the specific error for this attempt
              console.warn(`⚠️ [AI-AUTOMATION] SMS attempt ${retryCount + 1} failed for lead ${lead.id}:`, {
                error: smsError?.message || smsResponse?.error,
                willRetry: retryCount < maxRetries - 1
              });
              
            } catch (invokeError) {
              console.error(`❌ [AI-AUTOMATION] SMS invoke error attempt ${retryCount + 1} for lead ${lead.id}:`, invokeError);
              smsError = invokeError;
            }
            
            retryCount++;
            
            // Exponential backoff: wait 1s, 2s, 4s
            if (retryCount < maxRetries) {
              const delay = Math.pow(2, retryCount - 1) * 1000;
              console.log(`⏳ [AI-AUTOMATION] Waiting ${delay}ms before retry ${retryCount + 1}`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }

          // TROUBLESHOOTING: Enhanced response logging
          console.log(`📡 [AI-AUTOMATION] RAW SMS RESPONSE for lead ${lead.id}:`, {
            rawData: smsResponse,
            rawError: smsError,
            hasData: !!smsResponse,
            hasError: !!smsError,
            dataType: typeof smsResponse,
            errorType: typeof smsError,
            timestamp: new Date().toISOString()
          });

          console.log(`📡 [AI-AUTOMATION] SMS function response for lead ${lead.id}:`, {
            hasError: !!smsError,
            responseSuccess: smsResponse?.success,
            error: smsError?.message || smsResponse?.error,
            messageSid: smsResponse?.messageSid
          });

          // STEP 5: Enhanced error handling with fallback mechanism
          if (smsError || !smsResponse?.success) {
            console.error(`❌ [AI-AUTOMATION] All SMS attempts failed for lead ${lead.id} after ${retryCount} retries:`, {
              finalError: smsError?.message || smsResponse?.error,
              errorDetails: smsError?.details,
              twilioError: smsResponse?.twilioError,
              credentialsSource: smsResponse?.credentialsSource,
              retryCount
            });

            // STEP 5: Fallback mechanism - try direct Twilio API call
            console.log(`🔄 [AI-AUTOMATION] Attempting direct Twilio fallback for lead ${lead.id}`);
            
            try {
              const fallbackResult = await attemptDirectTwilioFallback(smsPayload, supabaseClient);
              
              if (fallbackResult.success) {
                console.log(`✅ [AI-AUTOMATION] Fallback successful for lead ${lead.id}:`, fallbackResult);
                smsResponse = fallbackResult;
              } else {
                console.error(`❌ [AI-AUTOMATION] Fallback also failed for lead ${lead.id}:`, fallbackResult);
                
                // Update conversation with comprehensive error status
                await supabaseClient
                  .from('conversations')
                  .update({ 
                    sms_status: 'failed',
                    sms_error: `All attempts failed - Function: ${smsError?.message || smsResponse?.error}, Fallback: ${fallbackResult.error}` 
                  })
                  .eq('id', conversation.id);
                failedCount++;
                return;
              }
            } catch (fallbackError) {
              console.error(`❌ [AI-AUTOMATION] Critical fallback error for lead ${lead.id}:`, fallbackError);
              
              // Update conversation with error status
              await supabaseClient
                .from('conversations')
                .update({ 
                  sms_status: 'failed',
                  sms_error: `Critical failure - Function error: ${smsError?.message || smsResponse?.error}, Fallback error: ${fallbackError.message}` 
                })
                .eq('id', conversation.id);
              failedCount++;
              return;
            }
          }

          // Update conversation with success
          const updateData: any = {
            sms_status: 'sent'
          };
          
          if (smsResponse?.messageSid) {
            updateData.twilio_message_id = smsResponse.messageSid;
          }

          await supabaseClient
            .from('conversations')
            .update(updateData)
            .eq('id', conversation.id);

          console.log(`✅ [AI-AUTOMATION] SMS sent successfully to lead ${lead.id}:`, {
            conversationId: conversation.id,
            messageSid: smsResponse.messageSid,
            credentialsSource: smsResponse.credentialsSource,
            content: gentleMessage.substring(0, 50) + '...'
          });
          
        } catch (smsCallError) {
          console.error(`❌ [AI-AUTOMATION] Critical error calling send-sms for lead ${lead.id}:`, {
            error: smsCallError,
            errorMessage: smsCallError.message,
            errorStack: smsCallError.stack
          });
          // Update conversation with error status
          await supabaseClient
            .from('conversations')
            .update({ 
              sms_status: 'failed',
              sms_error: `Critical SMS call error: ${smsCallError.message}` 
            })
            .eq('id', conversation.id);
          failedCount++;
          return;
        }

        successfulCount++;

        // Handle lead status transition after sending AI message
        try {
          const { data: leadStatus, error: statusError } = await supabaseClient
            .from('leads')
            .select('status')
            .eq('id', lead.id)
            .single();

          if (!statusError && leadStatus?.status === 'new') {
            const { error: transitionError } = await supabaseClient
              .from('leads')
              .update({ status: 'engaged' })
              .eq('id', lead.id);

            if (transitionError) {
              console.error(`❌ [AI-AUTOMATION] Error transitioning lead status for ${lead.id}:`, transitionError);
            } else {
              console.log(`🔄 [AI-AUTOMATION] Transitioned lead ${lead.id} from 'new' to 'engaged'`);
            }
          }
        } catch (statusTransitionError) {
          console.error(`❌ [AI-AUTOMATION] Error handling status transition for lead ${lead.id}:`, statusTransitionError);
        }

        // Schedule next message with tiered scheduling for fresh leads
        const nextSendTime = await calculateNextSendTime(lead, supabaseClient);

        const { error: scheduleError } = await supabaseClient
          .from('leads')
          .update({
            next_ai_send_at: nextSendTime.toISOString(),
            ai_messages_sent: (lead.ai_messages_sent || 0) + 1
          })
          .eq('id', lead.id);

        if (scheduleError) {
          console.error(`❌ [AI-AUTOMATION] Error scheduling next message for lead ${lead.id}:`, scheduleError);
          failedCount++;
          return;
        }

        console.log(`📅 [AI-AUTOMATION] Scheduled next message for lead ${lead.id}`);

      } catch (error) {
        console.error(`❌ [AI-AUTOMATION] Error processing lead ${lead.id}:`, error);
        failedCount++;
      }
    };

    // Execute lead processing with concurrency control
    const executeWithConcurrency = async (tasks: (() => Promise<void>)[], maxConcurrent: number) => {
      const executing: Promise<void>[] = [];
      for (const task of tasks) {
        if (executing.length >= maxConcurrent) {
          await Promise.race(executing);
        }
        const p = task();
        executing.push(p);
        p.finally(() => executing.splice(executing.indexOf(p), 1));
      }
      await Promise.all(executing);
    };

    const leadTasks = leads.map(lead => async () => {
      await processLead(lead);
    });

    const startTime = Date.now();
    await executeWithConcurrency(leadTasks, maxConcurrentSends);
    const endTime = Date.now();
    const processingTime = endTime - startTime;

    const result = {
      message: 'AI automation completed',
      processed: processedCount,
      successful: successfulCount,
      failed: failedCount,
      queueSize: leads.length,
      totalQueued: totalQueued,
      processingTime: processingTime,
      enhanced: enhanced,
      timestamp: new Date().toISOString(),
      source: source,
      runId: runId
    };

    console.log(`✅ [AI-AUTOMATION] Automation completed:`, result);

    // Update run record with completion data
    if (runId) {
      const { error: updateError } = await supabaseClient
        .from('ai_automation_runs')
        .update({
          completed_at: new Date().toISOString(),
          status: 'completed',
          leads_processed: processedCount,
          leads_successful: successfulCount,
          leads_failed: failedCount,
          total_queued: totalQueued,
          processing_time_ms: processingTime
        })
        .eq('id', runId);

      if (updateError) {
        console.error('❌ [AI-AUTOMATION] Error updating run record:', updateError);
      }
    }

    // Log any failures for debugging
    if (failedCount > 0) {
      console.warn(`⚠️ [AI-AUTOMATION] ${failedCount} leads failed to process - check individual lead errors above`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [AI-AUTOMATION] Critical error in AI automation:', error);
    console.error('❌ [AI-AUTOMATION] Error stack:', error.stack);
    
    // Update run record with error
    if (runId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        await supabaseClient
          .from('ai_automation_runs')
          .update({
            completed_at: new Date().toISOString(),
            status: 'failed',
            error_message: error.message,
            processing_time_ms: Date.now() - startTime
          })
          .eq('id', runId);
      } catch (updateError) {
        console.error('❌ [AI-AUTOMATION] Error updating run record with failure:', updateError);
      }
    }
    
    const errorResponse = {
      error: error.message,
      timestamp: new Date().toISOString(),
      source: 'ai-automation',
      type: 'critical_failure',
      runId: runId
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Calculate next send time based on lead characteristics (fresh vs regular)
const calculateNextSendTime = async (lead: any, supabaseClient: any): Promise<Date> => {
  const nextSendTime = new Date();
  
  try {
    // Get full lead details to determine fresh lead status
    const { data: fullLead, error: leadError } = await supabaseClient
      .from('leads')
      .select('id, created_at, message_intensity, ai_messages_sent, ai_stage')
      .eq('id', lead.id)
      .single();

    if (leadError || !fullLead) {
      console.warn(`⚠️ [AI-AUTOMATION] Could not fetch lead details for ${lead.id}, using default 24h schedule`);
      nextSendTime.setDate(nextSendTime.getDate() + 1);
      return nextSendTime;
    }

    const leadCreatedAt = new Date(fullLead.created_at);
    const hoursSinceCreated = (Date.now() - leadCreatedAt.getTime()) / (1000 * 60 * 60);
    const messagesCount = fullLead.ai_messages_sent || 0;
    const isDay1 = hoursSinceCreated <= 24;
    const isSuperAggressive = fullLead.message_intensity === 'super_aggressive' || 
                             fullLead.ai_stage === 'super_aggressive_followup';

    console.log(`⏰ [AI-AUTOMATION] Scheduling logic for lead ${lead.id}:`, {
      hoursSinceCreated: hoursSinceCreated.toFixed(1),
      messagesCount,
      isDay1,
      isSuperAggressive,
      messageIntensity: fullLead.message_intensity,
      aiStage: fullLead.ai_stage
    });

    // Fresh leads on day 1 with super aggressive intensity get shorter intervals
    if (isDay1 && (isSuperAggressive || messagesCount < 3)) {
      if (messagesCount === 1) {
        // Second message: 4-6 hours after first
        const hoursToAdd = 4 + Math.random() * 2; // 4-6 hours
        nextSendTime.setHours(nextSendTime.getHours() + hoursToAdd);
        console.log(`🚀 [AI-AUTOMATION] FRESH LEAD - Second message scheduled in ${hoursToAdd.toFixed(1)} hours`);
      } else if (messagesCount === 2) {
        // Third message: 6-8 hours after second
        const hoursToAdd = 6 + Math.random() * 2; // 6-8 hours
        nextSendTime.setHours(nextSendTime.getHours() + hoursToAdd);
        console.log(`🚀 [AI-AUTOMATION] FRESH LEAD - Third message scheduled in ${hoursToAdd.toFixed(1)} hours`);
      } else if (messagesCount >= 3 && isDay1) {
        // After 3 messages, wait until next day
        nextSendTime.setDate(nextSendTime.getDate() + 1);
        console.log(`📅 [AI-AUTOMATION] FRESH LEAD - Switching to daily schedule after 3 messages`);
      } else {
        // Default fresh lead spacing: 8-12 hours
        const hoursToAdd = 8 + Math.random() * 4; // 8-12 hours
        nextSendTime.setHours(nextSendTime.getHours() + hoursToAdd);
        console.log(`🚀 [AI-AUTOMATION] FRESH LEAD - Next message scheduled in ${hoursToAdd.toFixed(1)} hours`);
      }
    } else {
      // Regular leads or day 2+ leads: standard 24-hour schedule
      nextSendTime.setDate(nextSendTime.getDate() + 1);
      console.log(`📅 [AI-AUTOMATION] REGULAR SCHEDULE - Next message scheduled for tomorrow`);
    }

    return nextSendTime;

  } catch (error) {
    console.error(`❌ [AI-AUTOMATION] Error calculating next send time for lead ${lead.id}:`, error);
    // Fallback to 24-hour schedule
    nextSendTime.setDate(nextSendTime.getDate() + 1);
    return nextSendTime;
  }
};

const generateGentleMessage = (leadName: string, vehicleInterest: string): string => {
  const validation = validateVehicleInterest(vehicleInterest);
  const name = leadName || 'there';
  
  console.log(`🔍 [AI-AUTOMATION] Vehicle validation for ${name}:`, {
    isValid: validation.isValid,
    originalValue: vehicleInterest
  });

  if (!validation.isValid) {
    const fallbackMessages = [
      `Hello! Finn here again. ${FALLBACK_MESSAGE} What can I do to help?`,
      `Hi ${name}! ${FALLBACK_MESSAGE} Any questions I can answer?`,
      `Hello! Finn here again. Just wanted to see if you're still exploring options or have any questions. Ready to assist when you are!`,
      `Hi ${name}! ${FALLBACK_MESSAGE} Can we set up a time to chat?`,
      `Hello! Finn here again. Just checking in to see if you need more info on finding the right vehicle or setting up a test drive. Let me know!`
    ];
    return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
  }

  const validMessages = [
    `Hello ${name}! Just wanted to follow up on ${validation.message}. How can I help you move forward?`,
    `Hi ${name}! Still thinking about ${validation.message}? I'm here if you have any questions!`,
    `Hello! Finn here checking in about ${validation.message}. What would be most helpful right now?`,
    `Hi ${name}! How are things going with ${validation.message}? Ready to take the next step?`,
    `Hello! Just wanted to see how I can help with ${validation.message}. Any questions for me?`
  ];
  
  return validMessages[Math.floor(Math.random() * validMessages.length)];
};
