
import { extractVehicleFields } from './field-extraction';
import { extractVINField } from './field-extraction';
import { extractOptionsFields } from './field-extraction';
import { extractGMGlobalFields } from './field-extraction/gmGlobalEnhanced';
import { extractVautoFields } from './field-extraction';
import { InventoryItem } from '../services/inventory/types';
import type { ReportDetection } from './reportDetection';
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedMappingResult {
  item: InventoryItem;
  warnings: string[];
  dataQualityScore: number;
}

export const mapRowToInventoryItemEnhanced = async (
  row: any,
  condition: 'new' | 'used' | 'gm_global',
  uploadId: string,
  fileName: string,
  headers: string[],
  detection?: ReportDetection
): Promise<EnhancedMappingResult> => {
  
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

    // Filter mapped data to only include valid columns
    const filteredMappedData = Object.fromEntries(
      Object.entries(mappedData).filter(([key, value]) => {
        if (validColumns.has(key)) return true;
        console.log(`🧹 [ENHANCED MAPPER] Filtered invalid column: ${key} = ${value}`);
        return false;
      })
    );

    // Final data preparation
    const inventoryItem: InventoryItem = {
      id: itemId,
      make: mappedData.make || 'Unknown',
      model: mappedData.model || 'Unknown',
      vin: mappedData.vin || '',
      condition: mappedData.condition,
      status: mappedData.status || 'available',
      upload_history_id: uploadId,
      uploaded_by: currentUserId, // Set to current user for RLS policy
      source_report: mappedData.source_report,
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
      ...filteredMappedData
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
