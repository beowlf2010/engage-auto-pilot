
import { InventoryItem } from '../services/inventory/types';
import { extractVehicleFields, extractVINField, extractOptionsFields, extractVautoFields } from './field-extraction';
import { extractGMGlobalFields } from './field-extraction/gmGlobalEnhanced';
import { parseDate } from './field-extraction/core';
import { supabase } from '@/integrations/supabase/client';

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

export const mapRowToInventoryItem = async (
  row: any,
  condition: UploadCondition,
  uploadId: string
): Promise<InventoryItem> => {
  console.log('🔧 [INVENTORY MAPPER] === ENHANCED INVENTORY MAPPING ===');
  console.log('🔧 [INVENTORY MAPPER] Upload condition:', condition);
  console.log('🔧 [INVENTORY MAPPER] Available columns:', Object.keys(row));
  console.log('🔧 [INVENTORY MAPPER] Sample row data:', Object.fromEntries(Object.entries(row).slice(0, 3)));

  // Pre-validation: Check if this row contains valid vehicle data
  if (!isValidVehicleDataRow(row)) {
    console.error('❌ [INVENTORY MAPPER] Row validation failed - not vehicle data:', row);
    throw new Error('Invalid vehicle data row - appears to be headers or metadata');
  }

  let mappedData: any;
  const currentTimestamp = new Date().toISOString();

  try {
    // Determine file type and use appropriate extraction
    if (condition === 'gm_global') {
      console.log('🔧 [INVENTORY MAPPER] Using GM Global extraction');
      mappedData = extractGMGlobalFields(row);
    } else {
      console.log('🔧 [INVENTORY MAPPER] Using standard field extraction');
      
      // Try vAuto-specific extraction first if this looks like a vAuto file
      const vautoData = extractVautoFields(row);
      const hasVautoData = vautoData.make && vautoData.model;
      
      console.log('🔧 [INVENTORY MAPPER] vAuto extraction result:', {
        make: vautoData.make,
        model: vautoData.model,
        hasValidData: hasVautoData
      });
      
      if (hasVautoData) {
        console.log('✅ [INVENTORY MAPPER] Using vAuto extraction');
        mappedData = {
          ...vautoData,
          ...extractVINField(row),
          ...extractOptionsFields(row),
          condition: condition === 'new' ? 'new' : 'used',
          status: 'available'
        };
      } else {
        console.log('🔧 [INVENTORY MAPPER] Using standard field extraction');
        mappedData = {
          ...extractVehicleFields(row),
          ...extractVINField(row),
          ...extractOptionsFields(row),
          condition: condition === 'new' ? 'new' : 'used',
          status: 'available'
        };
        
        // Try to supplement with any vAuto data that was extracted
        if (Object.keys(vautoData).length > 0) {
          mappedData = { ...mappedData, ...vautoData };
        }
      }
    }

    console.log('🔧 [INVENTORY MAPPER] Raw extraction result:', {
      make: mappedData.make,
      model: mappedData.model,
      year: mappedData.year,
      vin: mappedData.vin
    });

    // Clean and validate make/model data
    const cleanedMake = cleanVehicleData(mappedData.make);
    const cleanedModel = cleanVehicleData(mappedData.model);

    console.log('🔍 [INVENTORY MAPPER] Data cleaning results:', {
      originalMake: mappedData.make,
      originalModel: mappedData.model,
      cleanedMake,
      cleanedModel
    });

    // Validate essential vehicle data
    if (!cleanedMake || !cleanedModel) {
      console.error('❌ [INVENTORY MAPPER] Missing essential vehicle data:', {
        cleanedMake,
        cleanedModel,
        availableColumns: Object.keys(row),
        sampleData: Object.fromEntries(Object.entries(row).slice(0, 5))
      });
      
      throw new Error(`Missing essential vehicle data: make="${cleanedMake}", model="${cleanedModel}"`);
    }
    
    if (!isValidVehicleData(cleanedMake, cleanedModel)) {
      throw new Error(`Invalid vehicle data: make="${cleanedMake}", model="${cleanedModel}"`);
    }

    // Determine the final condition value
    let finalCondition: 'new' | 'used' | 'certified';
    if (condition === 'gm_global') {
      finalCondition = 'new';
    } else {
      finalCondition = condition;
    }

    // Generate proper UUID for database insertion
    const itemId = crypto.randomUUID();
    
    // Get current user ID for authentication
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;
    
    if (!currentUserId) {
      throw new Error('User must be authenticated to upload inventory');
    }

    // Valid inventory table columns based on database schema
    const validColumns = new Set([
      'id', 'make', 'model', 'year', 'vin', 'condition', 'status', 'price', 'msrp',
      'mileage', 'exterior_color', 'interior_color', 'transmission', 'drivetrain',
      'fuel_type', 'engine', 'body_style', 'doors', 'seats', 'trim', 'stock_number',
      'location', 'uploaded_by', 'upload_history_id', 'created_at', 'updated_at',
      'rpo_codes', 'rpo_descriptions', 'days_in_inventory', 'source_report',
      'gm_order_number', 'customer_name', 'estimated_delivery_date', 'actual_delivery_date',
      'delivery_variance_days', 'gm_status_description', 'leads_count'
    ]);

    // Build clean inventory item with only valid database columns
    const inventoryItem: InventoryItem = {
      id: itemId,
      make: cleanedMake!,
      model: cleanedModel!,
      vin: mappedData.vin || '',
      condition: mappedData.condition || finalCondition,
      status: mappedData.status || 'available',
      upload_history_id: uploadId,
      uploaded_by: currentUserId, // Set to current user for RLS policy
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
      // Filter out invalid fields and problematic values
      ...Object.fromEntries(
        Object.entries(mappedData).filter(([key, value]) => {
          if (key === 'id') return false;
          if (value === undefined || value === null || value === '') return false;
          
          // Only allow valid database columns
          if (!validColumns.has(key)) {
            console.log(`🧹 [INVENTORY MAPPER] Filtered invalid column: ${key} = ${value}`);
            return false;
          }
          
          // Filter out wrapped undefined objects
          if (typeof value === 'object' && value !== null && 
              (value as any)._type === 'undefined' && (value as any).value === 'undefined') {
            console.log(`🧹 [INVENTORY MAPPER] Filtered wrapped undefined: ${key}`);
            return false;
          }
          
          return true;
        })
      )
    } as InventoryItem;

    // Set source_report based on condition
    if (condition === 'gm_global' || mappedData.gm_order_number) {
      inventoryItem.source_report = 'orders_all';
    } else if (condition === 'new') {
      inventoryItem.source_report = 'new_car_main_view';
    } else {
      inventoryItem.source_report = 'merch_inv_view';
    }

    // Calculate delivery variance if available
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

    console.log('✅ [INVENTORY MAPPER] Successfully mapped inventory item:', {
      make: inventoryItem.make,
      model: inventoryItem.model,
      condition: inventoryItem.condition,
      source_report: inventoryItem.source_report,
      hasGmData: !!(inventoryItem.gm_order_number || inventoryItem.customer_name)
    });

    return inventoryItem;
  } catch (error) {
    console.error('💥 [INVENTORY MAPPER] Critical mapping error:', error);
    throw new Error(`Failed to map vehicle data: ${error.message}`);
  }
};

// Helper function to validate if a row contains valid vehicle data
const isValidVehicleDataRow = (row: Record<string, any>): boolean => {
  console.log('🔍 [VALIDATION] Checking row validity:', Object.keys(row).slice(0, 3));
  
  const values = Object.values(row);
  const firstValue = values[0]?.toString()?.toLowerCase()?.trim();
  
  console.log('🔍 [VALIDATION] First value:', firstValue);
  console.log('🔍 [VALIDATION] All values sample:', values.slice(0, 5));
  
  // Very strict header patterns - only reject obvious headers
  const strictHeaderPatterns = [
    /^photos?$/i,
    /^vAuto\s*Network$/i
  ];
  
  // Only reject if first value is clearly a header
  if (firstValue && strictHeaderPatterns.some(pattern => pattern.test(firstValue))) {
    console.log('❌ [VALIDATION] Row rejected - clear header pattern:', firstValue);
    return false;
  }
  
  // Very lenient validation - just need some data
  const nonEmptyValues = values.filter(v => v && v.toString().trim()).length;
  if (nonEmptyValues === 0) {
    console.log('❌ [VALIDATION] Row rejected - completely empty');
    return false;
  }
  
  console.log('✅ [VALIDATION] Row accepted - appears to be data');
  return true;
};
