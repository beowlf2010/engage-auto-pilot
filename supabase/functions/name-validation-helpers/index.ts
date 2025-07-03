
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...params } = await req.json();

    let result;
    switch (action) {
      case 'get_name_validation_record':
        result = await getNameValidationRecord(supabaseClient, params.p_normalized_name);
        break;
      case 'update_name_validation_record':
        result = await updateNameValidationRecord(supabaseClient, params);
        break;
      case 'insert_name_validation_record':
        result = await insertNameValidationRecord(supabaseClient, params);
        break;
      case 'get_learned_name_validation':
        result = await getLearnedNameValidation(supabaseClient, params.p_normalized_name);
        break;
      default:
        throw new Error('Unknown action');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getNameValidationRecord(supabase: any, normalizedName: string) {
  const { data, error } = await supabase
    .from('ai_name_validations')
    .select('*')
    .eq('normalized_name', normalizedName)
    .limit(1);

  if (error) throw error;
  return data;
}

async function updateNameValidationRecord(supabase: any, params: any) {
  const { error } = await supabase
    .from('ai_name_validations')
    .update({
      times_seen: params.p_times_seen,
      times_approved: params.p_times_approved,
      times_rejected: params.p_times_rejected,
      user_override_decision: params.p_user_override_decision,
      override_reason: params.p_override_reason,
      confidence_after: params.p_confidence_after,
      override_by: params.p_override_by,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.p_id);

  if (error) throw error;
  return { success: true };
}

async function insertNameValidationRecord(supabase: any, params: any) {
  const { error } = await supabase
    .from('ai_name_validations')
    .insert({
      original_name: params.p_original_name,
      normalized_name: params.p_normalized_name,
      original_validation_result: params.p_original_validation_result,
      user_override_decision: params.p_user_override_decision,
      override_reason: params.p_override_reason,
      confidence_before: params.p_confidence_before,
      confidence_after: params.p_confidence_after,
      times_approved: params.p_times_approved,
      times_rejected: params.p_times_rejected,
      override_by: params.p_override_by
    });

  if (error) throw error;
  return { success: true };
}

async function getLearnedNameValidation(supabase: any, normalizedName: string) {
  const { data, error } = await supabase
    .from('ai_name_validations')
    .select('*')
    .eq('normalized_name', normalizedName)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data;
}
