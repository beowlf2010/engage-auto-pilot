
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface UsedInventoryAnalysis {
  totalUsedVehicles: number;
  availableUsedVehicles: number;
  soldUsedVehicles: number;
  recentUploads: Array<{
    id: string;
    filename: string;
    created_at: string;
    vehicle_count: number;
  }>;
  issuesFound: string[];
}

export const analyzeUsedInventoryIssues = async (): Promise<UsedInventoryAnalysis> => {
  try {
    console.log('🔍 Starting comprehensive used inventory analysis...');

    // Get all used vehicles by condition and status
    const { data: usedVehicles, error: usedError } = await supabase
      .from('inventory')
      .select('id, status, condition, upload_history_id, created_at, source_report, stock_number, make, model, year')
      .eq('condition', 'used');

    if (usedError) throw usedError;

    // Get recent upload history for used inventory
    const { data: recentUploads, error: uploadsError } = await supabase
      .from('upload_history')
      .select('id, original_filename, created_at, total_rows, successful_imports')
      .ilike('original_filename', '%Tommy Merch-Inv View%')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('created_at', { ascending: false });

    if (uploadsError) throw uploadsError;

    const totalUsedVehicles = usedVehicles?.length || 0;
    const availableUsedVehicles = usedVehicles?.filter(v => v.status === 'available').length || 0;
    const soldUsedVehicles = usedVehicles?.filter(v => v.status === 'sold').length || 0;

    const issuesFound: string[] = [];

    // Analyze issues
    if (totalUsedVehicles === 0) {
      issuesFound.push('No used vehicles found in inventory table');
    }

    if (availableUsedVehicles === 0 && soldUsedVehicles > 0) {
      issuesFound.push('All used vehicles are marked as sold - likely cleanup issue');
    }

    if (recentUploads && recentUploads.length > 0) {
      const latestUpload = recentUploads[0];
      const vehiclesFromLatestUpload = usedVehicles?.filter(v => v.upload_history_id === latestUpload.id).length || 0;
      
      if (latestUpload.successful_imports && latestUpload.successful_imports > 0 && vehiclesFromLatestUpload === 0) {
        issuesFound.push(`Latest upload (${latestUpload.original_filename}) shows ${latestUpload.successful_imports} imports but no vehicles found in inventory`);
      }
    }

    console.log(`📊 Analysis complete: ${totalUsedVehicles} total, ${availableUsedVehicles} available, ${soldUsedVehicles} sold`);
    console.log('🚨 Issues found:', issuesFound);

    return {
      totalUsedVehicles,
      availableUsedVehicles,
      soldUsedVehicles,
      recentUploads: recentUploads?.map(upload => ({
        id: upload.id,
        filename: upload.original_filename || 'Unknown',
        created_at: upload.created_at,
        vehicle_count: upload.successful_imports || 0
      })) || [],
      issuesFound
    };
  } catch (error) {
    console.error('Error analyzing used inventory:', error);
    throw error;
  }
};

export const restoreUsedInventoryFromRecentUploads = async () => {
  try {
    console.log('🔧 Starting used inventory restoration...');
    
    // Find recent Tommy Merch-Inv View uploads (last 3 days)
    const { data: recentUploads, error: uploadsError } = await supabase
      .from('upload_history')
      .select('id, original_filename, created_at, successful_imports')
      .ilike('original_filename', '%Tommy Merch-Inv View%')
      .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (uploadsError) throw uploadsError;

    if (!recentUploads || recentUploads.length === 0) {
      console.log('No recent Tommy Merch-Inv View uploads found');
      return { restored: 0, message: 'No recent uploads found to restore from' };
    }

    console.log(`Found ${recentUploads.length} recent uploads to check`);

    let totalRestored = 0;
    const restoredVehicles: any[] = [];

    for (const upload of recentUploads) {
      console.log(`Checking upload: ${upload.original_filename} (${upload.id})`);
      
      // Find vehicles from this upload that are currently marked as sold
      const { data: soldVehicles, error: soldError } = await supabase
        .from('inventory')
        .select('id, stock_number, make, model, year, status, condition')
        .eq('upload_history_id', upload.id)
        .eq('status', 'sold')
        .eq('condition', 'used');

      if (soldError) {
        console.error(`Error finding sold vehicles for upload ${upload.id}:`, soldError);
        continue;
      }

      if (soldVehicles && soldVehicles.length > 0) {
        console.log(`Found ${soldVehicles.length} sold vehicles to restore from upload ${upload.original_filename}`);
        
        // Restore these vehicles to available status
        const vehicleIds = soldVehicles.map(v => v.id);
        
        const { data: restored, error: restoreError } = await supabase
          .from('inventory')
          .update({
            status: 'available',
            sold_at: null,
            updated_at: new Date().toISOString()
          })
          .in('id', vehicleIds)
          .select('id, stock_number, make, model, year');

        if (restoreError) {
          console.error(`Error restoring vehicles from upload ${upload.id}:`, restoreError);
          continue;
        }

        if (restored) {
          totalRestored += restored.length;
          restoredVehicles.push(...restored);
          console.log(`✅ Restored ${restored.length} vehicles from ${upload.original_filename}`);
        }
      }
    }

    const message = totalRestored > 0 
      ? `Successfully restored ${totalRestored} used vehicles to available status`
      : 'No vehicles needed restoration';

    console.log(`🎉 Restoration complete: ${totalRestored} vehicles restored`);

    return {
      restored: totalRestored,
      vehicles: restoredVehicles,
      message
    };
  } catch (error) {
    console.error('Error restoring used inventory:', error);
    throw error;
  }
};

export const validateUploadProcessing = async (uploadId: string) => {
  try {
    console.log(`🔍 Validating upload processing for ${uploadId}...`);
    
    // Check upload history record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from('upload_history')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (uploadError) throw uploadError;

    // Check vehicles actually inserted
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('inventory')
      .select('id, status, condition')
      .eq('upload_history_id', uploadId);

    if (vehiclesError) throw vehiclesError;

    const validation = {
      uploadRecord,
      actualVehicleCount: vehicles?.length || 0,
      reportedSuccessfulImports: uploadRecord.successful_imports || 0,
      mismatch: (uploadRecord.successful_imports || 0) !== (vehicles?.length || 0),
      availableVehicles: vehicles?.filter(v => v.status === 'available').length || 0,
      soldVehicles: vehicles?.filter(v => v.status === 'sold').length || 0
    };

    console.log('📋 Upload validation result:', validation);
    
    return validation;
  } catch (error) {
    console.error('Error validating upload processing:', error);
    throw error;
  }
};
