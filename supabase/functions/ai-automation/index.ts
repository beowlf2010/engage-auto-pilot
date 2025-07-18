
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Global timeout wrapper to prevent hanging
async function withGlobalTimeout<T>(promise: Promise<T>, timeoutMs = 540000): Promise<T> { // 9 minutes
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Global timeout reached')), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    return await withGlobalTimeout(handleRequest(req));
  } catch (error) {
    console.error('❌ [MAIN] Global error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Global timeout or critical error',
      processed: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleRequest(req: Request) {
  const supabase = createClient(supabaseUrl!, supabaseKey!);
  
  try {
    const { automated = true, source = 'manual', priority = 'normal', enhanced = false } = await req.json();
    
    console.log('🤖 [AUTOMATION] Starting AI automation - source:', source, ', priority:', priority);
    
    const result = await runAutomation(supabase, { automated, source, priority, enhanced });
    
    console.log('✅ [AUTOMATION] Completed successfully:', result);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ [AUTOMATION] Critical error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'AI automation failed',
      processed: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function runAutomation(supabase: any, options: any) {
  const { source, priority, enhanced } = options;
  
  // Create run record
  const { data: runRecord, error: runError } = await supabase
    .from('ai_automation_runs')
    .insert({
      status: 'running',
      source,
      metadata: { priority, enhanced, started_at: new Date().toISOString() }
    })
    .select()
    .single();

  if (runError) {
    throw new Error(`Failed to create run record: ${runError.message}`);
  }

  const runId = runRecord.id;
  console.log('📝 [AUTOMATION] Created run record:', runId);

  try {
    // Acquire distributed lock
    const lockAcquired = await acquireLock(supabase, 'ai_automation_main', 300); // 5 minute lock
    
    if (!lockAcquired) {
      console.log('🔒 [LOCK] Could not acquire lock - another automation running');
      await updateRunRecord(supabase, runId, 'failed', 'Could not acquire lock - another automation running', 0, 0, 0);
      return { success: false, error: 'Another automation is already running', processed: 0 };
    }

    console.log('🔓 [LOCK] Acquired lock: ai_automation_main');

    try {
      // Health check - look for stuck runs
      const { data: stuckRuns } = await supabase
        .from('ai_automation_runs')
        .select('id, started_at')
        .eq('status', 'running')
        .neq('id', runId);

      if (stuckRuns && stuckRuns.length > 0) {
        const stuckCount = stuckRuns.filter(run => {
          const startTime = new Date(run.started_at).getTime();
          const now = Date.now();
          return (now - startTime) > 600000; // 10 minutes
        }).length;

        if (stuckCount > 0) {
          console.log(`❌ [HEALTH] Found ${stuckCount} stuck automation runs`);
          throw new Error(`Health check failed: ${stuckCount} stuck automation runs detected`);
        }
      }

      // Get leads ready to process
      console.log('📊 [AUTOMATION] Fetching leads ready for AI messaging...');
      
      const { data: leadsToProcess, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id, first_name, last_name, vehicle_interest, ai_opt_in, 
          next_ai_send_at, ai_sequence_paused, status
        `)
        .eq('ai_opt_in', true)
        .eq('ai_sequence_paused', false)
        .not('status', 'in', '("lost","closed","sold")')
        .lte('next_ai_send_at', new Date().toISOString())
        .limit(50);

      if (leadsError) {
        throw new Error(`Failed to fetch leads: ${leadsError.message}`);
      }

      const totalQueued = leadsToProcess?.length || 0;
      console.log(`📋 [AUTOMATION] Found ${totalQueued} leads ready for processing`);

      // CRITICAL FIX: Early return when no leads to process
      if (totalQueued === 0) {
        console.log('✅ [AUTOMATION] No leads to process - completing successfully');
        await updateRunRecord(supabase, runId, 'completed', null, 0, 0, 0);
        await releaseLock(supabase, 'ai_automation_main');
        return {
          success: true,
          processed: 0,
          successful: 0,
          failed: 0,
          message: 'No leads ready for processing'
        };
      }

      // Process leads with controlled concurrency
      console.log(`🚀 [AUTOMATION] Starting to process ${totalQueued} leads`);
      
      const results = await processLeadsWithConcurrency(supabase, leadsToProcess, 3);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`✅ [AUTOMATION] Processing complete - ${successful} successful, ${failed} failed`);
      
      await updateRunRecord(supabase, runId, 'completed', null, totalQueued, successful, failed);
      
      return {
        success: true,
        processed: totalQueued,
        successful,
        failed,
        message: `Processed ${totalQueued} leads: ${successful} successful, ${failed} failed`
      };
      
    } finally {
      console.log('🔓 [LOCK] Releasing lock: ai_automation_main');
      await releaseLock(supabase, 'ai_automation_main');
      console.log('✅ [LOCK] Released lock: ai_automation_main');
    }
    
  } catch (error) {
    console.error('❌ [AUTOMATION] Error in main flow:', error);
    await updateRunRecord(supabase, runId, 'failed', error.message, 0, 0, 0);
    throw error;
  }
}

async function processLeadsWithConcurrency(supabase: any, leads: any[], maxConcurrent = 3) {
  console.log(`🔄 [CONCURRENCY] Processing ${leads.length} leads with max ${maxConcurrent} concurrent`);
  
  // CRITICAL FIX: Handle empty array immediately
  if (!leads || leads.length === 0) {
    console.log('📭 [CONCURRENCY] No leads to process - returning empty results');
    return [];
  }

  const results: any[] = [];
  const processingPromises: Promise<any>[] = [];
  
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    
    // SAFETY GUARD: Validate lead object
    if (!lead || !lead.id) {
      console.warn(`⚠️ [CONCURRENCY] Skipping invalid lead at index ${i}:`, lead);
      results.push({ success: false, error: 'Invalid lead object', leadId: null });
      continue;
    }
    
    // Add processing promise
    const promise = processLeadSafely(supabase, lead)
      .then(result => {
        console.log(`✅ [CONCURRENCY] Lead ${lead.id} processed:`, result.success ? 'success' : result.error);
        return result;
      })
      .catch(error => {
        console.error(`❌ [CONCURRENCY] Lead ${lead.id} failed:`, error);
        return { success: false, error: error.message, leadId: lead.id };
      });
    
    processingPromises.push(promise);
    
    // CONCURRENCY CONTROL: Wait when we hit the limit
    if (processingPromises.length >= maxConcurrent) {
      console.log(`⏳ [CONCURRENCY] Waiting for ${processingPromises.length} promises to resolve...`);
      
      // CRITICAL FIX: Use Promise.allSettled to prevent hanging
      const batchResults = await Promise.allSettled(processingPromises);
      
      // Extract results from settled promises
      batchResults.forEach(settled => {
        if (settled.status === 'fulfilled') {
          results.push(settled.value);
        } else {
          console.error('❌ [CONCURRENCY] Promise rejected:', settled.reason);
          results.push({ success: false, error: settled.reason?.message || 'Promise rejected', leadId: null });
        }
      });
      
      // Clear the array for next batch
      processingPromises.length = 0;
      
      console.log(`✅ [CONCURRENCY] Batch complete. Total results so far: ${results.length}`);
    }
  }
  
  // CRITICAL FIX: Process remaining promises if any
  if (processingPromises.length > 0) {
    console.log(`⏳ [CONCURRENCY] Processing final batch of ${processingPromises.length} promises...`);
    
    const finalResults = await Promise.allSettled(processingPromises);
    
    finalResults.forEach(settled => {
      if (settled.status === 'fulfilled') {
        results.push(settled.value);
      } else {
        console.error('❌ [CONCURRENCY] Final promise rejected:', settled.reason);
        results.push({ success: false, error: settled.reason?.message || 'Promise rejected', leadId: null });
      }
    });
  }
  
  console.log(`🏁 [CONCURRENCY] All processing complete. Total results: ${results.length}`);
  return results;
}

async function processLeadSafely(supabase: any, lead: any) {
  try {
    console.log(`🤖 [LEAD] Processing lead ${lead.id} (${lead.first_name} ${lead.last_name})`);
    
    // Call the intelligent conversation AI
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('intelligent-conversation-ai', {
      body: {
        leadId: lead.id,
        leadName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'there',
        messageBody: '', // This is for follow-up, not response to incoming message
        latestCustomerMessage: '',
        conversationHistory: '',
        hasConversationalSignals: false,
        leadSource: 'ai_automation',
        leadSourceData: null,
        vehicleInterest: lead.vehicle_interest || ''
      }
    });

    if (aiError) {
      console.error(`❌ [LEAD] AI error for ${lead.id}:`, aiError);
      return { success: false, error: aiError.message, leadId: lead.id };
    }

    if (!aiResponse?.success || !aiResponse?.message) {
      console.warn(`⚠️ [LEAD] No AI message generated for ${lead.id}`);
      return { success: false, error: 'No AI message generated', leadId: lead.id };
    }

    // Get phone number
    const { data: phoneData, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('number')
      .eq('lead_id', lead.id)
      .eq('is_primary', true)
      .maybeSingle();

    if (phoneError || !phoneData) {
      console.warn(`⚠️ [LEAD] No phone number for ${lead.id}`);
      return { success: false, error: 'No phone number found', leadId: lead.id };
    }

    // Create conversation record
    const { data: conversationData, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        lead_id: lead.id,
        body: aiResponse.message,
        direction: 'out',
        ai_generated: true,
        sms_status: 'pending'
      })
      .select()
      .single();

    if (conversationError) {
      console.error(`❌ [LEAD] Conversation error for ${lead.id}:`, conversationError);
      return { success: false, error: conversationError.message, leadId: lead.id };
    }

    // Send SMS
    const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
      body: {
        to: phoneData.number,
        body: aiResponse.message,
        conversationId: conversationData.id
      }
    });

    if (smsError || !smsResult?.success) {
      console.error(`❌ [LEAD] SMS error for ${lead.id}:`, smsError || smsResult);
      
      // Update conversation with failure
      await supabase
        .from('conversations')
        .update({
          sms_status: 'failed',
          sms_error: smsError?.message || smsResult?.error || 'SMS sending failed'
        })
        .eq('id', conversationData.id);
      
      return { success: false, error: smsError?.message || smsResult?.error || 'SMS failed', leadId: lead.id };
    }

    // Update conversation with success
    if (smsResult.messageSid) {
      await supabase
        .from('conversations')
        .update({
          sms_status: 'sent',
          twilio_message_id: smsResult.messageSid
        })
        .eq('id', conversationData.id);
    }

    // Schedule next message (24 hours from now)
    await supabase
      .from('leads')
      .update({
        next_ai_send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', lead.id);

    console.log(`✅ [LEAD] Successfully processed ${lead.id}`);
    return { success: true, leadId: lead.id, messageSid: smsResult.messageSid };
    
  } catch (error) {
    console.error(`❌ [LEAD] Unexpected error for ${lead.id}:`, error);
    return { success: false, error: error.message, leadId: lead.id };
  }
}

async function acquireLock(supabase: any, lockName: string, timeoutSeconds: number) {
  try {
    const lockId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + timeoutSeconds * 1000).toISOString();
    
    const { error } = await supabase
      .from('ai_automation_locks')
      .insert({
        lock_name: lockName,
        lock_id: lockId,
        expires_at: expiresAt
      });
    
    if (error) {
      // Lock already exists
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ [LOCK] Error acquiring lock:', error);
    return false;
  }
}

async function releaseLock(supabase: any, lockName: string) {
  try {
    await supabase
      .from('ai_automation_locks')
      .delete()
      .eq('lock_name', lockName);
  } catch (error) {
    console.error('❌ [LOCK] Error releasing lock:', error);
  }
}

async function updateRunRecord(supabase: any, runId: string, status: string, errorMessage: string | null, processed: number, successful: number, failed: number) {
  try {
    const updateData: any = {
      status,
      completed_at: new Date().toISOString(),
      leads_processed: processed,
      leads_successful: successful,
      leads_failed: failed,
      total_queued: processed
    };
    
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
    
    await supabase
      .from('ai_automation_runs')
      .update(updateData)
      .eq('id', runId);
      
  } catch (error) {
    console.error('❌ [AUTOMATION] Error updating run record:', error);
  }
}
