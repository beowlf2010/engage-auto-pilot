// supabase/functions/ai-paced-enable/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RequestBody = {
  sinceHours?: number;            // How far back to look for new leads
  totalToEnable?: number;         // Total leads to enable
  maxPerHour?: number;            // Pace per hour
  startAt?: string | null;        // ISO datetime to start scheduling (optional)
  leadIds?: string[];             // Optional explicit leads list
  source?: string;                // Optional source label
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse input
    let body: RequestBody = {};
    try {
      body = await req.json();
    } catch (_) {}

    const sinceHours = Math.max(1, Math.min(168, Number(body.sinceHours ?? 24)));
    const totalToEnable = Math.max(1, Math.min(1000, Number(body.totalToEnable ?? 50)));
    const maxPerHour = Math.max(1, Math.min(200, Number(body.maxPerHour ?? 20)));
    const startAt = body.startAt ? new Date(body.startAt) : new Date(Date.now() + 5 * 60 * 1000); // default: 5m from now
    const explicitLeadIds = Array.isArray(body.leadIds) && body.leadIds.length > 0 ? body.leadIds : null;

    // Permission check (admin/manager)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isManager = roles?.some(r => ['admin', 'manager'].includes(r.role));
    if (!isManager) {
      return new Response(JSON.stringify({ success: false, error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch candidate leads
    let candidates: any[] = [];

    if (explicitLeadIds) {
      const { data, error } = await supabase
        .from('leads')
        .select(`id, created_at, status, ai_opt_in, ai_sequence_paused, do_not_call, next_ai_send_at, phone_numbers:phone_numbers!inner(number,is_primary)`) // ensure a phone exists
        .in('id', explicitLeadIds)
        .eq('ai_opt_in', false)
        .or('ai_sequence_paused.is.null,ai_sequence_paused.eq.false')
        .eq('do_not_call', false);
      if (error) throw error;
      candidates = data || [];
    } else {
      const sinceISO = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('leads')
        .select(`id, created_at, status, ai_opt_in, ai_sequence_paused, do_not_call, next_ai_send_at, phone_numbers:phone_numbers!inner(number,is_primary)`) // ensure a phone exists
        .eq('ai_opt_in', false)
        .or('ai_sequence_paused.is.null,ai_sequence_paused.eq.false')
        .eq('do_not_call', false)
        .gte('created_at', sinceISO)
        .order('created_at', { ascending: true })
        .limit(totalToEnable * 3); // over-fetch, will trim later
      if (error) throw error;
      candidates = data || [];
    }

    // Filter for valid phone numbers (>=10 digits and not test number)
    const cleaned = candidates.filter((c) => {
      const numbers: any[] = c.phone_numbers || [];
      const primary = numbers.find(n => n.is_primary) || numbers[0];
      if (!primary?.number) return false;
      const digits = String(primary.number).replace(/[^0-9]/g, '');
      if (digits.length < 10) return false;
      if (digits === '15551234567') return false; // common placeholder
      return true;
    }).slice(0, totalToEnable);

    if (cleaned.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No eligible leads found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build paced schedule
    const schedule: Array<{ id: string; sendAt: string }> = [];
    const base = startAt.getTime();

    for (let i = 0; i < cleaned.length; i++) {
      const hourOffset = Math.floor(i / maxPerHour);
      const slotInHour = i % maxPerHour;
      const minutesPerSlot = Math.max(1, Math.floor(60 / maxPerHour));
      const minuteOffset = slotInHour * minutesPerSlot;
      const jitter = Math.floor(Math.random() * Math.max(1, minutesPerSlot - 1));
      const sendTime = new Date(base + hourOffset * 60 * 60 * 1000);
      sendTime.setMinutes(sendTime.getMinutes() + minuteOffset + jitter);
      schedule.push({ id: cleaned[i].id, sendAt: sendTime.toISOString() });
    }

    // Apply updates (per-row to set different send times)
    let updated = 0;
    for (const item of schedule) {
      const { error: updErr } = await supabase
        .from('leads')
        .update({
          ai_opt_in: true,
          ai_sequence_paused: false,
          ai_stage: 'active',
          next_ai_send_at: item.sendAt,
          ai_strategy_last_updated: new Date().toISOString()
        })
        .eq('id', item.id);
      if (!updErr) updated++;
    }

    // Log a note (best-effort, background-ish)
    for (const item of schedule) {
      await supabase
        .from('ai_conversation_notes')
        .insert({
          lead_id: item.id,
          note_type: 'ai_sequence_resumed',
          note_content: `AI enabled via paced batch (${body.source || 'dashboard'}) - first send at ${item.sendAt}`
        });
    }

    const firstSend = schedule[0].sendAt;
    const lastSend = schedule[schedule.length - 1].sendAt;

    return new Response(JSON.stringify({
      success: true,
      totalEligible: cleaned.length,
      totalUpdated: updated,
      firstSendAt: firstSend,
      lastSendAt: lastSend,
      processingTimeMs: Date.now() - startTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [AI PACED ENABLE] Error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to pace-enable AI' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
