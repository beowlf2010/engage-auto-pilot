import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Global timeout wrapper to prevent hanging
const withGlobalTimeout = async <T>(
  promise: Promise<T>, 
  timeoutMs: number, 
  operationName: string
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`GLOBAL TIMEOUT: ${operationName} exceeded ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    console.error(`❌ [TIMEOUT] ${operationName} failed:`, error.message);
    throw error;
  }
};

// Timeout wrapper for individual operations
const withTimeout = async <T>(
  promise: Promise<T>, 
  timeoutMs: number, 
  operationName: string
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operationName} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    console.error(`❌ [TIMEOUT] ${operationName} failed:`, error.message);
    throw error;
  }
};

// Concurrency control with database semaphore
const acquireLock = async (supabaseClient: any, lockName: string, timeoutMs: number = 30000): Promise<boolean> => {
  const lockId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + timeoutMs);
  
  try {
    console.log(`🔒 [LOCK] Attempting to acquire lock: ${lockName}`);
    
    const { data, error } = await supabaseClient
      .from('ai_automation_locks')
      .insert({
        lock_name: lockName,
        lock_id: lockId,
        acquired_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      // Lock already exists or conflict
      console.log(`⚠️ [LOCK] Failed to acquire lock ${lockName}:`, error.message);
      return false;
    }

    console.log(`✅ [LOCK] Acquired lock: ${lockName} with ID: ${lockId}`);
    return true;
  } catch (error) {
    console.error(`❌ [LOCK] Error acquiring lock ${lockName}:`, error);
    return false;
  }
};

const releaseLock = async (supabaseClient: any, lockName: string): Promise<void> => {
  try {
    console.log(`🔓 [LOCK] Releasing lock: ${lockName}`);
    
    const { error } = await supabaseClient
      .from('ai_automation_locks')
      .delete()
      .eq('lock_name', lockName);

    if (error) {
      console.error(`❌ [LOCK] Error releasing lock ${lockName}:`, error);
    } else {
      console.log(`✅ [LOCK] Released lock: ${lockName}`);
    }
  } catch (error) {
    console.error(`❌ [LOCK] Critical error releasing lock ${lockName}:`, error);
  }
};

// Clean up expired locks
const cleanupExpiredLocks = async (supabaseClient: any): Promise<void> => {
  try {
    const { error } = await supabaseClient
      .from('ai_automation_locks')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('❌ [LOCK] Error cleaning up expired locks:', error);
    } else {
      console.log('✅ [LOCK] Cleaned up expired locks');
    }
  } catch (error) {
    console.error('❌ [LOCK] Error in cleanup:', error);
  }
};

// Health check and automatic failure detection
const performHealthCheck = async (supabaseClient: any): Promise<{ healthy: boolean; issues: string[] }> => {
  const issues: string[] = [];
  
  try {
    // Check database connectivity
    const { error: dbError } = await withTimeout(
      supabaseClient.from('leads').select('id').limit(1),
      5000,
      'Database health check'
    );
    
    if (dbError) {
      issues.push(`Database connectivity: ${dbError.message}`);
    }

    // Check for stuck automation runs
    const { data: stuckRuns } = await supabaseClient
      .from('ai_automation_runs')
      .select('id, started_at')
      .eq('status', 'running')
      .lt('started_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if (stuckRuns && stuckRuns.length > 0) {
      issues.push(`${stuckRuns.length} stuck automation runs detected`);
    }

    // Check automation control settings
    const { data: controlSettings } = await supabaseClient
      .from('ai_automation_control')
      .select('automation_enabled, emergency_stop')
      .limit(1)
      .single();

    if (controlSettings?.emergency_stop) {
      issues.push('Emergency stop is active');
    }

    if (!controlSettings?.automation_enabled) {
      issues.push('Automation is disabled');
    }

    return { healthy: issues.length === 0, issues };
  } catch (error) {
    console.error('❌ [HEALTH] Health check failed:', error);
    return { healthy: false, issues: [`Health check failed: ${error.message}`] };
  }
};

// Simplified lead processing with comprehensive error handling
const processLead = async (lead: any, supabaseClient: any): Promise<{ success: boolean; error?: string }> => {
  const leadId = lead.id;
  console.log(`🔄 [LEAD] Processing lead ${leadId}`);

  try {
    // Get lead with phone number
    const { data: leadData, error: leadError } = await withTimeout(
      supabaseClient
        .from('leads')
        .select(`
          id, first_name, last_name, vehicle_interest, ai_messages_sent,
          phone_numbers(number, is_primary)
        `)
        .eq('id', leadId)
        .single(),
      10000,
      `Lead data fetch for ${leadId}`
    );

    if (leadError || !leadData) {
      throw new Error(`Failed to fetch lead data: ${leadError?.message}`);
    }

    // Get primary phone number
    const phoneNumbers = Array.isArray(leadData.phone_numbers) ? leadData.phone_numbers : [];
    const primaryPhone = phoneNumbers.find((p: any) => p.is_primary)?.number || phoneNumbers[0]?.number;

    if (!primaryPhone) {
      throw new Error('No phone number found');
    }

    // Check if phone number is on suppression list (COMPLIANCE CHECK)
    const { data: suppressionCheck, error: suppressionError } = await withTimeout(
      supabaseClient
        .from('compliance_suppression_list')
        .select('id, reason, created_at')
        .eq('contact', primaryPhone)
        .eq('type', 'sms')
        .limit(1),
      5000,
      `Suppression check for ${leadId}`
    );

    if (suppressionError) {
      console.error(`❌ [COMPLIANCE] Error checking suppression list for ${leadId}:`, suppressionError);
      return { success: false, error: 'Suppression check failed' };
    }

    if (suppressionCheck && suppressionCheck.length > 0) {
      const suppression = suppressionCheck[0];
      console.log(`🚫 [COMPLIANCE] Phone ${primaryPhone} is on suppression list - BLOCKING message for ${leadId}`);
      console.log(`🚫 [COMPLIANCE] Suppression reason: ${suppression.reason} (added: ${suppression.created_at})`);
      
      // Pause the lead's AI sequence
      await withTimeout(
        supabaseClient
          .from('leads')
          .update({
            ai_sequence_paused: true,
            ai_pause_reason: `Phone number on suppression list: ${suppression.reason}`,
            next_ai_send_at: null,
            ai_opt_in: false
          })
          .eq('id', leadId),
        10000,
        `Lead suppression pause for ${leadId}`
      );

      return { success: false, error: 'Phone number on suppression list' };
    }

    // Check daily message limit
    const dailyLimit = 8;
    if (leadData.ai_messages_sent >= dailyLimit) {
      console.log(`🛑 [LEAD] Daily limit reached for ${leadId}, pausing lead`);
      
      await withTimeout(
        supabaseClient
          .from('leads')
          .update({
            ai_sequence_paused: true,
            ai_pause_reason: 'Daily message limit reached',
            next_ai_send_at: null
          })
          .eq('id', leadId),
        10000,
        `Lead pause update for ${leadId}`
      );

      return { success: false, error: 'Daily limit reached' };
    }

    // Generate message using AI
    const leadName = `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim() || 'there';
    const vehicleInterest = leadData.vehicle_interest || 'finding the right vehicle';
    
    console.log(`🧠 [LEAD] Generating AI message for ${leadId}`);
    
    const aiPayload = {
      leadId: leadId,
      leadName: leadName,
      messageBody: 'AI automation follow-up',
      latestCustomerMessage: 'AI automation follow-up',
      conversationHistory: [],
      hasConversationalSignals: true,
      leadSource: 'ai_automation',
      vehicleInterest: vehicleInterest
    };

    const { data: aiResult, error: aiError } = await withTimeout(
      supabaseClient.functions.invoke('intelligent-conversation-ai', { body: aiPayload }),
      30000,
      `AI generation for ${leadId}`
    );

    console.log(`🧠 [LEAD] AI Function Response for ${leadId}:`, {
      hasError: !!aiError,
      errorMessage: aiError?.message,
      hasData: !!aiResult,
      dataSuccess: aiResult?.success,
      hasMessage: !!aiResult?.message,
      messagePreview: aiResult?.message?.substring(0, 50)
    });

    if (aiError) {
      console.error(`❌ [LEAD] AI Error for ${leadId}:`, aiError);
      throw new Error(`AI generation failed with error: ${aiError.message}`);
    }

    if (!aiResult?.success) {
      console.error(`❌ [LEAD] AI Success False for ${leadId}:`, aiResult);
      throw new Error(`AI generation failed: ${JSON.stringify(aiResult)}`);
    }

    const generatedMessage = aiResult.message;
    if (!generatedMessage || generatedMessage.trim().length === 0) {
      console.error(`❌ [LEAD] No message generated for ${leadId}:`, aiResult);
      throw new Error('No message generated by AI');
    }

    // Additional validation to ensure it's not a generic template
    if (generatedMessage.includes('I wanted to follow up and see if you have any questions about our inventory')) {
      console.error(`❌ [LEAD] Generic template detected for ${leadId}:`, generatedMessage);
      throw new Error('AI returned generic template instead of personalized message');
    }

    console.log(`✅ [LEAD] AI generated message for ${leadId}: "${generatedMessage.substring(0, 100)}..."`);

    // Get any available profile for system messages (use first admin/manager profile)
    const { data: systemProfile } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    const profileId = systemProfile?.id || null;
    console.log(`👤 [LEAD] Using system profile: ${profileId}`);

    // Use consolidated message service for proper SMS handling
    const { data: consolidatedResult, error: consolidatedError } = await withTimeout(
      supabaseClient.functions.invoke('send-sms', { 
        body: {
          leadId: leadId,
          messageBody: generatedMessage,
          profileId: profileId,
          isAIGenerated: true,
          to: primaryPhone,
          conversationId: null // Let the service create the conversation
        }
      }),
      30000,
      `Consolidated message send for ${leadId}`
    );

    if (consolidatedError || !consolidatedResult?.success) {
      const errorMsg = consolidatedError?.message || consolidatedResult?.error || 'Message sending failed';
      console.error(`❌ [LEAD] Consolidated message failed for ${leadId}:`, errorMsg);
      throw new Error(`Message sending failed: ${errorMsg}`);
    }

    console.log(`✅ [LEAD] Message sent successfully via consolidated service for ${leadId}`);
    const conversationId = consolidatedResult.conversationId;

    // Update lead status and schedule next message
    const nextSendTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours later
    
    await withTimeout(
      supabaseClient
        .from('leads')
        .update({
          next_ai_send_at: nextSendTime.toISOString(),
          ai_messages_sent: (leadData.ai_messages_sent || 0) + 1,
          status: leadData.ai_messages_sent === 0 ? 'engaged' : leadData.status
        })
        .eq('id', leadId),
      10000,
      `Lead update for ${leadId}`
    );

    console.log(`✅ [LEAD] Successfully processed lead ${leadId}`);
    return { success: true };

  } catch (error) {
    console.error(`❌ [LEAD] Error processing lead ${leadId}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Main automation function
const runAutomation = async (supabaseClient: any, source: string, priority: string): Promise<any> => {
  console.log(`🤖 [AUTOMATION] Starting AI automation - source: ${source}, priority: ${priority}`);
  
  let runId: string | null = null;
  const startTime = Date.now();
  
  try {
    // Perform health check
    const healthCheck = await performHealthCheck(supabaseClient);
    if (!healthCheck.healthy) {
      throw new Error(`Health check failed: ${healthCheck.issues.join(', ')}`);
    }

    console.log('✅ [AUTOMATION] Health check passed');

    // Check automation control settings
    const { data: controlSettings } = await supabaseClient
      .from('ai_automation_control')
      .select('automation_enabled, emergency_stop, max_concurrent_runs, global_timeout_minutes')
      .limit(1)
      .single();

    if (controlSettings?.emergency_stop) {
      throw new Error('Emergency stop is active');
    }

    if (!controlSettings?.automation_enabled) {
      throw new Error('Automation is disabled');
    }

    console.log('✅ [AUTOMATION] Control settings check passed');

    // Acquire concurrency lock
    const lockAcquired = await acquireLock(supabaseClient, 'ai_automation_main', 300000); // 5 minute timeout
    if (!lockAcquired) {
      throw new Error('Could not acquire concurrency lock - another instance may be running');
    }

    console.log('✅ [AUTOMATION] Concurrency lock acquired');

    // Clean up expired locks
    await cleanupExpiredLocks(supabaseClient);

    // Create automation run record
    const { data: runRecord, error: runError } = await supabaseClient
      .from('ai_automation_runs')
      .insert({
        source,
        status: 'running',
        metadata: { priority, version: '2.0-robust' }
      })
      .select()
      .single();

    if (runError) {
      console.error('❌ [AUTOMATION] Error creating run record:', runError);
    } else {
      runId = runRecord.id;
      console.log(`📝 [AUTOMATION] Created run record: ${runId}`);
    }

    // Get leads ready for processing
    const batchSize = source === 'manual_test' ? 5 : 100;
    const now = new Date().toISOString();
    
    const { data: leads, error: leadsError } = await withTimeout(
      supabaseClient
        .from('leads')
        .select('id, first_name, ai_messages_sent, next_ai_send_at')
        .eq('ai_opt_in', true)
        .eq('ai_sequence_paused', false)
        .not('next_ai_send_at', 'is', null)
        .lte('next_ai_send_at', now)
        .limit(batchSize),
      15000,
      'Lead query'
    );

    if (leadsError) {
      throw new Error(`Failed to fetch leads: ${leadsError.message}`);
    }

    const { data: queueStats } = await supabaseClient
      .from('leads')
      .select('id')
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null);

    const totalQueued = queueStats?.length || 0;
    console.log(`📊 [AUTOMATION] Queue status: ${leads?.length || 0} ready, ${totalQueued} total queued`);

    if (!leads || leads.length === 0) {
      console.log('😴 [AUTOMATION] No leads to process');
      return {
        success: true,
        message: 'No leads to process',
        processed: 0,
        successful: 0,
        failed: 0,
        totalQueued,
        timestamp: new Date().toISOString()
      };
    }

    // Process leads with controlled concurrency
    const maxConcurrent = Math.min(5, leads.length);
    let processedCount = 0;
    let successfulCount = 0;
    let failedCount = 0;

    const processLeadTask = async (lead: any) => {
      const result = await processLead(lead, supabaseClient);
      processedCount++;
      
      if (result.success) {
        successfulCount++;
      } else {
        failedCount++;
      }
      
      console.log(`📊 [AUTOMATION] Progress: ${processedCount}/${leads.length} (${successfulCount} success, ${failedCount} failed)`);
    };

    // Process leads in batches
    const leadTasks = leads.map(lead => () => processLeadTask(lead));
    const executing: Promise<void>[] = [];

    for (const task of leadTasks) {
      // Wait if we've reached max concurrency
      if (executing.length >= maxConcurrent) {
        await Promise.race(executing);
        // Remove completed promises
        for (let i = executing.length - 1; i >= 0; i--) {
          if (executing[i].then) {
            executing[i].then(() => executing.splice(i, 1)).catch(() => executing.splice(i, 1));
          }
        }
      }
      
      const taskPromise = withTimeout(task(), 120000, 'Lead processing task');
      executing.push(taskPromise);
    }

    // Wait for all remaining tasks
    await Promise.allSettled(executing);

    const processingTime = Date.now() - startTime;
    console.log(`✅ [AUTOMATION] Processing completed in ${processingTime}ms`);

    // Update run record
    if (runId) {
      await supabaseClient
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
    }

    // Release the lock
    await releaseLock(supabaseClient, 'ai_automation_main');

    return {
      success: true,
      message: 'AI automation completed successfully',
      processed: processedCount,
      successful: successfulCount,
      failed: failedCount,
      totalQueued,
      processingTime,
      timestamp: new Date().toISOString(),
      runId
    };

  } catch (error) {
    console.error('❌ [AUTOMATION] Critical error:', error);
    
    // Release the lock on error
    await releaseLock(supabaseClient, 'ai_automation_main');
    
    // Update run record with error
    if (runId) {
      await supabaseClient
        .from('ai_automation_runs')
        .update({
          completed_at: new Date().toISOString(),
          status: 'failed',
          error_message: error.message,
          processing_time_ms: Date.now() - startTime
        })
        .eq('id', runId);
    }

    throw error;
  }
};

// Main request handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestData;
  try {
    const bodyText = await req.text();
    requestData = bodyText ? JSON.parse(bodyText) : {};
  } catch (parseError) {
    console.warn('⚠️ Invalid JSON in request, using defaults:', parseError);
    requestData = {};
  }

  const {
    automated = true,
    source = 'scheduled',
    priority = 'normal'
  } = requestData;

  // Validate environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables');
    return new Response(JSON.stringify({
      success: false,
      error: 'Missing environment variables',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Apply global timeout wrapper (4 minutes max)
    const result = await withGlobalTimeout(
      runAutomation(supabaseClient, source, priority),
      4 * 60 * 1000, // 4 minutes
      'AI Automation Complete Process'
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [MAIN] Global error:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      source: 'ai-automation',
      type: 'global_failure'
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});