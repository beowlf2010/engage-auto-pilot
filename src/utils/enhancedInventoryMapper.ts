
import { extractVehicleFields } from './field-extraction';
import { extractVINField } from './field-extraction';
import { extractOptionsFields } from './field-extraction';
import { extractGMGlobalFields } from './field-extraction/gmGlobalEnhanced';
import { extractVautoFields } from './field-extraction';
import { InventoryItem } from '../services/inventory/types';
import type { ReportDetection } from './reportDetection';

export interface EnhancedMappingResult {
  item: InventoryItem;
  warnings: string[];
  dataQualityScore: number;
}

export const mapRowToInventoryItemEnhanced = (
  row: any,
  condition: 'new' | 'used' | 'gm_global',
  uploadId: string,
  fileName: string,
  headers: string[],
  detection?: ReportDetection
): EnhancedMappingResult => {
  
  const warnings: string[] = [];
  let dataQualityScore = 100;
  let mappedData: any;
  const currentTimestamp = new Date().toISOString();

  try {
    console.log('Enhanced mapping with detection:', { 
      condition, 
      reportType: detection?.reportType,
      confidence: detection?.confidence 
    });

    // Use detection results to guide mapping strategy
    if (detection?.reportType === 'gm_global' || condition === 'gm_global') {
      console.log('Using GM Global extraction for order data');
      mappedData = extractGMGlobalFields(row);
      
      // Validate GM Global specific requirements
      if (!mappedData.gm_order_number) {
        warnings.push('GM Global order missing order number');
        dataQualityScore -= 20;
      }
      
      // Ensure GM Global orders never get marked as sold
      if (mappedData.status === 'sold') {
        warnings.push('GM Global order cannot be marked as sold - corrected to available');
        mappedData.status = 'available';
        mappedData.sold_at = null;
      }
      
      // Set proper source report
      mappedData.source_report = 'orders_all';
      mappedData.condition = 'new'; // GM Global orders are always new vehicles
      
    } else if (detection?.reportType === 'sales_report') {
      console.log('Processing sales report data');
      mappedData = {
        ...extractVehicleFields(row),
        ...extractVINField(row),
        condition: condition === 'new' ? 'new' : 'used',
        status: 'sold', // Sales reports should mark vehicles as sold
        source_report: 'sales_report'
      };
      
    } else {
      // Regular inventory processing
      console.log('Processing regular inventory data');
      mappedData = {
        ...extractVehicleFields(row),
        ...extractVINField(row),
        ...extractOptionsFields(row),
        condition: condition === 'new' ? 'new' : 'used',
        status: 'available'
      };

      // Try Vauto-specific extraction if available
      try {
        const vautoData = extractVautoFields(row);
        mappedData = { ...mappedData, ...vautoData };
      } catch (error) {
        console.warn('Vauto extraction failed:', error);
      }

      // Set appropriate source report
      if (condition === 'new') {
        mappedData.source_report = 'new_car_main_view';
      } else {
        mappedData.source_report = 'merch_inv_view';
      }
    }

    // Data quality checks
    if (!mappedData.make || mappedData.make === 'Unknown') {
      warnings.push('Missing or unknown vehicle make');
      dataQualityScore -= 15;
    }
    
    if (!mappedData.model || mappedData.model === 'Unknown') {
      warnings.push('Missing or unknown vehicle model');
      dataQualityScore -= 15;
    }
    
    if (!mappedData.vin && !mappedData.stock_number && !mappedData.gm_order_number) {
      warnings.push('Missing all vehicle identifiers (VIN, Stock Number, GM Order Number)');
      dataQualityScore -= 30;
    }

    // Generate a temporary ID for the database to use
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Final data preparation
    const inventoryItem: InventoryItem = {
      id: tempId, // Temporary ID, database will assign real UUID
      make: mappedData.make || 'Unknown',
      model: mappedData.model || 'Unknown',
      vin: mappedData.vin || '',
      condition: mappedData.condition,
      status: mappedData.status || 'available',
      upload_history_id: uploadId,
      source_report: mappedData.source_report,
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
      ...mappedData
    };

    // Calculate delivery variance for GM Global orders
    if (inventoryItem.actual_delivery_date && inventoryItem.estimated_delivery_date) {
      try {
        const actualDate = new Date(inventoryItem.actual_delivery_date);
        const estimatedDate = new Date(inventoryItem.estimated_delivery_date);
        const diffTime = actualDate.getTime() - estimatedDate.getTime();
        inventoryItem.delivery_variance_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } catch (error) {
        console.error('Error calculating delivery variance:', error);
        warnings.push('Failed to calculate delivery variance');
        dataQualityScore -= 5;
      }
    }

    console.log('Enhanced mapping result:', {
      make: inventoryItem.make,
      model: inventoryItem.model,
      condition: inventoryItem.condition,
      source_report: inventoryItem.source_report,
      status: inventoryItem.status,
      dataQualityScore,
      warnings: warnings.length
    });

    return {
      item: inventoryItem,
      warnings,
      dataQualityScore: Math.max(0, dataQualityScore)
    };

  } catch (error) {
    console.error('Critical error in enhanced mapping:', error);
    warnings.push(`Mapping error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Generate a temporary ID for the fallback item
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Return minimal valid inventory item
    return {
      item: {
        id: tempId,
        make: row.make || row.Make || 'Unknown',
        model: row.model || row.Model || 'Unknown',
        vin: row.vin || row.VIN || '',
        condition: condition === 'gm_global' ? 'new' : (condition === 'new' ? 'new' : 'used'),
        status: condition === 'gm_global' ? 'available' : 'available',
        upload_history_id: uploadId,
        source_report: condition === 'gm_global' ? 'orders_all' : (condition === 'new' ? 'new_car_main_view' : 'merch_inv_view'),
        created_at: currentTimestamp,
        updated_at: currentTimestamp
      },
      warnings,
      dataQualityScore: 20
    };
  }
};
