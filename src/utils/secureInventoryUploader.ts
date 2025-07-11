import { supabase } from '@/integrations/supabase/client';
import { InventoryItem } from '@/services/inventory/types';

interface DatabaseInsertResult {
  success: boolean;
  inserted_count: number;
  total_count: number;
  error?: string;
  error_details?: Array<{
    vehicle_index: number;
    error: string;
    sqlstate: string;
    vehicle_data: any;
  }>;
}

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

  // Prepare inventory data with comprehensive validation and formatting
  const preparedVehicles = inventoryItems.map((item, index) => {
    try {
      // Validate required fields
      if (!item.make || !item.model || !item.year) {
        throw new Error(`Missing required fields: make, model, or year at row ${index + 1}`);
      }

      // Ensure year is a valid number
      const year = parseInt(String(item.year));
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 2) {
        throw new Error(`Invalid year: ${item.year} at row ${index + 1}`);
      }

      // Clean and format the vehicle data
      return {
        id: item.id || crypto.randomUUID(),
        make: String(item.make).trim(),
        model: String(item.model).trim(),
        year: year,
        vin: item.vin ? String(item.vin).trim().toUpperCase() : null,
        stock_number: item.stock_number ? String(item.stock_number).trim() : null,
        price: item.price ? parseFloat(String(item.price)) : null,
        mileage: item.mileage ? parseInt(String(item.mileage)) : null,
        condition: item.condition || 'used',
        color_exterior: item.exterior_color ? String(item.exterior_color).trim() : null,
        color_interior: item.interior_color ? String(item.interior_color).trim() : null,
        transmission: item.transmission ? String(item.transmission).trim() : null,
        drivetrain: item.drivetrain ? String(item.drivetrain).trim() : null,
        fuel_type: item.fuel_type ? String(item.fuel_type).trim() : null,
        body_style: item.body_style ? String(item.body_style).trim() : null,
        engine: item.engine ? String(item.engine).trim() : null,
        trim: item.trim ? String(item.trim).trim() : null,
        status: item.status || 'available',
        upload_history_id: uploadHistoryId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (validationError) {
      console.error(`🚫 [SECURE UPLOADER] Validation error for item ${index}:`, validationError);
      throw validationError;
    }
  });

  console.log(`🔐 [SECURE UPLOADER] Starting direct insertion for ${preparedVehicles.length} vehicles`);
  console.log('🔐 [SECURE UPLOADER] Current user:', user.id);
  console.log('🔐 [SECURE UPLOADER] Upload history ID:', uploadHistoryId);
  console.log('🔐 [SECURE UPLOADER] Sample prepared vehicle:', preparedVehicles[0]);

  // Use direct database insertion with proper error handling
  let successfulInserts = 0;
  const errors: Array<{ rowIndex: number; error: string; details?: any }> = [];

  // Process vehicles in batches for better performance and error isolation
  const batchSize = 10;
  for (let i = 0; i < preparedVehicles.length; i += batchSize) {
    const batch = preparedVehicles.slice(i, i + batchSize);
    console.log(`🔄 [SECURE UPLOADER] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(preparedVehicles.length / batchSize)}`);

    for (let j = 0; j < batch.length; j++) {
      const vehicle = batch[j];
      const globalIndex = i + j;
      
      try {
        console.log(`⚡ [SECURE UPLOADER] Inserting vehicle ${globalIndex + 1}:`, {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          stock_number: vehicle.stock_number,
          vin: vehicle.vin
        });

        const { error: insertError, data: insertedData } = await supabase
          .from('inventory')
          .insert(vehicle)
          .select('id')
          .single();

        if (insertError) {
          console.error(`🚫 [SECURE UPLOADER] Insert error for vehicle ${globalIndex + 1}:`, insertError);
          
          let userFriendlyError = insertError.message;
          if (insertError.code === '23505') {
            userFriendlyError = `Duplicate vehicle detected (VIN or Stock Number already exists)`;
          } else if (insertError.code === '23502') {
            userFriendlyError = `Missing required field`;
          } else if (insertError.message.includes('violates row-level security')) {
            userFriendlyError = `Permission denied: insufficient privileges to insert inventory`;
          }

          errors.push({
            rowIndex: globalIndex + 1,
            error: userFriendlyError,
            details: {
              code: insertError.code,
              hint: insertError.hint,
              details: insertError.details,
              vehicle: {
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                stock_number: vehicle.stock_number
              }
            }
          });
        } else {
          successfulInserts++;
          console.log(`✅ [SECURE UPLOADER] Successfully inserted vehicle ${globalIndex + 1} with ID:`, insertedData?.id);
        }
      } catch (err) {
        console.error(`💥 [SECURE UPLOADER] Exception for vehicle ${globalIndex + 1}:`, err);
        errors.push({
          rowIndex: globalIndex + 1,
          error: err instanceof Error ? err.message : 'Unknown error occurred',
          details: {
            exception: err,
            vehicle: {
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year,
              stock_number: vehicle.stock_number
            }
          }
        });
      }
    }

    // Small delay between batches to avoid overwhelming the database
    if (i + batchSize < preparedVehicles.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const totalProcessed = inventoryItems.length;
  const success = successfulInserts > 0;
  const errorCount = errors.length;

  console.log(`📊 [SECURE UPLOADER] Upload complete:`, {
    totalProcessed,
    successfulInserts,
    errorCount,
    successRate: `${Math.round((successfulInserts / totalProcessed) * 100)}%`
  });

  // Update upload history with results
  if (uploadHistoryId) {
    try {
      await supabase
        .from('upload_history')
        .update({
          successful_imports: successfulInserts,
          failed_imports: errorCount,
          processing_status: success ? 'completed' : 'completed_with_errors',
          error_details: errorCount > 0 ? `${errorCount} vehicles failed to import` : null
        })
        .eq('id', uploadHistoryId);
    } catch (updateError) {
      console.error('🚫 [SECURE UPLOADER] Failed to update upload history:', updateError);
    }
  }

  return {
    success,
    totalProcessed,
    successfulInserts,
    errors,
    message: success 
      ? `Successfully uploaded ${successfulInserts}/${totalProcessed} vehicles${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
      : `Upload failed: ${errorCount} errors occurred`
  };
};

/**
 * Fallback method for direct insertion when RPC fails
 */
async function fallbackDirectInsertion(
  preparedVehicles: any[],
  uploadHistoryId: string,
  userId: string
): Promise<SecureUploadResult> {
  console.log('🔄 [FALLBACK] Starting direct insertion for', preparedVehicles.length, 'vehicles');
  
  let successfulInserts = 0;
  const errors: Array<{ rowIndex: number; error: string; details?: any }> = [];
  
  for (let i = 0; i < preparedVehicles.length; i++) {
    const vehicle = preparedVehicles[i];
    try {
      const { error: insertError } = await supabase
        .from('inventory')
        .insert({
          ...vehicle,
          upload_history_id: uploadHistoryId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (insertError) {
        console.error(`🚫 [FALLBACK] Insert error for vehicle ${i}:`, insertError);
        errors.push({
          rowIndex: i,
          error: insertError.message,
          details: insertError
        });
      } else {
        successfulInserts++;
      }
    } catch (err) {
      console.error(`💥 [FALLBACK] Exception for vehicle ${i}:`, err);
      errors.push({
        rowIndex: i,
        error: err instanceof Error ? err.message : 'Unknown error',
        details: err
      });
    }
  }
  
  console.log(`✅ [FALLBACK] Completed: ${successfulInserts}/${preparedVehicles.length} successful`);
  
  return {
    success: successfulInserts > 0,
    totalProcessed: preparedVehicles.length,
    successfulInserts,
    errors,
    message: `Fallback insertion: ${successfulInserts}/${preparedVehicles.length} vehicles uploaded`
  };
}