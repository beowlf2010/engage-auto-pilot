import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

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

  try {
    const {
      automated = true,
      source = 'scheduled',
      priority = 'normal',
      enhanced = false
    } = await req.json();

    console.log(`🤖 [AI-AUTOMATION] Starting AI automation, source: ${source}, priority: ${priority}, enhanced: ${enhanced}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get automation settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('ai_automation_settings')
      .select('setting_key, setting_value');

    if (settingsError) {
      console.error('❌ [AI-AUTOMATION] Error fetching automation settings:', settingsError);
      throw new Error('Failed to fetch automation settings');
    }

    const settingsMap = settings?.reduce((acc: Record<string, any>, setting: any) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {} as Record<string, any>) || {};

    const batchSize = parseInt(settingsMap.batch_size) || 50;
    const maxConcurrentSends = parseInt(settingsMap.max_concurrent_sends) || 5;
    const dailyMessageLimit = parseInt(settingsMap.daily_message_limit_per_lead) || 8;
    const autoUnpauseStaleLeads = settingsMap.auto_unpause_stale_leads === true;
    const stalePauseThresholdDays = parseInt(settingsMap.stale_pause_threshold_days) || 7;

    console.log(`⚙️ [AI-AUTOMATION] Settings: batchSize=${batchSize}, maxConcurrentSends=${maxConcurrentSends}, dailyMessageLimit=${dailyMessageLimit}`);

    // Unpause stale leads if enabled
    if (autoUnpauseStaleLeads) {
      console.log('▶️ [AI-AUTOMATION] Auto-unpausing stale leads');
      const { data: unpausedCount, error: unpauseError } = await supabaseClient.rpc('auto_unpause_stale_leads' as any);

      if (unpauseError) {
        console.error('❌ [AI-AUTOMATION] Error unpausing stale leads:', unpauseError);
      } else {
        console.log(`✅ [AI-AUTOMATION] Unpaused ${unpausedCount} stale leads`);
      }
    }

    // Get leads ready for AI processing
    const now = new Date();
    const { data: leads, error: leadsError } = await supabaseClient
      .from('leads')
      .select('id, first_name, vehicle_interest, ai_messages_sent')
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null)
      .lte('next_ai_send_at', now.toISOString())
      .limit(batchSize);

    if (leadsError) {
      console.error('❌ [AI-AUTOMATION] Error fetching leads:', leadsError);
      throw new Error('Failed to fetch leads');
    }

    if (!leads || leads.length === 0) {
      console.log('😴 [AI-AUTOMATION] No leads to process');
      return new Response(JSON.stringify({ message: 'No leads to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`👉 [AI-AUTOMATION] Processing ${leads.length} leads`);

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

        // Send message
        const { data: messageData, error: messageError } = await supabaseClient
          .from('messages')
          .insert({
            lead_id: lead.id,
            body: gentleMessage,
            direction: 'out',
            sent_at: new Date().toISOString(),
            ai_generated: true,
            created_by: 'ai_automation'
          })
          .select()
          .single();

        if (messageError) {
          console.error(`❌ [AI-AUTOMATION] Error sending message to lead ${lead.id}:`, messageError);
          failedCount++;
          return;
        }

        console.log(`💬 [AI-AUTOMATION] Sent message to lead ${lead.id}: ${gentleMessage}`);
        successfulCount++;

        // Schedule next message
        const nextSendTime = new Date();
        nextSendTime.setDate(nextSendTime.getDate() + 1); // Schedule for next day

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
          await Promise.race(executing); // Wait for one to complete
        }
        const p = task();
        executing.push(p);
        p.finally(() => executing.splice(executing.indexOf(p), 1)); // Remove from executing when complete
      }
      await Promise.all(executing); // Wait for all to complete
    };

    const leadTasks = leads.map(lead => async () => {
      await processLead(lead);
    });

    const startTime = Date.now();
    await executeWithConcurrency(leadTasks, maxConcurrentSends);
    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log(`✅ [AI-AUTOMATION] Automation completed: Processed=${processedCount}, Successful=${successfulCount}, Failed=${failedCount}, Time=${processingTime}ms`);

    return new Response(
      JSON.stringify({
        message: 'AI automation completed',
        processed: processedCount,
        successful: successfulCount,
        failed: failedCount,
        queueSize: leads.length,
        processingTime: processingTime,
        enhanced: enhanced
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [AI-AUTOMATION] Error in AI automation:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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
