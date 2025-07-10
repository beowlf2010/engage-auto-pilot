import { supabase } from '@/integrations/supabase/client';
import { InventoryItem } from '@/services/inventory/types';

export interface SecureUploadResult {
  success: boolean;
  totalProcessed: number;
  successfulInserts: number;
  errors: Array<{
    rowIndex: number;
    error: string;
    details?: any;
  }>;
  message: string;
}

/**
 * Secure inventory uploader that handles authentication, RLS policies, and proper error handling
 */
export const uploadInventorySecurely = async (
  inventoryItems: InventoryItem[],
  uploadHistoryId: string
): Promise<SecureUploadResult> => {
  console.log('🔐 [SECURE UPLOADER] Starting secure inventory upload');
  
  // Verify user authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('❌ [SECURE UPLOADER] Authentication failed:', authError);
    return {
      success: false,
      totalProcessed: 0,
      successfulInserts: 0,
      errors: [{ rowIndex: -1, error: 'User authentication required for inventory upload' }],
      message: 'Authentication failed'
    };
  }

  // Verify user has proper permissions
  const { data: userRoles, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  if (roleError) {
    console.error('❌ [SECURE UPLOADER] Role check failed:', roleError);
    return {
      success: false,
      totalProcessed: 0,
      successfulInserts: 0,
      errors: [{ rowIndex: -1, error: 'Permission verification failed' }],
      message: 'Permission check failed'
    };
  }

  const hasManagerAccess = userRoles?.some(r => ['admin', 'manager'].includes(r.role));
  
  if (!hasManagerAccess) {
    console.error('❌ [SECURE UPLOADER] Insufficient permissions');
    return {
      success: false,
      totalProcessed: 0,
      successfulInserts: 0,
      errors: [{ rowIndex: -1, error: 'Manager or admin role required for inventory uploads' }],
      message: 'Insufficient permissions'
    };
  }

  console.log('✅ [SECURE UPLOADER] Authentication and permissions verified');

  let successfulInserts = 0;
  const errors: Array<{ rowIndex: number; error: string; details?: any }> = [];

  // Process items in batches to avoid overwhelming the database
  const batchSize = 50;
  const batches = [];
  
  for (let i = 0; i < inventoryItems.length; i += batchSize) {
    batches.push(inventoryItems.slice(i, i + batchSize));
  }

  console.log(`📦 [SECURE UPLOADER] Processing ${inventoryItems.length} items in ${batches.length} batches`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const batchOffset = batchIndex * batchSize;
    
    console.log(`🔄 [SECURE UPLOADER] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)`);

    try {
      // Prepare batch data with proper authentication fields
      const batchData = batch.map((item, index) => {
        // Ensure all required fields are present and properly formatted
        const preparedItem = {
          ...item,
          id: item.id || crypto.randomUUID(),
          uploaded_by: user.id,
          upload_history_id: uploadHistoryId,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Remove any undefined or null values that might cause issues
        Object.keys(preparedItem).forEach(key => {
          if (preparedItem[key as keyof typeof preparedItem] === undefined) {
            delete preparedItem[key as keyof typeof preparedItem];
          }
        });

        return preparedItem;
      });

      // Insert batch
      const { data, error } = await supabase
        .from('inventory')
        .insert(batchData)
        .select('id');

      if (error) {
        console.error(`❌ [SECURE UPLOADER] Batch ${batchIndex + 1} failed:`, error);
        
        // Try inserting items individually to identify specific failures
        for (let i = 0; i < batch.length; i++) {
          const item = batchData[i];
          const originalIndex = batchOffset + i;
          
          try {
            const { error: individualError } = await supabase
              .from('inventory')
              .insert([item])
              .select('id')
              .single();

            if (individualError) {
              errors.push({
                rowIndex: originalIndex,
                error: `Database insertion failed: ${individualError.message}`,
                details: {
                  code: individualError.code,
                  hint: individualError.hint,
                  make: item.make,
                  model: item.model,
                  vin: item.vin
                }
              });
            } else {
              successfulInserts++;
            }
          } catch (individualException) {
            errors.push({
              rowIndex: originalIndex,
              error: `Insertion exception: ${individualException instanceof Error ? individualException.message : 'Unknown error'}`,
              details: {
                make: item.make,
                model: item.model,
                vin: item.vin
              }
            });
          }
        }
      } else {
        successfulInserts += data?.length || batch.length;
        console.log(`✅ [SECURE UPLOADER] Batch ${batchIndex + 1} successful: ${data?.length || batch.length} items inserted`);
      }
    } catch (batchException) {
      console.error(`💥 [SECURE UPLOADER] Batch ${batchIndex + 1} exception:`, batchException);
      
      // Mark all items in this batch as failed
      for (let i = 0; i < batch.length; i++) {
        errors.push({
          rowIndex: batchOffset + i,
          error: `Batch processing failed: ${batchException instanceof Error ? batchException.message : 'Unknown error'}`,
          details: {
            batchIndex: batchIndex + 1,
            make: batch[i].make,
            model: batch[i].model
          }
        });
      }
    }
  }

  const totalProcessed = inventoryItems.length;
  const success = successfulInserts > 0;

  console.log(`📊 [SECURE UPLOADER] Upload complete:`, {
    totalProcessed,
    successfulInserts,
    errorCount: errors.length,
    success
  });

  return {
    success,
    totalProcessed,
    successfulInserts,
    errors,
    message: success 
      ? `Successfully uploaded ${successfulInserts}/${totalProcessed} inventory items`
      : `Upload failed: ${errors.length} errors occurred`
  };
};