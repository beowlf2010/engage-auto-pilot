
import { supabase } from "@/integrations/supabase/client";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  successCount: number;
  errorCount: number;
}

export const validateAndProcessInventoryRows = async (
  rows: any[], 
  condition: 'new' | 'used' | 'gm_global',
  uploadHistoryId: string,
  mapRowToInventoryItem: (row: any, condition: 'new' | 'used' | 'gm_global', uploadId: string) => any
): Promise<ValidationResult> => {
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      console.log(`\n=== Processing Row ${i + 1} ===`);
      
      const inventoryItem = mapRowToInventoryItem(row, condition, uploadHistoryId);
      console.log(`Row ${i + 1} mapped result:`, { 
        vin: inventoryItem.vin, 
        make: inventoryItem.make, 
        model: inventoryItem.model,
        year: inventoryItem.year,
        stock_number: inventoryItem.stock_number
      });

      // Enhanced validation with special handling for GM Global orders
      const isGmGlobal = condition === 'gm_global';
      const hasValidVin = inventoryItem.vin && inventoryItem.vin.length >= 10;
      const hasValidStockNumber = inventoryItem.stock_number && inventoryItem.stock_number.length > 0;

      // For GM Global, allow records without VIN if they have a stock/order number
      if (!hasValidVin && (!isGmGlobal || !hasValidStockNumber)) {
        const availableFields = Object.keys(row).filter(key => {
          const value = row[key];
          return value && String(value).trim().length >= 10 && /[A-Z0-9]/.test(String(value));
        });
        
        if (isGmGlobal) {
          errors.push(`Row ${i + 1}: GM Global order missing both VIN and Order Number. Need at least one identifier. Available potential fields: ${availableFields.join(', ') || 'none'}`);
        } else {
          errors.push(`Row ${i + 1}: Invalid or missing VIN "${inventoryItem.vin}" (VIN must be at least 10 characters). Potential VIN fields found: ${availableFields.join(', ') || 'none'}`);
        }
        errorCount++;
        continue;
      }

      if (!inventoryItem.make || inventoryItem.make.length < 1) {
        const makeHints = Object.keys(row).filter(key => 
          key.toLowerCase().includes('make') || 
          key.toLowerCase().includes('brand') || 
          key.toLowerCase().includes('manufacturer') ||
          key.toLowerCase().includes('division')
        );
        errors.push(`Row ${i + 1}: Missing Make field. Potential make fields: ${makeHints.join(', ') || 'none found'}. All available fields: ${Object.keys(row).slice(0, 10).join(', ')}${Object.keys(row).length > 10 ? '...' : ''}`);
        errorCount++;
        continue;
      }

      if (!inventoryItem.model || inventoryItem.model.length < 1) {
        const modelHints = Object.keys(row).filter(key => 
          key.toLowerCase().includes('model') || 
          key.toLowerCase().includes('product') ||
          key.toLowerCase().includes('series')
        );
        errors.push(`Row ${i + 1}: Missing Model field. Potential model fields: ${modelHints.join(', ') || 'none found'}. All available fields: ${Object.keys(row).slice(0, 10).join(', ')}${Object.keys(row).length > 10 ? '...' : ''}`);
        errorCount++;
        continue;
      }

      // Enhanced upsert logic to handle both VIN and stock_number conflicts
      let upsertResult;
      
      if (isGmGlobal && !hasValidVin && hasValidStockNumber) {
        console.log(`Row ${i + 1}: Using stock_number "${inventoryItem.stock_number}" as identifier for GM Global order without VIN`);
        
        // For GM Global orders without VIN, check if stock_number already exists
        const { data: existingByStock } = await supabase
          .from('inventory')
          .select('id')
          .eq('stock_number', inventoryItem.stock_number)
          .maybeSingle();

        if (existingByStock) {
          // Update existing record
          upsertResult = await supabase
            .from('inventory')
            .update(inventoryItem)
            .eq('stock_number', inventoryItem.stock_number)
            .select();
        } else {
          // Insert new record
          upsertResult = await supabase
            .from('inventory')
            .insert(inventoryItem)
            .select();
        }
      } else if (hasValidVin) {
        // Regular VIN-based upsert (only when VIN is not null)
        const { data: existingByVin } = await supabase
          .from('inventory')
          .select('id')
          .eq('vin', inventoryItem.vin)
          .maybeSingle();

        if (existingByVin) {
          // Update existing record
          upsertResult = await supabase
            .from('inventory')
            .update(inventoryItem)
            .eq('vin', inventoryItem.vin)
            .select();
        } else {
          // Insert new record
          upsertResult = await supabase
            .from('inventory')
            .insert(inventoryItem)
            .select();
        }
      } else {
        // This should not happen due to validation above, but handle gracefully
        errors.push(`Row ${i + 1}: No valid identifier found (VIN or Order Number)`);
        errorCount++;
        continue;
      }

      if (upsertResult.error) {
        errors.push(`Row ${i + 1}: Database error for ${hasValidVin ? `VIN ${inventoryItem.vin}` : `Order ${inventoryItem.stock_number}`}: ${upsertResult.error.message}`);
        errorCount++;
      } else {
        successCount++;
        console.log(`✓ Row ${i + 1} successfully imported: ${inventoryItem.make} ${inventoryItem.model} ${hasValidVin ? `(VIN: ${inventoryItem.vin})` : `(Order: ${inventoryItem.stock_number})`}`);
      }
    } catch (error) {
      console.error(`Error processing row ${i + 1}:`, error);
      errors.push(`Row ${i + 1}: Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      errorCount++;
    }
  }

  return {
    isValid: errorCount === 0,
    errors,
    successCount,
    errorCount
  };
};
