import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PurgeRequest {
  user_id: string;
  dealership_name?: string;
}

interface PurgeResult {
  success: boolean;
  leads_deleted?: number;
  conversations_reassigned?: number;
  inventory_deleted?: number;
  uploads_deleted?: number;
  error?: string;
  job_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, dealership_name }: PurgeRequest = await req.json();
    const job_id = crypto.randomUUID();

    console.log(`[${job_id}] Starting dealership data purge for user: ${user_id}`);

    // Verify user permissions
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id);

    if (roleError) {
      throw new Error(`Role check failed: ${roleError.message}`);
    }

    const hasPermission = userRoles?.some(r => ['admin', 'manager'].includes(r.role));
    if (!hasPermission) {
      throw new Error('Insufficient permissions - admin or manager role required');
    }

    // Background purge function
    async function executePurge(): Promise<PurgeResult> {
      try {
        console.log(`[${job_id}] Starting immediate purge...`);
        
        let leads_deleted = 0;
        let conversations_reassigned = 0;
        let inventory_deleted = 0;
        let uploads_deleted = 0;

        // Create anonymous lead
        const { data: anonLead } = await supabase
          .from('leads')
          .upsert({
            first_name: 'Anonymous',
            last_name: 'Customer',
            source: 'anonymized_system',
            status: 'archived',
            vehicle_interest: 'Data purged for system reset'
          }, { onConflict: 'source' })
          .select('id')
          .single();

        console.log(`[${job_id}] Anonymous lead: ${anonLead?.id}`);

        // Reassign conversations
        const { count: convCount } = await supabase
          .from('conversations')
          .update({ lead_id: anonLead.id })
          .neq('lead_id', anonLead.id);
        conversations_reassigned = convCount || 0;

        // Delete leads in small batches
        let batchCount = 0;
        while (true) {
          const { data: leadBatch } = await supabase
            .from('leads')
            .select('id')
            .neq('source', 'anonymized_system')
            .limit(25);

          if (!leadBatch || leadBatch.length === 0) break;

          const leadIds = leadBatch.map(l => l.id);
          
          // Delete related records first
          await Promise.all([
            supabase.from('phone_numbers').delete().in('lead_id', leadIds),
            supabase.from('ai_conversation_context').delete().in('lead_id', leadIds),
            supabase.from('ai_message_history').delete().in('lead_id', leadIds),
            supabase.from('ai_notifications').delete().in('lead_id', leadIds)
          ]);

          // Delete the leads
          const { count } = await supabase
            .from('leads')
            .delete()
            .in('id', leadIds);

          leads_deleted += count || 0;
          batchCount++;
          console.log(`[${job_id}] Batch ${batchCount}: ${count} leads deleted`);
          
          if (batchCount > 100) break; // Safety limit
        }

        // Delete inventory and uploads
        const [inventoryResult, uploadResult] = await Promise.all([
          supabase.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('upload_history').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        ]);

        inventory_deleted = inventoryResult.count || 0;
        uploads_deleted = uploadResult.count || 0;

        // Update settings
        if (dealership_name) {
          await supabase.from('settings').upsert({
            key: 'DEALERSHIP_NAME',
            value: dealership_name
          }, { onConflict: 'key' });
        }

        console.log(`[${job_id}] Purge completed: ${leads_deleted} leads, ${inventory_deleted} inventory, ${uploads_deleted} uploads`);
        
        return {
          success: true,
          leads_deleted,
          conversations_reassigned,
          inventory_deleted,
          uploads_deleted,
          job_id
        };

      } catch (error) {
        console.error(`[${job_id}] Purge failed:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          job_id
        };
      }
    }

    // Start background task
    EdgeRuntime.waitUntil(executePurge());

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Data purge started',
        job_id,
        estimated_completion: '2-5 minutes'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Purge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});