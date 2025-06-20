
import { extractVehicleFields } from './field-extraction';
import { extractVINField } from './field-extraction';
import { extractOptionsFields } from './field-extraction';
import { extractGMGlobalFields } from './field-extraction/gmGlobalEnhanced';
import { extractVautoFields } from './field-extraction';

export interface InventoryItem {
  id?: string;
  vin?: string;
  stock_number?: string;
  year?: number;
  make: string;
  model: string;
  trim?: string;
  body_style?: string;
  color_exterior?: string;
  color_interior?: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  fuel_type?: string;
  mileage?: number;
  price?: number;
  msrp?: number;
  invoice?: number;
  rebates?: number;
  pack?: number;
  condition: 'new' | 'used' | 'certified';
  status: 'available' | 'sold' | 'pending' | 'service' | 'wholesale';
  source_report?: 'new_car_main_view' | 'merch_inv_view' | 'orders_all';
  rpo_codes?: string[];
  rpo_descriptions?: string[];
  full_option_blob?: any;
  
  // GM Global specific fields
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  order_date?: string;
  gm_order_number?: string;
  customer_name?: string;
  dealer_order_code?: string;
  build_week?: string;
  production_sequence?: string;
  gm_status_description?: string;
  delivery_method?: string;
  priority_code?: string;
  order_type?: string;
  plant_code?: string;
  ship_to_dealer_code?: string;
  selling_dealer_code?: string;
  order_priority?: string;
  special_equipment?: string;
  customer_order_number?: string;
  trade_hold_status?: string;
  allocation_code?: string;
  gm_model_code?: string;
  order_source?: string;
  original_order_date?: string;
  revised_delivery_date?: string;
  delivery_variance_days?: number;
  
  // Other fields
  features?: string[];
  description?: string;
  dealer_notes?: string;
  images?: string[];
  carfax_url?: string;
  location?: string;
  upload_history_id?: string;
}

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
  console.log('Mapping row to inventory item:', { condition, keys: Object.keys(row) });

  let mappedData: any;

  try {
    // Determine file type and use appropriate extraction
    if (condition === 'gm_global') {
      console.log('Using GM Global extraction for comprehensive data capture');
      mappedData = extractGMGlobalFields(row);
    } else {
      // Check if this looks like a GM Global file even if not explicitly marked
      const hasGMGlobalFields = Object.keys(row).some(key => 
        key.toLowerCase().includes('order') ||
        key.toLowerCase().includes('delivery') ||
        key.toLowerCase().includes('customer') ||
        key.toLowerCase().includes('gm ')
      );

      if (hasGMGlobalFields) {
        console.log('Detected GM Global fields, using enhanced extraction');
        mappedData = extractGMGlobalFields(row);
      } else {
        // Use existing extraction methods with error handling
        try {
          mappedData = {
            ...extractVehicleFields(row),
            ...extractVINField(row),
            ...extractOptionsFields(row),
            condition: condition === 'new' ? 'new' : 'used',
            status: 'available'
          };

          // Try Vauto-specific extraction if available
          const vautoData = extractVautoFields(row);
          mappedData = { ...mappedData, ...vautoData };
        } catch (error) {
          console.error('Error in field extraction:', error);
          // Fallback to basic mapping
          mappedData = {
            make: row.make || row.Make || null,
            model: row.model || row.Model || null,
            condition: condition === 'new' ? 'new' : 'used',
            status: 'available'
          };
        }
      }
    }

    // Clean and validate make/model data
    const cleanedMake = cleanVehicleData(mappedData.make);
    const cleanedModel = cleanVehicleData(mappedData.model);

    // Reject vehicles with invalid make/model data
    if (!isValidVehicleData(cleanedMake || '', cleanedModel || '')) {
      console.warn('Rejecting vehicle with invalid make/model data:', {
        originalMake: mappedData.make,
        originalModel: mappedData.model,
        cleanedMake,
        cleanedModel
      });
      
      // Return null or throw error to indicate this vehicle should be skipped
      throw new Error(`Invalid vehicle data: make="${mappedData.make}", model="${mappedData.model}"`);
    }

    // Determine the final condition value
    let finalCondition: 'new' | 'used' | 'certified';
    if (condition === 'gm_global') {
      finalCondition = 'new';
    } else {
      finalCondition = condition;
    }

    // Ensure required fields have valid values
    const inventoryItem: InventoryItem = {
      make: cleanedMake!,
      model: cleanedModel!,
      condition: mappedData.condition || finalCondition,
      status: mappedData.status || 'available',
      upload_history_id: uploadId,
      ...mappedData
    };

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
      hasGMData: !!(inventoryItem.gm_order_number || inventoryItem.customer_name)
    });

    return inventoryItem;
  } catch (error) {
    console.error('Critical error in mapRowToInventoryItem:', error);
    
    // Don't create invalid inventory items - let the error bubble up
    throw new Error(`Failed to map vehicle data: ${error.message}`);
  }
};
