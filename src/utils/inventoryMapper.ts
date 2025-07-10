
import { extractVehicleFields } from './field-extraction';
import { extractVINField } from './field-extraction';
import { extractOptionsFields } from './field-extraction';
import { extractGMGlobalFields } from './field-extraction/gmGlobalEnhanced';
import { extractVautoFields } from './field-extraction';
import { InventoryItem } from '../services/inventory/types';

// Define the upload condition type
export type UploadCondition = 'new' | 'used' | 'gm_global';

// Helper function to validate and clean vehicle data
const isValidVehicleData = (make: string, model: string): boolean => {
  const invalidValues = ['unknown', 'null', 'undefined', '', 'n/a', 'na', 'none'];
  
  const makeValid = make && 
    typeof make === 'string' && 
    make.trim().length > 0 && 
    !invalidValues.includes(make.toLowerCase().trim());
    
  const modelValid = model && 
    typeof model === 'string' && 
    model.trim().length > 0 && 
    !invalidValues.includes(model.toLowerCase().trim());
    
  return makeValid && modelValid;
};

// Helper function to clean vehicle data
const cleanVehicleData = (value: string): string | null => {
  if (!value || typeof value !== 'string') return null;
  
  const cleaned = value.trim();
  const invalidValues = ['unknown', 'null', 'undefined', '', 'n/a', 'na', 'none'];
  
  if (invalidValues.includes(cleaned.toLowerCase())) {
    return null;
  }
  
  return cleaned;
};

export const mapRowToInventoryItem = (
  row: any,
  condition: UploadCondition,
  uploadId: string
): InventoryItem => {
  console.log('=== INVENTORY MAPPING DEBUG ===');
  console.log('Condition:', condition);
  console.log('Available columns:', Object.keys(row));
  console.log('Sample row data (first 3 columns):', Object.fromEntries(Object.entries(row).slice(0, 3)));
  console.log('Raw row data sample:', { 
    firstKey: Object.keys(row)[0], 
    firstValue: Object.values(row)[0],
    secondKey: Object.keys(row)[1], 
    secondValue: Object.values(row)[1] 
  });

  let mappedData: any;
  const currentTimestamp = new Date().toISOString();

  try {
    // Determine file type and use appropriate extraction
    if (condition === 'gm_global') {
      console.log('Using GM Global extraction for comprehensive data capture');
      mappedData = extractGMGlobalFields(row);
    } else {
      // Use standard extraction methods for regular inventory files
      try {
        console.log('🔧 [INVENTORY MAPPER] Using standard field extraction');
        
        // Try vAuto-specific extraction first if this looks like a vAuto file
        const vautoData = extractVautoFields(row);
        const hasVautoData = vautoData.make && vautoData.model;
        
        console.log('🔧 [INVENTORY MAPPER] vAuto extraction result:', vautoData);
        console.log('🔧 [INVENTORY MAPPER] Has valid vAuto data:', hasVautoData);
        
        if (hasVautoData) {
          console.log('✅ [INVENTORY MAPPER] vAuto extraction successful, using as primary data:', vautoData);
          mappedData = {
            ...vautoData,
            ...extractVINField(row),
            ...extractOptionsFields(row),
            condition: condition === 'new' ? 'new' : 'used',
            status: 'available'
          };
        } else {
          console.log('🔧 [INVENTORY MAPPER] vAuto extraction failed, falling back to standard extraction');
          mappedData = {
            ...extractVehicleFields(row),
            ...extractVINField(row),
            ...extractOptionsFields(row),
            condition: condition === 'new' ? 'new' : 'used',
            status: 'available'
          };
          
          // Try to supplement with any vAuto data that was extracted
          if (Object.keys(vautoData).length > 0) {
            console.log('🔧 [INVENTORY MAPPER] Supplementing with partial vAuto data:', vautoData);
            mappedData = { ...mappedData, ...vautoData };
          }
        }

        console.log('✅ [INVENTORY MAPPER] Final extraction result:', {
          make: mappedData.make,
          model: mappedData.model,
          year: mappedData.year,
          vin: mappedData.vin,
          source: hasVautoData ? 'vAuto' : 'standard'
        });
      } catch (error) {
        console.error('💥 [INVENTORY MAPPER] Error in field extraction:', error);
        // Fallback to basic mapping
        mappedData = {
          make: row.make || row.Make || null,
          model: row.model || row.Model || null,
          condition: condition === 'new' ? 'new' : 'used',
          status: 'available'
        };
      }
    }

    // Clean and validate make/model data
    const cleanedMake = cleanVehicleData(mappedData.make);
    const cleanedModel = cleanVehicleData(mappedData.model);

    console.log('🔍 Field extraction results:');
    console.log('- Original make:', mappedData.make);
    console.log('- Original model:', mappedData.model);
    console.log('- Cleaned make:', cleanedMake);
    console.log('- Cleaned model:', cleanedModel);

    // More flexible validation for vehicle data
    if (!cleanedMake || !cleanedModel) {
      console.warn('❌ Missing essential vehicle data after cleaning:', {
        originalMake: mappedData.make,
        originalModel: mappedData.model,
        cleanedMake,
        cleanedModel,
        availableColumns: Object.keys(row),
        firstRowSample: Object.fromEntries(Object.entries(row).slice(0, 5))
      });
      
      throw new Error(`Missing essential vehicle data: make="${cleanedMake}", model="${cleanedModel}"`);
    }
    
    // Additional validation for reasonable data
    if (!isValidVehicleData(cleanedMake, cleanedModel)) {
      console.warn('❌ Invalid vehicle data detected:', {
        cleanedMake,
        cleanedModel,
        reason: 'Failed validity check'
      });
      
      throw new Error(`Invalid vehicle data: make="${cleanedMake}", model="${cleanedModel}"`);
    }

    // Determine the final condition value
    let finalCondition: 'new' | 'used' | 'certified';
    if (condition === 'gm_global') {
      finalCondition = 'new';
    } else {
      finalCondition = condition;
    }

    // Build clean inventory item without temporary ID - let database assign real UUID
    const inventoryItem: InventoryItem = {
      make: cleanedMake!,
      model: cleanedModel!,
      vin: mappedData.vin || null,
      condition: mappedData.condition || finalCondition,
      status: mappedData.status || 'available',
      upload_history_id: uploadId,
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
      // Spread other mapped data while filtering out undefined values
      ...Object.fromEntries(
        Object.entries(mappedData).filter(([key, value]) => 
          key !== 'id' && // Don't include any id field
          value !== undefined && 
          value !== null &&
          value !== ''
        )
      )
    } as InventoryItem;

    // Set source_report based on condition and data type
    if (condition === 'gm_global' || mappedData.gm_order_number) {
      inventoryItem.source_report = 'orders_all';
    } else if (condition === 'new') {
      inventoryItem.source_report = 'new_car_main_view';
    } else {
      inventoryItem.source_report = 'merch_inv_view';
    }

    // Calculate delivery variance if we have both dates
    if (inventoryItem.actual_delivery_date && inventoryItem.estimated_delivery_date) {
      try {
        const actualDate = new Date(inventoryItem.actual_delivery_date);
        const estimatedDate = new Date(inventoryItem.estimated_delivery_date);
        const diffTime = actualDate.getTime() - estimatedDate.getTime();
        inventoryItem.delivery_variance_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } catch (error) {
        console.error('Error calculating delivery variance:', error);
        inventoryItem.delivery_variance_days = null;
      }
    }

    console.log('Final mapped inventory item:', {
      make: inventoryItem.make,
      model: inventoryItem.model,
      condition: inventoryItem.condition,
      source_report: inventoryItem.source_report,
      gm_order_number: inventoryItem.gm_order_number,
      customer_name: inventoryItem.customer_name,
      estimated_delivery_date: inventoryItem.estimated_delivery_date,
      hasGMData: !!(inventoryItem.gm_order_number || inventoryItem.customer_name),
      created_at: inventoryItem.created_at,
      updated_at: inventoryItem.updated_at
    });

    return inventoryItem;
  } catch (error) {
    console.error('Critical error in mapRowToInventoryItem:', error);
    
    // Don't create invalid inventory items - let the error bubble up
    throw new Error(`Failed to map vehicle data: ${error.message}`);
  }
};
