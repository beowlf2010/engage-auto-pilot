
import { supabase } from "@/integrations/supabase/client";
import { InventoryItem } from "@/services/inventory/types";

export interface ValidationResult {
  successCount: number;
  errorCount: number;
  errors: string[];
  insertedVehicleIds: string[];
}

interface ContextValidation {
  valid: boolean;
  error?: string;
  user_id?: string;
  user_email?: string;
  user_roles?: string[];
  message?: string;
}

interface InsertionResult {
  success: boolean;
  inserted_count: number;
  error_count: number;
  errors: Array<{
    vehicle_index: number;
    error: string;
    sqlstate: string;
    vehicle_data: any;
  }>;
  total_processed: number;
  message: string;
  error?: string;
}

export const validateAndProcessInventoryRows = async (
  rows: any[],
  condition: 'new' | 'used' | 'gm_global',
  uploadHistoryId: string,
  mapRowToInventoryItem: (row: any, condition: 'new' | 'used' | 'gm_global', uploadHistoryId: string) => Promise<InventoryItem>,
  userId?: string
): Promise<ValidationResult> => {
  const errors: string[] = [];
  const insertedVehicleIds: string[] = [];
  let successCount = 0;
  let errorCount = 0;

  console.log(`🔄 Processing ${rows.length} rows for ${condition} inventory...`);

  // First, validate upload context if user ID is provided
  if (userId) {
    console.log(`🔐 Validating upload context for user: ${userId}`);
    
    try {
      const { data: contextValidation, error: contextError } = await supabase
        .rpc('validate_upload_context', { p_user_id: userId });

      if (contextError) {
        console.error('🚨 Context validation error:', contextError);
        errors.push(`Authentication error: ${contextError.message}`);
        return { successCount: 0, errorCount: 1, errors, insertedVehicleIds };
      }

      const validation = contextValidation as unknown as ContextValidation;
      if (!validation?.valid) {
        console.error('🚨 Invalid upload context:', validation);
        errors.push(`Upload permission denied: ${validation?.error || 'Unknown error'}`);
        return { successCount: 0, errorCount: 1, errors, insertedVehicleIds };
      }

      console.log(`✅ Upload context validated for user:`, contextValidation);
    } catch (error) {
      console.error('🚨 Context validation failed:', error);
      errors.push(`Context validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { successCount: 0, errorCount: 1, errors, insertedVehicleIds };
    }
  } else {
    console.warn('⚠️ No user ID provided for context validation - using legacy method');
  }

  // Process vehicles in batches
  const batchSize = 50;
  const totalBatches = Math.ceil(rows.length / batchSize);
  
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} vehicles)`);

    try {
      const vehiclesToInsert: any[] = [];
      
      // Process each row in the batch with detailed logging
      for (const [index, row] of batch.entries()) {
        console.log(`🔄 Processing CSV row ${i + index + 1}:`, Object.keys(row));
        try {
          const vehicle = await mapRowToInventoryItem(row, condition, uploadHistoryId);
          
          // Enhanced validation with detailed logging
          console.log(`🔍 Processing row ${i + index + 1}:`, { make: vehicle.make, model: vehicle.model, vin: vehicle.vin });
          
          if (!vehicle.make || !vehicle.model) {
            console.error(`❌ Row ${i + index + 1}: Missing essential vehicle data - make: "${vehicle.make}", model: "${vehicle.model}"`);
            errors.push(`Row ${i + index + 1}: Missing required make ("${vehicle.make}") or model ("${vehicle.model}")`);
            errorCount++;
            continue;
          }

          // Prepare vehicle data for security definer function - only include defined values
          const vehicleData = {
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year || 2024,
            vin: vehicle.vin,
            stock_number: vehicle.stock_number,
            condition: vehicle.condition || (condition === 'gm_global' ? 'new' : condition),
            status: vehicle.status || 'available',
            price: vehicle.price || 0,
            mileage: vehicle.mileage || 0,
            body_style: vehicle.body_style,
            transmission: vehicle.transmission,
            engine: vehicle.engine,
            fuel_type: vehicle.fuel_type,
            drivetrain: vehicle.drivetrain,
            trim: vehicle.trim,
            msrp: vehicle.msrp || 0,
            days_in_inventory: vehicle.days_in_inventory || 0,
            notes: (vehicle as any).notes,
            rpo_codes: vehicle.rpo_codes,
            source_report: vehicle.source_report || 'uploaded',
            gm_order_number: vehicle.gm_order_number,
            customer_name: vehicle.customer_name,
            estimated_delivery_date: vehicle.estimated_delivery_date,
            actual_delivery_date: vehicle.actual_delivery_date,
            delivery_variance_days: vehicle.delivery_variance_days || 0,
            created_at: vehicle.created_at || new Date().toISOString(),
            updated_at: vehicle.updated_at || new Date().toISOString()
          };

          // Filter out undefined values to prevent database insertion errors
          const processedVehicle = Object.fromEntries(
            Object.entries(vehicleData).filter(([key, value]) => value !== undefined)
          );

          vehiclesToInsert.push(processedVehicle);
          
        } catch (error) {
          console.error(`Error processing row ${i + index + 1}:`, error);
          errors.push(`Row ${i + index + 1}: ${error instanceof Error ? error.message : 'Processing error'}`);
          errorCount++;
        }
      }

      if (vehiclesToInsert.length > 0) {
        console.log(`🔄 Inserting ${vehiclesToInsert.length} vehicles using security definer function`);
        
        try {
          // Use the security definer function for reliable insertion
          const { data: insertionResult, error: insertionError } = await supabase
            .rpc('insert_inventory_with_context', {
              p_vehicles: vehiclesToInsert,
              p_upload_history_id: uploadHistoryId,
              p_user_id: userId
            });

          if (insertionError) {
            console.error('🚨 Security definer insertion error:', insertionError);
            errors.push(`Batch ${batchNumber} insertion failed: ${insertionError.message}`);
            errorCount += vehiclesToInsert.length;
          } else if (insertionResult) {
            console.log(`✅ Batch ${batchNumber} insertion result:`, insertionResult);
            
            const result = insertionResult as unknown as InsertionResult;
            if (result.success) {
              successCount += result.inserted_count;
              
              // Note: Security definer function doesn't return IDs, so we can't track them individually
              // This is acceptable since the main goal is successful insertion
              console.log(`✅ Successfully inserted ${result.inserted_count} vehicles in batch ${batchNumber}`);
              
              if (result.error_count > 0) {
                errorCount += result.error_count;
                errors.push(`Batch ${batchNumber}: ${result.error_count} vehicles failed during insertion`);
                
                // Add specific errors if available
                if (result.errors && Array.isArray(result.errors)) {
                  result.errors.forEach((err) => {
                    const errorDetails = typeof err === 'object' && err !== null ? 
                      `${err.error || 'Database error'} (SQLSTATE: ${err.sqlstate || 'unknown'})` : 
                      String(err);
                    errors.push(`Batch ${batchNumber}, Vehicle ${err.vehicle_index || 'unknown'}: ${errorDetails}`);
                    console.error(`❌ Vehicle insertion error:`, err);
                  });
                }
              }
            } else {
              console.error(`❌ Batch ${batchNumber} insertion failed:`, result);
              // Show detailed error information instead of generic message
              const detailedError = result.error || 'Unknown insertion error';
              errors.push(`Batch ${batchNumber}: ${detailedError}`);
              errorCount += vehiclesToInsert.length;
              
              // Also log specific errors if available
              if (result.errors && Array.isArray(result.errors)) {
                result.errors.forEach((err) => {
                  const errorDetails = typeof err === 'object' && err !== null ? 
                    `${err.error || 'Database error'} (SQLSTATE: ${err.sqlstate || 'unknown'})` : 
                    String(err);
                  errors.push(`Batch ${batchNumber}, Vehicle ${err.vehicle_index || 'unknown'}: ${errorDetails}`);
                  console.error(`❌ Individual vehicle error:`, err);
                });
              }
            }
          } else {
            console.error(`❌ Batch ${batchNumber}: No result returned from insertion function`);
            errors.push(`Batch ${batchNumber}: No result returned from insertion function`);
            errorCount += vehiclesToInsert.length;
          }
          
        } catch (functionError) {
          console.error(`🚨 Function call error for batch ${batchNumber}:`, functionError);
          errors.push(`Batch ${batchNumber}: Function call failed - ${functionError instanceof Error ? functionError.message : 'Unknown error'}`);
          errorCount += vehiclesToInsert.length;
        }
      }

    } catch (batchError) {
      console.error(`Batch ${batchNumber} processing failed:`, batchError);
      errors.push(`Batch ${batchNumber}: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`);
      errorCount += batch.length;
    }
  }

  console.log(`📊 Validation complete: ${successCount} success, ${errorCount} errors`);
  console.log(`🆔 Inserted vehicle count: ${successCount}`);

  return {
    successCount,
    errorCount,
    errors,
    insertedVehicleIds // Will be empty since security definer function doesn't return IDs
  };
};
