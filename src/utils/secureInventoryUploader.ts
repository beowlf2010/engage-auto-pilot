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

  let successfulInserts = 0;
  const errors: Array<{ rowIndex: number; error: string; details?: any }> = [];

  // Prepare inventory data for the secure database function
  const preparedVehicles = inventoryItems.map(item => ({
    id: item.id || crypto.randomUUID(),
    make: item.make,
    model: item.model,
    year: item.year,
    vin: item.vin,
    stock_number: item.stock_number,
    price: item.price,
    mileage: item.mileage,
    condition: item.condition || 'used',
    exterior_color: item.exterior_color,
    interior_color: item.interior_color,
    transmission: item.transmission,
    drivetrain: item.drivetrain,
    fuel_type: item.fuel_type,
    body_style: item.body_style,
    engine: item.engine,
    trim_level: item.trim,
    status: item.status || 'available'
  }));

  console.log(`🔐 [SECURE UPLOADER] Calling secure database function for ${preparedVehicles.length} vehicles`);
  console.log('🔐 [SECURE UPLOADER] Current user:', user.id);
  console.log('🔐 [SECURE UPLOADER] Session exists:', !!supabase.auth.getSession());

  // Use the secure database function with explicit authentication context
  const { data: result, error } = await supabase.rpc('insert_inventory_secure', {
    p_vehicles: preparedVehicles,
    p_upload_history_id: uploadHistoryId
  });

  if (error) {
    console.error('💥 [SECURE UPLOADER] Database function error:', error);
    
    // Provide specific error messages for different types of failures
    let errorMessage = error.message;
    if (error.message.includes('permission') || error.message.includes('role')) {
      errorMessage = 'Permission denied: You need manager, admin, or sales role to upload inventory. Please contact your administrator.';
    }
    
    return {
      success: false,
      totalProcessed: inventoryItems.length,
      successfulInserts: 0,
      errors: [{ rowIndex: -1, error: errorMessage, details: error }],
      message: 'Database insertion failed'
    };
  }

  if (!result) {
    return {
      success: false,
      totalProcessed: inventoryItems.length,
      successfulInserts: 0,
      errors: [{ rowIndex: -1, error: 'No result returned from database function' }],
      message: 'Database insertion failed'
    };
  }

  console.log('✅ [SECURE UPLOADER] Database function result:', result);

  // Type cast the result to our expected interface
  const insertResult = result as unknown as DatabaseInsertResult;

  // Process the result
  successfulInserts = insertResult.inserted_count || 0;
  
  // Convert error details from the database function
  if (insertResult.error_details && Array.isArray(insertResult.error_details)) {
    insertResult.error_details.forEach((errorDetail: any) => {
      errors.push({
        rowIndex: errorDetail.vehicle_index || -1,
        error: errorDetail.error || 'Unknown database error',
        details: {
          sqlstate: errorDetail.sqlstate,
          vehicle_data: errorDetail.vehicle_data
        }
      });
    });
  }

  // Handle permission errors specifically
  if (insertResult.error && (insertResult.error.includes('permission') || insertResult.error.includes('role'))) {
    return {
      success: false,
      totalProcessed: inventoryItems.length,
      successfulInserts: 0,
      errors: [{ 
        rowIndex: -1, 
        error: 'Permission denied: You need manager, admin, or sales role to upload inventory. Please contact your administrator.',
        details: insertResult 
      }],
      message: 'Permission denied'
    };
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