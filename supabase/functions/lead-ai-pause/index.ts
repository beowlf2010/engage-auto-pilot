// supabase/functions/lead-ai-pause/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseKey!);
    const { leadId, reason } = await req.json();

    console.log('⏸️ [AI PAUSE] Pausing AI for lead:', leadId);

    // Update lead to pause AI
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        ai_stage: 'paused',
        next_ai_send_at: null,
        ai_strategy_last_updated: new Date().toISOString()
      })
      .eq('id', leadId);

    if (updateError) {
      throw updateError;
    }

    // Cancel scheduled messages
    await supabase
      .from('ai_message_schedule')
      .update({ status: 'cancelled' })
      .eq('lead_id', leadId)
      .eq('status', 'scheduled');

    // Log pause action
    await supabase
      .from('ai_conversation_notes')
      .insert({
        lead_id: leadId,
        note_type: 'ai_sequence_paused',
        note_content: `AI messaging paused. Reason: ${reason || 'Manual pause'}`
      });

    return new Response(JSON.stringify({
      success: true,
      leadId,
      message: 'AI messaging paused successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [AI PAUSE] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to pause AI messaging'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});