
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VehicleHistoryRequest {
  action: 'record_history' | 'upsert_masters' | 'detect_duplicates' | 'batch_process';
  vehicles?: any[];
  uploadHistoryId: string;
  sourceReport?: string;
}

interface VehicleHistoryEntry {
  vin?: string;
  stock_number?: string;
  gm_order_number?: string;
  make: string;
  model: string;
  year?: number;
  status: string;
  history_type: 'order' | 'inventory' | 'sale' | 'update';
  source_report: string;
  source_data: any;
  upload_history_id: string;
}

const determineHistoryType = (sourceReport: string): 'order' | 'inventory' | 'sale' | 'update' => {
  if (sourceReport.includes('order') || sourceReport === 'gm_global') {
    return 'order';
  } else if (sourceReport.includes('sale') || sourceReport.includes('financial')) {
    return 'sale';
  } else if (sourceReport.includes('inventory') || sourceReport.includes('main_view')) {
    return 'inventory';
  } else {
    return 'update';
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { action, vehicles, uploadHistoryId, sourceReport }: VehicleHistoryRequest = await req.json();

    console.log(`Processing vehicle history action: ${action} for upload: ${uploadHistoryId}`);

    switch (action) {
      case 'record_history': {
        if (!vehicles || !sourceReport) {
          throw new Error('Vehicles and sourceReport are required for record_history action');
        }

        console.log(`Recording vehicle history for ${vehicles.length} vehicles from ${sourceReport}`);
        
        const historyEntries: VehicleHistoryEntry[] = vehicles.map(vehicle => ({
          vin: vehicle.vin,
          stock_number: vehicle.stock_number,
          gm_order_number: vehicle.gm_order_number,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          status: vehicle.status,
          history_type: determineHistoryType(sourceReport),
          source_report: sourceReport,
          source_data: vehicle,
          upload_history_id: uploadHistoryId
        }));

        // Insert history entries in batches
        const batchSize = 100;
        let totalInserted = 0;
        
        for (let i = 0; i < historyEntries.length; i += batchSize) {
          const batch = historyEntries.slice(i, i + batchSize);
          
          const { error } = await supabase
            .from('vehicle_history')
            .insert(batch);
          
          if (error) {
            console.error('Error inserting vehicle history batch:', error);
            throw error;
          }
          
          totalInserted += batch.length;
        }

        console.log(`Successfully recorded ${totalInserted} vehicle history entries`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          recorded: totalInserted 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'upsert_masters': {
        if (!vehicles || !sourceReport) {
          throw new Error('Vehicles and sourceReport are required for upsert_masters action');
        }

        console.log(`Upserting ${vehicles.length} vehicle master records from ${sourceReport}`);
        
        const masterIds: string[] = [];
        
        for (const vehicle of vehicles) {
          try {
            const { data, error } = await supabase
              .rpc('upsert_vehicle_master', {
                p_vin: vehicle.vin,
                p_stock_number: vehicle.stock_number,
                p_gm_order_number: vehicle.gm_order_number,
                p_make: vehicle.make,
                p_model: vehicle.model,
                p_year: vehicle.year,
                p_status: vehicle.status,
                p_source_report: sourceReport,
                p_data: vehicle
              });

            if (error) {
              console.error('Error upserting vehicle master:', error);
              continue;
            }

            if (data) {
              masterIds.push(data);
            }
          } catch (error) {
            console.error('Error in upsert_vehicle_master:', error);
          }
        }

        console.log(`Successfully upserted ${masterIds.length} vehicle master records`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          upserted: masterIds.length,
          masterIds 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'detect_duplicates': {
        console.log(`Detecting duplicates for upload: ${uploadHistoryId}`);
        
        try {
          const { data, error } = await supabase
            .rpc('detect_vehicle_duplicates', {
              p_upload_history_id: uploadHistoryId
            });

          if (error) {
            console.error('Error detecting duplicates:', error);
            throw error;
          }

          const duplicateCount = data || 0;

          // Fetch the detected duplicates
          const { data: inventoryIds } = await supabase
            .from('inventory')
            .select('id')
            .eq('upload_history_id', uploadHistoryId);

          const inventoryIdsList = (inventoryIds || []).map(item => item.id);

          const { data: duplicates, error: fetchError } = await supabase
            .from('vehicle_duplicates')
            .select('master_vehicle_id, duplicate_inventory_id, match_type, confidence_score')
            .eq('resolved', false)
            .in('duplicate_inventory_id', inventoryIdsList);

          if (fetchError) {
            console.error('Error fetching duplicates:', fetchError);
            throw fetchError;
          }

          console.log(`Detected ${duplicateCount} duplicates`);
          
          return new Response(JSON.stringify({
            success: true,
            duplicateCount,
            duplicates: duplicates || []
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.error('Error in duplicate detection:', error);
          return new Response(JSON.stringify({
            success: false,
            duplicateCount: 0,
            duplicates: [],
            error: error.message
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'batch_process': {
        if (!vehicles || !sourceReport) {
          throw new Error('Vehicles and sourceReport are required for batch_process action');
        }

        console.log(`Starting batch processing for ${vehicles.length} vehicles`);
        
        // Step 1: Record history
        const historyEntries: VehicleHistoryEntry[] = vehicles.map(vehicle => ({
          vin: vehicle.vin,
          stock_number: vehicle.stock_number,
          gm_order_number: vehicle.gm_order_number,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          status: vehicle.status,
          history_type: determineHistoryType(sourceReport),
          source_report: sourceReport,
          source_data: vehicle,
          upload_history_id: uploadHistoryId
        }));

        // Insert history entries
        const batchSize = 100;
        let historyInserted = 0;
        
        for (let i = 0; i < historyEntries.length; i += batchSize) {
          const batch = historyEntries.slice(i, i + batchSize);
          const { error } = await supabase.from('vehicle_history').insert(batch);
          if (error) throw error;
          historyInserted += batch.length;
        }

        // Step 2: Upsert master records
        const masterIds: string[] = [];
        for (const vehicle of vehicles) {
          try {
            const { data, error } = await supabase.rpc('upsert_vehicle_master', {
              p_vin: vehicle.vin,
              p_stock_number: vehicle.stock_number,
              p_gm_order_number: vehicle.gm_order_number,
              p_make: vehicle.make,
              p_model: vehicle.model,
              p_year: vehicle.year,
              p_status: vehicle.status,
              p_source_report: sourceReport,
              p_data: vehicle
            });
            if (!error && data) masterIds.push(data);
          } catch (error) {
            console.error('Error in master upsert:', error);
          }
        }

        // Step 3: Detect duplicates
        const { data: duplicateCount } = await supabase.rpc('detect_vehicle_duplicates', {
          p_upload_history_id: uploadHistoryId
        });

        console.log(`Batch processing complete: ${historyInserted} history entries, ${masterIds.length} master records, ${duplicateCount || 0} duplicates`);
        
        return new Response(JSON.stringify({
          success: true,
          historyRecorded: historyInserted,
          masterRecordsUpserted: masterIds.length,
          duplicatesDetected: duplicateCount || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: any) {
    console.error('Error in vehicle-history-processor:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
