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

        // Step 1: Purge leads using the secure function
        console.log(`[${job_id}] Step 1: Purging leads...`);
        const { data: leadPurgeResult, error: leadError } = await supabase.rpc('purge_all_leads_as_admin', {
          p_user_id: user_id,
          p_dry_run: false
        });

        if (leadError) {
          console.error(`[${job_id}] Lead purge error:`, leadError);
        } else {
          leads_deleted = (leadPurgeResult as any)?.leads_deleted || 0;
          conversations_reassigned = (leadPurgeResult as any)?.conversations_reassigned || 0;
          console.log(`[${job_id}] Leads purged: ${leads_deleted}, Conversations reassigned: ${conversations_reassigned}`);
        }

        // Step 2: Purge inventory data
        console.log(`[${job_id}] Step 2: Purging inventory...`);
        const { error: inventoryError, count: inventoryCount } = await supabase
          .from('inventory')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Keep dummy record

        if (inventoryError) {
          console.error(`[${job_id}] Inventory purge error:`, inventoryError);
        } else {
          inventory_deleted = inventoryCount || 0;
          console.log(`[${job_id}] Inventory deleted: ${inventory_deleted}`);
        }

        // Step 3: Purge upload history
        console.log(`[${job_id}] Step 3: Purging upload history...`);
        const { error: uploadError, count: uploadCount } = await supabase
          .from('upload_history')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');

        if (uploadError) {
          console.error(`[${job_id}] Upload history purge error:`, uploadError);
        } else {
          uploads_deleted = uploadCount || 0;
          console.log(`[${job_id}] Upload history deleted: ${uploads_deleted}`);
        }

        // Step 4: Update dealership settings if provided
        if (dealership_name) {
          console.log(`[${job_id}] Step 4: Updating dealership settings to: ${dealership_name}`);
          const { error: settingsError } = await supabase
            .from('settings')
            .upsert([
              { key: 'DEALERSHIP_NAME', value: dealership_name, updated_at: new Date().toISOString() },
              { key: 'DEALERSHIP_LOCATION', value: 'Used Car Department', updated_at: new Date().toISOString() }
            ]);

          if (settingsError) {
            console.error(`[${job_id}] Settings update error:`, settingsError);
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