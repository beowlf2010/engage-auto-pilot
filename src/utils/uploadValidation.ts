
import { supabase } from "@/integrations/supabase/client";
import { InventoryItem } from "@/services/inventory/types";

export interface ValidationResult {
  successCount: number;
  errorCount: number;
  errors: string[];
  insertedVehicleIds: string[];
}

export const validateAndProcessInventoryRows = async (
  rows: any[],
  condition: 'new' | 'used' | 'gm_global',
  uploadHistoryId: string,
  mapRowToInventoryItem: (row: any, condition: string, uploadHistoryId: string) => InventoryItem
): Promise<ValidationResult> => {
  const errors: string[] = [];
  const insertedVehicleIds: string[] = [];
  let successCount = 0;
  let errorCount = 0;

  console.log(`🔄 Processing ${rows.length} rows for ${condition} inventory...`);

  // Process in smaller batches to avoid memory issues and get better error handling
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(rows.length/batchSize)}`);

    try {
      const vehiclesToInsert: InventoryItem[] = [];
      
      for (const [index, row] of batch.entries()) {
        try {
          const vehicle = mapRowToInventoryItem(row, condition, uploadHistoryId);
          
          // Enhanced validation
          if (!vehicle.make || !vehicle.model) {
            errors.push(`Row ${i + index + 1}: Missing required make or model`);
            errorCount++;
            continue;
          }

          // Ensure required fields have proper defaults
          const processedVehicle = {
            ...vehicle,
            status: vehicle.status || 'available',
            condition: vehicle.condition || (condition === 'gm_global' ? 'new' : condition),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          vehiclesToInsert.push(processedVehicle);
        } catch (error) {
          console.error(`Error processing row ${i + index + 1}:`, error);
          errors.push(`Row ${i + index + 1}: ${error instanceof Error ? error.message : 'Processing error'}`);
          errorCount++;
        }
      }

      if (vehiclesToInsert.length > 0) {
        // Insert batch with explicit error handling
        const { data, error } = await supabase
          .from('inventory')
          .insert(vehiclesToInsert)
          .select('id');

        if (error) {
          console.error('Supabase insertion error:', error);
          
          // Handle specific database errors
          if (error.message?.includes('column') && error.message?.includes('does not exist')) {
            const missingColumn = error.message.match(/column "([^"]+)" does not exist/)?.[1];
            errors.push(`Database schema error: Column "${missingColumn}" missing. Contact admin.`);
          } else if (error.message?.includes('duplicate key')) {
            errors.push(`Duplicate vehicle found in batch ${Math.floor(i/batchSize) + 1}`);
          } else {
            errors.push(`Database error in batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
          }
          
          errorCount += vehiclesToInsert.length;
          continue;
        }

        if (data && data.length > 0) {
          successCount += data.length;
          insertedVehicleIds.push(...data.map(item => item.id));
          console.log(`✅ Successfully inserted ${data.length} vehicles in batch ${Math.floor(i/batchSize) + 1}`);
        } else {
          console.warn(`⚠️ Batch ${Math.floor(i/batchSize) + 1}: No data returned from insert`);
          errorCount += vehiclesToInsert.length;
          errors.push(`Batch ${Math.floor(i/batchSize) + 1}: Insert succeeded but no IDs returned`);
        }
      }

    } catch (error) {
      console.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
      errors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      errorCount += batch.length;
    }
  }

  console.log(`📊 Validation complete: ${successCount} success, ${errorCount} errors`);
  console.log(`🆔 Inserted vehicle IDs: ${insertedVehicleIds.length}`);

  return {
    successCount,
    errorCount,
    errors,
    insertedVehicleIds
  };
};
