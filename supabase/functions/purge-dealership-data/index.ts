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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, dealership_name }: PurgeRequest = await req.json();
    const job_id = crypto.randomUUID();

    console.log(`[${job_id}] Starting dealership data purge for user: ${user_id}`);

    // Verify user has admin/manager permissions
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

    // Define the background purge task
    async function executePurge(): Promise<PurgeResult> {
      try {
        console.log(`[${job_id}] Executing purge operations...`);
        
        let leads_deleted = 0;
        let conversations_reassigned = 0;
        let inventory_deleted = 0;
        let uploads_deleted = 0;

        // Step 1: Manual lead deletion in chunks to avoid timeout
        console.log(`[${job_id}] Step 1: Manual chunked lead deletion...`);
        
        // First, get anonymous lead or create it
        let { data: anonLead } = await supabase
          .from('leads')
          .select('id')
          .eq('source', 'anonymized_system')
          .single();

        if (!anonLead) {
          const { data: newAnonLead } = await supabase
            .from('leads')
            .insert({
              first_name: 'Anonymous',
              last_name: 'Customer',
              source: 'anonymized_system',
              status: 'archived',
              vehicle_interest: 'Data purged for system reset'
            })
            .select('id')
            .single();
          anonLead = newAnonLead;
        }

        // Reassign conversations first
        const { count: convCount } = await supabase
          .from('conversations')
          .update({ lead_id: anonLead.id })
          .neq('lead_id', anonLead.id);
        conversations_reassigned = convCount || 0;

        // Delete leads in chunks (avoiding the anonymous one)
        let totalDeleted = 0;
        let hasMore = true;
        
        while (hasMore) {
          const { data: leadBatch } = await supabase
            .from('leads')
            .select('id')
            .neq('source', 'anonymized_system')
            .limit(100);

          if (!leadBatch || leadBatch.length === 0) {
            hasMore = false;
            break;
          }

          const leadIds = leadBatch.map(l => l.id);

          // Delete related data first
          await supabase.from('phone_numbers').delete().in('lead_id', leadIds);
          await supabase.from('ai_conversation_context').delete().in('lead_id', leadIds);
          await supabase.from('ai_conversation_notes').delete().in('lead_id', leadIds);
          await supabase.from('ai_generated_messages').delete().in('lead_id', leadIds);
          await supabase.from('ai_message_history').delete().in('lead_id', leadIds);
          
          // Delete the leads themselves
          const { count: deletedCount } = await supabase
            .from('leads')
            .delete()
            .in('id', leadIds);

          totalDeleted += deletedCount || 0;
          console.log(`[${job_id}] Deleted batch: ${deletedCount}, Total so far: ${totalDeleted}`);
        }
        
        leads_deleted = totalDeleted;

        // Step 2: Purge inventory data
        console.log(`[${job_id}] Step 2: Purging inventory...`);
        const { count: inventoryCount } = await supabase
          .from('inventory')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');

        inventory_deleted = inventoryCount || 0;
        console.log(`[${job_id}] Inventory deleted: ${inventory_deleted}`);

        // Step 3: Purge upload history (now that leads are gone)
        console.log(`[${job_id}] Step 3: Purging upload history...`);
        const { count: uploadCount } = await supabase
          .from('upload_history')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');

        uploads_deleted = uploadCount || 0;
        console.log(`[${job_id}] Upload history deleted: ${uploads_deleted}`);

        // Step 4: Update dealership settings if provided
        if (dealership_name) {
          console.log(`[${job_id}] Step 4: Updating dealership settings to: ${dealership_name}`);
          
          // Use UPDATE instead of UPSERT to avoid constraint issues
          const { error: updateError } = await supabase
            .from('settings')
            .update({ value: dealership_name, updated_at: new Date().toISOString() })
            .eq('key', 'DEALERSHIP_NAME');

          if (updateError) {
            // If update failed, try insert
            await supabase
              .from('settings')
              .insert({ key: 'DEALERSHIP_NAME', value: dealership_name });
          }
        }

        console.log(`[${job_id}] Purge completed successfully`);
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

    // Start the background task
    EdgeRuntime.waitUntil(executePurge().then(result => {
      console.log(`[${job_id}] Background task completed:`, result);
      // You could store the result in a table here for status checking
    }));

    // Return immediate response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Data purge started in background',
        job_id,
        estimated_completion: '1-3 minutes'
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

// Handle function shutdown
addEventListener('beforeunload', (ev) => {
  console.log('Purge function shutdown due to:', ev?.detail?.reason);
});